/**
 * TabPFN-2.5 Integration Example
 * Demonstrates how TabPFN enhances SEAL v2 for few-shot learning
 */

import { ExperienceLearningPipeline, MaritimeExperience } from '../ExperienceLearningPipeline.js';
import { SkillTree } from '../../skills/SkillTree.js';
import { MaritimeKnowledgeBase } from '../../knowledge/MaritimeKnowledgeBase.js';

// ============================================================================
// EXAMPLE: Equipment Failure Prediction (Few-shot learning)
// ============================================================================

/**
 * Scenario: Ship's engine has limited failure history (only 5 examples)
 * Traditional ML would struggle, but TabPFN excels with few samples
 */
async function exampleEquipmentFailurePrediction() {
  console.log('='.repeat(80));
  console.log('Example 1: Equipment Failure Prediction (Few-shot)');
  console.log('='.repeat(80));

  // Initialize pipeline
  const skillTree = new SkillTree();
  const knowledgeBase = new MaritimeKnowledgeBase();
  const pipeline = new ExperienceLearningPipeline(skillTree, knowledgeBase);

  // Listen to events
  pipeline.on('experience:processing_strategy', (data) => {
    console.log(`\n📊 Processing Strategy: ${data.strategy.toUpperCase()}`);
    console.log(`   Experience Type: ${data.type}`);
    console.log(`   Sample Count: ${data.sample_count}`);
  });

  pipeline.on('tabpfn:prediction', (data) => {
    console.log(`\n🎯 TabPFN Prediction Made`);
    console.log(`   Confidence: ${(data.confidence * 100).toFixed(1)}%`);
    console.log(`   Training Samples: ${data.training_samples}`);
  });

  // Create few equipment failure examples (only 5!)
  const failureExamples: MaritimeExperience[] = [
    {
      id: 'failure_1',
      type: 'maintenance',
      timestamp: new Date('2025-01-01'),
      context: {
        vessel_state: {
          wind: { speed: 15, direction: 180 },
          depth: 50,
          speed: 8,
          heading: 90,
          position: { latitude: 0, longitude: 0 },
          sea_state: 0,
        },
        weather: {
          current: null,
          forecast: null,
        },
        voyage: {
          destination: undefined,
          waypoints: [],
          eta: undefined,
        },
        crew: {
          on_watch: 4,
          total: 12,
          experience_level: 'competent' as const,
        },
        time: { daylight: true, local: new Date() },
      },
      action: 'Engine operating normally',
      outcome: {
        description: 'No failure',
      },
      success: true,
      performance_score: 0.95,
      data: {
        engine_hours: 500,
        temperature: 85,
        vibration: 2.1,
        oil_pressure: 45,
      },
      tags: ['engine', 'normal'],
    },
    {
      id: 'failure_2',
      type: 'maintenance',
      timestamp: new Date('2025-02-01'),
      context: {
        vessel_state: {
          wind: { speed: 20, direction: 200 },
          depth: 60,
          speed: 7,
          heading: 95,
          position: { latitude: 0, longitude: 0 },
          sea_state: 0,
        },
        weather: {
          current: null,
          forecast: null,
        },
        voyage: {
          destination: undefined,
          waypoints: [],
          eta: undefined,
        },
        crew: {
          on_watch: 4,
          total: 12,
          experience_level: 'competent' as const,
        },
        time: { daylight: true, local: new Date() },
      },
      action: 'Engine overheating detected',
      outcome: {
        description: 'Failure: Overheating',
        issues: ['Temperature spike', 'Coolant leak'],
      },
      success: false,
      performance_score: 0.2,
      data: {
        engine_hours: 1200,
        temperature: 105,
        vibration: 4.5,
        oil_pressure: 35,
      },
      tags: ['engine', 'failure', 'overheating'],
    },
    {
      id: 'failure_3',
      type: 'maintenance',
      timestamp: new Date('2025-03-01'),
      context: {
        vessel_state: {
          wind: { speed: 12, direction: 150 },
          depth: 45,
          speed: 9,
          heading: 85,
          position: { latitude: 0, longitude: 0 },
          sea_state: 0,
        },
        weather: {
          current: null,
          forecast: null,
        },
        voyage: {
          destination: undefined,
          waypoints: [],
          eta: undefined,
        },
        crew: {
          on_watch: 4,
          total: 12,
          experience_level: 'competent' as const,
        },
        time: { daylight: false, local: new Date() },
      },
      action: 'Engine operating normally',
      outcome: {
        description: 'No failure',
      },
      success: true,
      performance_score: 0.92,
      data: {
        engine_hours: 800,
        temperature: 82,
        vibration: 2.3,
        oil_pressure: 48,
      },
      tags: ['engine', 'normal'],
    },
    {
      id: 'failure_4',
      type: 'maintenance',
      timestamp: new Date('2025-04-01'),
      context: {
        vessel_state: {
          wind: { speed: 25, direction: 220 },
          depth: 55,
          speed: 6,
          heading: 100,
          position: { latitude: 0, longitude: 0 },
          sea_state: 0,
        },
        weather: {
          current: null,
          forecast: null,
        },
        voyage: {
          destination: undefined,
          waypoints: [],
          eta: undefined,
        },
        crew: {
          on_watch: 4,
          total: 12,
          experience_level: 'competent' as const,
        },
        time: { daylight: true, local: new Date() },
      },
      action: 'Abnormal vibration detected',
      outcome: {
        description: 'Failure: Bearing damage',
        issues: ['High vibration', 'Metal particles in oil'],
      },
      success: false,
      performance_score: 0.15,
      data: {
        engine_hours: 2500,
        temperature: 95,
        vibration: 5.8,
        oil_pressure: 30,
      },
      tags: ['engine', 'failure', 'vibration'],
    },
    {
      id: 'failure_5',
      type: 'maintenance',
      timestamp: new Date('2025-05-01'),
      context: {
        vessel_state: {
          wind: { speed: 10, direction: 160 },
          depth: 48,
          speed: 8.5,
          heading: 92,
          position: { latitude: 0, longitude: 0 },
          sea_state: 0,
        },
        weather: {
          current: null,
          forecast: null,
        },
        voyage: {
          destination: undefined,
          waypoints: [],
          eta: undefined,
        },
        crew: {
          on_watch: 4,
          total: 12,
          experience_level: 'competent' as const,
        },
        time: { daylight: true, local: new Date() },
      },
      action: 'Engine operating normally',
      outcome: {
        description: 'No failure',
      },
      success: true,
      performance_score: 0.93,
      data: {
        engine_hours: 600,
        temperature: 83,
        vibration: 2.0,
        oil_pressure: 46,
      },
      tags: ['engine', 'normal'],
    },
  ];

  // Record experiences
  console.log(`\n📝 Recording ${failureExamples.length} equipment failure examples...`);
  for (const exp of failureExamples) {
    await pipeline.recordExperience(exp);
  }

  // Get recommendation
  const recommendation = pipeline.getRecommendedStrategy('maintenance');
  console.log(`\n💡 Recommended Strategy:`);
  console.log(`   Strategy: ${recommendation.strategy.toUpperCase()}`);
  console.log(`   Reason: ${recommendation.reason}`);
  console.log(`   Confidence Threshold: ${(recommendation.confidence_threshold * 100).toFixed(1)}%`);

  // Test prediction on new equipment data
  const newEquipment: MaritimeExperience = {
    id: 'failure_test',
    type: 'maintenance',
    timestamp: new Date(),
    context: {
      vessel_state: {
        wind: { speed: 18, direction: 190 },
        depth: 52,
        speed: 7.5,
        heading: 93,
        position: { latitude: 0, longitude: 0 },
        sea_state: 0,
      },
      weather: {
        current: null,
        forecast: null,
      },
      voyage: {
        destination: undefined,
        waypoints: [],
        eta: undefined,
      },
      crew: {
        on_watch: 4,
        total: 12,
        experience_level: 'competent' as const,
      },
      time: { daylight: true, local: new Date() },
    },
    action: 'Predicting equipment status',
    outcome: {
      description: 'Unknown',
    },
    success: true,
    performance_score: 0.5,
    data: {
      engine_hours: 2200, // High hours
      temperature: 98, // High temp
      vibration: 4.2, // High vibration
      oil_pressure: 32, // Low pressure
    },
    tags: ['engine', 'prediction'],
  };

  console.log(`\n🔮 Predicting equipment failure for new data...`);
  console.log(`   Engine Hours: ${newEquipment.data.engine_hours}`);
  console.log(`   Temperature: ${newEquipment.data.temperature}°C`);
  console.log(`   Vibration: ${newEquipment.data.vibration}`);
  console.log(`   Oil Pressure: ${newEquipment.data.oil_pressure} psi`);

  try {
    const prediction = await pipeline.predictWithTabPFN(newEquipment);
    console.log(`\n✅ TabPFN Prediction:`);
    console.log(`   Prediction: ${prediction.prediction ? 'SUCCESS' : 'FAILURE'}`);
    console.log(`   Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
    console.log(`   Explanation: ${prediction.explanation}`);

    if (prediction.probabilities) {
      console.log(`   Probabilities:`);
      for (const [cls, prob] of Object.entries(prediction.probabilities)) {
        console.log(`      ${cls}: ${(prob * 100).toFixed(1)}%`);
      }
    }
  } catch (error) {
    console.error(`\n❌ Prediction failed: ${(error as Error).message}`);
  }

  // Get statistics
  const stats = pipeline.getCombinedStatistics();
  console.log(`\n📈 Pipeline Statistics:`);
  console.log(`   Total Experiences: ${stats.experiences.total_experiences}`);
  console.log(`   TabPFN Training Samples: ${stats.tabpfn.training_samples}`);
  console.log(`   Processing Strategy Distribution:`);
  console.log(`      TabPFN: ${stats.processing_strategy.tabpfn_count}`);
  console.log(`      Hybrid: ${stats.processing_strategy.hybrid_count}`);
  console.log(`      SEAL: ${stats.processing_strategy.seal_count}`);
}

// ============================================================================
// EXAMPLE: Fraud Detection (Very few examples)
// ============================================================================

async function exampleFraudDetection() {
  console.log('\n\n');
  console.log('='.repeat(80));
  console.log('Example 2: Fraud Detection (Extreme Few-shot)');
  console.log('='.repeat(80));

  const skillTree = new SkillTree();
  const knowledgeBase = new MaritimeKnowledgeBase();
  const pipeline = new ExperienceLearningPipeline(skillTree, knowledgeBase);

  // Only 3 fraud examples!
  const fraudExamples: MaritimeExperience[] = [
    {
      id: 'fraud_1',
      type: 'communication',
      timestamp: new Date('2025-01-15'),
      context: {
        vessel_state: {
          wind: { speed: 10, direction: 180 },
          depth: 50,
          speed: 8,
          heading: 90,
          position: { latitude: 0, longitude: 0 },
          sea_state: 0,
        },
        weather: {
          current: null,
          forecast: null,
        },
        voyage: {
          destination: undefined,
          waypoints: [],
          eta: undefined,
        },
        crew: {
          on_watch: 4,
          total: 12,
          experience_level: 'competent' as const,
        },
        time: { daylight: true, local: new Date() },
      },
      action: 'Payment transaction',
      outcome: { description: 'Legitimate transaction' },
      success: true,
      performance_score: 0.98,
      data: {
        amount: 1500,
        location: 'Istanbul',
        time_of_day: 14,
        merchant_type: 'marine_supply',
        distance_from_home: 0,
      },
      tags: ['transaction', 'legitimate'],
    },
    {
      id: 'fraud_2',
      type: 'communication',
      timestamp: new Date('2025-02-10'),
      context: {
        vessel_state: {
          wind: { speed: 15, direction: 200 },
          depth: 60,
          speed: 7,
          heading: 95,
          position: { latitude: 0, longitude: 0 },
          sea_state: 0,
        },
        weather: {
          current: null,
          forecast: null,
        },
        voyage: {
          destination: undefined,
          waypoints: [],
          eta: undefined,
        },
        crew: {
          on_watch: 4,
          total: 12,
          experience_level: 'competent' as const,
        },
        time: { daylight: false, local: new Date() },
      },
      action: 'Suspicious transaction detected',
      outcome: {
        description: 'Fraud: Unusual location and amount',
        issues: ['Foreign country', 'Large amount', 'Midnight'],
      },
      success: false,
      performance_score: 0.05,
      data: {
        amount: 15000,
        location: 'Unknown',
        time_of_day: 2,
        merchant_type: 'electronics',
        distance_from_home: 5000,
      },
      tags: ['transaction', 'fraud'],
    },
    {
      id: 'fraud_3',
      type: 'communication',
      timestamp: new Date('2025-03-05'),
      context: {
        vessel_state: {
          wind: { speed: 12, direction: 170 },
          depth: 55,
          speed: 8.5,
          heading: 88,
          position: { latitude: 0, longitude: 0 },
          sea_state: 0,
        },
        weather: {
          current: null,
          forecast: null,
        },
        voyage: {
          destination: undefined,
          waypoints: [],
          eta: undefined,
        },
        crew: {
          on_watch: 4,
          total: 12,
          experience_level: 'competent' as const,
        },
        time: { daylight: true, local: new Date() },
      },
      action: 'Payment transaction',
      outcome: { description: 'Legitimate transaction' },
      success: true,
      performance_score: 0.96,
      data: {
        amount: 800,
        location: 'Izmir',
        time_of_day: 11,
        merchant_type: 'fuel',
        distance_from_home: 150,
      },
      tags: ['transaction', 'legitimate'],
    },
  ];

  console.log(`\n📝 Recording ${fraudExamples.length} fraud examples (very limited data)...`);
  for (const exp of fraudExamples) {
    await pipeline.recordExperience(exp);
  }

  // Test suspicious transaction
  const suspiciousTransaction: MaritimeExperience = {
    id: 'fraud_test',
    type: 'communication',
    timestamp: new Date(),
    context: {
      vessel_state: {
        wind: { speed: 14, direction: 185 },
        depth: 52,
        speed: 7.8,
        heading: 92,
        position: { latitude: 0, longitude: 0 },
        sea_state: 0,
      },
      weather: {
        current: null,
        forecast: null,
      },
      voyage: {
        destination: undefined,
        waypoints: [],
        eta: undefined,
      },
      crew: {
        on_watch: 4,
        total: 12,
        experience_level: 'competent' as const,
      },
      time: { daylight: false, local: new Date() },
    },
    action: 'Analyzing transaction',
    outcome: { description: 'Unknown' },
    success: true,
    performance_score: 0.5,
    data: {
      amount: 12000, // Large amount
      location: 'Unknown', // Suspicious location
      time_of_day: 3, // Late night
      merchant_type: 'luxury_goods', // Unusual merchant
      distance_from_home: 4500, // Very far
    },
    tags: ['transaction', 'analysis'],
  };

  console.log(`\n🔮 Analyzing suspicious transaction...`);
  console.log(`   Amount: $${suspiciousTransaction.data.amount}`);
  console.log(`   Location: ${suspiciousTransaction.data.location}`);
  console.log(`   Time: ${suspiciousTransaction.data.time_of_day}:00 (${suspiciousTransaction.context.time.daylight ? 'day' : 'night'})`);
  console.log(`   Distance: ${suspiciousTransaction.data.distance_from_home} km`);

  try {
    const prediction = await pipeline.predictWithTabPFN(suspiciousTransaction);
    console.log(`\n✅ Fraud Detection Result:`);
    console.log(`   Prediction: ${prediction.prediction ? 'LEGITIMATE' : 'FRAUD'}`);
    console.log(`   Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);

    if (!prediction.prediction && prediction.confidence > 0.7) {
      console.log(`   ⚠️  HIGH FRAUD RISK - Manual review recommended`);
    }
  } catch (error) {
    console.error(`\n❌ Fraud detection failed: ${(error as Error).message}`);
  }

  const stats = pipeline.getTabPFNStatistics();
  console.log(`\n📊 TabPFN Statistics:`);
  console.log(`   Training Samples: ${stats.training_samples} (extreme few-shot!)`);
  console.log(`   Predictions Cached: ${stats.predictions_cached}`);
  console.log(`   Few-shot Threshold: ${stats.few_shot_threshold}`);
}

