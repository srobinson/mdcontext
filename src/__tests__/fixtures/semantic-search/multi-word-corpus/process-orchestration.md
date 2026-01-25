# Process Orchestration

## Introduction

Process orchestration is the automated coordination of multiple tasks, services, or workflows to achieve a business goal. It differs from choreography where services coordinate themselves.

## Orchestration vs Choreography

### Orchestration (Central Control)

A central orchestrator directs the workflow:
- Single point of control
- Easy to understand flow
- Simpler error handling
- Can become bottleneck

### Choreography (Distributed)

Services react to events independently:
- No central point of failure
- More scalable
- Harder to track overall flow
- Complex error handling

## Orchestration Patterns

### Sequential Execution

Tasks run one after another:

```typescript
async function processOrder(order: Order): Promise<void> {
  await validateOrder(order);
  await reserveInventory(order.items);
  await processPayment(order.payment);
  await scheduleShipping(order);
  await notifyCustomer(order);
}
```

### Parallel Execution

Independent tasks run concurrently:

```typescript
async function enrichOrder(order: Order): Promise<EnrichedOrder> {
  const [customer, inventory, pricing] = await Promise.all([
    fetchCustomerDetails(order.customerId),
    checkInventoryLevels(order.items),
    calculatePricing(order.items),
  ]);

  return { ...order, customer, inventory, pricing };
}
```

### Saga Pattern

Long-running transactions with compensation:

```typescript
class OrderSaga {
  async execute(order: Order): Promise<void> {
    const compensations: (() => Promise<void>)[] = [];

    try {
      await this.reserveInventory(order);
      compensations.push(() => this.releaseInventory(order));

      await this.chargePayment(order);
      compensations.push(() => this.refundPayment(order));

      await this.shipOrder(order);
    } catch (error) {
      // Run compensations in reverse
      for (const compensate of compensations.reverse()) {
        await compensate();
      }
      throw error;
    }
  }
}
```

## Workflow Engines

Popular orchestration tools:
- **Temporal** - Durable execution
- **Apache Airflow** - Data pipelines
- **Kubernetes Jobs** - Container orchestration
- **Step Functions** - AWS serverless workflows

## Best Practices

1. **Idempotent operations** - Safe to retry on failure
2. **Clear compensation logic** - Know how to rollback
3. **Visibility and monitoring** - Track workflow state
4. **Timeout handling** - Don't wait forever
5. **Version workflows carefully** - Running instances need compatibility
