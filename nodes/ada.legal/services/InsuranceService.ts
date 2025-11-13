/**
 * InsuranceService - Maritime insurance and claims management
 *
 * Covers:
 * - P&I (Protection & Indemnity) insurance
 * - Hull & Machinery insurance
 * - Cargo insurance
 * - Crew insurance
 * - Charter party insurance
 * - Claims processing
 */

export interface PIInsurancePolicy {
  policyNumber: string;
  club: string; // P&I Club name (e.g., 'UK P&I Club', 'Gard', 'Skuld')
  vessel: {
    name: string;
    imo: string;
    flag: string;
    grossTonnage: number;
  };

  coverage: {
    // Third-party liabilities
    thirdPartyLiability: number; // Coverage limit
    collisionLiability: number;
    cargoLiability: number;
    passengerLiability: number;
    crewLiability: number;

    // Pollution
    pollutionLiability: number;
    bunkerPollution: boolean;

    // Other
    wreckRemoval: number;
    portStateDetention: boolean;
    finesAndPenalties: boolean;
    legalDefense: boolean;
  };

  premium: {
    annual: number;
    currency: string;
    paymentSchedule: 'annual' | 'quarterly' | 'monthly';
    callableCapital?: number; // P&I clubs are mutual
  };

  policyPeriod: {
    start: Date;
    end: Date;
  };

  deductible: number;

  exclusions: string[];
  specialConditions?: string[];

  status: 'active' | 'expired' | 'cancelled' | 'suspended';
}

export interface HullMachineryPolicy {
  policyNumber: string;
  insurer: string;
  vessel: {
    name: string;
    imo: string;
    insuredValue: number; // Agreed value
    marketValue: number;
  };

  coverage: {
    hull: boolean;
    machinery: boolean;
    equipment: boolean;
    spareparts: boolean;

    // Perils covered
    totalLoss: boolean;
    partialLoss: boolean;
    collision: boolean;
    fire: boolean;
    piracy: boolean;
    warRisks: boolean;
    strikesCivilCommotions: boolean;
  };

  navigationLimits?: {
    worldwide: boolean;
    excludedAreas?: string[];
    tradingWarranties?: string[];
  };

  premium: {
    annual: number;
    currency: string;
  };

  policyPeriod: {
    start: Date;
    end: Date;
  };

  deductible: number;

  status: 'active' | 'expired' | 'cancelled';
}

export interface CargoInsurancePolicy {
  policyNumber: string;
  insurer: string;

  cargoDetails: {
    description: string;
    value: number;
    currency: string;
  };

  voyageDetails: {
    from: string;
    to: string;
    vessel: string;
    estimatedDeparture: Date;
    estimatedArrival: Date;
  };

  coverage: 'all-risks' | 'with-average' | 'free-particular-average';

  perils: string[]; // e.g., 'fire', 'sinking', 'theft', 'damage'

  premium: number;
  deductible: number;

  status: 'pending' | 'active' | 'completed' | 'claimed';
}

export interface InsuranceClaim {
  claimId: string;
  claimDate: Date;

  policyNumber: string;
  policyType: 'PI' | 'hull-machinery' | 'cargo' | 'crew' | 'other';

  incident: {
    date: Date;
    location: {
      latitude: number;
      longitude: number;
      port?: string;
    };
    description: string;
    cause: string;
    vesselInvolved: string;
  };

  claimant: {
    name: string;
    type: 'vessel-owner' | 'cargo-owner' | 'third-party' | 'crew' | 'passenger';
    contact: string;
    legalRepresentative?: string;
  };

  claimAmount: {
    requested: number;
    currency: string;
    breakdown: Array<{
      item: string;
      amount: number;
      supporting: string; // invoice, receipt, etc.
    }>;
  };

  evidence: {
    photos?: string[];
    surveyReports?: string[];
    expertReports?: string[];
    witnessStatements?: string[];
    officialReports?: string[]; // Coast Guard, Port Authority, etc.
  };

  liability: {
    establishedFault?: 'insured' | 'third-party' | 'shared' | 'force-majeure';
    percentage?: number; // If shared liability
  };

  status: 'submitted' | 'under-review' | 'survey-required' | 'negotiating' | 'settled' | 'rejected' | 'litigation';

  handling: {
    adjuster?: string;
    lawyer?: string;
    surveyor?: string;
  };

