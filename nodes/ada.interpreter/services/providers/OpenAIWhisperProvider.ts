/**
 * OpenAIWhisperProvider - OpenAI Whisper STT Implementation
 *
 * Wrapper around WhisperSTTService to implement ISTTProvider interface
 */

import { ISTTProvider, STTTranscriptionResult, STTConfig } from './ISTTProvider.js';
import { WhisperSTTService } from '../WhisperSTTService.js';

export class OpenAIWhisperProvider implements ISTTProvider {
  readonly providerName = 'openai-whisper';
  private service: WhisperSTTService;

  constructor(config: STTConfig) {
    this.service = new WhisperSTTService({
      apiKey: config.apiKey,
      model: 'whisper-1',
      temperature: config.temperature || 0.0,
      responseFormat: 'verbose_json',
      language: config.language
    });
  }

  async transcribe(audioBuffer: Buffer, filename?: string): Promise<STTTranscriptionResult> {
    const result = await this.service.transcribe(audioBuffer, filename || 'audio.webm');

    return {
      text: result.text,
      language: result.language,
      duration: result.duration,
      segments: result.segments?.map(seg => ({
        id: seg.id,
        start: seg.start,
        end: seg.end,
        text: seg.text,
        confidence: 1 + seg.avg_logprob // Convert log prob to confidence
      })),
      confidence: this.service.getConfidenceScore(result.segments)
    };
  }

  async transcribeBase64(base64Audio: string, filename?: string): Promise<STTTranscriptionResult> {
    const buffer = Buffer.from(base64Audio, 'base64');
    return this.transcribe(buffer, filename);
  }

  getConfidenceScore(result: STTTranscriptionResult): number {
    return result.confidence || 0.95;
  }

  updateConfig(config: Partial<STTConfig>): void {
    this.service.updateConfig(config);
  }
}

export default OpenAIWhisperProvider;
