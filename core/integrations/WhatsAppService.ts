/**
 * WhatsApp Business Integration
 * From Ada-Maritime-Ai for multi-channel customer engagement
 *
 * Features:
 * - Multi-language support (TR/EN/GR)
 * - Berth reservations via WhatsApp
 * - Customer support automation
 * - Rich media messages (images, locations, documents)
 * - Template messages for notifications
 */

import { createLogger, Logger } from '../utils/Logger.js';
import EventEmitter from 'eventemitter3';

export type WhatsAppMessageType = 'text' | 'image' | 'document' | 'location' | 'template';
export type WhatsAppLanguage = 'tr' | 'en' | 'gr';

export interface WhatsAppMessage {
  id: string;
  from: string; // Phone number
  to: string; // Business phone number
  type: WhatsAppMessageType;
  content: string;
  timestamp: Date;
  language?: WhatsAppLanguage;
  metadata?: Record<string, any>;
}

export interface WhatsAppOutgoingMessage {
  to: string;
  type: WhatsAppMessageType;
  content: string;
  language?: WhatsAppLanguage;
  mediaUrl?: string;
  templateName?: string;
  templateParams?: string[];
}

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  webhookVerifyToken: string;
  apiVersion?: string;
}

export interface WhatsAppIntent {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  language: WhatsAppLanguage;
}

/**
 * WhatsApp Business API Service
 */
export class WhatsAppService extends EventEmitter {
  private logger: Logger;
  private config: WhatsAppConfig;
  private enabled: boolean = false;

  // Intent patterns (multi-language)
  private intentPatterns: Record<string, { tr: RegExp[]; en: RegExp[]; gr: RegExp[] }> = {
    berth_inquiry: {
      tr: [/berth.*musait/i, /yer.*var.*mı/i, /rezervasyon/i, /bağlanmak/i],
      en: [/berth.*available/i, /book.*berth/i, /reservation/i, /mooring/i],
      gr: [/θέση.*πρόσδεσης/i, /κράτηση/i, /διαθέσιμο/i],
    },
    price_inquiry: {
      tr: [/fiyat.*ne/i, /kaç.*lira/i, /ücret/i, /ne.*kadar/i],
      en: [/how.*much/i, /price/i, /cost/i, /rate/i],
      gr: [/πόσο.*κοστίζει/i, /τιμή/i],
    },
    facility_inquiry: {
      tr: [/tesis.*var.*mı/i, /hizmet/i, /restaurant/i, /market/i],
      en: [/facilities/i, /services/i, /restaurant/i, /amenities/i],
      gr: [/εγκαταστάσεις/i, /υπηρεσίες/i],
    },
    check_in: {
      tr: [/geliyorum/i, /varıyorum/i, /check.*in/i],
      en: [/arriving/i, /check.*in/i, /coming/i],
      gr: [/φτάνω/i, /έλευση/i],
    },
    help: {
      tr: [/yardım/i, /nasıl/i, /bilgi/i],
      en: [/help/i, /how/i, /info/i],
      gr: [/βοήθεια/i, /πληροφορίες/i],
    },
  };

  constructor(config: WhatsAppConfig) {
    super();
    this.logger = createLogger('Integration:WhatsApp');
    this.config = config;
  }

  /**
   * Initialize WhatsApp service
   */
  async initialize(): Promise<void> {
    try {
      // In production, verify webhook and phone number
      // await this.verifyWebhook();
      // await this.verifyPhoneNumber();

      this.enabled = true;
      this.logger.info('WhatsApp service initialized', {
        phoneNumberId: this.config.phoneNumberId,
      });
    } catch (error) {
      this.logger.error('Failed to initialize WhatsApp service', { error });
      throw error;
    }
  }

