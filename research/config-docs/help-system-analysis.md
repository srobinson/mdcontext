# Help System Architecture Analysis

---
**RESEARCH METADATA**

- Analysis Date: 2026-01-24
- Git Commit: 07c9e72ba01cda840046b96a1be4743a85e3d4c5
- Status: Valid
- Last Validated: 2026-01-24
- Worktree: nancy-ALP-139
- Related: [help-audit.md](help-audit.md)
- Index: [/research/INDEX.md](../INDEX.md)

**ACCURACY NOTE**

This analysis documents the help system architecture as implemented in the codebase.
It is code-dependent and validated against the current implementation.
See help-audit.md for UX evaluation of the help output quality.
---

## Overview

The mdcontext CLI uses a hybrid help system that combines:
1. **Custom help implementation** (help.ts) - For beautiful, branded help output
2. **Effect CLI's built-in help** - For automatic command structure and parsing

This document explains how the two systems work together, which commands use which approach, and the pattern matching logic that determines what help gets shown.

## Architecture Components

### 1. Custom Help System (src/cli/help.ts)

The custom help system provides world-class, beautifully formatted help that matches the quality of professional tools like git and gh.

**Key Features:**
- Color-coded section headers (yellow for USAGE, EXAMPLES, OPTIONS, NOTES)
- Cyan highlighting for commands and values
- Progressive examples (simple to complex)
- Real-world workflow examples
- Helpful notes about prerequisites and behavior

**File Structure:**
```typescript
// help.ts exports:
export const helpContent: Record<string, CommandHelp>
export const showMainHelp = (): void
export const showSubcommandHelp = (command: string): void
export const checkSubcommandHelp = (): boolean
export const checkBareSubcommandHelp = (): boolean
export const shouldShowMainHelp = (): boolean
```

**Help Content Structure:**
```typescript
interface CommandHelp {
  description: string
  usage: string
  examples: string[]
  options: { name: string; description: string }[]
  notes?: string[]
}
```

**Commands with Custom Help:**
- `mdcontext --help` (main help)
- `mdcontext index --help`
- `mdcontext search --help`
- `mdcontext context --help`
- `mdcontext tree --help`
- `mdcontext links --help`
- `mdcontext backlinks --help`
- `mdcontext stats --help`
- `mdcontext config --help`

### 2. Effect CLI Help System

Effect CLI provides automatic help generation based on command definitions, but it:
- Has different formatting (white headers instead of yellow)
- Uses dashes before command names in listings
- Lacks examples and notes sections
- Doesn't match the mdcontext brand/style

**When Effect CLI Help Appears:**
Effect's help is only shown when the custom help system doesn't intercept the request.

### 3. Help Request Flow

The help system uses a waterfall pattern to determine what help to show:

```
main.ts (lines 89-99):
┌─────────────────────────────────────┐
│ 1. checkSubcommandHelp()            │ → Intercepts "mdcontext <cmd> --help"
│    - Checks for: cmd + (--help|-h)  │
│    - Shows custom help via          │
│      showSubcommandHelp(command)    │
│    - Exits with process.exit(0)     │
└─────────────────────────────────────┘
          │ (if no match)
          ▼
┌─────────────────────────────────────┐
│ 2. checkBareSubcommandHelp()        │ → Intercepts "mdcontext config"
│    - Checks for: bare "config"      │
│    - Shows custom config help       │
│    - Prevents ugly Effect default   │
│    - Exits with process.exit(0)     │
└─────────────────────────────────────┘
          │ (if no match)
          ▼
┌─────────────────────────────────────┐
│ 3. shouldShowMainHelp()             │ → Intercepts main help requests
│    - Checks for: no args, --help,   │
│      -h, or "help" command          │
│    - Shows custom main help         │
│    - Exits with process.exit(0)     │
└─────────────────────────────────────┘
          │ (if no match)
          ▼
┌─────────────────────────────────────┐
│ 4. Effect CLI Processing            │ → Default Effect CLI handling
│    - Runs the CLI command           │
│    - Uses Effect's built-in help    │
│      if --help flag is present      │
└─────────────────────────────────────┘
```

## Pattern Matching Logic

### Pattern 1: Subcommand Help (`checkSubcommandHelp`)

**Location:** help.ts lines 395-408

**Matches:**
- `mdcontext index --help`
- `mdcontext search -h`
- `mdcontext config --help`

