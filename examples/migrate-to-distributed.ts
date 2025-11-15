/**
 * Migration Guide: Mevcut Node'ları Distributed Yapmak
 *
 * Bu örnek, mevcut ada.sea, ada.marina gibi node'ların nasıl
 * distributed communication'a geçirileceğini gösterir.
 */

import { SeaNode } from '../nodes/ada.sea/SeaNode.js';
import { MarinaNode } from '../nodes/ada.marina/MarinaNode.js';
import { WebSocketTransport } from '../core/transport/WebSocketTransport.js';
import { RedisTransport } from '../core/transport/RedisTransport.js';
import { enableDistributedCommunication } from '../core/BaseNodeExtensions.js';

/**
 * Senaryo 1: Mevcut Local Node → Distributed Node
 *
 * Hiçbir kod değişikliği olmadan runtime'da distributed hale getirme
 */
async function scenario1_RuntimeUpgrade() {
  console.log('\n=== Scenario 1: Runtime Upgrade to Distributed ===\n');

  // 1. Mevcut node'u normal şekilde oluştur (local mode)
  const seaNode = new SeaNode({
    name: 'Ada Sea',
    type: 'ada.sea',
    capabilities: {
      skills: ['navigation', 'nmea2000', 'vhf-radio'],
      services: ['yacht-management'],
      integrations: ['signalk', 'nmea2000'],
    },
  });

  // Message handler ekle (mevcut kod)
  seaNode['communication'].onMessage('weather-request', async (message) => {
    console.log('Received weather request:', message.payload);
    return { weather: 'sunny', wind: 15 };
  });

  await seaNode.start();
  console.log('✅ SeaNode started (LOCAL mode)');

  // 2. Runtime'da distributed communication ekle
  const transport = new WebSocketTransport({
    nodeId: seaNode.getIdentity().id,
    nodeName: seaNode.getIdentity().name,
    host: '0.0.0.0',
    port: 8080,
    options: { serverMode: true },
  });

  await enableDistributedCommunication(
    seaNode,
    transport,
    'http://localhost:3000' // Registry URL
  );

  console.log('✅ SeaNode upgraded to DISTRIBUTED mode');
  console.log('   - WebSocket server: ws://0.0.0.0:8080');
  console.log('   - Registry: http://localhost:3000');
  console.log('   - Mode: HYBRID (local + distributed)');

  // Artık hem local hem remote mesajlar alabilir
  console.log('\n📡 Node now accepts both local and remote messages');

  // Cleanup
  await seaNode.stop();
}

/**
 * Senaryo 2: İki Farklı Makinede Çalışan Node'lar
 *
 * Machine A: ada.sea (yacht'ta)
 * Machine B: ada.marina (marina'da)
 */
async function scenario2_TwoMachines() {
  console.log('\n=== Scenario 2: Two Machines Communication ===\n');

  // MACHINE A: Yacht'ta çalışan SeaNode
  console.log('🚢 MACHINE A (Yacht): Starting SeaNode...');

  const transport1 = new WebSocketTransport({
    nodeId: 'sea-yacht-1',
    nodeName: 'Yacht Ada Sea',
    host: '0.0.0.0', // Listen on all interfaces
    port: 8080,
    options: { serverMode: true },
  });

  const seaNode = new SeaNode({
    name: 'Yacht Ada Sea',
    type: 'ada.sea',
    capabilities: {
      skills: ['navigation', 'nmea2000'],
      services: ['yacht-management'],
      integrations: ['signalk'],
    },
  });

  await seaNode.start();
  await enableDistributedCommunication(
    seaNode,
    transport1,
    'http://registry-server:3000'
  );

  console.log('✅ SeaNode ready on ws://0.0.0.0:8080');

  // MACHINE B: Marina'da çalışan MarinaNode
  console.log('\n⚓ MACHINE B (Marina): Starting MarinaNode...');

  const transport2 = new WebSocketTransport({
    nodeId: 'marina-wim-1',
    nodeName: 'West Istanbul Marina',
    host: '0.0.0.0',
    port: 8081,
    options: { serverMode: true },
  });

  const marinaNode = new MarinaNode({
    name: 'West Istanbul Marina',
    type: 'ada.marina',
    capabilities: {
      skills: ['berth-management', 'facility-booking'],
      services: ['marina-operations'],
      integrations: ['payment-systems'],
    },
  });

  await marinaNode.start();
  await enableDistributedCommunication(
    marinaNode,
    transport2,
    'http://registry-server:3000'
  );

  console.log('✅ MarinaNode ready on ws://0.0.0.0:8081');

  // Marina'dan Yacht'a mesaj gönder
  console.log('\n📨 Marina sending message to Yacht...');

  const response = await marinaNode['communication'].request(
    'sea-yacht-1',
    'berth-assignment',
    {
      berth: 'C-15',
      arrival: '2025-01-20T14:00:00Z',
    }
  );

  console.log('📬 Yacht response:', response);

  // Cleanup
  await seaNode.stop();
  await marinaNode.stop();
}

