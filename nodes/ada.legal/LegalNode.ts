/**
 * LegalNode - AI-powered legal services node
 * Manages contracts, compliance, legal documents, and maritime law
 * Learns from contract patterns and regulatory changes
 */

import { BaseNode, BaseNodeOptions } from '../../core/BaseNode.js';
import { v4 as uuidv4 } from 'uuid';
import { MaritimeLawService } from './services/MaritimeLawService.js';
import { ComplianceService } from './services/ComplianceService.js';
import { InsuranceService } from './services/InsuranceService.js';
import { InternationalContractService } from './services/InternationalContractService.js';

export interface LegalNodeConfig extends Omit<BaseNodeOptions, 'type' | 'capabilities'> {
  firmInfo: {
    name: string;
    license: string; // Baro sicil numarası
    specializations: string[];
  };
}

interface PaymentScheduleItem {
  date: Date;
  amount: number;
  description: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paidAt?: Date;
  invoiceNumber?: string;
}

interface ContractFinancialTerms {
  direction: 'receivable' | 'payable'; // Are we receiving money or paying?
  invoicingParty: 'provider' | 'client'; // Who issues the invoice?
  totalAmount: number;
  currency: 'TRY' | 'EUR' | 'USD' | 'GBP' | 'CHF';
  paymentSchedule: PaymentScheduleItem[];
  paymentMethod?: 'bank-transfer' | 'cash' | 'credit-card';
  lateFeeRate?: number; // Gecikme faizi (%)
  advancePayment?: {
    amount: number;
    dueDate: Date;
  };
}

interface LegalContract {
  id: string;
  type: 'berth-rental' | 'crew-employment' | 'charter' | 'service' | 'nda' | 'partnership' | 'supplier' | 'venue-rental' | 'hotel-agreement';
  parties: ContractParty[];
  terms: ContractTerm[];
  financialTerms?: ContractFinancialTerms; // Financial obligations
  language: 'tr' | 'en' | 'multi';
  jurisdiction: string; // 'Turkey', 'UK', 'International'
  status: 'draft' | 'review' | 'signed' | 'active' | 'expired' | 'terminated';
  createdDate: Date;
  effectiveDate: Date;
  expiryDate?: Date;
  documentUrl?: string;
  signedDocumentUrl?: string;
}

interface ContractParty {
  role: 'client' | 'provider' | 'witness';
  name: string;
  taxId?: string;
  address?: string;
  representative?: string;
  signatureStatus: 'pending' | 'signed';
  signedAt?: Date;
}

interface ContractTerm {
  clause: string;
  description: string;
  importance: 'critical' | 'important' | 'standard';
  learnedFrom?: string; // Which case/contract taught us this
}

interface ComplianceCheck {
  id: string;
  entityId: string;
  entityType: 'marina' | 'yacht' | 'company';
  checkType: 'maritime-law' | 'tax-compliance' | 'insurance' | 'labor-law' | 'environmental';
  regulations: string[];
  status: 'compliant' | 'warning' | 'non-compliant';
  issues: ComplianceIssue[];
  lastChecked: Date;
  nextCheckDue: Date;
}

interface ComplianceIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  regulation: string;
  description: string;
  remediation: string;
  deadline?: Date;
}

interface LegalAdvice {
  id: string;
  question: string;
  area: 'maritime' | 'employment' | 'tax' | 'contract' | 'insurance';
  advice: string;
  references: string[]; // Laws, regulations, precedents
  confidence: number; // 0-1, how confident the AI is
  reviewedBy?: string; // Human lawyer review
  learnedPattern?: string; // What pattern the AI learned
}

export class LegalNode extends BaseNode {
  private firmInfo: LegalNodeConfig['firmInfo'];
  private contracts: Map<string, LegalContract> = new Map();
  private complianceChecks: Map<string, ComplianceCheck> = new Map();
  private adviceHistory: Map<string, LegalAdvice> = new Map();

  // Learning database - AI learns from these
  private learnedClauses: Map<string, ContractTerm> = new Map();
  private precedents: Map<string, any> = new Map();

  // Professional services
  private maritimeLawService: MaritimeLawService;
  private complianceService: ComplianceService;
  private insuranceService: InsuranceService;
  private contractService: InternationalContractService;

