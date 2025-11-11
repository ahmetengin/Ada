/**
 * Test script for Ada Multi-Agent Observability System
 *
 * This script:
 * 1. Sends various test events to the observability server
 * 2. Tests different event types
 * 3. Simulates agent lifecycle and interactions
 *
 * Usage:
 *   bun run test_observability.ts
 *   or
 *   tsx test_observability.ts
 */

import { EventEmitter } from './hooks/EventEmitter';

const SESSION_ID = `test-session-${Date.now()}`;
const emitter = new EventEmitter('http://localhost:8765');

console.log('🧪 Testing Ada Observability System');
console.log('📍 Session ID:', SESSION_ID);
console.log('');

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testObservability() {
  try {
    // Test 1: Agent created events
    console.log('1️⃣  Testing agent created events...');

    const agents = [
      { id: 'test-sea-001', type: 'sea', name: 'SeaNode Test 1' },
      { id: 'test-marina-001', type: 'marina', name: 'MarinaNode Test 1' },
      { id: 'test-travel-001', type: 'travel', name: 'TravelNode Test 1' },
    ];

    for (const agent of agents) {
      const success = await emitter.sendAgentEvent(
        agent.id,
        agent.type,
        SESSION_ID,
        'agent_created',
        { name: agent.name },
        `Test agent ${agent.type} created`
      );
      console.log(`   ${success ? '✅' : '❌'} ${agent.name}`);
      await sleep(100);
    }

    await sleep(500);

    // Test 2: Agent started events
    console.log('\n2️⃣  Testing agent started events...');

    for (const agent of agents) {
      const success = await emitter.sendAgentEvent(
        agent.id,
        agent.type,
        SESSION_ID,
        'agent_started',
        { name: agent.name },
        `Test agent ${agent.type} started`
      );
      console.log(`   ${success ? '✅' : '❌'} ${agent.name} started`);
      await sleep(100);
    }

    await sleep(500);

    // Test 3: Communication events
    console.log('\n3️⃣  Testing communication events...');

    const success1 = await emitter.sendCommunicationEvent(
      agents[0].id,
      agents[1].id,
      'msg-001',
      'request',
      SESSION_ID,
      'Request berth availability'
    );
    console.log(`   ${success1 ? '✅' : '❌'} Message: SeaNode → MarinaNode`);
    await sleep(200);

    const success2 = await emitter.sendCommunicationEvent(
      agents[1].id,
      agents[0].id,
      'msg-002',
      'response',
      SESSION_ID,
      'Berth availability response'
    );
    console.log(`   ${success2 ? '✅' : '❌'} Response: MarinaNode → SeaNode`);
    await sleep(200);

    const success3 = await emitter.sendCommunicationEvent(
      agents[0].id,
      agents[2].id,
      'msg-003',
      'notification',
      SESSION_ID,
      'Voyage plan update'
    );
    console.log(`   ${success3 ? '✅' : '❌'} Notification: SeaNode → TravelNode`);

    await sleep(500);

    // Test 4: Task execution events
    console.log('\n4️⃣  Testing task execution events...');

    const task = 'plan-voyage';

    let success = await emitter.sendTaskEvent(
      agents[0].id,
      agents[0].type,
      SESSION_ID,
      task,
      'task_started',
      JSON.stringify({ destination: 'Bodrum', distance: 150 }),
      undefined,
      undefined,
      { priority: 'high' }
    );
    console.log(`   ${success ? '✅' : '❌'} Task started: ${task}`);
    await sleep(1000);

    success = await emitter.sendTaskEvent(
      agents[0].id,
      agents[0].type,
      SESSION_ID,
      task,
      'task_completed',
      JSON.stringify({ destination: 'Bodrum', distance: 150 }),
      JSON.stringify({ route: 'optimized', eta: '4 hours' }),
      undefined,
      { priority: 'high' }
    );
    console.log(`   ${success ? '✅' : '❌'} Task completed: ${task}`);

    await sleep(500);

    // Test 5: Memory events
    console.log('\n5️⃣  Testing memory events...');

    success = await emitter.sendMemoryEvent(
      agents[0].id,
      agents[0].type,
      SESSION_ID,
      'memory_stored',
      'data',
      { importance: 9, tags: ['voyage', 'planning'] }
    );
    console.log(`   ${success ? '✅' : '❌'} Important memory stored`);

    await sleep(500);

    // Test 6: Replication events
    console.log('\n6️⃣  Testing replication events...');

    const cloneId = 'test-sea-002-clone';
    success = await emitter.sendReplicationEvent(
      agents[0].id,
      cloneId,
      agents[0].type,
      SESSION_ID,
      1,
      { purpose: 'load-balancing' }
    );
    console.log(`   ${success ? '✅' : '❌'} Clone created: generation 1`);

    await sleep(500);

    // Test 7: Performance events
    console.log('\n7️⃣  Testing performance events...');

    success = await emitter.sendPerformanceEvent(
      agents[0].id,
      agents[0].type,
      SESSION_ID,
      'load_high',
      85,
      { threshold: 80 }
    );
    console.log(`   ${success ? '✅' : '❌'} High load detected: 85%`);

    await sleep(1000);

    success = await emitter.sendPerformanceEvent(
      agents[0].id,
      agents[0].type,
      SESSION_ID,
      'load_normal',
      45,
      { threshold: 80 }
    );
    console.log(`   ${success ? '✅' : '❌'} Load returned to normal: 45%`);

    await sleep(500);

    // Test 8: Agent stopped events
    console.log('\n8️⃣  Testing agent stopped events...');

    for (const agent of agents) {
      const success = await emitter.sendAgentEvent(
        agent.id,
        agent.type,
        SESSION_ID,
        'agent_stopped',
        { name: agent.name },
        `Test agent ${agent.type} stopped`
      );
      console.log(`   ${success ? '✅' : '❌'} ${agent.name} stopped`);
      await sleep(100);
    }

    // Test 9: Session stopped event
    console.log('\n9️⃣  Testing session stopped event...');

    success = await emitter.sendEvent({
      source_app: 'ada-test',
      session_id: SESSION_ID,
      event_type: 'session_stopped',
      description: 'Test session completed'
    });
    console.log(`   ${success ? '✅' : '❌'} Session stopped`);

    console.log('\n✅ All tests completed!');
    console.log('\n📊 Check the dashboard at http://localhost:5173');
    console.log(`🔍 Filter by session: ${SESSION_ID}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
console.log('⚠️  Make sure the observability server is running on http://localhost:8765');
console.log('   Start it with: cd observability/server && bun run dev');
console.log('');

setTimeout(() => {
  testObservability();
}, 2000);
