/**
 * InternationalContractService - Maritime contract analysis and review
 *
 * Based on real-world contracts like West Istanbul Marina Operations Regulations
 *
 * Analyzes:
 * - Marina mooring contracts
 * - Charter party agreements
 * - Shipbuilding contracts
 * - Sale & Purchase agreements
 * - Management agreements
 * - Service contracts
 *
 * Collaborates with ada.hukuk for Turkish legal interpretation
 */

export interface ContractClause {
  section: string; // e.g., "E.1.1", "H.2"
  title: string;
  content: string;
  type:
    | 'payment'
    | 'termination'
    | 'liability'
    | 'force-majeure'
    | 'insurance'
    | 'warranties'
    | 'indemnity'
    | 'dispute-resolution'
    | 'jurisdiction'
    | 'confidentiality'
    | 'general';

  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  obligations: Array<{
    party: 'owner' | 'marina' | 'both' | 'third-party';
    obligation: string;
    deadline?: string;
    recurring?: boolean;
  }>;

  notes?: string[];
}

export interface MarinaContract {
  contractType: 'mooring' | 'dry-berthing' | 'lifting-launching' | 'service' | 'commercial-unit';

  parties: {
    marina: {
      name: string;
      legalEntity: string;
      address: string;
      country: string;
    };
    yachtOwner: {
      name: string;
      vessel: string;
      flag: string;
      loa: number;
      beam: number;
    };
  };

  terms: {
    startDate: Date;
    endDate: Date;
    autoRenewal: boolean;
    noticePeriod: number; // days
  };

  pricing: {
    currency: string;
    mooringFee?: number;
    liftingFee?: number;
    launchingFee?: number;
    advancePayment: number; // percentage
    paymentTerms: string;
  };

  services: {
    included: string[];
    additional: string[];
    prohibited: string[];
  };

  insurance: {
    required: boolean;
    minCoverage: number;
    types: string[]; // 'P&I', 'Hull', 'Third-party liability'
  };

  liabilities: {
    marina: string[];
    yachtOwner: string[];
    excluded: string[];
  };

  termination: {
    conditions: string[];
    noticePeriod: number;
    refundPolicy: string;
    penalties?: Array<{
      breach: string;
      penalty: string;
    }>;
  };

  disputeResolution: {
    governingLaw: string;
    jurisdiction: string;
    arbitration?: {
      required: boolean;
      rules: string;
      location: string;
    };
  };

  specialProvisions: Array<{
    section: string;
    provision: string;
    unusual: boolean; // flags non-standard terms
  }>;
}

export interface ContractAnalysis {
  contractId: string;
  contractType: string;
  analysisDate: Date;

  summary: {
    totalClauses: number;
    keyTerms: string[];
    duration: string;
    totalValue: number;
    currency: string;
  };

  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    highRiskClauses: ContractClause[];
    recommendations: string[];
    redFlags: string[];
  };

  obligations: {
    immediate: Array<{
      party: string;
      action: string;
      deadline: string;
    }>;
    recurring: Array<{
      party: string;
      action: string;
      frequency: string;
    }>;
    conditional: Array<{
      party: string;
      action: string;
      condition: string;
    }>;
  };

  compliance: {
    maritimeLaw: {
      compliant: boolean;
      issues: string[];
    };
    localLaw: {
      compliant: boolean;
      issues: string[];
      requiresHukukReview: boolean;
    };
    insuranceRequirements: {
      adequate: boolean;
      gaps: string[];
    };
  };

  comparison: {
    standardPractice: 'standard' | 'favorable' | 'unfavorable' | 'unusual';
    deviations: string[];
    industryBenchmark: string;
  };

  financialSummary: {
    upfrontCosts: number;
    recurringCosts: number;
    contingentLiabilities: number;
    totalExposure: number;
    currency: string;
  };
}

export interface ContractReviewRequest {
  contractText: string;
  contractType: string;
  parties: {
    client: string; // Who requested the review
    counterparty: string;
  };
  reviewScope: 'full' | 'risk-only' | 'financial-only' | 'compliance-only';
  urgency: 'routine' | 'expedited' | 'urgent';
}

/**
 * International Contract Service
 */
