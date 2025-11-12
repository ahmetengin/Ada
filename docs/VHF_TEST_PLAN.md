# VHF Radio System - Test Plan

> **Comprehensive testing strategy for VHF radio monitoring system**
> Test Plan Version: 1.0
> Date: 2025-11-12

---

## 1. Testing Overview

### Test Objectives

1. Verify VHF scanner functionality with real RTL-SDR hardware
2. Validate Voice Activity Detection (VAD) accuracy
3. Confirm Speech-to-Text (STT) transcription quality
4. Test emergency detection and alerting
5. Verify geographic channel auto-tuning
6. Validate race mode start sequence detection
7. Confirm system performance under load
8. Test failover and error recovery

### Test Environment

#### Hardware Requirements
- RTL-SDR dongle (RTL-SDR Blog V3 recommended)
- VHF marine antenna (156-162 MHz)
- Test computer (Raspberry Pi 4 4GB or x86 Linux)
- Marine VHF handheld radio (for transmitting test signals)
- GPS receiver (for location-based testing)

#### Software Requirements
- RTL-SDR drivers installed
- Python 3.9+ with dependencies
- Node.js 18+ / TypeScript
- Test audio files (emergency, marina, intership samples)
- Network simulator (for API testing)

---

## 2. Unit Tests

### 2.1 VHF Channel Definitions (`VHFChannelDefinitions.ts`)

**Test Cases**:

```typescript
// Test: Get channel by number
test('should return correct channel for Ch 16', () => {
  const ch16 = getChannel(16);
  expect(ch16?.frequency).toBe(156.800);
  expect(ch16?.type).toBe('emergency');
});

// Test: Find channel by frequency
test('should find channel by frequency', () => {
  const ch = findChannelByFrequency(156.675);
  expect(ch?.channel).toBe(73);
  expect(ch?.type).toBe('marina');
});

// Test: Get priority channels for Istanbul
test('should return Istanbul priority channels', () => {
  const channels = getPriorityChannelsForLocation(41.0, 29.0);
  expect(channels).toContain(16);
  expect(channels).toContain(72);
  expect(channels).toContain(73);
});

// Test: Get priority channels for Aegean
test('should return Aegean priority channels', () => {
  const channels = getPriorityChannelsForLocation(38.0, 27.0);
  expect(channels).toContain(16);
  expect(channels).toContain(73);
  expect(channels).toContain(6);
});

// Test: Geographic profile detection
test('should detect Istanbul profile', () => {
  const profile = getGeographicProfile(41.0, 29.0);
  expect(profile.region).toContain('Istanbul');
  expect(profile.marinaChannels).toContain(72);
});
```

**Expected Results**: All channel lookups return correct data, geographic detection works for all Turkey regions.

---

### 2.2 VHF Message Classifier (`VHFMessageClassifier.ts`)

**Test Cases**:

```typescript
// Test: Emergency keyword detection
test('should detect MAYDAY emergency', () => {
  const tx: VHFTransmission = {
    id: 'test-1',
    channel: 16,
    frequency: 156.800,
    timestamp: new Date(),
    duration: 10,
    signalStrength: -60,
    hasVoice: true,
    transcription: 'Mayday mayday mayday, this is sailing yacht Phisedelia',
    classification: 'unknown',
  };

  const result = classifier.classify(tx);
  expect(result.type).toBe('emergency');
  expect(result.priority).toBe('urgent');
  expect(result.keywords).toContain('mayday');
});

// Test: Marina communication detection
test('should detect marina berth request', () => {
  const tx: VHFTransmission = {
    id: 'test-2',
    channel: 73,
    frequency: 156.675,
    timestamp: new Date(),
    duration: 5,
    signalStrength: -70,
    hasVoice: true,
    transcription: 'Ataköy Marina, requesting berth for 15 meter sailing yacht',
    classification: 'unknown',
  };

  const result = classifier.classify(tx);
  expect(result.type).toBe('marina');
  expect(result.keywords).toContain('berth');
});

// Test: Entity extraction
test('should extract vessel names', () => {
  const tx: VHFTransmission = {
    id: 'test-3',
    channel: 6,
    frequency: 156.300,
    timestamp: new Date(),
    duration: 3,
    signalStrength: -65,
    hasVoice: true,
    transcription: 'Vessel Phisedelia calling yacht Blue Moon',
    classification: 'intership',
  };

  const result = classifier.classify(tx);
  expect(result.entities.vesselNames).toContain('Phisedelia');
  expect(result.entities.vesselNames).toContain('Blue Moon');
});
```

