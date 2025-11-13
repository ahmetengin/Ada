/**
 * VHFRadioService - SDR-based VHF marine radio scanner and monitor
 *
 * Features:
 * - Real-time VHF channel scanning via RTL-SDR
 * - Voice Activity Detection (VAD)
 * - Speech-to-Text (STT) transcription
 * - Geographic-aware channel prioritization
 * - Emergency channel monitoring (Ch 16 - MAYDAY/PAN-PAN)
 * - Operations channel monitoring (Ch 72 - Marina/Port Operations)
 * - Channel classification
 * - Multi-language support (TR/EN/GR) for Channel 72
 *
 * Hardware requirements:
 * - RTL-SDR dongle (R820T/R820T2 tuner recommended)
 * - VHF antenna (marine band 156-162 MHz)
 *
 * Software dependencies:
 * - rtl_fm or rtl_sdr for SDR control
 * - sox for audio processing
 * - Python VAD/STT backend
 *
 * Channel Strategy (from ada-marina-wim):
 * - Ch 16: Emergency (MAYDAY, PAN-PAN, SECURITE) - Always monitored
 * - Ch 72: Marina operations (berth requests, services) - Turkish/English/Greek
 * - Ch 9: Ship-to-ship communication
 * - Ch 69: Non-commercial vessels
 */

import { EventEmitter } from 'events';
import {
  VHFChannel,
  VHFTransmission,
  VHFAlert,
  VHFScannerConfig,
  VHFMessageType,
} from '../../../core/types.js';
import {
  VHF_CHANNELS,
  TURKEY_PRIORITY_CHANNELS,
  getChannel,
  getPriorityChannelsForLocation,
  getGeographicProfile,
  findChannelByFrequency,
} from './VHFChannelDefinitions.js';

export interface VHFScannerState {
  isScanning: boolean;
  currentChannel: number;
  currentFrequency: number;
  signalStrength: number;
  lastTransmission?: VHFTransmission;
  activeChannels: number[];
  priorityMode: boolean;
}

export class VHFRadioService extends EventEmitter {
  private config: VHFScannerConfig;
  private state: VHFScannerState;
  private transmissions: VHFTransmission[] = [];
  private alerts: VHFAlert[] = [];
  private scanInterval?: NodeJS.Timeout;
  private sdrProcess?: any; // Child process for SDR
  private currentLocation?: { latitude: number; longitude: number };

  // Statistics
  private stats = {
    totalScans: 0,
    transmissionsDetected: 0,
    emergencyCallsDetected: 0,
    transcriptionsCompleted: 0,
    uptime: 0,
  };

  constructor(config?: Partial<VHFScannerConfig>) {
    super();

    // Default configuration
    this.config = {
      priorityChannels: TURKEY_PRIORITY_CHANNELS,
      scanIntervalMs: 200, // 200ms per channel (5 channels/sec)
      minSignalStrength: -80, // dBm threshold
      enableVAD: true,
      enableSTT: true,
      geographicMode: 'turkey',
      autoTuneByLocation: true,
      ...config,
    };

    this.state = {
      isScanning: false,
      currentChannel: 16,
      currentFrequency: 156.800,
      signalStrength: -100,
      activeChannels: this.config.priorityChannels,
      priorityMode: true,
    };
  }

  /**
   * Start VHF scanner
   */
  async startScanning(): Promise<void> {
    if (this.state.isScanning) {
      throw new Error('Scanner already running');
    }

    this.emit('scanner:starting');

    // Initialize SDR hardware (placeholder - requires rtl-sdr)
    await this.initializeSDR();

    this.state.isScanning = true;
    this.startScanLoop();

    // Start uptime counter
    const startTime = Date.now();
    setInterval(() => {
      this.stats.uptime = Math.floor((Date.now() - startTime) / 1000);
    }, 1000);

    this.emit('scanner:started', { config: this.config });
  }

  /**
   * Stop VHF scanner
   */
  async stopScanning(): Promise<void> {
    if (!this.state.isScanning) {
      return;
    }

    this.emit('scanner:stopping');

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = undefined;
    }

    this.state.isScanning = false;
    await this.shutdownSDR();