export class InternationalContractService {
  /**
   * Analyze West Istanbul Marina style contract
   */
  async analyzeMarinaContract(contractText: string): Promise<MarinaContract> {
    // Parse contract sections (A-K structure typical in WIM contracts)
    const sections = this.parseContractSections(contractText);

    // Extract key information
    const marina = this.extractMarinaInfo(sections);
    const terms = this.extractTerms(sections);
    const pricing = this.extractPricing(sections);
    const services = this.extractServices(sections);
    const insurance = this.extractInsuranceRequirements(sections);
    const liabilities = this.extractLiabilities(sections);
    const termination = this.extractTerminationClauses(sections);
    const disputeResolution = this.extractDisputeResolution(sections);
    const specialProvisions = this.identifySpecialProvisions(sections);

    return {
      contractType: 'mooring',
      parties: {
        marina: {
          name: 'West Istanbul Marina',
          legalEntity: 'Enelka Taahhüt İmalat ve Tic. A.Ş.',
          address: 'Yakuplu, Beylikdüzü, İstanbul',
          country: 'TR',
        },
        yachtOwner: {
          name: '', // To be filled from specific contract
          vessel: '',
          flag: '',
          loa: 0,
          beam: 0,
        },
      },
      terms,
      pricing,
      services,
      insurance,
      liabilities,
      termination,
      disputeResolution,
      specialProvisions,
    };
  }

  /**
   * Perform comprehensive contract review
   */
  async reviewContract(request: ContractReviewRequest): Promise<ContractAnalysis> {
    const clauses = this.extractClauses(request.contractText);
    const riskClauses = clauses.filter(c => c.riskLevel === 'high' || c.riskLevel === 'critical');

    // Risk assessment
    const riskAssessment = await this.assessRisks(clauses, request.contractType);

    // Extract obligations
    const obligations = this.extractObligations(clauses);

    // Compliance check
    const compliance = await this.checkCompliance(clauses, request);

    // Compare with standard practice
    const comparison = this.compareWithStandards(clauses, request.contractType);

    // Financial summary
    const financialSummary = this.calculateFinancialExposure(clauses);

    return {
      contractId: `CNT-${Date.now()}`,
      contractType: request.contractType,
      analysisDate: new Date(),
      summary: {
        totalClauses: clauses.length,
        keyTerms: this.extractKeyTerms(clauses),
        duration: this.calculateDuration(clauses),
        totalValue: financialSummary.totalExposure,
        currency: financialSummary.currency,
      },
      riskAssessment,
      obligations,
      compliance,
      comparison,
      financialSummary,
    };
  }

  /**
   * Identify high-risk clauses (based on WIM contract analysis)
   */
  identifyHighRiskClauses(contractText: string): Array<{
    clause: string;
    risk: string;
    recommendation: string;
  }> {
    const risks: Array<{ clause: string; risk: string; recommendation: string }> = [];

    // Check for unilateral termination rights
    if (contractText.includes('unilaterally terminate') || contractText.includes('terminate without notice')) {
      risks.push({
        clause: 'Termination',
        risk: 'Marina can terminate contract unilaterally without refund (WIM H.1)',
        recommendation: 'Negotiate mutual termination clause or partial refund provision',
      });
    }

    // Check for liability exclusions
    if (contractText.includes('not covered') && contractText.includes('Financial Liability Insurance')) {
      risks.push({
        clause: 'Liability Exclusion',
        risk: 'Broad exclusions from marina liability (WIM E.2.2, E.2.3)',
        recommendation: 'Ensure comprehensive yacht insurance covers excluded risks',
      });
    }

    // Check for retention rights
    if (contractText.includes('right of retention') || contractText.includes('prevent departure')) {
      risks.push({
        clause: 'Lien/Retention Rights',
        risk: 'Marina can prevent yacht departure for unpaid fees (WIM D.9, H.5)',
        recommendation: 'Ensure timely payment to avoid detention',
      });
    }

    // Check for force majeure
    if (!contractText.includes('force majeure')) {
      risks.push({
        clause: 'Force Majeure',
        risk: 'No force majeure clause - unclear obligations in emergency',
        recommendation: 'Add force majeure clause with clear allocation of risk',
      });
    } else if (contractText.includes('not responsible') && contractText.includes('force majeure')) {
      risks.push({
        clause: 'Force Majeure - Broad Exclusion',
        risk: 'Marina excludes liability for natural disasters (WIM E.2.3)',
        recommendation: 'Verify insurance covers force majeure events',
      });
    }

    // Check for advance payment terms
    if (contractText.match(/50%|advance payment/i)) {
      risks.push({
        clause: 'Advance Payment',
        risk: '50% advance payment required, limited refund policy (WIM E.6)',
        recommendation: 'Review cancellation policy before payment',
      });
    }

    // Check for automatic renewal
    if (contractText.includes('automatically extended') || contractText.includes('auto-renewal')) {
      risks.push({
        clause: 'Auto-Renewal',
        risk: 'Contract may auto-renew without explicit consent',
        recommendation: 'Set calendar reminder 30 days before renewal deadline',
      });
    }

    // Check for Turkish jurisdiction
    if (contractText.match(/Istanbul|Turkey|Türkiye/i) && contractText.includes('jurisdiction')) {
      risks.push({
        clause: 'Jurisdiction - Turkish Courts',
        risk: 'Disputes subject to Turkish courts and law (WIM K.1)',
        recommendation: 'Consult ada.hukuk for Turkish legal proceedings understanding',
      });
    }

    // Check for unilateral price changes
    if (contractText.includes('reserves the right') && contractText.includes('price')) {
      risks.push({
        clause: 'Pricing',
        risk: 'Marina reserves right to change prices',
        recommendation: 'Request price guarantee for contract term',
      });
    }

    // Check for indemnity clauses
    if (contractText.includes('jointly and severally') || contractText.includes('indemnify')) {
      risks.push({
        clause: 'Indemnity - Joint & Several Liability',
        risk: 'Yacht owner liable for third party actions (WIM E.2.2)',
        recommendation: 'Limit authorization of third parties on yacht',
      });
    }

    return risks;
  }

