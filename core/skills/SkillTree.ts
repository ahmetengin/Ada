/**
 * Skill Tree System
 * Manages Ada's maritime skills and progression
 */

import EventEmitter from 'events';

// ============================================================================
// SKILL TYPES
// ============================================================================

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  level: number; // 0-100
  experience: number; // XP points
  maxExperience: number; // XP needed for current level
  prerequisites: string[]; // Skill IDs that must be unlocked first
  subskills: Skill[];
  unlocked: boolean;
  metadata: {
    firstUnlocked?: Date;
    lastUsed?: Date;
    timesUsed: number;
    successRate: number; // 0-1
  };
}

export type SkillCategory =
  | 'navigation'
  | 'weather_analysis'
  | 'seamanship'
  | 'anchoring'
  | 'sailing'
  | 'emergency'
  | 'communication'
  | 'maintenance';

export interface SkillProgression {
  skill_id: string;
  old_level: number;
  new_level: number;
  xp_gained: number;
  reason: string;
  timestamp: Date;
}

export interface SkillProficiency {
  novice: { level: number; description: string };
  competent: { level: number; description: string };
  proficient: { level: number; description: string };
  expert: { level: number; description: string };
  master: { level: number; description: string };
}

// ============================================================================
// SKILL TREE
// ============================================================================

export class SkillTree extends EventEmitter {
  private skills: Map<string, Skill>;
  private progressionHistory: SkillProgression[];

  // XP curve: exponential growth
  private readonly XP_BASE = 100;
  private readonly XP_MULTIPLIER = 1.5;

  // Proficiency levels
  private readonly PROFICIENCY_LEVELS: SkillProficiency = {
    novice: { level: 0, description: 'Just starting to learn' },
    competent: { level: 25, description: 'Can perform basic tasks' },
    proficient: { level: 50, description: 'Skilled and reliable' },
    expert: { level: 75, description: 'Highly experienced' },
    master: { level: 90, description: 'World-class expertise' },
  };

  constructor() {
    super();
    this.skills = new Map();
    this.progressionHistory = [];

    // Initialize skill tree
    this.initializeSkillTree();
  }

  // ========================================================================
  // SKILL MANAGEMENT
  // ========================================================================

  addSkill(skill: Skill): void {
    skill.maxExperience = this.calculateMaxXP(skill.level);
    this.skills.set(skill.id, skill);
    this.emit('skill:added', skill);
  }

  getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  getSkillsByCategory(category: SkillCategory): Skill[] {
    return Array.from(this.skills.values()).filter((s) => s.category === category);
  }

  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  // ========================================================================
  // SKILL PROGRESSION
  // ========================================================================

  /**
   * Award experience points to a skill
   */
  awardExperience(skillId: string, xp: number, reason: string): SkillProgression | null {
    const skill = this.getSkill(skillId);
    if (!skill || !skill.unlocked) {
      return null;
    }

    const oldLevel = skill.level;
    skill.experience += xp;
    skill.metadata.timesUsed++;
    skill.metadata.lastUsed = new Date();

    // Check for level up
    while (skill.experience >= skill.maxExperience && skill.level < 100) {
      this.levelUp(skill);
    }

    const progression: SkillProgression = {
      skill_id: skillId,
      old_level: oldLevel,
      new_level: skill.level,
      xp_gained: xp,
      reason,
      timestamp: new Date(),
    };

    this.progressionHistory.push(progression);
    this.emit('skill:experience', progression);

    return progression;
  }

  /**
   * Level up a skill
   */
  private levelUp(skill: Skill): void {
    const oldLevel = skill.level;

    // Subtract XP needed for level up
    skill.experience -= skill.maxExperience;
    skill.level = Math.min(100, skill.level + 1);

    // Calculate new XP requirement
    skill.maxExperience = this.calculateMaxXP(skill.level);

    this.emit('skill:levelup', {
      skill_id: skill.id,
      skill_name: skill.name,
      old_level: oldLevel,
      new_level: skill.level,
      proficiency: this.getProficiencyLevel(skill.level),
    });

    // Check if this unlocks new skills
    this.checkUnlocks(skill.id);
  }

