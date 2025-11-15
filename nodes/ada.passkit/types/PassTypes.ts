/**
 * PassTypes - Domain-agnostic pass type definitions
 *
 * Universal pass model that can be used by:
 * - ada.congress (conference badges, speaker passes)
 * - ada.travel (boarding passes, hotel vouchers)
 * - ada.sea (yacht boarding, marina access)
 * - ada.marina (berth passes, facility access)
 * - ada.interpreter (language selection passes)
 */

// ============================================================================
// CORE PASS MODEL
// ============================================================================

export type PassDomain =
  | 'ada.congress'
  | 'ada.travel'
  | 'ada.sea'
  | 'ada.marina'
  | 'ada.interpreter'
  | 'ada.restaurant'
  | 'ada.maintenance';

export type PassType =
  // Congress types
  | 'CONGRESS_BADGE'
  | 'SPEAKER_PASS'
  | 'VIP_PASS'
  | 'STAFF_PASS'
  | 'PRESS_PASS'

  // Travel types
  | 'BOARDING_PASS'
  | 'HOTEL_VOUCHER'
  | 'TOUR_TICKET'
  | 'TRANSFER_VOUCHER'

  // Marine types
  | 'YACHT_BOARDING'
  | 'MARINA_ACCESS'
  | 'BERTH_PASS'
  | 'FACILITY_ACCESS'
  | 'GUEST_PASS'

  // Interpreter types
  | 'LANGUAGE_PASS'
  | 'LIVE_STREAM_ACCESS'

  // Restaurant types
  | 'DINING_RESERVATION'
  | 'MEAL_VOUCHER'

  // Generic
  | 'GENERIC_TICKET'
  | 'ACCESS_CARD';

export type PassStatus =
  | 'active'
  | 'pending'
  | 'expired'
  | 'revoked'
  | 'redeemed';

export interface PassHolder {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  company?: string;
  customFields?: Record<string, any>;
}

export interface PassValidity {
  validFrom: Date;
  validTo: Date;
  timezone?: string;

  // Time-based restrictions
  allowedDays?: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  allowedTimeRanges?: Array<{ start: string; end: string }>; // HH:mm format

  // Usage limits
  maxScans?: number;
  currentScans?: number;
  singleUse?: boolean;
}

export interface SeatInfo {
  section?: string; // Section (e.g., 'A', 'Balcony', 'VIP')
  row?: string; // Row (e.g., '12', 'K')
  seat?: string; // Seat number (e.g., '45', '12A')
  seatType?: 'standard' | 'vip' | 'accessible' | 'premium' | 'balcony';
  floor?: string; // Floor level (e.g., 'Ground', '1st Floor')
  gate?: string; // Entry gate (e.g., 'Gate A', 'West Entrance')
  entrance?: string; // Specific entrance

  // Additional details
  table?: string; // For dining (e.g., 'Table 7')
  booth?: string; // For exhibitions
  pier?: string; // For marine events
  deck?: string; // For yachts
  cabin?: string; // For ships/yachts
}

export interface PassZone {
  id: string;
  name: string;
  description?: string;

  // Seat assignment (for concerts, congresses, theaters, etc.)
  seatInfo?: SeatInfo;

  restrictions?: {
    requiresEscort?: boolean;
    maxOccupancy?: number;
    requiresPreAuth?: boolean;
  };
}

export interface QRPayload {
  namespace: PassDomain;
  type: 'access' | 'boarding' | 'payment' | 'identity' | 'redemption';
  id: string;
  scopes: string[];

  // Security
  signature?: string;
  nonce?: string;
  issuedAt?: Date;
  expiresAt?: Date;

  // Custom data
  metadata?: Record<string, any>;
}

export interface PassBranding {
  // Visual theme
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  backgroundColor?: string;

  // Logos & images
  logoUrl?: string;
  bannerUrl?: string;
  iconUrl?: string;

  // Organization
  organizationName?: string;
  organizationId?: string;

  // Template
  template?: 'modern' | 'classic' | 'minimal' | 'luxury';
}

export interface Pass {
  // Core identity
  passId: string;
  domain: PassDomain;
  passType: PassType;

  // Holder information
  holder: PassHolder;

  // Validity & access
  validity: PassValidity;
  zones: PassZone[];

  // QR code data
  qrPayload: QRPayload;
  qrCode?: string; // Base64 encoded QR image or SVG

  // Visual branding
  branding: PassBranding;

  // Status tracking
  status: PassStatus;
  createdAt: Date;
  updatedAt: Date;

  // Wallet integration
  appleWalletUrl?: string;
  googleWalletUrl?: string;
  pdfUrl?: string;

  // Audit trail
  createdBy?: string;
  lastModifiedBy?: string;

  // Additional metadata
  metadata?: Record<string, any>;
}

// ============================================================================
// ACCESS POLICY
// ============================================================================

export interface AccessRule {
  ruleId: string;
  passType: PassType;
  zoneId: string;

  // Time restrictions
  allowedDays?: string[];
  allowedTimeRanges?: Array<{ start: string; end: string }>;

  // Capacity restrictions
  maxOccupancy?: number;
  currentOccupancy?: number;

  // Authorization requirements
  requiresPreAuth?: boolean;
  requiresEscort?: boolean;
  escortRole?: string;

  // Conditions
  conditions?: Record<string, any>;
}

export interface AccessValidationResult {
  allowed: boolean;
  reason?: string;
  restrictions?: string[];
  metadata?: Record<string, any>;
}

export interface ScanLog {
  logId: string;
  passId: string;
  scannedAt: Date;
  scannedBy?: string;
  location?: string;
  zoneId?: string;
  result: AccessValidationResult;
  deviceInfo?: {
    deviceId?: string;
    deviceType?: string;
    appVersion?: string;
  };
}

// ============================================================================
// PASS CREATION REQUEST
// ============================================================================

export interface CreatePassRequest {
  domain: PassDomain;
  passType: PassType;
  holder: PassHolder;
  validity: PassValidity;
  zones: PassZone[];
  branding?: Partial<PassBranding>;
  metadata?: Record<string, any>;

  // Auto-generate QR?
  generateQR?: boolean;

  // Generate wallet passes?
  generateAppleWallet?: boolean;
  generateGoogleWallet?: boolean;
  generatePDF?: boolean;
}

export interface UpdatePassRequest {
  passId: string;
  updates: {
    status?: PassStatus;
    validity?: Partial<PassValidity>;
    zones?: PassZone[];
    metadata?: Record<string, any>;
  };
  reason?: string;
  updatedBy?: string;
}

export interface RevokePassRequest {
  passId: string;
  reason: string;
  revokedBy: string;
  notifyHolder?: boolean;
}

export interface ValidatePassRequest {
  passId: string;
  zoneId: string;
  scannedAt?: Date;
  scannedBy?: string;
  location?: string;
}

// ============================================================================
// STATISTICS
// ============================================================================

export interface PassStatistics {
  domain: PassDomain;
  totalPasses: number;
  activepasses: number;
  expiredPasses: number;
  revokedPasses: number;

  byType: Record<PassType, number>;
  byStatus: Record<PassStatus, number>;

  scanActivity: {
    totalScans: number;
    uniquePasses: number;
    avgScansPerPass: number;
    scansByZone: Record<string, number>;
    scansByHour: Record<string, number>;
  };
}

export default Pass;
