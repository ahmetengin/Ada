/**
 * Distributed Communication Demo
 *
 * Demonstrates how Ada nodes communicate across different processes
 * using the distributed communication system.
 */

import { DistributedNodeCommunication } from '../core/DistributedNodeCommunication.js';
import { WebSocketTransport } from '../core/transport/WebSocketTransport.js';
import { RedisTransport } from '../core/transport/RedisTransport.js';
import { NodeRegistry } from '../core/service/NodeRegistry.js';

/**
 * Example 1: WebSocket-based communication
 *
 * This example shows two nodes communicating via WebSocket.
 * Node A acts as server, Node B connects as client.
 */
async function example1_WebSocketCommunication() {
  console.log('\n=== Example 1: WebSocket Communication ===\n');

  // Start Node A (server mode)
  const transportA = new WebSocketTransport({
    nodeId: 'node-a',
    nodeName: 'Node A',
    host: 'localhost',
    port: 8080,
    options: {
      serverMode: true,
    },
  });

  const nodeA = new DistributedNodeCommunication({
    nodeId: 'node-a',
    nodeName: 'Node A',
    nodeType: 'ada.sea',
    mode: 'distributed',
    transport: transportA,
  });

  // Register message handler
  nodeA.onMessage('greeting', async (message) => {
    console.log(`Node A received: ${message.payload.text}`);
    return { reply: 'Hello from Node A!' };
  });

  await nodeA.start();
  console.log('Node A started on ws://localhost:8080');

  // Give server time to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Start Node B (client mode)
  const transportB = new WebSocketTransport({
    nodeId: 'node-b',
    nodeName: 'Node B',
    host: 'localhost',
    port: 8081,
    options: {
      serverMode: true,
    },
  });

  const nodeB = new DistributedNodeCommunication({
    nodeId: 'node-b',
    nodeName: 'Node B',
    nodeType: 'ada.marina',
    mode: 'distributed',
    transport: transportB,
  });

  await nodeB.start();
  console.log('Node B started on ws://localhost:8081');

  // Connect Node B to Node A
  await nodeB.connectToRemote('ws://localhost:8080', {
    id: 'node-a',
    name: 'Node A',
    type: 'ada.sea',
  });

  console.log('Node B connected to Node A');

  // Send message from B to A
  const response = await nodeB.request('node-a', 'greeting', {
    text: 'Hello from Node B!',
  });

  console.log(`Node B received response:`, response);

  // Cleanup
  await nodeA.stop();
  await nodeB.stop();
}

/**
 * Example 2: Redis Pub/Sub communication
 *
 * This example shows multiple nodes communicating via Redis Pub/Sub.
 * Great for scalable, broker-based communication.
 */
async function example2_RedisCommunication() {
  console.log('\n=== Example 2: Redis Pub/Sub Communication ===\n');

  // Note: Requires Redis server running on localhost:6379

  const transportA = new RedisTransport({
    nodeId: 'node-a',
    nodeName: 'Node A',
    options: {
      redisUrl: 'redis://localhost:6379',
    },
  });

  const nodeA = new DistributedNodeCommunication({
    nodeId: 'node-a',
    nodeName: 'Node A',
    nodeType: 'ada.sea',
    mode: 'distributed',
    transport: transportA,
  });

  const transportB = new RedisTransport({
    nodeId: 'node-b',
    nodeName: 'Node B',
    options: {
      redisUrl: 'redis://localhost:6379',
    },
  });

  const nodeB = new DistributedNodeCommunication({
    nodeId: 'node-b',
    nodeName: 'Node B',
    nodeType: 'ada.marina',
    mode: 'distributed',
    transport: transportB,
  });

  // Register handlers
  nodeA.onMessage('task', async (message) => {
    console.log(`Node A processing task: ${message.payload.task}`);
    return { status: 'completed', result: 'Task done!' };
  });

  nodeB.onMessage('task', async (message) => {
    console.log(`Node B processing task: ${message.payload.task}`);
    return { status: 'completed', result: 'Task done!' };
  });

  // Start nodes
  await nodeA.start();
  await nodeB.start();

  console.log('Both nodes started and connected to Redis');

  // Wait for discovery
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Send message from A to B
  const response = await nodeA.request('node-b', 'task', {
    task: 'Process invoice',
  });

  console.log('Response from Node B:', response);

  // Broadcast message
  await nodeA.send('broadcast', 'notification', 'system-update', {
    message: 'System maintenance scheduled',
  });

  console.log('Broadcast sent to all nodes');

  // Cleanup
  await nodeA.stop();
  await nodeB.stop();
}

/**
 * Example 3: Service Discovery with Registry
 *
 * This example shows how nodes can discover each other using
 * a centralized registry service.
 */
async function example3_ServiceDiscovery() {
  console.log('\n=== Example 3: Service Discovery with Registry ===\n');

  // Start registry service
  const registry = new NodeRegistry({
    port: 3000,
    host: 'localhost',
  });

  await registry.start();
  console.log('Registry started on http://localhost:3000');

  // Create multiple nodes with registry
  const nodes: DistributedNodeCommunication[] = [];

  for (let i = 0; i < 3; i++) {
    const transport = new WebSocketTransport({
      nodeId: `node-${i}`,
      nodeName: `Node ${i}`,
      host: 'localhost',
      port: 8080 + i,
      options: { serverMode: true },
    });

    const node = new DistributedNodeCommunication({
      nodeId: `node-${i}`,
      nodeName: `Node ${i}`,
      nodeType: i === 0 ? 'ada.sea' : i === 1 ? 'ada.marina' : 'ada.finance',
      mode: 'distributed',
      transport,
      registry: {
        url: 'http://localhost:3000',
      },
      capabilities: [`capability-${i}`],
    });

    node.onMessage('ping', async () => {
      return { pong: true, from: `node-${i}` };
    });

    await node.start();
    nodes.push(node);

    console.log(`Node ${i} registered with registry`);
  }

  // Wait for all nodes to register
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Get all registered nodes from registry
  const allNodes = registry.getAllNodes();
  console.log('\nRegistered nodes:', allNodes.map(n => ({ id: n.id, name: n.name, type: n.type })));

  // Node 0 sends message to Node 1 (automatic discovery via registry)
  const response = await nodes[0].request('node-1', 'ping', {});
  console.log('\nPing response from node-1:', response);

  // Get statistics
  const stats = nodes[0].getDistributedStats();
  console.log('\nNode 0 stats:', stats);

  // Cleanup
  for (const node of nodes) {
    await node.stop();
  }
  await registry.stop();
}

