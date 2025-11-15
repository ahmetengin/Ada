/**
 * ClaudeTranslationProvider - Claude Translation Implementation
 *
 * Wrapper around ClaudeTranslationService to implement ITranslationProvider interface
 */

import { ITranslationProvider, TranslationRequest, TranslationResult, TranslationConfig } from './ITranslationProvider.js';
import { ClaudeTranslationService } from '../ClaudeTranslationService.js';
import { LanguageCode } from '../../InterpreterNode.js';

export class ClaudeTranslationProvider implements ITranslationProvider {
  readonly providerName = 'claude-sonnet-4.5';
  private service: ClaudeTranslationService;

  constructor(config: TranslationConfig) {
    this.service = new ClaudeTranslationService({
      apiKey: config.apiKey,
      model: config.model || 'claude-sonnet-4-5-20250929',
      maxTokens: config.maxTokens || 2000,
      temperature: config.temperature || 0.3
    });
  }

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    return this.service.translate(request);
  }

  async translateSingle(
    text: string,
    sourceLang: LanguageCode,
    targetLang: LanguageCode,
    context?: string,
    tone?: 'formal' | 'informal' | 'technical' | 'conversational'
  ): Promise<string> {
    return this.service.translateSingle(text, sourceLang, targetLang, context, tone);
  }

  async detectLanguage(text: string): Promise<LanguageCode> {
    return this.service.detectLanguage(text);
  }

  getSupportedLanguages(): LanguageCode[] {
    return this.service.getSupportedLanguages();
  }

  updateConfig(config: Partial<TranslationConfig>): void {
    this.service.updateConfig(config);
  }
}

export default ClaudeTranslationProvider;