  constructor(config: LegalNodeConfig) {
    super({
      ...config,
      type: 'ada.legal',
      capabilities: {
        skills: [
          'contract-drafting',
          'contract-review',
          'compliance-checking',
          'legal-advice',
          'document-signing',
          'maritime-law',
          'labor-law',
          'tax-law',
          'dispute-resolution',
          'regulatory-monitoring',
          'ai-learning', // AI learns from contracts
          'pattern-recognition', // Recognizes risky clauses
          'imo-regulations', // IMO, SOLAS, MARPOL
          'kvkk-gdpr-compliance', // KVKK/GDPR
          'maritime-insurance', // P&I, H&M
          'international-contracts', // Marina contracts, charter parties
        ],
        services: [
          'contract-management',
          'compliance-audit',
          'legal-consultation',
          'document-preparation',
          'regulatory-updates',
          'risk-assessment',
          'vessel-compliance',
          'insurance-review',
          'contract-analysis',
        ],
        integrations: [
          'ada.marina',
          'ada.sea',
          'ada.finance',
          'ada.congress',
          'ada.hukuk', // Turkish legal consultation
          'e-signature-apis',
          'legal-databases',
          'government-apis',
        ],
      },
    });

    this.firmInfo = config.firmInfo;

    // Initialize professional services
    this.maritimeLawService = new MaritimeLawService();
    this.complianceService = new ComplianceService();
    this.insuranceService = new InsuranceService();
    this.contractService = new InternationalContractService();

    this.initializeLearnedKnowledge();
  }

  /**
   * Initialize the Legal node
   */
  async initialize(): Promise<void> {
    this.logEvent('Legal node initializing', { firm: this.firmInfo });
    this.setupLegalHandlers();
    this.logEvent('Legal node initialized', { id: this.identity.id });
  }