/**
 * Example 4: Hybrid Mode (Local + Distributed)
 *
 * This example shows hybrid mode where nodes can communicate
 * locally (in-process) and remotely (network) simultaneously.
 */
async function example4_HybridMode() {
  console.log('\n=== Example 4: Hybrid Mode ===\n');

  // Create local nodes (same process)
  const localNodeA = new DistributedNodeCommunication({
    nodeId: 'local-a',
    nodeName: 'Local A',
    nodeType: 'ada.sea',
    mode: 'local', // Local only
  });

  const localNodeB = new DistributedNodeCommunication({
    nodeId: 'local-b',
    nodeName: 'Local B',
    nodeType: 'ada.marina',
    mode: 'local', // Local only
  });

  await localNodeA.start();
  await localNodeB.start();

  // Connect locally
  localNodeA.connectTo('local-b');
  localNodeB.connectTo('local-a');

  // Create hybrid node (can communicate both locally and remotely)
  const transport = new WebSocketTransport({
    nodeId: 'hybrid-node',
    nodeName: 'Hybrid Node',
    host: 'localhost',
    port: 8080,
    options: { serverMode: true },
  });

  const hybridNode = new DistributedNodeCommunication({
    nodeId: 'hybrid-node',
    nodeName: 'Hybrid Node',
    nodeType: 'ada.chatbot',
    mode: 'hybrid', // Both local and distributed
    transport,
  });

  hybridNode.onMessage('request', async (message) => {
    return { data: 'Response from hybrid node' };
  });

  await hybridNode.start();

  // Connect hybrid node locally
  hybridNode.connectTo('local-a');
  localNodeA.connectTo('hybrid-node');

  // Local communication (fast, in-memory)
  console.log('Sending local message...');
  await hybridNode.send('local-a', 'notification', 'local-test', {
    message: 'This is a local message',
  });

  // Remote communication would work too if another remote node was available
  console.log('Hybrid node can communicate both locally and remotely');

  // Stats
  const stats = hybridNode.getDistributedStats();
  console.log('\nHybrid node stats:', {
    mode: stats.mode,
    localNodes: stats.localNodes,
    remoteNodes: stats.remoteNodes,
  });

  // Cleanup
  await localNodeA.stop();
  await localNodeB.stop();
  await hybridNode.stop();
}

/**
 * Example 5: Multi-node cluster with load balancing
 */
async function example5_LoadBalancing() {
  console.log('\n=== Example 5: Load Balancing ===\n');

  // Start registry
  const registry = new NodeRegistry({ port: 3000 });
  await registry.start();

  // Create multiple worker nodes
  const workers: DistributedNodeCommunication[] = [];

  for (let i = 0; i < 3; i++) {
    const transport = new WebSocketTransport({
      nodeId: `worker-${i}`,
      nodeName: `Worker ${i}`,
      host: 'localhost',
      port: 8100 + i,
      options: { serverMode: true },
    });

    const worker = new DistributedNodeCommunication({
      nodeId: `worker-${i}`,
      nodeName: `Worker ${i}`,
      nodeType: 'ada.worker',
      mode: 'distributed',
      transport,
      registry: { url: 'http://localhost:3000' },
      loadFn: () => Math.random() * 100, // Simulate varying load
    });

    worker.onMessage('work', async (message) => {
      console.log(`Worker ${i} processing: ${message.payload.job}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
      return { status: 'completed', worker: `worker-${i}` };
    });

    await worker.start();
    workers.push(worker);
  }

  // Wait for registration
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check load of all workers
  const allWorkers = registry.getNodesByType('ada.worker');
  console.log('\nWorkers and their loads:');
  allWorkers.forEach(w => {
    console.log(`  ${w.name}: Load ${w.load?.toFixed(1)}%`);
  });

  // Send work to least loaded worker
  const sortedByLoad = allWorkers.sort((a, b) => (a.load || 0) - (b.load || 0));
  const leastLoaded = sortedByLoad[0];

  console.log(`\nSending work to least loaded worker: ${leastLoaded.name}`);

  const result = await workers[0].request(leastLoaded.id, 'work', {
    job: 'Process large dataset',
  });

  console.log('Result:', result);

  // Cleanup
  for (const worker of workers) {
    await worker.stop();
  }
  await registry.stop();
}

// Run examples
async function main() {
  try {
    // Run one example at a time (comment/uncomment as needed)

    await example1_WebSocketCommunication();

    // await example2_RedisCommunication();  // Requires Redis

    // await example3_ServiceDiscovery();

    // await example4_HybridMode();

    // await example5_LoadBalancing();

    console.log('\n✅ Demo completed successfully!\n');
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  example1_WebSocketCommunication,
  example2_RedisCommunication,
  example3_ServiceDiscovery,
  example4_HybridMode,
  example5_LoadBalancing,
};