**Logic:**
```typescript
const args = process.argv.slice(2)
if (args.length < 2) return false

const command = args[0]
const hasHelpFlag = args.includes('--help') || args.includes('-h')

if (hasHelpFlag && command && helpContent[command]) {
  showSubcommandHelp(command)
  process.exit(0)
}
```

**Behavior:**
- Requires at least 2 arguments (command + flag)
- Command must exist in helpContent
- Shows custom help and exits

### Pattern 2: Bare Subcommand Help (`checkBareSubcommandHelp`)

**Location:** help.ts lines 415-431

**Matches:**
- `mdcontext config` (no args, no flags)

**Purpose:** Prevents ugly Effect CLI default output for commands with subcommands

**Logic:**
```typescript
const args = process.argv.slice(2)

// Look for: exactly one arg that is a command with subcommands in helpContent
if (args.length !== 1) return false

const command = args[0]

// Only handle commands that have subcommands and custom help
// Currently only "config" has subcommands
if (command === 'config' && helpContent[command]) {
  showSubcommandHelp(command)
  process.exit(0)
}
```

**Behavior:**
- Only triggers for exactly 1 argument
- Currently hard-coded to only handle "config"
- Shows the parent command's custom help
- Prevents Effect's raw default listing

**Why This Exists:**
Running `mdcontext config` without the fix would show Effect's default output:
```
mdcontext

mdcontext 0.1.0

USAGE

$ config

DESCRIPTION

Configuration management

COMMANDS

  - init [(-f, --format js | json)] [--force] [--json] [--pretty]  Create a starter config file
  - show [--json] [--pretty]                                       Show config file location
  - check [--json] [--pretty]                                      Validate and display configuration
```

With the fix, it shows the beautiful custom help instead.

### Pattern 3: Main Help (`shouldShowMainHelp`)

**Location:** help.ts lines 436-445

**Matches:**
- `mdcontext` (no args)
- `mdcontext --help`
- `mdcontext -h`
- `mdcontext help`

**Logic:**
```typescript
const args = process.argv.slice(2)
const showHelp =
  args.length === 0 ||
  args.includes('--help') ||
  args.includes('-h') ||
  (args.length === 1 && args[0] === 'help')

return showHelp && !args.some((a) => !a.startsWith('-') && a !== 'help')
```

**Behavior:**
- Shows main help for various patterns
- Second condition prevents showing main help if a subcommand is present

### Pattern 4: Effect CLI Default

**When it activates:**
When none of the above patterns match and Effect CLI takes over.

**Example:** Config subcommands
- `mdcontext config init --help`
- `mdcontext config show --help`
- `mdcontext config check --help`

**Current Behavior:**
These show the **parent config help**, not subcommand-specific help.

**Why:**
The custom help interceptor in `checkSubcommandHelp` looks for:
```typescript
const command = args[0]  // This would be "config"
const hasHelpFlag = args.includes('--help')
```

When you run `mdcontext config init --help`, args[0] is "config", so it shows the config help.

**Is this intentional?**
Looking at the config command implementation (config-cmd.ts lines 635-638):
```typescript
export const configCommand = Command.make('config').pipe(
  Command.withDescription('Configuration management'),
  Command.withSubcommands([initCommand, showCommand, checkCommand]),
)
```

The subcommands (init, show, check) are simple enough that centralizing all help in the parent command is reasonable. The parent help already documents all subcommands comprehensively.

## Command-by-Command Help Routing

| Command Pattern | Which System | Notes |
|-----------------|--------------|-------|
| `mdcontext` | Custom | shouldShowMainHelp |
| `mdcontext --help` | Custom | shouldShowMainHelp |
| `mdcontext help` | Custom | shouldShowMainHelp |
| `mdcontext index --help` | Custom | checkSubcommandHelp |
| `mdcontext search --help` | Custom | checkSubcommandHelp |
| `mdcontext context --help` | Custom | checkSubcommandHelp |
| `mdcontext tree --help` | Custom | checkSubcommandHelp |
| `mdcontext links --help` | Custom | checkSubcommandHelp |
| `mdcontext backlinks --help` | Custom | checkSubcommandHelp |
| `mdcontext stats --help` | Custom | checkSubcommandHelp |
| `mdcontext config` | Custom | checkBareSubcommandHelp |
| `mdcontext config --help` | Custom | checkSubcommandHelp |
| `mdcontext config init --help` | Custom (parent) | checkSubcommandHelp shows config help |
| `mdcontext config show --help` | Custom (parent) | checkSubcommandHelp shows config help |
| `mdcontext config check --help` | Custom (parent) | checkSubcommandHelp shows config help |

