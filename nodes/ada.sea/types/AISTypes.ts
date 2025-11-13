/**
 * AIS (Automatic Identification System) Types
 * Legal maritime vessel identification and tracking
 */

/**
 * MMSI (Maritime Mobile Service Identity)
 * 9-digit unique identifier assigned by flag state
 * Format: MIDxxxxxx (MID = Maritime Identification Digits)
 *
 * Turkey MID: 271
 * Example: 271001234
 */
export type MMSI = string; // Must match /^[0-9]{9}$/

/**
 * IMO Number (International Maritime Organization)
 * 7-digit unique vessel identifier (permanent)
 * Format: IMO + 7 digits
 * Example: IMO1234567
 *
 * Required for:
 * - All vessels 100+ gross tonnage
 * - International voyages
 */
export type IMONumber = string; // Must match /^IMO[0-9]{7}$/

/**
 * Call Sign
 * Radio call sign assigned by flag state
 * Turkey: TC prefix (e.g., TCAB1234)
 */
export type CallSign = string;

/**
 * AIS Class
 * - Class A: Mandatory for commercial vessels (>300 GT)
 * - Class B: Recommended for recreational vessels (>15m)
 */
export enum AISClass {
  ClassA = 'A',  // 2-10 second updates, higher power
  ClassB = 'B',  // 30 second updates, lower power
}

/**
 * Navigation Status (from AIS)
 */
export enum NavigationStatus {
  Underway_Engine = 0,
  At_Anchor = 1,
  Not_Under_Command = 2,
  Restricted_Manoeuvrability = 3,
  Constrained_By_Draught = 4,
  Moored = 5,
  Aground = 6,
  Fishing = 7,
  Underway_Sailing = 8,
  Reserved_HSC = 9,
  Reserved_WIG = 10,
  Reserved_11 = 11,
  Reserved_12 = 12,
  Reserved_13 = 13,
  AIS_SART = 14,
  Not_Defined = 15,
}

/**
 * Ship Type (AIS vessel type codes)
 */
export enum ShipType {
  // Passenger ships
  Passenger = 60,
  Passenger_HSC = 61,

  // Cargo ships
  Cargo = 70,
  Cargo_HSC = 71,

  // Tankers
  Tanker = 80,
  Tanker_Hazardous_A = 81,
  Tanker_Hazardous_B = 82,
  Tanker_Hazardous_C = 83,
  Tanker_Hazardous_D = 84,

  // Yachts & pleasure craft
  Pleasure_Craft = 37,
  Sailing = 36,

  // Special purpose
  Fishing = 30,
  Towing = 31,
  Pilot_Vessel = 50,
  Search_And_Rescue = 51,
  Tug = 52,
  Port_Tender = 53,
  Medical_Transport = 58,

  // Other
  Other = 90,
  Unspecified = 0,
}

/**
 * Legal Vessel Identity
 * MANDATORY for all registered vessels
 */
export interface VesselLegalIdentity {
  // Primary identifiers (REQUIRED)
  mmsi: MMSI;                    // 9-digit MMSI
  imo: IMONumber;                // IMO number (if applicable)
  callSign: CallSign;            // Radio call sign
  name: string;                  // Vessel name (official registration)

  // Flag state & registration
  flagState: string;             // ISO 3166-1 alpha-3 (TUR, GRC, etc.)
  portOfRegistry: string;        // Home port
  registrationNumber: string;    // National registration number

  // Vessel classification
  vesselType: ShipType;          // AIS ship type code
  aisClass: AISClass;            // AIS transponder class

  // Dimensions (REQUIRED for AIS)
  length: number;                // Overall length (meters)
  beam: number;                  // Beam (meters)
  draft: number;                 // Draft (meters)
  height?: number;               // Height above waterline (for bridges)

  // Tonnage
  grossTonnage?: number;         // GT (International)
  netTonnage?: number;           // NT
  deadweight?: number;           // DWT (cargo capacity)

  // Dates
  builtYear: number;             // Year of construction
  registrationDate: Date;        // Registration date
  aisTransponderInstalled: Date; // AIS installation date

  // Compliance
  solasCompliant: boolean;       // SOLAS convention
  ispaCompliant?: boolean;       // International Ship and Port Facility Security
  marsecLevel?: number;          // Maritime Security Level (1-3)
}

/**
 * AIS Static Data (Message Type 5)
 * Transmitted every 6 minutes
 */
export interface AISStaticData {
  mmsi: MMSI;
  imo: IMONumber;
  callSign: CallSign;
  vesselName: string;
  shipType: ShipType;

  // Dimensions to reference point (antenna position)
  dimensionToBow: number;        // meters
  dimensionToStern: number;      // meters
  dimensionToPort: number;       // meters
  dimensionToStarboard: number;  // meters

  // Equipment
  positionFixType: number;       // GPS, DGPS, etc.
  eta: Date | null;              // Estimated Time of Arrival
  destination: string;           // Destination port
  draught: number;               // Current draught (meters)

  // Transmission
  lastUpdate: Date;
}

