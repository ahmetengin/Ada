/**
 * Maritime Knowledge Base
 * Central repository of maritime domain knowledge for Ada agents
 */

import {
  Concept,
  ConceptCategory,
  ConceptRelationship,
  ConceptRule,
  KnowledgeQuery,
  MaritimeKnowledgeBase as IMaritimeKnowledgeBase,
  ReasoningChain,
  ReasoningStep,
  SituationAssessment,
  MaritimeContext,
  Risk,
  Opportunity,
  Recommendation,
} from '../types/maritime-ontology.js';
import EventEmitter from 'events';

export class MaritimeKnowledgeBase extends EventEmitter {
  private concepts: Map<string, Concept>;
  private relationships: Map<string, ConceptRelationship[]>;
  private rules: Map<string, ConceptRule[]>;
  private metadata: {
    version: string;
    last_updated: Date;
    concept_count: number;
    relationship_count: number;
  };

  constructor() {
    super();
    this.concepts = new Map();
    this.relationships = new Map();
    this.rules = new Map();
    this.metadata = {
      version: '1.0.0',
      last_updated: new Date(),
      concept_count: 0,
      relationship_count: 0,
    };

    // Initialize with base maritime knowledge
    this.initializeBaseKnowledge();
  }

  // ========================================================================
  // CONCEPT MANAGEMENT
  // ========================================================================

  addConcept(concept: Concept): void {
    this.concepts.set(concept.id, concept);

    // Store relationships
    if (concept.relationships.length > 0) {
      this.relationships.set(concept.id, concept.relationships);
      this.metadata.relationship_count += concept.relationships.length;
    }

    // Store rules
    if (concept.rules.length > 0) {
      this.rules.set(concept.id, concept.rules);
    }

    this.metadata.concept_count++;
    this.metadata.last_updated = new Date();

    this.emit('concept:added', concept);
  }

  getConcept(id: string): Concept | undefined {
    return this.concepts.get(id);
  }

  updateConcept(id: string, updates: Partial<Concept>): void {
    const concept = this.concepts.get(id);
    if (!concept) {
      throw new Error(`Concept ${id} not found`);
    }

    const updated = { ...concept, ...updates };
    this.concepts.set(id, updated);
    this.metadata.last_updated = new Date();

    this.emit('concept:updated', updated);
  }

  removeConcept(id: string): void {
    this.concepts.delete(id);
    this.relationships.delete(id);
    this.rules.delete(id);
    this.metadata.concept_count--;
    this.metadata.last_updated = new Date();

    this.emit('concept:removed', id);
  }

  // ========================================================================
  // QUERYING
  // ========================================================================

