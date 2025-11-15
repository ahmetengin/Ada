# Distributed Communication Migration Guide

Ada node'larını **local → distributed** iletişime geçirme kılavuzu.

## 🔄 Mevcut Durum vs Yeni Durum

### Öncesi (Local Only)

```typescript
// core/BaseNode.ts (satır 77)
this.communication = new NodeCommunication(this.identity.id);

// Sonuç:
// ✅ Hızlı (in-memory)
// ❌ Sadece aynı process içinde
// ❌ Farklı makinelerde çalışamaz
```

### Sonrası (Hybrid: Local + Distributed)

```typescript
// Artık hem NodeCommunication hem DistributedNodeCommunication kullanabilirsin
this.communication = new DistributedNodeCommunication({
  nodeId: this.identity.id,
  nodeName: this.identity.name,
  nodeType: this.identity.type,
  mode: 'hybrid',
  transport: myTransport
});

// Sonuç:
// ✅ Hızlı local (in-memory)
// ✅ Network üzerinden (WebSocket/Redis)
// ✅ Farklı makinelerde çalışabilir
// ✅ Otomatik routing (local vs remote)
```

## 📊 Sınıf Hiyerarşisi

```
EventEmitter (eventemitter3)
    │
    ├─► NodeCommunication (mevcut, değişmedi)
    │       │
    │       └─► DistributedNodeCommunication (yeni, extends NodeCommunication)
    │
    └─► BaseNode
            │
            ├─► SeaNode
            ├─► MarinaNode
            ├─► TravelNode
            └─► ... (diğer node'lar)
```

### Önemli:

1. **NodeCommunication** → AYNEN KALIR (backward compatible)
2. **DistributedNodeCommunication** → EXTENDS NodeCommunication
3. **BaseNode** → İkisini de kullanabilir (factory method ile)

## 🚀 Migration Yöntemleri

### Yöntem 1: Runtime Upgrade (Önerilen)

Mevcut node'ları runtime'da distributed hale getir:

```typescript
import { enableDistributedCommunication } from './core/BaseNodeExtensions.js';
import { WebSocketTransport } from './core/transport/WebSocketTransport.js';

// 1. Mevcut node'u normal oluştur
const seaNode = new SeaNode({
  name: 'Ada Sea',
  type: 'ada.sea',
  capabilities: { ... }
});

await seaNode.start(); // Local mode

// 2. Distributed communication ekle
const transport = new WebSocketTransport({
  nodeId: seaNode.getIdentity().id,
  nodeName: seaNode.getIdentity().name,
  port: 8080
});

await enableDistributedCommunication(
  seaNode,
  transport,
  'http://localhost:3000' // Registry URL
);

// Artık hybrid mode: local + distributed
```

### Yöntem 2: Factory Method

BaseNode'a distributed option ekleyerek:

```typescript
// core/BaseNodeExtensions.ts içindeki factory kullan
import { createCommunication } from './core/BaseNodeExtensions.js';

// BaseNode constructor içinde (gelecekte):
this.communication = createCommunication(
  this.identity.id,
  this.identity.type,
  this.identity.name,
  options.distributed // undefined ise local, dolu ise distributed
);
```

### Yöntem 3: Direct Instantiation

Doğrudan DistributedNodeCommunication kullan:

```typescript
import { DistributedNodeCommunication } from './core/DistributedNodeCommunication.js';

const comm = new DistributedNodeCommunication({
  nodeId: 'my-node',
  nodeName: 'My Node',
  nodeType: 'ada.sea',
  mode: 'hybrid',
  transport: myTransport,
  registry: { url: 'http://localhost:3000' }
});

await comm.start();

// Kullan
await comm.request('other-node', 'task', { data: 'test' });
```

## 📝 Örnek Senaryolar

### Senaryo 1: Tek Yacht

```typescript
// Yacht'ta Mac Mini M4 çalışıyor
const seaNode = new SeaNode({ ... });
await seaNode.start();

const transport = new WebSocketTransport({
  nodeId: seaNode.getIdentity().id,
  nodeName: seaNode.getIdentity().name,
  host: '0.0.0.0',
  port: 8080
});

await enableDistributedCommunication(
  seaNode,
  transport,
  'https://registry.ada-cloud.com'
);

// Yacht artık:
// - Local: Crew member'lar (same device)
// - Remote: Marina, Cloud services
```

### Senaryo 2: Marina + Multiple Yachts

```typescript
// MARINA SERVER (Cloud)
const marinaNode = new MarinaNode({ ... });
await marinaNode.start();

const transport = new RedisTransport({
  nodeId: 'marina-wim',
  nodeName: 'West Istanbul Marina',
  options: { redisUrl: 'redis://localhost:6379' }
});

await enableDistributedCommunication(marinaNode, transport);

// Marina artık:
// - 100+ yacht ile aynı anda iletişim kurabilir
// - Redis Pub/Sub (scalable)
// - Auto-discovery (registry)
```

### Senaryo 3: Hybrid Fleet

