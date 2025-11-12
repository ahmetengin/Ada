/**
 * VHFChannelDefinitions - Complete VHF marine channel database
 * Based on ITU regulations and Turkish maritime practices
 * Reference: docs/reference/vhf-channels-turkey.md
 */

import { VHFChannel } from '../../../core/types.js';

/**
 * Complete VHF marine channel database
 * Frequencies in MHz, simplex channels use single frequency
 */
export const VHF_CHANNELS: Record<number, VHFChannel> = {
  // INTERSHIP CHANNELS (Ship-to-ship)
  6: {
    channel: 6,
    frequency: 156.300,
    type: 'intership',
    name: 'Intership Primary',
    description: 'Primary ship-to-ship operational channel, most common for sailing yachts',
    simplex: true,
  },

  8: {
    channel: 8,
    frequency: 156.400,
    type: 'intership',
    name: 'Intership / Tender Operations',
    description: 'Intership and tender operations, support boats, shore transfers',
    simplex: true,
  },

  9: {
    channel: 9,
    frequency: 156.450,
    type: 'marina',
    name: 'Port Operations / Backup',
    description: 'Marina calls and intership backup',
    simplex: true,
  },

  10: {
    channel: 10,
    frequency: 156.500,
    type: 'intership',
    name: 'Fleet Coordination',
    description: 'Small fleet coordination',
    simplex: true,
  },

  13: {
    channel: 13,
    frequency: 156.650,
    type: 'intership',
    name: 'Bridge-to-Bridge Navigation',
    description: 'Safety navigation, passing arrangements',
    simplex: true,
  },

  72: {
    channel: 72,
    frequency: 156.625,
    type: 'intership',
    name: 'General Intership',
    description: 'Widely used in Turkey, Istanbul marinas',
    simplex: true,
  },

  73: {
    channel: 73,
    frequency: 156.675,
    type: 'marina',
    name: 'Marina Standard (Turkey)',
    description: 'Primary marina working channel in Turkey',
    simplex: true,
  },

  77: {
    channel: 77,
    frequency: 156.875,
    type: 'intership',
    name: 'Short-Range Operations',
    description: 'Docking and mooring assistance',
    simplex: true,
  },

  // EMERGENCY & SAFETY
  16: {
    channel: 16,
    frequency: 156.800,
    type: 'emergency',
    name: 'DISTRESS / CALLING',
    description: 'International distress, urgency, safety, and calling channel - MANDATORY MONITORING',
    simplex: true,
  },

  70: {
    channel: 70,
    frequency: 156.525,
    type: 'dsc',
    name: 'Digital Selective Calling',
    description: 'DSC distress and safety calling (digital only)',
    simplex: true,
  },

  // PORT OPERATIONS
  11: {
    channel: 11,
    frequency: 156.550,
    type: 'port',
    name: 'Port Operations',
    description: 'Port operations and VTS',
    simplex: true,
  },

  12: {
    channel: 12,
    frequency: 156.600,
    type: 'port',
    name: 'Port Operations',
    description: 'Port operations',
    simplex: true,
  },

  14: {
    channel: 14,
    frequency: 156.700,
    type: 'port',
    name: 'Port Operations',
    description: 'Port operations',
    simplex: true,
  },

  // COAST GUARD
  67: {
    channel: 67,
    frequency: 156.375,
    type: 'coast_guard',
    name: 'Turkish Coast Guard',
    description: 'Turkish Coast Guard working channel',
    simplex: true,
  },
};

/**
 * Priority channel configuration for Turkish waters
 */
export const TURKEY_PRIORITY_CHANNELS = [
  16,  // Emergency - ALWAYS monitor
  73,  // Marina working channel (primary in Turkey)
  72,  // Istanbul marinas / intership
  6,   // Ship-to-ship primary
  13,  // Bridge-to-bridge safety
];

/**
 * Priority channel configuration for international waters
 */
export const INTERNATIONAL_PRIORITY_CHANNELS = [
  16,  // Emergency - ALWAYS monitor
  13,  // Bridge-to-bridge safety
  6,   // Ship-to-ship primary
  9,   // Port operations
];

/**
 * Channel classification mapping
 */
export const CHANNEL_CLASSIFICATIONS = {
  EMERGENCY: [16, 70],
  INTERSHIP: [6, 8, 10, 13, 72, 73, 77],
  MARINA: [9, 73, 72],  // Turkey-specific emphasis
  PORT_OPS: [11, 12, 14],
  COAST_GUARD: [67],
};

/**
 * Geographic channel profiles
 */
export interface GeographicProfile {
  region: string;
  priorityChannels: number[];
  marinaChannels: number[];
  notes: string;
}

