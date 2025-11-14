/**
 * Experience Learning Pipeline (SEAL v2)
 * Self-Adapting Language Models - arXiv:2506.10943v2 (Sep 18, 2025)
 *
 * SEAL v2 Features:
 * - Self-edit generation: Model generates own finetuning data
 * - RL-based learning: Downstream performance as reward signal
 * - Tool invocation: Data augmentation & gradient-based updates
 * - Hyperparameter optimization: Dynamic learning rate adjustment
 * - Self-adaptation: Restructures information for optimal learning
 */

import EventEmitter from 'events';
import { SkillTree, Skill, SkillCategory } from '../skills/SkillTree.js';
import { MaritimeKnowledgeBase } from '../knowledge/MaritimeKnowledgeBase.js';
import { Concept, MaritimeContext } from '../types/maritime-ontology.js';
import { TabPFNAdapter, TabPFNPrediction } from './TabPFNAdapter.js';

// ============================================================================
// TYPES
// ============================================================================

export interface MaritimeExperience {
  id: string;
  type: ExperienceType;
  timestamp: Date;
  context: MaritimeContext;
  action: string;
  outcome: ExperienceOutcome;
  success: boolean;
  performance_score: number; // 0-1
  data: Record<string, any>;
  tags: string[];
}

export type ExperienceType =
  | 'navigation'
  | 'anchoring'
  | 'weather_decision'
  | 'sailing_maneuver'
  | 'emergency_response'
  | 'route_planning'
  | 'communication'
  | 'maintenance';

export interface ExperienceOutcome {
  description: string;
  metrics?: Record<string, number>;
  issues?: string[];
  learnings?: string[];
}

export interface LearningInsight {
  concept: string;
  insight: string;
  confidence: number; // 0-1
  applicability: string[]; // When/where this applies
  supporting_experiences: string[]; // Experience IDs
  created_at: Date;
}

export interface PatternDetection {
  pattern_type: string;
  frequency: number;
  conditions: Record<string, any>;
  typical_outcome: string;
  confidence: number;
  first_seen: Date;
  last_seen: Date;
}

// ============================================================================
// SEAL V2 TYPES
// ============================================================================

/**
 * Self-edit: Model-generated finetuning directive
 * The model can restructure information, specify hyperparameters,
 * or invoke tools for data augmentation
 */
export interface SelfEdit {
  id: string;
  experience_id: string;
  edit_type: 'restructure' | 'hyperparameter' | 'augmentation' | 'gradient_update';
  directive: string; // What to change
  rationale: string; // Why to change
  hyperparameters?: {
    learning_rate?: number;
    batch_size?: number;
    epochs?: number;
    weight_decay?: number;
  };
  tool_invocations?: ToolInvocation[];
  expected_improvement: number; // 0-1
  created_at: Date;
}

/**
 * Tool invocation for data augmentation
 */
export interface ToolInvocation {
  tool_name: string;
  parameters: Record<string, any>;
  purpose: string;
  timestamp: Date;
}

/**
 * RL Reward Signal - Downstream performance metric
 */
export interface RewardSignal {
  experience_id: string;
  self_edit_id?: string;
  performance_before: number; // 0-1
  performance_after: number; // 0-1
  improvement: number; // Delta
  metric_type: 'accuracy' | 'success_rate' | 'efficiency' | 'safety';
  timestamp: Date;
}

/**
 * Learning Loop Iteration (RL-based)
 */
export interface LearningIteration {
  id: string;
  iteration_number: number;
  experiences_processed: number;
  self_edits_generated: number;
  average_reward: number;
  learning_velocity: number; // Improvement per iteration
  timestamp: Date;
}

// ============================================================================
// EXPERIENCE LEARNING PIPELINE
// ============================================================================

export class ExperienceLearningPipeline extends EventEmitter {
  private skillTree: SkillTree;
  private knowledgeBase: MaritimeKnowledgeBase;
  private experiences: Map<string, MaritimeExperience>;
  private patterns: Map<string, PatternDetection>;
  private insights: LearningInsight[];
  private processedExperiences: Set<string>;

  // SEAL v2 additions
  private selfEdits: Map<string, SelfEdit> = new Map();
  private rewardSignals: RewardSignal[] = [];
  private learningIterations: LearningIteration[] = [];
  private currentIteration: number = 0;
  private hyperparameters: {
    learning_rate: number;
    batch_size: number;
    exploration_rate: number; // For RL
  } = {
    learning_rate: 0.001,
    batch_size: 32,
    exploration_rate: 0.1,
  };

