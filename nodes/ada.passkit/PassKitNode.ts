/**
 * PassKitNode - Universal ticketing and access control node for Ada ecosystem
 *
 * Provides domain-agnostic pass generation for:
 * - ada.congress (conference badges, speaker passes)
 * - ada.travel (boarding passes, hotel vouchers)
 * - ada.sea (yacht boarding, marina access)
 * - ada.marina (berth passes, facility access)
 * - ada.interpreter (language selection passes)
 * - ada.restaurant (dining reservations)
 *
 * Features:
 * - QR code generation with security (signatures, nonces)
 * - Apple Wallet and Google Wallet integration
 * - Access policy engine (time/zone/capacity restrictions)
 * - Pass lifecycle management (create, update, revoke)
 * - Real-time access validation
 * - Analytics and statistics
 */

import { BaseNode, BaseNodeOptions } from '../../core/BaseNode.js';
import { v4 as uuidv4 } from 'uuid';
import {
  Pass,
  PassDomain,
  PassType,
  PassStatus,
  PassHolder,
  PassValidity,
  PassZone,
  QRPayload,
  PassBranding,
  CreatePassRequest,
  UpdatePassRequest,
  RevokePassRequest,
  ValidatePassRequest,
  AccessValidationResult,
  AccessRule,
  ScanLog,
  PassStatistics,
} from './types/PassTypes.js';
import { PassGenerator } from './services/PassGenerator.js';

export interface PassKitNodeConfig extends Omit<BaseNodeOptions, 'type' | 'capabilities'> {
  organizationInfo: {
    name: string;
    organizationId: string;
    domains: PassDomain[]; // Which domains this node serves
  };

  // Optional: External service integrations
  storage?: {
    provider: 's3' | 'local' | 'azure' | 'gcp';
    config: Record<string, any>;
  };

  walletIntegration?: {
    appleWallet?: {
      teamId: string;
      passTypeId: string;
      certificatePath?: string;
    };
    googleWallet?: {
      issuerId: string;
      serviceAccountPath?: string;
    };
  };

  security?: {
    enableSignatures: boolean;
    signingKey?: string;
  };
}

export class PassKitNode extends BaseNode {
  private organizationInfo: PassKitNodeConfig['organizationInfo'];
  private storage: PassKitNodeConfig['storage'];
  private walletIntegration: PassKitNodeConfig['walletIntegration'];
  private security: PassKitNodeConfig['security'];

  // Pass registry
  private passes: Map<string, Pass> = new Map();
  private scanLogs: Map<string, ScanLog[]> = new Map();
  private accessRules: Map<string, AccessRule> = new Map();

  // Zone tracking for capacity management
  private zoneOccupancy: Map<string, number> = new Map();

  constructor(config: PassKitNodeConfig) {
    super({
      ...config,
      type: 'ada.passkit' as any, // Will need to add to NodeType enum
      capabilities: {
        skills: [
          'pass-generation',
          'qr-generation',
          'access-validation',
          'policy-enforcement',
          'wallet-integration',
          'pass-lifecycle',
          'analytics',
        ],
        services: [
          'create-pass',
          'update-pass',
          'revoke-pass',
          'validate-access',
          'scan-tracking',
          'zone-management',
          'statistics',
        ],
        integrations: [
          'apple-wallet',
          'google-wallet',
          'qr-scanner',
          'access-control-systems',
        ],
      },
    });

    this.organizationInfo = config.organizationInfo;
    this.storage = config.storage;
    this.walletIntegration = config.walletIntegration;
    this.security = config.security || { enableSignatures: true };
  }

  /**
   * Initialize the PassKit node
   */
  async initialize(): Promise<void> {
    this.logEvent('PassKit node initializing', {
      organization: this.organizationInfo,
      domains: this.organizationInfo.domains,
    });

    this.setupPassKitHandlers();

    // Initialize storage if configured
    if (this.storage) {
      await this.initializeStorage();
    }

    this.logEvent('PassKit node initialized', { id: this.identity.id });
  }

