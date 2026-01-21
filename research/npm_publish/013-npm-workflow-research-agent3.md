# Modern npm Publishing Workflows: 2026 Best Practices

A comprehensive research document covering developer experience, automated changelogs, testing strategies, quality gates, and the Bun migration question for CLI tools.

---

## Table of Contents

1. [Developer Experience (DX) Best Practices](#1-developer-experience-dx-best-practices)
2. [Changelog Generation and Versioning](#2-changelog-generation-and-versioning)
3. [Testing Before Publish](#3-testing-before-publish)
4. [Package Quality Checks](#4-package-quality-checks)
5. [Error Handling and Rollback](#5-error-handling-and-rollback)
6. [Bun Migration Analysis](#6-bun-migration-analysis)
7. [Recommendations for md-tldr](#7-recommendations-for-md-tldr)

---

## 1. Developer Experience (DX) Best Practices

### Trusted Publishing with OIDC (Most Important 2025-2026 Feature)

As of July 2025, [npm trusted publishing with OIDC](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/) is generally available. This is a game-changer for security and developer experience:

**Key Benefits:**

- **No more token management**: Eliminates storing, rotating, or accidentally exposing npm tokens
- **Short-lived credentials**: Each publish uses workflow-specific credentials that cannot be exfiltrated
- **Automatic provenance**: Provenance attestations are published by default (no `--provenance` flag needed)
- **Industry standard**: Implements OpenSSF trusted publishers specification (joining PyPI, RubyGems)

**Requirements:**

- npm CLI version 11.5.1 or later
- GitHub Actions with `id-token: write` permission

### Example Workflow with pnpm and OIDC

```yaml
name: Publish Package

on:
  release:
    types: [created]

permissions:
  contents: read
  id-token: write # Required for OIDC trusted publishing

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # IMPORTANT: pnpm setup MUST precede Node.js setup for caching
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
      - run: pnpm test

      # Trusted publishing - no NPM_TOKEN needed!
      - run: pnpm publish --no-git-checks
```

**Critical Notes:**

- The `--no-git-checks` flag bypasses pnpm's detached HEAD check in GitHub Actions
- pnpm setup must come BEFORE setup-node to enable `cache: 'pnpm'`
- Use `NODE_AUTH_TOKEN` (not `NPM_TOKEN`) if still using token-based auth

### Security Best Practices

Based on [Zach Leatherman's security recommendations](https://www.zachleat.com/web/npm-security):

1. **Two-Factor Authentication everywhere** - Both GitHub AND npm, for all maintainers
2. **Immutable Releases** - Enable at organization level on GitHub
3. **Reduce dependencies** - Every dependency inherits security risk
4. **pnpm 10.16+ delayed updates** - New setting for safer dependency updates

---

## 2. Changelog Generation and Versioning

### Tool Comparison

| Tool                                                                            | Philosophy             | Best For                         | Weekly Downloads |
| ------------------------------------------------------------------------------- | ---------------------- | -------------------------------- | ---------------- |
| [semantic-release](https://github.com/semantic-release/release-notes-generator) | Fully automated        | Single packages, full automation | ~2M              |
| [Changesets](https://github.com/changesets/changesets)                          | Human control          | Monorepos, collaborative teams   | ~800K            |
| [release-it](https://github.com/release-it/release-it)                          | Flexible middle-ground | Customizable workflows           | ~670K            |
| [np](https://github.com/sindresorhus/np)                                        | Interactive local      | Single packages, manual control  | ~400K            |

### Semantic-Release

**Pros:**

- Zero human intervention once configured
- Strong Conventional Commits integration
- Extensive plugin ecosystem

**Cons:**

- Not built for monorepos (community plugins are outdated)
- Version coupling with deploys causes cleanup issues on failure
- Package.json version stays at `0.0.0` until build

### Changesets (Recommended for Most Projects)

**Workflow:**

```bash
# Developer creates changeset describing their change
pnpm changeset

# CI detects changesets and opens version PR
# After PR merge, packages are published
pnpm changeset version
pnpm changeset publish
```

**Pros:**

- Built for monorepos first
- Human-reviewable changelog entries
- Decouples versioning from deployment
- [pnpm integration](https://pnpm.io/next/using-changesets) is excellent

**Cons:**

- Requires package.json for version tracking (odd for non-JS packages)
- More manual than semantic-release

### GitHub Actions with Changesets

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
          node-version: "22"
          cache: "pnpm"
          registry-url: "https://registry.npmjs.org"

      - run: pnpm install --frozen-lockfile

      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### np (Interactive Local Publishing)

Best for maintainers who prefer local control:

```bash
# Interactive UI for version selection and publishing
npx np

# Skip tests (use with caution)
npx np --yolo

# Preview without executing
npx np --preview
```

**Safety checks np performs:**

- Publishing from correct branch
- Clean working directory
- No unpulled remote changes
- Pre-release version warnings

---

## 3. Testing Before Publish

### Matrix Testing Strategy

Based on [GitHub Actions matrix best practices](https://codefresh.io/learn/github-actions/github-actions-matrix/):

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    strategy:
      fail-fast: false # Continue other tests if one fails
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [18, 20, 22]
        exclude:
          # Skip problematic combinations
          - os: windows-latest
            node: 18

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
      - name: Test CLI
        run: |
          node dist/cli/main.js --version
          node dist/cli/main.js --help
```

### Best Practices for Matrix Testing

1. **Use `npm ci` / `pnpm install --frozen-lockfile`** for deterministic installs
2. **Environment-specific caching** based on OS + lockfile hash
3. **`fail-fast: false`** to see all failures, not just the first
4. **Test actual binary execution**, not just unit tests
5. **Skip irrelevant combinations** with `exclude`

### Integration Test Recommendations

```yaml
# Separate integration job that runs after unit tests pass
integration:
  needs: [test]
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    # ... setup steps ...

    - name: Pack and test installation
      run: |
        pnpm pack
        npm install -g ./md-tldr-*.tgz
        mdtldr --help
        mdtldr analyze ./README.md
```

---

## 4. Package Quality Checks

### Essential Quality Tools

#### 1. publint - Package Publishing Lint

[publint](https://publint.dev/) catches packaging errors before users do:

```bash
# Run locally
npx publint

# Or check online at publint.dev
```

**What it checks:**

- `main`, `module`, `exports` field correctness
- ESM/CJS interpretation issues
- Missing entrypoints
- `default` condition ordering
- `__esModule` marker issues

#### 2. Are The Types Wrong (attw)

[@arethetypeswrong/cli](https://github.com/arethetypeswrong/arethetypeswrong.github.io) validates TypeScript types:

```bash
# Check packed tarball
npm pack
npx attw ./package-1.0.0.tgz

# Or pack and check in one step
npx attw --pack .
```

**Issues detected:**

- Resolution failures
- Missing types
- CJS/ESM masquerading
- Incorrect default exports
- Module syntax mismatches

#### 3. Bundlephobia / Package Size Checks

[Bundlephobia](https://bundlephobia.com/) shows package impact:

```bash
# CLI version
npx bundle-phobia-cli package-name

# Or use bundlewatch for CI
npm install -D bundlewatch
```

### Integrated Quality Gate Workflow

```yaml
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
    - name: Validate package
      run: npx publint

    # TypeScript types validation
    - name: Check types
      run: npx attw --pack .

    # Size check (optional, for libraries)
    - name: Check bundle size
      run: |
        npx bundlewatch --config bundlewatch.config.js
```

### bundlewatch Configuration

```javascript
// bundlewatch.config.js
module.exports = {
  files: [
    {
      path: "./dist/*.js",
      maxSize: "50kb",
    },
  ],
  ci: {
    trackBranches: ["main"],
  },
};
```

---

## 5. Error Handling and Rollback

### Common Failure Scenarios

1. **Partial publish in monorepos** - Some packages published, others failed
2. **Git tags pushed but publish failed** - Inconsistent state
3. **npm registry errors** - Timeouts, rate limits
4. **2FA failures** - Token/OIDC issues

### Recovery Strategies

#### For Lerna/Changesets Monorepos

```bash
# After failed publish with tags already pushed
npx lerna publish from-package --yes

# Or with changesets
pnpm changeset publish
```

#### Manual Recovery Steps

1. **Check what was published**: `npm view package-name versions`
2. **If nothing published**: Fix issue, retry publish
3. **If partially published**: Use `from-package` to publish remaining
4. **If wrong version published**:
   - Within 72 hours: `npm unpublish package@version`
   - After 72 hours: Publish new patch version with fix

### Automated Rollback Considerations

```yaml
publish:
  runs-on: ubuntu-latest
  steps:
    - name: Publish
      id: publish
      run: pnpm publish --no-git-checks
      continue-on-error: true

    - name: Handle failure
      if: steps.publish.outcome == 'failure'
      run: |
        echo "Publish failed!"
        # Log the issue, don't auto-rollback git
        # Manual intervention is safer
```

**Key insight**: npm publishes are generally **not** safely auto-reversible. Instead:

- Use `--dry-run` first
- Keep pre-publish checks comprehensive
- Document manual recovery steps
- Consider `npm publish --access public --dry-run` in CI before actual publish

---

## 6. Bun Migration Analysis

### Current State (2026)

Based on extensive research from multiple sources:

**Adoption:**

- 7+ million monthly downloads
- Used by Midjourney, Anthropic (for Claude Code CLI)
- [Anthropic acquired Bun in November 2025](https://dev.to/rayenmabrouk/why-we-ditched-node-for-bun-in-2026-and-why-you-should-too-48kg)

**Compatibility:**

- 95%+ Node.js API compatibility
- Native TypeScript execution (no transpilation step)
- [Full workspace support](https://bun.com/docs/pm/workspaces) with glob patterns

**Performance:**

- 3-4x faster execution than Node.js in many scenarios
- HTTP: ~52,000 req/s vs Node's ~13,000 req/s
- 30-50% infrastructure cost reductions reported

### Real-World Migration Experiences

#### Successes

- **Serverless functions**: 35% execution time reduction, lower AWS costs
- **CLI tools**: Fast startup times ideal for command-line use
- **Development servers**: Instant hot reload

#### Challenges

According to [2026 production assessments](https://dev.to/last9/is-bun-production-ready-in-2026-a-practical-assessment-181h):

- **34% of projects** experienced compatibility challenges
- **19% of monorepo migrations** had import resolution failures
- **28% struggled with Docker** initially
- Native module edge cases still exist

### Bun vs Node.js for CLI Tools

| Aspect                  | Bun                         | Node.js                |
| ----------------------- | --------------------------- | ---------------------- |
| Startup time            | ~25ms                       | ~100-150ms             |
| TypeScript execution    | Native                      | Requires transpilation |
| Single-file executables | Yes (`bun build --compile`) | Needs pkg/nexe         |
| npm compatibility       | 95%+                        | 100%                   |
| Native addons           | Some issues                 | Full support           |
| Ecosystem maturity      | Growing                     | Mature                 |

### md-tldr Specific Analysis

Looking at the md-tldr `package.json`:

**Dependencies that may have Bun issues:**

- `hnswlib-node` - Native addon, potential compatibility issues
- `tiktoken` - Native addon for tokenization
- `@effect/*` - Modern ESM, should work fine

**Low-risk dependencies:**

- `openai`, `remark-*`, `unified` - Pure JS, should work
- `gray-matter`, `chokidar` - Widely used, likely compatible

### Migration Path if Desired

```bash
# Step 1: Test package manager only
bun install  # Creates bun.lockb

# Step 2: Run tests
bun test  # Uses Bun's built-in test runner

# Step 3: Run CLI
bun run src/cli/main.ts  # Direct TS execution

# Step 4: Build (still use tsup for npm compatibility)
bun run build
```

---

## 7. Recommendations for md-tldr

### Publishing Workflow Recommendation

**Recommended approach: Changesets + OIDC Trusted Publishing**

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write
  id-token: write

jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [18, 20, 22]
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
      - run: npx publint
      - run: npx attw --pack .

  release:
    needs: [test, quality]
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
          registry-url: "https://registry.npmjs.org"
      - run: pnpm install --frozen-lockfile
      - name: Create Release PR or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Quality Gate Checklist

Add to `package.json`:

```json
{
  "scripts": {
    "prepublishOnly": "pnpm build && pnpm test && pnpm typecheck",
    "quality": "npx publint && npx attw --pack ."
  }
}
```

### Bun Migration Verdict

**Recommendation: Wait, but prepare**

**Reasons to wait:**

1. `hnswlib-node` and `tiktoken` are native addons - potential compatibility issues
2. md-tldr is a CLI tool users install globally - Node.js compatibility is safer
3. pnpm + tsup workflow is working well
4. 34% compatibility challenge rate is still significant

**Reasons to consider later:**

1. CLI tools benefit most from Bun's fast startup
2. Anthropic backing means long-term support
3. Direct TypeScript execution simplifies development
4. Could offer Bun-compiled binary as alternative distribution

**Recommended approach:**

1. Keep Node.js as primary target for npm package
2. Test with Bun locally for development speed
3. Consider offering a Bun-compiled binary in the future
4. Re-evaluate in 6-12 months as ecosystem matures

### Common Pitfalls to Avoid

1. **Not testing actual CLI binary** - Always run `node dist/cli/main.js --help` in CI
2. **Missing `--no-git-checks`** - Required for pnpm in GitHub Actions
3. **Wrong permission for OIDC** - Need `id-token: write`
4. **pnpm after setup-node** - Must be before for caching
5. **Not checking types with attw** - TypeScript issues are common
6. **Skipping cross-platform tests** - Windows path handling differs
7. **Auto-rollback on failure** - Manual intervention is usually safer

---

## Sources

### npm Publishing and OIDC

- [npm Trusted Publishing with OIDC (GitHub Blog)](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/)
- [npm Trusted Publishers Documentation](https://docs.npmjs.com/trusted-publishers/)
- [Zach Leatherman: npm Security Best Practices](https://www.zachleat.com/web/npm-security)
- [Auto publish with pnpm and GitHub Actions (DEV.to)](https://dev.to/receter/automatically-publish-your-node-package-to-npm-with-pnpm-and-github-actions-22eg)

### Changelog and Versioning

- [Using Changesets with pnpm](https://pnpm.io/next/using-changesets)
- [conventional-changelog (GitHub)](https://github.com/conventional-changelog/conventional-changelog)
- [git-cliff](https://git-cliff.org/)
- [Changesets vs Semantic Release Comparison](https://brianschiller.com/blog/2023/09/18/changesets-vs-semantic-release)
- [np - A Better npm publish](https://github.com/sindresorhus/np)

### Quality Tools

- [publint](https://publint.dev/)
- [Are The Types Wrong?](https://arethetypeswrong.github.io/)
- [Bundlephobia](https://bundlephobia.com/)
- [@arethetypeswrong/cli (npm)](https://www.npmjs.com/package/@arethetypeswrong/cli)

### Testing

- [GitHub Actions Matrix Strategy Guide](https://codefresh.io/learn/github-actions/github-actions-matrix/)
- [TypeScript Test Matrix (TypeScript.tv)](https://typescript.tv/best-practices/create-a-typescript-test-matrix-using-github-actions/)

### Bun

- [Bun Official Site](https://bun.com)
- [Bun Workspaces Documentation](https://bun.com/docs/pm/workspaces)
- [Bun vs Node.js 2025 (Strapi)](https://strapi.io/blog/bun-vs-nodejs-performance-comparison-guide)
- [Is Bun Production-Ready in 2026? (DEV.to)](https://dev.to/last9/is-bun-production-ready-in-2026-a-practical-assessment-181h)
- [Why We Ditched Node for Bun in 2026 (DEV.to)](https://dev.to/rayenmabrouk/why-we-ditched-node-for-bun-in-2026-and-why-you-should-too-48kg)
- [Bun Package Manager Reality Check 2026](https://vocal.media/01/bun-package-manager-reality-check-2026)

### Error Handling

- [Emergency Rollback Workflows (Latenode Community)](https://community.latenode.com/t/emergency-rollback-workflows-after-failed-npm-updates/40265)
- [semantic-release npm publish recovery](https://github.com/semantic-release/npm/issues/54)

---

_Last updated: January 2026_
_Research conducted for md-tldr CLI tool publishing workflow optimization_
