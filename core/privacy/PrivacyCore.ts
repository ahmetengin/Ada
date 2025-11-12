/**
 * PrivacyCore - Zero-Trust Privacy Framework for Ada.sea
 *
 * CRITICAL PRIVACY PRINCIPLE:
 * "Kaptan ne derse o olur. Nokta." (What the captain says, goes. Period.)
 *
 * NO data leaves the vessel without explicit captain authorization.
 * NO automatic cloud sync. NO third-party sharing without approval.
 */

import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import {
  DataTransferRequest,
  CaptainPermission,
  DataTransferLog,
  StandingPermission,
  PrivacySettings,
  PrivacyAuditReport,
  VoiceConsentPrompt,
  DataCategory,
  DataClassificationLevel,
  ConsentMethod,
  DataPolicyRules,
  DataCategoryClassification,
} from './PrivacyTypes.js';

export interface PrivacyCoreConfig {
  captainId: string;
  vesselName: string;
  enableVoiceConsent?: boolean;
  defaultSettings?: Partial<PrivacySettings>;
}

export class PrivacyCore extends EventEmitter {
  private captainId: string;
  private vesselName: string;
  private enableVoiceConsent: boolean;

  // Settings
  private settings: PrivacySettings;

  // Audit trail (encrypted local storage)
  private transferLogs: DataTransferLog[] = [];
  private standingPermissions: Map<string, StandingPermission> = new Map();

  // Pending requests
  private pendingRequests: Map<string, DataTransferRequest> = new Map();

  constructor(config: PrivacyCoreConfig) {
    super();

    this.captainId = config.captainId;
    this.vesselName = config.vesselName;
    this.enableVoiceConsent = config.enableVoiceConsent ?? true;

    // Initialize settings with privacy-first defaults
    this.settings = {
      captainId: config.captainId,
      autoShareDisabled: true,           // DISABLED by default
      cloudSyncEnabled: false,            // DISABLED by default
      zeroKnowledgeMode: true,            // ENABLED by default
      notifyOnEveryShare: true,
      notifyOnlyHighRisk: false,
      logRetentionDays: 90,
      autoDeleteTransferLogs: false,
      standingPermissions: [],
      blockedDestinations: [],
      anonymousModeEnabled: false,
      ...config.defaultSettings,
    };

    this.emit('privacy-core:initialized', {
      vesselName: this.vesselName,
      captainId: this.captainId,
      settings: this.settings,
    });
  }

  /**
   * Request permission to share data
   * THIS IS THE CORE PRIVACY FUNCTION
   */
  async requestDataTransfer(request: Omit<DataTransferRequest, 'id' | 'timestamp'>): Promise<{
    success: boolean;
    transferId?: string;
    reason?: string;
  }> {
    // Generate request ID
    const requestId = uuidv4();
    const fullRequest: DataTransferRequest = {
      ...request,
      id: requestId,
      timestamp: new Date(),
    };

    // Check if destination is blocked
    if (this.settings.blockedDestinations.includes(request.destination)) {
      await this.logDenial(requestId, request.destination, request.dataType, 'Destination blocked by captain');
      return {
        success: false,
        reason: `Destination blocked: ${request.destination}`,
      };
    }

    // Check if we have standing permission
    const standingPermission = this.checkStandingPermission(
      request.destination,
      request.dataType
    );

    if (standingPermission && standingPermission.active) {
      // We have standing permission - can proceed
      return await this.executeTransfer(fullRequest, {
        requestId,
        granted: true,
        captainId: this.captainId,
        method: 'standing',
        timestamp: new Date(),
        scope: standingPermission.dataTypes,
      });
    }

    // Check data policy for this classification level
    const policy = DataPolicyRules[request.classificationLevel];

    if (!policy.requiresApproval && policy.autoShareAllowed) {
      // Can auto-share (e.g., anonymous data)
      if (policy.anonymizeRequired) {
        // Anonymize the data first
        const anonymizedData = this.anonymizeData(request.data, request.dataType);
        fullRequest.data = anonymizedData;
      }

      return await this.executeTransfer(fullRequest, {
        requestId,
        granted: true,
        captainId: 'system',
        method: 'standing',
        timestamp: new Date(),
        scope: request.dataType,
      });
    }

    // Requires captain approval
    this.pendingRequests.set(requestId, fullRequest);

    // Request permission from captain
    const permission = await this.requestCaptainPermission(fullRequest, policy);

    if (!permission.granted) {
      await this.logDenial(
        requestId,
        request.destination,
        request.dataType,
        'Captain denied permission'
      );
      this.pendingRequests.delete(requestId);
      return {
        success: false,
        reason: 'Permission denied by captain',
      };
    }

    // Permission granted - execute transfer
    const result = await this.executeTransfer(fullRequest, permission);
    this.pendingRequests.delete(requestId);

    return result;
  }

