/**
 * AdaMarinaPrivacyIntegration - Privacy-safe marina communication
 *
 * Demonstrates how Ada.sea communicates with Ada.marina while respecting
 * the zero-trust privacy model. Every data transfer requires captain approval.
 */

import { PrivacyCore } from './PrivacyCore.js';
import { DataCategory } from './PrivacyTypes.js';

export interface MarinaReservationRequest {
  marinaId: string;
  marinaName: string;
  vesselName: string;
  vesselLength: number;
  vesselBeam: number;
  vesselDraft: number;
  arrivalDate: Date;
  departureDate: Date;
  durationNights: number;
  services?: string[];
  specialRequirements?: string;
}

export interface MarinaCheckInRequest {
  marinaId: string;
  marinaName: string;
  vesselName: string;
  berthNumber: string;
  currentPosition: {
    latitude: number;
    longitude: number;
  };
  eta?: string;
}

export class AdaMarinaPrivacyIntegration {
  constructor(private privacyCore: PrivacyCore) {
    // Setup privacy event listeners
    this.setupPrivacyHandlers();
  }

  /**
   * Request berth reservation (requires captain approval)
   */
  async requestBerthReservation(
    request: MarinaReservationRequest
  ): Promise<{ success: boolean; reservationId?: string; reason?: string }> {
    // Prepare minimal data for marina
    const minimalData = {
      vessel_name: request.vesselName,
      vessel_length: request.vesselLength,
      vessel_beam: request.vesselBeam,
      vessel_draft: request.vesselDraft,
      arrival_date: request.arrivalDate,
      departure_date: request.departureDate,
      duration_nights: request.durationNights,
      services: request.services || [],
    };

    // Request permission from captain
    const result = await this.privacyCore.requestDataTransfer({
      destination: request.marinaName,
      purpose: `Berth rezervasyonu için ${request.marinaName}`,
      dataType: ['vessel_specifications', 'arrival_time'] as DataCategory[],
      data: minimalData,
      classificationLevel: 'RESTRICTED',
      size: JSON.stringify(minimalData).length,
      requiresApproval: true,
    });

    if (!result.success) {
      return {
        success: false,
        reason: result.reason || 'Captain denied permission',
      };
    }

    // IMPORTANT: We would send the data here
    // For now, just simulate success
    return {
      success: true,
      reservationId: `RES-${Date.now()}`,
    };
  }

  /**
   * Check-in to marina (requires captain approval)
   */
  async checkInToMarina(
    request: MarinaCheckInRequest
  ): Promise<{ success: boolean; reason?: string }> {
    // Prepare check-in data
    const checkInData = {
      vessel_name: request.vesselName,
      berth_number: request.berthNumber,
      current_position: request.currentPosition, // IMPORTANT: Only current position, NOT history
      eta: request.eta,
    };

    // Request permission from captain
    const result = await this.privacyCore.requestDataTransfer({
      destination: request.marinaName,
      purpose: `${request.marinaName} check-in`,
      dataType: ['current_position', 'vessel_specifications'] as DataCategory[],
      data: checkInData,
      classificationLevel: 'RESTRICTED',
      size: JSON.stringify(checkInData).length,
      requiresApproval: true,
    });

    if (!result.success) {
      return {
        success: false,
        reason: result.reason || 'Captain denied permission',
      };
    }

    return {
      success: true,
    };
  }

  /**
   * Share vessel specifications only (no location, no personal data)
   */
  async shareVesselSpecifications(
    marinaId: string,
    marinaName: string,
    vesselSpecs: {
      length: number;
      beam: number;
      draft: number;
      type: string;
    }
  ): Promise<{ success: boolean; reason?: string }> {
    // This is RESTRICTED data - requires captain approval
    const result = await this.privacyCore.requestDataTransfer({
      destination: marinaName,
      purpose: `Tekne özellikleri paylaşımı - ${marinaName}`,
      dataType: ['vessel_specifications'] as DataCategory[],
      data: vesselSpecs,
      classificationLevel: 'RESTRICTED',
      size: JSON.stringify(vesselSpecs).length,
      requiresApproval: true,
    });

    return {
      success: result.success,
      reason: result.reason,
    };
  }

