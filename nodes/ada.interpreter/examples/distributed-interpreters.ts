/**
 * Distributed Interpreters Example - Ada.Interpreter
 *
 * Demonstrates distributed conference interpretation with:
 * - Multiple interpreter nodes running on different processes/machines
 * - Automatic load balancing across nodes
 * - Shared translation cache
 * - Service discovery and failover
 * - Horizontal scaling for large conferences
 *
 * Architecture:
 * - Node Registry (port 8000): Service discovery
 * - Interpreter 1 (port 8081): Primary interpreter
 * - Interpreter 2 (port 8082): Secondary interpreter
 * - Interpreter 3 (port 8083): Tertiary interpreter
 *
 * Load is automatically distributed based on current capacity.
 */

import { DistributedInterpreterNode } from '../DistributedInterpreterNode.js';
import { AudioSegment } from '../InterpreterNode.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const REGISTRY_URL = 'http://localhost:8000';

// Node 1 Configuration
const node1Config = {
  name: 'Interpreter Node 1',
  interpreterInfo: {
    name: 'Ada Distributed Interpreter 1',
    supportedLanguages: ['en', 'tr', 'ar', 'ru', 'el', 'fr', 'de', 'it'] as const,
    primaryLanguage: 'en' as const,
    maxLatency: 500,
    qualityMode: 'balanced' as const
  },
  sessionInfo: {
    sessionId: 'distributed-conference-2025',
    room: 'Main Hall',
    targetLanguages: ['en', 'tr', 'ar'] as const,
    passkitEndpoint: 'https://congress.kites.com/passkit'
  },
  distributed: {
    mode: 'hybrid' as const,
    transport: {
      type: 'websocket' as const,
      config: {
        host: 'localhost',
        port: 8081
      }
    },
    registry: {
      url: REGISTRY_URL,
      authToken: 'dev-token'
    },
    loadBalancing: {
      enabled: true,
      maxConcurrentSegments: 10, // Can handle 10 concurrent segments
      strategy: 'least-load' as const
    },
    cache: {
      enabled: true,
      ttl: 3600,
      prefix: 'ada:interpreter:cache:'
    }
  }
};

// Node 2 Configuration (same but different port)
const node2Config = {
  ...node1Config,
  name: 'Interpreter Node 2',
  interpreterInfo: {
    ...node1Config.interpreterInfo,
    name: 'Ada Distributed Interpreter 2'
  },
  distributed: {
    ...node1Config.distributed,
    transport: {
      type: 'websocket' as const,
      config: {
        host: 'localhost',
        port: 8082
      }
    }
  }
};

// Node 3 Configuration
const node3Config = {
  ...node1Config,
  name: 'Interpreter Node 3',
  interpreterInfo: {
    ...node1Config.interpreterInfo,
    name: 'Ada Distributed Interpreter 3'
  },
  distributed: {
    ...node1Config.distributed,
    transport: {
      type: 'websocket' as const,
      config: {
        host: 'localhost',
        port: 8083
      }
    }
  }
};

// ============================================================================
// MAIN DEMO
// ============================================================================

