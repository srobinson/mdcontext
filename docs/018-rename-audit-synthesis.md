# Migration Plan: md-tldr to mdcontext

**Date:** 2026-01-21
**Status:** Ready for Execution
**Recommended Version Bump:** Major (v2.0.0)

---

## 1. Executive Summary

### Scope Overview

| Category | Files Affected | References | Notes |
|----------|----------------|------------|-------|
| **Code (Critical)** | 15 | 190+ | Package identity, CLI, error messages |
| **Documentation** | 20 | ~420 | README, USAGE, internal docs |
| **Storage** | 5 | 30+ | Index directory paths |
| **Tests** | 2 | 10+ | Test assertions and fixtures |
| **TOTAL** | ~42 files | ~650+ references | |

### Variant Forms to Replace

| Current | New | Usage |
|---------|-----|-------|
| `md-tldr` | `mdcontext` | Package name, npm, hyphenated |
| `mdtldr` | `mdcontext` | CLI binary, error messages |
| `mdtldr-mcp` | `mdcontext-mcp` | MCP server binary |
| `.md-tldr` | `.mdcontext` | Data directory |
| `.md-tldrignore` | `.mdcontextignore` | Ignore file (planned) |
| `md_tldr_*` | `mdcontext_*` | Metrics names (planned) |

---

## 2. Critical Path (Blocking Items)

These items MUST change for the rename to be functional. The tool will not work correctly without these.

### 2.1 Package Identity

| Priority | File | Line | Change |
|----------|------|------|--------|
| **P0** | `package.json` | 2 | `"name": "md-tldr"` -> `"name": "mdcontext"` |
| **P0** | `package.json` | 9 | `"mdtldr": ...` -> `"mdcontext": ...` |
| **P0** | `package.json` | 10 | `"mdtldr-mcp": ...` -> `"mdcontext-mcp": ...` |

### 2.2 Index Directory Constant

| Priority | File | Line | Change |
|----------|------|------|--------|
| **P0** | `src/index/types.ts` | 98 | `INDEX_DIR = '.md-tldr'` -> `INDEX_DIR = '.mdcontext'` |

### 2.3 CLI Command Name

| Priority | File | Line | Change |
|----------|------|------|--------|
| **P0** | `src/cli/main.ts` | 43 | `Command.make('mdtldr')` -> `Command.make('mdcontext')` |
| **P0** | `src/cli/main.ts` | 57 | `name: 'mdtldr'` -> `name: 'mdcontext'` |

### 2.4 MCP Server Name

| Priority | File | Line | Change |
|----------|------|------|--------|
| **P0** | `src/mcp/server.ts` | 414 | `name: 'mdtldr-mcp'` -> `name: 'mdcontext-mcp'` |

---

## 3. Breaking Changes (User Impact)

### 3.1 CLI Binary Name Change

**Impact:** Users must update their shell aliases, scripts, and muscle memory.

| Before | After |
|--------|-------|
| `mdtldr index .` | `mdcontext index .` |
| `mdtldr search "query"` | `mdcontext search "query"` |
| `mdtldr-mcp` | `mdcontext-mcp` |

**Mitigation:** Consider publishing a shim package `md-tldr` that prints deprecation warning and suggests the new name.

### 3.2 Data Directory Change

**Impact:** Existing `.md-tldr/` directories will not be found by the new version.

| Before | After |
|--------|-------|
| `.md-tldr/` | `.mdcontext/` |
| `.md-tldr/indexes/` | `.mdcontext/indexes/` |
| `.md-tldr/vectors.bin` | `.mdcontext/vectors.bin` |

**User Data at Risk:**
- Parsed document caches (cheap to regenerate)
- Section indexes (cheap to regenerate)
- **Embeddings** (expensive - API costs to regenerate)

### 3.3 MCP Configuration Change

**Impact:** Users with MCP integrations must update their config files.

**Claude Desktop / Cursor config changes:**
```json
// Before
{
  "mcpServers": {
    "md-tldr": {
      "command": "mdtldr-mcp"
    }
  }
}

// After
{
  "mcpServers": {
    "mdcontext": {
      "command": "mdcontext-mcp"
    }
  }
}
```

### 3.4 npm Package Name Change

**Impact:** Users must update their `package.json` or install commands.