  /**
   * Extract payment obligations from contract
   */
  extractPaymentObligations(contractText: string): Array<{
    description: string;
    amount: string;
    timing: string;
    penalty: string;
  }> {
    const obligations: Array<{ description: string; amount: string; timing: string; penalty: string }> = [];

    // Advance payment (WIM E.6.1)
    if (contractText.includes('50%') && contractText.includes('advance')) {
      obligations.push({
        description: 'Advance Payment',
        amount: '50% of total mooring fee',
        timing: 'Before yacht enters marina',
        penalty: 'Reservation not confirmed without payment',
      });
    }

    // VAT/Taxes (WIM E.7.7)
    if (contractText.includes('stamp tax') || contractText.includes('VAT')) {
      obligations.push({
        description: 'Stamp Taxes and VAT',
        amount: 'As per Turkish tax law',
        timing: 'In advance',
        penalty: 'Service refused until paid',
      });
    }

    // Mooring fees (WIM E.7.4)
    obligations.push({
      description: 'Mooring Fee',
      amount: 'Based on LOA × Beam × Unit Price',
      timing: 'As per contract schedule',
      penalty: 'Marina can prevent departure (retention right)',
    });

    // Lifting/Launching (WIM E.7.5)
    obligations.push({
      description: 'Lifting & Launching Fees',
      amount: 'Based on LOA × Beam',
      timing: 'Prior to operation',
      penalty: 'Operation not performed until paid',
    });

    // Late payment penalty (WIM H.3)
    if (contractText.includes('€') && contractText.includes('per square metre')) {
      obligations.push({
        description: 'Late Departure Penalty',
        amount: '4 EUR per m² per day',
        timing: 'Daily after contract expiry',
        penalty: 'Accrues until yacht removed',
      });
    }

    return obligations;
  }

  /**
   * Check insurance compliance against contract requirements
   */
  async checkInsuranceCompliance(contract: MarinaContract, insurance: {
    piPolicy?: any;
    hullPolicy?: any;
    thirdPartyPolicy?: any;
  }): Promise<{
    compliant: boolean;
    gaps: string[];
    recommendations: string[];
  }> {
    const gaps: string[] = [];
    const recommendations: string[] = [];

    // Check third-party liability (WIM E.2.1 requirement)
    if (contract.insurance.required) {
      if (!insurance.thirdPartyPolicy && !insurance.piPolicy) {
        gaps.push('No Third-Party Financial Liability insurance provided - contract requires this');
        recommendations.push('URGENT: Obtain Third-Party Liability insurance before entering marina');
      }

      // Check coverage amount
      if (insurance.thirdPartyPolicy || insurance.piPolicy) {
        const coverage = insurance.piPolicy?.coverage?.thirdPartyLiability || 0;
        if (coverage < contract.insurance.minCoverage) {
          gaps.push(`Coverage ${coverage} EUR below contract minimum ${contract.insurance.minCoverage} EUR`);
          recommendations.push(`Increase third-party liability coverage to ${contract.insurance.minCoverage} EUR`);
        }
      }

      // Check insurance provider reputation (WIM requires "prestigious insurance company")
      recommendations.push('Ensure insurance provider is internationally recognized (UK P&I Club, Gard, Allianz, etc.)');
    }

    // Check policy expiry
    recommendations.push('Set reminder to renew insurance before expiry - contract terminates if insurance lapses (WIM E.2.1)');

    // Subcontractor insurance (WIM E.5.8)
    if (contract.services.additional.length > 0) {
      recommendations.push('Any subcontractors hired must have their own Third-Party Liability insurance');
    }

    const compliant = gaps.length === 0;

    return {
      compliant,
      gaps,
      recommendations,
    };
  }

