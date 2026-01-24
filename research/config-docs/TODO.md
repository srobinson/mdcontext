# Configuration Fixes TODO

---
**RESEARCH METADATA**

- Analysis Date: 2026-01-24
- Git Commit: ~pre-07c9e72 (before fixes)
- Status: ⚠️ Outdated (5/6 P0-P1 tasks complete)
- Last Validated: 2026-01-24
- Superseded By: [fix-validation.md](./fix-validation.md)
- Worktree: nancy-ALP-139
- Index: [/research/INDEX.md](../INDEX.md)

**COMPLETION STATUS**

Most tasks in this document have been COMPLETED:
- ✅ P0 Task #1: Fix TypeScript Loading - COMPLETE
- ✅ P0 Task #2: Expose Summarization - COMPLETE
- ✅ P0 Task #3: Update README - COMPLETE
- ✅ P1 Task #4: Add Config to Main Help - COMPLETE
- ❌ P1 Task #5: Add Troubleshooting to CONFIG.md - **ONLY REMAINING TASK**
- ✅ P1 Task #6: Document TypeScript Limitation - COMPLETE

See fix-validation.md for verification details.
---

Based on analysis completed 2026-01-24

---

## Critical Fixes (Required Before Release)

### 1. Fix TypeScript Config Loading ✅ COMPLETE
**Priority:** P0
**Effort:** 4-8 hours
**Impact:** High - affects recommended workflow
**Status:** ✅ COMPLETED in commit db80c90c

**Implemented Option:** Option B (document limitation, use .js with JSDoc)

**Files changed:**
- ✅ `src/cli/commands/config-cmd.ts` - Changed default format to 'js' (line 202)
- ✅ `docs/CONFIG.md` - Updated TypeScript section, added limitation note (lines 91, 131)
- ✅ `README.md` - Changed examples to use .js (lines 189-198)
- ✅ `src/config/file-provider.ts` - Error message adequate for .ts files

**Tests added:**
- ✅ .js config with JSDoc types works
- ✅ Error message for .ts files shown
- ✅ Integration tests updated

---

### 2. Expose Summarization Configuration ✅ COMPLETE
**Priority:** P0
**Effort:** 2-4 hours
**Impact:** High - hidden feature
**Status:** ✅ COMPLETED (exact commit unknown, before db80c90c)

**Implementation:**

#### Step 1: Add to Generated Config Files ✅ COMPLETE
- ✅ Edited `src/cli/commands/config-cmd.ts`
- ✅ Updated `generateConfigContent()` function
- ✅ Added summarization section to JSON format (lines 54-61)
- ✅ Added summarization section to JavaScript format (lines 149-168)

**JSON addition (after embeddings section):**
```json
"summarization": {
  "briefTokenBudget": 100,
  "summaryTokenBudget": 500,
  "compressionRatio": 0.3,
  "minSectionTokens": 20,
  "maxTopics": 10,
  "minPartialBudget": 50
}
```

**TypeScript addition (after embeddings section):**
```typescript
// Summarization settings - configure context assembly
summarization: {
  // Token budget for 'brief' compression level (default: 100)
  briefTokenBudget: 100,

  // Token budget for 'summary' compression level (default: 500)
  summaryTokenBudget: 500,

  // Target compression ratio for summaries (default: 0.3)
  compressionRatio: 0.3,

  // Minimum tokens for any section summary (default: 20)
  minSectionTokens: 20,

  // Maximum topics to extract from a document (default: 10)
  maxTopics: 10,

  // Minimum remaining budget for partial content (default: 50)
  minPartialBudget: 50,
},
```

#### Step 2: Add to Config Check Output ✅ COMPLETE
- ✅ Edited `src/cli/commands/config-cmd.ts`
- ✅ Updated `checkCommand` function
- ✅ Added summarization to `configWithSources` object (lines 562-567)

**Addition:**
```typescript
summarization: buildSectionWithSources(
  'summarization',
  defaultConfig.summarization,
  fileConfig.summarization,
  envConfig,
),
```

#### Step 3: Update Types ✅ COMPLETE
- ✅ Verified `ConfigWithSources` interface includes summarization
- ✅ Added summarization to interface (line 364)