## Implementation Details

### Custom Help Rendering

**Main Help (showMainHelp):**
Location: help.ts lines 329-385

Features:
- Hardcoded template string with ANSI color codes
- Sections: COMMANDS, EXAMPLES, WORKFLOWS, GLOBAL OPTIONS
- Yellow headers (\x1b[33m)
- Cyan highlights (\x1b[36m)
- Dim text for comments (\x1b[2m)

**Subcommand Help (showSubcommandHelp):**
Location: help.ts lines 286-324

Process:
1. Look up command in helpContent map
2. Exit with error if not found
3. Format sections dynamically:
   - Header with command name and description
   - USAGE section (single line)
   - EXAMPLES section (array of examples)
   - OPTIONS section (aligned at 24 chars)
   - NOTES section (if present)

**Color Scheme:**
```typescript
\x1b[1m   - Bold (command names)
\x1b[33m  - Yellow (section headers)
\x1b[36m  - Cyan (values/highlights)
\x1b[2m   - Dim (comments)
\x1b[0m   - Reset
```

### Effect CLI Integration

**Main Command Definition:**
Location: main.ts lines 55-67

```typescript
const mainCommand = Command.make('mdcontext').pipe(
  Command.withDescription('Token-efficient markdown analysis for LLMs'),
  Command.withSubcommands([
    indexCommand,
    searchCommand,
    contextCommand,
    treeCommand,
    linksCommand,
    backlinksCommand,
    statsCommand,
    configCommand,
  ]),
)
```

**CLI Configuration:**
Location: main.ts lines 69-77

```typescript
const cli = Command.run(mainCommand, {
  name: 'mdcontext',
  version: '0.1.0',
})

const cliConfigLayer = CliConfig.layer({
  showBuiltIns: false,  // Hides built-in options from Effect help
})
```

**Why showBuiltIns: false:**
This prevents Effect CLI from showing its automatic --help and --version options in help output, since we handle those ourselves with custom formatting.

## Where Each Command Gets Its Help

### Commands Using Custom Help Exclusively

All primary commands use custom help from help.ts:

1. **index** - helpContent.index (lines 24-58)
2. **search** - helpContent.search (lines 59-124)
3. **context** - helpContent.context (lines 125-178)
4. **tree** - helpContent.tree (lines 179-196)
5. **links** - helpContent.links (lines 197-213)
6. **backlinks** - helpContent.backlinks (lines 214-231)
7. **stats** - helpContent.stats (lines 232-245)
8. **config** - helpContent.config (lines 246-277)

### Effect CLI Default Commands

None currently. The custom help system intercepts all help requests.

**Historical Issue:**
Before the `checkBareSubcommandHelp` fix, running `mdcontext config` (no args) would show Effect's default output. This is now fixed.

## How to Fix Commands Using Effect Defaults

If you encounter a command showing ugly Effect CLI help, follow this pattern:

### Step 1: Add to helpContent

In help.ts, add your command to the helpContent object:

```typescript
export const helpContent: Record<string, CommandHelp> = {
  // ... existing commands

  yourCommand: {
    description: 'Brief description of what it does',
    usage: 'mdcontext yourCommand [options]',
    examples: [
      'mdcontext yourCommand           # Basic usage',
      'mdcontext yourCommand --flag    # With option',
    ],
    options: [
      { name: '--flag', description: 'What the flag does' },
    ],
    notes: [
      'Any important notes about prerequisites or behavior',
    ],
  },
}
```

### Step 2: Ensure checkSubcommandHelp Covers It

The existing checkSubcommandHelp should automatically handle it:

```typescript
if (hasHelpFlag && command && helpContent[command]) {
  showSubcommandHelp(command)
  process.exit(0)
}
```

As long as your command is in helpContent, `mdcontext yourCommand --help` will work.

### Step 3: Handle Bare Command (if has subcommands)

If your command has subcommands and you want `mdcontext yourCommand` (no args) to show help instead of Effect's listing, add it to checkBareSubcommandHelp:

```typescript
export const checkBareSubcommandHelp = (): boolean => {
  const args = process.argv.slice(2)
  if (args.length !== 1) return false

  const command = args[0]

  // Add your command here
  if ((command === 'config' || command === 'yourCommand') && helpContent[command]) {
    showSubcommandHelp(command)
    process.exit(0)
  }

  return false
}
```

## Config Command Case Study

The config command demonstrates the complete help system architecture:

### Variants and Their Help

1. **`mdcontext config`** (no args)
   - **Interceptor:** checkBareSubcommandHelp (help.ts line 425-427)
   - **Help shown:** Custom config help (helpContent.config)
   - **Why:** Prevents ugly Effect listing of subcommands

2. **`mdcontext config --help`**
   - **Interceptor:** checkSubcommandHelp (help.ts line 402-404)
   - **Help shown:** Custom config help (helpContent.config)
   - **Why:** Standard help request

3. **`mdcontext config init --help`**
   - **Interceptor:** checkSubcommandHelp (help.ts line 402-404)
   - **Help shown:** Custom config help (helpContent.config) - PARENT help
   - **Why:** args[0] is "config", so parent help is shown
   - **Intentional:** Config subcommands are simple, centralized help is fine

4. **`mdcontext config show --help`**
   - Same as init - shows parent config help

5. **`mdcontext config check --help`**
   - Same as init - shows parent config help

### Config Command Implementation

**File:** src/cli/commands/config-cmd.ts

**Structure:**
```typescript
// Three subcommands
const initCommand = Command.make('init', {...})
const showCommand = Command.make('show', {...})
const checkCommand = Command.make('check', {...})

// Parent command with subcommands
export const configCommand = Command.make('config').pipe(
  Command.withDescription('Configuration management'),
  Command.withSubcommands([initCommand, showCommand, checkCommand]),
)
```

**Each Subcommand:**
- Has its own options defined via Effect CLI's Options API
- Implements its own Effect generator function for execution
- Has its own Effect CLI description via withDescription()

**But:**
- All share the same custom help from helpContent.config
- This is intentional - the parent help documents all subcommands clearly
- Keeps help centralized and consistent

## Effect CLI Options vs Custom Help

### Effect CLI Options (Used in Implementation)

Example from config init (config-cmd.ts lines 194-210):

```typescript
const initCommand = Command.make(
  'init',
  {
    format: Options.choice('format', ['js', 'json']).pipe(
      Options.withAlias('f'),
      Options.withDescription('Config file format (js recommended for type safety)'),
      Options.withDefault('js' as const),
    ),
    force: Options.boolean('force').pipe(
      Options.withDescription('Overwrite existing config file'),
      Options.withDefault(false),
    ),
    json: jsonOption,
    pretty: prettyOption,
  },
  ({ format, force, json, pretty }) => Effect.gen(function* () {
    // Implementation
  }),
).pipe(Command.withDescription('Create a starter config file'))
```

**These Effect options:**
- Define the command's actual behavior
- Control parsing and validation
- Are NOT used for help display (custom help is shown instead)

### Custom Help Content (Used for Display)

From helpContent.config (help.ts lines 246-277):

```typescript
config: {
  description: 'Configuration management',
  usage: 'mdcontext config <command> [options]',
  examples: [
    'mdcontext config init              # Create a starter config file',
    'mdcontext config init --format json  # Create JSON config instead of JS',
    'mdcontext config show              # Show config file location',
    'mdcontext config check             # Validate and show effective config',
    'mdcontext config check --json      # Output config as JSON',
  ],
  options: [
    { name: 'init', description: 'Create a starter config file' },
    { name: 'show', description: 'Display config file location' },
    { name: 'check', description: 'Validate and show effective configuration' },
    { name: '-f, --format <format>', description: 'Config format: js or json (init only)' },
    { name: '--force', description: 'Overwrite existing config (init only)' },
    { name: '--json', description: 'Output as JSON' },
    { name: '--pretty', description: 'Pretty-print JSON output' },
  ],
  notes: [
    'Config files set persistent defaults for all commands.',
    'Precedence: CLI flags > environment > config file > defaults.',
    'See docs/CONFIG.md for full configuration reference.',
  ],
}
```

**This custom content:**
- Is displayed when --help is requested
- Must be manually kept in sync with actual options
- Provides better formatting, examples, and notes than Effect can generate

### The Sync Challenge

There are TWO sources of truth:
1. **Effect CLI options** - What the command actually accepts
2. **Custom help content** - What we tell users it accepts

**Risk:** These can get out of sync if you:
- Add a new option to Effect options but forget to update helpContent
- Change an option name/description in one place but not the other
- Add a new subcommand but don't update the help examples

**Mitigation:**
- Keep help.ts and command implementation files close together
- Review both when making changes
- Consider automated tests that compare option definitions

## Design Decisions

### Why Not Use Effect CLI Help Exclusively?

Effect CLI can auto-generate help from command definitions, but:

1. **Formatting Quality:** Effect's default is functional but not beautiful
   - Different color scheme (white vs yellow headers)
   - Different structure (dashes before commands)
   - Less polished overall feel

2. **Brand Consistency:** mdcontext has high standards for CLI UX
   - Help should match the quality of git, gh, npm
   - Consistent color scheme across all output
   - Professional polish reflects well on the tool

3. **Examples and Notes:** Auto-generated help can't include:
   - Progressive example sequences (basic → advanced)
   - Real-world workflow examples
   - Context about prerequisites
   - Tips and best practices

4. **Control:** Custom help gives complete control over:
   - What information is shown and in what order
   - How examples are formatted and grouped
   - What notes and context are provided

### Why Keep Effect CLI at All?

If we're overriding all help with custom implementations, why use Effect CLI?

**Benefits of Effect CLI:**
1. **Command Structure:** Defines the command hierarchy
2. **Option Parsing:** Handles flag parsing, validation, defaults
3. **Type Safety:** Options are fully typed in TypeScript
4. **Error Handling:** Built-in validation error messages
5. **Subcommand Routing:** Automatically routes to the right subcommand
6. **Future Flexibility:** Easy to add new commands with proper structure

**What We Override:**
- Only the help display
- Keep all the parsing and validation logic

**Hybrid Approach:**
- Use Effect for structure, parsing, and execution
- Use custom help for display and user experience

### Why checkBareSubcommandHelp Only Handles "config"?

The function could be generalized to handle any command with subcommands:

```typescript
// Current approach (hard-coded):
if (command === 'config' && helpContent[command]) {
  showSubcommandHelp(command)
  process.exit(0)
}

// Could be generalized to:
const commandsWithSubcommands = ['config', 'future-command']
if (commandsWithSubcommands.includes(command) && helpContent[command]) {
  showSubcommandHelp(command)
  process.exit(0)
}
```

**Why it's not generalized:**
1. **YAGNI (You Ain't Gonna Need It):** Only config has this issue currently
2. **Explicit is Better:** Hard-coding makes the behavior clear
3. **Easy to Extend:** When a second command needs it, then generalize

## Testing the Help System

### Manual Testing Commands

Test all help variants to ensure custom help is shown:

```bash
# Main help
mdcontext
mdcontext --help
mdcontext -h
mdcontext help

# Subcommand help
mdcontext index --help
mdcontext search --help
mdcontext context --help
mdcontext tree --help
mdcontext links --help
mdcontext backlinks --help
mdcontext stats --help
mdcontext config --help

# Config variants (critical tests)
mdcontext config                  # Should show custom help (not ugly Effect default)
mdcontext config init --help      # Should show config help (parent)
mdcontext config show --help      # Should show config help (parent)
mdcontext config check --help     # Should show config help (parent)
```

### What to Check

For each command, verify:

1. **Color scheme:**
   - Yellow section headers (USAGE, EXAMPLES, OPTIONS, NOTES)
   - Cyan highlights for commands and values
   - Bold command names

2. **Section structure:**
   - USAGE section present and concise
   - EXAMPLES section shows progression (simple → complex)
   - OPTIONS section shows all flags with descriptions
   - NOTES section (if applicable) provides context

3. **No Effect CLI artifacts:**
   - No dashes before command names
   - No "COMMANDS" section with Effect's format
   - No white header text
   - No "mdcontext 0.1.0" version line in help

4. **Consistent formatting:**
   - Options align at 24 characters
   - Examples use consistent commenting style
   - Notes use consistent bullet format

### Quality Checklist

For new commands or help updates:

- [ ] Custom help template (not Effect default)
- [ ] Yellow headers, cyan highlights
- [ ] USAGE, EXAMPLES, OPTIONS sections
- [ ] NOTES section if prerequisites/behavior needs explanation
- [ ] Progressive examples (simple → complex)
- [ ] Real-world workflow examples where applicable
- [ ] No args shows helpful message (not raw Effect listing)
- [ ] Subcommand help works (mdcontext <cmd> --help)
- [ ] Help content matches actual command options
- [ ] All examples are tested and work

## Future Enhancements

### Potential Improvements

1. **Subcommand-Specific Help:**
   - Currently config subcommands show parent help
   - Could add specific help for `config init --help`, etc.
   - Only worth it if subcommands grow complex

2. **Help Content Validation:**
   - Automated tests comparing Effect options to helpContent
   - Warn if options are defined but not documented in help
   - Catch sync issues between implementation and help

3. **Help Templates:**
   - Extract common formatting into reusable functions
   - Reduce duplication in showMainHelp and showSubcommandHelp
   - Consistent spacing and alignment helpers

4. **Dynamic Help Generation:**
   - Generate helpContent from Effect command definitions
   - Keep the custom formatting
   - Automatically stay in sync with option changes

5. **Help Search:**
   - `mdcontext help search <term>` to find commands
   - Search across all help content
   - Show relevant examples for a topic

6. **Man Pages:**
   - Generate man pages from helpContent
   - Install via npm postinstall script
   - Allow `man mdcontext` for offline help

## Related Files

### Core Help System
- **src/cli/help.ts** - Custom help implementation
- **src/cli/main.ts** - Help request routing and interceptors
- **src/cli/commands/*.ts** - Command definitions with Effect CLI

### Help Content
All help displayed to users is defined in help.ts:
- helpContent object (lines 24-277)
- showMainHelp function (lines 329-385)
- showSubcommandHelp function (lines 286-324)

### Interceptors
Help request interceptors in main.ts:
- checkSubcommandHelp (line 90)
- checkBareSubcommandHelp (line 93)
- shouldShowMainHelp (line 96)

### Command Implementations
Each command directory contains Effect CLI definitions:
- config-cmd.ts (config with subcommands)
- index-cmd.ts (index command)
- search.ts (search command)
- context.ts (context command)
- tree.ts (tree command)
- links.ts (links command)
- backlinks.ts (backlinks command)
- stats.ts (stats command)

## Troubleshooting

### Issue: Effect CLI Default Help Showing

**Symptoms:**
- White section headers instead of yellow
- Dashes before command names
- Missing examples and notes sections
- Generic "mdcontext 0.1.0" header

**Diagnosis:**
Custom help interceptor is not catching the help request.

**Solutions:**

1. **For `mdcontext <cmd> --help`:**
   - Add command to helpContent in help.ts
   - checkSubcommandHelp will automatically handle it

2. **For `mdcontext <cmd>` (bare command with subcommands):**
   - Add command to checkBareSubcommandHelp
   - Prevents Effect's subcommand listing

3. **For new command patterns:**
   - Add new interceptor function in help.ts
   - Call it in main.ts before Effect CLI runs

### Issue: Help Content Out of Sync

**Symptoms:**
- Help shows options that don't work
- Command accepts options not shown in help
- Examples fail when run

**Diagnosis:**
helpContent in help.ts doesn't match actual Effect CLI option definitions.

**Solution:**
1. Compare helpContent.yourCommand to actual command options
2. Update helpContent to match implementation
3. Test all examples to ensure they work

**Prevention:**
- Update help and implementation together
- Review both files when making changes
- Consider automated sync tests

### Issue: Subcommand Help Shows Parent Help

**Symptoms:**
- `mdcontext config init --help` shows config help (not init-specific)

**Explanation:**
This is intentional for config command (see lines 425-427 in help.ts).

**When to Change:**
Only if subcommand grows complex enough to need dedicated help.

**How to Change:**
1. Add specific help to helpContent (e.g., helpContent['config/init'])
2. Modify checkSubcommandHelp to handle subcommand paths
3. Update routing to show subcommand help instead of parent

## Summary

The mdcontext help system is a **hybrid architecture** that combines:

1. **Custom Help Display (help.ts)**
   - Beautiful, branded formatting
   - Progressive examples
   - Helpful notes and context
   - Consistent color scheme

2. **Effect CLI Structure (commands/*.ts)**
   - Command hierarchy and routing
   - Option parsing and validation
   - Type safety
   - Error handling

3. **Interceptor Pattern (main.ts)**
   - Catches help requests before Effect CLI
   - Routes to custom help display
   - Prevents ugly Effect defaults

**Key Insight:**
We use Effect CLI for what it's good at (structure, parsing, types) and override only the help display with custom implementations. This gives us both excellent DX (developer experience) and UX (user experience).

**Critical Fix:**
checkBareSubcommandHelp prevents `mdcontext config` from showing Effect's raw command listing, maintaining the quality bar across all help variants.

**Maintenance:**
The main risk is help content drifting out of sync with actual command options. Keep help.ts and command implementations aligned when making changes.
