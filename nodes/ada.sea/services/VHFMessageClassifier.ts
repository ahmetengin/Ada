/**
 * VHFMessageClassifier - Classify and analyze VHF radio transmissions
 *
 * Uses pattern matching and keyword detection to classify:
 * - Emergency calls (MAYDAY, PAN PAN, SECURITE)
 * - Marina communications (berth requests, services)
 * - Navigation safety (passing arrangements, traffic)
 * - Weather information
 * - Port operations
 * - General intership communications
 */

import { VHFTransmission, VHFMessageType } from '../../../core/types.js';

export interface ClassificationResult {
  type: VHFMessageType;
  confidence: number; // 0-1
  keywords: string[];
  entities: {
    vesselNames?: string[];
    locations?: string[];
    channels?: number[];
    callsigns?: string[];
  };
  priority: 'low' | 'normal' | 'high' | 'urgent';
  summary?: string;
}

export interface EmergencyDetails {
  type: 'distress' | 'urgency' | 'safety';
  keyword: string;
  position?: { latitude: number; longitude: number };
  vesselName?: string;
  personsOnBoard?: number;
  natureOfDistress?: string;
}

/**
 * VHF message classifier
 */
export class VHFMessageClassifier {
  // Emergency keywords (ITU standard)
  private static EMERGENCY_KEYWORDS = {
    distress: ['mayday', 'sinking', 'fire aboard', 'collision', 'grounding', 'abandoning ship'],
    urgency: ['pan pan', 'medical emergency', 'man overboard', 'engine failure'],
    safety: ['securite', 'weather warning', 'navigation hazard', 'safety broadcast'],
  };

  // Marina communication patterns
  private static MARINA_PATTERNS = {
    berth_request: /berth|mooring|slip|docking|berthing/i,
    service_request: /fuel|water|electricity|pump.?out|provisions/i,
    arrival: /arriving|eta|approach|inbound/i,
    departure: /departing|leaving|cast.?off|outbound/i,
  };

  // Navigation safety patterns
  private static NAVIGATION_PATTERNS = {
    passing: /passing|overtaking|port.?to.?port|starboard.?to.?starboard/i,
    traffic: /traffic|crossing|collision course|give.?way/i,
    anchoring: /anchor|anchorage/i,
    bridge: /opening|bridge/i,
  };

  /**
   * Classify VHF transmission
   */
  classify(transmission: VHFTransmission): ClassificationResult {
    const transcription = transmission.transcription || '';

    // 1. Check for emergency (highest priority)
    const emergencyResult = this.detectEmergency(transcription);
    if (emergencyResult) {
      return {
        type: 'emergency',
        confidence: 0.95,
        keywords: [emergencyResult.keyword],
        entities: this.extractEntities(transcription),
        priority: 'urgent',
        summary: `Emergency: ${emergencyResult.type}`,
      };
    }

    // 2. Channel-based classification
    const channelType = this.classifyByChannel(transmission.channel);

    // 3. Content-based classification
    const contentType = this.classifyByContent(transcription);

    // 4. Combine results
    const type = contentType || channelType;
    const confidence = contentType ? 0.8 : 0.6;
    const priority = this.determinePriority(type, transmission.channel);

    return {
      type,
      confidence,
      keywords: this.extractKeywords(transcription, type),
      entities: this.extractEntities(transcription),
      priority,
      summary: this.generateSummary(type, transcription),
    };
  }

  /**
   * Detect emergency transmissions
   */
  detectEmergency(transcription: string): EmergencyDetails | null {
    const lower = transcription.toLowerCase();

    // Check distress
    for (const keyword of VHFMessageClassifier.EMERGENCY_KEYWORDS.distress) {
      if (lower.includes(keyword)) {
        return {
          type: 'distress',
          keyword,
        };
      }
    }

    // Check urgency
    for (const keyword of VHFMessageClassifier.EMERGENCY_KEYWORDS.urgency) {
      if (lower.includes(keyword)) {
        return {
          type: 'urgency',
          keyword,
        };
      }
    }

    // Check safety
    for (const keyword of VHFMessageClassifier.EMERGENCY_KEYWORDS.safety) {
      if (lower.includes(keyword)) {
        return {
          type: 'safety',
          keyword,
        };
      }
    }

    return null;
  }

  /**
   * Classify based on channel number
   */
  private classifyByChannel(channel: number): VHFMessageType {
    // Emergency channels
    if (channel === 16 || channel === 70) {
      return 'emergency';
    }

    // Marina channels (Turkey-specific)
    if (channel === 73 || channel === 72 || channel === 9) {
      return 'marina';
    }

    // Port operations
    if (channel === 11 || channel === 12 || channel === 14) {
      return 'port_ops';
    }

    // Coast Guard
    if (channel === 67) {
      return 'coast_guard';
    }

    // Bridge-to-bridge safety
    if (channel === 13) {
      return 'safety';
    }

    // Intership
    if ([6, 8, 10, 77].includes(channel)) {
      return 'intership';
    }

    return 'unknown';
  }