**Addition:**
```typescript
interface ConfigWithSources {
  index: ConfigSectionWithSources<typeof defaultConfig.index>
  search: ConfigSectionWithSources<typeof defaultConfig.search>
  embeddings: ConfigSectionWithSources<typeof defaultConfig.embeddings>
  summarization: ConfigSectionWithSources<typeof defaultConfig.summarization> // ADD THIS
  output: ConfigSectionWithSources<typeof defaultConfig.output>
  paths: ConfigSectionWithSources<typeof defaultConfig.paths>
}
```

#### Step 4: Update JSON Converter ✅ COMPLETE
- ✅ Updated `configToJsonFormat()` function
- ✅ Added summarization section conversion (line 506)

**Addition:**
```typescript
return {
  index: convertSection(config.index),
  search: convertSection(config.search),
  embeddings: convertSection(config.embeddings),
  summarization: convertSection(config.summarization), // ADD THIS
  output: convertSection(config.output),
  paths: convertSection(config.paths),
}
```

**Tests added:**
- ✅ Test summarization in generated JSON config
- ✅ Test summarization in generated JS config
- ✅ Test summarization in config check text output
- ✅ Test summarization in config check JSON output
- ⚠️ Test summarization env var overrides (assumed working)

---

### 3. Update README.md ✅ COMPLETE
**Priority:** P0
**Effort:** 30 minutes
**Impact:** Medium - users can't discover config
**Status:** ✅ COMPLETED (exact commit unknown, before db80c90c)

**Changes made:**

#### Add to Quick Reference ✅ COMPLETE
```markdown
QUICK REFERENCE
  mdcontext index [path]           Index markdown files (add --embed for semantic search)
  mdcontext search <query> [path]  Search by meaning or structure
  mdcontext context <files...>     Get LLM-ready summary
  mdcontext tree [path|file]       Show files or document outline
  mdcontext config init            Create config file  ← ADD
  mdcontext config check           Validate config     ← ADD
  mdcontext links <file>           Outgoing links
  mdcontext backlinks <file>       Incoming links
  mdcontext stats [path]           Index statistics
```

#### Expand Configuration Section ✅ COMPLETE (implemented at lines 205-234)
```markdown
## Configuration

mdcontext supports a layered configuration system for persistent settings:

```bash
# Create a config file
mdcontext config init

# Check your configuration
mdcontext config check

# Customize settings in mdcontext.config.json
{
  "index": {
    "excludePatterns": ["node_modules", ".git", "dist", "vendor"]
  },
  "search": {
    "defaultLimit": 20
  }
}
```

Configuration precedence: CLI flags > Environment variables > Config file > Defaults

**See [docs/CONFIG.md](./docs/CONFIG.md) for complete configuration reference.**

### Index Location
```

**Files changed:**
- ✅ `README.md` - Added config to quick reference (line 11) and expanded section (lines 205-234)

---

## Important Improvements (Should Do Soon)

### 4. Add Config to Main Help Output ✅ COMPLETE
**Priority:** P1
**Effort:** 1 hour
**Impact:** Medium - discoverability
**Status:** ✅ COMPLETED (exact commit unknown, before db80c90c)

**Files changed:**
- ✅ Main help text now includes config commands in COMMANDS section
- ✅ Config workflow example added to WORKFLOWS section

**Example addition:**
```
COMMANDS
  index [path]              Index markdown files (default: .)
  search <query> [path]     Search by meaning or structure
  context <files>...        Get LLM-ready summary
  tree [path]               Show files or document outline
  config <command>          Configuration management  ← ADD
  links <file>              Show outgoing links
  backlinks <file>          Show incoming links
  stats [path]              Index statistics
```

---

### 5. Add Troubleshooting to CONFIG.md ⏭️ TODO
**Priority:** P1
**Effort:** 1 hour
**Impact:** Medium - helps users debug issues
**Status:** ⏭️ NOT IMPLEMENTED - **ONLY REMAINING P0/P1 TASK**

**Location:** Add new section to `docs/CONFIG.md` before "Examples" section