  /**
   * Calculate max XP required for a level
   */
  private calculateMaxXP(level: number): number {
    return Math.floor(this.XP_BASE * Math.pow(this.XP_MULTIPLIER, level / 10));
  }

  /**
   * Check if any skills should be unlocked
   */
  private checkUnlocks(unlockedSkillId: string): void {
    for (const skill of this.skills.values()) {
      if (!skill.unlocked && this.canUnlock(skill)) {
        this.unlockSkill(skill.id);
      }
    }
  }

  /**
   * Check if a skill's prerequisites are met
   */
  private canUnlock(skill: Skill): boolean {
    if (skill.prerequisites.length === 0) {
      return true;
    }

    return skill.prerequisites.every((prereqId) => {
      const prereq = this.getSkill(prereqId);
      return prereq && prereq.unlocked && prereq.level >= 25; // Must be at least competent
    });
  }

  /**
   * Unlock a skill
   */
  unlockSkill(skillId: string): void {
    const skill = this.getSkill(skillId);
    if (!skill || skill.unlocked) {
      return;
    }

    skill.unlocked = true;
    skill.metadata.firstUnlocked = new Date();

    this.emit('skill:unlocked', {
      skill_id: skill.id,
      skill_name: skill.name,
      category: skill.category,
    });

    // Recursively unlock subskills if they have no other prerequisites
    for (const subskill of skill.subskills) {
      if (this.canUnlock(subskill)) {
        this.unlockSkill(subskill.id);
      }
    }
  }

  // ========================================================================
  // SKILL USAGE
  // ========================================================================

  /**
   * Record skill usage and update success rate
   */
  recordSkillUsage(skillId: string, success: boolean, xpGain: number): void {
    const skill = this.getSkill(skillId);
    if (!skill) {
      return;
    }

    // Update success rate (moving average)
    const oldRate = skill.metadata.successRate;
    const newRate =
      (oldRate * skill.metadata.timesUsed + (success ? 1 : 0)) /
      (skill.metadata.timesUsed + 1);

    skill.metadata.successRate = newRate;

    // Award XP (more for success, less for failure)
    const actualXP = success ? xpGain : xpGain * 0.5;
    this.awardExperience(skillId, actualXP, success ? 'Successful usage' : 'Learning from failure');
  }

  // ========================================================================
  // SKILL QUERIES
  // ========================================================================

  getProficiencyLevel(level: number): keyof SkillProficiency {
    if (level >= 90) return 'master';
    if (level >= 75) return 'expert';
    if (level >= 50) return 'proficient';
    if (level >= 25) return 'competent';
    return 'novice';
  }

  getSkillProficiency(skillId: string): keyof SkillProficiency | null {
    const skill = this.getSkill(skillId);
    if (!skill) {
      return null;
    }
    return this.getProficiencyLevel(skill.level);
  }

  /**
   * Get overall agent competence score (0-100)
   */
  getOverallCompetence(): number {
    const unlockedSkills = Array.from(this.skills.values()).filter((s) => s.unlocked);
    if (unlockedSkills.length === 0) {
      return 0;
    }

    const totalLevel = unlockedSkills.reduce((sum, skill) => sum + skill.level, 0);
    return totalLevel / unlockedSkills.length;
  }

  /**
   * Get skills sorted by level
   */
  getTopSkills(limit: number = 5): Skill[] {
    return Array.from(this.skills.values())
      .filter((s) => s.unlocked)
      .sort((a, b) => b.level - a.level)
      .slice(0, limit);
  }

  /**
   * Get skills that need improvement
   */
  getWeakSkills(limit: number = 5): Skill[] {
    return Array.from(this.skills.values())
      .filter((s) => s.unlocked)
      .sort((a, b) => a.level - b.level)
      .slice(0, limit);
  }

  /**
   * Find skills related to a concept
   */
  findRelatedSkills(tags: string[]): Skill[] {
    return Array.from(this.skills.values()).filter((skill) =>
      tags.some(
        (tag) =>
          skill.name.toLowerCase().includes(tag.toLowerCase()) ||
          skill.description.toLowerCase().includes(tag.toLowerCase())
      )
    );
  }

  // ========================================================================
  // STATISTICS
  // ========================================================================

