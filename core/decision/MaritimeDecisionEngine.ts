/**
 * Maritime Decision Engine
 * Autonomous decision making for Ada maritime agents
 */

import EventEmitter from 'events';
import { SkillTree } from '../skills/SkillTree.js';
import { MaritimeKnowledgeBase } from '../knowledge/MaritimeKnowledgeBase.js';
import { ExperienceLearningPipeline } from '../learning/ExperienceLearningPipeline.js';
import {
  MaritimeContext,
  SituationAssessment,
  Risk,
  Opportunity,
  Recommendation,
  ReasoningChain,
} from '../types/maritime-ontology.js';

// ============================================================================
// TYPES
// ============================================================================

export interface DecisionOption {
  id: string;
  action: string;
  description: string;
  pros: string[];
  cons: string[];
  estimated_impact: string;
  risk_level: 'low' | 'medium' | 'high';
  required_skills: string[];
  context_requirements: string[];
}

export interface DecisionEvaluation {
  option: DecisionOption;
  score: number; // 0-100
  confidence: number; // 0-1
  skill_compatibility: number; // 0-1
  knowledge_support: number; // 0-1
  experience_backing: number; // 0-1
  reasoning: string[];
}

export interface AutonomousDecision {
  situation: string;
  context: MaritimeContext;
  options_considered: DecisionOption[];
  selected_option: DecisionOption;
  evaluation: DecisionEvaluation;
  alternatives: DecisionEvaluation[];
  reasoning_chain: ReasoningChain;
  confidence: number; // 0-1
  autonomous: boolean; // True if decision made without human input
  timestamp: Date;
}

// ============================================================================
// DECISION ENGINE
// ============================================================================

export class MaritimeDecisionEngine extends EventEmitter {
  private skillTree: SkillTree;
  private knowledgeBase: MaritimeKnowledgeBase;
  private learningPipeline: ExperienceLearningPipeline;
  private decisionHistory: AutonomousDecision[];

  // Decision thresholds
  private readonly AUTONOMOUS_CONFIDENCE_THRESHOLD = 0.7; // Min confidence for autonomous decisions
  private readonly HIGH_RISK_THRESHOLD = 0.8; // Require human approval above this
  private readonly SKILL_COMPETENCE_THRESHOLD = 25; // Min skill level for complex decisions

  constructor(
    skillTree: SkillTree,
    knowledgeBase: MaritimeKnowledgeBase,
    learningPipeline: ExperienceLearningPipeline
  ) {
    super();
    this.skillTree = skillTree;
    this.knowledgeBase = knowledgeBase;
    this.learningPipeline = learningPipeline;
    this.decisionHistory = [];
  }

  // ========================================================================
  // AUTONOMOUS DECISION MAKING
  // ========================================================================

  /**
   * Make an autonomous decision based on current situation
   */
  async makeDecision(situation: string, context: MaritimeContext): Promise<AutonomousDecision> {
    // Step 1: Assess situation
    const assessment = this.knowledgeBase.assessSituation(context);

    // Step 2: Generate options
    const options = await this.generateOptions(situation, context, assessment);

    // Step 3: Evaluate all options
    const evaluations = await this.evaluateOptions(options, context, assessment);

    // Step 4: Select best option
    const best = evaluations[0]; // Already sorted by score

    // Step 5: Determine if confident enough for autonomous action
    const canActAutonomously =
      best.confidence >= this.AUTONOMOUS_CONFIDENCE_THRESHOLD &&
      best.option.risk_level !== 'high';

    // Step 6: Create reasoning chain
    const reasoning = this.knowledgeBase.reason(situation, context);

    const decision: AutonomousDecision = {
      situation,
      context,
      options_considered: options,
      selected_option: best.option,
      evaluation: best,
      alternatives: evaluations.slice(1, 3),
      reasoning_chain: reasoning,
      confidence: best.confidence,
      autonomous: canActAutonomously,
      timestamp: new Date(),
    };

    this.decisionHistory.push(decision);

    this.emit('decision:made', {
      situation,
      action: best.option.action,
      confidence: best.confidence,
      autonomous: canActAutonomously,
    });

    if (!canActAutonomously) {
      this.emit('decision:requires_approval', decision);
    }

    return decision;
  }

