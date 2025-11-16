# WebSocket + Redis Optimization Implementation Plan

**Based on**: FASTRTC-EVALUATION.md recommendation
**Status**: Approved for implementation
**Timeline**: 1.5-2 weeks
**Owner**: Ada Backend Team

---

## Executive Summary

Following the FastRTC evaluation, we're **optimizing the current WebSocket + Redis architecture** instead of migrating to FastRTC. This delivers **80% of theoretical FastRTC benefits at 25% of the effort** with significantly lower risk.

**Expected improvements**:
- ✅ 99.9% uptime (High Availability via Redis Cluster)
- ✅ 30-40% bandwidth reduction (message compression)
- ✅ 2-3× connection efficiency (connection pooling)
- ✅ Production-grade observability (Prometheus + Grafana)

---

## 1. Optimization Goals

### 1.1 Performance Targets

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| **Message Latency (p95)** | ~200ms | <150ms | 25% faster |
| **Message Latency (p99)** | ~400ms | <250ms | 37.5% faster |
| **Throughput** | ~10 msg/sec | 100+ msg/sec | 10× capacity |
| **Uptime** | 99.5% (estimated) | 99.9% | HA enabled |
| **Bandwidth** | Baseline | -30-40% | Compression |
| **Connection reuse** | Low | High | Pooling |

### 1.2 Cost Targets

| Component | Current (estimated) | Optimized | Savings |
|-----------|-------------------|-----------|---------|
| Redis (single instance) | $50/month | $75/month (cluster) | -$25 |
| Bandwidth (uncompressed) | $150/month | $100/month | +$50 |
| **Net** | **$200/month** | **$175/month** | **+$25/month** |

Plus: Improved reliability (99.9% uptime) and 10× capacity headroom.

---

## 2. Implementation Phases

### Phase 1: Redis Cluster Mode (High Availability) ✅

**Effort**: 2-3 days
**Risk**: Low
**Priority**: High (enables 99.9% uptime)

#### 2.1 Current State
```typescript
// Single Redis instance
const redis = new Redis({
  host: 'localhost',
  port: 6379
});
```

**Limitations**:
- Single point of failure
- No automatic failover
- Limited to single-instance throughput

#### 2.2 Target State
```typescript
// Redis Cluster with 3 master + 3 replica nodes
const redis = new Redis.Cluster([
  { host: 'redis-node-1.ada.azure.com', port: 6379 },
  { host: 'redis-node-2.ada.azure.com', port: 6379 },
  { host: 'redis-node-3.ada.azure.com', port: 6379 },
], {
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
    tls: {
      servername: 'redis.ada.azure.com'
    }
  },
  clusterRetryStrategy: (times) => {
    return Math.min(100 * times, 2000);
  }
});
```

#### 2.3 Azure Deployment

**Option A: Azure Cache for Redis (Premium Tier)**
- Config: P1 (6 GB, 3 master + 3 replica)
- Cost: ~$75/month
- Uptime SLA: 99.9%
- Auto-failover: Yes
- Backup: Daily snapshots

**Option B: Self-Managed on AKS**
- Config: 6 pods (3 master + 3 replica)
- Cost: ~$60/month (compute only)
- Uptime SLA: Depends on AKS (99.9% with zone redundancy)
- Maintenance: Higher operational overhead

**Recommendation**: Azure Cache for Redis Premium (managed service, lower ops overhead)

#### 2.4 Migration Steps

1. **Provision Redis Cluster**:
   ```bash
   az redis create \
     --name ada-redis-cluster \
     --resource-group ada-production \
     --location westeurope \
     --sku Premium \
     --vm-size P1 \
     --replicas-per-master 1 \
     --zones 1 2 3
   ```

2. **Test cluster connectivity**:
   ```typescript
   // Test script
   import Redis from 'ioredis';

   const cluster = new Redis.Cluster([...]);

   await cluster.set('test-key', 'test-value');
   const value = await cluster.get('test-key');
   console.log('Cluster working:', value === 'test-value');
   ```

