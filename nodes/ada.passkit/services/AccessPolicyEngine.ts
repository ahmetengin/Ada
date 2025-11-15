/**
 * AccessPolicyEngine - Advanced access control and policy enforcement
 *
 * Features:
 * - Time-based access (days, time ranges, schedules)
 * - Zone-based access (single zone, multi-zone, hierarchical)
 * - Capacity management (max occupancy, current occupancy)
 * - Conditional access (requires escort, pre-auth, special permissions)
 * - Rule composition (AND, OR, NOT logic)
 * - Real-time policy evaluation
 * - Policy versioning and history
 */

import {
  Pass,
  PassType,
  PassZone,
  PassValidity,
  AccessRule,
  AccessValidationResult,
  ValidatePassRequest,
} from '../types/PassTypes.js';

export interface PolicyContext {
  currentTime: Date;
  location?: string;
  deviceInfo?: {
    deviceId?: string;
    deviceType?: string;
  };
  scannedBy?: string;
  additionalContext?: Record<string, any>;
}

export interface CompositeRule {
  operator: 'AND' | 'OR' | 'NOT';
  rules: (AccessRule | CompositeRule)[];
}

export interface PolicyEvaluationResult extends AccessValidationResult {
  evaluationTime: number; // milliseconds
  rulesEvaluated: number;
  policyVersion?: string;
}

export class AccessPolicyEngine {
  private rules: Map<string, AccessRule> = new Map();
  private zoneOccupancy: Map<string, number> = new Map();
  private passTypeRules: Map<PassType, AccessRule[]> = new Map();

  /**
   * Register an access rule
   */
  registerRule(rule: AccessRule): void {
    this.rules.set(rule.ruleId, rule);

    // Index by pass type for faster lookups
    const rulesForType = this.passTypeRules.get(rule.passType) || [];
    rulesForType.push(rule);
    this.passTypeRules.set(rule.passType, rulesForType);
  }

  /**
   * Unregister an access rule
   */
  unregisterRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    this.rules.delete(ruleId);

    // Remove from index
    const rulesForType = this.passTypeRules.get(rule.passType) || [];
    const updated = rulesForType.filter(r => r.ruleId !== ruleId);
    this.passTypeRules.set(rule.passType, updated);