export const GEOGRAPHIC_PROFILES: Record<string, GeographicProfile> = {
  istanbul: {
    region: 'Istanbul / Bosphorus / Marmara',
    priorityChannels: [16, 72, 73, 6, 13],
    marinaChannels: [72, 73],
    notes: 'Both Ch 72 and 73 used. Ataköy uses 73, Kalamış uses 72.',
  },

  aegean: {
    region: 'Aegean Coast (Çeşme, Kuşadası, Bodrum)',
    priorityChannels: [16, 73, 6, 13],
    marinaChannels: [73],
    notes: 'Ch 73 standard for all marinas. Ch 6 for intership.',
  },

  mediterranean: {
    region: 'Mediterranean Coast (Göcek, Kemer, Antalya)',
    priorityChannels: [16, 73, 6, 13],
    marinaChannels: [73],
    notes: 'Ch 73 standard. Increase safety monitoring (Ch 13, 16).',
  },

  international: {
    region: 'International / Open Sea',
    priorityChannels: [16, 13, 6, 9],
    marinaChannels: [9],
    notes: 'Mandatory Ch 16. Ch 13 for traffic. Local marinas vary.',
  },
};

/**
 * Get channel by number
 */
export function getChannel(channelNumber: number): VHFChannel | undefined {
  return VHF_CHANNELS[channelNumber];
}

/**
 * Get all channels of a specific type
 */
export function getChannelsByType(type: VHFChannel['type']): VHFChannel[] {
  return Object.values(VHF_CHANNELS).filter(ch => ch.type === type);
}

/**
 * Find channel by frequency (with tolerance for rounding)
 */
export function findChannelByFrequency(frequency: number, tolerance: number = 0.001): VHFChannel | undefined {
  return Object.values(VHF_CHANNELS).find(
    ch => Math.abs(ch.frequency - frequency) < tolerance
  );
}

/**
 * Get priority channels for geographic location
 */
export function getPriorityChannelsForLocation(
  latitude: number,
  longitude: number
): number[] {
  // Simple geographic determination for Turkey
  // Turkey roughly: 36-42°N, 26-45°E

  if (latitude < 36 || latitude > 42 || longitude < 26 || longitude > 45) {
    // Outside Turkey
    return INTERNATIONAL_PRIORITY_CHANNELS;
  }

  // Istanbul region: 40.5-41.5°N, 28-30°E
  if (latitude >= 40.5 && latitude <= 41.5 && longitude >= 28 && longitude <= 30) {
    return GEOGRAPHIC_PROFILES.istanbul.priorityChannels;
  }

  // Aegean coast: 37-39°N, 26-28°E
  if (latitude >= 37 && latitude <= 39 && longitude >= 26 && longitude <= 28) {
    return GEOGRAPHIC_PROFILES.aegean.priorityChannels;
  }

  // Mediterranean coast: 36-37°N, 28-32°E
  if (latitude >= 36 && latitude <= 37 && longitude >= 28 && longitude <= 32) {
    return GEOGRAPHIC_PROFILES.mediterranean.priorityChannels;
  }

  // Default Turkey
  return TURKEY_PRIORITY_CHANNELS;
}

/**
 * Get geographic profile for location
 */
export function getGeographicProfile(
  latitude: number,
  longitude: number
): GeographicProfile {
  if (latitude < 36 || latitude > 42 || longitude < 26 || longitude > 45) {
    return GEOGRAPHIC_PROFILES.international;
  }

  if (latitude >= 40.5 && latitude <= 41.5 && longitude >= 28 && longitude <= 30) {
    return GEOGRAPHIC_PROFILES.istanbul;
  }

  if (latitude >= 37 && latitude <= 39 && longitude >= 26 && longitude <= 28) {
    return GEOGRAPHIC_PROFILES.aegean;
  }

  if (latitude >= 36 && latitude <= 37 && longitude >= 28 && longitude <= 32) {
    return GEOGRAPHIC_PROFILES.mediterranean;
  }

  // Default to Aegean profile (most common cruising area)
  return GEOGRAPHIC_PROFILES.aegean;
}

/**
 * Validate if channel is valid VHF marine channel
 */
export function isValidChannel(channelNumber: number): boolean {
  return channelNumber in VHF_CHANNELS;
}

/**
 * Get human-readable channel description
 */
export function getChannelDescription(channelNumber: number): string {
  const channel = VHF_CHANNELS[channelNumber];
  if (!channel) {
    return `Unknown channel ${channelNumber}`;
  }

  return `Ch ${channel.channel} (${channel.frequency} MHz) - ${channel.name}: ${channel.description}`;
}