3. **Update RedisTransport**:
   ```typescript
   // core/transport/RedisTransport.ts

   export class RedisTransport extends NetworkTransport {
     private redisClient: Redis.Cluster;

     constructor(config: RedisTransportConfig) {
       super(config);

       // Support both single instance and cluster
       if (config.options.clusterNodes) {
         this.redisClient = new Redis.Cluster(
           config.options.clusterNodes,
           config.options.clusterOptions
         );
       } else {
         this.redisClient = new Redis(config.options);
       }
     }
   }
   ```

4. **Gradual rollout**:
   - Week 1: Deploy cluster in staging
   - Week 2: Test all services against cluster
   - Week 3: Production cutover (blue-green deployment)

#### 2.5 Testing Checklist

- [ ] Pub/Sub works across cluster nodes
- [ ] Automatic failover tested (kill master node)
- [ ] Message delivery guaranteed during failover
- [ ] Latency acceptable (< 150ms p95)
- [ ] All services reconnect automatically

---

### Phase 2: Message Compression ✅

**Effort**: 1-2 days
**Risk**: Low
**Priority**: Medium (bandwidth savings)

#### 2.1 Current State
```typescript
// Uncompressed JSON
const message = {
  id: '123',
  from: 'ada.marina.wim',
  to: 'ada.finance.wim',
  payload: { /* large invoice object */ }
};

await redis.publish('ada:node:ada.finance.wim', JSON.stringify(message));
```

**Issue**: Large payloads (invoices, customer data) waste bandwidth

#### 2.2 Target State
```typescript
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// Compress before send
const messageJson = JSON.stringify(message);
const compressed = await gzipAsync(Buffer.from(messageJson));
const base64 = compressed.toString('base64');

await redis.publish('ada:node:ada.finance.wim', JSON.stringify({
  compressed: true,
  data: base64
}));

// Decompress on receive
redis.on('message', async (channel, messageStr) => {
  const envelope = JSON.parse(messageStr);

  if (envelope.compressed) {
    const buffer = Buffer.from(envelope.data, 'base64');
    const decompressed = await gunzipAsync(buffer);
    const message = JSON.parse(decompressed.toString());
    // Process message...
  } else {
    const message = JSON.parse(messageStr);
    // Process uncompressed (backward compat)
  }
});
```

#### 2.3 Compression Strategy

**Threshold-based compression**:
```typescript
const COMPRESSION_THRESHOLD = 1024; // 1 KB

async function publishMessage(channel: string, message: NodeMessage) {
  const messageJson = JSON.stringify(message);

  // Only compress if > 1 KB
  if (messageJson.length > COMPRESSION_THRESHOLD) {
    const compressed = await gzipAsync(Buffer.from(messageJson));

    // Only use compression if actually smaller
    if (compressed.length < messageJson.length * 0.8) {
      await redis.publish(channel, JSON.stringify({
        compressed: true,
        data: compressed.toString('base64')
      }));
      return;
    }
  }

  // Send uncompressed
  await redis.publish(channel, messageJson);
}
```

#### 2.4 Expected Savings

| Message Type | Avg Size | Compressed | Savings |
|--------------|----------|------------|---------|
| Berth update | 500 bytes | 400 bytes | 20% |
| Invoice | 10 KB | 3 KB | 70% |
| Customer profile | 5 KB | 2 KB | 60% |
| **Weighted avg** | **2 KB** | **1.2 KB** | **40%** |

**Bandwidth savings**: 40% × $150/month = **$60/month**

#### 2.5 Testing Checklist

- [ ] Compression/decompression works correctly
- [ ] Backward compatibility (old nodes receive uncompressed)
- [ ] Forward compatibility (new nodes receive compressed)
- [ ] Latency impact acceptable (< 10ms overhead)
- [ ] Memory usage acceptable

---

### Phase 3: Connection Pooling ✅

**Effort**: 2-3 days
**Risk**: Low
**Priority**: Medium (scalability)