    this.emit('scanner:stopped');
  }

  /**
   * Update geographic location for auto-tuning
   */
  updateLocation(latitude: number, longitude: number): void {
    this.currentLocation = { latitude, longitude };

    if (this.config.autoTuneByLocation) {
      const priorityChannels = getPriorityChannelsForLocation(latitude, longitude);
      const profile = getGeographicProfile(latitude, longitude);

      this.config.priorityChannels = priorityChannels;
      this.state.activeChannels = priorityChannels;

      this.emit('location:updated', {
        location: this.currentLocation,
        profile,
        priorityChannels,
      });
    }
  }

  /**
   * Manually set channels to scan
   */
  setActiveChannels(channels: number[]): void {
    // Always include Ch 16 (emergency)
    if (!channels.includes(16)) {
      channels = [16, ...channels];
    }

    this.state.activeChannels = channels;
    this.emit('channels:updated', { channels });
  }

  /**
   * Get current scanner state
   */
  getState(): VHFScannerState {
    return { ...this.state };
  }

  /**
   * Get recent transmissions
   */
  getTransmissions(limit: number = 50): VHFTransmission[] {
    return this.transmissions.slice(-limit);
  }

  /**
   * Get active alerts
   */
  getAlerts(): VHFAlert[] {
    return this.alerts.filter(alert => {
      // Keep alerts for 1 hour
      const age = Date.now() - alert.timestamp.getTime();
      return age < 3600000;
    });
  }

  /**
   * Get scanner statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      transmissionsStored: this.transmissions.length,
      activeAlerts: this.getAlerts().length,
      currentState: this.state,
    };
  }

  /**
   * Initialize SDR hardware
   * In production, this would spawn rtl_fm or use SDR library
   */
  private async initializeSDR(): Promise<void> {
    // Placeholder for actual SDR initialization
    // Real implementation would:
    // 1. Check for RTL-SDR device
    // 2. Set frequency range (156-162 MHz)
    // 3. Configure gain and sample rate
    // 4. Start audio stream

    // Example command for rtl_fm:
    // rtl_fm -f 156.8M -M fm -s 12k -g 40 - | sox -t raw -r 12k -e s -b 16 -c 1 - -t wav -

    this.emit('sdr:initialized', {
      device: 'RTL-SDR (simulated)',
      frequencyRange: '156-162 MHz',
      mode: 'FM',
    });
  }

  /**
   * Shutdown SDR hardware
   */
  private async shutdownSDR(): Promise<void> {
    if (this.sdrProcess) {
      // Kill child process
      this.sdrProcess.kill();
      this.sdrProcess = undefined;
    }

    this.emit('sdr:shutdown');
  }

  /**
   * Main scan loop
   */
  private startScanLoop(): void {
    let channelIndex = 0;

    this.scanInterval = setInterval(() => {
      const channels = this.state.activeChannels;
      const channelNum = channels[channelIndex];
      const channel = getChannel(channelNum);

      if (!channel) {
        channelIndex = (channelIndex + 1) % channels.length;
        return;
      }

      // Tune to channel
      this.tuneToChannel(channel);

      // Check for signal
      this.scanChannel(channel);

      // Move to next channel
      channelIndex = (channelIndex + 1) % channels.length;

      // Increment scan counter
      this.stats.totalScans++;

    }, this.config.scanIntervalMs);
  }

  /**
   * Tune SDR to specific channel
   */
  private tuneToChannel(channel: VHFChannel): void {
    this.state.currentChannel = channel.channel;
    this.state.currentFrequency = channel.frequency;

    // In production, send command to rtl_fm to change frequency
    // rtl_fm -f ${channel.frequency}M ...
  }

  /**
   * Scan channel for activity
   */
  private async scanChannel(channel: VHFChannel): Promise<void> {
    // Simulate signal strength measurement
    // In production, this would read from SDR audio level or squelch
    const signalStrength = this.measureSignalStrength();
    this.state.signalStrength = signalStrength;

    // Check if signal is above threshold
    if (signalStrength > this.config.minSignalStrength) {
      // Signal detected!
      await this.handleSignalDetected(channel, signalStrength);
    }
  }

  /**
   * Measure signal strength from SDR
   * Returns value in dBm
   */
  private measureSignalStrength(): number {
    // Placeholder - in production, calculate from SDR audio level
    // For now, return random value simulating noise floor
    return -100 + Math.random() * 20; // -100 to -80 dBm
  }

  /**
   * Handle signal detection on channel
   */
  private async handleSignalDetected(
    channel: VHFChannel,
    signalStrength: number
  ): Promise<void> {
    const transmissionId = `tx_${Date.now()}_${channel.channel}`;

    // Voice Activity Detection
    const hasVoice = this.config.enableVAD
      ? await this.detectVoiceActivity()
      : true;

    if (!hasVoice) {
      // Noise or carrier only, skip
      return;
    }

    // Record transmission start
    const transmission: VHFTransmission = {
      id: transmissionId,
      channel: channel.channel,
      frequency: channel.frequency,
      timestamp: new Date(),
      duration: 0, // Will update when transmission ends
      signalStrength,
      hasVoice,
      classification: this.classifyChannel(channel),
      location: this.currentLocation,
    };

    // Wait for transmission to complete (placeholder)
    // In production, continuously monitor signal and record audio
    const duration = await this.recordTransmission(channel);
    transmission.duration = duration;

    // Speech-to-Text transcription
    if (this.config.enableSTT && hasVoice) {
      transmission.transcription = await this.transcribeAudio(transmissionId);
      this.stats.transcriptionsCompleted++;
    }

    // Store transmission
    this.transmissions.push(transmission);
    this.stats.transmissionsDetected++;

    // Keep only last 1000 transmissions
    if (this.transmissions.length > 1000) {
      this.transmissions.shift();
    }

    // Check for alerts
    this.checkForAlerts(transmission);

    // Emit event
    this.emit('transmission:detected', transmission);

    // Update last transmission
    this.state.lastTransmission = transmission;
  }

  /**
   * Voice Activity Detection
   * Returns true if human voice detected
   */
  private async detectVoiceActivity(): Promise<boolean> {
    // Placeholder - in production, use:
    // - Python VAD library (webrtcvad, silero-vad)
    // - Audio feature extraction
    // - Neural network classification

    // For now, simulate 30% voice activity rate
    return Math.random() < 0.3;
  }

  /**
   * Record transmission audio
   * Returns duration in seconds
   */
  private async recordTransmission(channel: VHFChannel): Promise<number> {
    // Placeholder - in production:
    // 1. Start recording audio from SDR
    // 2. Monitor signal strength
    // 3. Stop when signal drops below threshold for 2 seconds
    // 4. Save audio file (WAV format)
    // 5. Return duration

    // Simulate transmission duration (3-30 seconds typical)
    const duration = 3 + Math.random() * 27;

    return new Promise(resolve => {
      setTimeout(() => resolve(duration), 100);
    });
  }

  /**
   * Transcribe audio using Speech-to-Text
   */
  private async transcribeAudio(transmissionId: string): Promise<string> {
    // Placeholder - in production:
    // 1. Call Python STT backend (Whisper, Vosk, etc.)
    // 2. Send audio file or stream
    // 3. Return transcription text

    // For now, return placeholder
    return `[Transcription for ${transmissionId}]`;
  }

  /**
   * Classify channel transmission
   */
  private classifyChannel(channel: VHFChannel): VHFMessageType {
    switch (channel.type) {
      case 'emergency':
        return 'emergency';
      case 'intership':
        return 'intership';
      case 'marina':
        return 'marina';
      case 'port':
        return 'port_ops';
      case 'coast_guard':
        return 'coast_guard';
      case 'dsc':
        return 'emergency';
      default:
        return 'unknown';
    }
  }

  /**
   * Check transmission for alert conditions
   */
  private checkForAlerts(transmission: VHFTransmission): void {
    // Emergency channel
    if (transmission.channel === 16) {
      const alert: VHFAlert = {
        id: `alert_${Date.now()}`,
        severity: 'emergency',
        channel: transmission.channel,
        message: `Emergency transmission detected on Channel 16`,
        timestamp: transmission.timestamp,
        requiresAction: true,
        transmission,
      };

      this.alerts.push(alert);
      this.stats.emergencyCallsDetected++;
      this.emit('alert:emergency', alert);
      return;
    }

    // DSC channel
    if (transmission.channel === 70) {
      const alert: VHFAlert = {
        id: `alert_${Date.now()}`,
        severity: 'emergency',
        channel: transmission.channel,
        message: `DSC distress call detected`,
        timestamp: transmission.timestamp,
        requiresAction: true,
        transmission,
      };

      this.alerts.push(alert);
      this.emit('alert:emergency', alert);
      return;
    }

    // Check transcription for emergency keywords
    if (transmission.transcription) {
      const emergencyKeywords = ['mayday', 'pan pan', 'securite', 'distress', 'emergency'];
      const transcriptionLower = transmission.transcription.toLowerCase();

      for (const keyword of emergencyKeywords) {
        if (transcriptionLower.includes(keyword)) {
          const alert: VHFAlert = {
            id: `alert_${Date.now()}`,
            severity: 'critical',
            channel: transmission.channel,
            message: `Emergency keyword "${keyword}" detected on Ch ${transmission.channel}`,
            timestamp: transmission.timestamp,
            requiresAction: true,
            transmission,
          };

          this.alerts.push(alert);
          this.emit('alert:critical', alert);
          return;
        }
      }
    }
  }

  /**
   * Clear old transmissions
   */
  clearOldTransmissions(olderThanHours: number = 24): number {
    const cutoff = Date.now() - (olderThanHours * 3600000);
    const beforeCount = this.transmissions.length;

    this.transmissions = this.transmissions.filter(
      tx => tx.timestamp.getTime() > cutoff
    );

    const removed = beforeCount - this.transmissions.length;
    this.emit('transmissions:cleared', { removed, remaining: this.transmissions.length });

    return removed;
  }

  /**
   * Export scanner data for analysis
   */
  exportData(): string {
    return JSON.stringify({
      config: this.config,
      state: this.state,
      statistics: this.getStatistics(),
      transmissions: this.transmissions,
      alerts: this.getAlerts(),
      exportedAt: new Date(),
    }, null, 2);
  }
}
