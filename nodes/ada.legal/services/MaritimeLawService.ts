/**
 * MaritimeLawService - International maritime law compliance
 *
 * Covers:
 * - IMO (International Maritime Organization) regulations
 * - SOLAS (Safety of Life at Sea)
 * - MARPOL (Marine Pollution Prevention)
 * - COLREGS (Collision Regulations)
 * - Flag state requirements
 * - Port state control
 */

export interface IMORegulation {
  code: string;
  title: string;
  category: 'SOLAS' | 'MARPOL' | 'STCW' | 'COLREGS' | 'MLC' | 'ISM' | 'ISPS';
  chapter?: string;
  requirement: string;
  applicableTo: string[]; // e.g., ['cargo-ship', 'passenger-ship', 'yacht']
  effectiveDate: Date;
  amendments?: Array<{
    date: Date;
    description: string;
  }>;
}

export interface VesselCompliance {
  vesselId: string;
  vesselType: 'cargo' | 'passenger' | 'yacht' | 'tanker' | 'fishing';
  flag: string;
  grossTonnage: number;
  constructionYear: number;

  compliance: {
    regulation: IMORegulation;
    status: 'compliant' | 'non-compliant' | 'exempted' | 'not-applicable';
    evidence?: string;
    expiryDate?: Date;
    lastInspection?: Date;
    deficiencies?: string[];
  }[];

  overallStatus: 'compliant' | 'partial' | 'non-compliant';
  lastAudit: Date;
  nextAuditDue: Date;
}

export interface SafetyEquipmentRequirement {
  equipment: string;
  category: 'lifesaving' | 'fire-fighting' | 'navigation' | 'communication' | 'pollution-prevention';
  requiredBy: string[]; // IMO regulation codes
  quantity: number | 'varies';
  specifications: string;
  inspectionInterval: string; // e.g., 'annual', 'every-2-years'
  certificateRequired: boolean;
}

export interface CrewRequirement {
  position: string;
  certificate: string; // STCW certificate type
  minExperience?: string;
  medicalFitness: boolean;
  languageRequirement?: string;
  securityTraining?: string[];
}

export interface PortStateControlInspection {
  port: string;
  country: string;
  authority: string; // e.g., 'Paris MOU', 'Tokyo MOU', 'USCG'
  inspectionDate: Date;
  inspectorName: string;

  findings: Array<{
    code: string;
    regulation: string;
    description: string;
    severity: 'observation' | 'deficiency' | 'detention';
    deadline?: Date;
  }>;

  outcome: 'cleared' | 'deficiencies' | 'detained';
  detentionDuration?: number; // hours
  followUpRequired: boolean;
}

/**
 * Maritime Law Service
 */
export class MaritimeLawService {
  // IMO Regulations database (simplified - in production, integrate with official IMO data)
  private static IMO_REGULATIONS: IMORegulation[] = [
    {
      code: 'SOLAS-III-20',
      title: 'Lifeboats and rescue boats',
      category: 'SOLAS',
      chapter: 'III',
      requirement: 'Passenger ships shall carry sufficient lifeboats on each side to accommodate all persons on board',
      applicableTo: ['passenger-ship', 'yacht'],
      effectiveDate: new Date('1974-11-01'),
    },
    {
      code: 'SOLAS-V-19',
      title: 'Carriage requirements for shipborne navigational systems and equipment',
      category: 'SOLAS',
      chapter: 'V',
      requirement: 'All ships shall have standard magnetic compass, GNSS receiver, radar, AIS, VHF radio',
      applicableTo: ['cargo-ship', 'passenger-ship', 'yacht', 'tanker'],
      effectiveDate: new Date('2002-07-01'),
    },
    {
      code: 'MARPOL-Annex-I',
      title: 'Prevention of pollution by oil',
      category: 'MARPOL',
      requirement: 'Ships must have Oil Record Book, properly equipped oil filtering equipment',
      applicableTo: ['cargo-ship', 'tanker', 'yacht'],
      effectiveDate: new Date('1983-10-02'),
    },
    {
      code: 'MARPOL-Annex-VI',
      title: 'Prevention of air pollution from ships',
      category: 'MARPOL',
      requirement: 'Compliance with sulfur oxide (SOx) emission limits, NOx Technical Code',
      applicableTo: ['cargo-ship', 'passenger-ship', 'tanker'],
      effectiveDate: new Date('2005-05-19'),
    },
    {
      code: 'COLREGS-Rule-5',
      title: 'Look-out',
      category: 'COLREGS',
      requirement: 'Every vessel shall at all times maintain a proper look-out by sight and hearing',
      applicableTo: ['cargo-ship', 'passenger-ship', 'yacht', 'tanker', 'fishing'],
      effectiveDate: new Date('1977-07-15'),
    },
    {
      code: 'STCW-II/1',
      title: 'Mandatory minimum requirements for certification of officers in charge of a navigational watch',
      category: 'STCW',
      requirement: 'OOW certificate, approved seagoing service, navigation training',
      applicableTo: ['cargo-ship', 'passenger-ship', 'yacht', 'tanker'],
      effectiveDate: new Date('1995-02-01'),
    },
    {
      code: 'ISM-1.2.3',
      title: 'Safety Management System',
      category: 'ISM',
      requirement: 'Company must establish and implement documented safety management system',
      applicableTo: ['cargo-ship', 'passenger-ship', 'tanker'],
      effectiveDate: new Date('1998-07-01'),
    },
    {
      code: 'ISPS-A/9',
      title: 'Ship security plan',
      category: 'ISPS',
      requirement: 'Ships must have approved Ship Security Plan and carry out security drills',
      applicableTo: ['cargo-ship', 'passenger-ship', 'tanker'],
      effectiveDate: new Date('2004-07-01'),
    },
  ];