#### 2.1 Current State
```typescript
// New connection per message (inefficient)
export class WebSocketTransport extends NetworkTransport {
  private connections: Map<string, WebSocket> = new Map();

  async sendToNode(nodeId: string, message: NodeMessage) {
    let ws = this.connections.get(nodeId);

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      // Create new connection every time
      ws = new WebSocket(`ws://node-${nodeId}.ada.internal`);
      await this.waitForConnection(ws);
      this.connections.set(nodeId, ws);
    }

    ws.send(JSON.stringify(message));
  }
}
```

**Issues**:
- Connection overhead (TCP handshake + WebSocket handshake)
- No connection reuse optimization
- No max connections limit (memory leak risk)

#### 2.2 Target State
```typescript
import { EventEmitter } from 'events';

interface ConnectionPoolConfig {
  maxConnections: number;      // Max connections per target
  idleTimeout: number;          // Close idle connections after N ms
  retryAttempts: number;        // Retry failed connections
  healthCheckInterval: number;  // Ping interval
}

export class WebSocketConnectionPool extends EventEmitter {
  private pools: Map<string, WebSocket[]> = new Map();
  private activeConnections: Map<string, number> = new Map();
  private config: ConnectionPoolConfig;

  constructor(config: ConnectionPoolConfig) {
    super();
    this.config = config;
    this.startHealthChecks();
  }

  /**
   * Acquire connection from pool (reuse or create new)
   */
  async acquire(endpoint: string): Promise<WebSocket> {
    const pool = this.pools.get(endpoint) || [];

    // Try to reuse idle connection
    const idleWs = pool.find(ws => ws.readyState === WebSocket.OPEN);
    if (idleWs) {
      return idleWs;
    }

    // Check if we can create new connection
    const active = this.activeConnections.get(endpoint) || 0;
    if (active >= this.config.maxConnections) {
      // Wait for available connection
      return this.waitForAvailableConnection(endpoint);
    }

    // Create new connection
    const ws = await this.createConnection(endpoint);
    pool.push(ws);
    this.pools.set(endpoint, pool);
    this.activeConnections.set(endpoint, active + 1);

    return ws;
  }

  /**
   * Release connection back to pool
   */
  release(endpoint: string, ws: WebSocket) {
    // Mark as idle, keep connection open for reuse
    ws.removeAllListeners('message'); // Cleanup handlers
  }

  /**
   * Health check: ping connections, close dead ones
   */
  private startHealthChecks() {
    setInterval(() => {
      for (const [endpoint, pool] of this.pools.entries()) {
        for (let i = pool.length - 1; i >= 0; i--) {
          const ws = pool[i];

          if (ws.readyState === WebSocket.CLOSED) {
            pool.splice(i, 1); // Remove dead connection
            this.activeConnections.set(
              endpoint,
              (this.activeConnections.get(endpoint) || 1) - 1
            );
          } else if (ws.readyState === WebSocket.OPEN) {
            ws.ping(); // Keep-alive
          }
        }
      }
    }, this.config.healthCheckInterval);
  }
}
```

#### 2.3 Integration with WebSocketTransport
```typescript
export class WebSocketTransport extends NetworkTransport {
  private pool: WebSocketConnectionPool;

  constructor(config: WebSocketTransportConfig) {
    super(config);

    this.pool = new WebSocketConnectionPool({
      maxConnections: 10,        // Max 10 connections per target
      idleTimeout: 60000,        // Close idle after 60s
      retryAttempts: 3,
      healthCheckInterval: 30000 // Ping every 30s
    });
  }

