/**
 * VHF Channel 72 Operations Service
 * Inspired by ada-marina-wim's marina operations protocol
 *
 * Channel 72 Usage:
 * - Marina berth requests ("Ada, berth musait mi?")
 * - Service requests ("Ada, yakıt lazım")
 * - Check-in/check-out procedures
 * - Facility inquiries
 * - Turkish/English/Greek voice commands
 *
 * Integration with Channel 16 (Emergency):
 * - Ch 16 → MAYDAY/PAN-PAN/SECURITE (always monitored)
 * - Ch 72 → Normal operations (marina/port)
 */

import { EventEmitter } from 'events';
import { createLogger, Logger } from '../../../core/utils/Logger.js';

export interface VHFOperationsCommand {
  channel: 72;
  timestamp: Date;
  language: 'tr' | 'en' | 'gr';
  transcript: string;
  intent: OperationIntent;
  entities: Record<string, any>;
  confidence: number;
  vesselId?: string;
  callsign?: string;
}

export type OperationIntent =
  | 'berth_request'
  | 'berth_availability'
  | 'fuel_request'
  | 'service_request'
  | 'check_in'
  | 'check_out'
  | 'facility_inquiry'
  | 'general_inquiry'
  | 'unknown';

export interface VHFOperationsResponse {
  message: string;
  language: 'tr' | 'en' | 'gr';
  autoRespond: boolean;
  requiresApproval: boolean;
  responseDelay?: number; // ms
}

/**
 * VHF Channel 72 Operations Handler
 */
export class VHFChannel72Operations extends EventEmitter {
  private logger: Logger;
  private enabled: boolean = true;
  private autoResponseEnabled: boolean = true;

  // Multilingual intent patterns (from ada-marina-wim)
  private intentPatterns: Record<string, { tr: RegExp[]; en: RegExp[]; gr: RegExp[] }> = {
    berth_request: {
      tr: [
        /berth.*istiy/i,
        /yanaşmak.*istiy/i,
        /yer.*var.*mı/i,
        /bağlanabilir.*miyim/i,
      ],
      en: [/berth.*request/i, /can.*berth/i, /berth.*available/i, /moor/i],
      gr: [/θέση.*πρόσδεσης/i, /μπορώ.*προσδεθώ/i],
    },
    fuel_request: {
      tr: [/yakıt.*lazım/i, /yakıt.*istiy/i, /depo.*doldur/i],
      en: [/fuel.*need/i, /fuel.*request/i, /refuel/i],
      gr: [/καύσιμα/i, /χρειάζομαι.*καύσιμα/i],
    },
    service_request: {
      tr: [/servis.*lazım/i, /tamir/i, /bakım/i],
      en: [/service.*need/i, /repair/i, /maintenance/i],
      gr: [/υπηρεσία/i, /επισκευή/i],
    },
    check_in: {
      tr: [/check.*in/i, /giriş/i, /geliyoruz/i],
      en: [/check.*in/i, /arriving/i, /coming.*in/i],
      gr: [/check.*in/i, /έλευση/i],
    },
    facility_inquiry: {
      tr: [/musait.*mi/i, /var.*mı/i, /açık.*mı/i],
      en: [/available/i, /is.*open/i, /do.*you.*have/i],
      gr: [/διαθέσιμο/i, /ανοιχτό/i],
    },
  };

  constructor() {
    super();
    this.logger = createLogger('VHF:Ch72');
  }

  /**
   * Process incoming Channel 72 transmission
   */
  async processTransmission(transcript: string, language: 'tr' | 'en' | 'gr'): Promise<VHFOperationsCommand> {
    const command: VHFOperationsCommand = {
      channel: 72,
      timestamp: new Date(),
      language,
      transcript,
      intent: this.parseIntent(transcript, language),
      entities: this.extractEntities(transcript, language),
      confidence: 0.85,
    };

    this.logger.info('Processing Ch72 transmission', {
      language,
      intent: command.intent,
      transcript: transcript.substring(0, 50) + '...',
    });

    this.emit('transmission:received', command);

    // Auto-respond if enabled and intent is clear
    if (this.autoResponseEnabled && command.confidence > 0.8) {
      const response = await this.generateResponse(command);
      if (response.autoRespond) {
        this.emit('response:ready', response);
      }
    }

    return command;
  }

