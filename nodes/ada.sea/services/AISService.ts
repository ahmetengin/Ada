/**
 * AIS Service - Automatic Identification System
 * Handles vessel identification, tracking, and collision detection
 *
 * Features:
 * - Own vessel AIS transponder integration
 * - AIS target tracking (other vessels)
 * - Collision detection (CPA/TCPA)
 * - Legal vessel identity validation
 * - NMEA AIS message encoding/decoding
 */

import { EventEmitter } from 'events';
import {
  MMSI,
  IMONumber,
  VesselLegalIdentity,
  AISStaticData,
  AISDynamicData,
  AISTarget,
  AISCollisionAlert,
  CollisionDetectionConfig,
  NavigationStatus,
  ShipType,
  AISClass,
  AISMessageType,
  AISNMEASentence,
} from '../types/AISTypes.js';

export interface AISServiceConfig {
  // Own vessel identity (REQUIRED)
  vesselIdentity: VesselLegalIdentity;

  // Collision detection
  collisionDetection: CollisionDetectionConfig;

  // AIS transponder
  transponderEnabled: boolean;
  transponderClass: AISClass;
  transmitInterval: number;      // seconds (2-10 for Class A, 30 for Class B)

  // Target tracking
  targetTimeout: number;          // seconds - mark target as lost if not seen
  maxTargets: number;             // Maximum number of targets to track

  // Integration
  nmea2000Enabled: boolean;
  nmea0183Enabled: boolean;
}

interface Position {
  latitude: number;
  longitude: number;
}

export class AISService extends EventEmitter {
  private config: AISServiceConfig;

  // Own vessel data
  private ownVessel: VesselLegalIdentity;
  private ownStaticData: AISStaticData | null = null;
  private ownDynamicData: AISDynamicData | null = null;

  // Targets
  private targets: Map<MMSI, AISTarget> = new Map();
  private collisionAlerts: Map<string, AISCollisionAlert> = new Map();

  // Transmission
  private transmitTimer: NodeJS.Timeout | null = null;
  private targetCleanupTimer: NodeJS.Timeout | null = null;

  // Statistics
  private stats = {
    messagesReceived: 0,
    messagesTransmitted: 0,
    targetsTracked: 0,
    collisionAlertsGenerated: 0,
    lastTransmit: null as Date | null,
    lastReceive: null as Date | null,
  };

  constructor(config: AISServiceConfig) {
    super();
    this.config = config;
    this.ownVessel = config.vesselIdentity;

    // Validate own vessel identity
    this.validateVesselIdentity(this.ownVessel);

    // Initialize static data
    this.initializeOwnStaticData();

    // Start transponder if enabled
    if (config.transponderEnabled) {
      this.startTransponder();
    }

    // Start target cleanup
    this.startTargetCleanup();
  }