**Expected Results**: All patterns detected correctly, entities extracted accurately.

---

### 2.3 VHF Race Mode (`VHFRaceMode.ts`)

**Test Cases**:

```typescript
// Test: Start sequence - Warning signal
test('should detect 5 minute warning signal', () => {
  const raceMode = new VHFRaceMode({
    raceName: 'Test Race',
    raceChannels: [6, 73],
    committeeChannel: 73,
    fleetChannel: 6,
  });

  raceMode.activate();

  const tx: VHFTransmission = {
    id: 'test-race-1',
    channel: 73,
    frequency: 156.675,
    timestamp: new Date(),
    duration: 4,
    signalStrength: -60,
    hasVoice: true,
    transcription: 'Cruiser class, warning signal, 5 minutes to start',
    classification: 'marina',
  };

  let eventDetected = false;
  raceMode.on('race:warning_signal', () => {
    eventDetected = true;
  });

  raceMode.processTransmission(tx);

  expect(eventDetected).toBe(true);
  const sequences = raceMode.getStartSequences();
  expect(sequences.get('cruiser')).toBeDefined();
});

// Test: Complete start sequence
test('should track complete start sequence', () => {
  const raceMode = new VHFRaceMode({
    raceName: 'Test Race',
    raceChannels: [6, 73],
    committeeChannel: 73,
    fleetChannel: 6,
  });

  raceMode.activate();

  const transmissions = [
    'Warning signal, 5 minutes',
    'Preparatory signal, 4 minutes',
    'One minute to start',
    'Start, go go go',
  ];

  let startDetected = false;
  raceMode.on('race:start', () => {
    startDetected = true;
  });

  transmissions.forEach((text, index) => {
    const tx: VHFTransmission = {
      id: `test-seq-${index}`,
      channel: 73,
      frequency: 156.675,
      timestamp: new Date(),
      duration: 3,
      signalStrength: -60,
      hasVoice: true,
      transcription: text,
      classification: 'marina',
    };

    raceMode.processTransmission(tx);
  });

  expect(startDetected).toBe(true);
  const sequences = raceMode.getStartSequences();
  const sequence = sequences.get('default');
  expect(sequence?.isComplete).toBe(true);
  expect(sequence?.signals.length).toBe(4);
});

// Test: General recall detection
test('should detect general recall', () => {
  const raceMode = new VHFRaceMode({
    raceName: 'Test Race',
    raceChannels: [6, 73],
    committeeChannel: 73,
    fleetChannel: 6,
  });

  raceMode.activate();

  let recallDetected = false;
  raceMode.on('race:general_recall', () => {
    recallDetected = true;
  });

  const tx: VHFTransmission = {
    id: 'test-recall',
    channel: 73,
    frequency: 156.675,
    timestamp: new Date(),
    duration: 2,
    signalStrength: -60,
    hasVoice: true,
    transcription: 'General recall, all boats return',
    classification: 'marina',
  };

  raceMode.processTransmission(tx);

  expect(recallDetected).toBe(true);
  const events = raceMode.getRaceEvents();
  expect(events.some(e => e.type === 'general_recall')).toBe(true);
});
```

**Expected Results**: All race events detected accurately, start sequences tracked correctly.

---

## 3. Integration Tests

### 3.1 VHF Scanner + Python Audio Backend

**Test Setup**:
1. Start Python FastAPI server (`uvicorn ada.api.vhf_audio:app`)
2. Initialize VHFRadioService
3. Feed test audio files

**Test Cases**:

```typescript
// Test: VAD API endpoint
test('should detect voice in audio file', async () => {
  const formData = new FormData();
  formData.append('audio', fs.createReadStream('test-audio/voice.wav'));
  formData.append('sample_rate', '16000');

  const response = await fetch('http://localhost:8000/api/vhf-audio/vad', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  expect(result.has_voice).toBe(true);
  expect(result.confidence).toBeGreaterThan(0.5);
});

// Test: STT API endpoint
test('should transcribe emergency call', async () => {
  const formData = new FormData();
  formData.append('audio', fs.createReadStream('test-audio/mayday.wav'));
  formData.append('language', 'en');

  const response = await fetch('http://localhost:8000/api/vhf-audio/transcribe', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  expect(result.text.toLowerCase()).toContain('mayday');
  expect(result.confidence).toBeGreaterThan(0.7);
});

// Test: Full pipeline
test('should process audio through full pipeline', async () => {
  const formData = new FormData();
  formData.append('audio', fs.createReadStream('test-audio/marina-call.wav'));
  formData.append('sample_rate', '16000');
  formData.append('language', 'en');
  formData.append('enable_vad', 'true');
  formData.append('enable_transcription', 'true');

  const response = await fetch('http://localhost:8000/api/vhf-audio/process', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  expect(result.vad.has_voice).toBe(true);
  expect(result.transcription.text).toBeTruthy();
});
```

**Expected Results**: All API endpoints respond correctly, VAD/STT pipeline works end-to-end.

---

### 3.2 SeaNode VHF Integration

**Test Cases**:

```typescript
// Test: Start/stop scanner
test('should start and stop VHF scanner', async () => {
  const seaNode = new SeaNode({
    name: 'Test Vessel',
    vessel: {
      name: 'Test Yacht',
      length: 15,
      beam: 4,
      draft: 2,
      type: 'sailing',
    },
  });

  await seaNode.initialize();

  // Start scanner
  const startResult = await seaNode.processTask({
    type: 'vhf-radio',
    data: { action: 'start-scanner' },
  });

  expect(startResult.success).toBe(true);

  // Get state
  const state = await seaNode.processTask({
    type: 'vhf-radio',
    data: { action: 'get-state' },
  });

  expect(state.isScanning).toBe(true);

  // Stop scanner
  const stopResult = await seaNode.processTask({
    type: 'vhf-radio',
    data: { action: 'stop-scanner' },
  });

  expect(stopResult.success).toBe(true);
});

// Test: Emergency alert propagation
test('should emit emergency alert', (done) => {
  const seaNode = new SeaNode({/* config */});

  seaNode.on('alert', (alert) => {
    if (alert.source === 'vhf-radio' && alert.severity === 'critical') {
      expect(alert.message).toContain('Emergency');
      done();
    }
  });

  // Simulate emergency transmission
  const tx: VHFTransmission = {
    id: 'test-emergency',
    channel: 16,
    frequency: 156.800,
    timestamp: new Date(),
    duration: 10,
    signalStrength: -50,
    hasVoice: true,
    transcription: 'Mayday mayday, vessel sinking',
    classification: 'emergency',
  };

  seaNode['vhfRadioService'].emit('alert:emergency', {
    id: 'alert-1',
    severity: 'emergency',
    channel: 16,
    message: 'Emergency transmission detected',
    timestamp: new Date(),
    requiresAction: true,
    transmission: tx,
  });
});

// Test: Race mode activation
test('should activate race mode and detect start', async () => {
  const seaNode = new SeaNode({/* config */});
  await seaNode.initialize();

  // Activate race mode
  const result = await seaNode.processTask({
    type: 'vhf-radio',
    data: {
      action: 'activate-race-mode',
      raceName: 'Test Race',
      committeeChannel: 73,
      fleetChannel: 6,
    },
  });

  expect(result.success).toBe(true);
  expect(result.channels).toContain(16);
  expect(result.channels).toContain(73);
  expect(result.channels).toContain(6);

  // Listen for start signal
  let startEmitted = false;
  seaNode.on('race:start', () => {
    startEmitted = true;
  });

  // Simulate start transmission
  const tx: VHFTransmission = {
    id: 'test-start',
    channel: 73,
    frequency: 156.675,
    timestamp: new Date(),
    duration: 2,
    signalStrength: -60,
    hasVoice: true,
    transcription: 'Start, go go go',
    classification: 'marina',
  };

  seaNode['vhfRadioService'].emit('transmission:detected', tx);

  expect(startEmitted).toBe(true);
});
```