| Before | After |
|--------|-------|
| `npm install -g md-tldr` | `npm install -g mdcontext` |
| `npx md-tldr` | `npx mdcontext` |

---

## 4. Non-Breaking Changes (Internal)

These changes improve consistency but don't affect users.

### 4.1 File Header Comments (11 files)

| File | Current | New |
|------|---------|-----|
| `src/index.ts` | `md-tldr - Token-efficient...` | `mdcontext - Token-efficient...` |
| `src/index/types.ts` | `Index data types for md-tldr` | `Index data types for mdcontext` |
| `src/core/types.ts` | `Core data types for md-tldr` | `Core data types for mdcontext` |
| `src/cli/main.ts` | `md-tldr CLI - Token-efficient...` | `mdcontext CLI - Token-efficient...` |
| `src/cli/help.ts` | `Custom help system for mdtldr` | `Custom help system for mdcontext` |
| `src/mcp/server.ts` | `MCP Server for md-tldr` | `MCP Server for mdcontext` |
| `src/search/query-parser.ts` | `Query Parser for md-tldr` | `Query Parser for mdcontext` |
| `src/search/searcher.ts` | `Keyword search for md-tldr` | `Keyword search for mdcontext` |
| `src/embeddings/types.ts` | `Embedding types for md-tldr` | `Embedding types for mdcontext` |
| `src/summarize/summarizer.ts` | `Summarization engine for md-tldr` | `Summarization engine for mdcontext` |
| `src/cli/cli.test.ts` | `E2E tests for mdtldr CLI` | `E2E tests for mdcontext CLI` |

### 4.2 Internal Documentation

Files that can be batch-replaced without user impact:
- `docs/DESIGN.md` (28 references)
- `docs/ROADMAP.md` (14 references)
- `docs/PROJECT.md` (2 references)
- `docs/DOGFOODING-FINDINGS.md` (18 references)
- `docs/current-implementation.md` (4 references)

### 4.3 Research Documents (~150 references)

**Option A:** Update all references
**Option B:** Add header note: "Historical document - references md-tldr (now mdcontext)"
**Recommendation:** Option B - these are historical and updating doesn't add value.

---

## 5. Migration Strategy

### 5.1 Recommended Approach: Big Bang with Migration Support

Given that:
- This is a hobby/personal project (low user count assumption)
- Backwards compatibility adds complexity
- Clean break is simpler to maintain

**Recommendation:** Major version bump with migration tooling.

### 5.2 Migration Path for Existing Users

#### Automatic Directory Migration

Add migration logic to detect and migrate legacy directories:

```typescript
// src/index/migration.ts
export const LEGACY_INDEX_DIR = '.md-tldr'
export const INDEX_DIR = '.mdcontext'

export const migrateIfNeeded = async (rootPath: string): Promise<void> => {
  const legacyPath = path.join(rootPath, LEGACY_INDEX_DIR)
  const newPath = path.join(rootPath, INDEX_DIR)

  if (await pathExists(legacyPath) && !await pathExists(newPath)) {
    console.log(`Migrating ${LEGACY_INDEX_DIR}/ to ${INDEX_DIR}/...`)
    await fs.rename(legacyPath, newPath)
    console.log('Migration complete.')
  }
}
```

#### Add migrate Command

```bash
mdcontext migrate [path]
```

- Renames `.md-tldr/` to `.mdcontext/`
- Outputs reminder to update `.gitignore`
- Safe to run multiple times (idempotent)

### 5.3 Version Bump Decision

| Type | When | Rationale |
|------|------|-----------|
| **Major (v2.0.0)** | **Recommended** | Breaking changes to CLI name, data directory |
| Minor (v1.x.0) | Not recommended | Too many breaking changes for minor |
| Patch (v1.x.y) | No | Definitely not - this is breaking |

### 5.4 Deprecation Period

**Not recommended** for this project because:
1. Maintaining two code paths is complex
2. Low user count doesn't justify the effort
3. Clean break is easier to document and support

If deprecation is desired anyway:
- v1.x: Add deprecation warnings but keep old behavior
- v2.0: Complete rename with migration command
- v2.x: Remove legacy support

---

## 6. Ordered Task List

### Phase 1: Critical - Core Identity (DO FIRST)

```bash
# Estimated: 30 minutes
```