```typescript
// Process A: 3 local node (same machine)
const sea = new SeaNode({ ... });
const weather = new WeatherNode({ ... });
const maintenance = new MaintenanceNode({ ... });

await sea.start();
await weather.start();
await maintenance.start();

// Local connection (fast)
sea.connectToNode(weather.getIdentity().id);
sea.connectToNode(maintenance.getIdentity().id);

// Process A'ya distributed ekle (dış dünya ile)
await enableDistributedCommunication(sea, transport);

// Artık:
// - weather → sea: LOCAL (microseconds)
// - marina → sea: REMOTE (network)
```

## 🔧 API Karşılaştırması

### NodeCommunication (Mevcut)

```typescript
// Metodlar (AYNEN KALIR)
async send(to, type, subject, payload, options)
async request(to, subject, payload, timeout)
async respond(messageId, payload)
onMessage(subject, handler)
onMessagePattern(pattern, handler)
getConnectedNodes()
isConnected(nodeId)
connectTo(nodeId)
disconnect(nodeId)
```

### DistributedNodeCommunication (Yeni)

```typescript
// TÜM NodeCommunication metodları +

// Yeni metodlar:
async start()                              // Start transport & registry
async stop()                               // Cleanup
async connectToRemote(endpoint, nodeInfo)  // Remote connection
async disconnectFromRemote(nodeId)         // Remote disconnect
getAllKnownNodes()                         // Local + remote
getRemoteNodeInfo(nodeId)                  // Remote node info
isLocalNode(nodeId)                        // Check if local
isRemoteNode(nodeId)                       // Check if remote
getTransportStatus()                       // Transport status
getDistributedStats()                      // Extended stats
```

## 📦 Dependencies

Yeni dependency'ler (`package.json`):

```json
{
  "dependencies": {
    "express": "^4.18.2",  // Registry HTTP server
    "redis": "^4.6.12",    // Redis Pub/Sub client
    "ws": "^8.18.3"        // WebSocket (zaten vardı)
  },
  "devDependencies": {
    "@types/express": "^4.17.21"
  }
}
```

## 🏃‍♂️ Çalıştırma

```bash
# 1. Dependencies yükle
npm install

# 2. Registry başlat (1. terminal)
npm run registry

# 3. Migration demo çalıştır (2. terminal)
npm run demo:migration

# 4. Full distributed demo (3. terminal)
npm run demo:distributed
```

## 🎯 Migration Checklist

Mevcut node'ları distributed yapmak için:

- [ ] `npm install` ile yeni dependencies yükle
- [ ] Transport seç (WebSocket veya Redis)
- [ ] Registry başlat (production için)
- [ ] Node'a `enableDistributedCommunication()` ekle
- [ ] Test et (local + remote mesajlar)
- [ ] Production deploy (SSL, auth, monitoring)

## 📁 Dosya Yapısı

```
Ada/
├── core/
│   ├── NodeCommunication.ts              # Mevcut (değişmedi)
│   ├── DistributedNodeCommunication.ts   # Yeni (extends NodeCommunication)
│   ├── BaseNodeExtensions.ts             # Migration utilities
│   ├── transport/
│   │   ├── NetworkTransport.ts
│   │   ├── WebSocketTransport.ts
│   │   └── RedisTransport.ts
│   └── service/
│       └── NodeRegistry.ts
│
├── examples/
│   ├── distributed-communication-demo.ts  # Full demo
│   └── migrate-to-distributed.ts          # Migration examples
│
└── docs/
    ├── DISTRIBUTED-COMMUNICATION.md       # Ana dokümantasyon
    └── DISTRIBUTED-MIGRATION.md           # Bu dosya
```

## ❓ SSS

### Mevcut kod çalışmaya devam eder mi?

**Evet!** `NodeCommunication` aynen korundu. Hiçbir değişiklik yapmadan mevcut kod çalışmaya devam eder.

### Hybrid mode nedir?

**Local + Distributed:** Aynı process içindeki node'larla local (hızlı), farklı process/makinedeki node'larla network üzerinden iletişim.

### WebSocket mi Redis mi kullanmalıyım?

- **WebSocket:** 1-100 node, düşük latency, direkt connection
- **Redis:** 100+ node, yüksek ölçeklenebilirlik, message broker

### Registry zorunlu mu?

**Hayır.** Manual connection yapabilirsin. Ama registry ile otomatik discovery çok daha kolay.

### Performance etkisi?

- **Local:** ~0.1ms (değişmez)
- **Remote (WebSocket):** ~10-50ms (network latency)
- **Remote (Redis):** ~5-20ms (broker overhead)

### Production için ne gerekir?

1. SSL/TLS (wss:// için)
2. Registry authentication
3. Firewall kuralları
4. Monitoring (transport status)
5. Health checks
6. Audit logging

## 🔗 İlgili Dökümanlar

- [Distributed Communication](./DISTRIBUTED-COMMUNICATION.md) - Detaylı kullanım
- [Examples: migrate-to-distributed.ts](../examples/migrate-to-distributed.ts) - 5 senaryo

---

**Özet:** Mevcut Ada node'ları **hiç kod değişikliği olmadan** distributed hale getirilebilir. `enableDistributedCommunication()` runtime'da ekle, otomatik routing ile local ve remote node'larla iletişim kur. 🚀
