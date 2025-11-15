/**
 * GPTTranslationProvider - OpenAI GPT Translation Implementation
 *
 * Uses GPT-4o, GPT-4-turbo, or GPT-3.5-turbo for translation (cheaper alternative to Claude)
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

export class GPTTranslationProvider implements ITranslationProvider {
  readonly providerName: string;
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: TranslationConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4o'; // Default to GPT-4o
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature || 0.3;
    this.providerName = `openai-${this.model}`;
  }

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const { text, sourceLang, targetLangs, context, tone = 'conversational' } = request;

    const result: TranslationResult = {};
    result[sourceLang] = text;

    const translationsToMake = targetLangs.filter(lang => lang !== sourceLang);
    if (translationsToMake.length === 0) {
      return result;
    }

    // Batch translate using GPT
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
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: this.maxTokens,
          temperature: this.temperature
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const data = await response.json() as any;
      const content = data.choices[0].message.content;

      return this.parseTranslationResponse(content, targetLangs);
    } catch (error) {
      console.error('GPT translation error:', error);
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
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 10,
          temperature: 0
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const langCode = data.choices[0].message.content.trim().toLowerCase();

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

export default GPTTranslationProvider;
