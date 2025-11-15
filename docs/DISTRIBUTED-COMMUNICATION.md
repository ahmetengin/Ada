# Distributed Node Communication

Ada ekosistemindeki node'lar artık dağıtık ortamda (farklı process'ler, farklı makineler) birbiriyle iletişim kurabilir!

## 🎯 Özellikler

### ✅ Tamamlanan Özellikler

1. **Pluggable Transport Layer**
   - WebSocket transport (gerçek zamanlı bidirectional iletişim)
   - Redis Pub/Sub transport (message broker tabanlı)
   - Abstract interface sayesinde yeni transport'lar eklenebilir

2. **Service Discovery**
   - Merkezi NodeRegistry servisi
   - HTTP/REST API ile node kaydı ve keşfi
   - Health checking ve heartbeat
   - Load balancing metadata

3. **Hybrid Communication Mode**
   - **Local**: Aynı process içinde (hızlı, in-memory)
   - **Distributed**: Network üzerinden (scalable)
   - **Hybrid**: Her ikisi birden (otomatik routing)

4. **Backward Compatible**
   - Mevcut `NodeCommunication` API'si korundu
   - `DistributedNodeCommunication` extends ederek genişletildi
   - Eski kod değişiklik gerektirmiyor

## 📦 Kurulum

### Gerekli Paketler

```bash
npm install
```

Yeni eklenen dependencies:
- `ws` - WebSocket server/client (✅ zaten vardı)
- `redis` - Redis client
- `express` - Registry HTTP server

## 🚀 Hızlı Başlangıç

### 1. WebSocket İletişimi (En Basit)

İki node'un WebSocket üzerinden iletişim kurması:

```typescript
import { DistributedNodeCommunication } from './core/DistributedNodeCommunication.js';
import { WebSocketTransport } from './core/transport/WebSocketTransport.js';

// Node A (Server)
const transportA = new WebSocketTransport({
  nodeId: 'node-a',
  nodeName: 'Node A',
  host: 'localhost',
  port: 8080,
  options: { serverMode: true }
});

const nodeA = new DistributedNodeCommunication({
  nodeId: 'node-a',
  nodeName: 'Node A',
  nodeType: 'ada.sea',
  mode: 'distributed',
  transport: transportA
});

nodeA.onMessage('greeting', async (message) => {
  return { reply: 'Hello!' };
});

await nodeA.start();

// Node B (Client)
const transportB = new WebSocketTransport({
  nodeId: 'node-b',
  nodeName: 'Node B',
  host: 'localhost',
  port: 8081,
  options: { serverMode: true }
});

const nodeB = new DistributedNodeCommunication({
  nodeId: 'node-b',
  nodeName: 'Node B',
  nodeType: 'ada.marina',
  mode: 'distributed',
  transport: transportB
});

await nodeB.start();

// Connect B to A
await nodeB.connectToRemote('ws://localhost:8080', {
  id: 'node-a',
  name: 'Node A',
  type: 'ada.sea'
});

// Send message
const response = await nodeB.request('node-a', 'greeting', {
  text: 'Hello from B!'
});
```

### 2. Redis Pub/Sub (Scalable)

Redis tabanlı message broker kullanımı:

```typescript
import { RedisTransport } from './core/transport/RedisTransport.js';

const transport = new RedisTransport({
  nodeId: 'my-node',
  nodeName: 'My Node',
  options: {
    redisUrl: 'redis://localhost:6379'
  }
});

const node = new DistributedNodeCommunication({
  nodeId: 'my-node',
  nodeName: 'My Node',
  nodeType: 'ada.sea',
  mode: 'distributed',
  transport
});

await node.start();

// Redis otomatik olarak tüm node'ları keşfeder
// Mesaj gönderimi aynı
await node.send('other-node', 'notification', 'update', { data: 'test' });
```

### 3. Service Discovery ile

Registry servisi ile otomatik node keşfi:

```bash
# Önce registry'yi başlat
npm run registry

# Veya programatik olarak
```

```typescript
import { NodeRegistry } from './core/service/NodeRegistry.js';

const registry = new NodeRegistry({
  port: 3000,
  host: 'localhost'
});

await registry.start();
```

Node'ları registry ile kullan:

```typescript
const node = new DistributedNodeCommunication({
  nodeId: 'my-node',
  nodeName: 'My Node',
  nodeType: 'ada.sea',
  mode: 'distributed',
  transport: myTransport,
  registry: {
    url: 'http://localhost:3000'
  }
});

await node.start(); // Otomatik olarak registry'ye kaydolur

// Diğer node'ları otomatik keşfeder
const response = await node.request('other-node', 'task', { data: 'test' });
```

## 📖 İletişim Modları

### Local Mode
Sadece aynı process içindeki node'larla iletişim (mevcut davranış):

```typescript
const node = new DistributedNodeCommunication({
  nodeId: 'local-node',
  nodeName: 'Local Node',
  nodeType: 'ada.sea',
  mode: 'local' // Transport gerekmez
});
```

### Distributed Mode
Sadece network üzerinden iletişim:

```typescript
const node = new DistributedNodeCommunication({
  nodeId: 'remote-node',
  nodeName: 'Remote Node',
  nodeType: 'ada.marina',
  mode: 'distributed',
  transport: myTransport
});
```

### Hybrid Mode (Önerilen)
Hem local hem remote iletişim, otomatik routing:

```typescript
const node = new DistributedNodeCommunication({
  nodeId: 'hybrid-node',
  nodeName: 'Hybrid Node',
  nodeType: 'ada.chatbot',
  mode: 'hybrid', // Default
  transport: myTransport
});

// Local node'a gönder -> in-memory (hızlı)
await node.send('local-node-id', ...);

// Remote node'a gönder -> network (otomatik)
await node.send('remote-node-id', ...);
```

## 🏗️ Mimari

```
┌─────────────────────────────────────────────────────────────────┐
│                    Ada Node Ecosystem                           │
└─────────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
    ┌───────────┐        ┌───────────┐        ┌───────────┐
    │  Process  │        │  Process  │        │  Process  │
    │     A     │        │     B     │        │     C     │
    └───────────┘        └───────────┘        └───────────┘
         │                    │                    │
         │ Local              │ WebSocket/Redis    │
         │ (in-memory)        │ (network)          │
         │                    │                    │
    ┌────▼─────────────────────▼────────────────────▼────┐
    │         DistributedNodeCommunication                │
    │                                                     │
    │  ┌─────────────┐  ┌──────────────┐  ┌──────────┐ │
    │  │  Local Bus  │  │  Transport   │  │ Registry │ │
    │  │ (globalBus) │  │   Layer      │  │  Client  │ │
    │  └─────────────┘  └──────────────┘  └──────────┘ │
    └─────────────────────────────────────────────────────┘
              │                  │                │
              ▼                  ▼                ▼
        In-Process          Network         Service
        Messages           (WS/Redis)      Discovery
```

### Katmanlar

1. **Application Layer**: Node'lar ve iş mantığı
2. **Communication Layer**: `DistributedNodeCommunication`
3. **Transport Layer**: `WebSocketTransport`, `RedisTransport`
4. **Discovery Layer**: `NodeRegistry` (opsiyonel)

## 🔧 API Referansı

### DistributedNodeCommunication

#### Constructor
```typescript
new DistributedNodeCommunication({
  nodeId: string;           // Unique ID
  nodeName: string;         // Human-readable name
  nodeType: string;         // 'ada.sea', 'ada.marina', etc.
  mode?: 'local' | 'distributed' | 'hybrid';
  transport?: NetworkTransport;
  registry?: {
    url: string;
    authToken?: string;
  };
  capabilities?: string[];
  metadata?: Record<string, any>;
  loadFn?: () => number;    // Load calculation
})
```

#### Methods

**Lifecycle:**
- `start()`: Başlat (transport + registry)
- `stop()`: Durdur ve temizle