  async sendToNode(nodeId: string, message: NodeMessage) {
    const endpoint = this.getEndpoint(nodeId);
    const ws = await this.pool.acquire(endpoint);

    try {
      ws.send(JSON.stringify(message));
    } finally {
      this.pool.release(endpoint, ws);
    }
  }
}
```

#### 2.4 Expected Benefits

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Connection setup latency | ~100ms | ~0ms (reuse) | 100× faster |
| Concurrent connections | Unlimited (leak risk) | Max 10/target | Memory safe |
| Keep-alive overhead | None (new conn each time) | Ping every 30s | Reliable |

#### 2.5 Testing Checklist

- [ ] Connection reuse works correctly
- [ ] Max connections limit enforced
- [ ] Idle connections closed after timeout
- [ ] Health checks ping connections
- [ ] Dead connections removed from pool
- [ ] No connection leaks (memory test)

---

### Phase 4: Monitoring & Observability ✅

**Effort**: 3-4 days
**Risk**: Low
**Priority**: High (production readiness)

#### 4.1 Prometheus Metrics

**File**: `core/metrics/NodeCommunicationMetrics.ts`

```typescript
import { Counter, Histogram, Gauge, register } from 'prom-client';

export class NodeCommunicationMetrics {
  // Message counters
  private messagesSent = new Counter({
    name: 'ada_messages_sent_total',
    help: 'Total messages sent',
    labelNames: ['from_node', 'to_node', 'subject']
  });

  private messagesReceived = new Counter({
    name: 'ada_messages_received_total',
    help: 'Total messages received',
    labelNames: ['from_node', 'to_node', 'subject']
  });

  private messagesFailed = new Counter({
    name: 'ada_messages_failed_total',
    help: 'Total failed messages',
    labelNames: ['from_node', 'to_node', 'error']
  });

