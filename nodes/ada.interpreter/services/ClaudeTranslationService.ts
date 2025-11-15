/**
 * ClaudeTranslationService - Anthropic Claude Integration
 * High-quality multi-lingual translation using Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import { LanguageCode } from '../InterpreterNode.js';

export interface ClaudeTranslationConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface TranslationRequest {
  text: string;
  sourceLang: LanguageCode;
  targetLangs: LanguageCode[];
  context?: string; // Conference context for better translation
  tone?: 'formal' | 'informal' | 'technical' | 'conversational';
}

export interface TranslationResult {
  [languageCode: string]: string;
}

const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  tr: 'Turkish',
  ar: 'Arabic',
  ru: 'Russian',
  el: 'Greek',
  gr: 'Greek',
  fr: 'French',
  de: 'German',
  it: 'Italian'
};

export class ClaudeTranslationService {
  private client: Anthropic;
  private config: ClaudeTranslationConfig;

  constructor(config: ClaudeTranslationConfig) {
    this.config = {
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 2000,
      temperature: 0.3,
      ...config
    };

    this.client = new Anthropic({
      apiKey: this.config.apiKey
    });
  }

  /**
   * Translate text to multiple target languages
   */
  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const { text, sourceLang, targetLangs, context, tone = 'conversational' } = request;

    const result: TranslationResult = {};

    // Source language stays the same
    result[sourceLang] = text;

    // Translate to other languages
    const translationsToMake = targetLangs.filter(lang => lang !== sourceLang);

    if (translationsToMake.length === 0) {
      return result;
    }

    // Batch translate all languages in one API call for efficiency
    const translations = await this.batchTranslate(text, sourceLang, translationsToMake, context, tone);

    // Merge results
    Object.assign(result, translations);

    return result;
  }

  /**
   * Batch translate to multiple languages in one API call
   */
  private async batchTranslate(
    text: string,
    sourceLang: LanguageCode,
    targetLangs: LanguageCode[],
    context?: string,
    tone: string = 'conversational'
  ): Promise<TranslationResult> {
    const sourceLangName = LANGUAGE_NAMES[sourceLang];
    const targetLangNames = targetLangs.map(lang => ({
      code: lang,
      name: LANGUAGE_NAMES[lang]
    }));

    const prompt = this.buildTranslationPrompt(text, sourceLangName, targetLangNames, context, tone);

    try {
      const response = await this.client.messages.create({
        model: this.config.model!,
        max_tokens: this.config.maxTokens!,
        temperature: this.config.temperature!,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Parse JSON response
      const translations = this.parseTranslationResponse(content.text, targetLangs);

      return translations;
    } catch (error) {
      console.error('Claude translation error:', error);
      throw error;
    }
  }

  /**
   * Build translation prompt for Claude
   */
  private buildTranslationPrompt(
    text: string,
    sourceLang: string,
    targetLangs: { code: string; name: string }[],
    context?: string,
    tone: string
  ): string {
    const targetLangList = targetLangs.map(l => `"${l.code}": ${l.name}`).join(', ');

    return `You are a professional conference interpreter with expertise in multi-lingual translation.

Your task is to translate the following ${sourceLang} text into multiple languages for a live conference setting.

${context ? `Conference context: ${context}\n` : ''}

Translation requirements:
- Sound natural for a live conference audience
- Match the ${tone} tone of the original
- Avoid overly literal translations
- Avoid academic or overly formal language (unless tone is 'formal')
- Maintain the emotional tone and intent
- Keep cultural nuances appropriate for each language
- For technical terms, use standard industry terminology

Source text (${sourceLang}):
"""
${text}
"""

Translate to these languages: ${targetLangList}

Return ONLY a JSON object with language codes as keys and translations as values.
Do not include any explanation or additional text.

Example format:
{
  "tr": "Turkish translation here",
  "ar": "Arabic translation here",
  "fr": "French translation here"
}`;
  }

  /**
   * Parse Claude's translation response
   */
  private parseTranslationResponse(response: string, targetLangs: LanguageCode[]): TranslationResult {
    try {
      // Extract JSON from response (in case Claude adds extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const translations = JSON.parse(jsonMatch[0]);

      // Validate all target languages are present
      const result: TranslationResult = {};
      for (const lang of targetLangs) {
        if (translations[lang]) {
          result[lang] = translations[lang];
        } else {
          console.warn(`Missing translation for language: ${lang}`);
          result[lang] = `[Translation unavailable for ${lang}]`;
        }
      }

      return result;
    } catch (error) {
      console.error('Error parsing translation response:', error);

      // Fallback: return placeholder translations
      const fallback: TranslationResult = {};
      targetLangs.forEach(lang => {
        fallback[lang] = `[Translation error for ${lang}]`;
      });
      return fallback;
    }
  }

  /**
   * Translate a single text to a single target language
   */
  async translateSingle(
    text: string,
    sourceLang: LanguageCode,
    targetLang: LanguageCode,
    context?: string,
    tone?: 'formal' | 'informal' | 'technical' | 'conversational'
  ): Promise<string> {
    const result = await this.translate({
      text,
      sourceLang,
      targetLangs: [targetLang],
      context,
      tone
    });

    return result[targetLang];
  }

  /**
   * Detect language of text using Claude
   * (Fallback for when language detection is uncertain)
   */
  async detectLanguage(text: string): Promise<LanguageCode> {
    const prompt = `Detect the language of the following text and respond with ONLY the two-letter language code (en, tr, ar, ru, el, fr, de, it).

Text:
"""
${text}
"""

Respond with only the language code, nothing else.`;

    try {
      const response = await this.client.messages.create({
        model: this.config.model!,
        max_tokens: 10,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const langCode = content.text.trim().toLowerCase();

      // Validate language code
      if (Object.keys(LANGUAGE_NAMES).includes(langCode)) {
        return langCode as LanguageCode;
      }

      // Default to English if uncertain
      return 'en';
    } catch (error) {
      console.error('Language detection error:', error);
      return 'en'; // Default fallback
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ClaudeTranslationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): LanguageCode[] {
    return Object.keys(LANGUAGE_NAMES) as LanguageCode[];
  }

  /**
   * Get language name from code
   */
  getLanguageName(code: LanguageCode): string {
    return LANGUAGE_NAMES[code] || code;
  }
}

export default ClaudeTranslationService;