  /**
   * Process incoming WhatsApp message
   */
  async processIncomingMessage(message: WhatsAppMessage): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('WhatsApp service not enabled');
      return;
    }

    this.logger.info('Processing WhatsApp message', {
      from: message.from,
      type: message.type,
    });

    // Detect language
    const language = this.detectLanguage(message.content);
    message.language = language;

    // Parse intent
    const intent = this.parseIntent(message.content, language);

    this.emit('message:received', { message, intent });

    // Auto-respond based on intent
    if (intent.confidence > 0.7) {
      await this.handleIntent(message, intent);
    }
  }

  /**
   * Detect message language
   */
  private detectLanguage(text: string): WhatsAppLanguage {
    // Simple language detection based on character patterns
    if (/[ğüşöçİĞÜŞÖÇ]/.test(text)) return 'tr';
    if (/[αβγδεζηθικλμνξοπρστυφχψω]/.test(text)) return 'gr';
    return 'en';
  }

  /**
   * Parse intent from message
   */
  private parseIntent(text: string, language: WhatsAppLanguage): WhatsAppIntent {
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      const langPatterns = patterns[language];
      if (langPatterns.some((pattern) => pattern.test(text))) {
        return {
          intent,
          confidence: 0.85,
          entities: this.extractEntities(text),
          language,
        };
      }
    }

    return {
      intent: 'unknown',
      confidence: 0.3,
      entities: {},
      language,
    };
  }

  /**
   * Extract entities from text
   */
  private extractEntities(text: string): Record<string, any> {
    const entities: Record<string, any> = {};

    // Extract dates
    if (/bugün|today|σήμερα/i.test(text)) {
      entities.date = 'today';
    } else if (/yarın|tomorrow|αύριο/i.test(text)) {
      entities.date = 'tomorrow';
    }

    // Extract vessel length
    const lengthMatch = text.match(/(\d+)\s*(metre|meter|foot|feet|m|ft)/i);
    if (lengthMatch) {
      entities.vesselLength = parseInt(lengthMatch[1]);
      entities.lengthUnit = lengthMatch[2];
    }

    // Extract duration
    const durationMatch = text.match(/(\d+)\s*(gün|day|days|ημέρ)/i);
    if (durationMatch) {
      entities.duration = parseInt(durationMatch[1]);
    }

    return entities;
  }

  /**
   * Handle intent with auto-response
   */
  private async handleIntent(message: WhatsAppMessage, intent: WhatsAppIntent): Promise<void> {
    const responses = this.getResponseTemplates(intent.language);

    let response: string;

    switch (intent.intent) {
      case 'berth_inquiry':
        response = responses.berthInquiry;
        await this.sendMessage({
          to: message.from,
          type: 'text',
          content: response,
          language: intent.language,
        });
        break;

      case 'price_inquiry':
        response = responses.priceInquiry;
        await this.sendMessage({
          to: message.from,
          type: 'text',
          content: response,
          language: intent.language,
        });
        break;

      case 'facility_inquiry':
        response = responses.facilityInquiry;
        await this.sendMessage({
          to: message.from,
          type: 'text',
          content: response,
          language: intent.language,
        });
        break;

      case 'help':
        response = responses.help;
        await this.sendMessage({
          to: message.from,
          type: 'text',
          content: response,
          language: intent.language,
        });
        break;

      default:
        response = responses.default;
        await this.sendMessage({
          to: message.from,
          type: 'text',
          content: response,
          language: intent.language,
        });
    }

    this.logger.info('Auto-response sent', { intent: intent.intent, language: intent.language });
  }

  /**
   * Get response templates for language
   */
  private getResponseTemplates(language: WhatsAppLanguage): Record<string, string> {
    const templates = {
      tr: {
        berthInquiry:
          '🛥️ Merhaba! Berth rezervasyonu için size yardımcı olabilirim.\n\nLütfen şu bilgileri paylaşın:\n- Tekne boyu\n- Giriş tarihi\n- Kalış süresi\n\nVeya doğrudan arayın: +90 212 XXX XXXX',
        priceInquiry:
          '💰 Fiyatlarımız sezona ve tekne boyuna göre değişmektedir.\n\n📅 Düşük sezon: %30 indirim\n☀️ Yüksek sezon: Normal fiyat\n🏖️ Peak sezon: %60 premium\n\nDetaylı fiyat teklifi için: +90 212 XXX XXXX',
        facilityInquiry:
          '🏖️ Marina Tesislerimiz:\n\n✅ Restaurant & Bar\n✅ Market & Chandlery\n✅ Spa & Fitness\n✅ Beach Club\n✅ Haul-out & Repair\n\nDetaylı bilgi: www.ada.marina',
        help:
          '👋 Size nasıl yardımcı olabilirim?\n\n📍 Berth rezervasyonu\n💰 Fiyat bilgisi\n🏖️ Tesis bilgileri\n📞 İletişim\n\nYazmaya devam edin!',
        default:
          'Mesajınız alındı. Marina ekibimiz en kısa sürede dönüş yapacak.\n\nAcil durumlar için: +90 212 XXX XXXX',
      },
      en: {
        berthInquiry:
          "🛥️ Hello! I can help you with berth reservations.\n\nPlease provide:\n- Vessel length\n- Arrival date\n- Duration\n\nOr call directly: +90 212 XXX XXXX",
        priceInquiry:
          '💰 Our prices vary by season and vessel length.\n\n📅 Low season: 30% discount\n☀️ High season: Standard rate\n🏖️ Peak season: 60% premium\n\nFor quote: +90 212 XXX XXXX',
        facilityInquiry:
          '🏖️ Marina Facilities:\n\n✅ Restaurant & Bar\n✅ Market & Chandlery\n✅ Spa & Fitness\n✅ Beach Club\n✅ Haul-out & Repair\n\nDetails: www.ada.marina',
        help:
          '👋 How can I help?\n\n📍 Berth reservation\n💰 Price info\n🏖️ Facilities\n📞 Contact\n\nJust ask!',
        default:
          'Message received. Our marina team will respond shortly.\n\nUrgent: +90 212 XXX XXXX',
      },
      gr: {
        berthInquiry:
          '🛥️ Γεια σας! Μπορώ να βοηθήσω με κράτηση.\n\nΠαρακαλώ δώστε:\n- Μήκος σκάφους\n- Ημερομηνία άφιξης\n- Διάρκεια\n\nΉ καλέστε: +90 212 XXX XXXX',
        priceInquiry:
          '💰 Οι τιμές μας ποικίλλουν ανάλογα με την εποχή.\n\n📅 Χαμηλή σεζόν: 30% έκπτωση\n☀️ Υψηλή σεζόν: Κανονική τιμή\n🏖️ Αιχμή: 60% premium\n\nΓια προσφορά: +90 212 XXX XXXX',
        facilityInquiry:
          '🏖️ Εγκαταστάσεις:\n\n✅ Εστιατόριο & Bar\n✅ Market\n✅ Spa & Γυμναστήριο\n✅ Beach Club\n✅ Επισκευές\n\nΠληροφορίες: www.ada.marina',
        help:
          '👋 Πώς μπορώ να βοηθήσω;\n\n📍 Κράτηση\n💰 Τιμές\n🏖️ Εγκαταστάσεις\n📞 Επικοινωνία\n\nΡωτήστε με!',
        default: 'Λάβαμε το μήνυμα. Θα επικοινωνήσουμε σύντομα.\n\nΈκτακτη ανάγκη: +90 212 XXX XXXX',
      },
    };

    return templates[language];
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(message: WhatsAppOutgoingMessage): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('WhatsApp service not enabled');
      return;
    }

    this.logger.info('Sending WhatsApp message', {
      to: message.to,
      type: message.type,
    });

    // In production, send via WhatsApp Business API
    // const url = `https://graph.facebook.com/${this.config.apiVersion}/messages`;
    // await fetch(url, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.config.accessToken}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     messaging_product: 'whatsapp',
    //     to: message.to,
    //     type: message.type,
    //     text: { body: message.content }
    //   })
    // });

    this.emit('message:sent', message);
  }

  /**
   * Send template message (pre-approved templates)
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    language: WhatsAppLanguage,
    params: string[]
  ): Promise<void> {
    if (!this.enabled) return;

    this.logger.info('Sending template message', { to, templateName, language });

    // In production, send template via API
    // Templates must be pre-approved by Meta
  }

  /**
   * Send location (marina coordinates)
   */
  async sendLocation(
    to: string,
    latitude: number,
    longitude: number,
    name: string,
    address: string
  ): Promise<void> {
    if (!this.enabled) return;

    this.logger.info('Sending location', { to, name });

    // In production, send location via API
  }

  /**
   * Enable/disable service
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.logger.info(`WhatsApp service ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get service status
   */
  getStatus(): {
    enabled: boolean;
    supportedLanguages: string[];
    phoneNumberId: string;
  } {
    return {
      enabled: this.enabled,
      supportedLanguages: ['tr', 'en', 'gr'],
      phoneNumberId: this.config.phoneNumberId,
    };
  }
}

// Export factory
export function createWhatsAppService(config: WhatsAppConfig): WhatsAppService {
  return new WhatsAppService(config);
}