  /**
   * Check vessel compliance with IMO regulations
   */
  async checkVesselCompliance(vessel: {
    vesselId: string;
    vesselType: VesselCompliance['vesselType'];
    flag: string;
    grossTonnage: number;
    constructionYear: number;
  }): Promise<VesselCompliance> {
    const applicableRegulations = MaritimeLawService.IMO_REGULATIONS.filter(reg =>
      reg.applicableTo.includes(`${vessel.vesselType}-ship`) ||
      reg.applicableTo.includes(vessel.vesselType)
    );

    // Check each regulation (simplified logic)
    const compliance = applicableRegulations.map(regulation => {
      // In production, this would check actual certificates, equipment, etc.
      const status: 'compliant' | 'non-compliant' | 'exempted' | 'not-applicable' =
        this.determineComplianceStatus(vessel, regulation);

      return {
        regulation,
        status,
        lastInspection: new Date(),
        deficiencies: status === 'non-compliant' ? ['Missing certificate'] : undefined,
      };
    });

    const compliantCount = compliance.filter(c => c.status === 'compliant').length;
    const totalApplicable = compliance.filter(c => c.status !== 'not-applicable').length;

    return {
      vesselId: vessel.vesselId,
      vesselType: vessel.vesselType,
      flag: vessel.flag,
      grossTonnage: vessel.grossTonnage,
      constructionYear: vessel.constructionYear,
      compliance,
      overallStatus:
        compliantCount === totalApplicable ? 'compliant' :
        compliantCount > totalApplicable / 2 ? 'partial' : 'non-compliant',
      lastAudit: new Date(),
      nextAuditDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    };
  }

