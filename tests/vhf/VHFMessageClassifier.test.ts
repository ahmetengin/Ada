/**
 * VHF Message Classifier - Unit Tests
 */

import { VHFMessageClassifier } from '../../nodes/ada.sea/services/VHFMessageClassifier';
import { VHFTransmission } from '../../core/types';

describe('VHFMessageClassifier', () => {
  let classifier: VHFMessageClassifier;

  beforeEach(() => {
    classifier = new VHFMessageClassifier();
  });

  describe('Emergency Detection', () => {
    test('should detect MAYDAY emergency', () => {
      const tx: VHFTransmission = {
        id: 'test-1',
        channel: 16,
        frequency: 156.800,
        timestamp: new Date(),
        duration: 10,
        signalStrength: -60,
        hasVoice: true,
        transcription: 'Mayday mayday mayday, this is sailing yacht Phisedelia, position 41 north 29 east, taking on water',
        classification: 'unknown',
      };

      const result = classifier.classify(tx);

      expect(result.type).toBe('emergency');
      expect(result.priority).toBe('urgent');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.keywords).toContain('mayday');
    });

    test('should detect PAN PAN urgency', () => {
      const tx: VHFTransmission = {
        id: 'test-2',
        channel: 16,
        frequency: 156.800,
        timestamp: new Date(),
        duration: 8,
        signalStrength: -65,
        hasVoice: true,
        transcription: 'Pan pan pan pan, medical emergency on board',
        classification: 'unknown',
      };

      const result = classifier.classify(tx);

      expect(result.type).toBe('emergency');
      expect(result.priority).toBe('urgent');
      expect(result.keywords).toContain('pan pan');
    });

    test('should detect SECURITE safety', () => {
      const tx: VHFTransmission = {
        id: 'test-3',
        channel: 16,
        frequency: 156.800,
        timestamp: new Date(),
        duration: 5,
        signalStrength: -70,
        hasVoice: true,
        transcription: 'Securite securite, navigation hazard in Istanbul strait',
        classification: 'unknown',
      };

      const result = classifier.classify(tx);

      expect(result.type).toBe('emergency');
      expect(result.keywords).toContain('securite');
    });

    test('should detect man overboard', () => {
      const tx: VHFTransmission = {
        id: 'test-4',
        channel: 16,
        frequency: 156.800,
        timestamp: new Date(),
        duration: 6,
        signalStrength: -60,
        hasVoice: true,
        transcription: 'Man overboard, man overboard, requesting assistance',
        classification: 'unknown',
      };

      const result = classifier.classify(tx);

      expect(result.type).toBe('emergency');
      expect(result.priority).toBe('urgent');
    });
  });

  describe('Marina Communication Detection', () => {
    test('should detect berth request', () => {
      const tx: VHFTransmission = {
        id: 'test-5',
        channel: 73,
        frequency: 156.675,
        timestamp: new Date(),
        duration: 5,
        signalStrength: -70,
        hasVoice: true,
        transcription: 'Ataköy Marina, this is Phisedelia, requesting berth for 15 meter sailing yacht',
        classification: 'unknown',
      };

      const result = classifier.classify(tx);

      expect(result.type).toBe('marina');
      expect(result.priority).toBe('normal');
      expect(result.keywords).toContain('berth');
    });

    test('should detect fuel request', () => {
      const tx: VHFTransmission = {
        id: 'test-6',
        channel: 73,
        frequency: 156.675,
        timestamp: new Date(),
        duration: 4,
        signalStrength: -65,
        hasVoice: true,
        transcription: 'Marina, requesting fuel and water service',
        classification: 'unknown',
      };

      const result = classifier.classify(tx);

      expect(result.type).toBe('marina');
      expect(result.keywords).toContain('fuel');
      expect(result.keywords).toContain('water');
    });

    test('should detect arrival notification', () => {
      const tx: VHFTransmission = {
        id: 'test-7',
        channel: 73,
        frequency: 156.675,
        timestamp: new Date(),
        duration: 3,
        signalStrength: -68,
        hasVoice: true,
        transcription: 'Arriving at marina, ETA 15 minutes',
        classification: 'unknown',
      };

      const result = classifier.classify(tx);

      expect(result.type).toBe('marina');
      expect(result.keywords).toContain('arriving');
    });
  });

  describe('Navigation Safety Detection', () => {
    test('should detect passing arrangement', () => {
      const tx: VHFTransmission = {
        id: 'test-8',
        channel: 13,
        frequency: 156.650,
        timestamp: new Date(),
        duration: 4,
        signalStrength: -65,
        hasVoice: true,
        transcription: 'Blue yacht approaching, passing port to port',
        classification: 'unknown',
      };

      const result = classifier.classify(tx);

      expect(result.type).toBe('safety');
      expect(result.priority).toBe('high');
      expect(result.keywords).toContain('passing');
    });

    test('should detect traffic situation', () => {
      const tx: VHFTransmission = {
        id: 'test-9',
        channel: 13,
        frequency: 156.650,
        timestamp: new Date(),
        duration: 5,
        signalStrength: -60,
        hasVoice: true,
        transcription: 'Heavy traffic in channel, crossing vessel ahead',
        classification: 'unknown',
      };

      const result = classifier.classify(tx);

      expect(result.type).toBe('safety');
      expect(result.keywords).toContain('traffic');
    });
  });

  describe('Intership Communication Detection', () => {
    test('should detect general intership communication', () => {
      const tx: VHFTransmission = {
        id: 'test-10',
        channel: 6,
        frequency: 156.300,
        timestamp: new Date(),
        duration: 3,
        signalStrength: -70,
        hasVoice: true,
        transcription: 'Phisedelia calling Blue Moon, what is your position?',
        classification: 'unknown',
      };

      const result = classifier.classify(tx);

      expect(result.type).toBe('intership');
      expect(result.priority).toBe('low');
    });
  });

  describe('Entity Extraction', () => {
    test('should extract vessel names', () => {
      const tx: VHFTransmission = {
        id: 'test-11',
        channel: 6,
        frequency: 156.300,
        timestamp: new Date(),
        duration: 4,
        signalStrength: -65,
        hasVoice: true,
        transcription: 'Vessel Phisedelia calling yacht Blue Moon and ship Sea Spirit',
        classification: 'intership',
      };

      const result = classifier.classify(tx);

      expect(result.entities.vesselNames).toBeDefined();
      expect(result.entities.vesselNames).toContain('Phisedelia');
      expect(result.entities.vesselNames).toContain('Blue Moon');
      expect(result.entities.vesselNames).toContain('Sea Spirit');
    });

    test('should extract channel references', () => {
      const tx: VHFTransmission = {
        id: 'test-12',
        channel: 16,
        frequency: 156.800,
        timestamp: new Date(),
        duration: 3,
        signalStrength: -60,
        hasVoice: true,
        transcription: 'Switch to channel 73 for further communication',
        classification: 'intership',
      };

      const result = classifier.classify(tx);

      expect(result.entities.channels).toBeDefined();
      expect(result.entities.channels).toContain(73);
    });

    test('should extract location names', () => {
      const tx: VHFTransmission = {
        id: 'test-13',
        channel: 73,
        frequency: 156.675,
        timestamp: new Date(),
        duration: 4,
        signalStrength: -68,
        hasVoice: true,
        transcription: 'Approaching Ataköy Marina from Kalamış Bay',
        classification: 'marina',
      };

      const result = classifier.classify(tx);

      expect(result.entities.locations).toBeDefined();
      expect(result.entities.locations?.length).toBeGreaterThan(0);
    });
  });

  describe('Channel-Based Classification', () => {
    test('should classify Ch 16 as emergency', () => {
      const tx: VHFTransmission = {
        id: 'test-14',
        channel: 16,
        frequency: 156.800,
        timestamp: new Date(),
        duration: 2,
        signalStrength: -65,
        hasVoice: true,
        transcription: 'Hello hello',
        classification: 'unknown',
      };

      const result = classifier.classify(tx);

      expect(result.type).toBe('emergency');
    });

    test('should classify Ch 73 as marina', () => {
      const tx: VHFTransmission = {
        id: 'test-15',
        channel: 73,
        frequency: 156.675,
        timestamp: new Date(),
        duration: 2,
        signalStrength: -70,
        hasVoice: true,
        transcription: 'Hello',
        classification: 'unknown',
      };

      const result = classifier.classify(tx);

      expect(result.type).toBe('marina');
    });

    test('should classify Ch 67 as coast_guard', () => {
      const tx: VHFTransmission = {
        id: 'test-16',
        channel: 67,
        frequency: 156.375,
        timestamp: new Date(),
        duration: 3,
        signalStrength: -60,
        hasVoice: true,
        transcription: 'This is Turkish Coast Guard',
        classification: 'unknown',
      };

      const result = classifier.classify(tx);

      expect(result.type).toBe('coast_guard');
      expect(result.priority).toBe('high');
    });
  });

  describe('Priority Assignment', () => {
    test('should assign urgent priority to emergency', () => {
      const tx: VHFTransmission = {
        id: 'test-17',
        channel: 16,
        frequency: 156.800,
        timestamp: new Date(),
        duration: 10,
        signalStrength: -60,
        hasVoice: true,
        transcription: 'Mayday',
        classification: 'emergency',
      };

      const result = classifier.classify(tx);

      expect(result.priority).toBe('urgent');
    });

    test('should assign high priority to safety', () => {
      const tx: VHFTransmission = {
        id: 'test-18',
        channel: 13,
        frequency: 156.650,
        timestamp: new Date(),
        duration: 4,
        signalStrength: -65,
        hasVoice: true,
        transcription: 'Collision course',
        classification: 'safety',
      };

      const result = classifier.classify(tx);

      expect(result.priority).toBe('high');
    });

    test('should assign normal priority to marina', () => {
      const tx: VHFTransmission = {
        id: 'test-19',
        channel: 73,
        frequency: 156.675,
        timestamp: new Date(),
        duration: 3,
        signalStrength: -70,
        hasVoice: true,
        transcription: 'Berth request',
        classification: 'marina',
      };

      const result = classifier.classify(tx);

      expect(result.priority).toBe('normal');
    });

    test('should assign low priority to general intership', () => {
      const tx: VHFTransmission = {
        id: 'test-20',
        channel: 6,
        frequency: 156.300,
        timestamp: new Date(),
        duration: 2,
        signalStrength: -75,
        hasVoice: true,
        transcription: 'Hello',
        classification: 'intership',
      };

      const result = classifier.classify(tx);

      expect(result.priority).toBe('low');
    });
  });

  describe('Batch Classification', () => {
    test('should classify multiple transmissions', () => {
      const transmissions: VHFTransmission[] = [
        {
          id: 'batch-1',
          channel: 16,
          frequency: 156.800,
          timestamp: new Date(),
          duration: 5,
          signalStrength: -60,
          hasVoice: true,
          transcription: 'Mayday',
          classification: 'unknown',
        },
        {
          id: 'batch-2',
          channel: 73,
          frequency: 156.675,
          timestamp: new Date(),
          duration: 3,
          signalStrength: -70,
          hasVoice: true,
          transcription: 'Berth request',
          classification: 'unknown',
        },
      ];

      const results = classifier.classifyBatch(transmissions);

      expect(results.size).toBe(2);
      expect(results.get('batch-1')?.type).toBe('emergency');
      expect(results.get('batch-2')?.type).toBe('marina');
    });
  });

  describe('Classification Statistics', () => {
    test('should generate stats for transmissions', () => {
      const transmissions: VHFTransmission[] = [
        {
          id: 'stats-1',
          channel: 16,
          frequency: 156.800,
          timestamp: new Date(),
          duration: 5,
          signalStrength: -60,
          hasVoice: true,
          transcription: 'Mayday',
          classification: 'emergency',
        },
        {
          id: 'stats-2',
          channel: 16,
          frequency: 156.800,
          timestamp: new Date(),
          duration: 6,
          signalStrength: -62,
          hasVoice: true,
          transcription: 'Pan pan',
          classification: 'emergency',
        },
        {
          id: 'stats-3',
          channel: 73,
          frequency: 156.675,
          timestamp: new Date(),
          duration: 3,
          signalStrength: -70,
          hasVoice: true,
          transcription: 'Berth request',
          classification: 'marina',
        },
      ];

      const stats = classifier.getClassificationStats(transmissions);

      expect(stats.emergency).toBe(2);
      expect(stats.marina).toBe(1);
    });
  });

  describe('Filtering', () => {
    test('should filter transmissions by type', () => {
      const transmissions: VHFTransmission[] = [
        {
          id: 'filter-1',
          channel: 16,
          frequency: 156.800,
          timestamp: new Date(),
          duration: 5,
          signalStrength: -60,
          hasVoice: true,
          transcription: 'Mayday',
          classification: 'emergency',
        },
        {
          id: 'filter-2',
          channel: 73,
          frequency: 156.675,
          timestamp: new Date(),
          duration: 3,
          signalStrength: -70,
          hasVoice: true,
          transcription: 'Berth request',
          classification: 'marina',
        },
        {
          id: 'filter-3',
          channel: 6,
          frequency: 156.300,
          timestamp: new Date(),
          duration: 2,
          signalStrength: -75,
          hasVoice: true,
          transcription: 'Hello',
          classification: 'intership',
        },
      ];

      const emergencies = classifier.filterByType(transmissions, 'emergency');

      expect(emergencies.length).toBe(1);
      expect(emergencies[0].id).toBe('filter-1');
    });

    test('should get high-priority transmissions', () => {
      const transmissions: VHFTransmission[] = [
        {
          id: 'priority-1',
          channel: 16,
          frequency: 156.800,
          timestamp: new Date(),
          duration: 5,
          signalStrength: -60,
          hasVoice: true,
          transcription: 'Mayday',
          classification: 'emergency',
        },
        {
          id: 'priority-2',
          channel: 13,
          frequency: 156.650,
          timestamp: new Date(),
          duration: 4,
          signalStrength: -65,
          hasVoice: true,
          transcription: 'Traffic',
          classification: 'safety',
        },
        {
          id: 'priority-3',
          channel: 6,
          frequency: 156.300,
          timestamp: new Date(),
          duration: 2,
          signalStrength: -75,
          hasVoice: true,
          transcription: 'Hello',
          classification: 'intership',
        },
      ];

      const highPriority = classifier.getHighPriorityTransmissions(transmissions);

      expect(highPriority.length).toBe(2); // Emergency + Safety
      expect(highPriority.some(tx => tx.id === 'priority-1')).toBe(true);
      expect(highPriority.some(tx => tx.id === 'priority-2')).toBe(true);
    });
  });
});