  getStatistics(): {
    total_skills: number;
    unlocked_skills: number;
    skills_by_category: Record<SkillCategory, number>;
    overall_competence: number;
    proficiency_distribution: Record<string, number>;
    top_skills: Array<{ name: string; level: number; proficiency: string }>;
    recent_progressions: SkillProgression[];
  } {
    const all_skills = Array.from(this.skills.values());
    const unlocked = all_skills.filter((s) => s.unlocked);

    const skills_by_category: Record<SkillCategory, number> = {
      navigation: 0,
      weather_analysis: 0,
      seamanship: 0,
      anchoring: 0,
      sailing: 0,
      emergency: 0,
      communication: 0,
      maintenance: 0,
    };

    for (const skill of unlocked) {
      skills_by_category[skill.category]++;
    }

    const proficiency_distribution: Record<string, number> = {
      novice: 0,
      competent: 0,
      proficient: 0,
      expert: 0,
      master: 0,
    };

    for (const skill of unlocked) {
      const prof = this.getProficiencyLevel(skill.level);
      proficiency_distribution[prof]++;
    }

    const top_skills = this.getTopSkills(10).map((s) => ({
      name: s.name,
      level: s.level,
      proficiency: this.getProficiencyLevel(s.level),
    }));

    const recent_progressions = this.progressionHistory
      .slice(-20)
      .reverse();

    return {
      total_skills: all_skills.length,
      unlocked_skills: unlocked.length,
      skills_by_category,
      overall_competence: this.getOverallCompetence(),
      proficiency_distribution,
      top_skills,
      recent_progressions,
    };
  }

  // ========================================================================
  // SKILL TREE INITIALIZATION
  // ========================================================================

