# Distributed Systems Architecture

## What Are Distributed Systems?

A distributed system is a collection of independent computers that appear to users as a single coherent system. These systems enable scalability, fault tolerance, and geographic distribution.

## Key Challenges

### Network Partitions

Networks can fail, causing:
- Message loss
- Message delays
- Split-brain scenarios

### Consistency vs Availability

The CAP theorem states you can only have two of:
- **Consistency** - All nodes see same data
- **Availability** - System responds to requests
- **Partition tolerance** - System works despite network issues

### Clock Synchronization

Distributed systems struggle with time:
- Physical clocks drift
- Network delays vary
- Ordering events is challenging

## Design Patterns

### Service Discovery

Services need to find each other:
- DNS-based discovery
- Service registries (Consul, etcd)
- Load balancer integration

### Circuit Breakers

Prevent cascade failures:

```typescript
class CircuitBreaker {
  private failures = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      throw new CircuitOpenError();
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

### Event Sourcing

Store state as sequence of events:
- Complete audit trail
- Temporal queries
- Easy replay and debugging

## Communication Patterns

### Synchronous (Request-Response)

- REST APIs
- gRPC
- Direct service calls

### Asynchronous (Message-Based)

- Message queues
- Event streams
- Pub/sub systems

## Best Practices

1. **Design for failure** - Assume components will fail
2. **Embrace eventual consistency** - Not everything needs strong consistency
3. **Use idempotent operations** - Safe to retry
4. **Monitor everything** - Observability is critical
5. **Test failure modes** - Chaos engineering validates resilience