  // Latency histogram
  private messageLatency = new Histogram({
    name: 'ada_message_latency_seconds',
    help: 'Message round-trip latency',
    labelNames: ['from_node', 'to_node', 'subject'],
    buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5] // 10ms to 5s
  });

  // Connection pool metrics
  private poolConnections = new Gauge({
    name: 'ada_pool_connections',
    help: 'Active connections in pool',
    labelNames: ['endpoint', 'state']
  });

  // Redis cluster metrics
  private redisClusterNodes = new Gauge({
    name: 'ada_redis_cluster_nodes',
    help: 'Number of Redis cluster nodes',
    labelNames: ['state'] // 'master', 'replica', 'fail'
  });

  /**
   * Record message sent
   */
  recordMessageSent(from: string, to: string, subject: string) {
    this.messagesSent.inc({ from_node: from, to_node: to, subject });
  }

  /**
   * Record message latency
   */
  recordMessageLatency(from: string, to: string, subject: string, durationSec: number) {
    this.messageLatency.observe({ from_node: from, to_node: to, subject }, durationSec);
  }

  /**
   * Export metrics for Prometheus scraping
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }
}
```

#### 4.2 Grafana Dashboard

**File**: `monitoring/grafana/ada-communication-dashboard.json`

**Panels**:

1. **Message Rate (last 5 minutes)**
   - Query: `rate(ada_messages_sent_total[5m])`
   - Type: Graph
   - Y-axis: Messages/second

2. **Latency Percentiles**
   - Query:
     - p50: `histogram_quantile(0.50, ada_message_latency_seconds)`
     - p95: `histogram_quantile(0.95, ada_message_latency_seconds)`
     - p99: `histogram_quantile(0.99, ada_message_latency_seconds)`
   - Type: Graph
   - Y-axis: Seconds

3. **Error Rate**
   - Query: `rate(ada_messages_failed_total[5m])`
   - Type: Graph
   - Alert: if > 0.1 msg/sec

4. **Connection Pool Health**
   - Query: `ada_pool_connections{state="open"}`
   - Type: Gauge
   - Alert: if > 80% of max

5. **Redis Cluster Status**
   - Query: `ada_redis_cluster_nodes{state="master"}`
   - Type: Stat
   - Alert: if < 3 (cluster unhealthy)

#### 4.3 Prometheus Endpoint

**File**: `ada/main.py` (Python backend)

```python
from fastapi import FastAPI
from prometheus_client import make_asgi_app

app = FastAPI()

# Mount Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)
```

**File**: `core/server.ts` (TypeScript nodes)

```typescript
import express from 'express';
import { metrics } from './metrics/NodeCommunicationMetrics.js';

const app = express();

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(await metrics.getMetrics());
});

app.listen(9090, () => {
  console.log('Metrics server listening on :9090/metrics');
});
```

#### 4.4 Alerting Rules

**File**: `monitoring/prometheus/alerts.yml`

```yaml
groups:
  - name: ada_communication
    interval: 30s
    rules:
      # High error rate alert
      - alert: HighMessageErrorRate
        expr: rate(ada_messages_failed_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High message error rate detected"
          description: "Error rate is {{ $value }} msg/sec"

      # High latency alert
      - alert: HighMessageLatency
        expr: histogram_quantile(0.95, ada_message_latency_seconds) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "p95 message latency > 500ms"
          description: "Current p95: {{ $value }}s"

      # Redis cluster unhealthy
      - alert: RedisClusterUnhealthy
        expr: ada_redis_cluster_nodes{state="master"} < 3
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis cluster has less than 3 master nodes"
          description: "Only {{ $value }} master nodes available"
```

#### 4.5 Testing Checklist

- [ ] Prometheus scrapes `/metrics` endpoint
- [ ] Grafana dashboard displays real-time data
- [ ] Alerts fire correctly (test by simulating failure)
- [ ] Message rate accurately tracked
- [ ] Latency percentiles calculated correctly

---

## 3. Deployment Timeline

### Week 1: Infrastructure & Redis Cluster

| Day | Tasks | Owner |
|-----|-------|-------|
| Mon | Provision Azure Cache for Redis (Premium) | Ops |
| Tue | Configure cluster (3 master + 3 replica) | Ops |
| Wed | Test cluster connectivity, pub/sub | Backend |
| Thu | Update RedisTransport to support cluster | Backend |
| Fri | Deploy to staging, smoke tests | QA |

### Week 2: Compression & Pooling

| Day | Tasks | Owner |
|-----|-------|-------|
| Mon | Implement message compression (gzip) | Backend |
| Tue | Test compression (unit + integration) | Backend/QA |
| Wed | Implement connection pooling | Backend |
| Thu | Test pooling (connection reuse, limits) | Backend/QA |
| Fri | Deploy to staging, integration tests | QA |

### Week 3: Monitoring & Production Rollout

| Day | Tasks | Owner |
|-----|-------|-------|
| Mon | Add Prometheus metrics | Backend |
| Tue | Create Grafana dashboard | Ops |
| Wed | Configure alerting rules | Ops |
| Thu | Final staging validation | QA |
| Fri | **Production deployment** (blue-green) | Ops |

---

## 4. Success Metrics

### 4.1 Quantitative

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Uptime | 99.5% | 99.9% | Prometheus `up` metric |
| p95 latency | 200ms | <150ms | `ada_message_latency_seconds{quantile="0.95"}` |
| p99 latency | 400ms | <250ms | `ada_message_latency_seconds{quantile="0.99"}` |
| Throughput capacity | 10 msg/sec | 100 msg/sec | Load test |
| Bandwidth | Baseline | -30% | Azure bandwidth monitoring |

### 4.2 Qualitative

- [ ] **Zero incidents** during production rollout
- [ ] **Team confidence** in monitoring & alerting
- [ ] **Documentation** complete (runbooks, architecture diagrams)
- [ ] **Knowledge transfer** to operations team

---

## 5. Rollback Plan

If production deployment encounters issues:

### 5.1 Rollback Triggers

- [ ] Error rate > 1% of messages
- [ ] p95 latency > 500ms (worse than baseline)
- [ ] Redis cluster unavailable > 5 minutes
- [ ] Any critical service down > 2 minutes

### 5.2 Rollback Procedure

1. **Switch traffic back to old Redis instance**:
   ```bash
   az redis update --name ada-redis-old --resource-group ada-production
   # Update DNS to point to old instance
   ```

2. **Revert code deployment**:
   ```bash
   kubectl rollout undo deployment/ada-backend
   kubectl rollout undo deployment/ada-nodes
   ```

3. **Verify rollback**:
   - Check error rate returns to normal
   - Verify latency back to baseline
   - Confirm all services healthy

4. **Post-mortem**:
   - Document what went wrong
   - Fix issues in staging
   - Re-test before next deployment attempt

---

## 6. Documentation Updates

### 6.1 Files to Update

- [ ] `docs/DISTRIBUTED-COMMUNICATION.md` - Add Redis Cluster section
- [ ] `docs/ARCHITECTURE.md` - Update architecture diagrams
- [ ] `docs/MONITORING.md` (new) - Prometheus/Grafana setup
- [ ] `docs/RUNBOOKS.md` (new) - Operational procedures

### 6.2 Runbook: Redis Cluster Failover

**File**: `docs/runbooks/redis-cluster-failover.md`

```markdown
# Redis Cluster Failover Runbook

## Symptoms
- Alert: "Redis master node down"
- Metrics: `ada_redis_cluster_nodes{state="master"} < 3`

## Investigation
1. Check cluster status:
   ```bash
   redis-cli -c -h redis.ada.azure.com cluster nodes
   ```
2. Identify failed master node
3. Check Azure Cache for Redis metrics

## Resolution
- **Automatic**: Redis Cluster auto-promotes replica to master
- **Manual** (if auto-failover fails):
  ```bash
  redis-cli -c -h redis.ada.azure.com cluster failover
  ```

## Verification
- Verify 3 master nodes:
  ```bash
  redis-cli -c -h redis.ada.azure.com cluster info
  ```
- Check message delivery working:
  ```bash
  curl http://ada-backend/health
  ```
```

---

## 7. Cost-Benefit Analysis

### 7.1 Investment

| Item | Cost |
|------|------|
| Redis Cluster (Premium P1) | +$25/month |
| Engineering time (2 weeks) | ~$8,000 (4 engineers × 2 weeks) |
| **Total** | **~$8,300 (one-time + $25/month)** |

### 7.2 Benefits

| Benefit | Annual Value |
|---------|--------------|
| Bandwidth savings (30%) | +$600/year |
| Prevented downtime (99.5% → 99.9%) | ~$5,000/year (estimated) |
| Capacity headroom (10× throughput) | Priceless (enables growth) |
| Improved monitoring | ~$2,000/year (reduced troubleshooting time) |
| **Total** | **~$7,600/year** |

**ROI**: Payback in **13 months** ($8,300 / $600/month)

---

## 8. Next Steps

### Immediate (This Week)

1. ✅ **Approve this plan** (Architecture team review)
2. ✅ **Provision Azure Redis Cluster** (Ops team)
3. ✅ **Create implementation tickets** (Backend team)

### Week 1

1. ⏳ Deploy Redis Cluster in staging
2. ⏳ Update RedisTransport code
3. ⏳ Test pub/sub across cluster

### Week 2

1. ⏳ Implement compression + pooling
2. ⏳ Add Prometheus metrics
3. ⏳ Staging validation

### Week 3

1. ⏳ Production deployment (blue-green)
2. ⏳ Monitor for 48 hours
3. ⏳ Post-deployment review

---

## 9. References

- **FastRTC Evaluation**: docs/FASTRTC-EVALUATION.md
- **Current Architecture**: docs/DISTRIBUTED-COMMUNICATION.md
- **Redis Cluster**: https://redis.io/docs/management/scaling/
- **Prometheus**: https://prometheus.io/docs/
- **Grafana**: https://grafana.com/docs/

---

**Document Version**: 1.0
**Owner**: Ada Backend Team
**Approved by**: Ada Architecture Team
**Implementation Start**: 2025-11-18

---

**Karar**: Optimize WebSocket + Redis now. Re-evaluate FastRTC in 6-12 months when scale increases or VHF audio streaming becomes production-critical.