  query(query: KnowledgeQuery): Concept[] {
    let results = Array.from(this.concepts.values());

    // Filter by concept ID
    if (query.concept_id) {
      const concept = this.getConcept(query.concept_id);
      return concept ? [concept] : [];
    }

    // Filter by category
    if (query.category) {
      results = results.filter((c) => c.category === query.category);
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter((c) =>
        query.tags!.some((tag) => c.tags.includes(tag))
      );
    }

    // Filter by properties
    if (query.properties) {
      results = results.filter((c) => {
        for (const [key, value] of Object.entries(query.properties!)) {
          if (c.properties[key] !== value) {
            return false;
          }
        }
        return true;
      });
    }

    // Filter by relationships
    if (query.relationships) {
      results = results.filter((c) =>
        c.relationships.some(
          (r) =>
            r.type === query.relationships!.type &&
            (!query.relationships!.target || r.targetConcept === query.relationships!.target)
        )
      );
    }

    // Apply limit
    if (query.limit && query.limit > 0) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  // Find concepts related to a given concept
  findRelated(conceptId: string, maxDepth: number = 2): Concept[] {
    const visited = new Set<string>();
    const results: Concept[] = [];

    const traverse = (id: string, depth: number) => {
      if (depth > maxDepth || visited.has(id)) {
        return;
      }

      visited.add(id);
      const concept = this.getConcept(id);
      if (!concept) {
        return;
      }

      if (depth > 0) {
        results.push(concept);
      }

      // Traverse relationships
      const rels = this.relationships.get(id) || [];
      for (const rel of rels) {
        traverse(rel.targetConcept, depth + 1);
      }
    };

    traverse(conceptId, 0);
    return results;
  }

  // ========================================================================
  // REASONING
  // ========================================================================

  reason(question: string, context: MaritimeContext): ReasoningChain {
    const steps: ReasoningStep[] = [];
    const concepts_used: string[] = [];
    const rules_applied: string[] = [];

    // Simple reasoning implementation
    // In production, this would use LLM + knowledge graph

    // Extract keywords from question
    const keywords = this.extractKeywords(question);

    // Find relevant concepts
    const relevantConcepts = this.findRelevantConcepts(keywords, context);

    let step_number = 1;
    for (const concept of relevantConcepts) {
      concepts_used.push(concept.id);

      steps.push({
        step_number: step_number++,
        description: `Considering ${concept.name}: ${concept.description}`,
        concept: concept.id,
        confidence: 0.8,
      });

      // Apply rules
      const concept_rules = this.rules.get(concept.id) || [];
      for (const rule of concept_rules) {
        if (this.evaluateRuleCondition(rule.condition, context)) {
          rules_applied.push(rule.action);
          steps.push({
            step_number: step_number++,
            description: `Rule applied: ${rule.explanation}`,
            concept: concept.id,
            rule: rule.action,
            confidence: 0.9,
          });
        }
      }
    }

    // Generate conclusion
    const conclusion = this.generateConclusion(steps, context);

    return {
      query: question,
      steps,
      conclusion,
      confidence: this.calculateOverallConfidence(steps),
      concepts_used,
      rules_applied,
    };
  }

  // ========================================================================
  // SITUATION ASSESSMENT
  // ========================================================================

  assessSituation(context: MaritimeContext): SituationAssessment {
    const risks = this.identifyRisks(context);
    const opportunities = this.identifyOpportunities(context);
    const recommendations = this.generateRecommendations(context, risks, opportunities);

    // Determine urgency
    const criticalRisks = risks.filter((r) => r.severity === 'critical');
    const highRisks = risks.filter((r) => r.severity === 'high');

    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (criticalRisks.length > 0) {
      urgency = 'critical';
    } else if (highRisks.length > 0) {
      urgency = 'high';
    } else if (risks.length > 0) {
      urgency = 'medium';
    }

    const reasoning = this.reason('What should I do in this situation?', context);

    return {
      context,
      risks,
      opportunities,
      recommendations,
      urgency,
      reasoning,
    };
  }

  private identifyRisks(context: MaritimeContext): Risk[] {
    const risks: Risk[] = [];

    // Wind-related risks
    if (context.vessel_state.wind.speed > 25) {
      risks.push({
        type: 'high_wind',
        severity: context.vessel_state.wind.speed > 35 ? 'critical' : 'high',
        probability: 0.9,
        description: `Wind speed ${context.vessel_state.wind.speed} knots exceeds safe limits`,
        mitigation: ['Reef sails', 'Seek shelter', 'Reduce speed'],
        time_to_impact: 0,
      });
    }

    // Shallow water risk
    if (context.vessel_state.depth < 5) {
      risks.push({
        type: 'shallow_water',
        severity: context.vessel_state.depth < 2 ? 'critical' : 'medium',
        probability: 0.8,
        description: `Water depth ${context.vessel_state.depth}m is shallow`,
        mitigation: ['Reduce speed', 'Check charts', 'Post lookout'],
      });
    }

    // Night navigation risk
    if (!context.time.daylight && context.vessel_state.speed > 4) {
      risks.push({
        type: 'night_navigation',
        severity: 'medium',
        probability: 0.6,
        description: 'Navigating at night requires extra caution',
        mitigation: ['Reduce speed', 'Extra vigilance', 'Radar watch'],
      });
    }

    return risks;
  }

  private identifyOpportunities(context: MaritimeContext): Opportunity[] {
    const opportunities: Opportunity[] = [];

    // Good sailing conditions
    if (
      context.vessel_state.wind.speed >= 10 &&
      context.vessel_state.wind.speed <= 20 &&
      context.time.daylight
    ) {
      opportunities.push({
        type: 'optimal_sailing',
        benefit: 'Excellent sailing conditions',
        description: `Wind ${context.vessel_state.wind.speed} knots, daylight`,
        how_to_capture: ['Set full sails', 'Optimize course', 'Enjoy the sail'],
        window: 3600 * 4, // 4 hours estimate
      });
    }

    return opportunities;
  }

  private generateRecommendations(
    context: MaritimeContext,
    risks: Risk[],
    opportunities: Opportunity[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Risk-based recommendations
    for (const risk of risks) {
      if (risk.severity === 'critical' || risk.severity === 'high') {
        recommendations.push({
          action: risk.mitigation[0],
          reasoning: risk.description,
          priority: risk.severity === 'critical' ? 10 : 8,
          confidence: risk.probability,
          estimated_impact: `Reduces ${risk.type} risk`,
          alternative_actions: risk.mitigation.slice(1),
        });
      }
    }

    // Opportunity-based recommendations
    for (const opp of opportunities) {
      recommendations.push({
        action: opp.how_to_capture[0],
        reasoning: opp.description,
        priority: 5,
        confidence: 0.7,
        estimated_impact: opp.benefit,
        alternative_actions: opp.how_to_capture.slice(1),
      });
    }

    // Sort by priority
    recommendations.sort((a, b) => b.priority - a.priority);

    return recommendations;
  }

  // ========================================================================
  // HELPERS
  // ========================================================================

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const words = text.toLowerCase().split(/\s+/);
    const stopwords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'should', 'i', 'we'];
    return words.filter((w) => !stopwords.includes(w) && w.length > 2);
  }

