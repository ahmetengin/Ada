# Future FastRTC Migration Path (Hybrid Architecture)

**Status**: Planning Document (Not for immediate implementation)
**Review Date**: 2026-05-16 (6 months from evaluation)
**Prerequisites**: FASTRTC-EVALUATION.md, WEBSOCKET-OPTIMIZATION-PLAN.md

---

## Executive Summary

This document outlines the **future migration path** to a **hybrid WebSocket + FastRTC architecture** if Ada's scale or real-time requirements justify the added complexity.

**Key principle**: **Do not migrate until metrics prove WebSocket is a bottleneck.**

---

## 1. Migration Triggers

### 1.1 Quantitative Triggers

Migrate to hybrid architecture when **any** of the following occur:

| Trigger | Threshold | Measurement |
|---------|-----------|-------------|
| **Sustained message rate** | > 50 msg/sec | Prometheus `rate(ada_messages_sent_total[1h])` |
| **Peak message rate** | > 200 msg/sec | Prometheus `rate(ada_messages_sent_total[1m])` |
| **Intra-location latency** | p95 > 200ms | `ada_message_latency_seconds{location="same"}` |
| **Bandwidth costs** | > $500/month | Azure Cost Management |
| **Real-time audio streaming** | Production-critical | VHF audio to fleet feature |

### 1.2 Qualitative Triggers

- [ ] **Customer complaints** about latency (marina operators report slow responses)
- [ ] **VHF audio streaming** becomes core feature (real-time audio to 100+ vessels)
- [ ] **Multi-marina rollout** with strict latency SLAs (< 50ms)
- [ ] **Team expertise** in WebRTC (hire or training completed)

---

## 2. Hybrid Architecture Design

### 2.1 Control Plane (WebSocket) + Data Plane (FastRTC)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Ada Hybrid Communication                     │
└─────────────────────────────────────────────────────────────────┘

Control Plane (WebSocket + Redis):
├── Service discovery (NodeRegistry)
├── Authentication & authorization
├── Tenant isolation & routing
├── Cross-tenant messages (with audit)
├── Broadcast messages (weather updates)
└── Audit logging (KVKK compliance)

Data Plane (FastRTC Mesh):
├── Intra-location high-frequency messages
│   └── Example: ada.marina.wim ↔ ada.finance.wim
├── Real-time audio/video streams
│   └── Example: VHF Channel 72 to all vessels
└── P2P when available, fallback to WebSocket

Routing Decision:
┌─────────────────────────────────────────────────┐
│ Message arrives → Check:                        │
│ 1. Same tenant? (security)                      │
│ 2. Same location? (intra-location)              │
│ 3. High frequency? (> 10 msg/sec)               │
│ 4. FastRTC peer available? (connectivity)       │
│                                                  │
│ IF all YES → Use FastRTC P2P                   │
│ ELSE → Use WebSocket (control plane)           │
└─────────────────────────────────────────────────┘
```

### 2.2 Message Routing Logic

```typescript
// core/HybridNodeCommunication.ts

export class HybridNodeCommunication extends DistributedNodeCommunication {
  private fastRTCMesh?: FastRTCMesh;
  private websocketTransport: WebSocketTransport;

  async send(to: string, type: string, subject: string, payload: any): Promise<string> {
    const message = this.createMessage(to, type, subject, payload);

    // Routing decision
    if (await this.shouldUseFastRTC(to, subject)) {
      try {
        return await this.fastRTCMesh.send(to, message);
      } catch (error) {
        console.warn('FastRTC failed, falling back to WebSocket:', error);
        return await this.websocketTransport.send(to, message);
      }
    } else {
      return await this.websocketTransport.send(to, message);
    }
  }

  /**
   * Decide whether to use FastRTC P2P for this message
   */
  private async shouldUseFastRTC(to: string, subject: string): Promise<boolean> {
    // 1. Security: Same tenant only
    if (!this.isSameTenant(to)) {
      return false;
    }

    // 2. Locality: Same location preferred
    if (!this.isSameLocation(to)) {
      return false;
    }

    // 3. Frequency: High-frequency subjects (e.g., berth updates)
    const highFrequencySubjects = ['berth_update', 'invoice_request', 'vhf_audio'];
    if (!highFrequencySubjects.includes(subject)) {
      return false;
    }

    // 4. Peer availability: FastRTC peer must be connected
    if (!this.fastRTCMesh?.hasPeer(to)) {
      return false;
    }

    return true;
  }
}
```

---

## 3. Implementation Phases

### Phase 1: FastRTC Infrastructure Setup (2-3 weeks)

#### 3.1 STUN/TURN Servers (Azure Deployment)

**Option A: Managed Service (coturn on Azure VM)**

```bash
# Provision VM
az vm create \
  --name ada-turn-server \
  --resource-group ada-production \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys

