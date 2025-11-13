/**
 * Maritime Domain Ontology
 * Defines concepts, relationships, and rules that Ada must know
 */

// ============================================================================
// CORE CONCEPTS
// ============================================================================

export interface Concept {
  id: string;
  name: string;
  category: ConceptCategory;
  description: string;
  properties: Record<string, any>;
  relationships: ConceptRelationship[];
  rules: ConceptRule[];
  tags: string[];
}

export type ConceptCategory =
  | 'weather'
  | 'navigation'
  | 'seamanship'
  | 'anchoring'
  | 'emergency'
  | 'sailing'
  | 'vessel'
  | 'communication'
  | 'regulation';

export interface ConceptRelationship {
  type: RelationshipType;
  targetConcept: string;
  strength: number; // 0-1
  bidirectional: boolean;
  metadata?: Record<string, any>;
}

export type RelationshipType =
  | 'requires' // A requires B
  | 'causes' // A causes B
  | 'prevents' // A prevents B
  | 'indicates' // A indicates B
  | 'part_of' // A is part of B
  | 'leads_to' // A leads to B
  | 'conflicts_with' // A conflicts with B
  | 'enhances' // A enhances B
  | 'affects'; // A affects B

export interface ConceptRule {
  condition: string; // Logical expression
  action: string; // What to do
  priority: number; // 0-10
  explanation: string;
}

// ============================================================================
// WEATHER CONCEPTS
// ============================================================================

export interface WindConcept extends Concept {
  category: 'weather';
  properties: {
    types: ('true_wind' | 'apparent_wind')[];
    measurements: ('speed' | 'direction' | 'gusts')[];
    effects: string[];
    danger_thresholds: {
      light: number; // < 10 knots
      moderate: number; // 10-16 knots
      fresh: number; // 17-21 knots
      strong: number; // 22-27 knots
      gale: number; // 28-33 knots
      storm: number; // > 34 knots
    };
    sailing_recommendations: Record<string, string>;
  };
}

export interface WeatherPatternConcept extends Concept {
  category: 'weather';
  properties: {
    region: string; // e.g., "Aegean", "Mediterranean"
    season: 'summer' | 'winter' | 'spring' | 'autumn';
    typical_winds: {
      name: string; // e.g., "Meltemi", "Poyraz"
      direction: number; // degrees
      typical_strength: number; // knots
      time_of_day: string;
      season_months: number[];
    }[];
    predictability: number; // 0-1
  };
}

// ============================================================================
// ANCHORING CONCEPTS
// ============================================================================

export interface AnchoringConcept extends Concept {
  category: 'anchoring';
  properties: {
    seabed_types: SeabedType[];
    holding_quality: Record<SeabedType, HoldingQuality>;
    scope_ratios: Record<string, number>;
    considerations: string[];
    techniques: AnchoringTechnique[];
  };
}

export type SeabedType = 'sand' | 'mud' | 'rock' | 'coral' | 'weed' | 'clay' | 'gravel' | 'mixed';

export type HoldingQuality = 'excellent' | 'good' | 'moderate' | 'poor' | 'very_poor';

export interface AnchoringTechnique {
  name: string;
  description: string;
  when_to_use: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  success_factors: string[];
}

export interface AnchorageConcept extends Concept {
  category: 'anchoring';
  properties: {
    location: {
      latitude: number;
      longitude: number;
      name?: string;
    };
    holding: HoldingQuality;
    bottom: SeabedType;
    depth_range: { min: number; max: number };
    shelter: {
      from_directions: number[]; // Wind directions it's protected from
      exposure: number[]; // Wind directions it's exposed to
    };
    hazards: string[];
    capacity: number; // Estimated number of vessels
    popularity: number; // 0-1
    facilities: string[];
    restrictions: string[];
  };
}

// ============================================================================
// NAVIGATION CONCEPTS
// ============================================================================

export interface NavigationConcept extends Concept {
  category: 'navigation';
  properties: {
    techniques: NavigationTechnique[];
    rules: string[]; // COLREG, local regulations
    safety_margins: {
      shallow_water: number; // meters clearance
      lee_shore: number; // nautical miles
      other_vessels: number; // nautical miles
      rocks: number; // meters
    };
    passage_planning_elements: string[];
  };
}

export type NavigationTechnique =
  | 'coastal_navigation'
  | 'offshore_navigation'
  | 'pilotage'
  | 'electronic_navigation'
  | 'celestial_navigation'
  | 'dead_reckoning';

export interface HazardConcept extends Concept {
  category: 'navigation';
  properties: {
    type: 'rock' | 'shallow' | 'reef' | 'wreck' | 'traffic' | 'restricted_area';
    severity: 'low' | 'medium' | 'high' | 'critical';
    location?: {
      latitude: number;
      longitude: number;
      radius?: number; // meters
    };
    avoidance_distance: number; // meters
    time_dependent: boolean; // e.g., shallow only at low tide
    conditions: string[]; // When is it dangerous
  };
}

// ============================================================================
// EMERGENCY CONCEPTS
// ============================================================================