  /**
   * Parse intent from transcript
   */
  private parseIntent(transcript: string, language: 'tr' | 'en' | 'gr'): OperationIntent {
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      const langPatterns = patterns[language];
      if (langPatterns.some(pattern => pattern.test(transcript))) {
        return intent as OperationIntent;
      }
    }
    return 'unknown';
  }

  /**
   * Extract entities from transcript
   */
  private extractEntities(transcript: string, language: 'tr' | 'en' | 'gr'): Record<string, any> {
    const entities: Record<string, any> = {};

    // Extract vessel length (e.g., "65 feet", "20 metre")
    const lengthMatch = transcript.match(/(\d+)\s*(feet|foot|metre|meter|ft|m)/i);
    if (lengthMatch) {
      entities.vesselLength = parseInt(lengthMatch[1]);
      entities.lengthUnit = lengthMatch[2].toLowerCase();
    }

    // Extract time (e.g., "15:00", "saat 3'te")
    const timeMatch = transcript.match(/(\d{1,2}):(\d{2})|saat\s*(\d{1,2})/i);
    if (timeMatch) {
      entities.time = timeMatch[0];
    }

    // Extract date (e.g., "bugün", "yarın", "today", "tomorrow")
    if (/bugün|today|σήμερα/i.test(transcript)) {
      entities.date = 'today';
    } else if (/yarın|tomorrow|αύριο/i.test(transcript)) {
      entities.date = 'tomorrow';
    }

    return entities;
  }

  /**
   * Generate response based on command
   */
  private async generateResponse(command: VHFOperationsCommand): Promise<VHFOperationsResponse> {
    const templates = this.getResponseTemplates(command.language);

    let message = '';
    let autoRespond = false;
    let requiresApproval = false;

    switch (command.intent) {
      case 'berth_availability':
        message = templates.berthAvailable;
        autoRespond = true;
        break;

      case 'berth_request':
        message = templates.berthRequest;
        requiresApproval = true;
        break;

      case 'fuel_request':
        message = templates.fuelService;
        autoRespond = true;
        break;

      case 'check_in':
        message = templates.checkIn;
        autoRespond = true;
        break;

      case 'facility_inquiry':
        message = templates.facilityInfo;
        autoRespond = true;
        break;

      default:
        message = templates.unknown;
        requiresApproval = true;
    }

    return {
      message,
      language: command.language,
      autoRespond,
      requiresApproval,
      responseDelay: 1000, // 1 second delay for natural response
    };
  }

  /**
   * Get response templates for language
   */
  private getResponseTemplates(language: 'tr' | 'en' | 'gr'): Record<string, string> {
    const templates = {
      tr: {
        berthAvailable: 'Evet kaptan, berth müsait. Lütfen yanaşma talimatlarını bekleyin.',
        berthRequest: 'Berth talebiniz alındı. Kılavuz kaptan yönlendirmesi yapacak.',
        fuelService: 'Yakıt servisi aktif. VHF Channel 9\'a geçin lütfen.',
        checkIn: 'Hoşgeldiniz! Check-in işleminiz başlatıldı.',
        facilityInfo: 'Tüm marina tesisleri açık. Detaylı bilgi için marina ofisi.',
        unknown: 'Mesajınız alındı. Marina ofisi size dönüş yapacak.',
      },
      en: {
        berthAvailable: 'Yes captain, berth is available. Please standby for berthing instructions.',
        berthRequest: 'Berth request received. Pilot will provide guidance.',
        fuelService: 'Fuel service is active. Please switch to VHF Channel 9.',
        checkIn: 'Welcome! Your check-in process has been initiated.',
        facilityInfo: 'All marina facilities are open. Contact marina office for details.',
        unknown: 'Message received. Marina office will get back to you.',
      },
      gr: {
        berthAvailable: 'Ναι καπετάνιε, η θέση πρόσδεσης είναι διαθέσιμη.',
        berthRequest: 'Λάβαμε το αίτημα. Ο πιλότος θα σας καθοδηγήσει.',
        fuelService: 'Η υπηρεσία καυσίμων είναι ενεργή. Μεταβείτε στο κανάλι 9.',
        checkIn: 'Καλώς ορίσατε! Το check-in ξεκίνησε.',
        facilityInfo: 'Όλες οι εγκαταστάσεις είναι ανοιχτές.',
        unknown: 'Λάβαμε το μήνυμα. Θα επικοινωνήσουμε.',
      },
    };

    return templates[language];
  }

  /**
   * Enable/disable Channel 72 operations
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.logger.info(`Channel 72 operations ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Enable/disable auto-response
   */
  setAutoResponse(enabled: boolean): void {
    this.autoResponseEnabled = enabled;
    this.logger.info(`Auto-response ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get service status
   */
  getStatus(): {
    enabled: boolean;
    autoResponseEnabled: boolean;
    supportedLanguages: string[];
  } {
    return {
      enabled: this.enabled,
      autoResponseEnabled: this.autoResponseEnabled,
      supportedLanguages: ['tr', 'en', 'gr'],
    };
  }
}

// Export singleton
export const vhfChannel72 = new VHFChannel72Operations();