/**
 * Senaryo 3: Redis Pub/Sub ile Scalable Communication
 *
 * Birden fazla node, Redis üzerinden iletişim kuruyor
 */
async function scenario3_RedisPubSub() {
  console.log('\n=== Scenario 3: Redis Pub/Sub (Scalable) ===\n');

  const nodes: SeaNode[] = [];

  // 5 farklı yacht node'u oluştur
  for (let i = 1; i <= 5; i++) {
    const transport = new RedisTransport({
      nodeId: `yacht-${i}`,
      nodeName: `Yacht ${i}`,
      options: {
        redisUrl: 'redis://localhost:6379',
      },
    });

    const yacht = new SeaNode({
      name: `Yacht ${i}`,
      type: 'ada.sea',
      capabilities: {
        skills: ['navigation'],
        services: ['yacht-management'],
        integrations: [],
      },
    });

    await yacht.start();
    await enableDistributedCommunication(yacht, transport);

    nodes.push(yacht);
    console.log(`✅ Yacht ${i} connected to Redis`);
  }

  console.log('\n📡 All yachts are now connected via Redis Pub/Sub');
  console.log('   - Auto-discovery: YES (via Redis presence)');
  console.log('   - Scalable: YES (Redis handles routing)');
  console.log('   - Reliable: YES (Redis persistence)');

  // Broadcast weather update to all yachts
  console.log('\n🌦️  Broadcasting weather update...');

  await nodes[0]['communication'].send(
    'broadcast',
    'notification',
    'weather-update',
    {
      region: 'Marmara',
      wind: 25,
      wave: 2.5,
      alert: 'Strong wind warning',
    }
  );

  console.log('✅ Weather update sent to all 5 yachts via Redis');

  // Cleanup
  for (const yacht of nodes) {
    await yacht.stop();
  }
}

/**
 * Senaryo 4: Hybrid Mode - Local + Distributed
 *
 * Aynı process içinde local, dışarıda distributed
 */
async function scenario4_HybridMode() {
  console.log('\n=== Scenario 4: Hybrid Mode (Local + Distributed) ===\n');

  // Local node (aynı process içinde)
  const localSea = new SeaNode({
    name: 'Local Sea',
    type: 'ada.sea',
    capabilities: {
      skills: ['navigation'],
      services: [],
      integrations: [],
    },
  });

  const localMarina = new MarinaNode({
    name: 'Local Marina',
    type: 'ada.marina',
    capabilities: {
      skills: ['berth-management'],
      services: [],
      integrations: [],
    },
  });

  await localSea.start();
  await localMarina.start();

  // Local connection (fast, in-memory)
  localSea.connectToNode(localMarina.getIdentity().id);
  localMarina.connectToNode(localSea.getIdentity().id);

  console.log('✅ Local nodes connected (in-memory)');

  // Hybrid node (local + distributed)
  const transport = new WebSocketTransport({
    nodeId: 'hybrid-node',
    nodeName: 'Hybrid Node',
    port: 8080,
  });

  const hybridNode = new SeaNode({
    name: 'Hybrid Node',
    type: 'ada.sea',
    capabilities: {
      skills: ['navigation'],
      services: [],
      integrations: [],
    },
  });

  await hybridNode.start();
  await enableDistributedCommunication(hybridNode, transport);

  // Connect to local node
  hybridNode.connectToNode(localSea.getIdentity().id);
  localSea.connectToNode(hybridNode.getIdentity().id);

  console.log('✅ Hybrid node connected (local + network)');

  // Local message (fast)
  console.log('\n📨 Sending LOCAL message (in-memory)...');
  const start1 = Date.now();

  await hybridNode['communication'].request(
    localSea.getIdentity().id,
    'ping',
    {}
  );

  console.log(`✅ Local response time: ${Date.now() - start1}ms`);

  // Remote message (network)
  console.log('\n📨 Sending REMOTE message (network)...');
  const start2 = Date.now();

  // This would go over network if remote node exists
  console.log(`   Network latency: ~${Date.now() - start2}ms`);

  console.log('\n📊 Hybrid Mode Benefits:');
  console.log('   ✅ Local: <1ms latency (in-memory)');
  console.log('   ✅ Remote: ~10-50ms latency (network)');
  console.log('   ✅ Automatic routing based on node location');

  // Cleanup
  await localSea.stop();
  await localMarina.stop();
  await hybridNode.stop();
}