export interface EmergencyConcept extends Concept {
  category: 'emergency';
  properties: {
    type: EmergencyType;
    severity: 'minor' | 'moderate' | 'major' | 'critical';
    priorities: string[]; // Ordered list
    immediate_actions: EmergencyAction[];
    communication_protocol: string[];
    equipment_needed: string[];
    decision_tree: EmergencyDecisionNode;
  };
}

export type EmergencyType =
  | 'man_overboard'
  | 'fire'
  | 'flooding'
  | 'grounding'
  | 'collision'
  | 'dismasting'
  | 'medical'
  | 'machinery_failure'
  | 'loss_of_steering';

export interface EmergencyAction {
  action: string;
  when: string; // Condition
  priority: number;
  estimated_time: number; // seconds
  requires_assistance: boolean;
}

export interface EmergencyDecisionNode {
  question: string;
  yes: EmergencyDecisionNode | EmergencyAction[];
  no: EmergencyDecisionNode | EmergencyAction[];
}

// ============================================================================
// SAILING CONCEPTS
// ============================================================================

export interface SailingConcept extends Concept {
  category: 'sailing';
  properties: {
    sail_types: SailType[];
    points_of_sail: PointOfSail[];
    sail_combinations: SailCombination[];
    reefing_guidelines: ReefingGuideline[];
    performance_factors: string[];
  };
}

export type SailType = 'mainsail' | 'genoa' | 'jib' | 'spinnaker' | 'gennaker' | 'staysail' | 'storm_jib';

export type PointOfSail =
  | 'in_irons'
  | 'close_hauled'
  | 'close_reach'
  | 'beam_reach'
  | 'broad_reach'
  | 'running'
  | 'dead_downwind';

export interface SailCombination {
  sails: SailType[];
  wind_range: { min: number; max: number }; // knots
  point_of_sail: PointOfSail[];
  sea_state: 'calm' | 'moderate' | 'rough' | 'very_rough';
  performance: 'optimal' | 'good' | 'acceptable' | 'poor';
}

export interface ReefingGuideline {
  wind_speed_trigger: number; // knots
  reef_number: number; // 1st, 2nd, 3rd reef
  sail: SailType;
  when: string; // Additional conditions
  expected_performance: string;
}

// ============================================================================
// REGULATION CONCEPTS
// ============================================================================

export interface RegulationConcept extends Concept {
  category: 'regulation';
  properties: {
    authority: string; // IMO, local port authority, etc.
    applies_to: string[]; // Vessel types, areas
    rule_text: string;
    penalties: string[];
    priority: number; // 0-10, higher = more critical
    geographical_scope?: {
      region: string;
      coordinates?: Array<{ lat: number; lon: number }>;
    };
  };
}

// ============================================================================
// KNOWLEDGE BASE STRUCTURE
// ============================================================================

export interface MaritimeKnowledgeBase {
  concepts: Map<string, Concept>;
  relationships: Map<string, ConceptRelationship[]>;
  rules: Map<string, ConceptRule[]>;
  metadata: {
    version: string;
    last_updated: Date;
    concept_count: number;
    relationship_count: number;
  };
}

// ============================================================================
// QUERY & REASONING
// ============================================================================

export interface KnowledgeQuery {
  concept_id?: string;
  category?: ConceptCategory;
  tags?: string[];
  properties?: Record<string, any>;
  relationships?: {
    type: RelationshipType;
    target?: string;
  };
  limit?: number;
}

export interface ReasoningChain {
  query: string;
  steps: ReasoningStep[];
  conclusion: string;
  confidence: number;
  concepts_used: string[];
  rules_applied: string[];
}

export interface ReasoningStep {
  step_number: number;
  description: string;
  concept: string;
  rule?: string;
  confidence: number;
}

// ============================================================================
// CONTEXT & SITUATION
// ============================================================================

export interface MaritimeContext {
  vessel_state: {
    position: { latitude: number; longitude: number };
    heading: number;
    speed: number;
    wind: { speed: number; direction: number };
    sea_state: number;
    depth: number;
  };
  weather: {
    current: any;
    forecast: any;
  };
  voyage: {
    destination?: string;
    waypoints: any[];
    eta?: Date;
  };
  crew: {
    on_watch: number;
    total: number;
    experience_level: 'novice' | 'competent' | 'expert';
  };
  time: {
    local: Date;
    daylight: boolean;
  };
}

export interface SituationAssessment {
  context: MaritimeContext;
  risks: Risk[];
  opportunities: Opportunity[];
  recommendations: Recommendation[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reasoning: ReasoningChain;
}

export interface Risk {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number; // 0-1
  description: string;
  mitigation: string[];
  time_to_impact?: number; // seconds
}

export interface Opportunity {
  type: string;
  benefit: string;
  description: string;
  how_to_capture: string[];
  window: number; // seconds remaining
}

export interface Recommendation {
  action: string;
  reasoning: string;
  priority: number; // 0-10
  confidence: number; // 0-1
  estimated_impact: string;
  alternative_actions: string[];
}
