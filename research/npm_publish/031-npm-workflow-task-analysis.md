# NPM Workflow Task Analysis

Analysis of `/docs/014-npm-workflow-synthesis.md` against current implementation.

Date: January 2026

---

## Implemented (No Action Needed)

### Package Manager: pnpm ✅

- `pnpm/action-setup@v4` in GitHub Actions
- Local environment running pnpm 10.28.0

### Release Tool: Changesets ✅

- `.changeset/config.json` properly configured
- Uses `@changesets/changelog-github` for changelog generation
- Scripts: `"changeset": "changeset"`, `"release": "changeset publish"`

### GitHub Actions Workflows ✅

- `.github/workflows/ci.yml` - PR quality checks
- `.github/workflows/release.yml` - Release automation
- OIDC permissions: `id-token: write` (correctly configured)
- `fetch-depth: 0` for proper changeset operation

### Quality Gates ✅

- `"quality": "pnpm build && npx publint && npx attw --pack ."`
- `"prepublishOnly": "pnpm build && pnpm test && pnpm typecheck"`
- Biome for linting (modern ESLint alternative)

### Build Tool: tsup ✅

- `"build": "tsup src/cli/main.ts src/mcp/server.ts src/index.ts --format esm --dts"`

### Module Format: ESM-first ✅

- `"type": "module"` in package.json

---

## Task Candidates

### 1. Configure OIDC Trusted Publishing on npm

**Priority:** Critical (releases will fail without this)

**Description:**
GitHub Actions workflow has `id-token: write` but npm package needs to be configured to accept OIDC tokens.

**Steps:**

1. Go to npmjs.com > Package (`mdcontext`) > Settings > Trusted Publishers
2. Add GitHub Actions as trusted publisher:
   - Organization/User: `alphab`
   - Repository: `mdcontext`
   - Workflow file: `release.yml`
   - Environment: (leave blank or use `production`)

**Why:** OIDC eliminates need for long-lived NPM tokens. Classic tokens were revoked Dec 9, 2025.

---

### 2. Create CONTRIBUTING.md with Release Documentation

**Priority:** Low

**Description:**
Document the Changesets workflow for contributors:

- How to create a changeset (`pnpm changeset`)
- What happens when changesets are merged (Version Packages PR created)
- What happens when Version Packages PR is merged (automatic npm publish)
- Guidelines for choosing semver bump types

**Why:** Reduces maintainer burden explaining the release process.

---

### 3. Test Complete Release Pipeline End-to-End

**Priority:** Medium

**Description:**
Validate the entire pipeline:

1. Creating a changeset works
2. Pushing to main triggers the release workflow
3. Changesets action creates a "Version Packages" PR
4. Merging the Version PR publishes to npm
5. Provenance badge appears on npmjs.com
6. GitHub release is created automatically

**Why:** Configuration bugs only discovered during actual release attempts.

---

### 4. Add --version Flag to CLI

**Priority:** Low

**Description:**
CLI should support `--version` flag returning current package version.

**Current:** CI tests `node dist/cli/main.js --help`
**Recommended:** Also test `node dist/cli/main.js --version`

**Why:** Users expect `--version` on CLI tools. Helps with debugging and support.

---

## Skipped (Not Applicable)

| Recommendation    | Reason to Skip                                                           |
| ----------------- | ------------------------------------------------------------------------ |
| Bun migration     | Explicitly "Do NOT migrate now" - no `--provenance`, native addon issues |
| tsdown migration  | Optional - tsup working well                                             |
| ESLint setup      | Using Biome instead (modern alternative)                                 |
| publint as devDep | `npx publint` works fine                                                 |

---

## Summary

| Category        | Count             |
| --------------- | ----------------- |
| Implemented     | 6 major areas     |
| Task Candidates | 4 items           |
| Skipped         | 4 recommendations |

**Critical action:** Configure OIDC on npm before attempting any release.