# Install coturn
sudo apt update
sudo apt install coturn

# Configure /etc/turnserver.conf
cat <<EOF > /etc/turnserver.conf
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
relay-ip=<VM_PUBLIC_IP>
external-ip=<VM_PUBLIC_IP>

# Authentication
realm=ada.azure.com
user=ada:ADA_TURN_PASSWORD_HERE

# Security
lt-cred-mech
no-multicast-peers
no-loopback-peers

# Performance
max-bps=1000000  # 1 Mbps per user
total-quota=100  # Max 100 users

# Logging
log-file=/var/log/turnserver.log
verbose
EOF

# Start coturn
sudo systemctl enable coturn
sudo systemctl start coturn
```

**Option B: Cloudflare TURN (Managed)**

- Use Cloudflare Calls (TURN as a service)
- Cost: $0.05/GB (cheaper than self-hosted for low volume)
- Zero operational overhead

**Cost Comparison**:

| Option | Setup | Monthly Cost | Ops Overhead |
|--------|-------|--------------|--------------|
| Self-hosted (Azure VM) | 1-2 days | ~$50 (VM) + $20 (bandwidth) | Medium |
| Cloudflare TURN | 1 hour | ~$50 (usage-based) | Low |

**Recommendation**: Start with Cloudflare TURN (low ops overhead), migrate to self-hosted if usage exceeds $100/month.

#### 3.2 FastRTC Mesh Library Integration

**Python Backend**: Use `fastrtc` (Gradio library)

```python
# ada/communication/fastrtc_mesh.py

from fastrtc import FastRTC
import asyncio

class AdaFastRTCMesh:
    def __init__(self, tenant_id: str, location: str):
        self.tenant_id = tenant_id
        self.location = location
        self.rtc = FastRTC(
            stun_servers=["stun:stun.ada.azure.com:3478"],
            turn_servers=[{
                "urls": "turn:turn.ada.azure.com:3478",
                "username": "ada",
                "credential": os.getenv("TURN_PASSWORD")
            }]
        )

    async def connect_peer(self, peer_id: str, peer_location: str):
        """Establish P2P connection with another Ada service"""
        if peer_location != self.location:
            raise ValueError("Cross-location P2P not supported (use WebSocket)")

        await self.rtc.connect(peer_id)

    async def send(self, peer_id: str, message: dict):
        """Send message via P2P data channel"""
        await self.rtc.send(peer_id, json.dumps(message))
```

**TypeScript Nodes**: Use `fast-rtc-swarm` (mesh library)

```typescript
// core/transport/FastRTCMeshTransport.ts

import Swarm from 'fast-rtc-swarm';
import { NetworkTransport, RemoteNodeInfo } from './NetworkTransport.js';

export class FastRTCMeshTransport extends NetworkTransport {
  private swarm: Swarm;
  private peers: Map<string, RemoteNodeInfo> = new Map();

  constructor(config: {
    nodeId: string;
    tenantId: string;
    location: string;
    signalingServer: string;  // WebSocket signaling server
    stunServers: string[];
    turnServers: Array<{ urls: string; username: string; credential: string }>;
  }) {
    super(config);

    this.swarm = new Swarm({
      signaling: config.signalingServer,
      iceServers: [
        ...config.stunServers.map(url => ({ urls: url })),
        ...config.turnServers
      ]
    });

    this.setupSwarmHandlers();
  }

  async start(): Promise<void> {
    await this.swarm.connect();
    this.emit('started');
  }

  async sendToNode(nodeId: string, message: any): Promise<void> {
    const peer = this.peers.get(nodeId);
    if (!peer) {
      throw new Error(`No P2P connection to ${nodeId}`);
    }

    this.swarm.send(nodeId, JSON.stringify(message));
  }

  private setupSwarmHandlers() {
    this.swarm.on('peer', (peerId: string) => {
      console.log('FastRTC peer connected:', peerId);
      this.peers.set(peerId, { id: peerId, type: 'fastrtc' });
      this.emit('peerConnected', peerId);
    });

    this.swarm.on('data', (peerId: string, data: Buffer) => {
      const message = JSON.parse(data.toString());
      this.emit('message', message);
    });

    this.swarm.on('disconnected', (peerId: string) => {
      console.warn('FastRTC peer disconnected:', peerId);
      this.peers.delete(peerId);
      this.emit('peerDisconnected', peerId);
    });
  }

