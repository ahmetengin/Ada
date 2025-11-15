/**
 * InterpreterNode Integration Tests
 * Tests full pipeline: STT → Translation → TTS → Caption → Transcript → PassKit
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { InterpreterNode, AudioSegment, InterpreterOutput } from '../InterpreterNode.js';

describe('InterpreterNode', () => {
  let interpreter: InterpreterNode;

  beforeEach(async () => {
    interpreter = new InterpreterNode({
      name: 'Test Interpreter',
      interpreterInfo: {
        name: 'Test Conference Interpreter',
        supportedLanguages: ['en', 'tr', 'ar', 'ru', 'el', 'fr', 'de', 'it'],
        primaryLanguage: 'en',
        maxLatency: 500,
        qualityMode: 'balanced'
      },
      sessionInfo: {
        sessionId: 'test-session-001',
        room: 'Test Hall',
        targetLanguages: ['en', 'tr', 'ar'],
        passkitEndpoint: 'https://test.congress.kites.com/passkit'
      }
    });

    await interpreter.initialize();
  });

  afterEach(async () => {
    if (interpreter) {
      await interpreter.shutdown();
    }
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(interpreter).toBeDefined();
      expect(interpreter.getNodeType()).toBe('ada.interpreter');
    });

    it('should have all required capabilities', () => {
      const capabilities = interpreter.getCapabilities();
      expect(capabilities).toContain('real-time-stt');
      expect(capabilities).toContain('language-detection');
      expect(capabilities).toContain('multi-lingual-translation');
      expect(capabilities).toContain('tts-synthesis');
      expect(capabilities).toContain('caption-generation');
      expect(capabilities).toContain('transcript-generation');
      expect(capabilities).toContain('passkit-integration');
      expect(capabilities).toContain('qa-mode');
      expect(capabilities).toContain('session-management');
      expect(capabilities).toContain('low-latency-streaming');
    });
  });

  describe('Audio Segment Processing', () => {
    it('should process speaker microphone segment', async () => {
      const segment: AudioSegment = {
        id: 'segment-001',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-001',
        room: 'Test Hall'
      };

      const output = await interpreter.processAudioSegment(segment);

      expect(output).toBeDefined();
      expect(output.segmentId).toBe('segment-001');
      expect(output.speaker).toBe('speaker');
      expect(output.sessionId).toBe('test-session-001');
      expect(output.room).toBe('Test Hall');
    });

    it('should process audience microphone segment', async () => {
      const segment: AudioSegment = {
        id: 'segment-002',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 5000,
        micSource: 'audience_mic',
        sessionId: 'test-session-001',
        room: 'Test Hall'
      };

      const output = await interpreter.processAudioSegment(segment);

      expect(output).toBeDefined();
      expect(output.speaker).toBe('audience');
    });

    it('should complete processing within latency target', async () => {
      const segment: AudioSegment = {
        id: 'segment-003',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 2000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-001',
        room: 'Test Hall'
      };

      const output = await interpreter.processAudioSegment(segment);

      // For balanced mode, should be < 500ms
      expect(output.processingTime).toBeLessThan(500);
    });
  });

  describe('Speech-to-Text (STT)', () => {
    it('should transcribe audio to text', async () => {
      const segment: AudioSegment = {
        id: 'segment-004',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-001',
        room: 'Test Hall'
      };

      const output = await interpreter.processAudioSegment(segment);

      expect(output.sttSource).toBeDefined();
      expect(output.sttSource.length).toBeGreaterThan(0);
    });

    it('should remove filler words from transcription', async () => {
      // In a real test, you'd mock the STT engine to return text with fillers
      const segment: AudioSegment = {
        id: 'segment-005',
        audioData: 'audio_with_filler_words',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-001',
        room: 'Test Hall'
      };

      const output = await interpreter.processAudioSegment(segment);

      // Check that common filler words are not present
      expect(output.sttSource.toLowerCase()).not.toContain(' um ');
      expect(output.sttSource.toLowerCase()).not.toContain(' uh ');
      expect(output.sttSource.toLowerCase()).not.toContain(' like ');
    });
  });

  describe('Language Detection', () => {
    it('should detect language from text', async () => {
      const segment: AudioSegment = {
        id: 'segment-006',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-001',
        room: 'Test Hall'
      };

      const output = await interpreter.processAudioSegment(segment);

      expect(output.detectedLanguage).toBeDefined();
      expect(['en', 'tr', 'ar', 'ru', 'el', 'gr', 'fr', 'de', 'it']).toContain(output.detectedLanguage);
    });
  });

  describe('Multi-lingual Translation', () => {
    it('should translate to all target languages', async () => {
      const segment: AudioSegment = {
        id: 'segment-007',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-001',
        room: 'Test Hall'
      };

      const output = await interpreter.processAudioSegment(segment);

      expect(output.translations).toBeDefined();
      expect(output.translations['en']).toBeDefined();
      expect(output.translations['tr']).toBeDefined();
      expect(output.translations['ar']).toBeDefined();
    });

    it('should not translate to source language', async () => {
      const segment: AudioSegment = {
        id: 'segment-008',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-001',
        room: 'Test Hall'
      };

      const output = await interpreter.processAudioSegment(segment);

      // Source language translation should be same as source text
      const sourceLang = output.detectedLanguage;
      expect(output.translations[sourceLang]).toBe(output.sttSource);
    });
  });

  describe('TTS Clean Text Generation', () => {
    it('should generate clean text for TTS', async () => {
      const segment: AudioSegment = {
        id: 'segment-009',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-001',
        room: 'Test Hall'
      };

      const output = await interpreter.processAudioSegment(segment);

      expect(output.ttsCleanText).toBeDefined();
      expect(output.ttsCleanText.length).toBeGreaterThan(0);
    });

    it('should limit TTS text to 1-2 sentences', async () => {
      const segment: AudioSegment = {
        id: 'segment-010',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 5000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-001',
        room: 'Test Hall'
      };

      const output = await interpreter.processAudioSegment(segment);

      // Count sentences (rough estimate)
      const sentences = output.ttsCleanText.match(/[.!?]+/g) || [];
      expect(sentences.length).toBeLessThanOrEqual(2);
    });

    it('should remove speaker labels from TTS text', async () => {
      const segment: AudioSegment = {
        id: 'segment-011',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-001',
        room: 'Test Hall'
      };

      const output = await interpreter.processAudioSegment(segment);

      expect(output.ttsCleanText).not.toMatch(/^(Speaker|Audience):/i);
    });
  });

  describe('Caption Generation', () => {
    it('should generate caption with max 14 words', async () => {
      const segment: AudioSegment = {
        id: 'segment-012',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-001',
        room: 'Test Hall'
      };

      const output = await interpreter.processAudioSegment(segment);

      const words = output.caption.replace(/\n/g, ' ').split(' ').filter(w => w.length > 0);
      expect(words.length).toBeLessThanOrEqual(14);
    });

    it('should format caption in max 2 lines', async () => {
      const segment: AudioSegment = {
        id: 'segment-013',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-001',
        room: 'Test Hall'
      };

      const output = await interpreter.processAudioSegment(segment);

      const lines = output.caption.split('\n');
      expect(lines.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Transcript Segment Generation', () => {
    it('should generate complete transcript segment', async () => {
      const segment: AudioSegment = {
        id: 'segment-014',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-001',
        room: 'Test Hall'
      };

      const output = await interpreter.processAudioSegment(segment);

      expect(output.transcriptSegment).toBeDefined();
      expect(output.transcriptSegment.session_id).toBe('test-session-001');
      expect(output.transcriptSegment.room).toBe('Test Hall');
      expect(output.transcriptSegment.speaker).toBeDefined();
      expect(output.transcriptSegment.start_ts).toBeDefined();
      expect(output.transcriptSegment.end_ts).toBeDefined();
      expect(output.transcriptSegment.src_lang).toBeDefined();
      expect(output.transcriptSegment.src_text).toBeDefined();
      expect(output.transcriptSegment.translations).toBeDefined();
    });

    it('should include timestamps in ISO 8601 format', async () => {
      const segment: AudioSegment = {
        id: 'segment-015',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-001',
        room: 'Test Hall'
      };

      const output = await interpreter.processAudioSegment(segment);

      // Check ISO 8601 format
      expect(output.transcriptSegment.start_ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(output.transcriptSegment.end_ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('PassKit Integration', () => {
    it('should generate PassKit update', async () => {
      const segment: AudioSegment = {
        id: 'segment-016',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-001',
        room: 'Test Hall'
      };

      const output = await interpreter.processAudioSegment(segment);

      expect(output.passkitUpdate).toBeDefined();
      expect(output.passkitUpdate.current_room).toBe('Test Hall');
      expect(output.passkitUpdate.session_id).toBe('test-session-001');
      expect(output.passkitUpdate.lang).toBeDefined();
      expect(output.passkitUpdate.url).toContain('congress.kites.com/live');
    });

    it('should include session and language in URL', async () => {
      const segment: AudioSegment = {
        id: 'segment-017',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-001',
        room: 'Test Hall'
      };

      const output = await interpreter.processAudioSegment(segment);

      expect(output.passkitUpdate.url).toContain('session=test-session-001');
      expect(output.passkitUpdate.url).toContain('lang=');
    });
  });

  describe('Q&A Mode', () => {
    it('should detect speaker from speaker_mic', async () => {
      const segment: AudioSegment = {
        id: 'segment-018',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-001',
        room: 'Test Hall'
      };

      const output = await interpreter.processAudioSegment(segment);

      expect(output.speaker).toBe('speaker');
    });

    it('should detect audience from audience_mic', async () => {
      const segment: AudioSegment = {
        id: 'segment-019',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'audience_mic',
        sessionId: 'test-session-001',
        room: 'Test Hall'
      };

      const output = await interpreter.processAudioSegment(segment);

      expect(output.speaker).toBe('audience');
    });
  });

  describe('Session Management', () => {
    it('should track session segments', async () => {
      const segment1: AudioSegment = {
        id: 'segment-020',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-002',
        room: 'Test Hall'
      };

      const segment2: AudioSegment = {
        id: 'segment-021',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'audience_mic',
        sessionId: 'test-session-002',
        room: 'Test Hall'
      };

      await interpreter.processAudioSegment(segment1);
      await interpreter.processAudioSegment(segment2);

      const summary = await interpreter.generateSessionSummary('test-session-002');

      expect(summary).toBeDefined();
      expect(summary.session_id).toBe('test-session-002');
      expect(summary.total_segments).toBe(2);
    });

    it('should generate session summary with all required fields', async () => {
      const segment: AudioSegment = {
        id: 'segment-022',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-003',
        room: 'Test Hall'
      };

      await interpreter.processAudioSegment(segment);

      const summary = await interpreter.generateSessionSummary('test-session-003');

      expect(summary.key_points).toBeDefined();
      expect(summary.highlights).toBeDefined();
      expect(summary.quotes).toBeDefined();
      expect(summary.action_items).toBeDefined();
      expect(summary.summary).toBeDefined();
      expect(summary.total_segments).toBeDefined();
      expect(summary.languages_detected).toBeDefined();
      expect(summary.speaker_segments).toBeDefined();
      expect(summary.audience_segments).toBeDefined();
    });
  });

  describe('Output Formatting', () => {
    it('should format output with all 7 sections', async () => {
      const segment: AudioSegment = {
        id: 'segment-023',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-001',
        room: 'Test Hall'
      };

      const output = await interpreter.processAudioSegment(segment);
      const formatted = interpreter.formatOutput(output);

      expect(formatted).toContain('STT_SOURCE:');
      expect(formatted).toContain('DETECTED_LANGUAGE:');
      expect(formatted).toContain('TRANSLATIONS:');
      expect(formatted).toContain('TTS_CLEAN_TEXT:');
      expect(formatted).toContain('CAPTION:');
      expect(formatted).toContain('TRANSCRIPT_SEGMENT:');
      expect(formatted).toContain('PASSKIT_UPDATE:');
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent segments', async () => {
      const segments: AudioSegment[] = Array.from({ length: 10 }, (_, i) => ({
        id: `segment-batch-${i}`,
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-004',
        room: 'Test Hall'
      }));

      const startTime = Date.now();
      await Promise.all(segments.map(s => interpreter.processAudioSegment(s)));
      const totalTime = Date.now() - startTime;

      // Should process 10 segments in reasonable time (< 5 seconds)
      expect(totalTime).toBeLessThan(5000);
    });

    it('should provide statistics', async () => {
      const segment: AudioSegment = {
        id: 'segment-024',
        audioData: 'base64_audio_data_here',
        timestamp: new Date(),
        duration: 3000,
        micSource: 'speaker_mic',
        sessionId: 'test-session-005',
        room: 'Test Hall'
      };

      await interpreter.processAudioSegment(segment);

      const stats = await interpreter.processTask({
        type: 'get-statistics',
        data: {}
      });

      expect(stats).toBeDefined();
      expect(stats.totalSegments).toBeGreaterThan(0);
      expect(stats.languageDistribution).toBeDefined();
      expect(stats.averageProcessingTime).toBeDefined();
    });
  });
});
