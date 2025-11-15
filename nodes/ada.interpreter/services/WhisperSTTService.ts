/**
 * WhisperSTTService - OpenAI Whisper Integration
 * Real-time speech-to-text using OpenAI Whisper API
 */

import { FormData } from 'formdata-node';

export interface WhisperConfig {
  apiKey: string;
  model?: 'whisper-1';
  language?: string; // Optional: force specific language
  prompt?: string; // Optional: context for better transcription
  temperature?: number; // 0-1, lower = more deterministic
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

export interface WhisperResponse {
  text: string;
  language?: string;
  duration?: number;
  segments?: WhisperSegment[];
}

export interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

export class WhisperSTTService {
  private config: WhisperConfig;
  private apiEndpoint = 'https://api.openai.com/v1/audio/transcriptions';

  constructor(config: WhisperConfig) {
    this.config = {
      model: 'whisper-1',
      temperature: 0.0,
      responseFormat: 'verbose_json',
      ...config
    };
  }

  /**
   * Transcribe audio to text using Whisper API
   */
  async transcribe(audioBuffer: Buffer, filename: string = 'audio.mp3'): Promise<WhisperResponse> {
    try {
      const formData = new FormData();

      // Create a Blob from the buffer
      const blob = new Blob([audioBuffer], { type: this.getContentType(filename) });
      formData.append('file', blob, filename);
      formData.append('model', this.config.model!);

      if (this.config.language) {
        formData.append('language', this.config.language);
      }

      if (this.config.prompt) {
        formData.append('prompt', this.config.prompt);
      }

      if (this.config.temperature !== undefined) {
        formData.append('temperature', this.config.temperature.toString());
      }

      formData.append('response_format', this.config.responseFormat!);

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Whisper API error: ${response.status} - ${error}`);
      }

      const result = await response.json();

      if (this.config.responseFormat === 'verbose_json') {
        return {
          text: result.text,
          language: result.language,
          duration: result.duration,
          segments: result.segments
        };
      } else {
        return {
          text: typeof result === 'string' ? result : result.text
        };
      }
    } catch (error) {
      console.error('Whisper transcription error:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio from base64 string
   */
  async transcribeBase64(base64Audio: string, filename: string = 'audio.mp3'): Promise<WhisperResponse> {
    const buffer = Buffer.from(base64Audio, 'base64');
    return this.transcribe(buffer, filename);
  }

  /**
   * Transcribe audio from URL
   */
  async transcribeFromUrl(audioUrl: string): Promise<WhisperResponse> {
    const response = await fetch(audioUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = audioUrl.split('/').pop() || 'audio.mp3';
    return this.transcribe(buffer, filename);
  }

  /**
   * Transcribe with streaming (for real-time use)
   * Note: Whisper API doesn't support true streaming yet,
   * but we can chunk audio and process in near-real-time
   */
  async transcribeStreaming(
    audioChunks: Buffer[],
    onChunk: (text: string) => void
  ): Promise<WhisperResponse> {
    const results: string[] = [];

    for (const chunk of audioChunks) {
      const result = await this.transcribe(chunk);
      results.push(result.text);
      onChunk(result.text);
    }

    return {
      text: results.join(' ')
    };
  }

  /**
   * Get confidence score from segment data
   */
  getConfidenceScore(segments?: WhisperSegment[]): number {
    if (!segments || segments.length === 0) {
      return 0.95; // Default high confidence
    }

    // Average log probability as confidence measure
    const avgLogProb = segments.reduce((sum, seg) => sum + seg.avg_logprob, 0) / segments.length;

    // Convert log prob to 0-1 scale
    // Typical range: -1.0 to 0.0
    const confidence = Math.max(0, Math.min(1, 1 + avgLogProb));

    return confidence;
  }

  /**
   * Detect if segment has speech or is silence
   */
  hasSpeech(segment: WhisperSegment): boolean {
    // no_speech_prob > 0.5 means likely silence
    return segment.no_speech_prob < 0.5;
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();

    const contentTypes: Record<string, string> = {
      'mp3': 'audio/mpeg',
      'mp4': 'audio/mp4',
      'm4a': 'audio/mp4',
      'wav': 'audio/wav',
      'webm': 'audio/webm',
      'ogg': 'audio/ogg',
      'flac': 'audio/flac'
    };

    return contentTypes[ext || 'mp3'] || 'audio/mpeg';
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<WhisperConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export default WhisperSTTService;
