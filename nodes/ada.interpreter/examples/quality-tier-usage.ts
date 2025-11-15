/**
 * Quality Tier Usage Examples
 * Demonstrates how to use different quality tiers based on customer budget
 */

import { InterpreterNode, AudioSegment } from '../InterpreterNode.js';
import { QualityTierManager } from '../services/providers/QualityTierConfig.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('💎 Ada.Interpreter - Quality Tier Examples\n');

  // Check API keys
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!OPENAI_API_KEY || !ANTHROPIC_API_KEY) {
    console.error('❌ Missing API keys. Set OPENAI_API_KEY and ANTHROPIC_API_KEY');
    process.exit(1);
  }

  // ========================================================================
  // SHOW PRICING COMPARISON
  // ========================================================================

  console.log('📊 Pricing Comparison:\n');
  console.log(QualityTierManager.getComparisonTable());

  console.log('\n💰 Cost Examples:');
  console.log('─'.repeat(80));

  const examples = QualityTierManager.getPricingExamples();
  examples.forEach(ex => {
    console.log(`\n${ex.scenario} (${ex.duration} min):`);
    console.log(`  Premium:  $${ex.premium.toFixed(2)}`);
    console.log(`  Standard: $${ex.standard.toFixed(2)}`);
    console.log(`  Budget:   $${ex.budget.toFixed(2)}`);
  });

  console.log('\n' + '='.repeat(80) + '\n');

  // ========================================================================
  // SCENARIO 1: PREMIUM CUSTOMER (VIP)
  // ========================================================================

  console.log('💎 SCENARIO 1: Premium Customer (VIP Conference)\n');
  console.log('Customer: Fortune 500 Company');
  console.log('Budget: Unlimited - Quality is priority\n');

  const premiumInterpreter = new InterpreterNode({
    name: 'Premium Interpreter',
    interpreterInfo: {
      name: 'VIP Conference Interpreter',
      supportedLanguages: ['en', 'tr', 'ar', 'ru', 'el', 'fr', 'de', 'it'],
      primaryLanguage: 'en',
      maxLatency: 500,
      qualityMode: 'balanced'
    },
    sessionInfo: {
      sessionId: 'vip-summit-2025',
      room: 'Executive Hall',
      targetLanguages: ['en', 'tr', 'ar', 'de']
    },
    apiProviders: {
      qualityTier: 'premium', // ⭐ Best quality
      // Uses: OpenAI Whisper + Claude Sonnet 4.5
      // Cost: ~$45 per 1000 minutes
      // Quality: 10/10
    },
    apiKeys: {
      openai: OPENAI_API_KEY,
      anthropic: ANTHROPIC_API_KEY
    }
  });

  await premiumInterpreter.initialize();
  console.log('✅ Premium interpreter initialized (Claude Sonnet 4.5)\n');

  // ========================================================================
  // SCENARIO 2: STANDARD CUSTOMER (Regular Conference)
  // ========================================================================

  console.log('📦 SCENARIO 2: Standard Customer (Regular Conference)\n');
  console.log('Customer: Medium-sized company');
  console.log('Budget: $500 for full-day conference\n');

  const standardInterpreter = new InterpreterNode({
    name: 'Standard Interpreter',
    interpreterInfo: {
      name: 'Standard Conference Interpreter',
      supportedLanguages: ['en', 'tr', 'ar'],
      primaryLanguage: 'en',
      maxLatency: 500,
      qualityMode: 'balanced'
    },
    sessionInfo: {
      sessionId: 'business-summit-2025',
      room: 'Conference Room A',
      targetLanguages: ['en', 'tr']
    },
    apiProviders: {
      qualityTier: 'standard', // Good balance
      // Uses: OpenAI Whisper + GPT-4o
      // Cost: ~$30 per 1000 minutes
      // Quality: 8.5/10
    },
    apiKeys: {
      openai: OPENAI_API_KEY,
      anthropic: ANTHROPIC_API_KEY
    }
  });

  await standardInterpreter.initialize();
  console.log('✅ Standard interpreter initialized (GPT-4o)\n');

  // ========================================================================
  // SCENARIO 3: BUDGET CUSTOMER (Webinar)
  // ========================================================================

  console.log('💵 SCENARIO 3: Budget Customer (Small Webinar)\n');
  console.log('Customer: Startup or small organization');
  console.log('Budget: $50 for 1-hour webinar\n');

  const budgetInterpreter = new InterpreterNode({
    name: 'Budget Interpreter',
    interpreterInfo: {
      name: 'Budget Webinar Interpreter',
      supportedLanguages: ['en', 'tr'],
      primaryLanguage: 'en',
      maxLatency: 400,
      qualityMode: 'speed'
    },
    sessionInfo: {
      sessionId: 'webinar-2025',
      room: 'Virtual Room',
      targetLanguages: ['en', 'tr']
    },
    apiProviders: {
      qualityTier: 'budget', // Cost-optimized
      // Uses: OpenAI Whisper + GPT-3.5-turbo
      // Cost: ~$12 per 1000 minutes
      // Quality: 7/10
    },
    apiKeys: {
      openai: OPENAI_API_KEY,
      anthropic: ANTHROPIC_API_KEY
    }
  });

  await budgetInterpreter.initialize();
  console.log('✅ Budget interpreter initialized (GPT-3.5-turbo)\n');

  // ========================================================================
  // SCENARIO 4: CUSTOM CONFIGURATION WITH FALLBACK
  // ========================================================================

  console.log('🔄 SCENARIO 4: Custom with Fallback (Production)\n');
  console.log('Customer: Mission-critical event');
  console.log('Requirement: High availability with automatic fallback\n');

  const resilientInterpreter = new InterpreterNode({
    name: 'Resilient Interpreter',
    interpreterInfo: {
      name: 'High-Availability Interpreter',
      supportedLanguages: ['en', 'tr', 'ar'],
      primaryLanguage: 'en',
      maxLatency: 500,
      qualityMode: 'balanced'
    },
    sessionInfo: {
      sessionId: 'critical-summit-2025',
      room: 'Main Hall',
      targetLanguages: ['en', 'tr', 'ar']
    },
    apiProviders: {
      qualityTier: 'premium',
      enableFallback: true,
      // Primary: Claude Sonnet 4.5
      // Fallback: GPT-4o (if Claude fails)
      // Last Resort: GPT-3.5-turbo (if both fail)
    },
    apiKeys: {
      openai: OPENAI_API_KEY,
      anthropic: ANTHROPIC_API_KEY
    }
  });

  await resilientInterpreter.initialize();
  console.log('✅ Resilient interpreter with 3-tier fallback initialized\n');

  // ========================================================================
  // COST ESTIMATION
  // ========================================================================

  console.log('\n' + '='.repeat(80));
  console.log('💰 SESSION COST ESTIMATION\n');

  const sessionDuration = 120; // 2-hour keynote

  console.log(`Session duration: ${sessionDuration} minutes\n`);

  console.log('Premium tier:  $' + QualityTierManager.estimateSessionCost('premium', sessionDuration).toFixed(2));
  console.log('Standard tier: $' + QualityTierManager.estimateSessionCost('standard', sessionDuration).toFixed(2));
  console.log('Budget tier:   $' + QualityTierManager.estimateSessionCost('budget', sessionDuration).toFixed(2));

  console.log('\n' + '='.repeat(80));

  // ========================================================================
  // RECOMMENDATION ENGINE
  // ========================================================================

  console.log('\n🎯 TIER RECOMMENDATION BASED ON BUDGET\n');

  const budgets = [
    { budget: 10, duration: 120, description: '2h session, $10 budget' },
    { budget: 5, duration: 120, description: '2h session, $5 budget' },
    { budget: 100, duration: 480, description: 'Full day (8h), $100 budget' }
  ];

  budgets.forEach(({ budget, duration, description }) => {
    const recommendedTier = QualityTierManager.recommendTier(budget, duration);
    console.log(`${description}:`);
    console.log(`  → Recommended tier: ${recommendedTier.toUpperCase()}`);
    console.log(`  → Estimated cost: $${QualityTierManager.estimateSessionCost(recommendedTier, duration).toFixed(2)}`);
    console.log();
  });

  // Cleanup
  await premiumInterpreter.shutdown();
  await standardInterpreter.shutdown();
  await budgetInterpreter.shutdown();
  await resilientInterpreter.shutdown();

  console.log('✅ All interpreters shutdown\n');
}

main().catch(console.error);