  // TabPFN-2.5 integration
  private tabpfn: TabPFNAdapter;
  private tabpfnEnabled: boolean = true;
  private readonly FEW_SHOT_THRESHOLD = 10; // Use TabPFN for <10 samples
  private readonly HYBRID_THRESHOLD = 100; // Use hybrid for 10-100 samples

  constructor(skillTree: SkillTree, knowledgeBase: MaritimeKnowledgeBase) {
    super();
    this.skillTree = skillTree;
    this.knowledgeBase = knowledgeBase;
    this.experiences = new Map();
    this.patterns = new Map();
    this.insights = [];
    this.processedExperiences = new Set();

    // Initialize TabPFN adapter
    this.tabpfn = new TabPFNAdapter({
      max_samples: 10_000,
      max_features: 2_000,
      task_type: 'classification',
      enable_distillation: true,
      cache_predictions: true,
    });

    // Listen to TabPFN events
    this.tabpfn.on('tabpfn:prediction_made', (data) => {
      this.emit('tabpfn:prediction', data);
    });
  }

  // ========================================================================
  // EXPERIENCE RECORDING
  // ========================================================================

  /**
   * Record a new maritime experience
   */
  async recordExperience(experience: MaritimeExperience): Promise<void> {
    // Store experience
    this.experiences.set(experience.id, experience);

    this.emit('experience:recorded', {
      id: experience.id,
      type: experience.type,
      success: experience.success,
    });

    // Trigger learning pipeline
    await this.processExperience(experience);
  }

  // ========================================================================
  // LEARNING PIPELINE
  // ========================================================================

  /**
   * Process an experience through the learning pipeline
   * Intelligently routes to TabPFN (few-shot) or SEAL (many-shot) based on data availability
   */
  private async processExperience(experience: MaritimeExperience): Promise<void> {
    if (this.processedExperiences.has(experience.id)) {
      return; // Already processed
    }

    // Determine sample count for this experience type
    const sampleCount = this.getExperiencesByType(experience.type).length;

    // ========================================================================
    // ROUTING LOGIC: TabPFN vs SEAL
    // ========================================================================

    let processingStrategy: 'tabpfn' | 'hybrid' | 'seal';

    if (sampleCount < this.FEW_SHOT_THRESHOLD && this.tabpfnEnabled) {
      // Few samples (<10): Use TabPFN for superior few-shot performance
      processingStrategy = 'tabpfn';
    } else if (sampleCount < this.HYBRID_THRESHOLD && this.tabpfnEnabled) {
      // Medium samples (10-100): Use hybrid approach
      processingStrategy = 'hybrid';
    } else {
      // Many samples (>100): Use pure SEAL with RL optimization
      processingStrategy = 'seal';
    }

    this.emit('experience:processing_strategy', {
      id: experience.id,
      type: experience.type,
      sample_count: sampleCount,
      strategy: processingStrategy,
    });

    // ========================================================================
    // TABPFN-FIRST PROCESSING (Few-shot learning)
    // ========================================================================

    if (processingStrategy === 'tabpfn') {
      await this.processWithTabPFN(experience);
    }

    // ========================================================================
    // HYBRID PROCESSING (TabPFN + SEAL)
    // ========================================================================

    else if (processingStrategy === 'hybrid') {
      await this.processWithHybrid(experience);
    }

    // ========================================================================
    // SEAL-ONLY PROCESSING (Traditional RL-based learning)
    // ========================================================================

    // Always run SEAL pipeline for skill updates, knowledge extraction
    // Even when using TabPFN, we still want to track experiences
    await this.processWithSEAL(experience);

    // Mark as processed
    this.processedExperiences.add(experience.id);

    this.emit('experience:processed', {
      id: experience.id,
      strategy: processingStrategy,
      sample_count: sampleCount,
    });
  }

  /**
   * Process experience with TabPFN few-shot learning
   */
  private async processWithTabPFN(experience: MaritimeExperience): Promise<void> {
    // Add to TabPFN training data
    this.tabpfn.addExperiences([experience]);

    // TabPFN works best with few samples - it will learn patterns immediately
    this.emit('tabpfn:few_shot_learning', {
      experience_id: experience.id,
      type: experience.type,
      training_samples: this.tabpfn.getStatistics().training_samples,
    });
  }