**Messaging (NodeCommunication'dan miras):**
- `send(to, type, subject, payload, options)`: Mesaj gönder
- `request(to, subject, payload, timeout)`: Request/response
- `onMessage(subject, handler)`: Handler kaydet

**Distributed-specific:**
- `connectToRemote(endpoint, nodeInfo)`: Remote node'a bağlan
- `disconnectFromRemote(nodeId)`: Remote node'dan ayrıl
- `getAllKnownNodes()`: Tüm node'ları listele (local + remote)
- `getRemoteNodeInfo(nodeId)`: Remote node bilgisi
- `isLocalNode(nodeId)`: Local node mu?
- `isRemoteNode(nodeId)`: Remote node mu?
- `getTransportStatus()`: Transport durumu
- `getDistributedStats()`: İstatistikler

### WebSocketTransport

```typescript
new WebSocketTransport({
  nodeId: string;
  nodeName: string;
  host?: string;           // Default: '0.0.0.0'
  port?: number;           // Default: 8080
  options?: {
    serverMode?: boolean;            // Default: true
    heartbeatInterval?: number;      // Default: 30000ms
    connectionTimeout?: number;      // Default: 10000ms
    autoReconnect?: boolean;         // Default: true
    maxReconnectAttempts?: number;  // Default: 5
    reconnectDelay?: number;         // Default: 5000ms
  }
})
```

### RedisTransport

```typescript
new RedisTransport({
  nodeId: string;
  nodeName: string;
  options?: {
    redisUrl?: string;        // Default: 'redis://localhost:6379'
    password?: string;
    database?: number;        // Default: 0
    channelPrefix?: string;   // Default: 'ada:node:'
    heartbeatInterval?: number;
    nodeTimeout?: number;
  }
})
```

### NodeRegistry

```typescript
new NodeRegistry({
  port?: number;                 // Default: 3000
  host?: string;                 // Default: '0.0.0.0'
  healthCheckInterval?: number;  // Default: 30000
  nodeTimeout?: number;          // Default: 60000
  requireAuth?: boolean;         // Default: false
  authToken?: string;
})
```

**REST API Endpoints:**
- `GET /health` - Registry health
- `POST /nodes` - Register node
- `GET /nodes` - List all nodes
- `GET /nodes/:id` - Get specific node
- `PUT /nodes/:id` - Update node
- `POST /nodes/:id/heartbeat` - Send heartbeat
- `DELETE /nodes/:id` - Deregister
- `GET /stats` - Statistics

## 📝 Örnekler

Detaylı örnekler için:
```bash
npm run demo:distributed
```

Veya dosyaya bakın:
```
examples/distributed-communication-demo.ts
```

5 farklı örnek scenario:
1. WebSocket iletişimi
2. Redis Pub/Sub
3. Service discovery
4. Hybrid mode
5. Load balancing

## 🔒 Güvenlik

### Production Checklist

- [ ] Registry authentication etkinleştir
- [ ] SSL/TLS kullan (wss:// için)
- [ ] Redis password ayarla
- [ ] Network firewall kuralları
- [ ] Rate limiting ekle
- [ ] Message validation
- [ ] Audit logging

### Authentication Örneği

```typescript
// Registry
const registry = new NodeRegistry({
  port: 3000,
  requireAuth: true,
  authToken: process.env.REGISTRY_TOKEN
});

// Node
const node = new DistributedNodeCommunication({
  nodeId: 'secure-node',
  nodeName: 'Secure Node',
  nodeType: 'ada.sea',
  registry: {
    url: 'https://registry.example.com',
    authToken: process.env.REGISTRY_TOKEN
  }
});
```

## 🚧 Deployment

### Senaryo 1: Tek Makine, Çoklu Process

```bash
# Terminal 1: Registry
npm run registry

# Terminal 2: Node A
node dist/nodes/nodeA.js

# Terminal 3: Node B
node dist/nodes/nodeB.js
```

### Senaryo 2: Farklı Makineler

**Makine 1 (Registry Server):**
```bash
export REGISTRY_HOST=0.0.0.0
export REGISTRY_PORT=3000
npm run registry
```

**Makine 2 (Node A):**
```typescript
const node = new DistributedNodeCommunication({
  nodeId: 'node-a',
  nodeName: 'Node A',
  nodeType: 'ada.sea',
  transport: new WebSocketTransport({
    host: '0.0.0.0',  // External IP
    port: 8080
  }),
  registry: {
    url: 'http://registry-server:3000'
  }
});
```

**Makine 3 (Node B):**
```typescript
const node = new DistributedNodeCommunication({
  nodeId: 'node-b',
  nodeName: 'Node B',
  nodeType: 'ada.marina',
  transport: new WebSocketTransport({
    host: '0.0.0.0',
    port: 8080
  }),
  registry: {
    url: 'http://registry-server:3000'
  }
});
```

### Docker Compose Örneği

```yaml
version: '3.8'

services:
  registry:
    build: .
    command: npm run registry
    ports:
      - "3000:3000"
    environment:
      - REGISTRY_PORT=3000
      - REGISTRY_HOST=0.0.0.0

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  node-sea:
    build: .
    command: node dist/nodes/ada.sea/index.js
    depends_on:
      - registry
      - redis
    environment:
      - NODE_TYPE=ada.sea
      - REGISTRY_URL=http://registry:3000
      - REDIS_URL=redis://redis:6379

  node-marina:
    build: .
    command: node dist/nodes/ada.marina/index.js
    depends_on:
      - registry
      - redis
    environment:
      - NODE_TYPE=ada.marina
      - REGISTRY_URL=http://registry:3000
      - REDIS_URL=redis://redis:6379
```

## 📊 Monitoring

### Stats Endpoint

```bash
curl http://localhost:3000/stats
```

Response:
```json
{
  "totalNodes": 5,
  "onlineNodes": 4,
  "offlineNodes": 1,
  "degradedNodes": 0,
  "byType": {
    "ada.sea": 2,
    "ada.marina": 1,
    "ada.chatbot": 1,
    "ada.finance": 1
  },
  "averageLoad": 45.2
}
```

### Node Stats

```typescript
const stats = node.getDistributedStats();
console.log(stats);
// {
//   mode: 'hybrid',
//   localNodes: 2,
//   remoteNodes: 3,
//   transportStatus: 'connected',
//   registryConnected: true,
//   sent: 150,
//   received: 200,
//   pending: 0,
//   connectedNodes: 5
// }
```

## 🐛 Troubleshooting

### WebSocket bağlantı hatası

```
Error: Connection timeout to ws://localhost:8080
```

**Çözüm:**
- Server node'un başladığından emin olun
- Firewall/port kontrolü
- Host/port doğruluğunu kontrol edin

### Redis bağlantı hatası

```
Error: Redis connection failed
```

**Çözüm:**
```bash
# Redis çalışıyor mu?
redis-cli ping
# PONG dönmeli

# Yoksa başlat
redis-server
```

### Registry'ye kayıt olmuyor

**Kontroller:**
- Registry çalışıyor mu? `curl http://localhost:3000/health`
- Auth token doğru mu?
- Network erişimi var mı?

## 🎓 Kaynaklar

### Dosya Yapısı

```
Ada/
├── core/
│   ├── NodeCommunication.ts              # Base class (mevcut)
│   ├── DistributedNodeCommunication.ts   # Distributed extension
│   ├── transport/
│   │   ├── NetworkTransport.ts           # Abstract transport
│   │   ├── WebSocketTransport.ts         # WebSocket impl
│   │   └── RedisTransport.ts             # Redis impl
│   └── service/
│       └── NodeRegistry.ts               # Service discovery
├── examples/
│   ├── distributed-communication-demo.ts
│   └── start-registry.ts
└── docs/
    └── DISTRIBUTED-COMMUNICATION.md      # Bu dosya
```

### Öğrenme Sırası

1. ✅ `examples/distributed-communication-demo.ts` - Örnekleri çalıştır
2. ✅ `core/transport/NetworkTransport.ts` - Transport interface'i anla
3. ✅ `core/DistributedNodeCommunication.ts` - Ana implementasyon
4. ✅ Kendi transport'unu yaz (HTTP, gRPC, MQTT, vb.)

## 🔮 Roadmap

### Gelecek Özellikler

- [ ] gRPC transport
- [ ] MQTT transport (IoT için)
- [ ] Message encryption (E2E)
- [ ] Message persistence
- [ ] Circuit breaker pattern
- [ ] Rate limiting
- [ ] Metrics/Prometheus integration
- [ ] Distributed tracing
- [ ] Node clustering
- [ ] Auto-scaling based on load

## 💡 Best Practices

1. **Her zaman hybrid mode kullan** (local + distributed)
2. **Registry ile başla** (production için gerekli)
3. **Health monitoring ekle**
4. **Graceful shutdown yap**
5. **Error handling unutma**
6. **Message size'ı limit et**
7. **Timeout'ları ayarla**
8. **Connection pooling kullan**

## 🤝 Katkıda Bulunma

Yeni transport eklemek için:

1. `NetworkTransport` abstract class'ını extend et
2. Gerekli methodları implement et
3. Test ekle
4. Dokümante et
5. PR aç

Örnek: gRPC transport

```typescript
import { NetworkTransport } from './NetworkTransport.js';

export class GRPCTransport extends NetworkTransport {
  async start() { /* ... */ }
  async stop() { /* ... */ }
  async sendToNode(nodeId, message) { /* ... */ }
  async broadcast(message) { /* ... */ }
  // ...
}
```

---

**Sorular?** Issue aç veya dokümanlara bak!