  hasPeer(nodeId: string): boolean {
    return this.peers.has(nodeId);
  }
}
```

---

### Phase 2: Pilot Deployment (West Istanbul Marina) (3-4 weeks)

#### 2.1 Pilot Scope

**Target**: Single location (WIM - West Istanbul Marina)

**Services**:
- ada.marina.wim
- ada.finance.wim
- ada.sea.wim (Phisedelia yacht)

**Communication pattern**:
```
ada.marina.wim → ada.finance.wim
└── Berth reservation → Invoice request (high frequency)

Current (WebSocket):
├── Latency: ~150ms
├── Route: marina → central hub → finance
└── Bandwidth: 2× (in + out)

After FastRTC P2P:
├── Latency: ~20ms (same LAN)
├── Route: marina → finance (direct)
└── Bandwidth: 1× (P2P)
```

#### 2.2 Pilot Metrics

**Success criteria**:

| Metric | WebSocket Baseline | FastRTC Target | Actual |
|--------|-------------------|----------------|--------|
| p95 latency (intra-location) | 150ms | <50ms | TBD |
| p99 latency (intra-location) | 250ms | <100ms | TBD |
| P2P connection success rate | N/A | >95% | TBD |
| Fallback to WebSocket rate | N/A | <5% | TBD |
| Zero incidents | ✅ | ✅ | TBD |

#### 2.3 Pilot Rollout Plan

**Week 1**: Infrastructure
- Deploy STUN server (Cloudflare or Azure)
- Deploy TURN server (for fallback)
- Test STUN/TURN connectivity

**Week 2**: Integration
- Integrate `fastrtc` (Python) and `fast-rtc-swarm` (TypeScript)
- Implement `HybridNodeCommunication`
- Unit tests + integration tests

**Week 3**: Staging Deployment
- Deploy to WIM staging environment
- Test P2P connection establishment
- Test fallback to WebSocket (simulate P2P failure)

**Week 4**: Production Pilot
- Enable FastRTC for `ada.marina.wim ↔ ada.finance.wim` only
- Monitor metrics for 1 week
- Collect team feedback

**Week 5**: Evaluation
- Analyze pilot metrics
- Decision: Expand to other locations or rollback

---

### Phase 3: Multi-Location Rollout (if pilot succeeds) (8-12 weeks)

#### 3.1 Rollout Strategy

**Incremental rollout**:

1. **Single location**: WIM (completed in Phase 2)
2. **Second location**: Alaçatı Marina
3. **Third location**: Bodrum Marina
4. **All locations**: After 3 successful deployments

**Rollout criteria** (must pass before expanding):
- [ ] Pilot metrics met (latency, success rate)
- [ ] Zero production incidents in pilot
- [ ] Team comfortable with FastRTC operations
- [ ] Monitoring & alerting working

#### 3.2 Cross-Location Decision

**Important**: FastRTC P2P only for **intra-location** (same LAN/datacenter).

**Cross-location** (e.g., WIM ↔ Alaçatı):
- ❌ **Do NOT use FastRTC** (TURN relay negates P2P benefit)
- ✅ **Use WebSocket** (optimized with compression, pooling)

```typescript
// Routing logic enforces locality
private async shouldUseFastRTC(to: string, subject: string): Promise<boolean> {
  // ...
  if (!this.isSameLocation(to)) {
    return false;  // Always use WebSocket for cross-location
  }
  // ...
}
```

---

## 4. Monitoring & Observability

### 4.1 New Metrics (in addition to WebSocket metrics)

```typescript
// core/metrics/FastRTCMetrics.ts

export class FastRTCMetrics {
  // P2P connection metrics
  private p2pConnections = new Gauge({
    name: 'ada_fastrtc_p2p_connections',
    help: 'Active P2P connections',
    labelNames: ['location', 'state']  // 'connected', 'connecting', 'failed'
  });

  private p2pConnectionAttempts = new Counter({
    name: 'ada_fastrtc_connection_attempts_total',
    help: 'P2P connection attempts',
    labelNames: ['location', 'result']  // 'success', 'failure'
  });

  // Fallback metrics
  private fallbackToWebSocket = new Counter({
    name: 'ada_fastrtc_fallback_total',
    help: 'Times FastRTC fell back to WebSocket',
    labelNames: ['reason']  // 'peer_unavailable', 'connection_failed', 'timeout'
  });

  // STUN/TURN usage
  private stunRequests = new Counter({
    name: 'ada_fastrtc_stun_requests_total',
    help: 'STUN server requests for NAT traversal'
  });

