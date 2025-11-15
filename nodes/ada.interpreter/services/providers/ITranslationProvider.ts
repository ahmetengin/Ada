/**
 * ITranslationProvider - Translation Provider Interface
 *
 * Allows pluggable translation providers (Claude, GPT-4, GPT-3.5, Google Translate, DeepL, etc.)
 */

import { LanguageCode } from '../../InterpreterNode.js';

export interface TranslationRequest {
  text: string;
  sourceLang: LanguageCode;
  targetLangs: LanguageCode[];
  context?: string;
  tone?: 'formal' | 'informal' | 'technical' | 'conversational';
}

export interface TranslationResult {
  [languageCode: string]: string;
}

export interface TranslationConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  [key: string]: any; // Provider-specific options
}

/**
 * Base interface for all translation providers
 */
export interface ITranslationProvider {
  /**
   * Provider name (e.g., 'claude-sonnet-4.5', 'gpt-4o', 'gpt-3.5-turbo', 'google-translate')
   */
  readonly providerName: string;

  /**
   * Translate text to multiple target languages
   */
  translate(request: TranslationRequest): Promise<TranslationResult>;

  /**
   * Translate to a single target language
   */
  translateSingle(
    text: string,
    sourceLang: LanguageCode,
    targetLang: LanguageCode,
    context?: string,
    tone?: 'formal' | 'informal' | 'technical' | 'conversational'
  ): Promise<string>;

  /**
   * Detect language (optional)
   */
  detectLanguage?(text: string): Promise<LanguageCode>;

  /**
   * Get supported languages
   */
  getSupportedLanguages(): LanguageCode[];

  /**
   * Update provider configuration
   */
  updateConfig?(config: Partial<TranslationConfig>): void;
}

export default ITranslationProvider;