  /**
   * Get safety equipment requirements for vessel type
   */
  getSafetyEquipmentRequirements(vesselType: string, grossTonnage: number): SafetyEquipmentRequirement[] {
    const requirements: SafetyEquipmentRequirement[] = [];

    // Lifesaving equipment (SOLAS Chapter III)
    if (vesselType === 'passenger' || vesselType === 'yacht') {
      requirements.push({
        equipment: 'Lifeboat',
        category: 'lifesaving',
        requiredBy: ['SOLAS-III-20'],
        quantity: 'varies',
        specifications: 'Sufficient for 100% of persons on board on each side',
        inspectionInterval: 'annual',
        certificateRequired: true,
      });
    }

    requirements.push(
      {
        equipment: 'Life jacket',
        category: 'lifesaving',
        requiredBy: ['SOLAS-III-7'],
        quantity: 'varies',
        specifications: 'One for each person + 10% child size',
        inspectionInterval: 'annual',
        certificateRequired: false,
      },
      {
        equipment: 'Lifebuoy',
        category: 'lifesaving',
        requiredBy: ['SOLAS-III-7'],
        quantity: grossTonnage > 500 ? 8 : 4,
        specifications: 'With self-igniting light and smoke signal',
        inspectionInterval: 'annual',
        certificateRequired: false,
      }
    );

    // Fire-fighting (SOLAS Chapter II-2)
    requirements.push(
      {
        equipment: 'Fire extinguisher',
        category: 'fire-fighting',
        requiredBy: ['SOLAS-II-2/10'],
        quantity: 'varies',
        specifications: 'Portable, suitable for compartment size',
        inspectionInterval: 'annual',
        certificateRequired: true,
      },
      {
        equipment: 'Fire detection system',
        category: 'fire-fighting',
        requiredBy: ['SOLAS-II-2/7'],
        quantity: 1,
        specifications: 'Automatic fire detection and alarm',
        inspectionInterval: 'annual',
        certificateRequired: true,
      }
    );

    // Navigation equipment (SOLAS Chapter V)
    requirements.push(
      {
        equipment: 'Magnetic compass',
        category: 'navigation',
        requiredBy: ['SOLAS-V-19'],
        quantity: 1,
        specifications: 'Standard magnetic compass properly adjusted',
        inspectionInterval: 'annual',
        certificateRequired: false,
      },
      {
        equipment: 'GPS/GNSS receiver',
        category: 'navigation',
        requiredBy: ['SOLAS-V-19'],
        quantity: 1,
        specifications: 'Continuous position fixing',
        inspectionInterval: 'annual',
        certificateRequired: false,
      },
      {
        equipment: 'Radar',
        category: 'navigation',
        requiredBy: ['SOLAS-V-19'],
        quantity: grossTonnage > 300 ? 1 : 0,
        specifications: '9 GHz radar with ARPA if applicable',
        inspectionInterval: 'annual',
        certificateRequired: true,
      },
      {
        equipment: 'AIS (Automatic Identification System)',
        category: 'navigation',
        requiredBy: ['SOLAS-V-19'],
        quantity: grossTonnage > 300 ? 1 : 0,
        specifications: 'Class A AIS transponder',
        inspectionInterval: 'annual',
        certificateRequired: true,
      }
    );

    // Communication (SOLAS Chapter IV)
    requirements.push(
      {
        equipment: 'VHF Radio',
        category: 'communication',
        requiredBy: ['SOLAS-IV-7'],
        quantity: 1,
        specifications: 'VHF DSC Ch 70, Ch 16 watch',
        inspectionInterval: 'annual',
        certificateRequired: true,
      },
      {
        equipment: 'EPIRB (Emergency Position Indicating Radio Beacon)',
        category: 'communication',
        requiredBy: ['SOLAS-IV-8'],
        quantity: 1,
        specifications: '406 MHz satellite EPIRB',
        inspectionInterval: 'annual',
        certificateRequired: true,
      }
    );

    // Pollution prevention (MARPOL)
    if (grossTonnage > 400) {
      requirements.push({
        equipment: 'Oil filtering equipment',
        category: 'pollution-prevention',
        requiredBy: ['MARPOL-Annex-I'],
        quantity: 1,
        specifications: '15ppm bilge separator or equivalent',
        inspectionInterval: 'annual',
        certificateRequired: true,
      });
    }

    return requirements;
  }

  /**
   * Get crew certification requirements (STCW)
   */
  getCrewRequirements(vesselType: string, grossTonnage: number): CrewRequirement[] {
    const requirements: CrewRequirement[] = [];

    // Master
    requirements.push({
      position: 'Master',
      certificate: grossTonnage > 3000 ? 'STCW II/2' : 'STCW II/3',
      minExperience: '12 months as Chief Officer',
      medicalFitness: true,
      languageRequirement: 'English (working level)',
      securityTraining: ['ISPS awareness', 'Security officer'],
    });

    // Chief Officer
    if (grossTonnage > 500) {
      requirements.push({
        position: 'Chief Officer',
        certificate: 'STCW II/2',
        minExperience: '12 months as OOW',
        medicalFitness: true,
        languageRequirement: 'English (working level)',
      });
    }

    // Officer of the Watch (OOW)
    requirements.push({
      position: 'Officer of the Watch',
      certificate: 'STCW II/1',
      minExperience: '36 months approved seagoing service',
      medicalFitness: true,
      languageRequirement: 'English (working level)',
    });

    // Chief Engineer
    if (grossTonnage > 750) {
      requirements.push({
        position: 'Chief Engineer',
        certificate: 'STCW III/2',
        minExperience: '12 months as Second Engineer',
        medicalFitness: true,
      });
    }

    // GMDSS Radio Operator
    if (grossTonnage > 300) {
      requirements.push({
        position: 'GMDSS Radio Operator',
        certificate: 'STCW IV/2 (GOC)',
        medicalFitness: true,
        languageRequirement: 'English (maritime communication)',
      });
    }

    // Security officer (ISPS requirement)
    if (vesselType === 'cargo' || vesselType === 'passenger' || vesselType === 'tanker') {
      requirements.push({
        position: 'Ship Security Officer',
        certificate: 'STCW VI/5',
        medicalFitness: true,
        securityTraining: ['SSO training', 'ISPS implementation'],
      });
    }

    return requirements;
  }