**Content to add:**
```markdown
## Troubleshooting

### Config File Not Loading

If your config file isn't being used:

1. **Verify the file is found:**
   ```bash
   mdcontext config show
   ```
   This shows which config file mdcontext is using, if any.

2. **Check for errors:**
   ```bash
   mdcontext config check --json
   ```
   The `errors` array will show any loading failures.

3. **Common issues:**
   - **JSON syntax errors:** Validate your JSON with `jq` or an online validator
   - **TypeScript files:** Currently not supported - use `.js` or `.json` instead
   - **Wrong export:** Ensure `.js` files use `export default { ... }`
   - **File location:** Config must be in project root or parent directory

### TypeScript Config Files

**Current Limitation:** `.ts` config files are not currently supported due to Node.js module loading restrictions.

**Recommended alternatives:**

1. **JavaScript with JSDoc types** (best option):
   ```javascript
   // mdcontext.config.js
   /** @type {import('mdcontext').PartialMdContextConfig} */
   export default {
     index: {
       maxDepth: 10,
     },
   }
   ```
   Provides type checking in VS Code while working at runtime.

2. **JSON format** (simplest):
   ```bash
   mdcontext config init --format json
   ```

### Environment Variables Not Working

1. **Check variable name:** Must be uppercase with `MDCONTEXT_` prefix
   ```bash
   # Correct
   export MDCONTEXT_SEARCH_DEFAULTLIMIT=20

   # Wrong - will not work
   export mdcontext_search_defaultLimit=20
   ```

2. **Verify with config check:**
   ```bash
   mdcontext config check
   ```
   Look for "(from environment)" annotations.

3. **Array values:** Use comma-separated strings
   ```bash
   export MDCONTEXT_INDEX_EXCLUDEPATTERNS="node_modules,.git,dist"
   ```

### Config Not Taking Effect

If you've set config but commands still use defaults:

1. **Check precedence:** CLI flags override everything
   ```bash
   # This ignores config file's defaultLimit setting
   mdcontext search "query" --limit 5
   ```

2. **Verify effective config:**
   ```bash
   mdcontext config check
   ```
   Shows exactly what values are being used and why.

3. **Try explicit config path:**
   ```bash
   mdcontext --config ./mdcontext.config.json index
   ```
```

**Files to change:**
- ⏭️ `docs/CONFIG.md` - Add troubleshooting section (ready to use content below)

---

### 6. Document TypeScript Limitation ✅ COMPLETE
**Priority:** P1
**Effort:** 30 minutes
**Impact:** Medium - sets correct expectations
**Status:** ✅ COMPLETED in commit db80c90c

**Files changed:**
- ✅ `docs/CONFIG.md` - Updated TypeScript section (lines 91, 131) with limitation note and JSDoc recommendation

**Changes:**
Replace "TypeScript Config (Recommended)" section with:

```markdown
### TypeScript Config

**Note:** TypeScript config files (`.ts`) are currently not supported due to Node.js module loading restrictions. Use JavaScript with JSDoc for type safety instead.

**Recommended: JavaScript with JSDoc Types**

```javascript
// mdcontext.config.js
/**
 * @type {import('mdcontext').PartialMdContextConfig}
 */
export default {
  index: {
    maxDepth: 10,
    excludePatterns: ['node_modules', '.git', 'dist', 'build'],
    fileExtensions: ['.md', '.mdx'],
    followSymlinks: false,
    indexDir: '.mdcontext',
  },
  search: {
    defaultLimit: 10,
    maxLimit: 100,
    minSimilarity: 0.5,
    includeSnippets: true,
    snippetLength: 200,
  },
  embeddings: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    batchSize: 100,
    maxRetries: 3,
  },
  output: {
    format: 'text',
    color: true,
    verbose: false,
  },
}
```

The JSDoc `@type` annotation provides full TypeScript type checking and IDE autocompletion while remaining a valid JavaScript file that Node.js can import.
```

---

## Nice-to-Have Enhancements

### 7. Better Config Validation
**Priority:** P2
**Effort:** 4-6 hours

- [ ] Warn on unknown config keys
- [ ] Warn on invalid value types
- [ ] Suggest fixes for common mistakes
- [ ] Add runtime schema validation

### 8. Additional Config Commands
**Priority:** P2
**Effort:** 3-4 hours each

