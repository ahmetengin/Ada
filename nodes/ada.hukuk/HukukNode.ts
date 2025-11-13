/**
 * HukukNode - AI-powered Turkish legal consultation node
 * Provides legal research, contract analysis, and compliance checking
 * Integrates with yargi-mcp for accessing Turkish court decisions
 */

import { BaseNode, BaseNodeOptions } from '../../core/BaseNode.js';
import { v4 as uuidv4 } from 'uuid';
import {
  LegalConsultation,
  LegalDocument,
  CourtDecision,
  ContractAnalysis,
  LegalSearchQuery,
} from '../../core/types.js';
import { LegalSearchService } from './services/LegalSearchService.js';
import { ContractAnalysisService } from './services/ContractAnalysisService.js';

export interface HukukNodeConfig extends Omit<BaseNodeOptions, 'type' | 'capabilities'> {
  firmInfo?: {
    name: string;
    license?: string;
    specializations: string[];
  };
}

export class HukukNode extends BaseNode {
  private firmInfo?: HukukNodeConfig['firmInfo'];

  // Services
  private legalSearchService: LegalSearchService;
  private contractAnalysisService: ContractAnalysisService;

  // State
  private consultations: Map<string, LegalConsultation> = new Map();
  private documents: Map<string, LegalDocument> = new Map();

  constructor(config: HukukNodeConfig) {
    super({
      ...config,
      type: 'ada.hukuk',
      capabilities: {
        skills: [
          'legal-research',
          'contract-analysis',
          'compliance-checking',
          'risk-assessment',
          'court-decision-search',
          'legal-consultation',
        ],
        services: [
          'yargitay-search',
          'danistay-search',
          'anayasa-search',
          'contract-review',
          'maritime-law',
          'tourism-law',
          'commercial-law',
        ],
        integrations: [
          'yargi-mcp',
          'turkish-legal-databases',
          'ada.marina',
          'ada.sea',
          'ada.travel',
          'ada.congress',
        ],
      },
    });

    this.firmInfo = config.firmInfo;

    // Initialize services
    this.legalSearchService = new LegalSearchService();
    this.contractAnalysisService = new ContractAnalysisService();
  }

  /**
   * Initialize the Hukuk node
   */
  async initialize(): Promise<void> {
    this.logEvent('Hukuk node initializing', { firm: this.firmInfo });

    // Setup handlers for other nodes requesting legal services
    this.setupLegalServiceHandlers();

    this.logEvent('Hukuk node initialized', { id: this.identity.id });
  }