  /**
   * Process Port State Control inspection
   */
  async processPortStateInspection(inspection: PortStateControlInspection): Promise<{
    riskScore: number;
    recommendedActions: string[];
    estimatedCost: number;
    urgency: 'immediate' | 'high' | 'medium' | 'low';
  }> {
    const detentionFindings = inspection.findings.filter(f => f.severity === 'detention');
    const deficiencies = inspection.findings.filter(f => f.severity === 'deficiency');

    let riskScore = 0;
    if (detentionFindings.length > 0) riskScore = 100;
    else if (deficiencies.length > 5) riskScore = 75;
    else if (deficiencies.length > 2) riskScore = 50;
    else if (deficiencies.length > 0) riskScore = 25;

    const recommendedActions: string[] = [];
    let estimatedCost = 0;

    for (const finding of inspection.findings) {
      if (finding.code.includes('fire')) {
        recommendedActions.push('Contact approved fire equipment supplier immediately');
        estimatedCost += 5000;
      }
      if (finding.code.includes('lifesaving')) {
        recommendedActions.push('Lifeboat service and certification required');
        estimatedCost += 3000;
      }
      if (finding.code.includes('certificate')) {
        recommendedActions.push('Renew expired certificates before next voyage');
        estimatedCost += 1000;
      }
      if (finding.code.includes('pollution')) {
        recommendedActions.push('Oil Record Book compliance review needed');
        estimatedCost += 2000;
      }
    }

    if (inspection.outcome === 'detained') {
      recommendedActions.unshift('URGENT: Rectify detention deficiencies - vessel cannot sail');
      estimatedCost += inspection.detentionDuration ? inspection.detentionDuration * 500 : 10000; // Port fees
    }

    const urgency: 'immediate' | 'high' | 'medium' | 'low' =
      inspection.outcome === 'detained' ? 'immediate' :
      deficiencies.length > 3 ? 'high' :
      deficiencies.length > 0 ? 'medium' : 'low';

    return {
      riskScore,
      recommendedActions,
      estimatedCost,
      urgency,
    };
  }

  /**
   * Get applicable COLREGS rule for navigation situation
   */
  getCOLREGSRule(situation: {
    visibility: 'clear' | 'restricted';
    encounterType: 'head-on' | 'crossing' | 'overtaking';
    vesselType1: string;
    vesselType2: string;
  }): {
    rule: string;
    action: string;
    priority: string;
  } {
    if (situation.visibility === 'restricted') {
      return {
        rule: 'Rule 19 - Conduct of vessels in restricted visibility',
        action: 'Proceed at safe speed, sound fog signals, be ready to take immediate action',
        priority: 'Both vessels must exercise extreme caution',
      };
    }

    switch (situation.encounterType) {
      case 'head-on':
        return {
          rule: 'Rule 14 - Head-on situation',
          action: 'Both vessels alter course to starboard',
          priority: 'Equal responsibility',
        };

      case 'crossing':
        return {
          rule: 'Rule 15 - Crossing situation',
          action: 'Vessel with other on starboard side must give way',
          priority: 'Give-way vessel must take early and substantial action',
        };

      case 'overtaking':
        return {
          rule: 'Rule 13 - Overtaking',
          action: 'Overtaking vessel must keep clear of vessel being overtaken',
          priority: 'Overtaking vessel is give-way vessel',
        };

      default:
        return {
          rule: 'Rule 5 - Look-out',
          action: 'Maintain proper look-out at all times',
          priority: 'Universal requirement',
        };
    }
  }

  /**
   * Determine compliance status (simplified logic)
   */
  private determineComplianceStatus(
    vessel: { constructionYear: number; grossTonnage: number },
    regulation: IMORegulation
  ): 'compliant' | 'non-compliant' | 'exempted' | 'not-applicable' {
    // Simplified logic - in production, check actual certificates and inspections

    // Ships built before regulation effective date might be exempted
    const vesselAge = new Date().getFullYear() - vessel.constructionYear;
    const regulationAge = new Date().getFullYear() - regulation.effectiveDate.getFullYear();

    if (vesselAge > regulationAge + 5) {
      return Math.random() > 0.2 ? 'compliant' : 'exempted';
    }

    // Small vessels might not be applicable to some regulations
    if (vessel.grossTonnage < 500 && regulation.code.includes('ISM')) {
      return 'not-applicable';
    }

    // Random compliance for demonstration
    return Math.random() > 0.1 ? 'compliant' : 'non-compliant';
  }
}