- [ ] `config validate <file>` - Validate specific file without using it
- [ ] `config edit` - Open config in $EDITOR
- [ ] `config reset` - Delete config and return to defaults
- [ ] `config path` - Rename `config show` for clarity

### 9. Enhanced Config Init
**Priority:** P2
**Effort:** 2-3 hours

- [ ] Add `--minimal` flag for bare-bones config
- [ ] Add `--interactive` for guided setup
- [ ] Show diff before overwrite with --force
- [ ] Ask for confirmation before overwrite

### 10. JSON Schema Support
**Priority:** P2
**Effort:** 4-6 hours

- [ ] Create JSON schema file
- [ ] Publish to `https://mdcontext.dev/schema.json`
- [ ] Add version field to schema
- [ ] Enable IDE validation for JSON configs

### 11. Config Profiles
**Priority:** P3
**Effort:** 6-8 hours

- [ ] Support `MDCONTEXT_PROFILE` env var
- [ ] Allow `mdcontext.config.{profile}.json` files
- [ ] Add `--profile` CLI flag
- [ ] Enable easy dev/prod/test switching

### 12. Config Extension
**Priority:** P3
**Effort:** 8-10 hours

- [ ] Support `extends` field for config composition
- [ ] Allow shared base configs
- [ ] Enable project-specific overrides
- [ ] Add config merging logic

---

## Testing Checklist

**Status:** ✅ MOST TESTS PASSING

### Config Init ✅ ALL PASSING
- ✅ `npx . config init` creates .js file (not .ts)
- ✅ Generated .js file has JSDoc type annotations
- ✅ Generated JSON file includes all sections (including summarization)
- ✅ `--force` flag overwrites existing file
- ✅ `--format json` creates JSON file
- ✅ JSON format includes all sections

### Config Show ✅ ALL PASSING
- ✅ Shows "No config file found" when no config
- ✅ Lists all searched filenames
- ✅ Shows correct path when config exists
- ✅ JSON output works (`--json --pretty`)

### Config Check ✅ ALL PASSING
- ✅ Shows all sections including summarization
- ✅ Source annotations are correct (default/file/env)
- ✅ Environment variable overrides work
- ✅ JSON output includes all sections
- ✅ Validation errors shown when config fails to load
- ✅ Works with no config file (shows defaults)

### Documentation ⚠️ MOSTLY PASSING (1 gap)
- ✅ README quick reference includes config
- ✅ README config section is clear
- ⏭️ CONFIG.md troubleshooting section is accurate (NOT YET ADDED)
- ✅ CONFIG.md TypeScript limitation is documented
- ✅ Main help output includes config commands
- ✅ All examples use .js (not .ts)

### Integration ✅ ALL PASSING
- ✅ Config file is loaded correctly
- ✅ Environment variables override file config
- ✅ CLI flags override everything
- ✅ Config works with all commands (index, search, etc.)

---

## Estimated Total Effort

**Critical (P0):** ✅ 8-15 hours COMPLETED
**Important (P1):** ⚠️ 3-5 hours COMPLETED (1 hour remaining for troubleshooting)
**Nice-to-Have (P2-P3):** ⏭️ 20-30 hours (deferred)

**Original estimate:** P0 + P1 = 12-21 hours (~2-3 days)
**Actual completed:** ~11-20 hours
**Remaining:** ~30-60 minutes (troubleshooting section only)

---

## Success Criteria

**Status:** ✅ 7/8 COMPLETE

Configuration system improvements are complete when:

1. ✅ Users can create working config files following documentation - COMPLETE
2. ✅ TypeScript config issue is fixed OR documented with alternative - COMPLETE
3. ✅ Summarization config is visible and usable - COMPLETE
4. ✅ README makes config system discoverable - COMPLETE
5. ✅ Main help includes config commands - COMPLETE
6. ⏭️ Troubleshooting guide helps users debug issues - ONLY REMAINING ITEM
7. ✅ All tests pass - COMPLETE
8. ✅ No config-related errors in example workflows - COMPLETE

---

## References

- Full analysis: [analysis.md](./analysis.md)
- Executive summary: [SUMMARY.md](./SUMMARY.md)
- Source files: See analysis.md "Files Examined" section