  private findRelevantConcepts(keywords: string[], context: MaritimeContext): Concept[] {
    const results: Concept[] = [];

    // Search concepts by tags and description
    for (const concept of this.concepts.values()) {
      let score = 0;

      // Check tags
      for (const keyword of keywords) {
        if (concept.tags.some((tag) => tag.includes(keyword))) {
          score += 2;
        }
        if (concept.name.toLowerCase().includes(keyword)) {
          score += 3;
        }
        if (concept.description.toLowerCase().includes(keyword)) {
          score += 1;
        }
      }

      if (score > 0) {
        results.push(concept);
      }
    }

    // Sort by relevance (simple scoring)
    results.sort((a, b) => {
      const scoreA = a.tags.filter((t) => keywords.includes(t)).length;
      const scoreB = b.tags.filter((t) => keywords.includes(t)).length;
      return scoreB - scoreA;
    });

    return results.slice(0, 5); // Top 5
  }

  private evaluateRuleCondition(condition: string, context: MaritimeContext): boolean {
    // Simple condition evaluation
    // In production, use proper expression evaluator

    if (condition.includes('wind > 25')) {
      return context.vessel_state.wind.speed > 25;
    }
    if (condition.includes('depth < 5')) {
      return context.vessel_state.depth < 5;
    }
    if (condition.includes('night')) {
      return !context.time.daylight;
    }

    return false;
  }

  private generateConclusion(steps: ReasoningStep[], context: MaritimeContext): string {
    if (steps.length === 0) {
      return 'No relevant information found.';
    }

    // Simple conclusion generation
    const mainConcepts = steps.slice(0, 3).map((s) => s.description);
    return `Based on analysis: ${mainConcepts.join('; ')}`;
  }

  private calculateOverallConfidence(steps: ReasoningStep[]): number {
    if (steps.length === 0) {
      return 0;
    }
    const sum = steps.reduce((acc, step) => acc + step.confidence, 0);
    return sum / steps.length;
  }

  // ========================================================================
  // BASE KNOWLEDGE INITIALIZATION
  // ========================================================================

