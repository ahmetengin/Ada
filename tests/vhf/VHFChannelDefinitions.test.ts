/**
 * VHF Channel Definitions - Unit Tests
 */

import {
  VHF_CHANNELS,
  TURKEY_PRIORITY_CHANNELS,
  INTERNATIONAL_PRIORITY_CHANNELS,
  GEOGRAPHIC_PROFILES,
  getChannel,
  getChannelsByType,
  findChannelByFrequency,
  getPriorityChannelsForLocation,
  getGeographicProfile,
  isValidChannel,
  getChannelDescription,
} from '../../nodes/ada.sea/services/VHFChannelDefinitions';

describe('VHFChannelDefinitions', () => {
  describe('Channel Database', () => {
    test('should have Ch 16 emergency channel', () => {
      const ch16 = VHF_CHANNELS[16];
      expect(ch16).toBeDefined();
      expect(ch16.frequency).toBe(156.800);
      expect(ch16.type).toBe('emergency');
      expect(ch16.simplex).toBe(true);
    });

    test('should have Ch 73 marina channel', () => {
      const ch73 = VHF_CHANNELS[73];
      expect(ch73).toBeDefined();
      expect(ch73.frequency).toBe(156.675);
      expect(ch73.type).toBe('marina');
    });

    test('should have Ch 6 intership channel', () => {
      const ch6 = VHF_CHANNELS[6];
      expect(ch6).toBeDefined();
      expect(ch6.frequency).toBe(156.300);
      expect(ch6.type).toBe('intership');
    });

    test('should have Ch 70 DSC channel', () => {
      const ch70 = VHF_CHANNELS[70];
      expect(ch70).toBeDefined();
      expect(ch70.frequency).toBe(156.525);
      expect(ch70.type).toBe('dsc');
    });
  });

  describe('getChannel()', () => {
    test('should return channel by number', () => {
      const ch16 = getChannel(16);
      expect(ch16?.channel).toBe(16);
      expect(ch16?.frequency).toBe(156.800);
    });

    test('should return undefined for invalid channel', () => {
      const ch99 = getChannel(99);
      expect(ch99).toBeUndefined();
    });
  });

  describe('getChannelsByType()', () => {
    test('should return all intership channels', () => {
      const intershipChannels = getChannelsByType('intership');
      expect(intershipChannels.length).toBeGreaterThan(0);
      expect(intershipChannels.every(ch => ch.type === 'intership')).toBe(true);
      expect(intershipChannels.some(ch => ch.channel === 6)).toBe(true);
    });

    test('should return all emergency channels', () => {
      const emergencyChannels = getChannelsByType('emergency');
      expect(emergencyChannels.length).toBeGreaterThan(0);
      expect(emergencyChannels.some(ch => ch.channel === 16)).toBe(true);
    });

    test('should return all marina channels', () => {
      const marinaChannels = getChannelsByType('marina');
      expect(marinaChannels.length).toBeGreaterThan(0);
      expect(marinaChannels.some(ch => ch.channel === 73)).toBe(true);
    });
  });

  describe('findChannelByFrequency()', () => {
    test('should find Ch 16 by frequency', () => {
      const ch = findChannelByFrequency(156.800);
      expect(ch?.channel).toBe(16);
    });

    test('should find Ch 73 by frequency', () => {
      const ch = findChannelByFrequency(156.675);
      expect(ch?.channel).toBe(73);
    });

    test('should handle tolerance', () => {
      const ch = findChannelByFrequency(156.6751, 0.001);
      expect(ch?.channel).toBe(73);
    });

    test('should return undefined for invalid frequency', () => {
      const ch = findChannelByFrequency(999.999);
      expect(ch).toBeUndefined();
    });
  });

  describe('getPriorityChannelsForLocation()', () => {
    test('should return Istanbul channels for Bosphorus', () => {
      // Istanbul: 40.5-41.5°N, 28-30°E
      const channels = getPriorityChannelsForLocation(41.0, 29.0);
      expect(channels).toContain(16); // Emergency always
      expect(channels).toContain(72); // Istanbul marina
      expect(channels).toContain(73); // Istanbul marina
      expect(channels).toContain(6);  // Intership
      expect(channels).toContain(13); // Safety
    });

    test('should return Aegean channels for Çeşme', () => {
      // Aegean: 37-39°N, 26-28°E
      const channels = getPriorityChannelsForLocation(38.0, 27.0);
      expect(channels).toContain(16); // Emergency
      expect(channels).toContain(73); // Marina
      expect(channels).toContain(6);  // Intership
      expect(channels).toContain(13); // Safety
    });

    test('should return Mediterranean channels for Antalya', () => {
      // Mediterranean: 36-37°N, 28-32°E
      const channels = getPriorityChannelsForLocation(36.5, 30.0);
      expect(channels).toContain(16); // Emergency
      expect(channels).toContain(73); // Marina
      expect(channels).toContain(6);  // Intership
    });

    test('should return international channels for outside Turkey', () => {
      // Greece
      const channels = getPriorityChannelsForLocation(38.0, 23.0);
      expect(channels).toEqual(INTERNATIONAL_PRIORITY_CHANNELS);
    });
  });

  describe('getGeographicProfile()', () => {
    test('should return Istanbul profile', () => {
      const profile = getGeographicProfile(41.0, 29.0);
      expect(profile.region).toContain('Istanbul');
      expect(profile.marinaChannels).toContain(72);
      expect(profile.marinaChannels).toContain(73);
    });

    test('should return Aegean profile', () => {
      const profile = getGeographicProfile(38.0, 27.0);
      expect(profile.region).toContain('Aegean');
      expect(profile.marinaChannels).toContain(73);
    });

    test('should return Mediterranean profile', () => {
      const profile = getGeographicProfile(36.5, 30.0);
      expect(profile.region).toContain('Mediterranean');
      expect(profile.marinaChannels).toContain(73);
    });

    test('should return international profile for outside Turkey', () => {
      const profile = getGeographicProfile(45.0, 10.0);
      expect(profile.region).toContain('International');
    });
  });

  describe('isValidChannel()', () => {
    test('should validate standard channels', () => {
      expect(isValidChannel(16)).toBe(true);
      expect(isValidChannel(73)).toBe(true);
      expect(isValidChannel(6)).toBe(true);
    });

    test('should reject invalid channels', () => {
      expect(isValidChannel(99)).toBe(false);
      expect(isValidChannel(0)).toBe(false);
      expect(isValidChannel(-1)).toBe(false);
    });
  });

  describe('getChannelDescription()', () => {
    test('should return full channel description', () => {
      const desc = getChannelDescription(16);
      expect(desc).toContain('Ch 16');
      expect(desc).toContain('156.8');
      expect(desc).toContain('DISTRESS');
    });

    test('should return unknown for invalid channel', () => {
      const desc = getChannelDescription(99);
      expect(desc).toContain('Unknown');
    });
  });

  describe('Priority Channel Constants', () => {
    test('Turkey priority channels should include emergency', () => {
      expect(TURKEY_PRIORITY_CHANNELS).toContain(16);
    });

    test('Turkey priority channels should include marina standards', () => {
      expect(TURKEY_PRIORITY_CHANNELS).toContain(73);
      expect(TURKEY_PRIORITY_CHANNELS).toContain(72);
    });

    test('International priority channels should include emergency', () => {
      expect(INTERNATIONAL_PRIORITY_CHANNELS).toContain(16);
    });
  });

  describe('Geographic Profiles', () => {
    test('should have Istanbul profile', () => {
      expect(GEOGRAPHIC_PROFILES.istanbul).toBeDefined();
      expect(GEOGRAPHIC_PROFILES.istanbul.marinaChannels).toContain(72);
      expect(GEOGRAPHIC_PROFILES.istanbul.marinaChannels).toContain(73);
    });

    test('should have Aegean profile', () => {
      expect(GEOGRAPHIC_PROFILES.aegean).toBeDefined();
      expect(GEOGRAPHIC_PROFILES.aegean.marinaChannels).toContain(73);
    });

    test('should have Mediterranean profile', () => {
      expect(GEOGRAPHIC_PROFILES.mediterranean).toBeDefined();
      expect(GEOGRAPHIC_PROFILES.mediterranean.marinaChannels).toContain(73);
    });

    test('should have international profile', () => {
      expect(GEOGRAPHIC_PROFILES.international).toBeDefined();
    });
  });
});
