/**
 * InterpreterNode - Real-time multi-lingual conference interpretation
 * Ultra-low-latency speech-to-text, translation, and voice synthesis
 * Handles keynotes, Q&A sessions, and multi-track conferences
 *
 * Features:
 * - Real-time STT (Speech-to-Text)
 * - Automatic language detection
 * - Multi-lingual translation (8+ languages)
 * - TTS-ready voice output
 * - Caption generation
 * - Transcript segment generation
 * - PassKit integration
 * - Q&A mode (audience + speaker tracking)
 * - Session management
 */

import { BaseNode, BaseNodeOptions } from '../../core/BaseNode.js';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// CONFIGURATION INTERFACES
// ============================================================================

export interface InterpreterNodeConfig extends Omit<BaseNodeOptions, 'type' | 'capabilities'> {
  interpreterInfo: {
    name: string;
    supportedLanguages: LanguageCode[];
    primaryLanguage: LanguageCode;
    maxLatency: number; // milliseconds
    qualityMode: 'speed' | 'balanced' | 'quality';
  };
  sessionInfo?: {
    sessionId: string;
    room: string;
    targetLanguages: LanguageCode[];
    passkitEndpoint?: string;
  };
}

export type LanguageCode = 'en' | 'tr' | 'ar' | 'ru' | 'el' | 'gr' | 'fr' | 'de' | 'it';

export type SpeakerType = 'speaker' | 'audience';

// ============================================================================
// DATA INTERFACES
// ============================================================================

export interface AudioSegment {
  id: string;
  audioData: ArrayBuffer | string; // Audio buffer or base64 string
  timestamp: Date;
  duration: number; // milliseconds
  micSource: 'speaker_mic' | 'audience_mic';
  sessionId: string;
  room: string;
}

export interface TranscriptionResult {
  segmentId: string;
  sourceText: string;
  detectedLanguage: LanguageCode;
  confidence: number;
  timestamp: Date;
  speaker: SpeakerType;
  hasFillerWords: boolean;
  originalText?: string; // Before cleanup
}

export interface TranslationSet {
  [key: string]: string; // language code → translated text
}

export interface InterpreterOutput {
  segmentId: string;
  sessionId: string;
  room: string;
  timestamp: Date;

  // Original transcription
  sttSource: string;
  detectedLanguage: LanguageCode;

  // Translations
  translations: TranslationSet;

  // TTS output
  ttsCleanText: string;

  // Caption for display
  caption: string;

  // Database-ready transcript
  transcriptSegment: TranscriptSegment;

  // PassKit update
  passkitUpdate: PassKitUpdate;

  // Metadata
  speaker: SpeakerType;
  confidence: number;
  processingTime: number; // milliseconds
}

export interface TranscriptSegment {
  session_id: string;
  room: string;
  speaker: SpeakerType;
  start_ts: string; // ISO 8601 timestamp
  end_ts: string; // ISO 8601 timestamp
  src_lang: LanguageCode;
  src_text: string;
  translations: TranslationSet;
  confidence?: number;
  segment_id?: string;
}

export interface PassKitUpdate {
  current_room: string;
  lang: LanguageCode;
  url: string;
  session_id: string;
  updated_at: string; // ISO 8601 timestamp
}

export interface SessionSummary {
  session_id: string;
  room: string;
  start_time: Date;
  end_time: Date;
  key_points: string[];
  highlights: string[];
  quotes: string[];
  action_items: string[];
  summary: string;
  total_segments: number;
  languages_detected: LanguageCode[];
  speaker_segments: number;
  audience_segments: number;
}

// ============================================================================
// INTERPRETER NODE CLASS
// ============================================================================

export class InterpreterNode extends BaseNode {
  private interpreterInfo: InterpreterNodeConfig['interpreterInfo'];
  private sessionInfo?: InterpreterNodeConfig['sessionInfo'];

  // Processing state
  private activeSegments: Map<string, AudioSegment> = new Map();
  private transcriptionCache: Map<string, TranscriptionResult> = new Map();
  private translationCache: Map<string, TranslationSet> = new Map();
  private sessionSegments: Map<string, InterpreterOutput[]> = new Map();