  /**
   * Validate vessel legal identity
   * Ensures all required fields are present and valid
   */
  private validateVesselIdentity(identity: VesselLegalIdentity): void {
    const errors: string[] = [];

    // MMSI validation (9 digits)
    if (!identity.mmsi || !/^[0-9]{9}$/.test(identity.mmsi)) {
      errors.push('Invalid MMSI: Must be 9 digits');
    }

    // Check for dummy MMSI
    if (identity.mmsi === '000000000' || identity.mmsi === '123456789') {
      errors.push('Invalid MMSI: Dummy value not allowed. Register vessel to obtain valid MMSI.');
    }

    // IMO validation (7 digits + IMO prefix)
    if (!identity.imo || !/^IMO[0-9]{7}$/.test(identity.imo)) {
      errors.push('Invalid IMO: Must be IMO + 7 digits');
    }

    // Check for dummy IMO
    if (identity.imo === 'IMO0000000' || identity.imo === 'IMO1234567') {
      errors.push('Invalid IMO: Dummy value not allowed. Register vessel to obtain valid IMO.');
    }

    // Call sign
    if (!identity.callSign || identity.callSign.length < 3) {
      errors.push('Invalid Call Sign: Must be at least 3 characters');
    }

    // Vessel name
    if (!identity.name || identity.name.length < 2) {
      errors.push('Invalid vessel name');
    }

    // Flag state
    if (!identity.flagState || identity.flagState.length !== 3) {
      errors.push('Invalid flag state: Must be ISO 3166-1 alpha-3 (e.g., TUR, GRC)');
    }

    // Dimensions
    if (!identity.length || identity.length < 1) {
      errors.push('Invalid vessel length');
    }

    if (!identity.beam || identity.beam < 1) {
      errors.push('Invalid vessel beam');
    }

    if (!identity.draft || identity.draft < 0.1) {
      errors.push('Invalid vessel draft');
    }

    // SOLAS compliance (required for vessels 300+ GT)
    if (identity.grossTonnage && identity.grossTonnage >= 300 && !identity.solasCompliant) {
      errors.push('SOLAS compliance required for vessels 300+ GT');
    }

    // AIS Class requirement
    if (identity.grossTonnage && identity.grossTonnage >= 300 && identity.aisClass !== AISClass.ClassA) {
      errors.push('AIS Class A required for vessels 300+ GT');
    }

    if (errors.length > 0) {
      const errorMsg = `❌ VESSEL IDENTITY VALIDATION FAILED:\n${errors.join('\n')}`;
      throw new Error(errorMsg);
    }

    // Success
    console.log(`✅ Vessel identity validated: ${identity.name} (MMSI: ${identity.mmsi})`);
  }

  /**
   * Initialize own vessel static data
   */
  private initializeOwnStaticData(): void {
    this.ownStaticData = {
      mmsi: this.ownVessel.mmsi,
      imo: this.ownVessel.imo,
      callSign: this.ownVessel.callSign,
      vesselName: this.ownVessel.name,
      shipType: this.ownVessel.vesselType,

      // Dimensions (simplified - antenna at center)
      dimensionToBow: this.ownVessel.length / 2,
      dimensionToStern: this.ownVessel.length / 2,
      dimensionToPort: this.ownVessel.beam / 2,
      dimensionToStarboard: this.ownVessel.beam / 2,

      positionFixType: 1, // GPS
      eta: null,
      destination: '',
      draught: this.ownVessel.draft,

      lastUpdate: new Date(),
    };
  }

  /**
   * Update own vessel dynamic data (from NMEA/GPS)
   */
  updateOwnDynamicData(data: {
    latitude: number;
    longitude: number;
    sog: number;
    cog: number;
    heading: number;
    rateOfTurn?: number;
    navigationStatus: NavigationStatus;
  }): void {
    this.ownDynamicData = {
      mmsi: this.ownVessel.mmsi,
      latitude: data.latitude,
      longitude: data.longitude,
      positionAccuracy: true, // Assume DGPS
      sog: data.sog,
      cog: data.cog,
      heading: data.heading,
      rateOfTurn: data.rateOfTurn || 0,
      navigationStatus: data.navigationStatus,
      timestamp: new Date(),
      communicationState: 0,
    };

    this.emit('own:dynamic:update', this.ownDynamicData);
  }

  /**
   * Process incoming AIS NMEA sentence
   */
  processNMEASentence(sentence: string): void {
    try {
      const parsed = this.parseAISNMEA(sentence);

      if (!parsed) {
        return;
      }

      // Decode AIS message
      const message = this.decodeAISMessage(parsed);

      if (!message) {
        return;
      }

      this.stats.messagesReceived++;
      this.stats.lastReceive = new Date();

      // Process based on message type
      this.processAISMessage(message);
    } catch (error) {
      console.error('Error processing AIS NMEA sentence:', error);
    }
  }