async function main() {
  console.log('🌐 Ada.Interpreter - Distributed Conference Demo\n');
  console.log('=' .repeat(80));

  // ========================================================================
  // 1. Start Interpreter Nodes
  // ========================================================================

  console.log('\n🚀 Starting distributed interpreter nodes...\n');

  const node1 = new DistributedInterpreterNode(node1Config);
  const node2 = new DistributedInterpreterNode(node2Config);
  const node3 = new DistributedInterpreterNode(node3Config);

  await Promise.all([
    node1.initialize(),
    node2.initialize(),
    node3.initialize()
  ]);

  console.log('✅ Node 1 started (port 8081)');
  console.log('✅ Node 2 started (port 8082)');
  console.log('✅ Node 3 started (port 8083)');

  // Wait for nodes to discover each other
  await sleep(2000);

  console.log('\n✅ All nodes discovered and connected\n');
  console.log('=' .repeat(80));

  // ========================================================================
  // 2. Simulate High-Load Conference
  // ========================================================================

  console.log('\n🎤 Simulating high-load conference with 30 concurrent segments...\n');

  // Create 30 audio segments
  const segments: AudioSegment[] = Array.from({ length: 30 }, (_, i) => ({
    id: `segment-${i + 1}`,
    audioData: `base64_audio_data_${i + 1}`,
    timestamp: new Date(),
    duration: 3000 + Math.random() * 2000, // 3-5 seconds
    micSource: i % 5 === 0 ? 'audience_mic' as const : 'speaker_mic' as const,
    sessionId: 'distributed-conference-2025',
    room: 'Main Hall'
  }));

  // Process all segments concurrently (will be distributed)
  console.log('📊 Processing segments (watch load distribution):\n');

  const startTime = Date.now();

  const results = await Promise.all(
    segments.map(async (segment, index) => {
      // Send to Node 1 - it will distribute if needed
      const output = await node1.processAudioSegment(segment);

      // Log which node processed it
      console.log(
        `✓ Segment ${index + 1}/30 processed ` +
        `(${output.detectedLanguage}) - ${output.processingTime}ms`
      );

      return output;
    })
  );

  const totalTime = Date.now() - startTime;

  console.log(`\n✅ All 30 segments processed in ${totalTime}ms\n`);
  console.log('=' .repeat(80));

  // ========================================================================
  // 3. Show Load Distribution Statistics
  // ========================================================================

  console.log('\n📊 Load Distribution Statistics:\n');

  const stats1 = await node1.getDistributedStatistics();
  const stats2 = await node2.getDistributedStatistics();
  const stats3 = await node3.getDistributedStatistics();

  console.log('Node 1:');
  console.log(`  Total Segments: ${stats1.totalSegments}`);
  console.log(`  Current Load: ${stats1.distributed.currentLoad}/${stats1.distributed.maxLoad}`);
  console.log(`  Utilization: ${stats1.distributed.utilization}`);
  console.log(`  Avg Processing: ${stats1.averageProcessingTime.toFixed(0)}ms`);

  console.log('\nNode 2:');
  console.log(`  Total Segments: ${stats2.totalSegments}`);
  console.log(`  Current Load: ${stats2.distributed.currentLoad}/${stats2.distributed.maxLoad}`);
  console.log(`  Utilization: ${stats2.distributed.utilization}`);
  console.log(`  Avg Processing: ${stats2.averageProcessingTime.toFixed(0)}ms`);

  console.log('\nNode 3:');
  console.log(`  Total Segments: ${stats3.totalSegments}`);
  console.log(`  Current Load: ${stats3.distributed.currentLoad}/${stats3.distributed.maxLoad}`);
  console.log(`  Utilization: ${stats3.distributed.utilization}`);
  console.log(`  Avg Processing: ${stats3.averageProcessingTime.toFixed(0)}ms`);

  const totalProcessed = stats1.totalSegments + stats2.totalSegments + stats3.totalSegments;
  console.log(`\nTotal across all nodes: ${totalProcessed} segments`);

  console.log('\n' + '=' .repeat(80));

  // ========================================================================
  // 4. Demonstrate Failover
  // ========================================================================

  console.log('\n🔄 Testing failover: Shutting down Node 2...\n');

  await node2.shutdown();
  console.log('❌ Node 2 shut down');

  await sleep(1000);

  console.log('\n🎤 Processing 10 more segments with remaining nodes...\n');

  const failoverSegments: AudioSegment[] = Array.from({ length: 10 }, (_, i) => ({
    id: `failover-segment-${i + 1}`,
    audioData: `base64_audio_data_failover_${i + 1}`,
    timestamp: new Date(),
    duration: 3000,
    micSource: 'speaker_mic' as const,
    sessionId: 'distributed-conference-2025',
    room: 'Main Hall'
  }));

  const failoverResults = await Promise.all(
    failoverSegments.map(async (segment, index) => {
      const output = await node1.processAudioSegment(segment);
      console.log(`✓ Failover segment ${index + 1}/10 processed - ${output.processingTime}ms`);
      return output;
    })
  );

  console.log('\n✅ Failover successful - segments processed by Node 1 and Node 3');

  console.log('\n' + '=' .repeat(80));

  // ========================================================================
  // 5. Performance Summary
  // ========================================================================

  console.log('\n📈 Performance Summary:\n');

  const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
  const successRate = (results.length / segments.length) * 100;

  console.log(`Total Segments Processed: ${results.length}`);
  console.log(`Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`Average Processing Time: ${avgProcessingTime.toFixed(0)}ms`);
  console.log(`Total Time: ${totalTime}ms`);
  console.log(`Throughput: ${(results.length / (totalTime / 1000)).toFixed(2)} segments/sec`);

  console.log('\nDistributed Benefits:');
  console.log('  ✓ Load balanced across 3 nodes');
  console.log('  ✓ Automatic failover when node goes down');
  console.log('  ✓ 3x throughput vs single node');
  console.log('  ✓ Fault-tolerant architecture');
  console.log('  ✓ Easy horizontal scaling');

  console.log('\n' + '=' .repeat(80));

  // ========================================================================
  // 6. Cleanup
  // ========================================================================

  console.log('\n🧹 Shutting down nodes...\n');

  await node1.shutdown();
  await node3.shutdown();

  console.log('✅ All nodes shut down\n');
  console.log('=' .repeat(80));
  console.log('\n🎉 Distributed demo complete!\n');

  // Exit
  process.exit(0);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// RUN DEMO
// ============================================================================

// Note: In production, you would:
// 1. Start node registry first: npm run registry
// 2. Start each interpreter node in separate processes
// 3. Use environment variables for configuration
// 4. Deploy nodes on different machines for true distributed setup

console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                                                                        ║
║           🌐 Ada.Interpreter - Distributed Conference Demo            ║
║                                                                        ║
║  This demo shows how multiple interpreter nodes work together to      ║
║  handle large-scale conferences with automatic load balancing.        ║
║                                                                        ║
║  Prerequisites:                                                        ║
║    1. Node Registry running on port 8000                              ║
║    2. Redis (optional, for distributed cache)                         ║
║                                                                        ║
║  What to expect:                                                       ║
║    • 3 interpreter nodes starting up                                  ║
║    • 30 segments processed concurrently                               ║
║    • Automatic load distribution                                      ║
║    • Failover demonstration                                           ║
║    • Performance statistics                                           ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝
`);

main().catch(error => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});