  // ========================================================================
  // OPTION GENERATION
  // ========================================================================

  /**
   * Generate possible decision options
   */
  private async generateOptions(
    situation: string,
    context: MaritimeContext,
    assessment: SituationAssessment
  ): Promise<DecisionOption[]> {
    const options: DecisionOption[] = [];

    // Generate options based on situation type
    if (situation.includes('anchor')) {
      options.push(...this.generateAnchoringOptions(context, assessment));
    }

    if (situation.includes('weather') || situation.includes('wind')) {
      options.push(...this.generateWeatherOptions(context, assessment));
    }

    if (situation.includes('navigation') || situation.includes('route')) {
      options.push(...this.generateNavigationOptions(context, assessment));
    }

    // Always have a "do nothing" option
    options.push({
      id: 'no_action',
      action: 'Monitor situation',
      description: 'Continue current course and monitor',
      pros: ['No immediate changes', 'Time to gather more information'],
      cons: ['Situation may worsen', 'Missing opportunities'],
      estimated_impact: 'Neutral',
      risk_level: 'low',
      required_skills: [],
      context_requirements: [],
    });

    return options;
  }

  /**
   * Generate anchoring decision options
   */
  private generateAnchoringOptions(
    context: MaritimeContext,
    assessment: SituationAssessment
  ): DecisionOption[] {
    const options: DecisionOption[] = [];
    const wind = context.vessel_state.wind.speed;
    const depth = context.vessel_state.depth;

    // Calculate recommended scope
    let scope = 5; // Base scope
    if (wind > 20) scope = 7;
    if (wind > 30) scope = 10;

    const chainLength = depth * scope;

    options.push({
      id: 'anchor_here',
      action: `Deploy anchor with ${chainLength.toFixed(0)}m chain (${scope}:1 scope)`,
      description: `Anchor at current position considering ${wind}kt wind and ${depth.toFixed(1)}m depth`,
      pros: ['Good shelter', 'Appropriate depth', 'Calculated scope'],
      cons: wind > 25 ? ['High wind conditions'] : [],
      estimated_impact: 'Secure anchorage',
      risk_level: wind > 30 ? 'high' : wind > 20 ? 'medium' : 'low',
      required_skills: ['anchoring_basics'],
      context_requirements: ['suitable_depth', 'good_holding'],
    });

    if (wind > 25) {
      options.push({
        id: 'seek_better_shelter',
        action: 'Seek more protected anchorage',
        description: 'Wind too strong, find better shelter',
        pros: ['Better protection', 'Reduced risk'],
        cons: ['Time/fuel to relocate', 'May not find better spot'],
        estimated_impact: 'Safer anchorage',
        risk_level: 'low',
        required_skills: ['navigation_basic', 'anchorage_assessment'],
        context_requirements: ['alternative_anchorage_nearby'],
      });
    }

    return options;
  }

  /**
   * Generate weather-related options
   */
  private generateWeatherOptions(
    context: MaritimeContext,
    assessment: SituationAssessment
  ): DecisionOption[] {
    const options: DecisionOption[] = [];
    const wind = context.vessel_state.wind.speed;

    if (wind > 25) {
      options.push({
        id: 'reef_sails',
        action: 'Reef sails',
        description: `Reduce sail area due to ${wind}kt wind`,
        pros: ['Improved safety', 'Better control', 'Reduced heel'],
        cons: ['Reduced speed', 'Crew effort required'],
        estimated_impact: 'Safer sailing',
        risk_level: 'low',
        required_skills: ['reefing', 'sail_trim'],
        context_requirements: ['sails_deployed'],
      });

      options.push({
        id: 'motor_sailing',
        action: 'Drop sails and motor',
        description: 'Use engine instead of sails',
        pros: ['Maximum safety', 'Predictable speed'],
        cons: ['Fuel consumption', 'Less enjoyable'],
        estimated_impact: 'Very safe',
        risk_level: 'low',
        required_skills: ['basic_seamanship'],
        context_requirements: ['engine_operational'],
      });
    }

    return options;
  }