  /**
   * Process legal tasks
   */
  async processTask(task: any): Promise<any> {
    const { type, data } = task;

    switch (type) {
      case 'draft-contract':
        return this.draftContract(data);
      case 'review-contract':
        return this.reviewContract(data);
      case 'check-compliance':
        return this.checkCompliance(data);
      case 'get-legal-advice':
        return this.provideLegalAdvice(data);
      case 'sign-contract':
        return this.signContract(data);
      // New service-backed tasks
      case 'check-vessel-compliance':
        return this.maritimeLawService.checkVesselCompliance(data.vessel);
      case 'check-kvkk-compliance':
        return this.complianceService.checkKVKKCompliance(data.activity);
      case 'check-gdpr-compliance':
        return this.complianceService.checkGDPRCompliance(data.activity);
      case 'process-data-subject-request':
        return this.complianceService.processDataSubjectRequest(data.request);
      case 'handle-data-breach':
        return this.complianceService.handleDataBreach(data.incident);
      case 'check-insurance-coverage':
        return this.insuranceService.checkCoverageAdequacy(data.vessel, data.policies);
      case 'process-insurance-claim':
        return this.insuranceService.processClaim(data.claim);
      case 'analyze-marina-contract':
        return this.contractService.analyzeMarinaContract(data.contractText);
      case 'identify-contract-risks':
        return this.contractService.identifyHighRiskClauses(data.contractText);
      case 'check-insurance-compliance':
        return this.contractService.checkInsuranceCompliance(data.contract, data.insurance);
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  /**
   * Get node status
   */
  getStatus(): Record<string, any> {
    const activeContracts = Array.from(this.contracts.values())
      .filter(c => c.status === 'active').length;

    const pendingReview = Array.from(this.contracts.values())
      .filter(c => c.status === 'review').length;

    const complianceIssues = Array.from(this.complianceChecks.values())
      .filter(c => c.status === 'non-compliant').length;

    return {
      firm: this.firmInfo,
      totalContracts: this.contracts.size,
      activeContracts,
      pendingReview,
      complianceIssues,
      learnedClauses: this.learnedClauses.size,
      adviceProvided: this.adviceHistory.size,
    };
  }

  /**
   * Draft contract using AI learning
   */
  async draftContract(data: {
    type: LegalContract['type'];
    parties: Array<{ role: string; name: string; taxId?: string }>;
    customTerms?: string[];
    language?: 'tr' | 'en';
    jurisdiction?: string;
    financialTerms?: Omit<ContractFinancialTerms, 'paymentSchedule'> & {
      paymentSchedule?: ContractFinancialTerms['paymentSchedule'];
      installments?: number; // Auto-generate payment schedule with N installments
    };
  }): Promise<LegalContract> {
    // AI learns from previous contracts of same type
    const similarContracts = Array.from(this.contracts.values())
      .filter(c => c.type === data.type && c.status !== 'terminated');

    // Build terms from learned knowledge + custom
    const terms: ContractTerm[] = [];

    // Add standard terms (learned from previous contracts)
    const standardTerms = this.getStandardTermsForType(data.type);
    terms.push(...standardTerms);

    // Add custom terms if provided
    if (data.customTerms) {
      data.customTerms.forEach(term => {
        terms.push({
          clause: `CUSTOM-${terms.length + 1}`,
          description: term,
          importance: 'important',
        });
      });
    }

    // Build financial terms if provided
    let financialTerms: ContractFinancialTerms | undefined;
    if (data.financialTerms) {
      // Auto-generate payment schedule if installments specified
      let paymentSchedule: PaymentScheduleItem[];

      if (data.financialTerms.installments && data.financialTerms.installments > 0) {
        paymentSchedule = this.generatePaymentSchedule(
          data.financialTerms.totalAmount,
          data.financialTerms.installments,
          data.financialTerms.advancePayment
        );
      } else {
        paymentSchedule = data.financialTerms.paymentSchedule || [];
      }

      financialTerms = {
        direction: data.financialTerms.direction,
        invoicingParty: data.financialTerms.invoicingParty,
        totalAmount: data.financialTerms.totalAmount,
        currency: data.financialTerms.currency,
        paymentSchedule,
        paymentMethod: data.financialTerms.paymentMethod,
        lateFeeRate: data.financialTerms.lateFeeRate,
        advancePayment: data.financialTerms.advancePayment,
      };
    }

    const contract: LegalContract = {
      id: uuidv4(),
      type: data.type,
      parties: data.parties.map(p => ({
        ...p,
        role: p.role as ContractParty['role'],
        signatureStatus: 'pending',
      })),
      terms,
      financialTerms,
      language: data.language || 'tr',
      jurisdiction: data.jurisdiction || 'Turkey',
      status: 'draft',
      createdDate: new Date(),
      effectiveDate: new Date(),
    };

    this.contracts.set(contract.id, contract);

    // Learn from this contract
    this.learnFromContract(contract);

    this.remember('data', { contract, learnedFrom: similarContracts.length }, ['contract', 'ai-learning'], 8);

    // Notify finance about contract financial obligations
    if (financialTerms) {
      await this.notifyFinanceAboutContract(contract);
    }

    // Create invoice for legal services via Finance node
    this.createInvoiceForLegalService(contract, data.parties)
      .catch(error => {
        console.error('Failed to create invoice for legal service:', error.message);
      });

    return contract;
  }

  /**
   * Create invoice for legal service via Finance node
   */
  private async createInvoiceForLegalService(
    contract: LegalContract,
    parties: Array<{ role: string; name: string }>
  ): Promise<void> {
    const financeNodes = BaseNode.findNodesByType('ada.finance');
    if (financeNodes.length === 0) {
      console.log('No finance node available for invoice creation');
      return;
    }

    try {
      // Determine the client (who pays for legal services)
      const client = parties.find(p => p.role === 'client' || p.role === 'employer' || p.role === 'charterer');
      if (!client) {
        console.log('No client party found for invoice');
        return;
      }

      // Calculate fee based on contract type
      const fees: Record<string, number> = {
        'berth-rental': 500,
        'crew-employment': 350,
        'charter': 1000,
        'service': 400,
        'nda': 200,
        'partnership': 800,
      };
      const fee = fees[contract.type] || 500;

      const invoiceResponse = await this.requestFromNode(
        financeNodes[0].getIdentity().id,
        'create-invoice',
        {
          customerId: contract.id,
          customerName: client.name,
          items: [
            {
              description: `Legal Services - ${contract.type} contract drafting`,
              quantity: 1,
              unitPrice: fee,
              vatRate: 20, // %20 KDV
            },
          ],
          withholdingRate: 20, // %20 Stopaj for professional services in Turkey
        }
      );

      this.remember('data', {
        contractId: contract.id,
        invoice: invoiceResponse,
      }, ['invoice', 'finance', 'legal-fees'], 8);

      console.log(`✅ Invoice created for legal service (contract ${contract.id}): ${invoiceResponse.invoice?.invoiceNumber}`);
    } catch (error: any) {
      console.error(`Failed to create invoice for contract ${contract.id}:`, error.message);
    }
  }

  /**
   * Review contract with AI risk detection
   */
  async reviewContract(data: {
    contractId?: string;
    contractText?: string;
  }): Promise<any> {
    const risks: string[] = [];
    const suggestions: string[] = [];

    let contract: LegalContract | undefined;

    if (data.contractId) {
      contract = this.contracts.get(data.contractId);
    }

    // AI-powered risk detection
    if (data.contractText) {
      // Use InternationalContractService for advanced analysis
      const highRiskClauses = this.contractService.identifyHighRiskClauses(data.contractText);

      highRiskClauses.forEach(riskClause => {
        risks.push(riskClause.risk);
        suggestions.push(riskClause.recommendation);
      });

      // Legacy checks (kept for compatibility)
      if (data.contractText.toLowerCase().includes('unlimited liability')) {
        risks.push('Unlimited liability clause detected - HIGH RISK');
        suggestions.push('Consider adding liability cap');
      }

      if (!data.contractText.toLowerCase().includes('force majeure')) {
        risks.push('No force majeure clause found');
        suggestions.push('Add force majeure clause for maritime operations');
      }

      // Check for missing signatures
      if (!data.contractText.toLowerCase().includes('signature')) {
        risks.push('No signature section found');
      }
    }

    const review = {
      contractId: data.contractId,
      status: risks.length === 0 ? 'approved' : 'needs-revision',
      risks,
      suggestions,
      reviewDate: new Date(),
      aiConfidence: 0.85, // AI is 85% confident
      humanReviewRecommended: risks.length > 2,
    };

    this.remember('data', { review }, ['contract-review', 'risk-detection'], 8);

    return review;
  }

  /**
   * Check compliance (AI monitors regulations)
   */
  async checkCompliance(data: {
    entityId: string;
    entityType: 'marina' | 'yacht' | 'company';
    checkTypes?: ComplianceCheck['checkType'][];
  }): Promise<ComplianceCheck> {
    const issues: ComplianceIssue[] = [];

    // AI checks regulations (in production, would check real regulatory databases)
    if (data.entityType === 'yacht') {
      // Check maritime compliance
      issues.push({
        severity: 'medium',
        regulation: 'SOLAS Chapter V',
        description: 'Annual safety equipment inspection due',
        remediation: 'Schedule safety equipment audit within 30 days',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }

    if (data.entityType === 'marina') {
      // Check environmental compliance
      issues.push({
        severity: 'low',
        regulation: 'Turkish Environmental Law 2872',
        description: 'Quarterly waste management report pending',
        remediation: 'Submit waste disposal records to Ministry',
        deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      });
    }

    const check: ComplianceCheck = {
      id: uuidv4(),
      entityId: data.entityId,
      entityType: data.entityType,
      checkType: data.checkTypes?.[0] || 'maritime-law',
      regulations: ['SOLAS', 'MARPOL', 'Turkish Maritime Law'],
      status: issues.some(i => i.severity === 'critical') ? 'non-compliant' :
              issues.length > 0 ? 'warning' : 'compliant',
      issues,
      lastChecked: new Date(),
      nextCheckDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    };

    this.complianceChecks.set(check.id, check);

    this.remember('data', { check }, ['compliance', 'regulatory'], 7);

    return check;
  }

  /**
   * Provide legal advice (AI reasoning)
   */
  async provideLegalAdvice(data: {
    question: string;
    area: LegalAdvice['area'];
  }): Promise<LegalAdvice> {
    // AI reasoning based on learned knowledge
    let advice = '';
    const references: string[] = [];
    let confidence = 0.8;

    // Pattern matching from learned cases
    if (data.question.toLowerCase().includes('crew contract')) {
      advice = 'For crew employment contracts in Turkish waters:\n' +
        '1. Must include minimum wage provisions per Turkish Labor Law\n' +
        '2. Maritime labor has special rules under Law 854 (Maritime Labor)\n' +
        '3. Include force majeure for maritime-specific risks\n' +
        '4. Specify working hours (max 12h/day for maritime crew)\n' +
        '5. Include repatriation clause';

      references.push('Turkish Labor Law 4857', 'Maritime Labor Law 854', 'ILO Convention');
      confidence = 0.92;
    } else if (data.question.toLowerCase().includes('berth')) {
      advice = 'Berth rental agreements should include:\n' +
        '1. Clear duration and renewal terms\n' +
        '2. Marina liability limitations\n' +
        '3. Vessel owner insurance requirements\n' +
        '4. Payment terms with VAT (20% in Turkey)\n' +
        '5. Termination conditions';

      references.push('Turkish Code of Obligations', 'Marina Regulations');
      confidence = 0.88;
    } else {
      advice = 'General legal advice available. Please consult with a licensed attorney for specific legal matters.';
      confidence = 0.5;
    }

    const legalAdvice: LegalAdvice = {
      id: uuidv4(),
      question: data.question,
      area: data.area,
      advice,
      references,
      confidence,
      learnedPattern: confidence > 0.8 ? 'High-confidence from learned patterns' : undefined,
    };

    this.adviceHistory.set(legalAdvice.id, legalAdvice);

    // AI learns from this interaction
    this.remember('conversation', { advice: legalAdvice }, ['legal-advice', 'ai-learning'], 7);

    return legalAdvice;
  }

  /**
   * Sign contract (e-signature)
   */
  async signContract(data: {
    contractId: string;
    partyName: string;
    signature: string; // Digital signature
  }): Promise<any> {
    const contract = this.contracts.get(data.contractId);

    if (!contract) {
      return { success: false, message: 'Contract not found' };
    }

    const party = contract.parties.find(p => p.name === data.partyName);

    if (!party) {
      return { success: false, message: 'Party not found in contract' };
    }

    party.signatureStatus = 'signed';
    party.signedAt = new Date();

    // Check if all parties signed
    const allSigned = contract.parties.every(p => p.signatureStatus === 'signed');

    if (allSigned) {
      contract.status = 'active';
      contract.effectiveDate = new Date();
    }

    this.remember('event', { contractId: data.contractId, signed: true }, ['signature', 'contract'], 8);

    return {
      success: true,
      contract,
      allPartiesSigned: allSigned,
      status: contract.status,
    };
  }

  /**
   * Get standard terms for contract type (AI learned these)
   */
  private getStandardTermsForType(type: LegalContract['type']): ContractTerm[] {
    const learnedTerms = Array.from(this.learnedClauses.values())
      .filter(t => t.learnedFrom?.includes(type));

    if (learnedTerms.length > 0) {
      return learnedTerms;
    }

    // Default terms if nothing learned yet
    const defaults: Record<string, ContractTerm[]> = {
      'berth-rental': [
        {
          clause: 'PAYMENT',
          description: 'Monthly berth rental fee payable in advance, including 20% VAT',
          importance: 'critical',
        },
        {
          clause: 'LIABILITY',
          description: 'Marina liability limited to gross negligence only',
          importance: 'critical',
        },
        {
          clause: 'INSURANCE',
          description: 'Vessel owner must maintain comprehensive marine insurance',
          importance: 'critical',
        },
        {
          clause: 'TERMINATION',
          description: '30-day written notice required for termination',
          importance: 'important',
        },
      ],
      'crew-employment': [
        {
          clause: 'COMPENSATION',
          description: 'Monthly salary per Turkish minimum wage requirements',
          importance: 'critical',
        },
        {
          clause: 'WORKING_HOURS',
          description: 'Maximum 12 hours per day for maritime crew',
          importance: 'critical',
        },
        {
          clause: 'REPATRIATION',
          description: 'Employer covers repatriation costs if contract terminated abroad',
          importance: 'critical',
        },
      ],
    };

    return defaults[type] || [];
  }

  /**
   * Learn from contract (AI self-improvement)
   */
  private learnFromContract(contract: LegalContract): void {
    // Store contract patterns for future learning
    contract.terms.forEach(term => {
      if (term.importance === 'critical') {
        this.learnedClauses.set(`${contract.type}-${term.clause}`, {
          ...term,
          learnedFrom: contract.type,
        });
      }
    });

    // Update learning statistics
    this.remember('data', {
      contractType: contract.type,
      termsLearned: contract.terms.length,
      totalLearnedClauses: this.learnedClauses.size,
    }, ['ai-learning', 'knowledge-base'], 6);
  }

  /**
   * Initialize learned knowledge from past cases
   */
  private initializeLearnedKnowledge(): void {
    // Seed with some initial legal knowledge
    // In production, this would load from a database
    this.learnedClauses.set('force-majeure', {
      clause: 'FORCE_MAJEURE',
      description: 'Neither party liable for delays due to acts of God, war, or government action',
      importance: 'critical',
      learnedFrom: 'maritime-contracts-2020-2024',
    });
  }

  /**
   * Generate payment schedule with equal installments
   */
  private generatePaymentSchedule(
    totalAmount: number,
    installments: number,
    advancePayment?: { amount: number; dueDate: Date }
  ): PaymentScheduleItem[] {
    const schedule: PaymentScheduleItem[] = [];

    // Add advance payment if specified
    if (advancePayment) {
      schedule.push({
        date: advancePayment.dueDate,
        amount: advancePayment.amount,
        description: 'Ön ödeme (Advance payment)',
        status: 'pending',
      });
      totalAmount -= advancePayment.amount;
    }

    // Divide remaining amount into equal installments
    const installmentAmount = Math.round((totalAmount / installments) * 100) / 100;
    let remainingAmount = totalAmount;

    for (let i = 0; i < installments; i++) {
      const isLast = i === installments - 1;
      const amount = isLast ? remainingAmount : installmentAmount;

      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i + 1);

      schedule.push({
        date: dueDate,
        amount,
        description: `Taksit ${i + 1}/${installments} (Installment ${i + 1}/${installments})`,
        status: 'pending',
      });

      remainingAmount -= amount;
    }

    return schedule;
  }

  /**
   * Notify finance node about contract financial obligations
   */
  private async notifyFinanceAboutContract(contract: LegalContract): Promise<void> {
    if (!contract.financialTerms) return;

    const financeNodes = BaseNode.findNodesByType('ada.finance');
    if (financeNodes.length === 0) {
      this.logger.warn('No finance node available for contract notification');
      return;
    }

    try {
      const { financialTerms } = contract;

      // Find the other party (not us)
      const otherParty = contract.parties.find(p =>
        financialTerms.direction === 'receivable'
          ? p.role === 'client'
          : p.role === 'provider'
      );

      if (!otherParty) {
        this.logger.warn('Could not determine other party in contract');
        return;
      }

      // Notify finance based on direction
      const messageType = financialTerms.direction === 'receivable'
        ? 'register-receivable-contract'
        : 'register-payable-contract';

      await this.requestFromNode(
        financeNodes[0].getIdentity().id,
        messageType,
        {
          contractId: contract.id,
          contractType: contract.type,
          direction: financialTerms.direction,
          counterparty: {
            name: otherParty.name,
            taxId: otherParty.taxId,
          },
          totalAmount: financialTerms.totalAmount,
          currency: financialTerms.currency,
          paymentSchedule: financialTerms.paymentSchedule,
          paymentMethod: financialTerms.paymentMethod,
          lateFeeRate: financialTerms.lateFeeRate,
        }
      );

      this.logger.info('Finance notified about contract', {
        contractId: contract.id,
        direction: financialTerms.direction,
        amount: financialTerms.totalAmount,
      });

    } catch (error: any) {
      this.logger.error('Failed to notify finance about contract', {
        contractId: contract.id,
        error: error.message,
      });
    }
  }

  /**
   * Setup legal-specific message handlers
   */
  private setupLegalHandlers(): void {
    // Contract request from other nodes
    this.communication.onMessage('request-contract', async (message) => {
      this.remember('conversation', message, ['contract-request'], 8);
      const contract = await this.draftContract(message.payload);
      return { success: true, contract };
    });

    // Legal advice request
    this.communication.onMessage('legal-advice', async (message) => {
      const advice = await this.provideLegalAdvice(message.payload);
      return advice;
    });

    // Compliance check request
    this.communication.onMessage('compliance-check', async (message) => {
      const check = await this.checkCompliance(message.payload);
      return check;
    });
  }
}