  /**
   * Process experience with hybrid TabPFN + SEAL approach
   */
  private async processWithHybrid(experience: MaritimeExperience): Promise<void> {
    // Add to TabPFN training data
    this.tabpfn.addExperiences([experience]);

    // Generate SEAL self-edit
    const selfEdit = await this.generateSelfEdit(experience);

    // Combine TabPFN predictions with SEAL insights
    // TabPFN provides fast predictions, SEAL provides deep understanding
    this.emit('hybrid:processing', {
      experience_id: experience.id,
      self_edit: selfEdit,
      tabpfn_samples: this.tabpfn.getStatistics().training_samples,
    });
  }

  /**
   * Process experience with pure SEAL pipeline
   */
  private async processWithSEAL(experience: MaritimeExperience): Promise<void> {
    // Step 1: Update skills
    await this.updateSkills(experience);

    // Step 2: Extract lessons
    const lessons = await this.extractLessons(experience);

    // Step 3: Update knowledge base
    await this.updateKnowledge(lessons);

    // Step 4: Detect patterns
    await this.detectPatterns(experience);

    // Step 5: Generate insights
    const insights = await this.generateInsights(experience, lessons);
    this.insights.push(...insights);
  }

  // ========================================================================
  // SKILL PROGRESSION
  // ========================================================================

  /**
   * Update skills based on experience
   */
  private async updateSkills(experience: MaritimeExperience): Promise<void> {
    // Map experience type to relevant skills
    const relevantSkills = this.findRelevantSkills(experience);

    for (const skill of relevantSkills) {
      // Calculate XP based on performance
      const baseXP = 10;
      const performanceMultiplier = experience.success ? experience.performance_score : 0.5;
      const xp = Math.floor(baseXP * performanceMultiplier);

      // Award XP
      this.skillTree.recordSkillUsage(skill.id, experience.success, xp);

      this.emit('skill:updated', {
        skill_id: skill.id,
        skill_name: skill.name,
        xp_gained: xp,
        reason: `${experience.type} experience`,
      });
    }
  }

  /**
   * Find skills relevant to an experience
   */
  private findRelevantSkills(experience: MaritimeExperience): Skill[] {
    const skillMapping: Record<ExperienceType, string[]> = {
      navigation: ['navigation_basic', 'position_fixing', 'route_planning'],
      anchoring: ['anchoring_basics', 'anchor_selection', 'anchorage_assessment'],
      weather_decision: ['weather_basics', 'wind_prediction', 'weather_routing'],
      sailing_maneuver: ['sail_trim', 'reefing'],
      emergency_response: ['emergency_procedures', 'mob_recovery'],
      route_planning: ['route_planning', 'weather_routing'],
      communication: [],
      maintenance: [],
    };

    const skillIds = skillMapping[experience.type] || [];
    return skillIds.map((id) => this.skillTree.getSkill(id)).filter((s) => s !== undefined) as Skill[];
  }

  // ========================================================================
  // LESSON EXTRACTION
  // ========================================================================

  /**
   * Extract lessons from an experience
   */
  private async extractLessons(experience: MaritimeExperience): Promise<LearningInsight[]> {
    const lessons: LearningInsight[] = [];

    // Success patterns
    if (experience.success && experience.performance_score > 0.7) {
      lessons.push({
        concept: experience.type,
        insight: `Successful ${experience.type}: ${experience.action}`,
        confidence: experience.performance_score,
        applicability: this.determineApplicability(experience.context),
        supporting_experiences: [experience.id],
        created_at: new Date(),
      });
    }

    // Failure patterns (learning from mistakes)
    if (!experience.success && experience.outcome.issues) {
      for (const issue of experience.outcome.issues) {
        lessons.push({
          concept: experience.type,
          insight: `Avoid: ${issue}`,
          confidence: 0.6,
          applicability: this.determineApplicability(experience.context),
          supporting_experiences: [experience.id],
          created_at: new Date(),
        });
      }
    }

    // Explicit learnings
    if (experience.outcome.learnings) {
      for (const learning of experience.outcome.learnings) {
        lessons.push({
          concept: experience.type,
          insight: learning,
          confidence: 0.8,
          applicability: this.determineApplicability(experience.context),
          supporting_experiences: [experience.id],
          created_at: new Date(),
        });
      }
    }

    return lessons;
  }

  /**
   * Determine when/where a lesson applies
   */
  private determineApplicability(context: MaritimeContext): string[] {
    const applicability: string[] = [];

    // Wind conditions
    if (context.vessel_state.wind.speed > 20) {
      applicability.push('strong_wind');
    } else if (context.vessel_state.wind.speed < 10) {
      applicability.push('light_wind');
    }

    // Daylight
    if (!context.time.daylight) {
      applicability.push('night_navigation');
    }

    // Shallow water
    if (context.vessel_state.depth < 5) {
      applicability.push('shallow_water');
    }

    return applicability;
  }

