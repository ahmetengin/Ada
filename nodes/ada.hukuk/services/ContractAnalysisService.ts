/**
 * ContractAnalysisService - AI-powered contract analysis and risk assessment
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ContractAnalysis,
  LegalRisk,
  ComplianceCheck,
  CourtDecision,
} from '../../../core/types.js';
import { LegalSearchService } from './LegalSearchService.js';

export class ContractAnalysisService {
  private legalSearchService: LegalSearchService;
  private analyses: Map<string, ContractAnalysis> = new Map();

  constructor() {
    this.legalSearchService = new LegalSearchService();
  }

  /**
   * Analyze a contract
   */
  async analyzeContract(
    contractId: string,
    contractType: string,
    contractContent: string,
    parties: string[]
  ): Promise<ContractAnalysis> {
    // Extract key clauses and identify risks
    const risks = this.identifyRisks(contractContent, contractType);

    // Check compliance
    const compliance = this.checkCompliance(contractContent, contractType);

    // Search for related court decisions
    const relatedDecisions = await this.legalSearchService.searchContractLaw(
      contractType,
      { limit: 5 }
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(risks, compliance);

    const analysis: ContractAnalysis = {
      contractId,
      contractType,
      parties,
      analyzedDate: new Date(),
      risks,
      compliance,
      recommendations,
      relatedDecisions,
    };

    this.analyses.set(contractId, analysis);

    return analysis;
  }

  /**
   * Analyze marina berth contract
   */
  async analyzeMarinaContract(
    contractId: string,
    contractContent: string,
    parties: string[]
  ): Promise<ContractAnalysis> {
    const analysis = await this.analyzeContract(
      contractId,
      'marina-berth-contract',
      contractContent,
      parties
    );

    // Add marina-specific checks
    analysis.risks.push(...this.checkMarinaSpecificRisks(contractContent));
    analysis.compliance.push(...this.checkMarinaCompliance(contractContent));

    return analysis;
  }

  /**
   * Analyze yacht charter contract
   */
  async analyzeCharterContract(
    contractId: string,
    contractContent: string,
    parties: string[]
  ): Promise<ContractAnalysis> {
    const analysis = await this.analyzeContract(
      contractId,
      'yacht-charter-contract',
      contractContent,
      parties
    );

    // Add maritime-specific checks
    analysis.risks.push(...this.checkMaritimeSpecificRisks(contractContent));
    analysis.compliance.push(...this.checkMaritimeCompliance(contractContent));

    return analysis;
  }

  /**
   * Analyze travel/tourism contract
   */
  async analyzeTravelContract(
    contractId: string,
    contractContent: string,
    parties: string[]
  ): Promise<ContractAnalysis> {
    const analysis = await this.analyzeContract(
      contractId,
      'travel-contract',
      contractContent,
      parties
    );

    // Add tourism-specific checks
    analysis.risks.push(...this.checkTourismSpecificRisks(contractContent));
    analysis.compliance.push(...this.checkTourismCompliance(contractContent));

    return analysis;
  }

  /**
   * Analyze event/congress contract
   */
  async analyzeEventContract(
    contractId: string,
    contractContent: string,
    parties: string[]
  ): Promise<ContractAnalysis> {
    const analysis = await this.analyzeContract(
      contractId,
      'event-contract',
      contractContent,
      parties
    );

    // Add event-specific checks
    analysis.risks.push(...this.checkEventSpecificRisks(contractContent));
    analysis.compliance.push(...this.checkEventCompliance(contractContent));

    return analysis;
  }

  /**
   * Identify general contract risks
   */
  private identifyRisks(content: string, contractType: string): LegalRisk[] {
    const risks: LegalRisk[] = [];

    // Check for missing essential clauses
    if (!content.toLowerCase().includes('sorumluluk') && !content.toLowerCase().includes('liability')) {
      risks.push({
        severity: 'high',
        category: 'missing-clause',
        description: 'Sorumluluk maddesi eksik veya belirsiz',
        recommendation: 'Açık bir sorumluluk maddesi eklenmelidir',
        relatedLaw: '6098 sayılı TBK',
      });
    }

    if (!content.toLowerCase().includes('fesih') && !content.toLowerCase().includes('termination')) {
      risks.push({
        severity: 'medium',
        category: 'missing-clause',
        description: 'Fesih şartları açık değil',
        recommendation: 'Sözleşmenin fesih koşulları detaylandırılmalıdır',
        relatedLaw: '6098 sayılı TBK',
      });
    }

    if (!content.toLowerCase().includes('uyuşmazlık') && !content.toLowerCase().includes('dispute')) {
      risks.push({
        severity: 'medium',
        category: 'missing-clause',
        description: 'Uyuşmazlık çözüm yöntemi belirtilmemiş',
        recommendation: 'Tahkim veya yetkili mahkeme belirtilmelidir',
        relatedLaw: '6100 sayılı HMK',
      });
    }

    return risks;
  }

  /**
   * Check general compliance
   */
  private checkCompliance(content: string, contractType: string): ComplianceCheck[] {
    return [
      {
        area: 'contract-law',
        compliant: true,
        requirements: [
          'Tarafların kimlik bilgileri',
          'Edimin belirliliği',
          'Borçların açıklanması',
        ],
        violations: [],
        recommendedActions: [],
      },
    ];
  }

  /**
   * Marina-specific risk checks
   */
  private checkMarinaSpecificRisks(content: string): LegalRisk[] {
    const risks: LegalRisk[] = [];

    if (!content.toLowerCase().includes('sigorta')) {
      risks.push({
        severity: 'critical',
        category: 'maritime-risk',
        description: 'Zorunlu sigorta hükmü eksik',
        recommendation: 'Tekne ve sorumluluk sigortası zorunluluğu eklenmelidir',
        relatedLaw: '6102 sayılı TTK',
      });
    }

    if (!content.toLowerCase().includes('kötü hava')) {
      risks.push({
        severity: 'medium',
        category: 'operational-risk',
        description: 'Hava koşulları ile ilgili sorumluluk belirsiz',
        recommendation: 'Kötü hava koşullarında yükümlülükler tanımlanmalıdır',
      });
    }

    return risks;
  }

  /**
   * Maritime-specific compliance
   */
  private checkMarinaCompliance(content: string): ComplianceCheck[] {
    return [
      {
        area: 'maritime-law',
        compliant: content.toLowerCase().includes('liman') || content.toLowerCase().includes('marina'),
        requirements: [
          'Liman veya marina tespit edilmeli',
          'Yanaşma yükümlülükleri',
          'Güvenlik ve emniyet tedbirleri',
        ],
        violations: [],
        recommendedActions: ['6102 sayılı TTK hükümlerine uygunluk kontrolü'],
      },
    ];
  }

  /**
   * Maritime charter specific risks
   */
  private checkMaritimeSpecificRisks(content: string): LegalRisk[] {
    const risks: LegalRisk[] = [];

    if (!content.toLowerCase().includes('kaptan')) {
      risks.push({
        severity: 'high',
        category: 'maritime-risk',
        description: 'Kaptan sorumlulukları belirsiz',
        recommendation: 'Kaptan yetki ve sorumlulukları açıkça belirtilmelidir',
        relatedLaw: '6102 sayılı TTK',
      });
    }

    return risks;
  }

  /**
   * Maritime compliance
   */
  private checkMaritimeCompliance(content: string): ComplianceCheck[] {
    return [
      {
        area: 'maritime-law',
        compliant: true,
        requirements: [
          'Gemi özellikleri ve kapasitesi',
          'Mürettebat sorumlulukları',
          'Deniz güvenliği kuralları',
        ],
        violations: [],
        recommendedActions: [],
      },
    ];
  }

  /**
   * Tourism-specific risks
   */
  private checkTourismSpecificRisks(content: string): LegalRisk[] {
    const risks: LegalRisk[] = [];

    if (!content.toLowerCase().includes('iptal')) {
      risks.push({
        severity: 'medium',
        category: 'consumer-rights',
        description: 'İptal koşulları belirsiz',
        recommendation: 'Tüketici hakları gereği iptal koşulları açıklanmalıdır',
        relatedLaw: '6502 sayılı Tüketicinin Korunması Hakkında Kanun',
      });
    }

    return risks;
  }

  /**
   * Tourism compliance
   */
  private checkTourismCompliance(content: string): ComplianceCheck[] {
    return [
      {
        area: 'tourism-law',
        compliant: true,
        requirements: [
          'Tur programı detayları',
          'Dahil olan ve olmayan hizmetler',
          'İptal ve iade koşulları',
        ],
        violations: [],
        recommendedActions: [],
      },
    ];
  }

  /**
   * Event-specific risks
   */
  private checkEventSpecificRisks(content: string): LegalRisk[] {
    const risks: LegalRisk[] = [];

    if (!content.toLowerCase().includes('mücbir sebep')) {
      risks.push({
        severity: 'high',
        category: 'force-majeure',
        description: 'Mücbir sebep hükümleri eksik',
        recommendation: 'COVID-19, doğal afet gibi durumlar için hüküm eklenmelidir',
        relatedLaw: '6098 sayılı TBK',
      });
    }

    return risks;
  }

  /**
   * Event compliance
   */
  private checkEventCompliance(content: string): ComplianceCheck[] {
    return [
      {
        area: 'event-management',
        compliant: true,
        requirements: [
          'Etkinlik detayları',
          'Katılımcı yükümlülükleri',
          'İptal ve erteleme koşulları',
        ],
        violations: [],
        recommendedActions: [],
      },
    ];
  }

  /**
   * Generate recommendations based on risks and compliance
   */
  private generateRecommendations(
    risks: LegalRisk[],
    compliance: ComplianceCheck[]
  ): string[] {
    const recommendations: string[] = [];

    // Critical risks first
    const criticalRisks = risks.filter(r => r.severity === 'critical');
    if (criticalRisks.length > 0) {
      recommendations.push(
        `KRİTİK: ${criticalRisks.length} adet kritik risk tespit edildi. Öncelikle bunların giderilmesi gerekmektedir.`
      );
    }

    // Compliance violations
    const violations = compliance.filter(c => !c.compliant);
    if (violations.length > 0) {
      recommendations.push(
        `Uyumsuzluk: ${violations.length} alanda uyumsuzluk tespit edildi.`
      );
    }

    // General recommendations
    recommendations.push(
      'Sözleşme bir hukuk uzmanı tarafından gözden geçirilmelidir.',
      'Tarafların imza yetkisi kontrol edilmelidir.',
      'Sözleşme noter onaylı olarak düzenlenebilir.'
    );

    return recommendations;
  }

  /**
   * Get analysis by contract ID
   */
  getAnalysis(contractId: string): ContractAnalysis | undefined {
    return this.analyses.get(contractId);
  }

  /**
   * Get all analyses
   */
  getAllAnalyses(): ContractAnalysis[] {
    return Array.from(this.analyses.values());
  }

  /**
   * Get analysis statistics
   */
  getStats(): {
    totalAnalyses: number;
    byType: Record<string, number>;
    criticalRisks: number;
    averageRisksPerContract: number;
  } {
    const analyses = this.getAllAnalyses();
    const byType: Record<string, number> = {};
    let criticalRisks = 0;
    let totalRisks = 0;

    analyses.forEach(analysis => {
      byType[analysis.contractType] = (byType[analysis.contractType] || 0) + 1;
      const critical = analysis.risks.filter(r => r.severity === 'critical').length;
      criticalRisks += critical;
      totalRisks += analysis.risks.length;
    });

    return {
      totalAnalyses: analyses.length,
      byType,
      criticalRisks,
      averageRisksPerContract: analyses.length > 0 ? totalRisks / analyses.length : 0,
    };
  }
}