// ============================================================================
// EXAMPLE: Hybrid Mode (Medium samples)
// ============================================================================

async function exampleHybridMode() {
  console.log('\n\n');
  console.log('='.repeat(80));
  console.log('Example 3: Hybrid TabPFN + SEAL (Medium samples)');
  console.log('='.repeat(80));

  const skillTree = new SkillTree();
  const knowledgeBase = new MaritimeKnowledgeBase();
  const pipeline = new ExperienceLearningPipeline(skillTree, knowledgeBase);

  // Create 15 examples (triggers hybrid mode at 10+)
  console.log('\n📝 Recording 15 navigation experiences (hybrid mode)...');

  for (let i = 0; i < 15; i++) {
    const success = Math.random() > 0.3; // 70% success rate
    const exp: MaritimeExperience = {
      id: `nav_${i}`,
      type: 'navigation',
      timestamp: new Date(Date.now() - i * 86400000),
      context: {
        vessel_state: {
          wind: { speed: 10 + Math.random() * 20, direction: Math.random() * 360 },
          depth: 30 + Math.random() * 50,
          speed: 5 + Math.random() * 5,
          heading: Math.random() * 360,
          position: { latitude: 0, longitude: 0 },
          sea_state: 0,
        },
        weather: {
          current: null,
          forecast: null,
        },
        voyage: {
          destination: undefined,
          waypoints: [],
          eta: undefined,
        },
        crew: {
          on_watch: 4,
          total: 12,
          experience_level: 'competent' as const,
        },
        time: { daylight: Math.random() > 0.5, local: new Date() },
      },
      action: `Navigation action ${i}`,
      outcome: {
        description: success ? 'Success' : 'Issue encountered',
        issues: success ? [] : ['Minor deviation'],
      },
      success,
      performance_score: success ? 0.7 + Math.random() * 0.3 : 0.3 + Math.random() * 0.4,
      data: {
        route_deviation: Math.random() * 100,
        fuel_efficiency: 0.8 + Math.random() * 0.2,
      },
      tags: ['navigation'],
    };
    await pipeline.recordExperience(exp);
  }

  // Get recommendation
  const recommendation = pipeline.getRecommendedStrategy('navigation');
  console.log(`\n💡 Recommended Strategy:`);
  console.log(`   Strategy: ${recommendation.strategy.toUpperCase()}`);
  console.log(`   Reason: ${recommendation.reason}`);

  // Test hybrid prediction
  const testNav: MaritimeExperience = {
    id: 'nav_test',
    type: 'navigation',
    timestamp: new Date(),
    context: {
      vessel_state: {
        wind: { speed: 22, direction: 180 },
        depth: 45,
        speed: 7,
        heading: 90,
        position: { latitude: 0, longitude: 0 },
        sea_state: 0,
      },
      weather: {
        current: null,
        forecast: null,
      },
      voyage: {
        destination: undefined,
        waypoints: [],
        eta: undefined,
      },
      crew: {
        on_watch: 4,
        total: 12,
        experience_level: 'competent' as const,
      },
      time: { daylight: true, local: new Date() },
    },
    action: 'Test navigation',
    outcome: { description: 'Unknown' },
    success: true,
    performance_score: 0.5,
    data: {
      route_deviation: 50,
      fuel_efficiency: 0.9,
    },
    tags: ['navigation', 'test'],
  };

  console.log(`\n🔮 Testing hybrid prediction...`);

  try {
    const hybrid = await pipeline.predictWithHybrid(testNav);
    console.log(`\n✅ Hybrid Prediction Result:`);
    console.log(`   TabPFN Prediction: ${hybrid.tabpfn_prediction.prediction}`);
    console.log(`   TabPFN Confidence: ${(hybrid.tabpfn_prediction.confidence * 100).toFixed(1)}%`);
    console.log(`   SEAL Edit Type: ${hybrid.seal_insight.edit_type}`);
    console.log(`   SEAL Rationale: ${hybrid.seal_insight.rationale}`);
    console.log(`   Combined Confidence: ${(hybrid.combined_confidence * 100).toFixed(1)}%`);
  } catch (error) {
    console.error(`\n❌ Hybrid prediction failed: ${(error as Error).message}`);
  }

  const stats = pipeline.getCombinedStatistics();
  console.log(`\n📈 Combined Statistics:`);
  console.log(`   Total Experiences: ${stats.experiences.total_experiences}`);
  console.log(`   SEAL Self-edits: ${stats.seal.total_self_edits}`);
  console.log(`   TabPFN Samples: ${stats.tabpfn.training_samples}`);
  console.log(`   Strategy Distribution:`);
  console.log(`      TabPFN-only: ${stats.processing_strategy.tabpfn_count}`);
  console.log(`      Hybrid: ${stats.processing_strategy.hybrid_count}`);
  console.log(`      SEAL-only: ${stats.processing_strategy.seal_count}`);
}

// ============================================================================
// RUN EXAMPLES
// ============================================================================

async function runAllExamples() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(15) + 'TabPFN-2.5 Integration Examples' + ' '.repeat(31) + '║');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('║' + '  Paper: arXiv:2511.08667v1 (Nov 11, 2025)' + ' '.repeat(37) + '║');
  console.log('║' + '  Integration: SEAL v2 + TabPFN-2.5' + ' '.repeat(44) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');

  try {
    await exampleEquipmentFailurePrediction();
    await exampleFraudDetection();
    await exampleHybridMode();

    console.log('\n\n');
    console.log('✅ All examples completed successfully!');
    console.log('\n🎯 Key Takeaways:');
    console.log('   • TabPFN excels with <10 samples (few-shot learning)');
    console.log('   • Hybrid mode (10-100 samples) combines speed + depth');
    console.log('   • SEAL takes over at >100 samples for optimal RL learning');
    console.log('   • Zero training required - predictions via forward pass only!');
    console.log('\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }
}

// Run examples if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}

export { exampleEquipmentFailurePrediction, exampleFraudDetection, exampleHybridMode, runAllExamples };