  // AI Learning Database
  private speakerPatterns: Map<string, any> = new Map(); // Learns speaker voice patterns
  private translationQuality: Map<string, number> = new Map(); // Learns translation accuracy
  private languageUsage: Map<string, number> = new Map(); // Tracks language frequency

  constructor(config: InterpreterNodeConfig) {
    super({
      ...config,
      type: 'ada.interpreter',
      capabilities: [
        'real-time-stt',
        'language-detection',
        'multi-lingual-translation',
        'tts-synthesis',
        'caption-generation',
        'transcript-generation',
        'passkit-integration',
        'qa-mode',
        'session-management',
        'low-latency-streaming'
      ]
    });

    this.interpreterInfo = config.interpreterInfo;
    this.sessionInfo = config.sessionInfo;

    this.initializeLanguageModels();
    this.setupStreamingPipeline();
  }

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  private initializeLanguageModels(): void {
    this.log('Initializing language detection and translation models', 'info');

    // Initialize supported languages
    this.interpreterInfo.supportedLanguages.forEach(lang => {
      this.languageUsage.set(lang, 0);
    });

    this.log(`Initialized ${this.interpreterInfo.supportedLanguages.length} language models`, 'success');
  }

  private setupStreamingPipeline(): void {
    this.log('Setting up ultra-low-latency streaming pipeline', 'info');

    // Configure based on quality mode
    const config = {
      speed: { chunkSize: 1, bufferSize: 0 },
      balanced: { chunkSize: 2, bufferSize: 1 },
      quality: { chunkSize: 3, bufferSize: 2 }
    }[this.interpreterInfo.qualityMode];

    this.log(`Pipeline configured: ${JSON.stringify(config)}`, 'success');
  }

  // ========================================================================
  // CORE PROCESSING METHODS
  // ========================================================================

  /**
   * Process incoming audio segment through full interpretation pipeline
   */
  async processAudioSegment(segment: AudioSegment): Promise<InterpreterOutput> {
    const startTime = Date.now();
    const segmentId = segment.id;

    try {
      this.log(`Processing segment ${segmentId}`, 'info');
      this.activeSegments.set(segmentId, segment);

      // Step 1: Speech-to-Text
      const transcription = await this.performSTT(segment);
      this.transcriptionCache.set(segmentId, transcription);

      // Step 2: Language Detection (already done in STT)
      const detectedLanguage = transcription.detectedLanguage;
      this.languageUsage.set(detectedLanguage, (this.languageUsage.get(detectedLanguage) || 0) + 1);

      // Step 3: Multi-lingual Translation
      const translations = await this.performTranslation(transcription);
      this.translationCache.set(segmentId, translations);

      // Step 4: Generate TTS Clean Text
      const ttsCleanText = this.generateTTSCleanText(transcription);

      // Step 5: Generate Caption
      const caption = this.generateCaption(transcription, segment.micSource);

      // Step 6: Create Transcript Segment
      const transcriptSegment = this.createTranscriptSegment(
        segment,
        transcription,
        translations
      );

      // Step 7: Generate PassKit Update
      const passkitUpdate = this.generatePassKitUpdate(
        segment.sessionId,
        segment.room
      );

      // Create complete output
      const output: InterpreterOutput = {
        segmentId,
        sessionId: segment.sessionId,
        room: segment.room,
        timestamp: segment.timestamp,
        sttSource: transcription.sourceText,
        detectedLanguage,
        translations,
        ttsCleanText,
        caption,
        transcriptSegment,
        passkitUpdate,
        speaker: transcription.speaker,
        confidence: transcription.confidence,
        processingTime: Date.now() - startTime
      };

      // Store for session summary
      const sessionSegments = this.sessionSegments.get(segment.sessionId) || [];
      sessionSegments.push(output);
      this.sessionSegments.set(segment.sessionId, sessionSegments);

      // Log performance
      this.log(`Segment processed in ${output.processingTime}ms`, 'success');

      return output;

    } catch (error) {
      this.log(`Error processing segment ${segmentId}: ${error}`, 'error');
      throw error;
    }
  }

  // ========================================================================
  // SPEECH-TO-TEXT
  // ========================================================================