  /**
   * Generate contract summary for non-legal stakeholders
   */
  generateExecutiveSummary(analysis: ContractAnalysis): {
    onePage: string;
    keyPoints: string[];
    actionItems: string[];
    decisionRecommendation: 'sign' | 'negotiate' | 'reject';
  } {
    const keyPoints: string[] = [];
    const actionItems: string[] = [];

    // Contract basics
    keyPoints.push(`Contract Type: ${analysis.contractType}`);
    keyPoints.push(`Duration: ${analysis.summary.duration}`);
    keyPoints.push(`Total Value: ${analysis.summary.totalValue} ${analysis.summary.currency}`);

    // Risk level
    keyPoints.push(`Overall Risk: ${analysis.riskAssessment.overallRisk.toUpperCase()}`);

    // Key obligations
    if (analysis.obligations.immediate.length > 0) {
      keyPoints.push(`Immediate actions required: ${analysis.obligations.immediate.length}`);
      actionItems.push(...analysis.obligations.immediate.map(o => `${o.party}: ${o.action} by ${o.deadline}`));
    }

    // Compliance issues
    if (!analysis.compliance.maritimeLaw.compliant) {
      keyPoints.push('⚠️ Maritime law compliance issues detected');
      actionItems.push('Review maritime law compliance issues with legal team');
    }

    if (analysis.compliance.localLaw.requiresHukukReview) {
      keyPoints.push('⚠️ Turkish legal review required');
      actionItems.push('Escalate to ada.hukuk for Turkish law interpretation');
    }

    // Financial exposure
    keyPoints.push(`Contingent Liabilities: ${analysis.financialSummary.contingentLiabilities} ${analysis.financialSummary.currency}`);

    // Decision recommendation
    let decisionRecommendation: 'sign' | 'negotiate' | 'reject';

    if (analysis.riskAssessment.overallRisk === 'critical') {
      decisionRecommendation = 'reject';
      actionItems.push('⛔ DO NOT SIGN - Critical risks identified');
    } else if (analysis.riskAssessment.overallRisk === 'high' || analysis.riskAssessment.redFlags.length > 2) {
      decisionRecommendation = 'negotiate';
      actionItems.push('📝 NEGOTIATE - Request amendments to high-risk clauses');
    } else {
      decisionRecommendation = 'sign';
      actionItems.push('✅ Acceptable to sign with standard precautions');
    }

    const onePage = `
EXECUTIVE SUMMARY - CONTRACT REVIEW

Contract: ${analysis.contractType}
Date: ${analysis.analysisDate.toISOString().split('T')[0]}
Value: ${analysis.summary.totalValue} ${analysis.summary.currency}
Risk Level: ${analysis.riskAssessment.overallRisk.toUpperCase()}

KEY FINDINGS:
${keyPoints.map(p => `• ${p}`).join('\n')}

RED FLAGS:
${analysis.riskAssessment.redFlags.length > 0 ? analysis.riskAssessment.redFlags.map(f => `⚠️ ${f}`).join('\n') : 'None'}

RECOMMENDATION: ${decisionRecommendation.toUpperCase()}

IMMEDIATE ACTIONS REQUIRED:
${actionItems.map((a, i) => `${i + 1}. ${a}`).join('\n')}
    `.trim();

    return {
      onePage,
      keyPoints,
      actionItems,
      decisionRecommendation,
    };
  }

  // Helper methods (simplified implementations)