  /**
   * Generate navigation options
   */
  private generateNavigationOptions(
    context: MaritimeContext,
    assessment: SituationAssessment
  ): DecisionOption[] {
    const options: DecisionOption[] = [];

    if (assessment.risks.some((r) => r.type === 'shallow_water')) {
      options.push({
        id: 'alter_course',
        action: 'Alter course to deeper water',
        description: 'Navigate to safer depth',
        pros: ['Avoid grounding risk', 'Peace of mind'],
        cons: ['Longer route', 'Time delay'],
        estimated_impact: 'Safer navigation',
        risk_level: 'low',
        required_skills: ['navigation_basic', 'route_planning'],
        context_requirements: ['alternative_route_available'],
      });

      options.push({
        id: 'reduce_speed',
        action: 'Reduce speed and post lookout',
        description: 'Slow down and monitor carefully',
        pros: ['More reaction time', 'Keep current route'],
        cons: ['Slower progress', 'Requires vigilance'],
        estimated_impact: 'Reduced risk',
        risk_level: 'medium',
        required_skills: ['navigation_basic'],
        context_requirements: ['crew_available'],
      });
    }

    return options;
  }

  // ========================================================================
  // OPTION EVALUATION
  // ========================================================================

  /**
   * Evaluate all options and rank them
   */
  private async evaluateOptions(
    options: DecisionOption[],
    context: MaritimeContext,
    assessment: SituationAssessment
  ): Promise<DecisionEvaluation[]> {
    const evaluations: DecisionEvaluation[] = [];

    for (const option of options) {
      const evaluation = await this.evaluateOption(option, context, assessment);
      evaluations.push(evaluation);
    }

    // Sort by score (highest first)
    evaluations.sort((a, b) => b.score - a.score);

    return evaluations;
  }

  /**
   * Evaluate a single option
   */
  private async evaluateOption(
    option: DecisionOption,
    context: MaritimeContext,
    assessment: SituationAssessment
  ): Promise<DecisionEvaluation> {
    const reasoning: string[] = [];
    let score = 50; // Base score

    // 1. Skill compatibility (0-1)
    const skill_compatibility = this.evaluateSkillCompatibility(option, reasoning);
    score += skill_compatibility * 20; // Up to +20 points

    // 2. Knowledge support (0-1)
    const knowledge_support = this.evaluateKnowledgeSupport(option, context, reasoning);
    score += knowledge_support * 15; // Up to +15 points

    // 3. Experience backing (0-1)
    const experience_backing = this.evaluateExperienceBacking(option, context, reasoning);
    score += experience_backing * 15; // Up to +15 points

    // 4. Risk assessment
    const risk_penalty = this.evaluateRiskLevel(option, assessment, reasoning);
    score -= risk_penalty; // Subtract risk points

    // 5. Context fit
    const context_bonus = this.evaluateContextFit(option, context, reasoning);
    score += context_bonus; // Up to +10 points

    // Normalize score to 0-100
    score = Math.max(0, Math.min(100, score));

    // Calculate overall confidence
    const confidence = (skill_compatibility + knowledge_support + experience_backing) / 3;

    return {
      option,
      score,
      confidence,
      skill_compatibility,
      knowledge_support,
      experience_backing,
      reasoning,
    };
  }

  /**
   * Evaluate if Ada has the skills for this option
   */
  private evaluateSkillCompatibility(option: DecisionOption, reasoning: string[]): number {
    if (option.required_skills.length === 0) {
      reasoning.push('No special skills required');
      return 1.0;
    }

    let totalSkillLevel = 0;
    let skillCount = 0;

    for (const skillId of option.required_skills) {
      const skill = this.skillTree.getSkill(skillId);
      if (skill && skill.unlocked) {
        totalSkillLevel += skill.level;
        skillCount++;

        const proficiency = this.skillTree.getProficiencyLevel(skill.level);
        reasoning.push(`${skill.name}: ${proficiency} (level ${skill.level})`);
      } else {
        reasoning.push(`⚠️ Missing skill: ${skillId}`);
      }
    }

    if (skillCount === 0) {
      return 0;
    }

    const avgLevel = totalSkillLevel / skillCount;
    return avgLevel / 100; // Normalize to 0-1
  }

