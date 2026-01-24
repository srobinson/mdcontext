# Help Output Audit

---
**RESEARCH METADATA**

- Analysis Date: 2026-01-24
- Git Commit: 07c9e72ba01cda840046b96a1be4743a85e3d4c5
- Status: ✅ Valid
- Last Validated: 2026-01-24
- Worktree: nancy-ALP-139
- Index: [/research/INDEX.md](../INDEX.md)

**ACCURACY NOTE**

This UX analysis is accurate and not code-dependent. Findings remain valid.
Identifies ugly Effect CLI output for bare `config` command that needs custom help.
---

Comprehensive audit of all help command variants to identify inconsistencies and quality issues.

## Summary

**Tested:** 13 help variants
**World-class:** 9 commands (69%)
**Ugly Effect CLI default:** 1 variant (8%)
**Note:** 3 config subcommand variants show custom help (but it's the parent help)

## Commands by Quality

### ✅ World-class Help (9 commands)

These have excellent formatting, colors, examples, and clear structure:

1. **Main help** (`npx . --help`)
   - Beautiful color scheme (yellow headers, cyan highlights)
   - Multiple example sections (COMMANDS, EXAMPLES, WORKFLOWS, GLOBAL OPTIONS)
   - Real-world workflow examples
   - Clear grouping and organization

2. **index** (`npx . index --help`)
   - Great formatting with colors
   - Clear examples showing progression (basic → advanced)
   - Helpful NOTES section explaining behavior
   - Covers all use cases

3. **search** (`npx . search --help`)
   - Extensive examples covering all search modes
   - Boolean operators well-documented
   - Context lines explained (grep-style)
   - Good notes about auto-detection

4. **context** (`npx . context --help`)
   - Clear progression of examples
   - Section filtering well-explained
   - Token budget explained
   - Good workflow integration (pipe to pbcopy)

5. **tree** (`npx . tree --help`)
   - Simple and clear
   - Dual-purpose well-explained (files vs outline)
   - Appropriate for command simplicity

6. **links** (`npx . links --help`)
   - Clear and concise
   - Good examples
   - Explains relative path resolution

7. **backlinks** (`npx . backlinks --help`)
   - Clear and concise
   - Has NOTES section explaining index requirement
   - Consistent with links command

8. **stats** (`npx . stats --help`)
   - Simple and clear
   - Has NOTES section about embeddings
   - Appropriate detail level

9. **config** (`npx . config --help`)
   - **Custom help that matches main CLI style**
   - Color formatting with yellow headers
   - Good examples showing subcommands
   - Clear OPTIONS section
   - Helpful NOTES about config precedence

### ❌ Ugly Effect CLI Default (1 variant)

**config (no args)** (`npx . config`)
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

  - check [--json] [--pretty]                                      Validate and display effective configuration
```

**Issues:**
- Raw Effect CLI default output
- Different color scheme (white instead of yellow headers)
- Inconsistent formatting (dashes before commands)
- Weird spacing and alignment
- Missing examples
- No notes or context
- Doesn't match mdcontext brand/style

### 📝 Config Subcommands (3 variants)

All three config subcommands show the **same parent help** (which is good/custom):

1. **config init --help**
2. **config show --help**
3. **config check --help**

All show the custom `config --help` output, not individual subcommand help.

## Patterns Identified

### ✅ Good Help Patterns

1. **Color scheme consistency:**
   - Yellow (`[33m`) for section headers (USAGE, EXAMPLES, OPTIONS, NOTES)
   - Cyan (`[36m`) for highlighting commands/values
   - Bold (`[1m`) for command names

2. **Section structure:**
   - USAGE (concise command syntax)
   - EXAMPLES (progressive: simple → complex)
   - OPTIONS (flags with descriptions)
   - NOTES (context, requirements, tips)

3. **Example quality:**
   - Show common use cases first
   - Include inline comments for workflow examples
   - Demonstrate flag combinations
   - Show real-world patterns (pipe to pbcopy, etc.)

4. **Notes section:**
   - Explains prerequisites (e.g., "requires index")
   - Clarifies behavior (auto-detection, defaults)
   - Links to related commands
   - References documentation

### ❌ Bad Help Pattern

**Effect CLI Default:**
- Uppercase section headers with different formatting
- Dashes before command names in COMMANDS section
- No examples
- No notes or context
- Generic, auto-generated feel
- Doesn't match the brand/style of other commands

## Root Cause Analysis

### Why `npx . config` is ugly:

Looking at the outputs, there's a clear pattern:

1. **`npx . config --help`** → Custom help (world-class)
2. **`npx . config`** (no args) → Raw Effect CLI default

This suggests:
- The `--help` flag triggers custom help rendering
- Running `config` without args falls back to Effect's default command listing
- Effect CLI's automatic command listing doesn't match mdcontext style

### Why config subcommands show parent help:

Running `npx . config init --help` shows the config parent help, not init-specific help. This could be:
- Intentional (centralizing all config help)
- Or a routing issue where `--help` isn't reaching the subcommand

## Recommendations

### Priority 1: Fix `npx . config` (no args)

**Problem:** Running `config` without subcommand shows ugly Effect default.

**Solutions:**

A. **Make `config` require a subcommand** (error if none provided)
   - Forces users to run `config --help` or `config <subcommand>`
   - Common pattern in git, npm, etc.

B. **Override Effect's default listing with custom help**
   - Detect when no subcommand is provided
   - Show the same output as `config --help`
   - Best UX (helpful instead of raw listing)

**Recommendation:** Option B - Auto-show help when no subcommand

### Priority 2: Consider Subcommand-Specific Help

**Current:** `config init --help` shows parent config help
**Possible:** Could show init-specific help

**Analysis:**
- Current approach is fine if all config commands are simple
- The parent help already documents all subcommands well
- Subcommand-specific help only needed if complexity grows

**Recommendation:** Keep current approach (centralized help), but ensure it's intentional, not a bug.

### Priority 3: Help Consistency Checklist

For any new commands, ensure:
- [ ] Custom help template (not Effect default)
- [ ] Yellow headers, cyan highlights
- [ ] USAGE, EXAMPLES, OPTIONS, NOTES sections
- [ ] Progressive examples (simple → complex)
- [ ] Notes explain prerequisites/behavior
- [ ] No args shows helpful message (not raw Effect listing)

## Test Commands Reference

### All Tested Variants

```bash
# Main
npx . --help

# Primary commands
npx . index --help
npx . search --help
npx . context --help
npx . tree --help
npx . links --help
npx . backlinks --help
npx . stats --help

# Config variants
npx . config              # ❌ UGLY
npx . config --help       # ✅ GOOD
npx . config init --help
npx . config show --help
npx . config check --help
```

## Files to Check

Based on this audit, investigate:

1. **src/cli/commands/config/index.ts** - Why does bare `config` show Effect default?
2. **src/cli/help/config.ts** (or similar) - Where is custom help defined?
3. **Effect CLI command registration** - How are defaults handled?

## Conclusion

The mdcontext CLI has **excellent help documentation** overall (9/10 main commands world-class). The only issue is the `config` command when run without arguments showing Effect's raw default output.

**Quick Win:** Implement auto-help for `npx . config` (no args) to match the quality of all other commands.