  /**
   * Parse AIS NMEA sentence (!AIVDM or !AIVDO)
   */
  private parseAISNMEA(sentence: string): AISNMEASentence | null {
    // Example: !AIVDM,1,1,,A,13HOI:0P0000VOHLCnHQKwvL05Ip,0*23
    const match = sentence.match(/^!(AIVDM|AIVDO),(\d+),(\d+),(\d*),([AB]),([^,]*),(\d)\*([0-9A-F]{2})$/);

    if (!match) {
      return null;
    }

    return {
      type: match[1] as 'VDM' | 'VDO',
      fragmentCount: parseInt(match[2]),
      fragmentNumber: parseInt(match[3]),
      messageId: match[4] ? parseInt(match[4]) : null,
      channel: match[5] as 'A' | 'B',
      payload: match[6],
      fillBits: parseInt(match[7]),
      checksum: match[8],
      raw: sentence,
    };
  }

  /**
   * Decode AIS message from NMEA payload
   * (Simplified - full implementation would use AIS decoder library)
   */
  private decodeAISMessage(sentence: AISNMEASentence): any {
    // In production, use a library like 'ggencoder' or 'ais-decoder'
    // For now, return a mock structure

    // Extract message type from first 6 bits
    const payload = sentence.payload;
    const messageType = this.decodeSixBit(payload.charAt(0));

    return {
      type: messageType,
      payload: sentence.payload,
      // Full decoding would happen here
    };
  }

  /**
   * Decode 6-bit AIS character
   */
  private decodeSixBit(char: string): number {
    const code = char.charCodeAt(0);
    if (code >= 48 && code <= 87) {
      return code - 48;
    } else if (code >= 96 && code <= 119) {
      return code - 56;
    }
    return 0;
  }

  /**
   * Process decoded AIS message
   */
  private processAISMessage(message: any): void {
    // Simplified - would process different message types
    // For now, emit event
    this.emit('ais:message', message);
  }

  /**
   * Update AIS target (from received position report)
   */
  updateTarget(data: {
    mmsi: MMSI;
    latitude: number;
    longitude: number;
    sog: number;
    cog: number;
    heading: number;
    navigationStatus: NavigationStatus;
    name?: string;
    callSign?: string;
    shipType?: ShipType;
    length?: number;
    beam?: number;
  }): void {
    // Don't track own vessel
    if (data.mmsi === this.ownVessel.mmsi) {
      return;
    }

    const existing = this.targets.get(data.mmsi);
    const now = new Date();

    const target: AISTarget = {
      mmsi: data.mmsi,
      name: data.name || existing?.name,
      callSign: data.callSign || existing?.callSign,
      shipType: data.shipType || existing?.shipType,

      position: {
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: now,
      },

      sog: data.sog,
      cog: data.cog,
      heading: data.heading,
      navigationStatus: data.navigationStatus,

      length: data.length || existing?.length,
      beam: data.beam || existing?.beam,

      firstSeen: existing?.firstSeen || now,
      lastSeen: now,
      lost: false,

      collisionRisk: 'none',
    };

    // Calculate collision risk if we have own position
    if (this.ownDynamicData) {
      this.calculateCollisionRisk(target);
    }

    this.targets.set(data.mmsi, target);
    this.stats.targetsTracked = this.targets.size;

    this.emit('ais:target:update', target);

    // Check if new target
    if (!existing) {
      this.emit('ais:target:new', target);
    }
  }

