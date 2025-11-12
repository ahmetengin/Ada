/**
 * VHFRaceMode - Specialized VHF monitoring for sailing races
 *
 * Features:
 * - Race-specific channel monitoring (Ch 6, 73)
 * - Start sequence detection (5-4-1-GO)
 * - Race committee communication parsing
 * - Fleet position updates
 * - Course change announcements
 * - Automatic mark rounding detection
 *
 * Typical race channels:
 * - Ch 6 (156.300 MHz): Fleet communications
 * - Ch 73 (156.675 MHz): Race committee / club channel
 * - Ch 16 (156.800 MHz): Emergency (always monitored)
 */

import { EventEmitter } from 'events';
import { VHFTransmission } from '../../../core/types.js';

export interface RaceConfig {
  raceName: string;
  raceChannels: number[];
  committeeChannel: number;
  fleetChannel: number;
  startTime?: Date;
  courseMarks?: string[];
}

export interface RaceEvent {
  type: 'start_sequence' | 'course_change' | 'mark_rounding' | 'abandonment' | 'general_recall' | 'postponement';
  timestamp: Date;
  message: string;
  sequenceNumber?: number; // For start sequence (5, 4, 1, 0)
  flag?: string; // Signal flags (AP, N, First Substitute, etc.)
  transmission?: VHFTransmission;
}

export interface StartSequence {
  class?: string; // Racing class (e.g., "Cruiser", "IRC", "ORC")
  signals: RaceEvent[];
  isComplete: boolean;
  actualStartTime?: Date;
}

export class VHFRaceMode extends EventEmitter {
  private config: RaceConfig;
  private isActive: boolean = false;
  private raceEvents: RaceEvent[] = [];
  private startSequences: Map<string, StartSequence> = new Map();
  private lastTransmission?: VHFTransmission;

  // Start sequence patterns
  private static START_PATTERNS = {
    warning: /(?:warning|5.?minute)/i,
    preparatory: /(?:preparatory|prep|4.?minute)/i,
    one_minute: /(?:one.?minute|1.?minute)/i,
    start: /(?:start|go|racing|started)/i,
  };

  // Race control patterns
  private static RACE_PATTERNS = {
    general_recall: /general.?recall/i,
    individual_recall: /individual.?recall/i,
    abandonment: /(?:abandon|race.?abandoned)/i,
    postponement: /(?:postpone|postponement|ap)/i,
    course_change: /(?:course.?change|shorten.?course)/i,
    mark_rounding: /(?:round|rounding|mark|gate)/i,
  };

  // Signal flags
  private static FLAG_CODES: Record<string, string> = {
    'AP': 'Answering Pennant - Postponement',
    'N': 'November - Abandonment',
    'First Substitute': 'General Recall',
    'X': 'Individual Recall',
    'S': 'Shortened Course',
    'M': 'Mark Signal',
    'P': 'Preparatory',
    'I': 'Rule 30.1 - Round-an-end rule',
    'Z': 'Rule 30.2 - 20% penalty',
    'U': 'Rule 30.3 - U flag rule',
    'Black': 'Rule 30.4 - Black flag rule',
  };

  constructor(config: RaceConfig) {
    super();
    this.config = config;
  }

  /**
   * Activate race mode
   */
  activate(): void {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.raceEvents = [];
    this.startSequences.clear();

    this.emit('race_mode:activated', {
      raceName: this.config.raceName,
      channels: this.config.raceChannels,
    });
  }

  /**
   * Deactivate race mode
   */
  deactivate(): void {
    this.isActive = false;
    this.emit('race_mode:deactivated');
  }

  /**
   * Check if race mode is active
   */
  isRaceModeActive(): boolean {
    return this.isActive;
  }

  /**
   * Get race-specific priority channels
   */
  getRaceChannels(): number[] {
    return [
      16, // Emergency (always)
      this.config.committeeChannel,
      this.config.fleetChannel,
      ...this.config.raceChannels,
    ];
  }

  /**
   * Process VHF transmission for race-specific content
   */
  processTransmission(transmission: VHFTransmission): void {
    if (!this.isActive) {
      return;
    }

    if (!transmission.transcription) {
      return; // No transcription available
    }

    this.lastTransmission = transmission;
    const text = transmission.transcription.toLowerCase();

    // Check for start sequence
    this.detectStartSequence(transmission, text);

    // Check for race control announcements
    this.detectRaceControl(transmission, text);

    // Check for course/mark information
    this.detectCourseInfo(transmission, text);

    // Check for fleet communications
    this.detectFleetComms(transmission, text);
  }