  private initializeSkillTree(): void {
    // ====================================================================
    // NAVIGATION SKILLS
    // ====================================================================

    this.addSkill({
      id: 'navigation_basic',
      name: 'Basic Navigation',
      category: 'navigation',
      description: 'Fundamental navigation principles and chart reading',
      level: 0,
      experience: 0,
      maxExperience: 100,
      prerequisites: [],
      subskills: [],
      unlocked: true, // Always unlocked at start
      metadata: {
        timesUsed: 0,
        successRate: 0,
      },
    });

    this.addSkill({
      id: 'position_fixing',
      name: 'Position Fixing',
      category: 'navigation',
      description: 'Determine vessel position using GPS and traditional methods',
      level: 0,
      experience: 0,
      maxExperience: 100,
      prerequisites: ['navigation_basic'],
      subskills: [],
      unlocked: false,
      metadata: {
        timesUsed: 0,
        successRate: 0,
      },
    });

    this.addSkill({
      id: 'route_planning',
      name: 'Route Planning',
      category: 'navigation',
      description: 'Plan safe and efficient routes considering weather and hazards',
      level: 0,
      experience: 0,
      maxExperience: 100,
      prerequisites: ['navigation_basic', 'weather_basics'],
      subskills: [],
      unlocked: false,
      metadata: {
        timesUsed: 0,
        successRate: 0,
      },
    });

    this.addSkill({
      id: 'pilotage',
      name: 'Pilotage',
      category: 'navigation',
      description: 'Navigate in confined waters, harbors, and narrow channels',
      level: 0,
      experience: 0,
      maxExperience: 100,
      prerequisites: ['navigation_basic', 'position_fixing'],
      subskills: [],
      unlocked: false,
      metadata: {
        timesUsed: 0,
        successRate: 0,
      },
    });

    // ====================================================================
    // WEATHER ANALYSIS SKILLS
    // ====================================================================

    this.addSkill({
      id: 'weather_basics',
      name: 'Weather Basics',
      category: 'weather_analysis',
      description: 'Understand weather patterns, forecasts, and maritime weather',
      level: 0,
      experience: 0,
      maxExperience: 100,
      prerequisites: [],
      unlocked: true,
      metadata: {
        timesUsed: 0,
        successRate: 0,
      },
    });

    this.addSkill({
      id: 'wind_prediction',
      name: 'Wind Prediction',
      category: 'weather_analysis',
      description: 'Predict wind changes and patterns',
      level: 0,
      experience: 0,
      maxExperience: 100,
      prerequisites: ['weather_basics'],
      subskills: [],
      unlocked: false,
      metadata: {
        timesUsed: 0,
        successRate: 0,
      },
    });

    this.addSkill({
      id: 'weather_routing',
      name: 'Weather Routing',
      category: 'weather_analysis',
      description: 'Optimize routes based on weather forecasts',
      level: 0,
      experience: 0,
      maxExperience: 100,
      prerequisites: ['weather_basics', 'route_planning'],
      subskills: [],
      unlocked: false,
      metadata: {
        timesUsed: 0,
        successRate: 0,
      },
    });

    // ====================================================================
    // ANCHORING SKILLS
    // ====================================================================

    this.addSkill({
      id: 'anchoring_basics',
      name: 'Anchoring Basics',
      category: 'anchoring',
      description: 'Basic anchoring procedures and scope calculation',
      level: 0,
      experience: 0,
      maxExperience: 100,
      prerequisites: [],
      unlocked: true,
      metadata: {
        timesUsed: 0,
        successRate: 0,
      },
    });

    this.addSkill({
      id: 'anchor_selection',
      name: 'Anchor Selection',
      category: 'anchoring',
      description: 'Choose appropriate anchor for seabed type',
      level: 0,
      experience: 0,
      maxExperience: 100,
      prerequisites: ['anchoring_basics'],
      subskills: [],
      unlocked: false,
      metadata: {
        timesUsed: 0,
        successRate: 0,
      },
    });

    this.addSkill({
      id: 'anchorage_assessment',
      name: 'Anchorage Assessment',
      category: 'anchoring',
      description: 'Evaluate anchorage quality and identify best spots',
      level: 0,
      experience: 0,
      maxExperience: 100,
      prerequisites: ['anchoring_basics', 'weather_basics'],
      subskills: [],
      unlocked: false,
      metadata: {
        timesUsed: 0,
        successRate: 0,
      },
    });

    // ====================================================================
    // SAILING SKILLS
    // ====================================================================

    this.addSkill({
      id: 'sail_trim',
      name: 'Sail Trim',
      category: 'sailing',
      description: 'Adjust sails for optimal performance',
      level: 0,
      experience: 0,
      maxExperience: 100,
      prerequisites: [],
      unlocked: true,
      metadata: {
        timesUsed: 0,
        successRate: 0,
      },
    });

    this.addSkill({
      id: 'reefing',
      name: 'Reefing',
      category: 'sailing',
      description: 'Reduce sail area in strong winds',
      level: 0,
      experience: 0,
      maxExperience: 100,
      prerequisites: ['sail_trim', 'weather_basics'],
      subskills: [],
      unlocked: false,
      metadata: {
        timesUsed: 0,
        successRate: 0,
      },
    });

    // ====================================================================
    // EMERGENCY SKILLS
    // ====================================================================

    this.addSkill({
      id: 'emergency_procedures',
      name: 'Emergency Procedures',
      category: 'emergency',
      description: 'Basic emergency response and safety procedures',
      level: 0,
      experience: 0,
      maxExperience: 100,
      prerequisites: [],
      unlocked: true,
      metadata: {
        timesUsed: 0,
        successRate: 0,
      },
    });

    this.addSkill({
      id: 'mob_recovery',
      name: 'MOB Recovery',
      category: 'emergency',
      description: 'Man Overboard recovery procedures',
      level: 0,
      experience: 0,
      maxExperience: 100,
      prerequisites: ['emergency_procedures'],
      subskills: [],
      unlocked: false,
      metadata: {
        timesUsed: 0,
        successRate: 0,
      },
    });

    this.emit('skilltree:initialized', {
      total_skills: this.skills.size,
    });
  }

  // ========================================================================
  // EXPORT / IMPORT
  // ========================================================================

  export(): { skills: Map<string, Skill>; progressionHistory: SkillProgression[] } {
    return {
      skills: this.skills,
      progressionHistory: this.progressionHistory,
    };
  }

  import(data: { skills: Map<string, Skill>; progressionHistory: SkillProgression[] }): void {
    this.skills = data.skills;
    this.progressionHistory = data.progressionHistory;
    this.emit('skilltree:imported');
  }
}
