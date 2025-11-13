/**
 * Privacy Types - Ada.sea Zero-Trust Data Privacy Framework
 * CRITICAL: No data leaves the vessel without explicit captain authorization
 */

export type DataClassificationLevel =
  | 'PRIVATE'        // NEVER share without explicit command
  | 'RESTRICTED'     // Share only essential with captain approval
  | 'CONDITIONAL'    // Can share with captain consent
  | 'ANONYMOUS';     // Anonymous/aggregated only

export type ConsentMethod =
  | 'voice'          // Voice confirmation
  | 'manual'         // Manual UI confirmation
  | 'standing';      // Standing permission (pre-approved)

export type DataCategory =
  // PRIVATE (Level 0) - Never share automatically
  | 'gps_history'
  | 'communication_logs'
  | 'financial_data'
  | 'crew_personal_info'
  | 'passenger_personal_info'
  | 'sensor_raw_data'
  | 'security_cameras'
  | 'passwords'
  | 'api_keys'
  // RESTRICTED (Level 1) - Only essential with approval
  | 'current_position'
  | 'vessel_specifications'
  | 'arrival_time'
  | 'contact_info'
  // CONDITIONAL (Level 2) - With captain consent
  | 'weather_preferences'
  | 'route_planning_style'
  | 'fuel_consumption_stats'
  | 'maintenance_schedule'
  // ANONYMOUS (Level 3) - Anonymous only
  | 'anchorage_ratings'
  | 'weather_reports';

export interface DataTransferRequest {
  id: string;
  timestamp: Date;
  destination: string;           // Where data is being sent
  purpose: string;               // Why we need to send it
  dataType: DataCategory[];      // What type of data
  data: any;                     // The actual data
  classificationLevel: DataClassificationLevel;
  size: number;                  // Data size in bytes
  requiresApproval: boolean;     // Does this need captain approval?
}

export interface CaptainPermission {
  requestId: string;
  granted: boolean;
  captainId: string;
  method: ConsentMethod;
  timestamp: Date;
  scope: string[];               // Which fields were approved
  confirmationText?: string;     // Voice/text confirmation
  expiresAt?: Date;             // For standing permissions
  conditions?: string[];         // Any conditions on the permission
}

export interface DataTransferLog {
  id: string;
  timestamp: Date;
  destination: string;
  dataType: DataCategory[];
  dataSummary: string;           // Summary, NOT full data
  dataHash: string;              // Hash for verification
  captainAuthorization: {
    method: ConsentMethod;
    captainId: string;
    confirmationText?: string;
  };
  result: 'success' | 'denied' | 'failed';
  errorMessage?: string;
  bytesSent?: number;
}

export interface StandingPermission {
  id: string;
  destination: string;           // e.g., "ada.marina", "Yalikavak Marina"
  dataTypes: DataCategory[];     // What can be shared
  purpose: string;
  createdAt: Date;
  expiresAt?: Date;
  captainId: string;
  active: boolean;
  conditions?: string[];         // e.g., "only during check-in"
  usageCount: number;
  lastUsed?: Date;
}

export interface PrivacySettings {
  captainId: string;

  // Global settings
  autoShareDisabled: boolean;    // Master switch - all sharing requires approval
  cloudSyncEnabled: boolean;     // Cloud backup on/off
  zeroKnowledgeMode: boolean;    // E2E encryption for cloud

  // Notification preferences
  notifyOnEveryShare: boolean;
  notifyOnlyHighRisk: boolean;

  // Data retention
  logRetentionDays: number;      // How long to keep audit logs
  autoDeleteTransferLogs: boolean;

  // Standing permissions
  standingPermissions: StandingPermission[];

  // Blocked destinations
  blockedDestinations: string[];

  // Anonymous mode
  anonymousModeEnabled: boolean; // Never send identifiable info
}

export interface PrivacyAuditReport {
  period: {
    from: Date;
    to: Date;
  };
  summary: {
    totalTransfers: number;
    approvedTransfers: number;
    deniedTransfers: number;
    failedTransfers: number;
    totalBytesShared: number;
  };
  byDestination: Map<string, {
    count: number;
    dataTypes: DataCategory[];
    lastTransfer: Date;
  }>;
  byDataType: Map<DataCategory, number>;
  transfers: DataTransferLog[];
}

export interface VoiceConsentPrompt {
  promptText: string;            // Text to speak to captain (in Turkish)
  expectedResponses: {
    approve: string[];           // e.g., ["evet", "tamam", "paylaş"]
    deny: string[];              // e.g., ["hayır", "iptal", "gönderme"]
  };
  timeout: number;               // Seconds to wait for response
  language: 'tr' | 'en' | 'el';
}

export const DataPolicyRules: Record<DataClassificationLevel, {
  autoShareAllowed: boolean;
  requiresApproval: boolean;
  requiresVoiceConfirmation: boolean;
  canHaveStandingPermission: boolean;
  anonymizeRequired: boolean;
}> = {
  'PRIVATE': {
    autoShareAllowed: false,
    requiresApproval: true,
    requiresVoiceConfirmation: true,
    canHaveStandingPermission: false,
    anonymizeRequired: false, // Don't share at all unless captain commands
  },
  'RESTRICTED': {
    autoShareAllowed: false,
    requiresApproval: true,
    requiresVoiceConfirmation: false, // Can use UI confirmation
    canHaveStandingPermission: true,
    anonymizeRequired: false,
  },
  'CONDITIONAL': {
    autoShareAllowed: false,
    requiresApproval: true,
    requiresVoiceConfirmation: false,
    canHaveStandingPermission: true,
    anonymizeRequired: false,
  },
  'ANONYMOUS': {
    autoShareAllowed: true,      // Can auto-share if anonymized
    requiresApproval: false,
    requiresVoiceConfirmation: false,
    canHaveStandingPermission: true,
    anonymizeRequired: true,      // MUST anonymize
  },
};

export const DataCategoryClassification: Record<DataCategory, DataClassificationLevel> = {
  // PRIVATE
  'gps_history': 'PRIVATE',
  'communication_logs': 'PRIVATE',
  'financial_data': 'PRIVATE',
  'crew_personal_info': 'PRIVATE',
  'passenger_personal_info': 'PRIVATE',
  'sensor_raw_data': 'PRIVATE',
  'security_cameras': 'PRIVATE',
  'passwords': 'PRIVATE',
  'api_keys': 'PRIVATE',

  // RESTRICTED
  'current_position': 'RESTRICTED',
  'vessel_specifications': 'RESTRICTED',
  'arrival_time': 'RESTRICTED',
  'contact_info': 'RESTRICTED',

  // CONDITIONAL
  'weather_preferences': 'CONDITIONAL',
  'route_planning_style': 'CONDITIONAL',
  'fuel_consumption_stats': 'CONDITIONAL',
  'maintenance_schedule': 'CONDITIONAL',

  // ANONYMOUS
  'anchorage_ratings': 'ANONYMOUS',
  'weather_reports': 'ANONYMOUS',
};
