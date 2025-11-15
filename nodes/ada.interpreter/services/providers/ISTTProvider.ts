/**
 * ISTTProvider - Speech-to-Text Provider Interface
 *
 * Allows pluggable STT providers (OpenAI Whisper, AssemblyAI, Google, Azure, etc.)
 */

export interface STTTranscriptionResult {
  text: string;
  language?: string;
  confidence?: number;
  duration?: number;
  segments?: STTSegment[];
}

export interface STTSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  confidence?: number;
}

export interface STTConfig {
  apiKey: string;
  model?: string;
  language?: string;
  temperature?: number;
  [key: string]: any; // Provider-specific options
}

/**
 * Base interface for all STT providers
 */
export interface ISTTProvider {
  /**
   * Provider name (e.g., 'openai-whisper', 'assemblyai', 'google')
   */
  readonly providerName: string;

  /**
   * Transcribe audio buffer to text
   */
  transcribe(audioBuffer: Buffer, filename?: string): Promise<STTTranscriptionResult>;

  /**
   * Transcribe from base64 string
   */
  transcribeBase64?(base64Audio: string, filename?: string): Promise<STTTranscriptionResult>;

  /**
   * Get confidence score
   */
  getConfidenceScore?(result: STTTranscriptionResult): number;

  /**
   * Update provider configuration
   */
  updateConfig?(config: Partial<STTConfig>): void;
}

export default ISTTProvider;
