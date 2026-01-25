# Configuration Management

## Overview

Configuration management is the practice of handling system configuration in a systematic, versioned, and automated way. It ensures consistency across environments and enables reproducible deployments.

## Core Principles

### Infrastructure as Code

Configuration should be:
- Version controlled in Git
- Reviewed through pull requests
- Tested before deployment
- Reproducible across environments

### Separation of Concerns

Keep configuration separate from code:
- Environment-specific values in config files
- Secrets in secure vaults
- Feature flags in dedicated systems

## Configuration Sources

### Hierarchy of Configuration

Configuration typically follows precedence:
1. Command-line arguments (highest)
2. Environment variables
3. Configuration files
4. Default values (lowest)

### Configuration File Formats

Common formats include:
- **YAML** - Human readable, supports comments
- **JSON** - Machine readable, widely supported
- **TOML** - Simple, explicit typing
- **INI** - Simple key-value pairs

## Implementation

```typescript
interface ConfigService {
  get<T>(key: string): T;
  getOrDefault<T>(key: string, defaultValue: T): T;
  has(key: string): boolean;
  reload(): Promise<void>;
}

class ConfigManager implements ConfigService {
  private config: Map<string, unknown>;

  constructor(sources: ConfigSource[]) {
    // Load and merge from all sources
    // Respect precedence rules
  }

  get<T>(key: string): T {
    // Return typed configuration value
    // Throw if missing
  }
}
```

## Best Practices

1. **Validate early** - Check configuration at startup
2. **Document everything** - Keep config schema documented
3. **Use sensible defaults** - Most users shouldn't need to configure
4. **Support hot reload** - Allow config changes without restart
5. **Audit changes** - Track who changed what and when

## Common Patterns

### Feature Flags

```typescript
if (config.get('features.newDashboard')) {
  renderNewDashboard();
} else {
  renderLegacyDashboard();
}
```

### Environment-Specific Configuration

```yaml
# config.production.yaml
database:
  host: prod-db.example.com
  poolSize: 100

# config.development.yaml
database:
  host: localhost
  poolSize: 5
```
