/**
 * LegalSearchService - Turkish legal database search service
 * Integrates with yargi-mcp for accessing court decisions
 */

import { v4 as uuidv4 } from 'uuid';
import {
  LegalInstitution,
  CourtDecision,
  LegalSearchQuery,
  LegalSearchResult,
} from '../../../core/types.js';

export class LegalSearchService {
  // Turkish legal institutions (based on yargi-mcp)
  private static INSTITUTIONS: LegalInstitution[] = [
    { code: 'yargitay', name: 'Supreme Court', nameTr: 'Yargıtay', chambers: 52 },
    { code: 'danistay', name: 'Council of State', nameTr: 'Danıştay', chambers: 27 },
    { code: 'anayasa', name: 'Constitutional Court', nameTr: 'Anayasa Mahkemesi' },
    { code: 'sayistay', name: 'Court of Auditors', nameTr: 'Sayıştay' },
    { code: 'rekabet', name: 'Competition Board', nameTr: 'Rekabet Kurulu' },
    { code: 'kik', name: 'Public Procurement Board', nameTr: 'Kamu İhale Kurumu' },
    { code: 'kvkk', name: 'Data Protection Board', nameTr: 'KVKK' },
    { code: 'uyusmazlik', name: 'Board for Resolution of Conflicts', nameTr: 'Uyuşmazlık Mahkemesi' },
  ];

  private searchHistory: LegalSearchResult[] = [];

  /**
   * Get available legal institutions
   */
  getInstitutions(): LegalInstitution[] {
    return [...LegalSearchService.INSTITUTIONS];
  }

  /**
   * Get institution by code
   */
  getInstitution(code: string): LegalInstitution | undefined {
    return LegalSearchService.INSTITUTIONS.find(i => i.code === code);
  }

  /**
   * Search court decisions
   * In production, this would integrate with yargi-mcp API
   */
  async searchDecisions(query: LegalSearchQuery): Promise<LegalSearchResult> {
    const startTime = Date.now();

    // Simulate API call to yargi-mcp
    // In production, this would call the actual MCP server
    const results = await this.simulateSearch(query);

    const searchResult: LegalSearchResult = {
      query,
      results,
      totalResults: results.length,
      searchDate: new Date(),
      executionTime: Date.now() - startTime,
    };

    this.searchHistory.push(searchResult);

    return searchResult;
  }

  /**
   * Search by specific decision number
   */
  async searchByDecisionNumber(
    institution: string,
    decisionNumber: string
  ): Promise<CourtDecision | null> {
    const result = await this.searchDecisions({
      institution,
      decisionNumber,
      limit: 1,
    });

    return result.results.length > 0 ? result.results[0] : null;
  }

  /**
   * Search by keyword
   */
  async searchByKeyword(
    institution: string,
    keyword: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      chamber?: string;
      limit?: number;
    }
  ): Promise<CourtDecision[]> {
    const result = await this.searchDecisions({
      institution,
      keyword,
      ...options,
    });

    return result.results;
  }

  /**
   * Search for exact phrase
   */
  async searchExactPhrase(
    institution: string,
    phrase: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<CourtDecision[]> {
    const result = await this.searchDecisions({
      institution,
      exactPhrase: phrase,
      ...options,
    });

    return result.results;
  }

  /**
   * Search maritime law cases
   */
  async searchMaritimeLaw(options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<CourtDecision[]> {
    // Search across multiple institutions for maritime law
    const institutions = ['yargitay', 'danistay'];
    const keywords = ['deniz', 'gemi', 'yat', 'marina', 'liman', 'maritime'];

    const allResults: CourtDecision[] = [];

    for (const institution of institutions) {
      for (const keyword of keywords) {
        const results = await this.searchByKeyword(institution, keyword, options);
        allResults.push(...results);
      }
    }

    // Remove duplicates and limit
    const uniqueResults = this.removeDuplicates(allResults);
    return options?.limit ? uniqueResults.slice(0, options.limit) : uniqueResults;
  }

  /**
   * Search tourism law cases
   */
  async searchTourismLaw(options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<CourtDecision[]> {
    const keywords = ['turizm', 'otel', 'seyahat', 'acentesi', 'tur', 'tourism'];

    const allResults: CourtDecision[] = [];

    for (const keyword of keywords) {
      const results = await this.searchByKeyword('yargitay', keyword, options);
      allResults.push(...results);
    }

    const uniqueResults = this.removeDuplicates(allResults);
    return options?.limit ? uniqueResults.slice(0, options.limit) : uniqueResults;
  }

  /**
   * Search contract law cases
   */
  async searchContractLaw(
    contractType: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<CourtDecision[]> {
    const keywords = ['sözleşme', contractType, 'contract'];

    const allResults: CourtDecision[] = [];

    for (const keyword of keywords) {
      const results = await this.searchByKeyword('yargitay', keyword, options);
      allResults.push(...results);
    }

    const uniqueResults = this.removeDuplicates(allResults);
    return options?.limit ? uniqueResults.slice(0, options.limit) : uniqueResults;
  }

  /**
   * Get search statistics
   */
  getSearchStats(): {
    totalSearches: number;
    totalResults: number;
    averageExecutionTime: number;
    byInstitution: Record<string, number>;
  } {
    const byInstitution: Record<string, number> = {};
    let totalResults = 0;
    let totalTime = 0;

    this.searchHistory.forEach(search => {
      byInstitution[search.query.institution] =
        (byInstitution[search.query.institution] || 0) + 1;
      totalResults += search.totalResults;
      totalTime += search.executionTime;
    });

    return {
      totalSearches: this.searchHistory.length,
      totalResults,
      averageExecutionTime:
        this.searchHistory.length > 0 ? totalTime / this.searchHistory.length : 0,
      byInstitution,
    };
  }

  /**
   * Simulate search (in production, this would call yargi-mcp API)
   */
  private async simulateSearch(query: LegalSearchQuery): Promise<CourtDecision[]> {
    // Simulated court decision
    const decision: CourtDecision = {
      id: uuidv4(),
      institution: this.getInstitution(query.institution)?.nameTr || query.institution,
      chamber: query.chamber,
      decisionNumber: query.decisionNumber || '2024/1234',
      decisionDate: new Date(),
      caseNumber: '2023/5678',
      subject: query.keyword || query.exactPhrase || 'Legal subject',
      summary: `Bu karar ${query.keyword || 'konusu'} ile ilgili önemli hukuki prensipleri içermektedir.`,
      fullText: `Karar metni tam içeriği...`,
      keywords: [query.keyword || 'keyword'].filter(Boolean),
      relatedLaws: ['6098 sayılı TBK', '6102 sayılı TTK'],
      url: `https://karararama.example.com/${query.institution}/decision`,
    };

    // In production, this would return actual search results from yargi-mcp
    return query.limit ? [decision].slice(0, query.limit) : [decision];
  }

  /**
   * Remove duplicate decisions
   */
  private removeDuplicates(decisions: CourtDecision[]): CourtDecision[] {
    const seen = new Set<string>();
    return decisions.filter(decision => {
      const key = `${decision.institution}-${decision.decisionNumber}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Clear search history
   */
  clearHistory(): void {
    this.searchHistory = [];
  }
}