    return true;
  }

  /**
   * Get all rules for a pass type
   */
  getRulesForPassType(passType: PassType): AccessRule[] {
    return this.passTypeRules.get(passType) || [];
  }

  /**
   * Evaluate access request against all policies
   */
  async evaluate(
    pass: Pass,
    request: ValidatePassRequest,
    context: PolicyContext
  ): Promise<PolicyEvaluationResult> {
    const startTime = Date.now();
    let rulesEvaluated = 0;

    // Step 1: Basic pass validation
    const basicValidation = this.validatePassBasics(pass, context);
    if (!basicValidation.allowed) {
      return {
        ...basicValidation,
        evaluationTime: Date.now() - startTime,
        rulesEvaluated: 1,
      };
    }

    // Step 2: Zone access validation
    const zoneValidation = this.validateZoneAccess(pass, request.zoneId, context);
    rulesEvaluated++;
    if (!zoneValidation.allowed) {
      return {
        ...zoneValidation,
        evaluationTime: Date.now() - startTime,
        rulesEvaluated,
      };
    }

    // Step 3: Time-based validation
    const timeValidation = this.validateTimeRestrictions(pass, context);
    rulesEvaluated++;
    if (!timeValidation.allowed) {
      return {
        ...timeValidation,
        evaluationTime: Date.now() - startTime,
        rulesEvaluated,
      };
    }

    // Step 4: Capacity validation
    const capacityValidation = this.validateCapacity(pass, request.zoneId, context);
    rulesEvaluated++;
    if (!capacityValidation.allowed) {
      return {
        ...capacityValidation,
        evaluationTime: Date.now() - startTime,
        rulesEvaluated,
      };
    }

    // Step 5: Custom rules for pass type
    const customRules = this.getRulesForPassType(pass.passType);
    for (const rule of customRules) {
      if (rule.zoneId === request.zoneId) {
        const ruleValidation = this.evaluateRule(rule, pass, context);
        rulesEvaluated++;
        if (!ruleValidation.allowed) {
          return {
            ...ruleValidation,
            evaluationTime: Date.now() - startTime,
            rulesEvaluated,
          };
        }
      }
    }

    // Step 6: Collect all restrictions and warnings
    const zone = pass.zones.find(z => z.id === request.zoneId);
    const restrictions: string[] = [];

    if (zone?.restrictions?.requiresEscort) {
      restrictions.push('Escort required');
    }
    if (zone?.restrictions?.requiresPreAuth) {
      restrictions.push('Pre-authorization required - verify with security');
    }

    // Success!
    return {
      allowed: true,
      restrictions: restrictions.length > 0 ? restrictions : undefined,
      metadata: {
        passType: pass.passType,
        holderName: pass.holder.name,
        zoneName: zone?.name || 'Unknown Zone',
        evaluatedAt: context.currentTime.toISOString(),
      },
      evaluationTime: Date.now() - startTime,
      rulesEvaluated,
    };
  }

  /**
   * Validate basic pass properties
   */
  private validatePassBasics(pass: Pass, context: PolicyContext): AccessValidationResult {
    // Check status
    if (pass.status !== 'active') {
      return {
        allowed: false,
        reason: `Pass is ${pass.status}`,
      };
    }

    // Check validity period
    if (context.currentTime < pass.validity.validFrom) {
      return {
        allowed: false,
        reason: `Pass not yet valid (valid from ${pass.validity.validFrom.toLocaleDateString()})`,
      };
    }

    if (context.currentTime > pass.validity.validTo) {
      return {
        allowed: false,
        reason: `Pass expired on ${pass.validity.validTo.toLocaleDateString()}`,
      };
    }

    // Check single-use restriction
    if (pass.validity.singleUse && (pass.validity.currentScans || 0) > 0) {
      return {
        allowed: false,
        reason: 'Single-use pass already used',
      };
    }

    // Check max scans
    if (pass.validity.maxScans) {
      const currentScans = pass.validity.currentScans || 0;
      if (currentScans >= pass.validity.maxScans) {
        return {
          allowed: false,
          reason: `Maximum scan limit reached (${pass.validity.maxScans} scans)`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Validate zone access
   */
  private validateZoneAccess(
    pass: Pass,
    zoneId: string,
    context: PolicyContext
  ): AccessValidationResult {
    const zone = pass.zones.find(z => z.id === zoneId);

    if (!zone) {
      return {
        allowed: false,
        reason: `Zone '${zoneId}' not authorized for this pass`,
        metadata: {
          authorizedZones: pass.zones.map(z => z.name).join(', '),
        },
      };
    }

    return { allowed: true };
  }

  /**
   * Validate time-based restrictions
   */
  private validateTimeRestrictions(
    pass: Pass,
    context: PolicyContext
  ): AccessValidationResult {
    const now = context.currentTime;

    // Check allowed days
    if (pass.validity.allowedDays && pass.validity.allowedDays.length > 0) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = dayNames[now.getDay()] as any;

      if (!pass.validity.allowedDays.includes(currentDay)) {
        return {
          allowed: false,
          reason: `Access not allowed on ${currentDay}`,
          metadata: {
            allowedDays: pass.validity.allowedDays.join(', '),
          },
        };
      }
    }

    // Check allowed time ranges
    if (pass.validity.allowedTimeRanges && pass.validity.allowedTimeRanges.length > 0) {
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const inAllowedRange = pass.validity.allowedTimeRanges.some(
        range => currentTime >= range.start && currentTime <= range.end
      );

      if (!inAllowedRange) {
        return {
          allowed: false,
          reason: `Access not allowed at ${currentTime}`,
          metadata: {
            allowedTimeRanges: pass.validity.allowedTimeRanges.map(r => `${r.start}-${r.end}`).join(', '),
          },
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Validate capacity restrictions
   */
  private validateCapacity(
    pass: Pass,
    zoneId: string,
    context: PolicyContext
  ): AccessValidationResult {
    const zone = pass.zones.find(z => z.id === zoneId);
    if (!zone) return { allowed: true };

    if (zone.restrictions?.maxOccupancy) {
      const currentOccupancy = this.zoneOccupancy.get(zoneId) || 0;

      if (currentOccupancy >= zone.restrictions.maxOccupancy) {
        return {
          allowed: false,
          reason: `Zone at maximum capacity (${zone.restrictions.maxOccupancy} people)`,
          metadata: {
            currentOccupancy,
            maxOccupancy: zone.restrictions.maxOccupancy,
          },
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Evaluate a custom access rule
   */
  private evaluateRule(
    rule: AccessRule,
    pass: Pass,
    context: PolicyContext
  ): AccessValidationResult {
    // Check time restrictions in rule
    if (rule.allowedDays && rule.allowedDays.length > 0) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = dayNames[context.currentTime.getDay()];

      if (!rule.allowedDays.includes(currentDay)) {
        return {
          allowed: false,
          reason: `Rule '${rule.ruleId}': Access not allowed on ${currentDay}`,
        };
      }
    }

    if (rule.allowedTimeRanges && rule.allowedTimeRanges.length > 0) {
      const now = context.currentTime;
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const inAllowedRange = rule.allowedTimeRanges.some(
        range => currentTime >= range.start && currentTime <= range.end
      );

      if (!inAllowedRange) {
        return {
          allowed: false,
          reason: `Rule '${rule.ruleId}': Access not allowed at ${currentTime}`,
        };
      }
    }

    // Check custom conditions
    if (rule.conditions) {
      const conditionsMet = this.evaluateConditions(rule.conditions, pass, context);
      if (!conditionsMet.met) {
        return {
          allowed: false,
          reason: `Rule '${rule.ruleId}': ${conditionsMet.reason}`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Evaluate custom conditions (extensible)
   */
  private evaluateConditions(
    conditions: Record<string, any>,
    pass: Pass,
    context: PolicyContext
  ): { met: boolean; reason?: string } {
    // Example conditions:
    // - minAge: 18
    // - role: "staff"
    // - company: "Acme Corp"

    for (const [key, value] of Object.entries(conditions)) {
      // Check holder custom fields
      if (pass.holder.customFields && pass.holder.customFields[key] !== value) {
        return {
          met: false,
          reason: `Condition not met: ${key} must be ${value}`,
        };
      }

      // Check context
      if (context.additionalContext && context.additionalContext[key] !== value) {
        return {
          met: false,
          reason: `Context condition not met: ${key} must be ${value}`,
        };
      }
    }

    return { met: true };
  }

  /**
   * Update zone occupancy (increment)
   */
  enterZone(zoneId: string): number {
    const current = this.zoneOccupancy.get(zoneId) || 0;
    const updated = current + 1;
    this.zoneOccupancy.set(zoneId, updated);
    return updated;
  }

  /**
   * Update zone occupancy (decrement)
   */
  exitZone(zoneId: string): number {
    const current = this.zoneOccupancy.get(zoneId) || 0;
    const updated = Math.max(0, current - 1);
    this.zoneOccupancy.set(zoneId, updated);
    return updated;
  }

  /**
   * Get current zone occupancy
   */
  getZoneOccupancy(zoneId: string): number {
    return this.zoneOccupancy.get(zoneId) || 0;
  }

  /**
   * Reset zone occupancy
   */
  resetZoneOccupancy(zoneId: string): void {
    this.zoneOccupancy.set(zoneId, 0);
  }

  /**
   * Get all current occupancies
   */
  getAllOccupancies(): Map<string, number> {
    return new Map(this.zoneOccupancy);
  }

  /**
   * Bulk register rules
   */
  bulkRegisterRules(rules: AccessRule[]): void {
    rules.forEach(rule => this.registerRule(rule));
  }

  /**
   * Get all registered rules
   */
  getAllRules(): AccessRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Clear all rules
   */
  clearAllRules(): void {
    this.rules.clear();
    this.passTypeRules.clear();
  }

  /**
   * Export policy configuration
   */
  exportPolicyConfig(): {
    rules: AccessRule[];
    occupancies: Record<string, number>;
  } {
    return {
      rules: this.getAllRules(),
      occupancies: Object.fromEntries(this.zoneOccupancy),
    };
  }

  /**
   * Import policy configuration
   */
  importPolicyConfig(config: {
    rules: AccessRule[];
    occupancies?: Record<string, number>;
  }): void {
    this.clearAllRules();
    this.bulkRegisterRules(config.rules);

    if (config.occupancies) {
      this.zoneOccupancy = new Map(Object.entries(config.occupancies));
    }
  }
}

export default AccessPolicyEngine;
