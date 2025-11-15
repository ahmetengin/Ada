/**
 * GeminiTranslationProvider - Google Gemini Translation Implementation
 *
 * Uses Gemini 2.0 Flash or Gemini Pro for translation (VERY CHEAP alternative!)
 *
 * Pricing (as of Jan 2025):
 * - Gemini 2.0 Flash: $0.10 per 1M input tokens, $0.40 per 1M output tokens
 * - Gemini 1.5 Pro: $1.25 per 1M input tokens, $5.00 per 1M output tokens
 *
 * CHEAPEST OPTION: Gemini 2.0 Flash is 30x cheaper than GPT-4o!
 */

import { ITranslationProvider, TranslationRequest, TranslationResult, TranslationConfig } from './ITranslationProvider.js';
import { LanguageCode } from '../../InterpreterNode.js';

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

export class GeminiTranslationProvider implements ITranslationProvider {
  readonly providerName: string;
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: TranslationConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-2.0-flash-exp'; // Default to Gemini 2.0 Flash
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature || 0.3;
    this.providerName = `google-${this.model}`;
  }

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const { text, sourceLang, targetLangs, context, tone = 'conversational' } = request;

    const result: TranslationResult = {};
    result[sourceLang] = text;

    const translationsToMake = targetLangs.filter(lang => lang !== sourceLang);
    if (translationsToMake.length === 0) {
      return result;
    }

    // Batch translate using Gemini
    const translations = await this.batchTranslate(text, sourceLang, translationsToMake, context, tone);
    Object.assign(result, translations);

    return result;
  }

  private async batchTranslate(
    text: string,
    sourceLang: LanguageCode,
    targetLangs: LanguageCode[],
    context?: string,
    tone: string = 'conversational'
  ): Promise<TranslationResult> {
    const sourceLangName = LANGUAGE_NAMES[sourceLang];
    const targetLangList = targetLangs.map(lang => `"${lang}": ${LANGUAGE_NAMES[lang]}`).join(', ');

    const prompt = `You are a professional conference interpreter. Translate the following ${sourceLangName} text into multiple languages for a live conference setting.

${context ? `Conference context: ${context}\n` : ''}

Translation requirements:
- Sound natural for a live conference audience
- Match the ${tone} tone of the original
- Avoid overly literal translations
- Maintain emotional tone and intent
- Use standard industry terminology for technical terms

Source text (${sourceLangName}):
"""
${text}
"""

Translate to these languages: ${targetLangList}

Return ONLY a JSON object with language codes as keys and translations as values. No explanation.

Example format:
{
  "tr": "Turkish translation here",
  "ar": "Arabic translation here"
}`;

    try {
      const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            temperature: this.temperature,
            maxOutputTokens: this.maxTokens
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
      }

      const data = await response.json() as any;
      const content = data.candidates[0].content.parts[0].text;

      return this.parseTranslationResponse(content, targetLangs);
    } catch (error) {
      console.error('Gemini translation error:', error);
      throw error;
    }
  }

  private parseTranslationResponse(response: string, targetLangs: LanguageCode[]): TranslationResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const translations = JSON.parse(jsonMatch[0]);
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
      const fallback: TranslationResult = {};
      targetLangs.forEach(lang => {
        fallback[lang] = `[Translation error for ${lang}]`;
      });
      return fallback;
    }
  }

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

  async detectLanguage(text: string): Promise<LanguageCode> {
    const prompt = `Detect the language of the following text and respond with ONLY the two-letter language code (en, tr, ar, ru, el, fr, de, it).

Text:
"""
${text}
"""

Respond with only the language code, nothing else.`;

    try {
      const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 10
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const langCode = data.candidates[0].content.parts[0].text.trim().toLowerCase();

      if (Object.keys(LANGUAGE_NAMES).includes(langCode)) {
        return langCode as LanguageCode;
      }

      return 'en'; // Default fallback
    } catch (error) {
      console.error('Language detection error:', error);
      return 'en';
    }
  }

  getSupportedLanguages(): LanguageCode[] {
    return Object.keys(LANGUAGE_NAMES) as LanguageCode[];
  }

  updateConfig(config: Partial<TranslationConfig>): void {
    if (config.apiKey) this.apiKey = config.apiKey;
    if (config.model) this.model = config.model;
    if (config.maxTokens) this.maxTokens = config.maxTokens;
    if (config.temperature !== undefined) this.temperature = config.temperature;
  }
}

export default GeminiTranslationProvider;