  // ========================================================================
  // KNOWLEDGE UPDATE
  // ========================================================================

  /**
   * Update knowledge base with lessons
   */
  private async updateKnowledge(lessons: LearningInsight[]): Promise<void> {
    for (const lesson of lessons) {
      // Check if similar knowledge already exists
      const existingConcepts = this.knowledgeBase.query({
        tags: [lesson.concept],
        limit: 5,
      });

      // If no existing concept, create one
      if (existingConcepts.length === 0) {
        const newConcept: Concept = {
          id: `learned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: `Learned: ${lesson.concept}`,
          category: this.mapTypeToCategory(lesson.concept),
          description: lesson.insight,
          properties: {
            confidence: lesson.confidence,
            applicability: lesson.applicability,
            learned_from_experience: true,
          },
          relationships: [],
          rules: [],
          tags: [lesson.concept, 'learned', ...lesson.applicability],
        };

        this.knowledgeBase.addConcept(newConcept);

        this.emit('knowledge:added', {
          concept_id: newConcept.id,
          insight: lesson.insight,
        });
      }
    }
  }

  /**
   * Map experience type to knowledge category
   */
  private mapTypeToCategory(type: string): any {
    const mapping: Record<string, any> = {
      navigation: 'navigation',
      anchoring: 'anchoring',
      weather_decision: 'weather',
      sailing_maneuver: 'sailing',
      emergency_response: 'emergency',
      route_planning: 'navigation',
    };
    return mapping[type] || 'seamanship';
  }

  // ========================================================================
  // PATTERN DETECTION
  // ========================================================================

  /**
   * Detect patterns across experiences
   */
  private async detectPatterns(newExperience: MaritimeExperience): Promise<void> {
    // Get similar experiences
    const similarExperiences = Array.from(this.experiences.values()).filter(
      (exp) =>
        exp.type === newExperience.type &&
        exp.id !== newExperience.id &&
        this.areSimilarContexts(exp.context, newExperience.context)
    );

    if (similarExperiences.length >= 3) {
      // Pattern detected!
      const patternId = `pattern_${newExperience.type}_${similarExperiences.length}`;

      const existingPattern = this.patterns.get(patternId);
      if (existingPattern) {
        existingPattern.frequency++;
        existingPattern.last_seen = new Date();
      } else {
        const pattern: PatternDetection = {
          pattern_type: newExperience.type,
          frequency: similarExperiences.length + 1,
          conditions: this.extractCommonConditions(similarExperiences),
          typical_outcome: this.determineTypicalOutcome(similarExperiences),
          confidence: this.calculatePatternConfidence(similarExperiences),
          first_seen: similarExperiences[0].timestamp,
          last_seen: new Date(),
        };

        this.patterns.set(patternId, pattern);

        this.emit('pattern:detected', pattern);
      }
    }
  }

  /**
   * Check if two contexts are similar
   */
  private areSimilarContexts(ctx1: MaritimeContext, ctx2: MaritimeContext): boolean {
    // Simple similarity check
    const windDiff = Math.abs(ctx1.vessel_state.wind.speed - ctx2.vessel_state.wind.speed);
    const depthDiff = Math.abs(ctx1.vessel_state.depth - ctx2.vessel_state.depth);

    return windDiff < 5 && depthDiff < 2;
  }

  /**
   * Extract common conditions from similar experiences
   */
  private extractCommonConditions(experiences: MaritimeExperience[]): Record<string, any> {
    // Average conditions
    const avgWind =
      experiences.reduce((sum, exp) => sum + exp.context.vessel_state.wind.speed, 0) / experiences.length;
    const avgDepth =
      experiences.reduce((sum, exp) => sum + exp.context.vessel_state.depth, 0) / experiences.length;

    return {
      wind_speed: Math.round(avgWind),
      depth: Math.round(avgDepth),
    };
  }

  /**
   * Determine typical outcome for a pattern
   */
  private determineTypicalOutcome(experiences: MaritimeExperience[]): string {
    const successCount = experiences.filter((exp) => exp.success).length;
    const successRate = successCount / experiences.length;

    if (successRate > 0.7) {
      return 'Usually successful';
    } else if (successRate > 0.4) {
      return 'Mixed results';
    } else {
      return 'Often problematic';
    }
  }

  /**
   * Calculate pattern confidence
   */
  private calculatePatternConfidence(experiences: MaritimeExperience[]): number {
    // More experiences = higher confidence
    const frequencyScore = Math.min(experiences.length / 10, 1);

    // Consistent outcomes = higher confidence
    const successCount = experiences.filter((exp) => exp.success).length;
    const consistency = Math.abs(successCount / experiences.length - 0.5) * 2;

    return (frequencyScore + consistency) / 2;
  }

  // ========================================================================
  // INSIGHT GENERATION
  // ========================================================================

  /**
   * Generate high-level insights from experience and lessons
   */
  private async generateInsights(
    experience: MaritimeExperience,
    lessons: LearningInsight[]
  ): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];

    // Cross-domain insights (e.g., weather affects anchoring)
    if (experience.type === 'anchoring' && experience.context.vessel_state.wind.speed > 20) {
      insights.push({
        concept: 'anchoring_in_wind',
        insight: 'High wind requires increased scope and careful anchorage selection',
        confidence: 0.8,
        applicability: ['strong_wind', 'anchoring'],
        supporting_experiences: [experience.id],
        created_at: new Date(),
      });
    }

    return insights;
  }

  // ========================================================================
  // QUERIES
  // ========================================================================

  /**
   * Get experiences by type
   */
  getExperiencesByType(type: ExperienceType): MaritimeExperience[] {
    return Array.from(this.experiences.values()).filter((exp) => exp.type === type);
  }

  /**
   * Get recent experiences
   */
  getRecentExperiences(limit: number = 10): MaritimeExperience[] {
    return Array.from(this.experiences.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get insights by concept
   */
  getInsightsByConcept(concept: string): LearningInsight[] {
    return this.insights.filter((insight) => insight.concept === concept);
  }

  /**
   * Get all detected patterns
   */
  getAllPatterns(): PatternDetection[] {
    return Array.from(this.patterns.values());
  }

  // ========================================================================
  // STATISTICS
  // ========================================================================

  getStatistics(): {
    total_experiences: number;
    experiences_by_type: Record<string, number>;
    success_rate: number;
    total_insights: number;
    total_patterns: number;
    learning_velocity: number; // Insights per experience
  } {
    const all_experiences = Array.from(this.experiences.values());

    const experiences_by_type: Record<string, number> = {};
    let successful = 0;

    for (const exp of all_experiences) {
      experiences_by_type[exp.type] = (experiences_by_type[exp.type] || 0) + 1;
      if (exp.success) {
        successful++;
      }
    }

    const success_rate = all_experiences.length > 0 ? successful / all_experiences.length : 0;
    const learning_velocity = all_experiences.length > 0 ? this.insights.length / all_experiences.length : 0;

    return {
      total_experiences: all_experiences.length,
      experiences_by_type,
      success_rate,
      total_insights: this.insights.length,
      total_patterns: this.patterns.size,
      learning_velocity,
    };
  }

  // ========================================================================
  // SEAL V2: SELF-EDIT GENERATION
  // ========================================================================

  /**
   * Generate self-edit directive based on experience
   * Model determines how to restructure learning for optimal performance
   */
  async generateSelfEdit(experience: MaritimeExperience): Promise<SelfEdit> {
    const performanceAnalysis = this.analyzePerformance(experience);

    // Determine edit type based on performance gaps
    let editType: SelfEdit['edit_type'];
    let directive: string;
    let rationale: string;
    let expectedImprovement: number;
    let toolInvocations: ToolInvocation[] | undefined;
    let hyperparams: SelfEdit['hyperparameters'] | undefined;

    if (performanceAnalysis.needs_data_augmentation) {
      editType = 'augmentation';
      directive = `Augment training data for ${experience.type} with similar scenarios`;
      rationale = `Low sample count (${performanceAnalysis.sample_count}) for this scenario type`;
      expectedImprovement = 0.15;
      toolInvocations = [
        {
          tool_name: 'scenario_generator',
          parameters: {
            type: experience.type,
            context: experience.context,
            variations: 5,
          },
          purpose: 'Generate synthetic training scenarios',
          timestamp: new Date(),
        },
      ];
    } else if (performanceAnalysis.needs_hyperparameter_tuning) {
      editType = 'hyperparameter';
      directive = `Adjust learning rate for ${experience.type} tasks`;
      rationale = `Performance plateaued (${performanceAnalysis.plateau_detected})`;
      expectedImprovement = 0.08;
      hyperparams = {
        learning_rate: this.hyperparameters.learning_rate * 0.8, // Reduce learning rate
        batch_size: Math.max(16, Math.floor(this.hyperparameters.batch_size * 0.75)),
      };
    } else if (performanceAnalysis.needs_restructuring) {
      editType = 'restructure';
      directive = `Restructure ${experience.type} knowledge representation`;
      rationale = `High error rate in similar contexts (${performanceAnalysis.error_rate}%)`;
      expectedImprovement = 0.12;
    } else {
      editType = 'gradient_update';
      directive = `Fine-tune weights for ${experience.type} based on recent performance`;
      rationale = `Standard gradient update with current performance: ${experience.performance_score}`;
      expectedImprovement = 0.05;
    }

    const selfEdit: SelfEdit = {
      id: `edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      experience_id: experience.id,
      edit_type: editType,
      directive,
      rationale,
      hyperparameters: hyperparams,
      tool_invocations: toolInvocations,
      expected_improvement: expectedImprovement,
      created_at: new Date(),
    };

    this.selfEdits.set(selfEdit.id, selfEdit);

    this.emit('seal:self_edit_generated', selfEdit);

    return selfEdit;
  }

  /**
   * Analyze performance to determine what type of self-edit is needed
   */
  private analyzePerformance(experience: MaritimeExperience): {
    needs_data_augmentation: boolean;
    needs_hyperparameter_tuning: boolean;
    needs_restructuring: boolean;
    sample_count: number;
    plateau_detected: boolean;
    error_rate: number;
  } {
    // Count similar experiences
    const similarExperiences = Array.from(this.experiences.values()).filter(
      (exp) => exp.type === experience.type
    );

    const sample_count = similarExperiences.length;
    const needs_data_augmentation = sample_count < 10;

    // Check for plateau (last 5 experiences have similar performance)
    const recent = similarExperiences.slice(-5);
    const recentScores = recent.map((e) => e.performance_score);
    const variance =
      recentScores.reduce((sum, score) => {
        const mean = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
        return sum + Math.pow(score - mean, 2);
      }, 0) / recentScores.length;
    const plateau_detected = variance < 0.01 && sample_count > 5;

    // Calculate error rate
    const failed = similarExperiences.filter((e) => !e.success).length;
    const error_rate = sample_count > 0 ? (failed / sample_count) * 100 : 0;
    const needs_restructuring = error_rate > 30;

    const needs_hyperparameter_tuning = plateau_detected && !needs_restructuring;

    return {
      needs_data_augmentation,
      needs_hyperparameter_tuning,
      needs_restructuring,
      sample_count,
      plateau_detected,
      error_rate,
    };
  }

  // ========================================================================
  // SEAL V2: RL-BASED LEARNING LOOP
  // ========================================================================

  /**
   * Execute RL learning iteration
   * Uses downstream performance as reward signal
   */
  async executeRLIteration(): Promise<LearningIteration> {
    this.currentIteration++;

    // Get recent experiences
    const recentExperiences = this.getRecentExperiences(this.hyperparameters.batch_size);

    let totalReward = 0;
    let selfEditsGenerated = 0;

    for (const experience of recentExperiences) {
      // Generate self-edit with exploration vs exploitation
      if (Math.random() < this.hyperparameters.exploration_rate) {
        // Explore: Generate self-edit
        const selfEdit = await this.generateSelfEdit(experience);
        selfEditsGenerated++;

        // Apply self-edit and measure reward
        const reward = await this.applySelfEditAndMeasureReward(experience, selfEdit);
        totalReward += reward.improvement;

        this.rewardSignals.push(reward);

        // Emit event
        this.emit('seal:self_edit_applied', {
          selfEdit,
          reward,
        });
      } else {
        // Exploit: Use current knowledge
        const reward = this.measurePerformance(experience);
        totalReward += reward;
      }
    }

    const averageReward = recentExperiences.length > 0 ? totalReward / recentExperiences.length : 0;

    // Calculate learning velocity (improvement over last iteration)
    const previousIteration = this.learningIterations[this.learningIterations.length - 1];
    const learning_velocity = previousIteration ? averageReward - previousIteration.average_reward : averageReward;

    // Adjust hyperparameters based on performance
    this.adjustHyperparameters(averageReward, learning_velocity);

    const iteration: LearningIteration = {
      id: `iteration_${this.currentIteration}`,
      iteration_number: this.currentIteration,
      experiences_processed: recentExperiences.length,
      self_edits_generated: selfEditsGenerated,
      average_reward: averageReward,
      learning_velocity,
      timestamp: new Date(),
    };

    this.learningIterations.push(iteration);

    this.emit('seal:iteration_completed', iteration);

    return iteration;
  }

  /**
   * Apply self-edit and measure downstream performance
   */
  private async applySelfEditAndMeasureReward(
    experience: MaritimeExperience,
    selfEdit: SelfEdit
  ): Promise<RewardSignal> {
    const performanceBefore = experience.performance_score;

    // Simulate applying self-edit
    // In production, this would actually update model weights or knowledge base
    let performanceAfter = performanceBefore;

    switch (selfEdit.edit_type) {
      case 'augmentation':
        // Data augmentation typically improves performance by 10-20%
        performanceAfter = Math.min(1.0, performanceBefore + 0.15);
        break;
      case 'hyperparameter':
        // Hyperparameter tuning typically improves by 5-10%
        performanceAfter = Math.min(1.0, performanceBefore + 0.08);
        break;
      case 'restructure':
        // Restructuring can improve by 10-15%
        performanceAfter = Math.min(1.0, performanceBefore + 0.12);
        break;
      case 'gradient_update':
        // Gradient updates typically improve by 3-5%
        performanceAfter = Math.min(1.0, performanceBefore + 0.05);
        break;
    }

    const improvement = performanceAfter - performanceBefore;

    const reward: RewardSignal = {
      experience_id: experience.id,
      self_edit_id: selfEdit.id,
      performance_before: performanceBefore,
      performance_after: performanceAfter,
      improvement,
      metric_type: 'success_rate',
      timestamp: new Date(),
    };

    return reward;
  }

  /**
   * Measure performance without self-edit (exploitation)
   */
  private measurePerformance(experience: MaritimeExperience): number {
    return experience.success ? experience.performance_score : -0.1; // Penalty for failure
  }

  /**
   * Adjust hyperparameters based on RL performance
   */
  private adjustHyperparameters(averageReward: number, learningVelocity: number): void {
    // If learning velocity is positive, we're improving - reduce exploration
    if (learningVelocity > 0.05) {
      this.hyperparameters.exploration_rate = Math.max(0.05, this.hyperparameters.exploration_rate * 0.95);
    } else if (learningVelocity < -0.05) {
      // If performance is degrading, increase exploration
      this.hyperparameters.exploration_rate = Math.min(0.3, this.hyperparameters.exploration_rate * 1.1);
    }

    // Adjust learning rate based on average reward
    if (averageReward > 0.8) {
      // High performance - reduce learning rate for stability
      this.hyperparameters.learning_rate *= 0.95;
    } else if (averageReward < 0.5) {
      // Low performance - increase learning rate to escape local minimum
      this.hyperparameters.learning_rate = Math.min(0.01, this.hyperparameters.learning_rate * 1.1);
    }

    this.emit('seal:hyperparameters_adjusted', this.hyperparameters);
  }

  // ========================================================================
  // SEAL V2: QUERIES
  // ========================================================================

  /**
   * Get SEAL v2 statistics
   */
  getSEALStatistics(): {
    total_self_edits: number;
    self_edits_by_type: Record<string, number>;
    average_improvement: number;
    current_hyperparameters: {
      learning_rate: number;
      batch_size: number;
      exploration_rate: number;
    };
    learning_iterations: number;
    current_learning_velocity: number;
  } {
    const allEdits = Array.from(this.selfEdits.values());
    const editsByType: Record<string, number> = {};

    for (const edit of allEdits) {
      editsByType[edit.edit_type] = (editsByType[edit.edit_type] || 0) + 1;
    }

    const averageImprovement =
      this.rewardSignals.length > 0
        ? this.rewardSignals.reduce((sum, r) => sum + r.improvement, 0) / this.rewardSignals.length
        : 0;

    const currentVelocity =
      this.learningIterations.length > 0
        ? this.learningIterations[this.learningIterations.length - 1].learning_velocity
        : 0;

    return {
      total_self_edits: allEdits.length,
      self_edits_by_type: editsByType,
      average_improvement: averageImprovement,
      current_hyperparameters: this.hyperparameters,
      learning_iterations: this.learningIterations.length,
      current_learning_velocity: currentVelocity,
    };
  }

  // ========================================================================
  // TABPFN-2.5: PUBLIC API
  // ========================================================================

  /**
   * Make a prediction using TabPFN few-shot learning
   * Best for: <10 samples, needs immediate prediction
   */
  async predictWithTabPFN(experience: MaritimeExperience): Promise<TabPFNPrediction> {
    if (!this.tabpfnEnabled) {
      throw new Error('TabPFN is disabled');
    }

    // Ensure we have training data
    const sampleCount = this.getExperiencesByType(experience.type).length;
    if (sampleCount === 0) {
      throw new Error('No training data available for TabPFN prediction');
    }

    // Make prediction
    const prediction = await this.tabpfn.predictFromExperience(experience);

    this.emit('tabpfn:prediction_requested', {
      experience_id: experience.id,
      type: experience.type,
      sample_count: sampleCount,
      confidence: prediction.confidence,
    });

    return prediction;
  }

  /**
   * Make a prediction using hybrid TabPFN + SEAL approach
   * Best for: 10-100 samples, needs both speed and insight
   */
  async predictWithHybrid(experience: MaritimeExperience): Promise<{
    tabpfn_prediction: TabPFNPrediction;
    seal_insight: SelfEdit;
    combined_confidence: number;
  }> {
    // Get TabPFN prediction
    const tabpfnPrediction = await this.predictWithTabPFN(experience);

    // Get SEAL self-edit insight
    const sealInsight = await this.generateSelfEdit(experience);

    // Combine confidences
    // TabPFN confidence + SEAL expected improvement
    const combinedConfidence = (tabpfnPrediction.confidence + (1 - sealInsight.expected_improvement)) / 2;

    return {
      tabpfn_prediction: tabpfnPrediction,
      seal_insight: sealInsight,
      combined_confidence: combinedConfidence,
    };
  }

  /**
   * Get TabPFN statistics
   */
  getTabPFNStatistics(): {
    enabled: boolean;
    training_samples: number;
    max_samples: number;
    predictions_cached: number;
    few_shot_threshold: number;
    hybrid_threshold: number;
    has_distilled_model: boolean;
  } {
    const stats = this.tabpfn.getStatistics();

    return {
      enabled: this.tabpfnEnabled,
      training_samples: stats.training_samples,
      max_samples: stats.max_samples,
      predictions_cached: stats.cache_size,
      few_shot_threshold: this.FEW_SHOT_THRESHOLD,
      hybrid_threshold: this.HYBRID_THRESHOLD,
      has_distilled_model: stats.has_distilled_model,
    };
  }

  /**
   * Get combined statistics (SEAL + TabPFN)
   */
  getCombinedStatistics() {
    // Count experiences by processing strategy
    const allExperiences = Array.from(this.experiences.values());
    let tabpfnCount = 0;
    let hybridCount = 0;
    let sealCount = 0;

    for (const exp of allExperiences) {
      const sampleCount = this.getExperiencesByType(exp.type).length;
      if (sampleCount < this.FEW_SHOT_THRESHOLD) {
        tabpfnCount++;
      } else if (sampleCount < this.HYBRID_THRESHOLD) {
        hybridCount++;
      } else {
        sealCount++;
      }
    }

    return {
      seal: this.getSEALStatistics(),
      tabpfn: this.getTabPFNStatistics(),
      experiences: this.getStatistics(),
      processing_strategy: {
        tabpfn_count: tabpfnCount,
        hybrid_count: hybridCount,
        seal_count: sealCount,
      },
    };
  }

  /**
   * Toggle TabPFN on/off
   */
  setTabPFNEnabled(enabled: boolean): void {
    this.tabpfnEnabled = enabled;
    this.emit('tabpfn:enabled_changed', { enabled });
  }

  /**
   * Distill TabPFN to faster model for production
   */
  async distillTabPFNModel(modelType: 'mlp' | 'xgboost' | 'random_forest') {
    return await this.tabpfn.distillToFastModel(modelType);
  }

  /**
   * Get recommended processing strategy for an experience type
   */
  getRecommendedStrategy(experienceType: ExperienceType): {
    strategy: 'tabpfn' | 'hybrid' | 'seal';
    reason: string;
    sample_count: number;
    confidence_threshold: number;
  } {
    const sampleCount = this.getExperiencesByType(experienceType).length;
    let strategy: 'tabpfn' | 'hybrid' | 'seal';
    let reason: string;

    if (sampleCount < this.FEW_SHOT_THRESHOLD && this.tabpfnEnabled) {
      strategy = 'tabpfn';
      reason = `Few samples (${sampleCount}/${this.FEW_SHOT_THRESHOLD}) - TabPFN excels with limited data`;
    } else if (sampleCount < this.HYBRID_THRESHOLD && this.tabpfnEnabled) {
      strategy = 'hybrid';
      reason = `Medium samples (${sampleCount}/${this.HYBRID_THRESHOLD}) - Hybrid combines TabPFN speed with SEAL depth`;
    } else {
      strategy = 'seal';
      reason = `Many samples (${sampleCount}) - SEAL RL optimization provides best performance`;
    }

    const confidenceThreshold = this.tabpfn.getConfidenceThreshold(sampleCount);

    return {
      strategy,
      reason,
      sample_count: sampleCount,
      confidence_threshold: confidenceThreshold,
    };
  }
}
