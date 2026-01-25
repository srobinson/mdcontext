# Error Handling Patterns

## Introduction to Error Handling

Error handling is the process of responding to and recovering from error conditions in software. Good error handling improves reliability and user experience.

## Error Types

### Operational Errors

Errors that can occur during normal operation:
- Network timeouts
- File not found
- Invalid user input
- Database connection failures

### Programming Errors

Bugs in the code:
- Null pointer exceptions
- Type errors
- Logic errors
- Array bounds violations

## Handling Strategies

### Try-Catch Blocks

```typescript
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof NetworkError) {
    // Retry logic
  } else if (error instanceof ValidationError) {
    // Return user-friendly message
  } else {
    // Log and re-throw unknown errors
    throw error;
  }
}
```

### Result Types

Instead of throwing, return success/failure:

```typescript
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function parseConfig(path: string): Result<Config, ConfigError> {
  // Return structured result instead of throwing
}
```

### Error Boundaries

In UI applications, error boundaries prevent entire app crashes:
- Catch errors in component trees
- Display fallback UI
- Log errors for debugging

## Best Practices

1. **Be specific** - Catch specific error types, not generic Exception
2. **Fail fast** - Detect errors early before causing more damage
3. **Provide context** - Error messages should explain what and why
4. **Log appropriately** - Stack traces for debugging, summaries for users
5. **Clean up resources** - Use finally blocks or try-with-resources

## Error Handling Anti-Patterns

- Swallowing errors silently
- Catching too broadly
- Exposing internal details to users
- Not cleaning up on errors
