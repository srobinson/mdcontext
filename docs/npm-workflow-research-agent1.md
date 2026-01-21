# npm Publishing Workflow Research: 2026 Best Practices

> Research conducted January 2026 | pnpm + GitHub Actions focus

## Table of Contents

1. [GitHub Actions Workflow Patterns](#1-github-actions-workflow-patterns)
2. [pnpm-Specific Considerations](#2-pnpm-specific-considerations)
3. [Versioning Strategies](#3-versioning-strategies)
4. [Security: Provenance, SLSA, and 2FA](#4-security-provenance-slsa-and-2fa)
5. [Monorepo vs Single Package](#5-monorepo-vs-single-package)
6. [Should You Migrate to Bun in 2026?](#6-should-you-migrate-to-bun-in-2026)
7. [Recommendations](#7-recommendations)

---

## 1. GitHub Actions Workflow Patterns

### Current Best Practice: OIDC Trusted Publishing

As of **July 31, 2025**, npm trusted publishing with OIDC is generally available. This is now the recommended approach over token-based authentication.

**Key Benefits:**
- No token management required
- Short-lived, cryptographically signed credentials
- Automatic provenance attestation
- Cannot be exfiltrated or reused

### Basic pnpm Publish Workflow (Single Package)

```yaml
name: Publish to npm

on:
  release:
    types: [published]

permissions:
  contents: read
  id-token: write  # Required for OIDC trusted publishing

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Publish
        run: pnpm publish --access public --no-git-checks
        # No NODE_AUTH_TOKEN needed with OIDC trusted publishing!
```

### Alternative: Token-Based Publishing (Granular Tokens)

If OIDC isn't configured, use granular access tokens:

```yaml
      - name: Publish
        run: pnpm publish --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Important Notes:**
- Use `NODE_AUTH_TOKEN`, not `NPM_TOKEN` (the action requires this specific name)
- The `--no-git-checks` flag bypasses pnpm's detached HEAD check in GitHub Actions
- Granular tokens now have a **maximum 90-day expiration** (as of October 2025)

---

## 2. pnpm-Specific Considerations

### Lockfile Handling

```yaml
# Always use frozen-lockfile in CI
- run: pnpm install --frozen-lockfile
```

**Rules:**
- Always commit `pnpm-lock.yaml`
- pnpm automatically adds `--frozen-lockfile` in CI (since v6.10)
- Never use `--no-frozen-lockfile` in production CI

### Caching Strategy

**Option A: Built-in pnpm Caching (Recommended)**

```yaml
- uses: pnpm/action-setup@v4
  with:
    version: 10

- uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'pnpm'  # Automatic caching based on lockfile hash
```

**Option B: Manual Store Caching (More Control)**

```yaml
- name: Get pnpm store directory
  shell: bash
  run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

- name: Setup pnpm cache
  uses: actions/cache@v4
  with:
    path: ${{ env.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-store-
```

### Workspace Support

For monorepos with workspaces:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'pnpm'
    cache-dependency-path: '**/pnpm-lock.yaml'  # Handles monorepo structure
```

---

## 3. Versioning Strategies

### Comparison Matrix

| Aspect | Changesets | semantic-release | Manual |
|--------|------------|------------------|--------|
| **Automation** | Semi-automatic | Fully automatic | None |
| **Monorepo** | First-class | Via plugin (outdated) | Manual |
| **Control** | High (PR review) | Low (commit-driven) | Total |
| **Learning Curve** | Medium | Low | None |
| **Changelog** | Collaborative | Auto-generated | Manual |

### Recommendation: Changesets for Most Projects

**Why Changesets wins in 2026:**

1. **Monorepo-first design** - Manages inter-package dependencies automatically
2. **PR-based workflow** - Review changelogs before release
3. **Batch releases** - Group changes into meaningful releases
4. **pnpm integration** - Official documentation and support

### Changesets Workflow Example

```yaml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write
  id-token: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - run: pnpm install --frozen-lockfile

      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          commit: "chore: release packages"
          title: "chore: release packages"
          publish: pnpm -r publish --access public --no-git-checks
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # Omit NPM_TOKEN if using OIDC trusted publishing
```

### When to Use semantic-release

- Single-package repos with disciplined conventional commits
- Teams wanting zero manual intervention
- Projects where every merge should potentially release

---

## 4. Security: Provenance, SLSA, and 2FA

### npm Security Landscape (December 2025)

**Critical Changes:**
- **Classic tokens permanently revoked** (December 9, 2025)
- **Granular tokens**: 90-day max expiration, 7-day default for write-enabled
- **TOTP 2FA being phased out** - Use WebAuthn/passkeys instead
- **OIDC trusted publishing** is the recommended path forward

### npm Provenance (SLSA Build Level 2)

Provenance creates a verifiable link between your published package and its source code.

**With OIDC Trusted Publishing (Automatic):**
```yaml
permissions:
  id-token: write  # This enables automatic provenance
```

**With Token-Based Publishing:**
```yaml
- run: pnpm publish --provenance --access public --no-git-checks
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Setting Up Trusted Publishing

1. Go to npmjs.com > Package Settings > Trusted Publishing
2. Configure your GitHub repository, workflow file, and environment
3. Ensure your workflow has `id-token: write` permission
4. Remove any `NODE_AUTH_TOKEN` from your workflow (OIDC only works without tokens)

### 2FA Requirements

All packages now require either:
- Two-factor authentication (2FA), OR
- Granular access token with "Bypass 2FA" enabled

For CI/CD, use granular tokens with:
- "Bypass 2FA" enabled
- Scoped to specific packages
- Rotation schedule (max 90 days)

---

## 5. Monorepo vs Single Package

### Single Package Pattern

```yaml
# Simple, direct workflow
name: Publish

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm publish --access public --no-git-checks
```

### Monorepo Pattern (with Changesets)

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for changesets

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - run: pnpm install --frozen-lockfile

      - name: Build all packages
        run: pnpm -r build

      - uses: changesets/action@v1
        with:
          publish: pnpm -r publish --access public --no-git-checks
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Key Differences

| Aspect | Single Package | Monorepo |
|--------|---------------|----------|
| **Versioning** | Direct release tags | Changesets PR workflow |
| **Build** | `pnpm build` | `pnpm -r build` (recursive) |
| **Publish** | `pnpm publish` | `pnpm -r publish` |
| **Complexity** | Low | Medium-High |
| **Changelog** | Manual or automated | Changesets-managed |

---

## 6. Should You Migrate to Bun in 2026?

### Current State of Bun (January 2026)

**The good:**
- **4-7x faster** than pnpm for package installs (real-world, not marketing claims)
- **Anthropic acquisition** (December 2025) ensures long-term viability
- **All-in-one toolchain**: runtime, bundler, test runner, package manager
- Production-grade stability for most use cases

**The concerning:**
- **No `--provenance` flag** - Cannot generate SLSA attestations natively
- **34% compatibility issues** with native dependencies
- **Workspace publishing bugs** - References may not resolve correctly
- **Less CI/CD ecosystem support** than pnpm

### Bun npm Publishing: Current Limitations

| Feature | npm/pnpm | Bun |
|---------|----------|-----|
| OIDC Trusted Publishing | Yes | Partial (via `bunx npm`) |
| `--provenance` flag | Yes | No (open issue #15601) |
| Workspace publishing | Mature | Buggy |
| CI/CD templates | Abundant | Limited |
| Deprecated package handling | Correct | Buggy |

### Performance Comparison (CI/CD)

| Metric | pnpm | Bun |
|--------|------|-----|
| Clean install | 14s | 3s |
| Cached install | 3s | 1s |
| Total job time | 2m 08s | 1m 52s |

*Note: Build time dominates, making install speed less impactful overall*

### Workaround for Bun Publishing

If you want Bun's speed but need provenance:

```yaml
- name: Install with Bun
  run: bun install

- name: Build with Bun
  run: bun run build

- name: Publish with npm (for provenance)
  run: bunx npm publish --provenance --access public
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Verdict: Should You Migrate?

| Project Type | Recommendation |
|--------------|----------------|
| **New greenfield project** | Consider Bun, but use `bunx npm publish` for provenance |
| **Existing pnpm project** | Stay with pnpm - migration effort not justified |
| **Enterprise monorepo** | Stay with pnpm - stability and features matter more |
| **Security-critical package** | Stay with pnpm/npm - provenance is non-negotiable |
| **Internal tools/prototypes** | Bun is a good fit |

**TL;DR:** Bun is production-viable in 2026 but **not yet ready to replace pnpm for npm publishing workflows** due to missing provenance support and workspace publishing issues.

---

## 7. Recommendations

### For New Single-Package Projects

1. **Use pnpm** for package management
2. **Use OIDC trusted publishing** (no tokens)
3. **Enable provenance** automatically via `id-token: write`
4. **Trigger on releases** for controlled publishing

```yaml
name: Publish

on:
  release:
    types: [published]

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm publish --access public --no-git-checks
```

### For Monorepos

1. **Use pnpm workspaces** with `workspace:*` protocol
2. **Use Changesets** for versioning and changelog
3. **Configure OIDC** for all publishable packages
4. **Set up the Changesets GitHub Action**

### Security Checklist

- [ ] Configure OIDC trusted publishing for each package
- [ ] Remove all classic tokens (they're revoked anyway)
- [ ] Set up WebAuthn/passkey 2FA (not TOTP)
- [ ] Verify provenance appears on npmjs.com after publishing
- [ ] Run `npm audit signatures` to verify attestations

### When to Consider Bun

- Local development speed is a priority
- You don't need SLSA provenance attestations
- You're building internal tools or prototypes
- You're starting a greenfield project and can accept some risk

---

## Sources

### GitHub Actions & npm Publishing
- [Automatically publish your Node package to NPM (with PNPM and GitHub actions)](https://dev.to/receter/automatically-publish-your-node-package-to-npm-with-pnpm-and-github-actions-22eg)
- [pnpm Continuous Integration Guide](https://pnpm.io/continuous-integration)
- [Using Changesets with pnpm](https://pnpm.io/next/using-changesets)
- [GitHub Actions Setup Node Documentation](https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md)

### npm Security & Trusted Publishing
- [npm Trusted Publishing with OIDC GA Announcement](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/)
- [npm Classic Tokens Revoked](https://github.blog/changelog/2025-12-09-npm-classic-tokens-revoked-session-based-auth-and-cli-token-management-now-available/)
- [npm Trusted Publishing Documentation](https://docs.npmjs.com/trusted-publishers/)
- [Generating Provenance Statements](https://docs.npmjs.com/generating-provenance-statements/)
- [Introducing npm Package Provenance](https://github.blog/security/supply-chain-security/introducing-npm-package-provenance/)

### Versioning Strategies
- [Changesets vs Semantic Release](https://brianschiller.com/blog/2023/09/18/changesets-vs-semantic-release/)
- [The Ultimate Guide to NPM Release Automation](https://oleksiipopov.com/blog/npm-release-automation/)
- [Complete Monorepo Guide: pnpm + Workspace + Changesets (2025)](https://jsdev.space/complete-monorepo-guide/)

### Bun Assessment
- [Is Bun Production-Ready in 2026?](https://dev.to/last9/is-bun-production-ready-in-2026-a-practical-assessment-181h)
- [pnpm vs npm vs yarn vs Bun: The 2026 Package Manager Showdown](https://dev.to/pockit_tools/pnpm-vs-npm-vs-yarn-vs-bun-the-2026-package-manager-showdown-51dc)
- [bun publish Documentation](https://bun.com/docs/pm/cli/publish)
- [Bun --provenance Feature Request (Issue #15601)](https://github.com/oven-sh/bun/issues/15601)
- [Bun Workspace Publishing Issues (Issue #15246)](https://github.com/oven-sh/bun/issues/15246)

### Package Manager Comparisons
- [PNPM vs. Bun Install vs. Yarn Berry](https://betterstack.com/community/guides/scaling-nodejs/pnpm-vs-bun-install-vs-yarn/)
- [Choosing the Right JavaScript Package Manager in 2025](https://dev.to/kirteshbansal/choosing-the-right-javascript-package-manager-in-2025-npm-vs-yarn-vs-pnpm-vs-bun-2jie)
- [npm vs pnpm vs Yarn vs Bun Comparison](https://vibepanda.io/resources/guide/javascript-package-managers)