- [ ] **1.1** Update `package.json` - name and bin entries
- [ ] **1.2** Update `src/index/types.ts` - INDEX_DIR constant
- [ ] **1.3** Update `src/cli/main.ts` - command name (lines 43, 57)
- [ ] **1.4** Update `src/mcp/server.ts` - server name (line 414)
- [ ] **1.5** Run `pnpm install` to regenerate lockfile
- [ ] **1.6** Update `.gitignore` - change `.md-tldr/` to `.mdcontext/`

### Phase 2: Critical - Error Messages (DO SECOND)

```bash
# Estimated: 45 minutes
```

All error messages that tell users what commands to run:

- [ ] **2.1** `src/cli/main.ts` (line 137)
- [ ] **2.2** `src/cli/argv-preprocessor.ts` (line 92)
- [ ] **2.3** `src/cli/commands/search.ts` (lines 125, 293, 367)
- [ ] **2.4** `src/cli/commands/stats.ts` (lines 57, 141)
- [ ] **2.5** `src/cli/commands/context.ts` (line 72)
- [ ] **2.6** `src/search/searcher.ts` (line 486)
- [ ] **2.7** `src/embeddings/semantic-search.ts` (lines 83, 196, 422)

### Phase 3: Critical - Help System (DO THIRD)

```bash
# Estimated: 20 minutes (bulk replace)
```

- [ ] **3.1** `src/cli/help.ts` - bulk replace `mdtldr` -> `mdcontext` (~100 occurrences)
- [ ] **3.2** `src/cli/help.ts` - update `.md-tldr` -> `.mdcontext` references

### Phase 4: Important - Hardcoded Paths

```bash
# Estimated: 15 minutes
```

- [ ] **4.1** `src/cli/utils.ts` (line 62) - replace `.md-tldr` with INDEX_DIR constant
- [ ] **4.2** `src/cli/utils.ts` (line 83) - replace `.md-tldr` with INDEX_DIR constant
- [ ] **4.3** `src/cli/utils.ts` (line 84) - replace `.md-tldr` with INDEX_DIR constant

### Phase 5: Important - Tests

```bash
# Estimated: 15 minutes
```

- [ ] **5.1** `src/cli/cli.test.ts` (line 10) - CLI constant
- [ ] **5.2** `src/cli/cli.test.ts` (line 32) - describe block
- [ ] **5.3** `src/cli/cli.test.ts` (line 70) - assertion
- [ ] **5.4** `src/cli/cli.test.ts` (line 101) - `.md-tldr` assertion
- [ ] **5.5** `src/cli/argv-preprocessor.test.ts` (line 10) - path constant

### Phase 6: Important - User-Facing Documentation

```bash
# Estimated: 1 hour (careful review needed)
```

- [ ] **6.1** `README.md` - all 98 references
- [ ] **6.2** `BACKLOG.md` (root) - all 22 references
- [ ] **6.3** `docs/USAGE.md` - all 76 references

### Phase 7: Nice-to-Have - Internal Documentation

```bash
# Estimated: 30 minutes (bulk replace acceptable)
```

- [ ] **7.1** `docs/DESIGN.md` - 28 references
- [ ] **7.2** `docs/ROADMAP.md` - 14 references
- [ ] **7.3** `docs/PROJECT.md` - 2 references
- [ ] **7.4** `docs/DOGFOODING-FINDINGS.md` - 18 references
- [ ] **7.5** `docs/current-implementation.md` - 4 references
- [ ] **7.6** `docs/BACKLOG.md` (in docs/) - 1 reference

### Phase 8: Nice-to-Have - File Header Comments

```bash
# Estimated: 15 minutes
```

- [ ] **8.1** Update all file header comments (11 files listed in Section 4.1)

### Phase 9: Nice-to-Have - Research Documents

```bash
# Estimated: 5 minutes OR skip
```

- [ ] **9.1** Add header note to research docs OR bulk replace (~150 references across 9 files)

### Phase 10: Verification

```bash
# Estimated: 30 minutes
```

- [ ] **10.1** Run full test suite: `pnpm test`
- [ ] **10.2** Run build: `pnpm build`
- [ ] **10.3** Test CLI manually: `pnpm mdcontext --help`
- [ ] **10.4** Test MCP server: `pnpm mdcontext-mcp`
- [ ] **10.5** Grep for remaining `mdtldr` references: `grep -rn "mdtldr" --include="*.ts"`
- [ ] **10.6** Grep for remaining `.md-tldr` references: `grep -rn "\.md-tldr" --include="*.ts"`
- [ ] **10.7** Test index command creates `.mdcontext/` directory

