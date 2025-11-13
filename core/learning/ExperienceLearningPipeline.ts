/**
 * Experience Learning Pipeline
 * Converts experiences into knowledge and skills through SEAL integration
 */

import EventEmitter from 'events';
import { SkillTree, Skill, SkillCategory } from '../skills/SkillTree.js';
import { MaritimeKnowledgeBase } from '../knowledge/MaritimeKnowledgeBase.js';
import { Concept, MaritimeContext } from '../types/maritime-ontology.js';

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
// EXPERIENCE LEARNING PIPELINE
// ============================================================================

export class ExperienceLearningPipeline extends EventEmitter {
  private skillTree: SkillTree;
  private knowledgeBase: MaritimeKnowledgeBase;
  private experiences: Map<string, MaritimeExperience>;
  private patterns: Map<string, PatternDetection>;
  private insights: LearningInsight[];
  private processedExperiences: Set<string>;

  constructor(skillTree: SkillTree, knowledgeBase: MaritimeKnowledgeBase) {
    super();
    this.skillTree = skillTree;
    this.knowledgeBase = knowledgeBase;
    this.experiences = new Map();
    this.patterns = new Map();
    this.insights = [];
    this.processedExperiences = new Set();
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
   */
  private async processExperience(experience: MaritimeExperience): Promise<void> {
    if (this.processedExperiences.has(experience.id)) {
      return; // Already processed
    }

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

    // Mark as processed
    this.processedExperiences.add(experience.id);

    this.emit('experience:processed', {
      id: experience.id,
      lessons_learned: lessons.length,
      insights_generated: insights.length,
    });
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
}