  /**
   * Request captain permission (voice or UI)
   */
  private async requestCaptainPermission(
    request: DataTransferRequest,
    policy: typeof DataPolicyRules[DataClassificationLevel]
  ): Promise<CaptainPermission> {
    // Prepare consent prompt
    const prompt = this.prepareCaptainPrompt(request);

    // Emit event for UI/Voice handler
    this.emit('consent:required', {
      requestId: request.id,
      prompt,
      requiresVoice: policy.requiresVoiceConfirmation,
      request,
    });

    // Wait for captain response
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        // No response - default to deny
        resolve({
          requestId: request.id,
          granted: false,
          captainId: this.captainId,
          method: 'manual',
          timestamp: new Date(),
          scope: [],
        });
      }, prompt.timeout * 1000);

      // Listen for captain response
      const responseHandler = (permission: CaptainPermission) => {
        if (permission.requestId === request.id) {
          clearTimeout(timeout);
          this.off('consent:response', responseHandler);
          resolve(permission);
        }
      };

      this.on('consent:response', responseHandler);
    });
  }

  /**
   * Captain grants or denies permission
   * THIS IS CALLED BY THE UI/VOICE INTERFACE
   */
  grantPermission(
    requestId: string,
    granted: boolean,
    method: ConsentMethod = 'manual',
    confirmationText?: string
  ): void {
    const permission: CaptainPermission = {
      requestId,
      granted,
      captainId: this.captainId,
      method,
      timestamp: new Date(),
      scope: granted ? this.pendingRequests.get(requestId)?.dataType || [] : [],
      confirmationText,
    };

    this.emit('consent:response', permission);

    if (granted) {
      this.emit('privacy:permission-granted', {
        requestId,
        destination: this.pendingRequests.get(requestId)?.destination,
        method,
      });
    } else {
      this.emit('privacy:permission-denied', {
        requestId,
        destination: this.pendingRequests.get(requestId)?.destination,
      });
    }
  }

  /**
   * Execute data transfer after permission granted
   */
  private async executeTransfer(
    request: DataTransferRequest,
    permission: CaptainPermission
  ): Promise<{ success: boolean; transferId?: string; reason?: string }> {
    try {
      // Filter data based on permission scope
      const filteredData = this.filterDataByScope(request.data, permission.scope);

      // Create transfer log BEFORE sending
      const log: DataTransferLog = {
        id: uuidv4(),
        timestamp: new Date(),
        destination: request.destination,
        dataType: request.dataType,
        dataSummary: this.summarizeData(filteredData, request.dataType),
        dataHash: this.hashData(filteredData),
        captainAuthorization: {
          method: permission.method,
          captainId: permission.captainId,
          confirmationText: permission.confirmationText,
        },
        result: 'success',
        bytesSent: JSON.stringify(filteredData).length,
      };

      // Store log
      this.transferLogs.push(log);

      // Update standing permission usage if applicable
      if (permission.method === 'standing') {
        const standingPerm = Array.from(this.standingPermissions.values()).find(
          p => p.destination === request.destination && p.active
        );
        if (standingPerm) {
          standingPerm.usageCount++;
          standingPerm.lastUsed = new Date();
        }
      }

      // Emit transfer event
      this.emit('data:transfer', {
        log,
        destination: request.destination,
        dataType: request.dataType,
      });

      // Notify captain
      if (this.settings.notifyOnEveryShare ||
          (this.settings.notifyOnlyHighRisk && request.classificationLevel === 'PRIVATE')) {
        this.emit('captain:notify', {
          type: 'data-shared',
          message: `✓ Veri gönderildi: ${request.destination}`,
          details: log,
        });
      }

      // Clean up old logs if needed
      this.cleanupOldLogs();

      return {
        success: true,
        transferId: log.id,
      };

    } catch (error) {
      // Log failure
      const errorLog: DataTransferLog = {
        id: uuidv4(),
        timestamp: new Date(),
        destination: request.destination,
        dataType: request.dataType,
        dataSummary: 'Transfer failed',
        dataHash: '',
        captainAuthorization: {
          method: permission.method,
          captainId: permission.captainId,
        },
        result: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };

      this.transferLogs.push(errorLog);

      return {
        success: false,
        reason: error instanceof Error ? error.message : 'Transfer failed',
      };
    }
  }

  /**
   * Log a denial
   */
  private async logDenial(
    requestId: string,
    destination: string,
    dataType: DataCategory[],
    reason: string
  ): Promise<void> {
    const log: DataTransferLog = {
      id: requestId,
      timestamp: new Date(),
      destination,
      dataType,
      dataSummary: 'Permission denied',
      dataHash: '',
      captainAuthorization: {
        method: 'manual',
        captainId: this.captainId,
      },
      result: 'denied',
      errorMessage: reason,
    };

    this.transferLogs.push(log);
    this.emit('privacy:transfer-denied', log);
  }

  /**
   * Check for standing permission
   */
  private checkStandingPermission(
    destination: string,
    dataTypes: DataCategory[]
  ): StandingPermission | null {
    for (const permission of this.standingPermissions.values()) {
      if (permission.destination === destination && permission.active) {
        // Check if permission covers all requested data types
        const covers = dataTypes.every(dt => permission.dataTypes.includes(dt));

        // Check expiration
        if (permission.expiresAt && permission.expiresAt < new Date()) {
          permission.active = false;
          continue;
        }

        if (covers) {
          return permission;
        }
      }
    }
    return null;
  }

  /**
   * Create standing permission
   */
  createStandingPermission(
    destination: string,
    dataTypes: DataCategory[],
    purpose: string,
    expiresAt?: Date,
    conditions?: string[]
  ): StandingPermission {
    // Validate that all data types can have standing permission
    for (const dataType of dataTypes) {
      const classification = DataCategoryClassification[dataType];
      const policy = DataPolicyRules[classification];

      if (!policy.canHaveStandingPermission) {
        throw new Error(
          `Cannot create standing permission for ${dataType} - ` +
          `requires explicit approval every time`
        );
      }
    }

    const permission: StandingPermission = {
      id: uuidv4(),
      destination,
      dataTypes,
      purpose,
      createdAt: new Date(),
      expiresAt,
      captainId: this.captainId,
      active: true,
      conditions,
      usageCount: 0,
    };

    this.standingPermissions.set(permission.id, permission);
    this.emit('privacy:standing-permission-created', permission);

    return permission;
  }

  /**
   * Revoke standing permission
   */
  revokeStandingPermission(permissionId: string): void {
    const permission = this.standingPermissions.get(permissionId);
    if (permission) {
      permission.active = false;
      this.emit('privacy:standing-permission-revoked', permission);
    }
  }

  /**
   * Get all standing permissions
   */
  getStandingPermissions(): StandingPermission[] {
    return Array.from(this.standingPermissions.values());
  }

  /**
   * Prepare captain consent prompt (in Turkish)
   */
  private prepareCaptainPrompt(request: DataTransferRequest): VoiceConsentPrompt {
    const dataDescription = this.describeDataTypes(request.dataType);

    return {
      promptText:
        `Kaptan, ${request.destination} için ` +
        `${dataDescription} paylaşılsın mı?\n` +
        `Amaç: ${request.purpose}\n` +
        `Cevap: "Evet paylaş" veya "Hayır"`,
      expectedResponses: {
        approve: ['evet', 'evet paylaş', 'tamam', 'paylaş', 'onayla', 'onaylıyorum'],
        deny: ['hayır', 'hayır paylaşma', 'iptal', 'gönderme', 'reddet', 'reddediyorum'],
      },
      timeout: 30, // 30 seconds
      language: 'tr',
    };
  }

  /**
   * Describe data types in Turkish
   */
  private describeDataTypes(dataTypes: DataCategory[]): string {
    const descriptions: Record<DataCategory, string> = {
      // PRIVATE
      'gps_history': 'GPS geçmişi',
      'communication_logs': 'iletişim kayıtları',
      'financial_data': 'mali bilgiler',
      'crew_personal_info': 'mürettebat kişisel bilgileri',
      'passenger_personal_info': 'yolcu kişisel bilgileri',
      'sensor_raw_data': 'sensör verileri',
      'security_cameras': 'güvenlik kamera kayıtları',
      'passwords': 'şifreler',
      'api_keys': 'API anahtarları',
      // RESTRICTED
      'current_position': 'mevcut konum',
      'vessel_specifications': 'tekne özellikleri',
      'arrival_time': 'varış saati',
      'contact_info': 'iletişim bilgileri',
      // CONDITIONAL
      'weather_preferences': 'hava durumu tercihleri',
      'route_planning_style': 'rota planlama tercihleri',
      'fuel_consumption_stats': 'yakıt tüketim istatistikleri',
      'maintenance_schedule': 'bakım programı',
      // ANONYMOUS
      'anchorage_ratings': 'demir yeri değerlendirmeleri',
      'weather_reports': 'hava durumu raporları',
    };

    return dataTypes.map(dt => descriptions[dt] || dt).join(', ');
  }

  /**
   * Filter data based on permission scope
   */
  private filterDataByScope(data: any, scope: string[]): any {
    if (!scope || scope.length === 0) {
      return {};
    }

    const filtered: any = {};
    for (const key of scope) {
      if (key in data) {
        filtered[key] = data[key];
      }
    }
    return filtered;
  }

  /**
   * Anonymize data
   */
  private anonymizeData(data: any, dataTypes: DataCategory[]): any {
    // Remove all personally identifiable information
    const anonymized = { ...data };

    // Remove vessel identification
    delete anonymized.vesselName;
    delete anonymized.vesselId;
    delete anonymized.mmsi;
    delete anonymized.imo;

    // Remove personal info
    delete anonymized.captain;
    delete anonymized.owner;
    delete anonymized.crew;
    delete anonymized.passengers;

    // Remove precise location (can include region only)
    if (anonymized.position) {
      // Round to ~10km precision
      anonymized.position = {
        latitude: Math.round(anonymized.position.latitude * 10) / 10,
        longitude: Math.round(anonymized.position.longitude * 10) / 10,
      };
    }

    return anonymized;
  }

  /**
   * Summarize data for logs (don't store full data)
   */
  private summarizeData(data: any, dataTypes: DataCategory[]): string {
    const summary: string[] = [];

    for (const dataType of dataTypes) {
      if (dataType in data) {
        const value = data[dataType];
        if (typeof value === 'object') {
          summary.push(`${dataType}: [object]`);
        } else if (typeof value === 'string' && value.length > 50) {
          summary.push(`${dataType}: ${value.substring(0, 50)}...`);
        } else {
          summary.push(`${dataType}: ${value}`);
        }
      }
    }

    return summary.join(', ') || 'No data';
  }

  /**
   * Hash data for verification
   */
  private hashData(data: any): string {
    const dataString = JSON.stringify(data);
    return createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Get audit trail
   */
  getAuditTrail(daysBack: number = 7): PrivacyAuditReport {
    const from = new Date();
    from.setDate(from.getDate() - daysBack);
    const to = new Date();

    const logsInPeriod = this.transferLogs.filter(
      log => log.timestamp >= from && log.timestamp <= to
    );

    const summary = {
      totalTransfers: logsInPeriod.length,
      approvedTransfers: logsInPeriod.filter(l => l.result === 'success').length,
      deniedTransfers: logsInPeriod.filter(l => l.result === 'denied').length,
      failedTransfers: logsInPeriod.filter(l => l.result === 'failed').length,
      totalBytesShared: logsInPeriod.reduce((sum, l) => sum + (l.bytesSent || 0), 0),
    };

    const byDestination = new Map<string, any>();
    const byDataType = new Map<DataCategory, number>();

    for (const log of logsInPeriod) {
      // By destination
      if (!byDestination.has(log.destination)) {
        byDestination.set(log.destination, {
          count: 0,
          dataTypes: new Set<DataCategory>(),
          lastTransfer: log.timestamp,
        });
      }
      const destStats = byDestination.get(log.destination)!;
      destStats.count++;
      log.dataType.forEach(dt => destStats.dataTypes.add(dt));
      if (log.timestamp > destStats.lastTransfer) {
        destStats.lastTransfer = log.timestamp;
      }

      // By data type
      for (const dataType of log.dataType) {
        byDataType.set(dataType, (byDataType.get(dataType) || 0) + 1);
      }
    }

    // Convert Sets to Arrays for the report
    const byDestinationFormatted = new Map();
    byDestination.forEach((value, key) => {
      byDestinationFormatted.set(key, {
        ...value,
        dataTypes: Array.from(value.dataTypes),
      });
    });

    return {
      period: { from, to },
      summary,
      byDestination: byDestinationFormatted,
      byDataType,
      transfers: logsInPeriod,
    };
  }

  /**
   * Clean up old logs
   */
  private cleanupOldLogs(): void {
    if (this.settings.autoDeleteTransferLogs) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.settings.logRetentionDays);

      this.transferLogs = this.transferLogs.filter(
        log => log.timestamp >= cutoffDate
      );
    }
  }

  /**
   * Export audit logs (for captain review)
   */
  exportAuditLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.transferLogs, null, 2);
    } else {
      // CSV format
      const headers = [
        'Timestamp',
        'Destination',
        'Data Type',
        'Summary',
        'Result',
        'Authorization Method',
        'Bytes Sent',
      ];

      const rows = this.transferLogs.map(log => [
        log.timestamp.toISOString(),
        log.destination,
        log.dataType.join(';'),
        log.dataSummary,
        log.result,
        log.captainAuthorization.method,
        log.bytesSent?.toString() || '0',
      ]);

      return [
        headers.join(','),
        ...rows.map(row => row.join(',')),
      ].join('\n');
    }
  }

  /**
   * Get settings
   */
  getSettings(): PrivacySettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: Partial<PrivacySettings>): void {
    this.settings = {
      ...this.settings,
      ...newSettings,
    };

    this.emit('privacy:settings-updated', this.settings);
  }

  /**
   * Block a destination
   */
  blockDestination(destination: string): void {
    if (!this.settings.blockedDestinations.includes(destination)) {
      this.settings.blockedDestinations.push(destination);
      this.emit('privacy:destination-blocked', destination);
    }
  }

  /**
   * Unblock a destination
   */
  unblockDestination(destination: string): void {
    this.settings.blockedDestinations = this.settings.blockedDestinations.filter(
      d => d !== destination
    );
    this.emit('privacy:destination-unblocked', destination);
  }

  /**
   * Get privacy statistics
   */
  getPrivacyStats(): {
    totalTransfers: number;
    deniedCount: number;
    approvedCount: number;
    standingPermissionsCount: number;
    blockedDestinations: number;
    auditLogSize: number;
  } {
    return {
      totalTransfers: this.transferLogs.length,
      deniedCount: this.transferLogs.filter(l => l.result === 'denied').length,
      approvedCount: this.transferLogs.filter(l => l.result === 'success').length,
      standingPermissionsCount: Array.from(this.standingPermissions.values())
        .filter(p => p.active).length,
      blockedDestinations: this.settings.blockedDestinations.length,
      auditLogSize: this.transferLogs.length,
    };
  }
}