  /**
   * Calculate collision risk (CPA/TCPA)
   */
  private calculateCollisionRisk(target: AISTarget): void {
    if (!this.ownDynamicData) {
      return;
    }

    const own = this.ownDynamicData;

    // Calculate CPA (Closest Point of Approach)
    const result = this.calculateCPA(
      { latitude: own.latitude, longitude: own.longitude },
      { speed: own.sog, course: own.cog },
      { latitude: target.position.latitude, longitude: target.position.longitude },
      { speed: target.sog, course: target.cog }
    );

    target.cpa = result.cpa;
    target.tcpa = result.tcpa;

    // Determine collision risk
    const config = this.config.collisionDetection;

    if (!config.enabled) {
      target.collisionRisk = 'none';
      return;
    }

    // Ignore stationary targets if configured
    if (config.ignoreStationaryTargets && target.sog < config.stationaryThreshold) {
      target.collisionRisk = 'none';
      return;
    }

    // Determine risk level
    if (result.cpa <= config.cpaCriticalDistance && result.tcpa <= config.tcpaCriticalTime) {
      target.collisionRisk = 'critical';
      this.generateCollisionAlert(target, 'critical');
    } else if (result.cpa <= config.cpaAlarmDistance && result.tcpa <= config.tcpaAlarmTime) {
      target.collisionRisk = 'high';
      this.generateCollisionAlert(target, 'alarm');
    } else if (result.cpa <= config.cpaWarningDistance && result.tcpa <= config.tcpaWarningTime) {
      target.collisionRisk = 'medium';
      this.generateCollisionAlert(target, 'warning');
    } else {
      target.collisionRisk = 'low';
    }
  }

  /**
   * Calculate CPA (Closest Point of Approach) and TCPA (Time to CPA)
   */
  private calculateCPA(
    ownPos: Position,
    ownMotion: { speed: number; course: number },
    targetPos: Position,
    targetMotion: { speed: number; course: number }
  ): { cpa: number; tcpa: number; cpaPosition: Position } {
    // Convert to radians
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    // Relative velocity
    const ownVx = ownMotion.speed * Math.sin(toRad(ownMotion.course));
    const ownVy = ownMotion.speed * Math.cos(toRad(ownMotion.course));
    const targetVx = targetMotion.speed * Math.sin(toRad(targetMotion.course));
    const targetVy = targetMotion.speed * Math.cos(toRad(targetMotion.course));

    const relVx = targetVx - ownVx;
    const relVy = targetVy - ownVy;

    // Relative position
    const relPosX = (targetPos.longitude - ownPos.longitude) * 60 * Math.cos(toRad(ownPos.latitude));
    const relPosY = (targetPos.latitude - ownPos.latitude) * 60;

    // Time to CPA (minutes)
    const relSpeed = Math.sqrt(relVx * relVx + relVy * relVy);
    const tcpa = relSpeed > 0 ? -(relPosX * relVx + relPosY * relVy) / (relSpeed * relSpeed) : 0;

    // CPA position
    const cpaX = relPosX + relVx * tcpa;
    const cpaY = relPosY + relVy * tcpa;

    // CPA distance (nautical miles)
    const cpa = Math.sqrt(cpaX * cpaX + cpaY * cpaY);

    // CPA position (lat/lon)
    const cpaPosition: Position = {
      latitude: ownPos.latitude + cpaY / 60,
      longitude: ownPos.longitude + cpaX / (60 * Math.cos(toRad(ownPos.latitude))),
    };

    return {
      cpa: Math.max(0, cpa),
      tcpa: Math.max(0, tcpa),
      cpaPosition,
    };
  }

  /**
   * Generate collision alert
   */
  private generateCollisionAlert(target: AISTarget, severity: 'warning' | 'alarm' | 'critical'): void {
    const alertId = `${target.mmsi}-${Date.now()}`;

    // Check if alert already exists for this target
    const existingAlert = Array.from(this.collisionAlerts.values()).find(
      (a) => a.target.mmsi === target.mmsi && !a.dismissed
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.severity = severity;
      existingAlert.cpa = target.cpa!;
      existingAlert.tcpa = target.tcpa!;
      return;
    }

    const alert: AISCollisionAlert = {
      id: alertId,
      timestamp: new Date(),
      severity,
      target,
      cpa: target.cpa!,
      tcpa: target.tcpa!,
      cpaPosition: { latitude: 0, longitude: 0 }, // Would calculate actual CPA position
      recommendation: this.generateCollisionRecommendation(target),
      acknowledged: false,
      dismissed: false,
    };

    this.collisionAlerts.set(alertId, alert);
    this.stats.collisionAlertsGenerated++;

    this.emit('ais:collision:alert', alert);
  }

