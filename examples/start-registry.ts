/**
 * Start Registry Server
 *
 * Standalone script to start the Node Registry service.
 * This is typically run as a separate process for node discovery.
 */

import { NodeRegistry } from '../core/service/NodeRegistry.js';

const PORT = parseInt(process.env.REGISTRY_PORT || '3000');
const HOST = process.env.REGISTRY_HOST || '0.0.0.0';
const AUTH_TOKEN = process.env.REGISTRY_AUTH_TOKEN;

async function main() {
  console.log('Starting Ada Node Registry...\n');

  const registry = new NodeRegistry({
    port: PORT,
    host: HOST,
    healthCheckInterval: 30000,
    nodeTimeout: 60000,
    requireAuth: !!AUTH_TOKEN,
    authToken: AUTH_TOKEN,
  });

  // Event listeners
  registry.on('node:registered', (node) => {
    console.log(`✅ Node registered: ${node.name} (${node.type}) - ${node.endpoint}`);
  });

  registry.on('node:updated', (node) => {
    console.log(`🔄 Node updated: ${node.name} - Load: ${node.load?.toFixed(1)}%`);
  });

  registry.on('node:deregistered', (nodeId) => {
    console.log(`❌ Node deregistered: ${nodeId}`);
  });

  registry.on('node:health', (nodeId, status) => {
    const emoji = status === 'online' ? '✅' : status === 'degraded' ? '⚠️' : '❌';
    console.log(`${emoji} Node health changed: ${nodeId} -> ${status}`);
  });

  // Start registry
  await registry.start();

  console.log(`\n🚀 Registry is running!`);
  console.log(`   URL: http://${HOST}:${PORT}`);
  console.log(`   Health: http://${HOST}:${PORT}/health`);
  console.log(`   Stats: http://${HOST}:${PORT}/stats`);
  if (AUTH_TOKEN) {
    console.log(`   Auth: Required (token set)`);
  }
  console.log('\n📊 Waiting for nodes to register...\n');

  // Periodic stats
  setInterval(() => {
    const stats = registry.getAllNodes();
    if (stats.length > 0) {
      console.log(`\n📈 Current Stats: ${stats.length} nodes registered`);
      stats.forEach(node => {
        const status = node.status === 'online' ? '🟢' : node.status === 'degraded' ? '🟡' : '🔴';
        console.log(`   ${status} ${node.name} (${node.type}) - Load: ${node.load?.toFixed(1) || 'N/A'}%`);
      });
    }
  }, 60000); // Every minute

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down registry...');
    await registry.stop();
    console.log('✅ Registry stopped');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n\n🛑 Shutting down registry...');
    await registry.stop();
    console.log('✅ Registry stopped');
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('❌ Failed to start registry:', error);
  process.exit(1);
});