  /**
   * Evaluate knowledge base support for this option
   */
  private evaluateKnowledgeSupport(
    option: DecisionOption,
    context: MaritimeContext,
    reasoning: string[]
  ): number {
    // Query knowledge base for relevant concepts
    const keywords = option.action.toLowerCase().split(' ');
    const relevantConcepts = this.knowledgeBase.query({
      tags: keywords,
      limit: 5,
    });

    if (relevantConcepts.length > 0) {
      reasoning.push(`Found ${relevantConcepts.length} relevant concepts in knowledge base`);
      return Math.min(1.0, relevantConcepts.length / 3);
    } else {
      reasoning.push('Limited knowledge base support');
      return 0.3;
    }
  }

  /**
   * Evaluate experience backing for this option
   */
  private evaluateExperienceBacking(
    option: DecisionOption,
    context: MaritimeContext,
    reasoning: string[]
  ): number {
    // Check if similar decisions were made before
    const similarDecisions = this.decisionHistory.filter(
      (d) =>
        d.selected_option.action === option.action &&
        Math.abs(d.context.vessel_state.wind.speed - context.vessel_state.wind.speed) < 5
    );

    if (similarDecisions.length > 0) {
      const successCount = similarDecisions.filter((d) => d.confidence > 0.7).length;
      const successRate = successCount / similarDecisions.length;
      reasoning.push(`Similar decision made ${similarDecisions.length} times (${(successRate * 100).toFixed(0)}% success)`);
      return successRate;
    } else {
      reasoning.push('No prior experience with this decision');
      return 0.4; // Neutral
    }
  }

  /**
   * Evaluate risk level
   */
  private evaluateRiskLevel(
    option: DecisionOption,
    assessment: SituationAssessment,
    reasoning: string[]
  ): number {
    const riskPenalties = {
      low: 0,
      medium: 10,
      high: 25,
    };

    const penalty = riskPenalties[option.risk_level];
    reasoning.push(`Risk level: ${option.risk_level} (-${penalty} points)`);
    return penalty;
  }

  /**
   * Evaluate context fitness
   */
  private evaluateContextFit(
    option: DecisionOption,
    context: MaritimeContext,
    reasoning: string[]
  ): number {
    // Check if context requirements are met
    let bonus = 0;

    // Daylight bonus for complex operations
    if (context.time.daylight && option.required_skills.length > 0) {
      bonus += 5;
      reasoning.push('Daylight available for better visibility (+5)');
    }

    // Crew experience bonus
    if (context.crew.experience_level === 'expert') {
      bonus += 5;
      reasoning.push('Experienced crew available (+5)');
    }

    return bonus;
  }

  // ========================================================================
  // DECISION HISTORY & LEARNING
  // ========================================================================

  /**
   * Get recent decisions
   */
  getRecentDecisions(limit: number = 10): AutonomousDecision[] {
    return this.decisionHistory.slice(-limit).reverse();
  }

  /**
   * Get decisions by confidence level
   */
  getDecisionsByConfidence(minConfidence: number): AutonomousDecision[] {
    return this.decisionHistory.filter((d) => d.confidence >= minConfidence);
  }

  /**
   * Get autonomous vs manual decisions
   */
  getDecisionStatistics(): {
    total_decisions: number;
    autonomous_decisions: number;
    manual_decisions: number;
    average_confidence: number;
    decisions_by_situation: Record<string, number>;
  } {
    const total = this.decisionHistory.length;
    const autonomous = this.decisionHistory.filter((d) => d.autonomous).length;

    const avgConfidence =
      total > 0
        ? this.decisionHistory.reduce((sum, d) => sum + d.confidence, 0) / total
        : 0;

    const decisions_by_situation: Record<string, number> = {};
    for (const decision of this.decisionHistory) {
      const key = decision.situation;
      decisions_by_situation[key] = (decisions_by_situation[key] || 0) + 1;
    }

    return {
      total_decisions: total,
      autonomous_decisions: autonomous,
      manual_decisions: total - autonomous,
      average_confidence: avgConfidence,
      decisions_by_situation,
    };
  }
}
