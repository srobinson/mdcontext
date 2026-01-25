# Job Context

## What is Job Context?

Job context refers to the environment, state, and metadata associated with a running job or task. Understanding job context is crucial for debugging, monitoring, and managing batch processing systems.

## Components of Job Context

### Runtime Environment

The job context includes:
- Working directory and file paths
- Environment variables
- Process information (PID, memory, CPU)
- User and permission context

### Execution Metadata

Each job carries metadata about its execution:
- Job ID and name
- Start time and duration
- Parent job or workflow reference
- Retry count and history

### State Information

Job context tracks current state:
- Input parameters received
- Progress percentage
- Intermediate results
- Checkpoints for recovery

## Passing Context Between Jobs

In workflow systems, context flows between jobs:

```typescript
interface JobContext {
  jobId: string;
  workflowId: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  metadata: {
    startedAt: Date;
    parent?: string;
    retryCount: number;
  };
}

function executeJob(context: JobContext): Promise<JobContext> {
  // Access context for execution
  // Update outputs and state
  // Return enriched context
}
```

## Best Practices

1. **Keep context immutable** - Create new context objects rather than mutating
2. **Serialize context carefully** - Ensure all context can be persisted
3. **Scope context appropriately** - Don't pass more than needed
4. **Log context changes** - Track how context evolves

## Use Cases

- Debugging failed jobs by examining their context
- Replaying jobs with captured context
- Monitoring job progress through context updates
- Implementing job dependencies based on context