  private parseContractSections(contractText: string): Record<string, string> {
    // Parse sections A-K
    const sections: Record<string, string> = {};
    const sectionRegex = /([A-K])\.\s+([A-Z\s]+)\n([\s\S]*?)(?=\n[A-K]\.|$)/g;
    let match;
    while ((match = sectionRegex.exec(contractText)) !== null) {
      sections[match[1]] = match[3];
    }
    return sections;
  }

  private extractMarinaInfo(sections: Record<string, string>): any {
    // Extract marina information from contract
    return {};
  }

  private extractTerms(sections: Record<string, string>): any {
    return {
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      autoRenewal: true,
      noticePeriod: 15, // WIM E.2.21: 15 days notice
    };
  }

  private extractPricing(sections: Record<string, string>): any {
    return {
      currency: 'EUR',
      advancePayment: 50, // WIM E.6.1: 50% advance
      paymentTerms: 'Advance payment required',
    };
  }

  private extractServices(sections: Record<string, string>): any {
    return {
      included: ['Mooring', 'Security', 'Basic facilities'],
      additional: ['Water', 'Electricity', 'Fuel', 'Lifting', 'Launching'],
      prohibited: ['Commercial use without permission', 'Swimming in marina', 'Unauthorized subletting'],
    };
  }

  private extractInsuranceRequirements(sections: Record<string, string>): any {
    return {
      required: true, // WIM E.2.1
      minCoverage: 5000000, // Typical minimum
      types: ['Third-Party Liability'],
    };
  }

  private extractLiabilities(sections: Record<string, string>): any {
    return {
      marina: ['Equipment failure', 'Staff negligence'],
      yachtOwner: ['Third-party actions', 'Crew misconduct', 'Pollution'],
      excluded: ['Force majeure', 'Natural disasters', 'Theft'],
    };
  }

  private extractTerminationClauses(sections: Record<string, string>): any {
    return {
      conditions: ['Breach of regulations', 'Non-payment', 'Disturbance of peace'],
      noticePeriod: 0, // WIM H.1: immediate termination for breach
      refundPolicy: 'No refund for advance payment if terminated for breach',
    };
  }

  private extractDisputeResolution(sections: Record<string, string>): any {
    return {
      governingLaw: 'Turkish Law',
      jurisdiction: 'Istanbul Courts', // WIM K.1
    };
  }

  private identifySpecialProvisions(sections: Record<string, string>): any[] {
    return [];
  }

  private extractClauses(contractText: string): ContractClause[] {
    // Simplified - in production, use NLP to extract clauses
    return [];
  }

  private async assessRisks(clauses: ContractClause[], contractType: string): Promise<any> {
    const highRiskClauses = clauses.filter(c => c.riskLevel === 'high' || c.riskLevel === 'critical');

    return {
      overallRisk: highRiskClauses.length > 5 ? 'high' : highRiskClauses.length > 2 ? 'medium' : 'low',
      highRiskClauses,
      recommendations: ['Review high-risk clauses with legal counsel'],
      redFlags: ['Unilateral termination', 'Broad liability exclusions'],
    };
  }

  private extractObligations(clauses: ContractClause[]): any {
    return {
      immediate: [],
      recurring: [],
      conditional: [],
    };
  }

  private async checkCompliance(clauses: ContractClause[], request: ContractReviewRequest): Promise<any> {
    return {
      maritimeLaw: {
        compliant: true,
        issues: [],
      },
      localLaw: {
        compliant: true,
        issues: [],
        requiresHukukReview: request.contractText.includes('Turkish') || request.contractText.includes('Türkiye'),
      },
      insuranceRequirements: {
        adequate: true,
        gaps: [],
      },
    };
  }

  private compareWithStandards(clauses: ContractClause[], contractType: string): any {
    return {
      standardPractice: 'standard' as const,
      deviations: [],
      industryBenchmark: 'Typical Turkish marina contract',
    };
  }

  private calculateFinancialExposure(clauses: ContractClause[]): any {
    return {
      upfrontCosts: 0,
      recurringCosts: 0,
      contingentLiabilities: 0,
      totalExposure: 0,
      currency: 'EUR',
    };
  }

  private extractKeyTerms(clauses: ContractClause[]): string[] {
    return ['Mooring', 'Insurance', 'Liability', 'Termination'];
  }

  private calculateDuration(clauses: ContractClause[]): string {
    return '1 year';
  }
}