  private async performSTT(segment: AudioSegment): Promise<TranscriptionResult> {
    this.log('Performing speech-to-text transcription', 'info');

    // Simulate STT processing (in production, integrate with Whisper or similar)
    // This is a placeholder for the actual STT implementation

    const rawText = await this.callSTTEngine(segment.audioData);
    const cleanedText = this.cleanTranscription(rawText);
    const detectedLanguage = this.detectLanguage(cleanedText);
    const speaker = this.detectSpeakerType(segment.micSource, cleanedText);

    return {
      segmentId: segment.id,
      sourceText: cleanedText,
      detectedLanguage,
      confidence: 0.95, // Placeholder
      timestamp: segment.timestamp,
      speaker,
      hasFillerWords: rawText !== cleanedText,
      originalText: rawText
    };
  }

  private async callSTTEngine(audioData: ArrayBuffer | string): Promise<string> {
    // Placeholder - integrate with actual STT engine (Whisper, etc.)
    // In production, this would make an API call or use a local model
    return "This is sample transcribed text from the audio segment.";
  }

  private cleanTranscription(text: string): string {
    // Remove filler words
    const fillerWords = ['uh', 'um', 'eee', 'hani', 'like', 'you know', 'basically', 'actually'];
    let cleaned = text;

    fillerWords.forEach(filler => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      cleaned = cleaned.replace(regex, '');
    });

    // Clean up extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Fix punctuation
    cleaned = this.fixPunctuation(cleaned);

