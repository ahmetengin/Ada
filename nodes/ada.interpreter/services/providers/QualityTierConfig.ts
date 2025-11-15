/**
 * QualityTierConfig - Predefined quality tiers for different customer segments
 *
 * Premium: Best quality, highest cost - For VIP customers willing to pay premium
 * Standard: Good balance - For regular customers
 * Budget: Cost-optimized - For price-sensitive customers
 */

import { STTProviderType } from './STTProviderFactory.js';
import { TranslationProviderType } from './TranslationProviderFactory.js';

export type QualityTier = 'premium' | 'standard' | 'budget' | 'ultra-budget';

export interface QualityTierSpec {
  name: string;
  description: string;
  sttProvider: STTProviderType;
  translationProvider: TranslationProviderType;
  estimatedCostPer1000Minutes: number; // USD
  expectedLatency: number; // milliseconds
  qualityScore: number; // 1-10
}

export const QUALITY_TIERS: Record<QualityTier, QualityTierSpec> = {
  premium: {
    name: 'Premium',
    description: 'Best quality - Claude Sonnet 4.5 translation, lowest latency',
    sttProvider: 'openai-whisper',
    translationProvider: 'claude-sonnet-4.5',
    estimatedCostPer1000Minutes: 45.0, // ~$45 per 1000 minutes
    expectedLatency: 500,
    qualityScore: 10
  },

  standard: {
    name: 'Standard',
    description: 'Excellent quality - GPT-4o translation, good balance',
    sttProvider: 'openai-whisper',
    translationProvider: 'gpt-4o',
    estimatedCostPer1000Minutes: 30.0, // ~$30 per 1000 minutes
    expectedLatency: 450,
    qualityScore: 8.5
  },

  budget: {
    name: 'Budget',
    description: 'Cost-optimized - GPT-3.5-turbo translation',
    sttProvider: 'openai-whisper',
    translationProvider: 'gpt-3.5-turbo',
    estimatedCostPer1000Minutes: 12.0, // ~$12 per 1000 minutes
    expectedLatency: 400,
    qualityScore: 7
  },

  'ultra-budget': {
    name: 'Ultra Budget',
    description: 'Maximum savings - Gemini 2.0 Flash (30x cheaper than GPT-4o!)',
    sttProvider: 'openai-whisper',
    translationProvider: 'gemini-2.0-flash',
    estimatedCostPer1000Minutes: 3.0, // ~$3 per 1000 minutes (!!!)
    expectedLatency: 380,
    qualityScore: 6.5
  }
};

export interface CustomerTierConfig {
  tier: QualityTier;
  customerId: string;
  customerName: string;
  maxCostPerSession?: number; // Optional cost cap
  enableFallback?: boolean;
}

export class QualityTierManager {
  /**
   * Get quality tier configuration
   */
  static getTierConfig(tier: QualityTier): QualityTierSpec {
    return QUALITY_TIERS[tier];
  }

  /**
   * Calculate estimated cost for a session
   */
  static estimateSessionCost(tier: QualityTier, durationMinutes: number): number {
    const tierSpec = QUALITY_TIERS[tier];
    return (durationMinutes / 1000) * tierSpec.estimatedCostPer1000Minutes;
  }

  /**
   * Recommend tier based on customer budget
   */
  static recommendTier(budgetUSD: number, durationMinutes: number): QualityTier {
    const costPerMinute = budgetUSD / durationMinutes;

    if (costPerMinute >= 0.045) {
      return 'premium';
    } else if (costPerMinute >= 0.030) {
      return 'standard';
    } else if (costPerMinute >= 0.012) {
      return 'budget';
    } else {
      return 'ultra-budget';
    }
  }

  /**
   * Get tier comparison table
   */
  static getComparisonTable(): string {
    return `
┌──────────────┬─────────────────────┬──────────────┬──────────────┬──────────┐
│ Tier         │ Translation Engine  │ Cost/1000min │ Latency      │ Quality  │
├──────────────┼─────────────────────┼──────────────┼──────────────┼──────────┤
│ Premium      │ Claude Sonnet 4.5   │ $45.00       │ ~500ms       │ 10/10    │
│ Standard     │ GPT-4o              │ $30.00       │ ~450ms       │ 8.5/10   │
│ Budget       │ GPT-3.5-turbo       │ $12.00       │ ~400ms       │ 7/10     │
│ Ultra-Budget │ Gemini 2.0 Flash    │ $3.00 🔥     │ ~380ms       │ 6.5/10   │
└──────────────┴─────────────────────┴──────────────┴──────────────┴──────────┘

Examples:
- 2-hour keynote (Premium):      120 min × $0.045/min = $5.40
- 2-hour keynote (Standard):     120 min × $0.030/min = $3.60
- 2-hour keynote (Budget):       120 min × $0.012/min = $1.44
- 2-hour keynote (Ultra-Budget): 120 min × $0.003/min = $0.36 🔥

- Full-day conference 8h (Premium):      480 min × $0.045/min = $21.60
- Full-day conference 8h (Standard):     480 min × $0.030/min = $14.40
- Full-day conference 8h (Budget):       480 min × $0.012/min = $5.76
- Full-day conference 8h (Ultra-Budget): 480 min × $0.003/min = $1.44 🔥
`;
  }

  /**
   * Get pricing examples
   */
  static getPricingExamples(): Array<{
    scenario: string;
    duration: number;
    premium: number;
    standard: number;
    budget: number;
  }> {
    const scenarios = [
      { scenario: '1-hour webinar', duration: 60 },
      { scenario: '2-hour keynote', duration: 120 },
      { scenario: 'Half-day workshop (4h)', duration: 240 },
      { scenario: 'Full-day conference (8h)', duration: 480 },
      { scenario: '3-day summit (24h total)', duration: 1440 }
    ];

    return scenarios.map(s => ({
      scenario: s.scenario,
      duration: s.duration,
      premium: this.estimateSessionCost('premium', s.duration),
      standard: this.estimateSessionCost('standard', s.duration),
      budget: this.estimateSessionCost('budget', s.duration)
    }));
  }
}

export default QualityTierManager;