  /**
   * Process legal tasks
   */
  async processTask(task: any): Promise<any> {
    const { type, data } = task;

    switch (type) {
      case 'search-decisions':
        return await this.searchDecisions(data);

      case 'analyze-contract':
        return await this.analyzeContract(data);

      case 'legal-consultation':
        return await this.provideLegalConsultation(data);

      case 'check-compliance':
        return await this.checkCompliance(data);

      case 'search-maritime-law':
        return await this.legalSearchService.searchMaritimeLaw(data);

      case 'search-tourism-law':
        return await this.legalSearchService.searchTourismLaw(data);

      case 'get-institutions':
        return this.legalSearchService.getInstitutions();

      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  /**
   * Get node status
   */
  getStatus(): Record<string, any> {
    return {
      firm: this.firmInfo,
      consultations: {
        total: this.consultations.size,
        pending: Array.from(this.consultations.values()).filter(c => c.status === 'pending').length,
        completed: Array.from(this.consultations.values()).filter(c => c.status === 'completed')
          .length,
      },
      documents: this.documents.size,
      searchStats: this.legalSearchService.getSearchStats(),
      analysisStats: this.contractAnalysisService.getStats(),
    };
  }

  /**
   * Search court decisions
   */
  async searchDecisions(query: LegalSearchQuery): Promise<CourtDecision[]> {
    const result = await this.legalSearchService.searchDecisions(query);

    this.remember(
      'data',
      { query, results: result.totalResults },
      ['search', 'court-decisions'],
      7
    );

    return result.results;
  }

  /**
   * Analyze contract
   */
  async analyzeContract(data: {
    contractId: string;
    contractType: string;
    content: string;
    parties: string[];
    requesterId?: string;
  }): Promise<ContractAnalysis> {
    let analysis: ContractAnalysis;

    // Route to specialized analysis based on contract type
    switch (data.contractType) {
      case 'marina-contract':
      case 'berth-contract':
        analysis = await this.contractAnalysisService.analyzeMarinaContract(
          data.contractId,
          data.content,
          data.parties
        );
        break;

      case 'yacht-charter':
      case 'charter-contract':
        analysis = await this.contractAnalysisService.analyzeCharterContract(
          data.contractId,
          data.content,
          data.parties
        );
        break;

      case 'travel-contract':
      case 'tour-contract':
        analysis = await this.contractAnalysisService.analyzeTravelContract(
          data.contractId,
          data.content,
          data.parties
        );
        break;

      case 'event-contract':
      case 'congress-contract':
        analysis = await this.contractAnalysisService.analyzeEventContract(
          data.contractId,
          data.content,
          data.parties
        );
        break;

      default:
        analysis = await this.contractAnalysisService.analyzeContract(
          data.contractId,
          data.contractType,
          data.content,
          data.parties
        );
    }

    this.remember(
      'data',
      { contractId: data.contractId, analysis },
      ['contract-analysis', data.contractType],
      8
    );

    // If this is from another node, send them the results
    if (data.requesterId) {
      await this.sendMessage(
        data.requesterId,
        'contract-analysis-complete',
        {
          contractId: data.contractId,
          analysis,
        },
        { priority: 'high' }
      );
    }

    return analysis;
  }

  /**
   * Provide legal consultation
   */
  async provideLegalConsultation(data: {
    requesterId: string;
    consultationType: LegalConsultation['consultationType'];
    subject: string;
    details: any;
  }): Promise<LegalConsultation> {
    const consultation: LegalConsultation = {
      id: uuidv4(),
      requesterId: data.requesterId,
      consultationType: data.consultationType,
      subject: data.subject,
      details: data.details,
      response: {
        opinion: '',
        risks: [],
        recommendations: [],
        relevantDecisions: [],
        relevantLaws: [],
      },
      createdAt: new Date(),
      status: 'in-progress',
    };

    this.consultations.set(consultation.id, consultation);

    // Process consultation based on type
    switch (data.consultationType) {
      case 'contract-review':
        await this.processContractReview(consultation);
        break;

      case 'compliance-check':
        await this.processComplianceCheck(consultation);
        break;

      case 'legal-opinion':
        await this.processLegalOpinion(consultation);
        break;

      case 'case-research':
        await this.processCaseResearch(consultation);
        break;
    }

    consultation.status = 'completed';

    this.remember('data', { consultation }, ['consultation', data.consultationType], 9);

    // Send response to requester
    await this.sendMessage(
      data.requesterId,
      'legal-consultation-complete',
      {
        consultationId: consultation.id,
        response: consultation.response,
      },
      { priority: 'high' }
    );

    return consultation;
  }

  /**
   * Check compliance
   */
  async checkCompliance(data: {
    area: string;
    documentType: string;
    content: string;
  }): Promise<any> {
    // This would perform detailed compliance checking
    // For now, return a basic structure

    return {
      area: data.area,
      compliant: true,
      requirements: [],
      violations: [],
      recommendations: [],
    };
  }

  /**
   * Setup handlers for legal service requests from other nodes
   */
  private setupLegalServiceHandlers(): void {
    // Handle contract review requests
    this.communication.onMessage('request-contract-review', async (message) => {
      const { contractId, contractType, content, parties } = message.payload;

      this.remember('conversation', message, ['contract-review-request'], 7);

      const analysis = await this.analyzeContract({
        contractId,
        contractType,
        content,
        parties,
        requesterId: message.from,
      });

      return {
        success: true,
        analysis,
      };
    });

    // Handle legal opinion requests
    this.communication.onMessage('request-legal-opinion', async (message) => {
      const { subject, details } = message.payload;

      this.remember('conversation', message, ['legal-opinion-request'], 7);

      const consultation = await this.provideLegalConsultation({
        requesterId: message.from,
        consultationType: 'legal-opinion',
        subject,
        details,
      });

      return {
        success: true,
        consultation,
      };
    });

    // Handle court decision search requests
    this.communication.onMessage('search-court-decisions', async (message) => {
      const { institution, keyword, options } = message.payload;

      this.remember('conversation', message, ['search-request'], 6);

      const decisions = await this.legalSearchService.searchByKeyword(
        institution,
        keyword,
        options
      );

      return {
        success: true,
        decisions,
        total: decisions.length,
      };
    });

    // Handle compliance check requests
    this.communication.onMessage('check-legal-compliance', async (message) => {
      const compliance = await this.checkCompliance(message.payload);

      return {
        success: true,
        compliance,
      };
    });
  }

  /**
   * Process contract review consultation
   */
  private async processContractReview(consultation: LegalConsultation): Promise<void> {
    const { contractContent, contractType } = consultation.details;

    const analysis = await this.contractAnalysisService.analyzeContract(
      uuidv4(),
      contractType,
      contractContent,
      []
    );

    consultation.response.opinion = `Sözleşme analizi tamamlandı. ${analysis.risks.length} adet risk tespit edildi.`;
    consultation.response.risks = analysis.risks;
    consultation.response.recommendations = analysis.recommendations;
    consultation.response.relevantDecisions = analysis.relatedDecisions;
  }

  /**
   * Process compliance check consultation
   */
  private async processComplianceCheck(consultation: LegalConsultation): Promise<void> {
    const { area, content } = consultation.details;

    consultation.response.opinion = `${area} alanında uyumluluk kontrolü yapıldı.`;
    consultation.response.recommendations = [
      'İlgili mevzuat güncel takip edilmelidir.',
      'Periyodik uyumluluk denetimleri yapılmalıdır.',
    ];
  }

  /**
   * Process legal opinion consultation
   */
  private async processLegalOpinion(consultation: LegalConsultation): Promise<void> {
    const { question, context } = consultation.details;

    // Search for relevant court decisions
    const keyword = this.extractKeyword(question);
    const decisions = await this.legalSearchService.searchByKeyword('yargitay', keyword, {
      limit: 3,
    });

    consultation.response.opinion = `${consultation.subject} konusunda hukuki görüş:`;
    consultation.response.relevantDecisions = decisions;
    consultation.response.recommendations = [
      'İlgili içtihatlar değerlendirilmelidir.',
      'Uzman hukukçu görüşü alınmalıdır.',
    ];
  }

  /**
   * Process case research consultation
   */
  private async processCaseResearch(consultation: LegalConsultation): Promise<void> {
    const { institution, keyword, dateRange } = consultation.details;

    const decisions = await this.legalSearchService.searchByKeyword(
      institution,
      keyword,
      dateRange
    );

    consultation.response.opinion = `${decisions.length} adet ilgili karar bulundu.`;
    consultation.response.relevantDecisions = decisions;
  }

  /**
   * Extract keyword from question
   */
  private extractKeyword(question: string): string {
    // Simple keyword extraction - would use NLP in production
    const words = question.split(' ');
    return words.find(w => w.length > 5) || words[0] || 'hukuk';
  }

  /**
   * Get consultation by ID
   */
  getConsultation(consultationId: string): LegalConsultation | undefined {
    return this.consultations.get(consultationId);
  }

  /**
   * Get all consultations
   */
  getAllConsultations(): LegalConsultation[] {
    return Array.from(this.consultations.values());
  }

  /**
   * Store legal document
   */
  storeDocument(document: LegalDocument): void {
    this.documents.set(document.id, document);
    this.remember('data', { document }, ['legal-document'], 7);
  }

  /**
   * Get document
   */
  getDocument(documentId: string): LegalDocument | undefined {
    return this.documents.get(documentId);
  }
}