    return cleaned;
  }

  private fixPunctuation(text: string): string {
    // Add periods at sentence ends
    let fixed = text;

    // Ensure proper capitalization
    fixed = fixed.charAt(0).toUpperCase() + fixed.slice(1);

    // Add period if missing at end
    if (!fixed.match(/[.!?]$/)) {
      fixed += '.';
    }

    return fixed;
  }

  // ========================================================================
  // LANGUAGE DETECTION
  // ========================================================================

  private detectLanguage(text: string): LanguageCode {
    // Placeholder - integrate with actual language detection
    // In production, use a proper language detection library

    // Simple heuristic-based detection
    const patterns: Record<string, RegExp[]> = {
      tr: [/ğ|ş|ç|ı|ö|ü/i, /\b(ve|ama|için|bu|şu)\b/i],
      ar: [/[\u0600-\u06FF]/],
      ru: [/[\u0400-\u04FF]/],
      el: [/[\u0370-\u03FF]/],
      de: [/\b(und|der|die|das|ist)\b/i, /ä|ö|ü|ß/i],
      fr: [/\b(et|le|la|de|à)\b/i, /é|è|ê|à|ù/i],
      it: [/\b(e|il|la|di|che)\b/i, /à|è|ì|ò|ù/i]
    };

    for (const [lang, regexes] of Object.entries(patterns)) {
      if (regexes.some(regex => regex.test(text))) {
        return lang as LanguageCode;
      }
    }

    // Default to English
    return 'en';
  }

  private detectSpeakerType(micSource: 'speaker_mic' | 'audience_mic', text: string): SpeakerType {
    // Direct mapping from mic source
    if (micSource === 'speaker_mic') return 'speaker';
    if (micSource === 'audience_mic') return 'audience';

    // Fallback: analyze text for Q&A patterns
    const questionPatterns = [
      /my question is/i,
      /i want to ask/i,
      /could you explain/i,
      /i was wondering/i,
      /can you clarify/i
    ];

    if (questionPatterns.some(pattern => pattern.test(text))) {
      return 'audience';
    }

    return 'speaker';
  }

  // ========================================================================
  // TRANSLATION
  // ========================================================================

  private async performTranslation(transcription: TranscriptionResult): Promise<TranslationSet> {
    this.log('Performing multi-lingual translation', 'info');

    const translations: TranslationSet = {};
    const sourceText = transcription.sourceText;
    const sourceLang = transcription.detectedLanguage;

    // Get target languages from session config or use all supported languages
    const targetLanguages = this.sessionInfo?.targetLanguages || this.interpreterInfo.supportedLanguages;

    // Translate to each target language
    for (const targetLang of targetLanguages) {
      if (targetLang === sourceLang) {
        // No translation needed for source language
        translations[targetLang] = sourceText;
      } else {
        // Perform translation
        translations[targetLang] = await this.translateText(sourceText, sourceLang, targetLang);
      }
    }

    return translations;
  }

  private async translateText(text: string, fromLang: LanguageCode, toLang: LanguageCode): Promise<string> {
    // Placeholder - integrate with actual translation engine
    // In production, use Claude, GPT, or specialized translation APIs

    this.log(`Translating ${fromLang} → ${toLang}`, 'info');

    // For now, return a placeholder translation
    return `[${toLang.toUpperCase()}] ${text}`;
  }

  // ========================================================================
  // TTS CLEAN TEXT GENERATION
  // ========================================================================

  private generateTTSCleanText(transcription: TranscriptionResult): string {
    let text = transcription.sourceText;

    // Remove speaker labels if any
    text = text.replace(/^(Speaker|Audience):\s*/i, '');

    // Ensure it's 1-2 sentences max
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    text = sentences.slice(0, 2).join(' ').trim();

    // Remove any remaining artifacts
    text = text.replace(/\[.*?\]/g, '').trim();

    return text;
  }

  // ========================================================================
  // CAPTION GENERATION
  // ========================================================================

  private generateCaption(transcription: TranscriptionResult, micSource: string): string {
    let text = transcription.sourceText;

    // Limit to ~14 words, max 2 lines
    const words = text.split(' ');
    if (words.length > 14) {
      text = words.slice(0, 14).join(' ') + '...';
    }

    // Split into 2 lines if needed (for display)
    const midpoint = Math.floor(words.length / 2);
    if (words.length > 7) {
      const line1 = words.slice(0, midpoint).join(' ');
      const line2 = words.slice(midpoint).join(' ');
      text = `${line1}\n${line2}`;
    }

    return text;
  }

  // ========================================================================
  // TRANSCRIPT SEGMENT GENERATION
  // ========================================================================

  private createTranscriptSegment(
    segment: AudioSegment,
    transcription: TranscriptionResult,
    translations: TranslationSet
  ): TranscriptSegment {
    const startTime = segment.timestamp;
    const endTime = new Date(startTime.getTime() + segment.duration);

    return {
      session_id: segment.sessionId,
      room: segment.room,
      speaker: transcription.speaker,
      start_ts: startTime.toISOString(),
      end_ts: endTime.toISOString(),
      src_lang: transcription.detectedLanguage,
      src_text: transcription.sourceText,
      translations,
      confidence: transcription.confidence,
      segment_id: segment.id
    };
  }

  // ========================================================================
  // PASSKIT INTEGRATION
  // ========================================================================

  private generatePassKitUpdate(sessionId: string, room: string): PassKitUpdate {
    const primaryLang = this.sessionInfo?.targetLanguages?.[0] || this.interpreterInfo.primaryLanguage;

    return {
      current_room: room,
      lang: primaryLang,
      url: `https://congress.kites.com/live?session=${sessionId}&lang=${primaryLang}`,
      session_id: sessionId,
      updated_at: new Date().toISOString()
    };
  }

  // ========================================================================
  // SESSION MANAGEMENT
  // ========================================================================

  /**
   * Generate session summary when session ends
   */
  async generateSessionSummary(sessionId: string): Promise<SessionSummary> {
    const segments = this.sessionSegments.get(sessionId) || [];

    if (segments.length === 0) {
      throw new Error(`No segments found for session ${sessionId}`);
    }

    const startTime = segments[0].timestamp;
    const endTime = segments[segments.length - 1].timestamp;

    // Aggregate statistics
    const languagesDetected = [...new Set(segments.map(s => s.detectedLanguage))];
    const speakerSegments = segments.filter(s => s.speaker === 'speaker').length;
    const audienceSegments = segments.filter(s => s.speaker === 'audience').length;

    // Extract key information (placeholder - in production, use LLM)
    const keyPoints = this.extractKeyPoints(segments);
    const highlights = this.extractHighlights(segments);
    const quotes = this.extractQuotes(segments);
    const actionItems = this.extractActionItems(segments);
    const summary = this.generateSummaryText(segments);

    return {
      session_id: sessionId,
      room: segments[0].room,
      start_time: startTime,
      end_time: endTime,
      key_points: keyPoints,
      highlights,
      quotes,
      action_items: actionItems,
      summary,
      total_segments: segments.length,
      languages_detected: languagesDetected,
      speaker_segments: speakerSegments,
      audience_segments: audienceSegments
    };
  }

  private extractKeyPoints(segments: InterpreterOutput[]): string[] {
    // Placeholder - in production, use NLP/LLM to extract key points
    return segments
      .filter((_, i) => i % 10 === 0) // Sample every 10th segment
      .map(s => s.sttSource)
      .slice(0, 5);
  }

  private extractHighlights(segments: InterpreterOutput[]): string[] {
    // Placeholder - detect important moments
    return segments
      .filter(s => s.confidence > 0.9)
      .map(s => s.sttSource)
      .slice(0, 3);
  }

  private extractQuotes(segments: InterpreterOutput[]): string[] {
    // Placeholder - detect quotable statements
    return segments
      .filter(s => s.speaker === 'speaker' && s.sttSource.length > 50)
      .map(s => `"${s.sttSource}"`)
      .slice(0, 3);
  }

  private extractActionItems(segments: InterpreterOutput[]): string[] {
    // Placeholder - detect action items
    const actionPatterns = [/we will/i, /we should/i, /next steps/i, /action:/i];

    return segments
      .filter(s => actionPatterns.some(p => p.test(s.sttSource)))
      .map(s => s.sttSource)
      .slice(0, 5);
  }

  private generateSummaryText(segments: InterpreterOutput[]): string {
    // Placeholder - in production, use LLM to generate coherent summary
    const totalDuration = segments.length;
    const languages = [...new Set(segments.map(s => s.detectedLanguage))].join(', ');

    return `Conference session with ${totalDuration} segments across ${languages} languages. ` +
           `Included ${segments.filter(s => s.speaker === 'audience').length} audience questions.`;
  }

  // ========================================================================
  // OUTPUT FORMATTING
  // ========================================================================

  /**
   * Format output according to SYSTEM_PROMPT specifications
   */
  formatOutput(output: InterpreterOutput): string {
    return `
STT_SOURCE:
${output.sttSource}

DETECTED_LANGUAGE:
${output.detectedLanguage}

TRANSLATIONS:
${JSON.stringify(output.translations, null, 2)}

TTS_CLEAN_TEXT:
${output.ttsCleanText}

CAPTION:
${output.caption}

TRANSCRIPT_SEGMENT:
${JSON.stringify(output.transcriptSegment, null, 2)}

PASSKIT_UPDATE:
${JSON.stringify(output.passkitUpdate, null, 2)}
`.trim();
  }

  // ========================================================================
  // TASK PROCESSING (BaseNode override)
  // ========================================================================

  async processTask(task: any): Promise<any> {
    const { type, data } = task;

    switch (type) {
      case 'process-audio-segment':
        return await this.processAudioSegment(data as AudioSegment);

      case 'generate-session-summary':
        return await this.generateSessionSummary(data.sessionId);

      case 'update-session-config':
        this.sessionInfo = { ...this.sessionInfo, ...data };
        return { success: true, sessionInfo: this.sessionInfo };

      case 'get-statistics':
        return this.getStatistics();

      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  // ========================================================================
  // STATISTICS & MONITORING
  // ========================================================================

  private getStatistics() {
    const allSegments = Array.from(this.sessionSegments.values()).flat();

    return {
      totalSegments: allSegments.length,
      activeSessions: this.sessionSegments.size,
      languageDistribution: Object.fromEntries(this.languageUsage),
      averageProcessingTime: allSegments.reduce((sum, s) => sum + s.processingTime, 0) / allSegments.length || 0,
      averageConfidence: allSegments.reduce((sum, s) => sum + s.confidence, 0) / allSegments.length || 0,
      speakerSegments: allSegments.filter(s => s.speaker === 'speaker').length,
      audienceSegments: allSegments.filter(s => s.speaker === 'audience').length
    };
  }
}

export default InterpreterNode;