  /**
   * Process PassKit tasks
   */
  async processTask(task: any): Promise<any> {
    const { type, data } = task;

    switch (type) {
      case 'create-pass':
        return this.createPass(data);
      case 'update-pass':
        return this.updatePass(data);
      case 'revoke-pass':
        return this.revokePass(data);
      case 'validate-access':
        return this.validateAccess(data);
      case 'get-pass':
        return this.getPass(data.passId);
      case 'get-statistics':
        return this.getStatistics(data.domain);
      case 'scan-pass':
        return this.scanPass(data);
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  /**
   * Get node status
   */
  getStatus(): Record<string, any> {
    const passesByDomain: Record<string, number> = {};
    const passesByStatus: Record<string, number> = {};

    this.passes.forEach(pass => {
      passesByDomain[pass.domain] = (passesByDomain[pass.domain] || 0) + 1;
      passesByStatus[pass.status] = (passesByStatus[pass.status] || 0) + 1;
    });

    return {
      organization: this.organizationInfo,
      totalPasses: this.passes.size,
      totalAccessRules: this.accessRules.size,
      totalScans: Array.from(this.scanLogs.values()).reduce((sum, logs) => sum + logs.length, 0),
      passesByDomain,
      passesByStatus,
      activeZones: this.zoneOccupancy.size,
    };
  }

  /**
   * Create a new pass
   */
  async createPass(request: CreatePassRequest): Promise<Pass> {
    const passId = uuidv4();
    const now = new Date();

    // Generate QR payload
    const qrPayload: QRPayload = {
      namespace: request.domain,
      type: this.inferQRType(request.passType),
      id: passId,
      scopes: this.generateScopes(request.zones),
      issuedAt: now,
      expiresAt: request.validity.validTo,
      nonce: this.security.enableSignatures ? uuidv4() : undefined,
    };

    // Sign QR payload if security enabled
    if (this.security.enableSignatures && this.security.signingKey) {
      qrPayload.signature = await this.signPayload(qrPayload, this.security.signingKey);
    }

    // Generate QR code image/SVG
    const qrCode = request.generateQR !== false
      ? await this.generateQRCode(qrPayload)
      : undefined;

    // Create pass
    const pass: Pass = {
      passId,
      domain: request.domain,
      passType: request.passType,
      holder: request.holder,
      validity: request.validity,
      zones: request.zones,
      qrPayload,
      qrCode,
      branding: this.mergeBranding(request.branding),
      status: 'active',
      createdAt: now,
      updatedAt: now,
      metadata: request.metadata,
    };

    // Generate wallet passes if requested
    if (request.generateAppleWallet && this.walletIntegration?.appleWallet) {
      pass.appleWalletUrl = await this.generateAppleWalletPass(pass);
    }

    if (request.generateGoogleWallet && this.walletIntegration?.googleWallet) {
      pass.googleWalletUrl = await this.generateGoogleWalletPass(pass);
    }

    if (request.generatePDF) {
      pass.pdfUrl = await this.generatePDFPass(pass);
    }

    // Store pass
    this.passes.set(passId, pass);
    this.scanLogs.set(passId, []);

    this.remember('data', { pass }, ['pass', 'created', request.domain], 8);

    this.logEvent('Pass created', {
      passId,
      domain: request.domain,
      passType: request.passType,
      holder: request.holder.name,
    });

    return pass;
  }

  /**
   * Update an existing pass
   */
  async updatePass(request: UpdatePassRequest): Promise<Pass> {
    const pass = this.passes.get(request.passId);

    if (!pass) {
      throw new Error(`Pass not found: ${request.passId}`);
    }

    // Apply updates
    if (request.updates.status) {
      pass.status = request.updates.status;
    }

    if (request.updates.validity) {
      pass.validity = { ...pass.validity, ...request.updates.validity };
    }

    if (request.updates.zones) {
      pass.zones = request.updates.zones;
      // Regenerate QR with new scopes
      pass.qrPayload.scopes = this.generateScopes(request.updates.zones);
      pass.qrCode = await this.generateQRCode(pass.qrPayload);
    }

    if (request.updates.metadata) {
      pass.metadata = { ...pass.metadata, ...request.updates.metadata };
    }

    pass.updatedAt = new Date();
    pass.lastModifiedBy = request.updatedBy;

    this.passes.set(pass.passId, pass);

    this.remember('data', { passUpdate: request }, ['pass', 'updated'], 7);

    this.logEvent('Pass updated', {
      passId: pass.passId,
      updates: request.updates,
      reason: request.reason,
    });

    // Send push notification if wallet pass exists
    if (pass.appleWalletUrl || pass.googleWalletUrl) {
      await this.sendPassUpdateNotification(pass);
    }

    return pass;
  }

  /**
   * Revoke a pass
   */
  async revokePass(request: RevokePassRequest): Promise<Pass> {
    const pass = this.passes.get(request.passId);

    if (!pass) {
      throw new Error(`Pass not found: ${request.passId}`);
    }

    pass.status = 'revoked';
    pass.updatedAt = new Date();
    pass.lastModifiedBy = request.revokedBy;
    pass.metadata = {
      ...pass.metadata,
      revocationReason: request.reason,
      revokedAt: new Date(),
      revokedBy: request.revokedBy,
    };

    this.passes.set(pass.passId, pass);

    this.remember('data', { passRevocation: request }, ['pass', 'revoked'], 9);

    this.logEvent('Pass revoked', {
      passId: pass.passId,
      reason: request.reason,
      revokedBy: request.revokedBy,
    });

    // Notify holder if requested
    if (request.notifyHolder) {
      await this.notifyPassHolder(pass, 'revoked', request.reason);
    }

    return pass;
  }

  /**
   * Validate access based on pass and zone
   */
  async validateAccess(request: ValidatePassRequest): Promise<AccessValidationResult> {
    const pass = this.passes.get(request.passId);

    if (!pass) {
      return {
        allowed: false,
        reason: 'Pass not found',
      };
    }

    // Check pass status
    if (pass.status !== 'active') {
      return {
        allowed: false,
        reason: `Pass is ${pass.status}`,
      };
    }

    // Check validity period
    const now = request.scannedAt || new Date();
    if (now < pass.validity.validFrom || now > pass.validity.validTo) {
      return {
        allowed: false,
        reason: 'Pass expired or not yet valid',
      };
    }

    // Check zone access
    const zone = pass.zones.find(z => z.id === request.zoneId);
    if (!zone) {
      return {
        allowed: false,
        reason: 'Zone not authorized for this pass',
      };
    }

    // Check time restrictions
    if (pass.validity.allowedDays) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = dayNames[now.getDay()];
      if (!pass.validity.allowedDays.includes(currentDay as any)) {
        return {
          allowed: false,
          reason: `Access not allowed on ${currentDay}`,
        };
      }
    }

    if (pass.validity.allowedTimeRanges) {
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const inAllowedRange = pass.validity.allowedTimeRanges.some(
        range => currentTime >= range.start && currentTime <= range.end
      );

      if (!inAllowedRange) {
        return {
          allowed: false,
          reason: 'Outside allowed time range',
        };
      }
    }

    // Check usage limits
    if (pass.validity.maxScans) {
      const currentScans = pass.validity.currentScans || 0;
      if (currentScans >= pass.validity.maxScans) {
        return {
          allowed: false,
          reason: 'Maximum scan limit reached',
        };
      }
    }

    // Check zone capacity
    if (zone.restrictions?.maxOccupancy) {
      const currentOccupancy = this.zoneOccupancy.get(request.zoneId) || 0;
      if (currentOccupancy >= zone.restrictions.maxOccupancy) {
        return {
          allowed: false,
          reason: 'Zone at maximum capacity',
        };
      }
    }

    // Check zone-specific restrictions
    const restrictions: string[] = [];
    if (zone.restrictions?.requiresEscort) {
      restrictions.push('Escort required');
    }
    if (zone.restrictions?.requiresPreAuth) {
      restrictions.push('Pre-authorization required');
    }

    // Access allowed!
    return {
      allowed: true,
      restrictions: restrictions.length > 0 ? restrictions : undefined,
      metadata: {
        passType: pass.passType,
        holderName: pass.holder.name,
        zoneName: zone.name,
      },
    };
  }

  /**
   * Scan a pass (validate + log)
   */
  async scanPass(request: ValidatePassRequest): Promise<AccessValidationResult> {
    const result = await this.validateAccess(request);

    // Log the scan
    const scanLog: ScanLog = {
      logId: uuidv4(),
      passId: request.passId,
      scannedAt: request.scannedAt || new Date(),
      scannedBy: request.scannedBy,
      location: request.location,
      zoneId: request.zoneId,
      result,
    };

    const logs = this.scanLogs.get(request.passId) || [];
    logs.push(scanLog);
    this.scanLogs.set(request.passId, logs);

    // Update scan count
    if (result.allowed) {
      const pass = this.passes.get(request.passId);
      if (pass) {
        pass.validity.currentScans = (pass.validity.currentScans || 0) + 1;

        // Update zone occupancy
        if (request.zoneId) {
          this.zoneOccupancy.set(
            request.zoneId,
            (this.zoneOccupancy.get(request.zoneId) || 0) + 1
          );
        }
      }
    }

    this.remember('event', { scan: scanLog }, ['scan', 'access'], 6);

    return result;
  }

  /**
   * Get a pass by ID
   */
  getPass(passId: string): Pass | null {
    return this.passes.get(passId) || null;
  }

  /**
   * Get statistics for a domain
   */
  getStatistics(domain?: PassDomain): PassStatistics {
    const filteredPasses = domain
      ? Array.from(this.passes.values()).filter(p => p.domain === domain)
      : Array.from(this.passes.values());

    const byType: Record<PassType, number> = {} as any;
    const byStatus: Record<PassStatus, number> = {} as any;
    const scansByZone: Record<string, number> = {};
    const scansByHour: Record<string, number> = {};

    let totalScans = 0;
    const uniquePassesScanned = new Set<string>();

    filteredPasses.forEach(pass => {
      byType[pass.passType] = (byType[pass.passType] || 0) + 1;
      byStatus[pass.status] = (byStatus[pass.status] || 0) + 1;

      // Process scan logs
      const logs = this.scanLogs.get(pass.passId) || [];
      logs.forEach(log => {
        totalScans++;
        uniquePassesScanned.add(pass.passId);

        if (log.zoneId) {
          scansByZone[log.zoneId] = (scansByZone[log.zoneId] || 0) + 1;
        }

        const hour = log.scannedAt.getHours().toString().padStart(2, '0');
        scansByHour[hour] = (scansByHour[hour] || 0) + 1;
      });
    });

    return {
      domain: domain || ('all' as any),
      totalPasses: filteredPasses.length,
      activepasses: filteredPasses.filter(p => p.status === 'active').length,
      expiredPasses: filteredPasses.filter(p => p.status === 'expired').length,
      revokedPasses: filteredPasses.filter(p => p.status === 'revoked').length,
      byType,
      byStatus,
      scanActivity: {
        totalScans,
        uniquePasses: uniquePassesScanned.size,
        avgScansPerPass: uniquePassesScanned.size > 0 ? totalScans / uniquePassesScanned.size : 0,
        scansByZone,
        scansByHour,
      },
    };
  }

  /**
   * Initialize storage provider
   */
  private async initializeStorage(): Promise<void> {
    // TODO: Implement storage initialization based on provider
    this.logEvent('Storage initialized', { provider: this.storage?.provider });
  }

  /**
   * Generate QR code from payload
   */
  private async generateQRCode(payload: QRPayload): Promise<string> {
    return PassGenerator.generateQRCode(payload, {
      format: 'dataurl',
      size: 256,
      errorCorrection: 'H',
    });
  }

  /**
   * Sign QR payload
   */
  private async signPayload(payload: QRPayload, signingKey: string): Promise<string> {
    return PassGenerator.signPayload(payload, signingKey);
  }

  /**
   * Generate Apple Wallet pass
   */
  private async generateAppleWalletPass(pass: Pass): Promise<string> {
    if (!this.walletIntegration?.appleWallet) {
      return `https://passes.ada-ecosystem.com/apple/${pass.passId}.pkpass`;
    }

    try {
      const { passUrl } = await PassGenerator.generateAppleWalletPass(pass, {
        teamId: this.walletIntegration.appleWallet.teamId,
        passTypeId: this.walletIntegration.appleWallet.passTypeId,
        organizationName: this.organizationInfo.name,
        certificatePath: this.walletIntegration.appleWallet.certificatePath,
      });

      return passUrl;
    } catch (error) {
      console.error('Apple Wallet pass generation failed:', error);
      return `https://passes.ada-ecosystem.com/apple/${pass.passId}.pkpass`;
    }
  }

  /**
   * Generate Google Wallet pass
   */
  private async generateGoogleWalletPass(pass: Pass): Promise<string> {
    if (!this.walletIntegration?.googleWallet) {
      return `https://passes.ada-ecosystem.com/google/${pass.passId}`;
    }

    try {
      const { passUrl } = await PassGenerator.generateGoogleWalletPass(pass, {
        issuerId: this.walletIntegration.googleWallet.issuerId,
        classId: 'ada-universal-pass',
        serviceAccountKeyPath: this.walletIntegration.googleWallet.serviceAccountPath,
      });

      return passUrl;
    } catch (error) {
      console.error('Google Wallet pass generation failed:', error);
      return `https://passes.ada-ecosystem.com/google/${pass.passId}`;
    }
  }

  /**
   * Generate PDF pass
   */
  private async generatePDFPass(pass: Pass): Promise<string> {
    try {
      const { pdfUrl } = await PassGenerator.generatePDFPass(pass);
      return pdfUrl;
    } catch (error) {
      console.error('PDF pass generation failed:', error);
      return `https://passes.ada-ecosystem.com/pdf/${pass.passId}.pdf`;
    }
  }

  /**
   * Send pass update notification (for wallet passes)
   */
  private async sendPassUpdateNotification(pass: Pass): Promise<void> {
    // TODO: Implement push notification to Apple/Google Wallet
    this.logEvent('Pass update notification sent', { passId: pass.passId });
  }

  /**
   * Notify pass holder
   */
  private async notifyPassHolder(pass: Pass, event: string, message: string): Promise<void> {
    // TODO: Implement email/SMS notification
    this.logEvent('Pass holder notified', {
      passId: pass.passId,
      holder: pass.holder.email || pass.holder.phone,
      event,
      message,
    });
  }

  /**
   * Merge branding with defaults
   */
  private mergeBranding(branding?: Partial<PassBranding>): PassBranding {
    return {
      organizationName: this.organizationInfo.name,
      organizationId: this.organizationInfo.organizationId,
      primaryColor: '#3C414C',
      secondaryColor: '#FFFFFF',
      textColor: '#FFFFFF',
      backgroundColor: '#3C414C',
      template: 'modern',
      ...branding,
    };
  }

  /**
   * Infer QR type from pass type
   */
  private inferQRType(passType: PassType): QRPayload['type'] {
    if (passType.includes('BOARDING') || passType.includes('PASS')) return 'boarding';
    if (passType.includes('ACCESS') || passType.includes('BADGE')) return 'access';
    if (passType.includes('VOUCHER') || passType.includes('RESERVATION')) return 'redemption';
    return 'identity';
  }

  /**
   * Generate scopes from zones
   */
  private generateScopes(zones: PassZone[]): string[] {
    return zones.map(z => `zone:${z.id}`);
  }

  /**
   * Setup PassKit message handlers
   */
  private setupPassKitHandlers(): void {
    this.communication.onMessage('create-pass', async (message) => {
      return this.createPass(message.payload as CreatePassRequest);
    });

    this.communication.onMessage('validate-access', async (message) => {
      return this.validateAccess(message.payload as ValidatePassRequest);
    });

    this.communication.onMessage('get-pass', async (message) => {
      const { passId } = message.payload;
      return this.getPass(passId);
    });

    this.communication.onMessage('get-statistics', async (message) => {
      const { domain } = message.payload;
      return this.getStatistics(domain);
    });

    this.communication.onMessage('scan-pass', async (message) => {
      return this.scanPass(message.payload as ValidatePassRequest);
    });
  }
}