  /**
   * Generate collision avoidance recommendation
   */
  private generateCollisionRecommendation(target: AISTarget): string {
    // Simplified - would use COLREGS (International Regulations for Preventing Collisions at Sea)
    if (target.collisionRisk === 'critical') {
      return 'CRITICAL: Immediate evasive action required. Alter course to starboard.';
    } else if (target.collisionRisk === 'high') {
      return 'WARNING: Collision risk detected. Monitor closely and prepare to alter course.';
    } else {
      return 'CAUTION: Monitor target vessel.';
    }
  }

  /**
   * Start AIS transponder (periodic transmission)
   */
  private startTransponder(): void {
    if (this.transmitTimer) {
      return;
    }

    const interval = this.config.transmitInterval * 1000;

    this.transmitTimer = setInterval(() => {
      this.transmitOwnVesselData();
    }, interval);

    console.log(`✅ AIS transponder started (Class ${this.config.transponderClass}, ${this.config.transmitInterval}s interval)`);
  }

  /**
   * Transmit own vessel AIS data
   */
  private transmitOwnVesselData(): void {
    if (!this.ownDynamicData) {
      console.warn('Cannot transmit AIS: No dynamic data available');
      return;
    }

    // Generate NMEA sentence
    const nmeaSentence = this.encodeAISMessage();

    this.stats.messagesTransmitted++;
    this.stats.lastTransmit = new Date();

    this.emit('ais:transmit', {
      static: this.ownStaticData,
      dynamic: this.ownDynamicData,
      nmea: nmeaSentence,
    });
  }

  /**
   * Encode AIS message to NMEA sentence
   * (Simplified - full implementation would use AIS encoder library)
   */
  private encodeAISMessage(): string {
    // In production, use encoder library
    // For now, return mock NMEA sentence
    return `!AIVDO,1,1,,A,MOCK_PAYLOAD,0*00`;
  }

  /**
   * Start target cleanup timer
   */
  private startTargetCleanup(): void {
    const cleanupInterval = 60000; // 1 minute

    this.targetCleanupTimer = setInterval(() => {
      this.cleanupLostTargets();
    }, cleanupInterval);
  }

  /**
   * Remove targets that haven't been seen for timeout period
   */
  private cleanupLostTargets(): void {
    const timeout = this.config.targetTimeout * 1000;
    const now = Date.now();

    for (const [mmsi, target] of this.targets.entries()) {
      const timeSinceLastSeen = now - target.lastSeen.getTime();

      if (timeSinceLastSeen > timeout) {
        target.lost = true;
        this.emit('ais:target:lost', target);
        this.targets.delete(mmsi);
      }
    }

    this.stats.targetsTracked = this.targets.size;
  }

  /**
   * Get all tracked targets
   */
  getTargets(): AISTarget[] {
    return Array.from(this.targets.values());
  }

  /**
   * Get active collision alerts
   */
  getCollisionAlerts(): AISCollisionAlert[] {
    return Array.from(this.collisionAlerts.values()).filter((a) => !a.dismissed);
  }

  /**
   * Acknowledge collision alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.collisionAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('ais:collision:acknowledged', alert);
    }
  }

  /**
   * Dismiss collision alert
   */
  dismissAlert(alertId: string): void {
    const alert = this.collisionAlerts.get(alertId);
    if (alert) {
      alert.dismissed = true;
      this.emit('ais:collision:dismissed', alert);
    }
  }

  /**
   * Get own vessel identity
   */
  getOwnVesselIdentity(): VesselLegalIdentity {
    return this.ownVessel;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      targetsActive: this.targets.size,
      alertsActive: this.getCollisionAlerts().length,
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.transmitTimer) {
      clearInterval(this.transmitTimer);
    }

    if (this.targetCleanupTimer) {
      clearInterval(this.targetCleanupTimer);
    }
  }
}
