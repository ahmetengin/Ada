/**
 * TranslationProviderFactory - Factory for creating Translation providers
 *
 * Supports: Claude Sonnet 4.5, GPT-4o, GPT-4-turbo, GPT-3.5-turbo, DeepL (future), Google Translate (future)
 */

import { ITranslationProvider, TranslationConfig } from './ITranslationProvider.js';
import { ClaudeTranslationProvider } from './ClaudeTranslationProvider.js';
import { GPTTranslationProvider } from './GPTTranslationProvider.js';
import { GeminiTranslationProvider } from './GeminiTranslationProvider.js';
import { LanguageCode } from '../../InterpreterNode.js';

export type TranslationProviderType =
  | 'claude-sonnet-4.5'
  | 'claude-sonnet-3.5'
  | 'gpt-4o'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  | 'gemini-2.0-flash'
  | 'gemini-1.5-pro'
  | 'deepl'
  | 'google-translate';

export interface TranslationProviderConfig {
  provider: TranslationProviderType;
  config: TranslationConfig;
  fallback?: TranslationProviderType;
  fallbackConfig?: TranslationConfig;
  lastResort?: TranslationProviderType;
  lastResortConfig?: TranslationConfig;
}

export class TranslationProviderFactory {
  /**
   * Create a translation provider instance
   */
  static createProvider(providerType: TranslationProviderType, config: TranslationConfig): ITranslationProvider {
    switch (providerType) {
      case 'claude-sonnet-4.5':
        return new ClaudeTranslationProvider({
          ...config,
          model: 'claude-sonnet-4-5-20250929'
        });

      case 'claude-sonnet-3.5':
        return new ClaudeTranslationProvider({
          ...config,
          model: 'claude-3-5-sonnet-20241022'
        });

      case 'gpt-4o':
        return new GPTTranslationProvider({
          ...config,
          model: 'gpt-4o'
        });

      case 'gpt-4-turbo':
        return new GPTTranslationProvider({
          ...config,
          model: 'gpt-4-turbo'
        });

      case 'gpt-3.5-turbo':
        return new GPTTranslationProvider({
          ...config,
          model: 'gpt-3.5-turbo'
        });

      case 'gemini-2.0-flash':
        return new GeminiTranslationProvider({
          ...config,
          model: 'gemini-2.0-flash-exp'
        });

      case 'gemini-1.5-pro':
        return new GeminiTranslationProvider({
          ...config,
          model: 'gemini-1.5-pro'
        });

      case 'deepl':
        // TODO: Implement DeepL provider
        throw new Error('DeepL provider not yet implemented');

      case 'google-translate':
        // TODO: Implement Google Translate provider
        throw new Error('Google Translate provider not yet implemented');

      default:
        throw new Error(`Unknown translation provider: ${providerType}`);
    }
  }

  /**
   * Create a translation provider with fallback support (primary → fallback → last resort)
   */
  static createProviderWithFallback(providerConfig: TranslationProviderConfig): ITranslationProvider {
    const primary = this.createProvider(providerConfig.provider, providerConfig.config);

    // If no fallback, return primary
    if (!providerConfig.fallback || !providerConfig.fallbackConfig) {
      return primary;
    }

    const fallback = this.createProvider(providerConfig.fallback, providerConfig.fallbackConfig);

    // If last resort specified
    let lastResort: ITranslationProvider | undefined;
    if (providerConfig.lastResort && providerConfig.lastResortConfig) {
      lastResort = this.createProvider(providerConfig.lastResort, providerConfig.lastResortConfig);
    }

    return new TranslationProviderWithFallback(primary, fallback, lastResort);
  }

  /**
   * Get recommended provider based on quality tier
   */
  static getRecommendedProvider(qualityTier: 'premium' | 'standard' | 'budget' | 'ultra-budget'): TranslationProviderType {
    switch (qualityTier) {
      case 'premium':
        return 'claude-sonnet-4.5'; // Best quality, most expensive
      case 'standard':
        return 'gpt-4o'; // Very good quality, cheaper than Claude
      case 'budget':
        return 'gpt-3.5-turbo'; // Good enough, cheap
      case 'ultra-budget':
        return 'gemini-2.0-flash'; // Cheapest option (30x cheaper than GPT-4o!)
      default:
        return 'gpt-4o';
    }
  }

  /**
   * Get cost per 1M tokens (approximate USD)
   */
  static getCostPer1MTokens(provider: TranslationProviderType): { input: number; output: number } {
    const costs: Record<TranslationProviderType, { input: number; output: number }> = {
      'claude-sonnet-4.5': { input: 3.00, output: 15.00 },
      'claude-sonnet-3.5': { input: 3.00, output: 15.00 },
      'gpt-4o': { input: 2.50, output: 10.00 },
      'gpt-4-turbo': { input: 10.00, output: 30.00 },
      'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
      'gemini-2.0-flash': { input: 0.10, output: 0.40 }, // 🔥 CHEAPEST! 30x cheaper than GPT-4o
      'gemini-1.5-pro': { input: 1.25, output: 5.00 },
      'deepl': { input: 0.02, output: 0.02 }, // Per character
      'google-translate': { input: 0.02, output: 0.02 } // Per character
    };

    return costs[provider] || { input: 0, output: 0 };
  }
}

/**
 * Translation Provider with fallback support (3-tier: primary → fallback → last resort)
 */
class TranslationProviderWithFallback implements ITranslationProvider {
  readonly providerName: string;

  constructor(
    private primary: ITranslationProvider,
    private fallback: ITranslationProvider,
    private lastResort?: ITranslationProvider
  ) {
    this.providerName = `${primary.providerName}-with-fallback`;
  }

  async translate(request: any) {
    try {
      return await this.primary.translate(request);
    } catch (error) {
      console.warn(`Primary translation provider (${this.primary.providerName}) failed, falling back to ${this.fallback.providerName}`);
      console.error('Primary error:', error);

      try {
        return await this.fallback.translate(request);
      } catch (fallbackError) {
        if (this.lastResort) {
          console.warn(`Fallback provider (${this.fallback.providerName}) failed, using last resort ${this.lastResort.providerName}`);
          console.error('Fallback error:', fallbackError);
          return await this.lastResort.translate(request);
        }
        throw fallbackError;
      }
    }
  }

  async translateSingle(
    text: string,
    sourceLang: LanguageCode,
    targetLang: LanguageCode,
    context?: string,
    tone?: any
  ): Promise<string> {
    try {
      return await this.primary.translateSingle(text, sourceLang, targetLang, context, tone);
    } catch (error) {
      console.warn(`Primary translation provider failed, falling back to ${this.fallback.providerName}`);

      try {
        return await this.fallback.translateSingle(text, sourceLang, targetLang, context, tone);
      } catch (fallbackError) {
        if (this.lastResort) {
          console.warn(`Fallback failed, using last resort ${this.lastResort.providerName}`);
          return await this.lastResort.translateSingle(text, sourceLang, targetLang, context, tone);
        }
        throw fallbackError;
      }
    }
  }

  async detectLanguage(text: string): Promise<LanguageCode> {
    if (this.primary.detectLanguage) {
      return await this.primary.detectLanguage(text);
    }
    if (this.fallback.detectLanguage) {
      return await this.fallback.detectLanguage(text);
    }
    return 'en'; // Default fallback
  }

  getSupportedLanguages(): LanguageCode[] {
    return this.primary.getSupportedLanguages();
  }

  updateConfig(config: any): void {
    this.primary.updateConfig?.(config);
  }
}

export default TranslationProviderFactory;