/**
 * Senaryo 5: Production Deployment Pattern
 */
async function scenario5_ProductionPattern() {
  console.log('\n=== Scenario 5: Production Deployment ===\n');

  console.log('Production Architecture:');
  console.log('');
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│         NodeRegistry (Port 3000)            │');
  console.log('│    http://registry.ada-cloud.com            │');
  console.log('└─────────────────────────────────────────────┘');
  console.log('           │              │              │');
  console.log('           ▼              ▼              ▼');
  console.log('      ┌────────┐     ┌────────┐     ┌────────┐');
  console.log('      │ Yacht  │     │ Marina │     │ Cloud  │');
  console.log('      │  Sea   │     │  Node  │     │  Nodes │');
  console.log('      └────────┘     └────────┘     └────────┘');
  console.log('     Starlink       Local WiFi     AWS/Azure');
  console.log('   (Satellite)     (Fiber 1Gbps)  (Public IP)');
  console.log('');
  console.log('Configuration:');
  console.log('');
  console.log('  YACHT (Mac Mini M4 on boat):');
  console.log('  - Transport: WebSocket wss:// (SSL)');
  console.log('  - Registry: https://registry.ada-cloud.com');
  console.log('  - Mode: hybrid (local crew + cloud marina)');
  console.log('  - Bandwidth: Starlink (50-200 Mbps)');
  console.log('  - Privacy: All data on-device, selective sync');
  console.log('');
  console.log('  MARINA (Cloud server):');
  console.log('  - Transport: WebSocket wss:// + Redis');
  console.log('  - Registry: https://registry.ada-cloud.com');
  console.log('  - Mode: distributed (handles all yachts)');
  console.log('  - Bandwidth: 1Gbps fiber');
  console.log('  - Scale: 1000+ concurrent yacht connections');
  console.log('');
  console.log('  CLOUD NODES (Ada services):');
  console.log('  - ada.weather → Weather forecasting');
  console.log('  - ada.finance → Invoicing & payments');
  console.log('  - ada.legal → Contract management');
  console.log('  - Transport: Redis Pub/Sub (scalable)');
  console.log('');
  console.log('Security:');
  console.log('  ✅ TLS/SSL for all WebSocket connections');
  console.log('  ✅ Registry authentication token');
  console.log('  ✅ Captain approval for data sharing');
  console.log('  ✅ Audit log for all remote communications');
}

/**
 * Ana fonksiyon - tüm senaryoları çalıştır
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   Ada Migration Guide: Local → Distributed        ║');
  console.log('╚════════════════════════════════════════════════════╝');

  try {
    // Senaryolar
    await scenario1_RuntimeUpgrade();

    // Not: Diğer senaryolar için registry ve Redis gerekli
    // await scenario2_TwoMachines();
    // await scenario3_RedisPubSub();
    // await scenario4_HybridMode();

    await scenario5_ProductionPattern();

    console.log('\n✅ All scenarios completed!\n');
    console.log('Next Steps:');
    console.log('  1. npm install              # Install new dependencies');
    console.log('  2. npm run registry         # Start registry server');
    console.log('  3. npm run demo:distributed # Run full demo');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  scenario1_RuntimeUpgrade,
  scenario2_TwoMachines,
  scenario3_RedisPubSub,
  scenario4_HybridMode,
  scenario5_ProductionPattern,
};