  settlement?: {
    date: Date;
    amount: number;
    terms: string;
    paymentDate?: Date;
  };

  rejection?: {
    date: Date;
    reason: string;
    appealDeadline: Date;
  };

  timeline: Array<{
    date: Date;
    event: string;
    notes?: string;
  }>;

  estimatedSettlement?: {
    low: number;
    expected: number;
    high: number;
  };
}

export interface CrewInsurance {
  policyNumber: string;
  insurer: string;

  coverage: {
    medicalExpenses: number;
    repatriationCosts: boolean;
    lossOfLife: number;
    permanentDisability: number;
    temporaryDisability: number;
    personalEffects: number;
  };

  crewSize: number;
  premium: number;

  policyPeriod: {
    start: Date;
    end: Date;
  };

  status: 'active' | 'expired';
}

export interface LossOfHireCoverage {
  policyNumber: string;
  insurer: string;

  vessel: string;

  coverage: {
    dailyRate: number; // Daily hire rate covered
    maxDays: number; // Maximum days covered
    waitingPeriod: number; // Days before coverage kicks in
  };

  premium: number;

  triggers: string[]; // e.g., 'machinery breakdown', 'collision', 'grounding'

  status: 'active' | 'expired';
}

/**
 * Insurance Service
 */
export class InsuranceService {
  /**
   * Check insurance coverage adequacy
   */
  async checkCoverageAdequacy(vessel: {
    type: string;
    value: number;
    operations: string[];
    routes: string[];
  }, policies: {
    pi?: PIInsurancePolicy;
    hull?: HullMachineryPolicy;
    cargo?: CargoInsurancePolicy;
    crew?: CrewInsurance;
  }): Promise<{
    adequate: boolean;
    gaps: string[];
    recommendations: string[];
    estimatedExposure: number;
  }> {
    const gaps: string[] = [];
    const recommendations: string[] = [];
    let estimatedExposure = 0;

    // 1. Check P&I coverage
    if (!policies.pi) {
      gaps.push('No P&I insurance - vessel cannot operate legally');
      estimatedExposure += 10000000; // Massive exposure without P&I
      recommendations.push('URGENT: Obtain P&I insurance from reputable club (UK P&I, Gard, Skuld)');
    } else {
      // Check P&I limits
      if (policies.pi.coverage.thirdPartyLiability < 5000000) {
        gaps.push('P&I third-party liability limit too low for commercial operations');
        recommendations.push('Increase P&I coverage to minimum USD 5M');
      }

      if (vessel.operations.includes('passenger') && policies.pi.coverage.passengerLiability < 2000000) {
        gaps.push('Passenger liability coverage insufficient for passenger vessel');
        recommendations.push('Increase passenger liability coverage to USD 2M per passenger');
      }

      if (!policies.pi.coverage.pollutionLiability || policies.pi.coverage.pollutionLiability < 1000000) {
        gaps.push('Pollution liability coverage insufficient');
        recommendations.push('Ensure pollution coverage meets CLC/Bunker Convention requirements');
      }
    }

    // 2. Check Hull & Machinery
    if (!policies.hull) {
      gaps.push('No Hull & Machinery insurance');
      estimatedExposure += vessel.value;
      recommendations.push('Obtain H&M insurance to protect vessel value');
    } else {
      if (policies.hull.vessel.insuredValue < vessel.value * 0.8) {
        gaps.push('Hull insured value significantly below market value - underinsured');
        recommendations.push('Update H&M policy to reflect current market value');
      }

      // Check war risks if operating in high-risk areas
      const highRiskRoutes = ['Red Sea', 'Gulf of Aden', 'Strait of Hormuz', 'West Africa'];
      const hasHighRiskRoute = vessel.routes.some(route =>
        highRiskRoutes.some(risk => route.includes(risk))
      );

      if (hasHighRiskRoute && !policies.hull.coverage.warRisks) {
        gaps.push('Operating in high-risk area without war risks coverage');
        recommendations.push('Add war risks and piracy coverage for high-risk areas');
      }
    }

    // 3. Check Cargo insurance (if cargo operations)
    if (vessel.operations.includes('cargo') && !policies.cargo) {
      recommendations.push('Consider cargo insurance or ensure cargo owners have adequate coverage');
    }

    // 4. Check Crew insurance
    if (!policies.crew) {
      gaps.push('No crew insurance - employer liability exposure');
      recommendations.push('Obtain crew accident and medical insurance');
      estimatedExposure += 500000; // Potential crew claims
    }

    // 5. Check deductibles are reasonable
    if (policies.pi && policies.pi.deductible > 100000) {
      recommendations.push('P&I deductible very high - consider lower deductible for better protection');
    }

    if (policies.hull && policies.hull.deductible > vessel.value * 0.05) {
      recommendations.push('H&M deductible exceeds 5% of vessel value - consider reducing');
    }

    const adequate = gaps.length === 0;

    return {
      adequate,
      gaps,
      recommendations,
      estimatedExposure,
    };
  }