/**
 * AIS Dynamic Data (Message Types 1, 2, 3)
 * Transmitted every 2-10 seconds (Class A) or 30 seconds (Class B)
 */
export interface AISDynamicData {
  mmsi: MMSI;

  // Position
  latitude: number;              // -90 to 90
  longitude: number;             // -180 to 180
  positionAccuracy: boolean;     // true = DGPS, false = GPS

  // Movement
  sog: number;                   // Speed Over Ground (knots)
  cog: number;                   // Course Over Ground (degrees)
  heading: number;               // True heading (degrees)
  rateOfTurn: number;            // Degrees per minute

  // Status
  navigationStatus: NavigationStatus;

  // Transmission
  timestamp: Date;
  communicationState: number;
}

/**
 * AIS Target (Other vessels)
 */
export interface AISTarget {
  // Identity
  mmsi: MMSI;
  name?: string;
  callSign?: string;
  shipType?: ShipType;

  // Position & movement
  position: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };

  sog: number;                   // Speed Over Ground
  cog: number;                   // Course Over Ground
  heading: number;
  navigationStatus: NavigationStatus;

  // Dimensions (if available from static data)
  length?: number;
  beam?: number;

  // Collision risk
  cpa?: number;                  // Closest Point of Approach (nm)
  tcpa?: number;                 // Time to CPA (minutes)
  bcr?: number;                  // Bearing Change Rate (collision risk)

  // Tracking
  firstSeen: Date;
  lastSeen: Date;
  lost: boolean;                 // True if not seen for >timeout

  // Risk assessment
  collisionRisk: 'none' | 'low' | 'medium' | 'high' | 'critical';
  inAISAlarm?: boolean;          // CPA alarm triggered
}

/**
 * Collision Detection Parameters
 */
export interface CollisionDetectionConfig {
  // CPA (Closest Point of Approach) thresholds
  cpaWarningDistance: number;    // nm (e.g., 2.0)
  cpaAlarmDistance: number;      // nm (e.g., 1.0)
  cpaCriticalDistance: number;   // nm (e.g., 0.5)

  // TCPA (Time to CPA) thresholds
  tcpaWarningTime: number;       // minutes (e.g., 30)
  tcpaAlarmTime: number;         // minutes (e.g., 15)
  tcpaCriticalTime: number;      // minutes (e.g., 5)

  // Filtering
  ignoreStationaryTargets: boolean;  // Ignore targets with SOG < threshold
  stationaryThreshold: number;       // knots (e.g., 0.5)
  ignoreDistance: number;            // nm - ignore targets beyond this

  // Zones
  guardZone?: {                      // Custom guard zone (polygon)
    points: Array<{ lat: number; lon: number }>;
  };

  // Enabled
  enabled: boolean;
}

/**
 * AIS Collision Alert
 */
export interface AISCollisionAlert {
  id: string;
  timestamp: Date;
  severity: 'warning' | 'alarm' | 'critical';

  // Target information
  target: AISTarget;

  // Collision parameters
  cpa: number;                   // Closest Point of Approach (nm)
  tcpa: number;                  // Time to CPA (minutes)
  cpaPosition: {                 // Where CPA will occur
    latitude: number;
    longitude: number;
  };

  // Recommended action
  recommendation: string;        // "Alter course to starboard", etc.

  // Status
  acknowledged: boolean;
  dismissed: boolean;
}

/**
 * AIS Message Types
 */
export enum AISMessageType {
  PositionReportClassA = 1,      // Dynamic data (2-10s updates)
  PositionReportClassA_Assigned = 2,
  PositionReportClassA_Response = 3,
  BaseStationReport = 4,
  StaticVoyageData = 5,          // Static data (6 min updates)
  BinaryAddressedMessage = 6,
  BinaryAcknowledge = 7,
  BinaryBroadcastMessage = 8,
  StandardSARAircraftPosition = 9,
  UTCDateInquiry = 10,
  UTCDateResponse = 11,
  AddressedSafetyMessage = 12,
  SafetyAcknowledge = 13,
  SafetyBroadcastMessage = 14,
  Interrogation = 15,
  AssignmentMode = 16,
  GNSSBroadcastBinaryMessage = 17,
  StandardClassBPositionReport = 18,  // Class B position (30s updates)
  ExtendedClassBPositionReport = 19,
  DataLinkManagement = 20,
  AidToNavigationReport = 21,
  ChannelManagement = 22,
  GroupAssignment = 23,
  StaticDataReport = 24,         // Class B static data
  SingleSlotBinaryMessage = 25,
  MultipleSlotBinaryMessage = 26,
  LongRangeAISBroadcast = 27,
}

/**
 * AIS NMEA Sentence (for parsing)
 */
export interface AISNMEASentence {
  type: 'VDM' | 'VDO';           // VDM = received, VDO = own ship
  fragmentCount: number;         // Total fragments
  fragmentNumber: number;        // Current fragment
  messageId: number | null;      // Multi-sentence message ID
  channel: 'A' | 'B';            // AIS channel
  payload: string;               // Encoded AIS data
  fillBits: number;              // Padding bits
  checksum: string;              // NMEA checksum
  raw: string;                   // Original NMEA sentence
}