  /**
   * Classify based on message content
   */
  private classifyByContent(transcription: string): VHFMessageType | null {
    if (!transcription || transcription.length < 10) {
      return null;
    }

    // Check marina patterns
    for (const pattern of Object.values(VHFMessageClassifier.MARINA_PATTERNS)) {
      if (pattern.test(transcription)) {
        return 'marina';
      }
    }

    // Check navigation patterns
    for (const pattern of Object.values(VHFMessageClassifier.NAVIGATION_PATTERNS)) {
      if (pattern.test(transcription)) {
        return 'safety';
      }
    }

    // Check for weather keywords
    if (/weather|forecast|wind|wave|storm|gale/i.test(transcription)) {
      return 'weather';
    }

    // Default to intership
    return 'intership';
  }

  /**
   * Extract relevant keywords from transcription
   */
  private extractKeywords(transcription: string, type: VHFMessageType): string[] {
    const keywords: string[] = [];
    const lower = transcription.toLowerCase();

    // Common maritime keywords
    const maritimeKeywords = [
      'vessel', 'ship', 'yacht', 'boat', 'marina', 'port', 'berth',
      'anchor', 'mooring', 'fuel', 'water', 'service', 'captain',
      'crew', 'passenger', 'knots', 'nautical', 'course', 'heading',
    ];

    for (const keyword of maritimeKeywords) {
      if (lower.includes(keyword)) {
        keywords.push(keyword);
      }
    }

    return keywords.slice(0, 5); // Return top 5
  }

  /**
   * Extract entities (vessel names, locations, etc.)
   */
  private extractEntities(transcription: string): ClassificationResult['entities'] {
    const entities: ClassificationResult['entities'] = {};

    // Extract vessel names (simplified - looks for capital words after "vessel", "yacht", etc.)
    const vesselPattern = /(?:vessel|yacht|ship|boat)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
    const vesselMatches = [...transcription.matchAll(vesselPattern)];
    if (vesselMatches.length > 0) {
      entities.vesselNames = vesselMatches.map(m => m[1]);
    }

    // Extract channel references
    const channelPattern = /channel\s+(\d+)/gi;
    const channelMatches = [...transcription.matchAll(channelPattern)];
    if (channelMatches.length > 0) {
      entities.channels = channelMatches.map(m => parseInt(m[1]));
    }

    // Extract callsigns (simplified - looks for uppercase alphanumeric)
    const callsignPattern = /\b([A-Z]{2,}\d{1,4}[A-Z]?)\b/g;
    const callsignMatches = [...transcription.matchAll(callsignPattern)];
    if (callsignMatches.length > 0) {
      entities.callsigns = callsignMatches.map(m => m[1]).slice(0, 3);
    }

    // Extract location names (simplified - looks for capital words)
    const locationPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Marina|Port|Harbor|Bay|Anchorage)/g;
    const locationMatches = [...transcription.matchAll(locationPattern)];
    if (locationMatches.length > 0) {
      entities.locations = locationMatches.map(m => m[0]);
    }

    return entities;
  }

  /**
   * Determine message priority
   */
  private determinePriority(
    type: VHFMessageType,
    channel: number
  ): ClassificationResult['priority'] {
    // Emergency is always urgent
    if (type === 'emergency' || channel === 16 || channel === 70) {
      return 'urgent';
    }

    // Safety navigation is high priority
    if (type === 'safety' || channel === 13) {
      return 'high';
    }

    // Coast Guard is high priority
    if (type === 'coast_guard') {
      return 'high';
    }

    // Marina and port operations are normal
    if (type === 'marina' || type === 'port_ops') {
      return 'normal';
    }

    // Everything else is low
    return 'low';
  }

  /**
   * Generate brief summary of transmission
   */
  private generateSummary(type: VHFMessageType, transcription: string): string {
    if (!transcription || transcription.length < 10) {
      return `${type} communication`;
    }

    // Take first 50 characters
    const preview = transcription.substring(0, 50).trim();
    return `${type}: ${preview}${transcription.length > 50 ? '...' : ''}`;
  }

  /**
   * Batch classify multiple transmissions
   */
  classifyBatch(transmissions: VHFTransmission[]): Map<string, ClassificationResult> {
    const results = new Map<string, ClassificationResult>();

    for (const transmission of transmissions) {
      results.set(transmission.id, this.classify(transmission));
    }

    return results;
  }

  /**
   * Get statistics on transmission classifications
   */
  getClassificationStats(transmissions: VHFTransmission[]): Record<VHFMessageType, number> {
    const stats: Record<string, number> = {
      emergency: 0,
      intership: 0,
      marina: 0,
      port_ops: 0,
      coast_guard: 0,
      weather: 0,
      safety: 0,
      unknown: 0,
    };

    for (const transmission of transmissions) {
      const result = this.classify(transmission);
      stats[result.type]++;
    }

    return stats as Record<VHFMessageType, number>;
  }

  /**
   * Filter transmissions by type
   */
  filterByType(
    transmissions: VHFTransmission[],
    type: VHFMessageType
  ): VHFTransmission[] {
    return transmissions.filter(tx => {
      const result = this.classify(tx);
      return result.type === type;
    });
  }

  /**
   * Get high-priority transmissions
   */
  getHighPriorityTransmissions(transmissions: VHFTransmission[]): VHFTransmission[] {
    return transmissions.filter(tx => {
      const result = this.classify(tx);
      return result.priority === 'urgent' || result.priority === 'high';
    });
  }
}
