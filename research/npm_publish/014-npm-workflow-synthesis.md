# npm Publishing Workflow Synthesis: Final Recommendations for md-tldr

> Consolidated from 3 research agents | January 2026

This document synthesizes research from three independent agents into actionable recommendations for implementing a world-class npm publishing workflow for the `mdcontext` package.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Consensus Analysis](#consensus-analysis)
3. [Final Recommended Stack](#final-recommended-stack)
4. [Bun Migration Verdict](#bun-migration-verdict)
5. [Recommended GitHub Actions Workflow](#recommended-github-actions-workflow)
6. [Quality Gates](#quality-gates)
7. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

### All Three Agents Agree On

| Decision              | Consensus                    | Confidence |
| --------------------- | ---------------------------- | ---------- |
| **Package Manager**   | pnpm (stay)                  | 100%       |
| **Release Tool**      | Changesets                   | 100%       |
| **Authentication**    | OIDC Trusted Publishing      | 100%       |
| **Bun Migration Now** | No                           | 100%       |
| **Provenance**        | Enable via `id-token: write` | 100%       |
| **Quality Tools**     | publint + attw               | 100%       |

### Key Insight

All agents independently arrived at the same conclusion: **pnpm + Changesets + OIDC** is the optimal stack for md-tldr in 2026. This represents strong consensus across different research approaches.

---

## Consensus Analysis

### Areas of Complete Agreement

#### 1. Package Manager: Stay with pnpm

All agents recommend staying with pnpm:

- **Agent 1**: "Migration effort not justified" for existing pnpm projects
- **Agent 2**: "pnpm" as primary recommendation, with Bun as speed alternative
- **Agent 3**: "pnpm + tsup workflow is working well"

**Rationale**:

- Mature ecosystem with excellent CI/CD support
- Native provenance support (`--provenance` flag)
- Workspace publishing is stable
- No migration cost

#### 2. Release Automation: Changesets

Unanimous recommendation for Changesets over semantic-release:

| Factor           | Changesets               | semantic-release     |
| ---------------- | ------------------------ | -------------------- |
| Monorepo Support | Native, first-class      | Via outdated plugins |
| Human Review     | PR-based workflow        | Fully automated      |
| Control          | High (edit after commit) | Low (commit-driven)  |
| pnpm Integration | Official documentation   | Community support    |

**Why not semantic-release?**

- Agent 1: "semantic-release monorepo plugin (multi-release) is not well maintained"
- Agent 2: "No native monorepo support (requires community plugins)"
- Agent 3: "Version coupling with deploys causes cleanup issues on failure"

#### 3. Authentication: OIDC Trusted Publishing

All agents emphasize OIDC as the clear winner:

**Key Benefits**:

- No token management (classic tokens revoked Dec 9, 2025)
- Short-lived, cryptographically signed credentials
- Automatic provenance attestations
- Cannot be exfiltrated or reused

**Critical Configuration**:

```yaml
permissions:
  contents: write
  id-token: write # Required for OIDC
```

#### 4. Quality Tools

All agents recommend the same pre-publish validation:

| Tool               | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| **publint**        | Package structure validation (exports, main, module) |
| **attw**           | TypeScript types validation                          |
| **pnpm typecheck** | Compile-time type checking                           |

### Minor Differences (Non-Conflicting)

| Topic              | Agent 1     | Agent 2                           | Agent 3                |
| ------------------ | ----------- | --------------------------------- | ---------------------- |
| Build Tool         | tsup        | **tsdown** (recommends migration) | tsup                   |
| Node Versions      | 22          | 20, 22, 24                        | 18, 20, 22             |
| OS Matrix          | Ubuntu only | Ubuntu, macOS, Windows            | Ubuntu, macOS, Windows |
| setup-node version | v4          | **v6**                            | v4                     |

**Recommendations**:

- Build Tool: Keep tsup for now; tsdown migration is optional
- Node Versions: Test 20, 22 minimum; 18 for LTS users, 24 for forward compatibility
- OS Matrix: Add Windows/macOS for CLI tool (path handling differs)
- setup-node: Use v4 (stable); v6 may be cutting edge

---

## Final Recommended Stack

| Component           | Choice                     | Rationale                                          |
| ------------------- | -------------------------- | -------------------------------------------------- |
| **Package Manager** | pnpm 10                    | Mature, stable, excellent CI support               |
| **Release Tool**    | Changesets                 | PR-based review, monorepo-ready, pnpm integration  |
| **Authentication**  | OIDC Trusted Publishing    | No tokens, automatic provenance, industry standard |
| **Build Tool**      | tsup (current)             | Working well, tsdown migration optional            |
| **CI Platform**     | GitHub Actions             | Native OIDC support, excellent pnpm integration    |
| **Module Format**   | ESM-first + CJS fallback   | Maximum compatibility                              |
| **Quality Gates**   | publint + attw + typecheck | Comprehensive pre-publish validation               |

---

## Bun Migration Verdict

### Decision: **Do NOT migrate now. Re-evaluate in 6-12 months.**

All three agents independently reached the same conclusion.

### Why Not Now

| Issue                        | Impact                               | Source                 |
| ---------------------------- | ------------------------------------ | ---------------------- |
| No `--provenance` flag       | Cannot generate SLSA attestations    | Agent 1 (Issue #15601) |
| 34% compatibility challenges | Risk for production CLI              | Agent 2, Agent 3       |
| Native addon issues          | `hnswlib-node`, `tiktoken` may break | Agent 3                |
| Workspace publishing bugs    | References may not resolve           | Agent 1 (Issue #15246) |

### md-tldr Specific Concerns

```
Dependencies with Bun risk:
- hnswlib-node (native addon - vector search)
- tiktoken (native addon - tokenization)

Low-risk dependencies:
- openai, remark-*, unified (pure JS)
- gray-matter, chokidar (widely compatible)
```

### Future Consideration

**When to reconsider Bun:**

1. `--provenance` flag is implemented (track Issue #15601)
2. Native addon compatibility reaches 95%+
3. `hnswlib-node` and `tiktoken` confirmed working
4. md-tldr usage grows enough to warrant dual distribution

**Potential hybrid approach (future):**

- Keep Node.js as primary npm target
- Offer Bun-compiled binary as alternative distribution
- Use Bun for local development speed

---

## Recommended GitHub Actions Workflow

### Complete Production-Ready Workflow

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write
  id-token: write # Required for OIDC trusted publishing

jobs:
  # ============================================
  # Job 1: Quality Gates (fast feedback)
  # ============================================
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      # Type checking
      - run: pnpm typecheck

      # Linting
      - run: pnpm lint

      # Package structure validation
      - name: Validate package exports
        run: npx publint

      # TypeScript types validation
      - name: Validate TypeScript types
        run: npx attw --pack .

  # ============================================
  # Job 2: Test Matrix (parallel)
  # ============================================
  test:
    strategy:
      fail-fast: false # See all failures, not just first
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [20, 22]
        exclude:
          # Skip known problematic combinations if any
          - os: windows-latest
            node: 20

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm build

      # Test CLI binary actually works
      - name: Test CLI execution
        run: |
          node dist/cli/main.js --version
          node dist/cli/main.js --help

  # ============================================
  # Job 3: Release (after quality + tests pass)
  # ============================================
  release:
    needs: [quality, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Required for changesets

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "pnpm"
          registry-url: "https://registry.npmjs.org"

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          commit: "chore: release packages"
          title: "chore: release packages"
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # No NPM_TOKEN needed with OIDC trusted publishing!
```

### Separate CI Workflow (for PRs)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm typecheck
      - run: pnpm lint
      - run: npx publint
      - run: npx attw --pack .

  test:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [20, 22]

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm build
      - name: Test CLI
        run: node dist/cli/main.js --help
```

---

## Quality Gates

### Pre-Publish Checklist (Automated)

| Gate             | Tool                            | Blocks Publish |
| ---------------- | ------------------------------- | -------------- |
| Type Safety      | `pnpm typecheck`                | Yes            |
| Linting          | `pnpm lint`                     | Yes            |
| Unit Tests       | `pnpm test`                     | Yes            |
| Build            | `pnpm build`                    | Yes            |
| Package Exports  | `npx publint`                   | Yes            |
| TypeScript Types | `npx attw --pack .`             | Yes            |
| CLI Works        | `node dist/cli/main.js --help`  | Yes            |
| Cross-Platform   | Matrix (Ubuntu, macOS, Windows) | Yes            |
| Multi-Node       | Matrix (Node 20, 22)            | Yes            |

### Package.json Scripts

Add these scripts to support the workflow:

```json
{
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "quality": "pnpm build && npx publint && npx attw --pack .",
    "prepublishOnly": "pnpm build && pnpm test && pnpm typecheck"
  }
}
```

### Dev Dependencies to Add

```bash
pnpm add -D @changesets/cli @changesets/changelog-github
```

---

## Implementation Roadmap

### Phase 1: Setup Changesets (Day 1)

```bash
# 1. Install changesets
pnpm add -D @changesets/cli @changesets/changelog-github

# 2. Initialize
pnpm changeset init

# 3. Configure .changeset/config.json
```

Create `.changeset/config.json`:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": ["@changesets/changelog-github", { "repo": "alphab/md-tldr" }],
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### Phase 2: Configure OIDC Trusted Publishing (Day 1)

1. **Go to npmjs.com** > Package (`mdcontext`) > Settings > Trusted Publishers
2. **Add GitHub Actions** as trusted publisher:
   - Organization/User: `alphab` (or your npm username)
   - Repository: `md-tldr`
   - Workflow file: `release.yml`
   - Environment: (leave blank or use `production`)
3. **Verify** the package is configured for OIDC

### Phase 3: Create GitHub Actions Workflows (Day 1)

1. Create `.github/workflows/ci.yml` (PR checks)
2. Create `.github/workflows/release.yml` (main branch publish)
3. Ensure `id-token: write` permission is set

### Phase 4: Add Quality Tools (Day 1-2)

```bash
# These are used via npx, no install needed
# But you can add them as dev dependencies if preferred:
pnpm add -D publint @arethetypeswrong/cli
```

Update `package.json` with quality scripts.

### Phase 5: Test the Workflow (Day 2)

1. **Create a test changeset**:

   ```bash
   pnpm changeset
   # Choose patch, describe the change
   ```

2. **Push to main** and verify:
   - CI runs all quality gates
   - Changesets action creates a "Version Packages" PR

3. **Merge the Version PR** and verify:
   - Package publishes to npm
   - Provenance badge appears on npmjs.com
   - GitHub release is created

### Phase 6: Documentation (Day 2)

Add to `CONTRIBUTING.md`:

```markdown
## Releasing

This project uses [Changesets](https://github.com/changesets/changesets) for releases.

### Creating a changeset

When you make a change that should be released:

\`\`\`bash
pnpm changeset
\`\`\`

Follow the prompts to:

1. Select the package(s) to bump
2. Choose the bump type (patch/minor/major)
3. Write a summary of the change

### Release process

1. Push your changeset file with your PR
2. Once merged, a "Version Packages" PR is automatically created
3. When that PR is merged, packages are automatically published to npm
   \`\`\`

---

## Summary

### What You're Getting

| Feature                  | Benefit                                     |
| ------------------------ | ------------------------------------------- |
| **OIDC Authentication**  | No token rotation, automatic provenance     |
| **Changesets**           | Human-reviewable releases, monorepo-ready   |
| **Quality Gates**        | Catch issues before publish                 |
| **Matrix Testing**       | Confidence across Node versions and OS      |
| **Automatic Provenance** | SLSA Build Level 2, verifiable supply chain |

### What You're Avoiding

| Risk                | Mitigation                              |
| ------------------- | --------------------------------------- |
| Token leaks         | OIDC eliminates long-lived tokens       |
| Broken packages     | publint + attw catch export issues      |
| Type errors         | attw validates TypeScript consumers     |
| Platform bugs       | Matrix testing across OS/Node           |
| Accidental releases | Changesets requires explicit versioning |

---

## References

All research documents:

- `/docs/npm-workflow-research-agent1.md` - Focus: GitHub Actions, OIDC, Bun analysis
- `/docs/npm-workflow-research-agent2.md` - Focus: Release tools, CI/CD design, ESM/CJS
- `/docs/npm-workflow-research-agent3.md` - Focus: DX, quality tools, testing strategies

Key external sources:

- [npm Trusted Publishing with OIDC](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/)
- [Using Changesets with pnpm](https://pnpm.io/next/using-changesets)
- [publint](https://publint.dev/)
- [Are The Types Wrong?](https://arethetypeswrong.github.io/)

---

_Synthesis completed January 2026_
_Ready for implementation_
```