**Expected Results**: All SeaNode integrations work, events emit correctly, race mode activates.

---

## 4. Hardware Tests (Real-World)

### 4.1 RTL-SDR Reception Test

**Procedure**:
1. Connect RTL-SDR to computer
2. Connect VHF antenna
3. Run `rtl_test` to verify dongle
4. Run `rtl_fm -f 156.8M -M fm -s 12k -g 40 -` to listen to Ch 16
5. Transmit test message on handheld VHF
6. Verify audio received

**Expected Results**: Clear audio reception on all test channels (6, 16, 72, 73).

---

### 4.2 VAD Accuracy Test

**Procedure**:
1. Record 50 VHF transmissions (25 with voice, 25 noise/carrier only)
2. Process each through VAD
3. Calculate accuracy: (TP + TN) / Total

**Test Data**:
- Voice samples: Marina calls, emergency, intership
- Non-voice: Carrier wave, static, background noise

**Acceptance Criteria**: VAD accuracy > 90%

---

### 4.3 STT Transcription Quality Test

**Procedure**:
1. Record 30 VHF transmissions with known content
2. Transcribe using Whisper
3. Calculate Word Error Rate (WER)

**Test Categories**:
- Emergency calls (MAYDAY, PAN PAN)
- Marina communications (berth requests)
- Navigation (passing arrangements)
- Turkish language samples

**Acceptance Criteria**:
- English WER < 10%
- Turkish WER < 15%
- Emergency keywords always detected

---

### 4.4 Geographic Auto-Tuning Test

**Procedure**:
1. Set vessel location to Istanbul (41.0°N, 29.0°E)
2. Verify channels: [16, 72, 73, 6, 13]
3. Set vessel location to Aegean (38.0°N, 27.0°E)
4. Verify channels: [16, 73, 6, 13]
5. Set vessel location to international (45.0°N, 10.0°E)
6. Verify channels: [16, 13, 6, 9]

**Expected Results**: Channels auto-tune correctly for each region.

---

### 4.5 Race Mode Field Test

**Procedure**:
1. Attend actual sailing regatta
2. Activate race mode before first start
3. Monitor race committee on Ch 73
4. Verify detection of:
   - Warning signal (5 min)
   - Preparatory signal (4 min)
   - One minute signal
   - Start signal
   - Any recalls or postponements

**Expected Results**: All start sequence signals detected, no false positives.

---

## 5. Performance Tests

### 5.1 Scanner Throughput

**Test**: Measure channel scan rate
- Target: 5 channels/second (200ms per channel)
- Measure actual rate over 10 minutes

**Acceptance Criteria**: Scan rate ≥ 4.5 channels/sec (≤ 222ms per channel)

---

### 5.2 STT Latency

**Test**: Measure time from audio end to transcription
- Process 100 audio samples
- Measure p50, p95, p99 latency

**Acceptance Criteria**:
- p50 < 2 seconds
- p95 < 5 seconds
- p99 < 10 seconds

---

### 5.3 Memory Usage

**Test**: Monitor memory consumption over 24 hours
- Start scanner
- Collect transmissions
- Monitor RSS memory

**Acceptance Criteria**:
- Memory < 500 MB steady state
- No memory leaks (stable over 24h)

---

### 5.4 CPU Usage

**Test**: Measure CPU usage during operation
- Baseline (scanner only): < 10% CPU
- With VAD: < 20% CPU
- With STT: < 40% CPU (spikes OK)

**Acceptance Criteria**: Average CPU < 25% on Raspberry Pi 4

---

## 6. Failure Mode Tests

### 6.1 SDR Disconnection

**Test**: Unplug RTL-SDR during operation
**Expected**: Scanner detects error, emits event, attempts reconnect

---

### 6.2 API Backend Unavailable

**Test**: Stop Python API server
**Expected**: Transcription fails gracefully, VAD simulated, scanner continues

---

### 6.3 Low Signal Quality

**Test**: Reduce antenna gain, introduce noise
**Expected**: Scanner continues, low-quality transmissions marked, no crashes

---

### 6.4 Buffer Overflow