  private initializeBaseKnowledge(): void {
    // Wind concept
    this.addConcept({
      id: 'wind',
      name: 'Wind',
      category: 'weather',
      description: 'Moving air that affects vessel performance and safety',
      properties: {
        types: ['true_wind', 'apparent_wind'],
        measurements: ['speed', 'direction', 'gusts'],
        effects: ['sail_choice', 'reefing', 'route_planning', 'anchoring'],
        danger_thresholds: {
          light: 10,
          moderate: 16,
          fresh: 21,
          strong: 27,
          gale: 33,
          storm: 40,
        },
      },
      relationships: [
        {
          type: 'causes',
          targetConcept: 'sail_reefing',
          strength: 0.9,
          bidirectional: false,
        },
        {
          type: 'affects',
          targetConcept: 'anchoring',
          strength: 0.8,
          bidirectional: false,
        },
      ],
      rules: [
        {
          condition: 'wind > 25',
          action: 'reef_sails',
          priority: 8,
          explanation: 'Wind speed above 25 knots requires reefing',
        },
        {
          condition: 'wind > 35',
          action: 'seek_shelter',
          priority: 9,
          explanation: 'Wind speed above 35 knots requires seeking shelter',
        },
      ],
      tags: ['weather', 'wind', 'safety', 'sailing'],
    });

    // Anchoring concept
    this.addConcept({
      id: 'anchoring',
      name: 'Anchoring',
      category: 'anchoring',
      description: 'Securing vessel with anchor and chain',
      properties: {
        seabed_types: ['sand', 'mud', 'rock', 'coral', 'weed'],
        holding_quality: {
          sand: 'excellent',
          mud: 'good',
          rock: 'poor',
          coral: 'poor',
          weed: 'very_poor',
        },
        scope_ratios: {
          calm: 5,
          moderate: 7,
          strong: 8,
          storm: 10,
        },
        considerations: ['depth', 'tide', 'swing_radius', 'shelter', 'bottom'],
      },
      relationships: [
        {
          type: 'requires',
          targetConcept: 'depth_knowledge',
          strength: 1.0,
          bidirectional: false,
        },
        {
          type: 'requires',
          targetConcept: 'wind_knowledge',
          strength: 0.9,
          bidirectional: false,
        },
      ],
      rules: [
        {
          condition: 'wind > 20',
          action: 'increase_scope',
          priority: 7,
          explanation: 'High wind requires more scope for better holding',
        },
        {
          condition: 'rocky_bottom',
          action: 'find_alternative',
          priority: 8,
          explanation: 'Rocky bottom provides poor holding',
        },
      ],
      tags: ['anchoring', 'seamanship', 'safety'],
    });

    // Emergency concepts
    this.addConcept({
      id: 'man_overboard',
      name: 'Man Overboard',
      category: 'emergency',
      description: 'Emergency situation when crew member falls overboard',
      properties: {
        type: 'man_overboard',
        severity: 'critical',
        priorities: ['Alert crew', 'Mark position', 'Turn vessel', 'Keep visual contact', 'Recover person'],
        immediate_actions: [
          {
            action: 'Shout "Man Overboard"',
            when: 'Immediately',
            priority: 10,
            estimated_time: 1,
            requires_assistance: false,
          },
          {
            action: 'Press MOB button on GPS',
            when: 'Immediately',
            priority: 10,
            estimated_time: 2,
            requires_assistance: false,
          },
          {
            action: 'Throw life ring',
            when: 'Within 3 seconds',
            priority: 9,
            estimated_time: 3,
            requires_assistance: false,
          },
        ],
      },
      relationships: [
        {
          type: 'requires',
          targetConcept: 'crew_drill',
          strength: 0.9,
          bidirectional: false,
        },
      ],
      rules: [
        {
          condition: 'mob_detected',
          action: 'execute_mob_procedure',
          priority: 10,
          explanation: 'Man overboard is highest priority emergency',
        },
      ],
      tags: ['emergency', 'safety', 'crew', 'mob'],
    });

    this.emit('knowledge:initialized', {
      concept_count: this.metadata.concept_count,
      relationship_count: this.metadata.relationship_count,
    });
  }

  // ========================================================================
  // EXPORT / IMPORT
  // ========================================================================

  export(): IMaritimeKnowledgeBase {
    return {
      concepts: this.concepts,
      relationships: this.relationships,
      rules: this.rules,
      metadata: this.metadata,
    };
  }

  import(data: IMaritimeKnowledgeBase): void {
    this.concepts = data.concepts;
    this.relationships = data.relationships;
    this.rules = data.rules;
    this.metadata = data.metadata;

    this.emit('knowledge:imported', this.metadata);
  }

  // ========================================================================
  // STATISTICS
  // ========================================================================

  getStatistics(): {
    total_concepts: number;
    concepts_by_category: Record<string, number>;
    total_relationships: number;
    total_rules: number;
    most_connected_concepts: Array<{ concept: string; connections: number }>;
  } {
    const concepts_by_category: Record<string, number> = {};

    for (const concept of this.concepts.values()) {
      concepts_by_category[concept.category] =
        (concepts_by_category[concept.category] || 0) + 1;
    }

    // Find most connected concepts
    const connections = new Map<string, number>();
    for (const [id, rels] of this.relationships.entries()) {
      connections.set(id, rels.length);
    }

    const most_connected = Array.from(connections.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([concept, connections]) => ({ concept, connections }));

    let total_rules = 0;
    for (const rules of this.rules.values()) {
      total_rules += rules.length;
    }

    return {
      total_concepts: this.metadata.concept_count,
      concepts_by_category,
      total_relationships: this.metadata.relationship_count,
      total_rules,
      most_connected_concepts: most_connected,
    };
  }
}