  /**
   * Process insurance claim
   */
  async processClaim(claim: InsuranceClaim): Promise<{
    nextSteps: string[];
    requiredDocuments: string[];
    estimatedTimeline: string;
    estimatedSettlement: {
      low: number;
      expected: number;
      high: number;
    };
    legalAdviceRequired: boolean;
  }> {
    const nextSteps: string[] = [];
    const requiredDocuments: string[] = [];
    let legalAdviceRequired = false;

    // Determine next steps based on claim status and type
    switch (claim.status) {
      case 'submitted':
        nextSteps.push('1. Notify insurer immediately (within policy notification period)');
        nextSteps.push('2. Preserve all evidence - photos, documents, witness contacts');
        nextSteps.push('3. Do not admit liability to third parties');
        nextSteps.push('4. Prepare detailed incident report');

        requiredDocuments.push('Incident report with timeline');
        requiredDocuments.push('Photographs of damage');
        requiredDocuments.push('Logbook extracts');
        requiredDocuments.push('Weather reports (if applicable)');

        if (claim.policyType === 'PI') {
          requiredDocuments.push('Third-party correspondence');
          requiredDocuments.push('Port authority reports');
          legalAdviceRequired = true;
        }
        break;

      case 'under-review':
        nextSteps.push('1. Respond promptly to insurer requests');
        nextSteps.push('2. Arrange surveyor inspection if required');
        nextSteps.push('3. Obtain repair quotations');
        break;

      case 'survey-required':
        nextSteps.push('1. Arrange for approved marine surveyor');
        nextSteps.push('2. Make vessel available for inspection');
        nextSteps.push('3. Obtain surveyor report and recommendations');

        requiredDocuments.push('Survey report');
        requiredDocuments.push('Repair specifications');
        requiredDocuments.push('Cost estimates from approved yards');
        break;

      case 'negotiating':
        nextSteps.push('1. Review insurer settlement offer');
        nextSteps.push('2. Negotiate terms if offer inadequate');
        nextSteps.push('3. Consider independent assessment if dispute');

        if (claim.claimAmount.requested > 500000) {
          legalAdviceRequired = true;
          nextSteps.push('4. Consult maritime lawyer for large claim');
        }
        break;
    }

    // Calculate estimated settlement based on claim type
    let estimatedSettlement: { low: number; expected: number; high: number };

    if (claim.policyType === 'hull-machinery') {
      // H&M typically pays repair costs minus deductible
      estimatedSettlement = {
        low: Math.max(0, claim.claimAmount.requested * 0.7 - 50000),
        expected: Math.max(0, claim.claimAmount.requested * 0.85 - 25000),
        high: Math.max(0, claim.claimAmount.requested - 10000),
      };
    } else if (claim.policyType === 'PI') {
      // P&I more variable, depends on liability
      const liabilityFactor =
        claim.liability.establishedFault === 'insured' ? 1.0 :
        claim.liability.establishedFault === 'shared' ? (claim.liability.percentage || 50) / 100 :
        claim.liability.establishedFault === 'third-party' ? 0 : 0.5;

      estimatedSettlement = {
        low: claim.claimAmount.requested * liabilityFactor * 0.5,
        expected: claim.claimAmount.requested * liabilityFactor * 0.75,
        high: claim.claimAmount.requested * liabilityFactor,
      };

      if (liabilityFactor > 0.5) {
        legalAdviceRequired = true;
      }
    } else {
      // Cargo and crew insurance
      estimatedSettlement = {
        low: claim.claimAmount.requested * 0.6,
        expected: claim.claimAmount.requested * 0.8,
        high: claim.claimAmount.requested,
      };
    }

    // Estimate timeline
    const estimatedTimeline =
      claim.policyType === 'hull-machinery' ? '2-4 months' :
      claim.policyType === 'PI' && claim.claimAmount.requested > 1000000 ? '6-12 months' :
      claim.policyType === 'PI' ? '3-6 months' :
      '1-3 months';

    return {
      nextSteps,
      requiredDocuments,
      estimatedTimeline,
      estimatedSettlement,
      legalAdviceRequired,
    };
  }