  /**
   * Anonymous anchorage rating (no approval needed)
   */
  async submitAnonymousAnchorageRating(
    location: string,
    rating: {
      holding: number; // 1-5
      shelter: number; // 1-5
      depth: number; // meters
      seabed: string;
      comments?: string;
    }
  ): Promise<{ success: boolean }> {
    // This is ANONYMOUS data - can auto-share
    const anonymousRating = {
      location,
      rating,
      timestamp: new Date(),
      // NO vessel identification
      // NO captain name
      // NO GPS history
    };

    const result = await this.privacyCore.requestDataTransfer({
      destination: 'Ada.marina Anchorage Database',
      purpose: 'Anonim demir yeri değerlendirmesi',
      dataType: ['anchorage_ratings'] as DataCategory[],
      data: anonymousRating,
      classificationLevel: 'ANONYMOUS',
      size: JSON.stringify(anonymousRating).length,
      requiresApproval: false, // ANONYMOUS doesn't require approval
    });

    return {
      success: result.success,
    };
  }

  /**
   * Create standing permission for frequent marina
   */
  async createStandingPermissionForMarina(
    marinaName: string,
    dataTypes: DataCategory[],
    expiresInDays?: number
  ): Promise<{ success: boolean; permissionId?: string; reason?: string }> {
    try {
      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;

      const permission = this.privacyCore.createStandingPermission(
        marinaName,
        dataTypes,
        `Otomatik berth reservation için ${marinaName}`,
        expiresAt,
        ['only_for_berth_reservation']
      );

      return {
        success: true,
        permissionId: permission.id,
      };
    } catch (error) {
      return {
        success: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Example: West Istanbul Marina scenario
   */
  async westIstanbulMarinaScenario(): Promise<void> {
    console.log('\n=== West Istanbul Marina Check-in Scenario ===\n');

    // Captain says: "Ada, West Istanbul Marina'ya check-in yap"

    // 1. Ada asks for permission
    console.log('Ada.sea: "Marina\'ya şu bilgileri göndermem gerekiyor:');
    console.log('         - Tekne: Phisedelia');
    console.log('         - Uzunluk: 65 feet');
    console.log('         - Berth: C-42');
    console.log('         Onaylıyor musunuz?"\n');

    // 2. Simulate captain approval (in real system, this would be voice/UI)
    // Captain: "Evet"

    // 3. Execute check-in with minimal data
    const result = await this.checkInToMarina({
      marinaId: 'west-istanbul-marina',
      marinaName: 'West Istanbul Marina',
      vesselName: 'Phisedelia',
      berthNumber: 'C-42',
      currentPosition: {
        latitude: 40.9872,
        longitude: 29.0872,
      },
    });

    if (result.success) {
      console.log('Ada.sea: ✓ "Check-in tamamlandı."\n');
      console.log('[INTERNALLY LOGGED]');
      console.log('- Sent: vessel_name, berth_number, current_position');
      console.log('- NOT sent: GPS history, crew info, financial data');
      console.log('- Captain approved: voice_confirmation');
      console.log('- Timestamp:', new Date().toISOString());
    } else {
      console.log('Ada.sea: ✗ "Check-in başarısız:', result.reason, '"');
    }
  }

  /**
   * Setup privacy event handlers
   */
  private setupPrivacyHandlers(): void {
    // Log all permission requests
    this.privacyCore.on('consent:required', (event) => {
      console.log('\n🔒 [PRIVACY] Captain consent required:');
      console.log(`   Destination: ${event.request.destination}`);
      console.log(`   Purpose: ${event.request.purpose}`);
      console.log(`   Data types: ${event.request.dataType.join(', ')}`);
      console.log(`   Requires voice: ${event.requiresVoice}`);
    });

    // Log all granted permissions
    this.privacyCore.on('privacy:permission-granted', (event) => {
      console.log('\n✓ [PRIVACY] Permission granted:');
      console.log(`   Request ID: ${event.requestId}`);
      console.log(`   Destination: ${event.destination}`);
      console.log(`   Method: ${event.method}`);
    });

    // Log all denied permissions
    this.privacyCore.on('privacy:permission-denied', (event) => {
      console.log('\n✗ [PRIVACY] Permission denied:');
      console.log(`   Request ID: ${event.requestId}`);
      console.log(`   Destination: ${event.destination}`);
    });

    // Log all data transfers
    this.privacyCore.on('data:transfer', (event) => {
      console.log('\n📤 [PRIVACY] Data transferred:');
      console.log(`   To: ${event.destination}`);
      console.log(`   Data types: ${event.dataType.join(', ')}`);
      console.log(`   Bytes: ${event.log.bytesSent}`);
      console.log(`   Authorization: ${event.log.captainAuthorization.method}`);
    });
  }

  /**
   * Get privacy core instance (for captain UI)
   */
  getPrivacyCore(): PrivacyCore {
    return this.privacyCore;
  }
}