**Test**: Generate continuous transmissions for 1 hour
**Expected**: Old transmissions purged, memory stable, no data loss for recent TX

---

## 7. Security & Safety Tests

### 7.1 Emergency Priority

**Test**: Simultaneous Ch 16 and Ch 73 transmissions
**Expected**: Ch 16 (emergency) prioritized, alert generated immediately

---

### 7.2 False Emergency Detection

**Test**: Feed 100 non-emergency transmissions
**Expected**: Zero false emergency alerts

---

### 7.3 Transmission Privacy

**Test**: Verify transcriptions not logged to public APIs
**Expected**: All processing local, no external API calls for STT

---

## 8. Test Execution Schedule

### Phase 1: Unit Tests (Week 1)
- Day 1-2: Channel definitions
- Day 3-4: Message classifier
- Day 5-7: Race mode

### Phase 2: Integration Tests (Week 2)
- Day 1-3: API backend integration
- Day 4-7: SeaNode integration

### Phase 3: Hardware Tests (Week 3)
- Day 1-2: RTL-SDR setup and reception
- Day 3-4: VAD/STT accuracy
- Day 5: Geographic auto-tuning
- Day 6-7: Race mode field test

### Phase 4: Performance & Stability (Week 4)
- Day 1-2: Performance benchmarks
- Day 3-4: 24-hour stability test
- Day 5-7: Failure mode testing

---

## 9. Test Data & Artifacts

### Test Audio Files
Location: `/tests/vhf-audio-samples/`

- `emergency/mayday-01.wav` - English MAYDAY call
- `emergency/pan-pan-01.wav` - PAN PAN urgency
- `marina/ataköy-berth-request.wav` - Marina call
- `marina/fuel-request.wav` - Service request
- `intership/passing-arrangement.wav` - Navigation
- `race/warning-signal.wav` - 5 minute warning
- `race/start-signal.wav` - GO signal
- `race/general-recall.wav` - Recall announcement
- `noise/carrier-only.wav` - No voice
- `noise/static-interference.wav` - Noise

### Test Scripts
Location: `/tests/vhf/`

- `test-channel-definitions.ts` - Unit tests
- `test-message-classifier.ts` - Classification tests
- `test-race-mode.ts` - Race mode tests
- `test-integration.ts` - Integration tests
- `test-performance.sh` - Performance benchmarks
- `test-field.ts` - Field test harness

---

## 10. Pass/Fail Criteria

### Critical (Must Pass)
- ✅ Ch 16 emergency detection: 100% accuracy
- ✅ VAD accuracy: > 90%
- ✅ STT English WER: < 10%
- ✅ Geographic auto-tuning: 100% correct
- ✅ Race start detection: 100% (no missed starts)
- ✅ No crashes during 24h test

### Important (Should Pass)
- ✅ Scan rate: ≥ 4.5 channels/sec
- ✅ STT latency p95: < 5 seconds
- ✅ Memory usage: < 500 MB steady state
- ✅ CPU usage: < 25% average

### Nice to Have
- ⚠️ STT Turkish WER: < 15%
- ⚠️ Entity extraction: > 80% accuracy
- ⚠️ Mark rounding detection: > 70% accuracy

---

## 11. Known Limitations

1. **Whisper STT**: Requires significant CPU, may need GPU for real-time
2. **RTL-SDR**: Single channel at a time, sequential scanning only
3. **VAD**: May miss very quiet transmissions (< -90 dBm)
4. **Race Mode**: Pattern matching only, no semantic understanding
5. **Language Support**: Best performance on English, acceptable on Turkish

---

## 12. Future Test Improvements

1. **Automated Test Fleet**: Deploy multiple SDRs for simultaneous channel monitoring
2. **Synthetic Voice Generation**: Create unlimited test audio with TTS
3. **Continuous Integration**: Run unit tests on every commit
4. **Field Test Dashboard**: Real-time test results during regattas
5. **Machine Learning**: Train custom VAD/STT models on marine VHF audio

---

**Test Plan Approval**:
- [ ] Technical Lead: _____________
- [ ] QA Lead: _____________
- [ ] Product Owner: _____________

**Last Updated**: 2025-11-12
**Version**: 1.0
