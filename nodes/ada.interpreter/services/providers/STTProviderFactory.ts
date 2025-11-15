/**
 * STTProviderFactory - Factory for creating STT providers
 *
 * Supports: OpenAI Whisper, AssemblyAI (future), Google (future), Azure (future)
 */

import { ISTTProvider, STTConfig } from './ISTTProvider.js';
import { OpenAIWhisperProvider } from './OpenAIWhisperProvider.js';

export type STTProviderType =
  | 'openai-whisper'
  | 'assemblyai'
  | 'google-speech'
  | 'azure-speech';

export interface STTProviderConfig {
  provider: STTProviderType;
  config: STTConfig;
  fallback?: STTProviderType;
  fallbackConfig?: STTConfig;
}

export class STTProviderFactory {
  /**
   * Create an STT provider instance
   */
  static createProvider(providerType: STTProviderType, config: STTConfig): ISTTProvider {
    switch (providerType) {
      case 'openai-whisper':
        return new OpenAIWhisperProvider(config);

      case 'assemblyai':
        // TODO: Implement AssemblyAI provider
        throw new Error('AssemblyAI provider not yet implemented');

      case 'google-speech':
        // TODO: Implement Google Speech-to-Text provider
        throw new Error('Google Speech provider not yet implemented');

      case 'azure-speech':
        // TODO: Implement Azure Speech Services provider
        throw new Error('Azure Speech provider not yet implemented');

      default:
        throw new Error(`Unknown STT provider: ${providerType}`);
    }
  }

  /**
   * Create an STT provider with fallback support
   */
  static createProviderWithFallback(providerConfig: STTProviderConfig): ISTTProvider {
    const primary = this.createProvider(providerConfig.provider, providerConfig.config);

    // If no fallback specified, return primary
    if (!providerConfig.fallback || !providerConfig.fallbackConfig) {
      return primary;
    }

    // Wrap with fallback logic
    const fallback = this.createProvider(providerConfig.fallback, providerConfig.fallbackConfig);

    return new STTProviderWithFallback(primary, fallback);
  }

  /**
   * Get recommended provider based on quality tier
   */
  static getRecommendedProvider(qualityTier: 'premium' | 'standard' | 'budget'): STTProviderType {
    switch (qualityTier) {
      case 'premium':
        return 'openai-whisper'; // Best quality
      case 'standard':
        return 'openai-whisper'; // Still best for now
      case 'budget':
        return 'openai-whisper'; // TODO: Add cheaper alternative when available
      default:
        return 'openai-whisper';
    }
  }
}

/**
 * STT Provider with fallback support
 */
class STTProviderWithFallback implements ISTTProvider {
  readonly providerName: string;

  constructor(
    private primary: ISTTProvider,
    private fallback: ISTTProvider
  ) {
    this.providerName = `${primary.providerName}-with-fallback`;
  }

  async transcribe(audioBuffer: Buffer, filename?: string) {
    try {
      return await this.primary.transcribe(audioBuffer, filename);
    } catch (error) {
      console.warn(`Primary STT provider (${this.primary.providerName}) failed, falling back to ${this.fallback.providerName}`);
      console.error('Primary error:', error);
      return await this.fallback.transcribe(audioBuffer, filename);
    }
  }

  async transcribeBase64(base64Audio: string, filename?: string) {
    try {
      if (this.primary.transcribeBase64) {
        return await this.primary.transcribeBase64(base64Audio, filename);
      }
      const buffer = Buffer.from(base64Audio, 'base64');
      return await this.primary.transcribe(buffer, filename);
    } catch (error) {
      console.warn(`Primary STT provider (${this.primary.providerName}) failed, falling back to ${this.fallback.providerName}`);
      if (this.fallback.transcribeBase64) {
        return await this.fallback.transcribeBase64(base64Audio, filename);
      }
      const buffer = Buffer.from(base64Audio, 'base64');
      return await this.fallback.transcribe(buffer, filename);
    }
  }

  getConfidenceScore(result: any): number {
    return this.primary.getConfidenceScore?.(result) || 0.95;
  }

  updateConfig(config: any): void {
    this.primary.updateConfig?.(config);
  }
}

export default STTProviderFactory;