---

## 7. Search & Replace Commands

### For Source Code (*.ts files)

```bash
# Command name
find src -name "*.ts" -exec sed -i '' 's/mdtldr/mdcontext/g' {} \;

# Package name (hyphenated)
find src -name "*.ts" -exec sed -i '' 's/md-tldr/mdcontext/g' {} \;

# Directory name (escaped dot)
find src -name "*.ts" -exec sed -i '' 's/\.md-tldr/.mdcontext/g' {} \;
```

### For Documentation (*.md files)

```bash
# All forms
find . -name "*.md" -not -path "./node_modules/*" -exec sed -i '' 's/mdtldr/mdcontext/g' {} \;
find . -name "*.md" -not -path "./node_modules/*" -exec sed -i '' 's/md-tldr/mdcontext/g' {} \;
find . -name "*.md" -not -path "./node_modules/*" -exec sed -i '' 's/\.md-tldr/.mdcontext/g' {} \;
```

**Warning:** Manual review required after bulk replace for:
- Broken markdown links
- Code block formatting
- Version references

---

## 8. Post-Rename Checklist

- [ ] Verify npm package name `mdcontext` is available
- [ ] Rename GitHub repository from `md-tldr` to `mdcontext`
- [ ] Update repository URLs in `package.json`
- [ ] Publish to npm as `mdcontext`
- [ ] Update any external documentation/blog posts
- [ ] (Optional) Publish deprecation notice to `md-tldr` npm package
- [ ] (Optional) Set up npm redirect from `md-tldr` to `mdcontext`

---

## 9. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Users lose embeddings | Document migration path; add `migrate` command |
| Old tutorials break | Clear version documentation; major version bump signals change |
| npm name taken | Verify availability before starting rename |
| Incomplete rename | Use grep verification in Phase 10 |
| Tests fail | Run tests after each phase |

---

## 10. Timeline Estimate

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Core Identity | 30 min |
| Phase 2: Error Messages | 45 min |
| Phase 3: Help System | 20 min |
| Phase 4: Hardcoded Paths | 15 min |
| Phase 5: Tests | 15 min |
| Phase 6: User Docs | 1 hour |
| Phase 7: Internal Docs | 30 min |
| Phase 8: Comments | 15 min |
| Phase 9: Research Docs | 5 min |
| Phase 10: Verification | 30 min |
| **TOTAL** | **~4.5 hours** |

---

## Appendix A: Files by Priority

### P0 - Must Change (7 locations)
1. `package.json` (3 changes)
2. `src/index/types.ts` (1 change - INDEX_DIR)
3. `src/cli/main.ts` (2 changes)
4. `src/mcp/server.ts` (1 change)

### P1 - High Priority (15 locations)
5. `src/cli/help.ts` (~100 replacements)
6. `src/cli/commands/search.ts` (3 changes)
7. `src/cli/commands/stats.ts` (2 changes)
8. `src/cli/commands/context.ts` (1 change)
9. `src/cli/argv-preprocessor.ts` (1 change)
10. `src/search/searcher.ts` (1 change)
11. `src/embeddings/semantic-search.ts` (3 changes)
12. `src/cli/utils.ts` (3 changes)
13. `.gitignore` (2 changes)

### P2 - Medium Priority (5 files)
14. `src/cli/cli.test.ts`
15. `src/cli/argv-preprocessor.test.ts`
16. `README.md`
17. `BACKLOG.md`
18. `docs/USAGE.md`

### P3 - Low Priority (15+ files)
19. `docs/DESIGN.md`
20. `docs/ROADMAP.md`
21. `docs/PROJECT.md`
22. All file header comments
23. Research documents

---

## Appendix B: Verification Grep Commands

```bash
# After rename, these should return 0 results (excluding this file):
grep -rn "mdtldr" --include="*.ts" --include="*.json" | grep -v "rename-audit"
grep -rn '"md-tldr"' --include="*.ts" --include="*.json"
grep -rn "\.md-tldr" --include="*.ts"

# Check for any remaining old references in docs:
grep -rn "mdtldr" --include="*.md" | grep -v "rename-audit" | head -20
```