  /**
   * Calculate annual insurance budget for fleet
   */
  calculateInsuranceBudget(fleet: Array<{
    vesselName: string;
    vesselValue: number;
    vesselType: string;
    operations: string[];
    crewSize: number;
  }>): {
    piPremium: number;
    hullPremium: number;
    crewPremium: number;
    additionalCoverage: number;
    totalAnnual: number;
    breakdown: Array<{
      vessel: string;
      premium: number;
    }>;
  } {
    let piPremium = 0;
    let hullPremium = 0;
    let crewPremium = 0;
    let additionalCoverage = 0;

    const breakdown: Array<{ vessel: string; premium: number }> = [];

    for (const vessel of fleet) {
      // P&I premium (typically 0.5-2% of insured value)
      const piRate = vessel.operations.includes('passenger') ? 0.02 : 0.01;
      const vesselPIPremium = vessel.vesselValue * piRate;
      piPremium += vesselPIPremium;

      // H&M premium (typically 0.5-1.5% of insured value)
      const hullRate = vessel.vesselType === 'yacht' ? 0.015 : 0.01;
      const vesselHullPremium = vessel.vesselValue * hullRate;
      hullPremium += vesselHullPremium;

      // Crew premium (approximately $500-1000 per crew member per year)
      const crewRate = 750;
      const vesselCrewPremium = vessel.crewSize * crewRate;
      crewPremium += vesselCrewPremium;

      // Additional coverage (war risks, loss of hire, etc.)
      const vesselAdditionalPremium = vessel.vesselValue * 0.002;
      additionalCoverage += vesselAdditionalPremium;

      breakdown.push({
        vessel: vessel.vesselName,
        premium: vesselPIPremium + vesselHullPremium + vesselCrewPremium + vesselAdditionalPremium,
      });
    }

    return {
      piPremium,
      hullPremium,
      crewPremium,
      additionalCoverage,
      totalAnnual: piPremium + hullPremium + crewPremium + additionalCoverage,
      breakdown,
    };
  }

  /**
   * Check if claim is likely to be covered
   */
  assessClaimCoverage(claim: InsuranceClaim, policy: PIInsurancePolicy | HullMachineryPolicy): {
    covered: boolean;
    coverage: 'full' | 'partial' | 'none';
    reason: string;
    maxPayable: number;
  } {
    // Check if incident date is within policy period
    const isPolicyActive =
      claim.incident.date >= policy.policyPeriod.start &&
      claim.incident.date <= policy.policyPeriod.end;

    if (!isPolicyActive) {
      return {
        covered: false,
        coverage: 'none',
        reason: 'Incident occurred outside policy period',
        maxPayable: 0,
      };
    }

    // Check policy status
    if (policy.status !== 'active') {
      return {
        covered: false,
        coverage: 'none',
        reason: `Policy status is ${policy.status}`,
        maxPayable: 0,
      };
    }

    // Check exclusions (simplified)
    if ('exclusions' in policy) {
      const isExcluded = policy.exclusions.some(exclusion =>
        claim.incident.cause.toLowerCase().includes(exclusion.toLowerCase())
      );

      if (isExcluded) {
        return {
          covered: false,
          coverage: 'none',
          reason: 'Incident cause is excluded under policy terms',
          maxPayable: 0,
        };
      }
    }

    // Calculate max payable
    let maxPayable = 0;
    if ('coverage' in policy && 'thirdPartyLiability' in policy.coverage) {
      // P&I policy
      maxPayable = policy.coverage.thirdPartyLiability - policy.deductible;
    } else if ('coverage' in policy && 'hull' in policy.coverage) {
      // H&M policy
      maxPayable = (policy.vessel as any).insuredValue - policy.deductible;
    }

    const claimWithinLimit = claim.claimAmount.requested <= maxPayable;

    return {
      covered: true,
      coverage: claimWithinLimit ? 'full' : 'partial',
      reason: claimWithinLimit ? 'Claim within policy limits' : 'Claim exceeds policy limits',
      maxPayable,
    };
  }
}
