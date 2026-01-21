# NPM Publishing Workflow Best Practices 2026

> Research conducted January 2026 - Modern approaches for npm publishing with pnpm and GitHub Actions

## Table of Contents

1. [Release Automation Tools](#1-release-automation-tools)
2. [CI/CD Pipeline Design](#2-cicd-pipeline-design)
3. [NPM Provenance & Supply Chain Security](#3-npm-provenance--supply-chain-security)
4. [Dual ESM/CJS Publishing](#4-dual-esmcjs-publishing)
5. [Pre-release & Canary Workflows](#5-pre-release--canary-workflows)
6. [Bun Migration Analysis](#6-bun-migration-analysis)
7. [Decision Framework](#7-decision-framework)

---

## 1. Release Automation Tools

### Tool Comparison Matrix

| Feature | semantic-release | release-please | Changesets |
|---------|------------------|----------------|------------|
| **Automation Level** | Fully automated | Semi-automated | Semi-automated |
| **Version Determination** | Commit messages | Commit messages | Changeset files |
| **Monorepo Support** | Via plugins (limited) | Native | Native (primary focus) |
| **Human Review** | No (automated) | Yes (PR-based) | Yes (PR-based) |
| **Flexibility** | Prescriptive | Configurable | Most granular |
| **Weekly Downloads** | ~1.9M | ~500K | ~630K |
| **Best For** | Single packages, CI/CD | Google ecosystem | Monorepos |

### semantic-release

**Pros:**
- Fully automated releases based on conventional commits
- Excellent documentation and plugin ecosystem
- Generates changelogs automatically
- Battle-tested with 23,000+ GitHub stars

**Cons:**
- No native monorepo support (requires community plugins)
- Commit message mistakes can trigger unintended releases
- Less control over release timing

**Configuration Example:**

```javascript
// .releaserc.js
module.exports = {
  branches: ['main', { name: 'beta', prerelease: true }],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    '@semantic-release/npm',
    '@semantic-release/github',
    '@semantic-release/git'
  ]
};
```

### release-please

**Pros:**
- Created and maintained by Google
- PR-based workflow allows human review before release
- Native monorepo support
- More flexible than semantic-release

**Cons:**
- Requires manual PR merge to trigger release
- Smaller community than semantic-release
- Google-centric defaults

### Changesets (Recommended for Monorepos)

**Pros:**
- Built specifically for monorepos
- Decouples versioning from commit messages
- Changes can be edited after committing
- Manages inter-package dependencies automatically
- Used by major projects (Pnpm, Turborepo, etc.)

**Cons:**
- Requires explicit changeset file creation
- More manual steps than semantic-release
- Learning curve for teams used to automatic versioning

**Setup with pnpm:**

```bash
pnpm add -D @changesets/cli @changesets/changelog-github
pnpm changeset init
```

```json
// .changeset/config.json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": ["@changesets/changelog-github", { "repo": "your-org/repo" }],
  "commit": false,
  "access": "public",
  "baseBranch": "main"
}
```

### Verdict: Choose Based on Your Needs

| Scenario | Recommendation |
|----------|----------------|
| Single package, want full automation | semantic-release |
| Monorepo with multiple packages | **Changesets** |
| Need human approval before releases | release-please or Changesets |
| Google Cloud ecosystem | release-please |

---

## 2. CI/CD Pipeline Design

### Modern GitHub Actions Architecture

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # Job 1: Lint and Type Check (fast feedback)
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v6
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  # Job 2: Test Matrix (parallel)
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22, 24]
      fail-fast: false
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test

  # Job 3: Build
  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v6
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/

  # Job 4: Publish (only on main)
  publish:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    needs: [build]
    permissions:
      contents: write
      id-token: write  # Required for OIDC
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v6
        with:
          node-version: '22'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - run: pnpm publish --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Caching Best Practices

**Option 1: Built-in setup-node caching (Recommended)**
```yaml
- uses: actions/setup-node@v6
  with:
    node-version: '22'
    cache: 'pnpm'
```

**Option 2: pnpm/action-setup with caching**
```yaml
- uses: pnpm/action-setup@v4
  with:
    version: 10
    run_install: false
- name: Get pnpm store directory
  shell: bash
  run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV
- uses: actions/cache@v4
  with:
    path: ${{ env.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: ${{ runner.os }}-pnpm-store-
```

### Matrix Strategy Optimization

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, macos-latest, windows-latest]
    node: [20, 22]
    exclude:
      # Skip Windows + Node 20 (known issues)
      - os: windows-latest
        node: 20
  max-parallel: 4  # Control concurrent jobs
  fail-fast: false  # Continue other jobs if one fails
```

### Performance Tips

1. **Run independent jobs in parallel** - lint, test, and build can often run concurrently
2. **Use `fail-fast: false`** - See all failures, not just the first
3. **Cache aggressively** - pnpm store, build artifacts, test caches
4. **Use `actions/upload-artifact`** - Pass build outputs between jobs
5. **Consider GitHub's larger runners** - For monorepos, 4-core runners can be worth it

---

## 3. NPM Provenance & Supply Chain Security

### Critical Changes in 2025-2026

**Classic Tokens Deprecated (December 9, 2025)**
- All classic npm tokens have been permanently revoked
- New granular tokens have maximum 90-day validity
- 2FA is now mandatory for local publishing

**OIDC Trusted Publishing (Generally Available July 2025)**
- No tokens to manage, rotate, or risk exposing
- Short-lived, cryptographically-signed credentials
- Automatic provenance attestations

### Setting Up Trusted Publishing

**Step 1: Configure npm Package**

1. Go to npmjs.com > Your Package > Settings > Trusted Publishers
2. Add GitHub Actions as trusted publisher:
   - Organization/User: `your-github-org`
   - Repository: `your-repo`
   - Workflow file: `release.yml` (the file that triggers publish)
   - Environment: `production` (optional, but recommended)

**Step 2: Configure GitHub Actions**

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: production  # Must match npm trusted publisher config
    permissions:
      contents: write
      id-token: write  # CRITICAL: Required for OIDC

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v6
        with:
          node-version: '22'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      # No NPM_TOKEN needed with OIDC!
      - run: npm publish --access public
```

**Important:** With trusted publishing, provenance attestations are generated automatically - no `--provenance` flag needed.

### Verifying Provenance

```bash
# Check package provenance
npm audit signatures

# View provenance details on npmjs.com
# Look for "Provenance" badge on package page
```

### Common OIDC Troubleshooting

| Issue | Solution |
|-------|----------|
| 404 on publish | Organization/repo name must match exactly (case-sensitive) |
| OIDC token rejected | Verify workflow filename matches npm config |
| Reusable workflow fails | Reference the *caller* workflow, not the reusable one |
| Provenance not appearing | Ensure `id-token: write` permission is set |

### Security Best Practices

1. **Use environments** - Create a `production` environment with required reviewers
2. **Pin action versions** - Use SHA hashes, not tags (`actions/checkout@a1b2c3d`)
3. **Minimize dependencies** - Each dependency increases attack surface
4. **Disable lifecycle scripts in CI** - `pnpm install --ignore-scripts`
5. **Use lockfiles** - Always commit `pnpm-lock.yaml`

---

## 4. Dual ESM/CJS Publishing

### Is Dual Publishing Still Necessary in 2026?

**Yes, for maximum compatibility.** While ESM adoption continues to grow, many enterprise codebases and tools still require CJS support.

### Recommended Approach: ESM-First with CJS Fallback

```json
// package.json
{
  "name": "your-package",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

### Build Tool Comparison

| Tool | Status | Engine | Best For |
|------|--------|--------|----------|
| **tsdown** | Active, recommended | Rolldown (Rust) | New projects |
| tsup | Maintenance mode | esbuild | Existing projects |
| unbuild | Active | Rollup | Nuxt ecosystem |

### tsdown Configuration (Recommended)

**Note:** tsup is no longer actively maintained and recommends tsdown as its successor.

```typescript
// tsdown.config.ts
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,  // Let consumers minify
  target: 'node18',
});
```

### Migration from tsup to tsdown

```bash
# Automatic migration
npx tsdown migrate
```

### Handling ESM/CJS Gotchas

**Problem:** `__dirname` and `__filename` don't exist in ESM

```typescript
// Solution: Use import.meta
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

**Problem:** `require` doesn't exist in ESM

```typescript
// Solution: Use createRequire
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
```

### Validation

Use [Are The Types Wrong?](https://arethetypeswrong.github.io/) to validate your package exports:

```bash
npx @arethetypeswrong/cli your-package
```

---

## 5. Pre-release & Canary Workflows

### Release Channels Overview

| Channel | Use Case | npm Tag | Version Example |
|---------|----------|---------|-----------------|
| Stable | Production | `latest` | `1.0.0` |
| Beta | Feature testing | `beta` | `1.1.0-beta.1` |
| Alpha | Early testing | `alpha` | `1.1.0-alpha.1` |
| Canary | CI builds | `canary` | `0.0.0-canary.abc123` |
| Next | Major previews | `next` | `2.0.0-next.1` |

### Changesets Pre-release Mode

```bash
# Enter pre-release mode
pnpm changeset pre enter beta

# Create changesets and version as normal
pnpm changeset
pnpm changeset version  # Creates 1.0.1-beta.0

# Exit pre-release mode
pnpm changeset pre exit
```

### semantic-release Branch Configuration

```javascript
// .releaserc.js
module.exports = {
  branches: [
    'main',
    { name: 'beta', prerelease: true },
    { name: 'alpha', prerelease: true },
    { name: 'next', prerelease: true }
  ]
};
```

### Canary Releases with GitHub Actions

```yaml
# .github/workflows/canary.yml
name: Canary Release

on:
  push:
    branches: [main]

jobs:
  canary:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v6
        with:
          node-version: '22'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      # Set canary version
      - name: Set canary version
        run: |
          SHORT_SHA=$(git rev-parse --short HEAD)
          npm version 0.0.0-canary.${SHORT_SHA} --no-git-tag-version

      - run: npm publish --tag canary --access public
```

### Installing Pre-releases

```bash
# Install specific channel
npm install your-package@beta
npm install your-package@canary
npm install your-package@next

# Check available versions
npm view your-package versions
```

---

## 6. Bun Migration Analysis

### Performance Benchmarks (2026)

| Metric | Bun | Node.js | Improvement |
|--------|-----|---------|-------------|
| HTTP Requests/sec | 52,000 | 13,000 | **4x faster** |
| Package Install | 30x faster | baseline | Significant |
| Test Suite (Jest-compat) | 20x faster | baseline | Significant |
| Memory Usage | 30-40% less | baseline | Notable |
| Cold Start | Sub-50ms | 200ms+ | **4x faster** |

### API Compatibility Status

- **Node.js API Coverage:** >95%
- **npm Package Compatibility:** ~95%
- **Native Module Support:** ~34% (major limitation)

### When Bun Makes Sense

**Ideal for Bun:**
- New TypeScript projects (native .ts execution)
- Serverless/edge deployments (fast cold starts)
- Development tooling (tests, scripts)
- High-performance APIs
- CI pipelines (30-minute builds to 5 minutes reported)

**Stick with Node.js:**
- Heavy native module dependencies (bcrypt, sharp, etc.)
- Enterprise compliance requirements
- Existing large codebases
- Windows-primary environments
- Zero-tolerance for edge-case bugs

### Hybrid Approach (Recommended)

```json
// package.json
{
  "scripts": {
    "dev": "bun run src/index.ts",
    "test": "bun test",
    "build": "bun run build.ts",
    "start": "node dist/index.js"
  }
}
```

Use Bun for:
- Development (`bun run`)
- Testing (`bun test`)
- Building (`bun build`)

Use Node.js for:
- Production runtime
- Native module compatibility
- Enterprise deployments

### CI with Bun

```yaml
# .github/workflows/ci-bun.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install
      - run: bun test
      - run: bun run build
```

### Bun Verdict

**Should You Migrate in 2026?**

| Project Type | Recommendation |
|--------------|----------------|
| New greenfield project | **Yes** - Try Bun, excellent DX |
| Existing Node.js project | **Cautious** - Hybrid approach |
| Heavy native dependencies | **No** - Stick with Node.js |
| Enterprise/compliance | **No** - Node.js remains safer |
| Performance-critical APIs | **Yes** - Bun excels here |
| Serverless/Edge | **Yes** - Fast cold starts |

**Bottom Line:** Bun is production-ready for many use cases in 2026, especially after Anthropic's acquisition brought enterprise stability. However, the 34% native dependency compatibility rate means thorough testing is essential. The hybrid approach - Bun for dev/test, Node.js for production - offers the best of both worlds.

---

## 7. Decision Framework

### Release Tool Selection

```
START
  |
  v
Is this a monorepo?
  |
  +--YES--> Use Changesets
  |
  +--NO--> Do you want fully automated releases?
             |
             +--YES--> Use semantic-release
             |
             +--NO--> Do you use Google Cloud?
                        |
                        +--YES--> Use release-please
                        |
                        +--NO--> Use Changesets or release-please
```

### CI/CD Architecture Decision

```
START
  |
  v
How many packages?
  |
  +--1 package--> Simple pipeline: lint -> test -> build -> publish
  |
  +--Monorepo--> Matrix builds + Changesets
                   |
                   v
                 Use artifact passing between jobs
                 Use dependency caching
                 Consider nx or turborepo for build orchestration
```

### ESM/CJS Decision

```
START
  |
  v
Who are your users?
  |
  +--Modern bundler users (Vite, etc.)--> ESM-only is acceptable
  |
  +--Mixed/Enterprise/Unknown--> Dual ESM+CJS with tsdown
  |
  +--Legacy CJS consumers--> CJS primary with ESM wrapper
```

### Bun Migration Decision

```
START
  |
  v
Do you have native module dependencies?
  |
  +--YES--> Do alternatives exist?
  |          |
  |          +--YES--> Consider Bun with alternatives
  |          +--NO--> Stick with Node.js
  |
  +--NO--> Is this a new project?
             |
             +--YES--> Use Bun
             |
             +--NO--> Is performance critical?
                        |
                        +--YES--> Hybrid approach (Bun dev, Node prod)
                        +--NO--> Stay with Node.js unless migration is easy
```

---

## Quick Reference: Recommended Stack 2026

| Component | Recommendation | Alternative |
|-----------|----------------|-------------|
| **Package Manager** | pnpm | Bun (for speed) |
| **Release Automation** | Changesets | semantic-release (single pkg) |
| **Build Tool** | tsdown | unbuild (Nuxt ecosystem) |
| **Publishing Auth** | OIDC Trusted Publishers | Granular tokens (90-day max) |
| **Module Format** | ESM-first + CJS fallback | ESM-only (modern consumers) |
| **Runtime (dev)** | Bun | Node.js |
| **Runtime (prod)** | Node.js | Bun (if no native deps) |
| **CI Platform** | GitHub Actions | GitLab CI (also supports OIDC) |

---

## Sources

### Release Automation
- [The Ultimate Guide to NPM Release Automation](https://oleksiipopov.com/blog/npm-release-automation/)
- [Using Changesets with pnpm](https://pnpm.io/next/using-changesets)
- [semantic-release GitHub Actions](https://semantic-release.gitbook.io/semantic-release/recipes/ci-configurations/github-actions)
- [Changesets vs Semantic Release](https://brianschiller.com/blog/2023/09/18/changesets-vs-semantic-release/)
- [Release-please vs semantic-release](https://www.hamzak.xyz/blog-posts/release-please-vs-semantic-release)

### Security & Provenance
- [npm Trusted Publishing Documentation](https://docs.npmjs.com/trusted-publishers/)
- [npm Provenance Statements](https://docs.npmjs.com/generating-provenance-statements/)
- [npm trusted publishing with OIDC GA](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/)
- [How to set up trusted publishing for npm](https://remarkablemark.org/blog/2025/12/19/npm-trusted-publishing/)
- [npm Security Best Practices](https://github.com/lirantal/npm-security-best-practices)

### CI/CD & Caching
- [GitHub Actions setup-node](https://github.com/actions/setup-node)
- [pnpm action-setup](https://github.com/pnpm/action-setup)
- [Matrix Builds with GitHub Actions](https://www.blacksmith.sh/blog/matrix-builds-with-github-actions)
- [GitHub Actions Matrix Strategy](https://codefresh.io/learn/github-actions/github-actions-matrix/)

### ESM/CJS Publishing
- [Ship ESM & CJS in one Package](https://antfu.me/posts/publish-esm-and-cjs)
- [TypeScript in 2025 with ESM and CJS](https://lirantal.com/blog/typescript-in-2025-with-esm-and-cjs-npm-publishing)
- [Dual Publishing ESM and CJS with tsup](https://johnnyreilly.com/dual-publishing-esm-cjs-modules-with-tsup-and-are-the-types-wrong)
- [tsdown - Migrate from tsup](https://tsdown.dev/guide/migrate-from-tsup)

### Bun Analysis
- [Bun vs Node.js 2025 Performance Guide](https://strapi.io/blog/bun-vs-nodejs-performance-comparison-guide)
- [Bun vs Node.js vs Deno: 2026 Runtime Comparison](https://asepalazhari.com/blog/bun-vs-nodejs-vs-deno-runtime-comparison-2026)
- [Why We Ditched Node for Bun in 2026](https://dev.to/rayenmabrouk/why-we-ditched-node-for-bun-in-2026-and-why-you-should-too-48kg)
- [Bun Package Manager Reality Check 2026](https://vocal.media/01/bun-package-manager-reality-check-2026)
- [Bun Node.js Compatibility](https://bun.com/docs/runtime/nodejs-compat)