  private turnRelayUsage = new Counter({
    name: 'ada_fastrtc_turn_relay_bytes',
    help: 'Bytes relayed through TURN server (fallback)'
  });

  // Latency comparison
  private fastRTCLatency = new Histogram({
    name: 'ada_fastrtc_message_latency_seconds',
    help: 'Message latency via FastRTC P2P',
    labelNames: ['from_node', 'to_node'],
    buckets: [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5]  // 5ms to 500ms
  });
}
```

### 4.2 Grafana Dashboard Updates

**New panels**:

1. **P2P vs WebSocket Traffic Split**
   - Query:
     - P2P: `rate(ada_fastrtc_messages_sent_total[5m])`
     - WebSocket: `rate(ada_messages_sent_total[5m])`
   - Type: Stacked graph
   - Goal: P2P should be ~40% (intra-location traffic)

2. **FastRTC Latency vs WebSocket Latency**
   - Query:
     - FastRTC p95: `histogram_quantile(0.95, ada_fastrtc_message_latency_seconds)`
     - WebSocket p95: `histogram_quantile(0.95, ada_message_latency_seconds{location="same"})`
   - Type: Comparison graph
   - Goal: FastRTC latency < 50ms, WebSocket < 150ms

3. **Fallback Rate**
   - Query: `rate(ada_fastrtc_fallback_total[5m])`
   - Type: Graph
   - Alert: if > 5% (too many fallbacks = P2P unstable)

4. **TURN Relay Usage (Cost Alert)**
   - Query: `rate(ada_fastrtc_turn_relay_bytes[1h])`
   - Type: Graph
   - Alert: if > 100 MB/hour (expensive TURN usage)

---

## 5. Cost Projection

### 5.1 Hybrid Architecture Costs (5-year scale: 10 msg/sec)

| Component | Monthly Cost |
|-----------|-------------|
| **WebSocket Control Plane** | |
| Redis Cluster (Premium P1) | $75 |
| Application Gateway | $150 |
| Bandwidth (cross-location + fallback) | $50 (reduced from $100) |
| **Subtotal** | **$275** |
| **FastRTC Data Plane** | |
| STUN server (Cloudflare) | $20 |
| TURN server (10% fallback) | $50 |
| Signaling server (WebSocket) | $25 |
| **Subtotal** | **$95** |
| **Total Hybrid** | **$370/month** |

**Comparison**:

| Architecture | Monthly Cost | Notes |
|--------------|-------------|-------|
| WebSocket only (current) | $325 | After optimization |
| **Hybrid (WebSocket + FastRTC)** | **$370** | **+$45/month** |

**Cost increase**: +14% ($45/month)

**ROI**: Only justifiable if:
- Latency improvement drives customer satisfaction (hard to quantify)
- VHF audio streaming becomes revenue-generating feature
- Reduced bandwidth enables 10× scale without cost increase

---

## 6. Risk Mitigation

### 6.1 Top Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **P2P connection failures** | Medium | High | Automatic fallback to WebSocket |
| **TURN relay costs spike** | Medium | Medium | Alert if TURN usage > 10%, optimize P2P |
| **Tenant isolation breach** | Low | Critical | Strict same-tenant routing enforcement |
| **Operational complexity** | High | Medium | Comprehensive monitoring + runbooks |
| **Team expertise gap** | Medium | Medium | WebRTC training before deployment |

### 6.2 Mitigation Strategies

**1. P2P Connection Failures**:
```typescript
// Automatic fallback with retry
async send(to: string, message: any): Promise<void> {
  try {
    await this.fastRTCMesh.send(to, message);
  } catch (error) {
    console.warn('FastRTC send failed, fallback to WebSocket:', error);
    await this.websocketTransport.send(to, message);

    // Metric: Track fallback
    metrics.fallbackToWebSocket.inc({ reason: 'send_failed' });
  }
}
```

**2. TURN Relay Cost Control**:
```typescript
// Alert if TURN usage exceeds threshold
if (metrics.turnRelayUsage.get() > TURN_THRESHOLD) {
  alertOps('TURN relay usage high - check P2P connectivity');
}
```

**3. Tenant Isolation**:
```typescript
// Enforce same-tenant routing
private async shouldUseFastRTC(to: string): Promise<boolean> {
  if (!this.isSameTenant(to)) {
    return false;  // NEVER allow cross-tenant P2P
  }
  // ...
}
```

---

## 7. Decision Checklist

### 7.1 Before Starting Migration

- [ ] **Metrics prove bottleneck**: Message rate > 50 msg/sec OR latency > 200ms
- [ ] **VHF streaming is production-critical**: Real-time audio to 100+ vessels
- [ ] **Team has WebRTC expertise**: Training completed or expert hired
- [ ] **Budget approved**: +$45/month + engineering time (~$15,000)
- [ ] **Stakeholder buy-in**: Architecture team + operations team aligned

### 7.2 Before Pilot Deployment

- [ ] **STUN/TURN servers tested**: Connectivity verified from all locations
- [ ] **Hybrid code completed**: Unit tests + integration tests pass
- [ ] **Monitoring ready**: Grafana dashboard + alerts configured
- [ ] **Rollback plan tested**: Can revert to WebSocket-only in < 5 minutes
- [ ] **Team training complete**: Operations team comfortable with FastRTC

### 7.3 Before Multi-Location Rollout

- [ ] **Pilot successful**: All metrics met for 2+ weeks
- [ ] **Zero incidents**: No production issues in pilot
- [ ] **Team confident**: Operations team comfortable managing FastRTC
- [ ] **Cost tracking**: TURN usage within budget (<$50/month)

---

## 8. Alternative: When NOT to Migrate

### 8.1 Stay with WebSocket if:

- [ ] Message rate < 50 msg/sec (current: ~10 msg/sec)
- [ ] Latency acceptable (p95 < 200ms)
- [ ] VHF audio streaming not production-critical
- [ ] Team lacks WebRTC expertise
- [ ] Budget constrained (+$45/month not justified)

### 8.2 Consider Other Optimizations First

Before FastRTC, try:

1. **WebSocket compression** (already in optimization plan)
2. **Connection pooling** (already in optimization plan)
3. **Dedicated intra-location WebSocket servers** (co-locate with services)
4. **HTTP/2 or HTTP/3** (multiplexing without WebSocket overhead)

**These deliver 70-80% of FastRTC latency benefits at 10% of the complexity.**

---

## 9. Conclusion

### 9.1 Key Takeaways

1. **FastRTC is not needed today** (1 msg/sec scale, 150ms latency acceptable)
2. **Hybrid architecture is viable** when metrics prove WebSocket is a bottleneck
3. **Pilot deployment essential** (start small, validate, then expand)
4. **Cost increase justified** only if latency improvement drives business value

### 9.2 Recommended Timeline

- **2025**: Optimize WebSocket (current plan)
- **2026 Q2**: Re-evaluate FastRTC (6-month metrics review)
- **2026 Q3**: Pilot FastRTC (if metrics justify)
- **2026 Q4**: Multi-location rollout (if pilot succeeds)

### 9.3 Final Recommendation

> **"Do not migrate to FastRTC until metrics prove it's necessary. When you do migrate, start small (single location pilot), measure everything, and expand incrementally."**

---

## 10. Appendix

### 10.1 FastRTC Libraries Evaluated

| Library | Language | Purpose | Recommendation |
|---------|----------|---------|----------------|
| **fastrtc (Gradio)** | Python | Real-time audio/video | Use for VHF streaming |
| **fast-rtc-swarm** | TypeScript | Mesh networking | Use for TypeScript nodes |
| **aiortc** | Python | WebRTC (asyncio) | Alternative to fastrtc |
| **simple-peer** | JavaScript | WebRTC wrapper | Alternative to fast-rtc-swarm |

### 10.2 STUN/TURN Server Options

| Option | Setup | Cost | Ops Overhead |
|--------|-------|------|--------------|
| **Cloudflare Calls** | 1 hour | $0.05/GB | Low (managed) |
| **coturn (self-hosted)** | 1-2 days | $50/month | Medium |
| **Twilio Network Traversal** | 1 hour | $0.001/request | Low (managed) |

**Recommendation**: Cloudflare Calls (low ops, usage-based pricing)

### 10.3 References

- **FASTRTC-EVALUATION.md**: Comprehensive evaluation
- **WEBSOCKET-OPTIMIZATION-PLAN.md**: Current optimization plan
- **fast-rtc-swarm**: https://github.com/mattkrick/fast-rtc-swarm
- **fastrtc (Gradio)**: https://github.com/gradio-app/fastrtc
- **coturn**: https://github.com/coturn/coturn

---

**Document Version**: 1.0
**Next Review**: 2026-05-16 (6 months)
**Owner**: Ada Architecture Team

---

**Karar**: Şimdilik WebSocket ile devam. FastRTC'ye geçiş ancak metrics haklı çıkarırsa (>50 msg/sec, <50ms latency gerekli, veya VHF audio streaming production-critical olduğunda).