  /**
   * Detect start sequence signals
   */
  private detectStartSequence(transmission: VHFTransmission, text: string): void {
    // Extract class name if mentioned
    const classMatch = text.match(/(?:class|fleet|division)\s+([a-z0-9]+)/i);
    const className = classMatch ? classMatch[1] : 'default';

    // Get or create start sequence
    let sequence = this.startSequences.get(className);
    if (!sequence) {
      sequence = {
        class: className,
        signals: [],
        isComplete: false,
      };
      this.startSequences.set(className, sequence);
    }

    // Check for warning signal (5 minutes)
    if (VHFRaceMode.START_PATTERNS.warning.test(text)) {
      const event: RaceEvent = {
        type: 'start_sequence',
        timestamp: transmission.timestamp,
        message: 'Warning signal - 5 minutes to start',
        sequenceNumber: 5,
        transmission,
      };

      sequence.signals.push(event);
      this.raceEvents.push(event);
      this.emit('race:warning_signal', { class: className, event });
    }

    // Check for preparatory signal (4 minutes)
    if (VHFRaceMode.START_PATTERNS.preparatory.test(text)) {
      const event: RaceEvent = {
        type: 'start_sequence',
        timestamp: transmission.timestamp,
        message: 'Preparatory signal - 4 minutes to start',
        sequenceNumber: 4,
        transmission,
      };

      sequence.signals.push(event);
      this.raceEvents.push(event);
      this.emit('race:preparatory_signal', { class: className, event });
    }

    // Check for one minute signal
    if (VHFRaceMode.START_PATTERNS.one_minute.test(text)) {
      const event: RaceEvent = {
        type: 'start_sequence',
        timestamp: transmission.timestamp,
        message: 'One minute to start',
        sequenceNumber: 1,
        transmission,
      };

      sequence.signals.push(event);
      this.raceEvents.push(event);
      this.emit('race:one_minute_signal', { class: className, event });
    }

    // Check for start signal
    if (VHFRaceMode.START_PATTERNS.start.test(text)) {
      const event: RaceEvent = {
        type: 'start_sequence',
        timestamp: transmission.timestamp,
        message: 'START!',
        sequenceNumber: 0,
        transmission,
      };

      sequence.signals.push(event);
      sequence.isComplete = true;
      sequence.actualStartTime = transmission.timestamp;
      this.raceEvents.push(event);

      this.emit('race:start', { class: className, event, sequence });
    }
  }

  /**
   * Detect race control announcements
   */
  private detectRaceControl(transmission: VHFTransmission, text: string): void {
    // General recall
    if (VHFRaceMode.RACE_PATTERNS.general_recall.test(text)) {
      const event: RaceEvent = {
        type: 'general_recall',
        timestamp: transmission.timestamp,
        message: 'General Recall',
        flag: 'First Substitute',
        transmission,
      };

      this.raceEvents.push(event);
      this.emit('race:general_recall', event);
      return;
    }

    // Abandonment
    if (VHFRaceMode.RACE_PATTERNS.abandonment.test(text)) {
      const event: RaceEvent = {
        type: 'abandonment',
        timestamp: transmission.timestamp,
        message: 'Race Abandoned',
        flag: 'N',
        transmission,
      };

      this.raceEvents.push(event);
      this.emit('race:abandonment', event);
      return;
    }

    // Postponement
    if (VHFRaceMode.RACE_PATTERNS.postponement.test(text)) {
      const event: RaceEvent = {
        type: 'postponement',
        timestamp: transmission.timestamp,
        message: 'Postponement',
        flag: 'AP',
        transmission,
      };

      this.raceEvents.push(event);
      this.emit('race:postponement', event);
      return;
    }

    // Course change
    if (VHFRaceMode.RACE_PATTERNS.course_change.test(text)) {
      const event: RaceEvent = {
        type: 'course_change',
        timestamp: transmission.timestamp,
        message: text,
        flag: 'S',
        transmission,
      };

      this.raceEvents.push(event);
      this.emit('race:course_change', event);
    }
  }

  /**
   * Detect course and mark information
   */
  private detectCourseInfo(transmission: VHFTransmission, text: string): void {
    // Check for mark rounding
    if (VHFRaceMode.RACE_PATTERNS.mark_rounding.test(text)) {
      // Extract mark name
      const markMatch = text.match(/mark\s+([a-z0-9]+)/i);
      const markName = markMatch ? markMatch[1] : 'unknown';

      const event: RaceEvent = {
        type: 'mark_rounding',
        timestamp: transmission.timestamp,
        message: `Rounding mark: ${markName}`,
        transmission,
      };

      this.raceEvents.push(event);
      this.emit('race:mark_rounding', event);
    }

    // Check for course marks in config
    if (this.config.courseMarks) {
      for (const mark of this.config.courseMarks) {
        const regex = new RegExp(mark, 'i');
        if (regex.test(text)) {
          this.emit('race:mark_mentioned', {
            mark,
            transmission,
            text,
          });
        }
      }
    }
  }

  /**
   * Detect fleet communications
   */
  private detectFleetComms(transmission: VHFTransmission, text: string): void {
    // On fleet channel, emit all transmissions
    if (transmission.channel === this.config.fleetChannel) {
      this.emit('race:fleet_comms', {
        transmission,
        text,
      });
    }
  }

  /**
   * Get all race events
   */
  getRaceEvents(): RaceEvent[] {
    return [...this.raceEvents];
  }

  /**
   * Get start sequences for all classes
   */
  getStartSequences(): Map<string, StartSequence> {
    return new Map(this.startSequences);
  }

  /**
   * Get time until start (if start time configured)
   */
  getTimeToStart(): number | null {
    if (!this.config.startTime) {
      return null;
    }

    const now = Date.now();
    const startTime = this.config.startTime.getTime();
    const diff = startTime - now;

    return diff > 0 ? diff : 0;
  }

  /**
   * Get race summary
   */
  getRaceSummary(): {
    raceName: string;
    isActive: boolean;
    totalEvents: number;
    startSequences: number;
    completedStarts: number;
    channelsMonitored: number[];
  } {
    const completedStarts = Array.from(this.startSequences.values()).filter(
      seq => seq.isComplete
    ).length;

    return {
      raceName: this.config.raceName,
      isActive: this.isActive,
      totalEvents: this.raceEvents.length,
      startSequences: this.startSequences.size,
      completedStarts,
      channelsMonitored: this.getRaceChannels(),
    };
  }

  /**
   * Export race data
   */
  exportRaceData(): string {
    return JSON.stringify({
      config: this.config,
      events: this.raceEvents,
      startSequences: Array.from(this.startSequences.entries()),
      summary: this.getRaceSummary(),
      exportedAt: new Date(),
    }, null, 2);
  }

  /**
   * Clear race data (for new race)
   */
  clearRaceData(): void {
    this.raceEvents = [];
    this.startSequences.clear();
    this.emit('race:data_cleared');
  }
}
