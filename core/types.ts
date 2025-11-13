/**
 * Core types for the Ada Ecosystem
 * Each node type has its own domain-specific capabilities
 */

export type NodeType =
  | 'ada.sea'
  | 'ada.marina'
  | 'ada.travel'
  | 'ada.congress'
  | 'ada.finance'
  | 'ada.maintenance'
  | 'ada.weather'
  | 'ada.legal'
  | 'ada.hukuk'
  | 'ada.restaurant'
  | 'ada.customer';

export interface NodeIdentity {
  id: string;
  type: NodeType;
  name: string;
  createdAt: Date;
  parentId?: string; // For cloned nodes
  generation: number; // Clone generation (0 = original)
}

export interface NodeCapabilities {
  skills: string[];
  services: string[];
  integrations: string[];
}

export interface NodeMemoryEntry {
  id: string;
  timestamp: Date;
  type: 'conversation' | 'event' | 'data' | 'decision';
  content: any;
  tags: string[];
  importance: number; // 0-10
}

export interface NodeMessage {
  id: string;
  from: string; // Node ID
  to: string; // Node ID or 'broadcast'
  type: 'request' | 'response' | 'notification' | 'query';
  subject: string;
  payload: any;
  timestamp: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requiresResponse: boolean;
}

export interface NodeConfig {
  identity: NodeIdentity;
  capabilities: NodeCapabilities;
  settings: Record<string, any>;
  connections: string[]; // Other node IDs this node can communicate with
}

// Ada.Sea specific types
export interface NMEA2000Data {
  deviceId: string;
  pgn: number; // Parameter Group Number
  data: Buffer | any;
  timestamp: Date;
}

/**
 * VesselData - DEPRECATED
 * Use VesselLegalIdentity from nodes/ada.sea/types/AISTypes.ts instead
 *
 * This interface is kept for backward compatibility but should not be used for new code.
 * All vessels MUST have valid MMSI and IMO numbers for legal maritime operations.
 */
export interface VesselData {
  name: string;
  /** @deprecated MMSI is now REQUIRED - use VesselLegalIdentity */
  imo?: string;
  /** @deprecated IMO is now REQUIRED - use VesselLegalIdentity */
  mmsi?: string;
  length: number;
  beam: number;
  draft: number;
  type: string;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  license?: string;
  passport: string;
  visa?: VisaInfo;
  healthCertificate?: HealthDocument;
}

export interface PassengerInfo {
  id: string;
  name: string;
  passport: string;
  nationality: string;
  dateOfBirth: Date;
  visa?: VisaInfo;
  specialRequirements?: string[];
}

export interface VisaInfo {
  country: string;
  type: string;
  validFrom: Date;
  validUntil: Date;
  number: string;
}

export interface HealthDocument {
  type: string;
  issuedBy: string;
  issuedDate: Date;
  validUntil: Date;
  vaccinations?: string[];
}

export interface VoyagePlan {
  id: string;
  vesselId: string;
  departure: {
    marina: string;
    date: Date;
  };
  destination: {
    marina: string;
    estimatedArrival: Date;
  };
  waypoints: Waypoint[];
  crew: CrewMember[];
  passengers: PassengerInfo[];
}

export interface Waypoint {
  name: string;
  latitude: number;
  longitude: number;
  eta: Date;
}

// Ada.Marina specific types
export interface Berth {
  id: string;
  number: string;
  length: number;
  width: number;
  depth: number;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  amenities: string[];
  price: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
    currency: string;
  };
}

export interface MarinaReservation {
  id: string;
  berthId: string;
  vesselId: string;
  vesselName: string;
  contactNode?: string; // ada.sea node ID if AI-managed
  checkIn: Date;
  checkOut: Date;
  services: MarinaService[];
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  totalCost: number;
  currency: string;
}

export interface MarinaService {
  id: string;
  type: 'electricity' | 'water' | 'fuel' | 'maintenance' | 'cleaning' | 'security' | 'customs' | 'other';
  name: string;
  description: string;
  price: number;
  unit: string;
  available: boolean;
}

export interface MarinaContract {
  id: string;
  vesselId: string;
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate: Date;
  berthId: string;
  services: string[];
  terms: string;
  amount: number;
  currency: string;
  status: 'draft' | 'active' | 'expired' | 'terminated';
}

// Ada.Travel specific types
export interface TravelBooking {
  id: string;
  customerId: string;
  type: 'flight' | 'hotel' | 'tour' | 'package' | 'transport';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  details: any;
  totalPrice: number;
  currency: string;
  createdAt: Date;
}

export interface FlightBooking {
  pnr: string;
  airline: string;
  flightNumber: string;
  departure: {
    airport: string;
    date: Date;
  };
  arrival: {
    airport: string;
    date: Date;
  };
  passengers: PassengerInfo[];
  class: 'economy' | 'business' | 'first';
  price: number;
}

export interface HotelReservation {
  confirmationNumber: string;
  hotelName: string;
  address: string;
  checkIn: Date;
  checkOut: Date;
  rooms: {
    type: string;
    count: number;
    guests: string[];
  }[];
  price: number;
}

export interface TourPackage {
  id: string;
  name: string;
  description: string;
  duration: number; // days
  destinations: string[];
  included: string[];
  excluded: string[];
  price: number;
  maxParticipants: number;
}

// Ada.Congress specific types
export interface CongressEvent {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  venue: VenueInfo;
  expectedAttendees: number;
  status: 'planning' | 'registration-open' | 'ongoing' | 'completed';
}

export interface VenueInfo {
  name: string;
  address: string;
  capacity: number;
  facilities: string[];
  contactInfo: {
    name: string;
    phone: string;
    email: string;
  };
}

export interface Attendee {
  id: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  role: string;
  passportInfo?: {
    number: string;
    nationality: string;
    expiryDate: Date;
  };
  dietaryRequirements?: string[];
  specialNeeds?: string[];
}

export interface CongressItinerary {
  attendeeId: string;
  steps: ItineraryStep[];
  status: 'planned' | 'in-progress' | 'completed';
  applePassUrl?: string; // Apple PassKit QR code
}

export interface ItineraryStep {
  id: string;
  sequence: number;
  type: 'pickup' | 'flight' | 'transfer' | 'checkin' | 'session' | 'meal' | 'tour' | 'checkout' | 'dropoff';
  scheduledTime: Date;
  actualTime?: Date;
  location: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  details: any;
}

export interface CongressRegistration {
  id: string;
  eventId: string;
  attendee: Attendee;
  registrationDate: Date;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  amount: number;
  currency: string;
  packageType: 'standard' | 'premium' | 'vip';
  itinerary?: CongressItinerary;
}

// Communication protocol
export interface CommunicationProtocol {
  version: string;
  supportedMessageTypes: string[];
  encryption: boolean;
  authentication: boolean;
}

export interface NodeState {
  status: 'initializing' | 'active' | 'busy' | 'idle' | 'error' | 'offline';
  load: number; // 0-100
  lastActivity: Date;
  connectedNodes: string[];
  pendingMessages: number;
}

// VHF Radio Communication types (Ada.Sea)
export interface VHFChannel {
  channel: number;
  frequency: number; // MHz
  type: 'intership' | 'marina' | 'emergency' | 'port' | 'coast_guard' | 'dsc';
  name: string;
  description: string;
  simplex: boolean;
  txFrequency?: number; // For duplex channels
  rxFrequency?: number; // For duplex channels
}

export interface VHFTransmission {
  id: string;
  channel: number;
  frequency: number;
  timestamp: Date;
  duration: number; // seconds
  signalStrength: number; // dBm
  hasVoice: boolean;
  transcription?: string;
  classification: VHFMessageType;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export type VHFMessageType =
  | 'emergency'       // Ch 16 distress
  | 'intership'       // Ship-to-ship communication
  | 'marina'          // Marina working channel
  | 'port_ops'        // Port operations
  | 'coast_guard'     // Coast Guard
  | 'weather'         // Weather broadcast
  | 'safety'          // Safety navigation
  | 'unknown';

export interface VHFScannerConfig {
  priorityChannels: number[];
  scanIntervalMs: number;
  minSignalStrength: number; // dBm
  enableVAD: boolean;
  enableSTT: boolean;
  geographicMode: 'turkey' | 'international';
  autoTuneByLocation: boolean;
}

export interface VHFAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  channel: number;
  message: string;
  timestamp: Date;
  requiresAction: boolean;
  transmission?: VHFTransmission;
}

// Ada Observer Types - Intelligent vessel monitoring
export type VesselState =
  | 'pre-departure'
  | 'at-anchor'
  | 'anchored'
  | 'anchoring'
  | 'underway-sailing'
  | 'underway-motoring'
  | 'underway-motorsailing'
  | 'drifting'
  | 'docking'
  | 'docked'
  | 'moored'
  | 'engine-room-check'
  | 'off-season'
  | 'maintenance'
  | 'unknown';

export interface VesselStateContext {
  state: VesselState;
  timestamp: Date;
  position?: {
    latitude: number;
    longitude: number;
  };
  speed?: {
    sog: number; // Speed over ground (knots)
    stw: number; // Speed through water (knots)
  };
  heading?: {
    magnetic: number;
    true: number;
  };
  wind?: {
    apparentSpeed: number;
    apparentAngle: number;
    trueSpeed: number;
    trueAngle: number;
  };
  depth?: number;
  engineRunning?: boolean;
  sailsUp?: boolean;
  anchorDown?: boolean;
  confidence: number; // 0-100
}

export interface PrimaryNavigationData {
  heading: {
    magnetic: number;
    true: number;
  };
  wind: {
    apparentSpeed: number; // knots
    apparentAngle: number; // degrees
    trueSpeed: number;
    trueAngle: number;
  };
  depth: number; // meters
  speed: {
    throughWater: number; // knots
    overGround: number; // knots
  };
  position: {
    latitude: number;
    longitude: number;
  };
  autopilot?: {
    active: boolean;
    targetHeading?: number;
    targetWindAngle?: number;
  };
  timestamp: Date;
}

export interface SmartAnchorWatch {
  id: string;
  active: boolean;
  anchorPosition: {
    latitude: number;
    longitude: number;
  };
  anchorSetTime: Date;
  chainLength: number; // meters
  waterDepth: number; // meters
  bowRollerHeight: number; // meters from waterline
  scope: number; // calculated scope ratio
  swingRadius: number; // meters
  currentPosition: {
    latitude: number;
    longitude: number;
  };
  distanceFromAnchor: number; // meters
  isDragging: boolean;
  tideInfo?: {
    currentHeight: number;
    nextHigh: Date;
    nextLow: Date;
    range: number; // meters
  };
  alerts: AnchorAlert[];
}

export interface AnchorAlert {
  id: string;
  type: 'drag' | 'swing-limit' | 'wind-gust' | 'tide-change' | 'depth-change';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface AutomaticLogEntry {
  id: string;
  timestamp: Date;
  type: 'sail-change' | 'anchor' | 'departure' | 'arrival' | 'engine' | 'weather' | 'manual' | 'voice' | 'photo';
  vesselState: VesselState;
  position: {
    latitude: number;
    longitude: number;
  };
  weather?: {
    windSpeed: number;
    windDirection: number;
    seaState: string;
    visibility: string;
  };
  notes?: string;
  voiceTranscription?: string;
  photos?: string[]; // URLs or paths
  sailConfiguration?: {
    main: boolean;
    genoa: boolean;
    jib: boolean;
    spinnaker: boolean;
    reefs: number;
  };
  engineHours?: number;
  fuelConsumed?: number;
  distance?: number; // nautical miles
}

export interface VoyageJourney {
  id: string;
  startTime: Date;
  endTime?: Date;
  startPosition: {
    latitude: number;
    longitude: number;
    locationName?: string;
  };
  endPosition?: {
    latitude: number;
    longitude: number;
    locationName?: string;
  };
  route: Array<{
    latitude: number;
    longitude: number;
    timestamp: Date;
  }>;
  distance: number; // nautical miles
  maxSpeed: number;
  avgSpeed: number;
  vesselStates: VesselState[];
  logEntries: AutomaticLogEntry[];
  weatherConditions: any[];
}

export interface MaintenanceTask {
  id: string;
  title: string;
  description: string;
  category: 'engine' | 'electrical' | 'plumbing' | 'sails' | 'rigging' | 'hull' | 'electronics' | 'safety' | 'other';
  status: 'idea' | 'todo' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  systemId?: string; // Reference to specific system
  scheduledDate?: Date;
  completedDate?: Date;
  estimatedCost?: number;
  actualCost?: number;
  receipts?: string[]; // File paths or URLs
  notes?: string;
  logEntries?: string[]; // References to log entries
  recurrence?: {
    type: 'hours' | 'days' | 'months' | 'years';
    interval: number;
    lastCompleted?: Date;
    nextDue?: Date;
  };
}

export interface SystemMonitoring {
  systemId: string;
  systemName: string;
  category: 'engine' | 'electrical' | 'plumbing' | 'navigation' | 'communication' | 'safety';
  status: 'normal' | 'warning' | 'critical' | 'offline';
  metrics: Array<{
    name: string;
    value: number;
    unit: string;
    normalRange: { min: number; max: number };
    timestamp: Date;
  }>;
  alerts: Array<{
    id: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: Date;
  }>;
  lastMaintenance?: Date;
  nextMaintenanceDue?: Date;
}

export interface AwayMode {
  enabled: boolean;
  userId: string;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  contacts: Array<{
    name: string;
    email?: string;
    phone?: string;
  }>;
  alerts: Array<{
    type: 'anchor-drag' | 'wind-speed' | 'depth' | 'battery' | 'intrusion' | 'system-fault';
    threshold: number;
    enabled: boolean;
  }>;
  activatedAt?: Date;
}

// Aegean-Specific Types - Ada.Sea unique features
export interface MeltemData {
  currentStrength: number; // knots
  trend: 'increasing' | 'decreasing' | 'steady';
  peakTime: string; // "14:00-17:00"
  forecast: Array<{
    date: Date;
    minStrength: number;
    maxStrength: number;
    peakTime: string;
  }>;
  safeAnchorages: Array<{
    name: string;
    distance: number; // nautical miles
    shelter: 'excellent' | 'good' | 'moderate';
  }>;
  warnings: Array<{
    severity: 'info' | 'warning' | 'critical';
    message: string;
  }>;
  isActive: boolean; // Is Meltemi currently blowing?
}

export interface GreekIsland {
  name: string;
  nameGreek: string;
  distance: number; // nautical miles
  bearing: number; // degrees
  facilities: {
    fuel: boolean;
    provisions: boolean;
    medical: boolean;
    marina: boolean;
    customs: boolean;
  };
  customsHours?: {
    open: string;
    close: string;
    weekendOpen: boolean;
  };
  harbors: Array<{
    name: string;
    vhfChannel?: number;
    depth: number;
    shelter: 'excellent' | 'good' | 'moderate' | 'poor';
  }>;
  emergencyServices: {
    coastGuard: string; // phone number
    medical: string;
    police: string;
  };
}

export interface TurkishMarina {
  name: string;
  vhfChannel: number;
  location: {
    latitude: number;
    longitude: number;
  };
  distance?: number; // from current position
  bearing?: number;
  availability: 'available' | 'limited' | 'full' | 'unknown';
  services: Array<'fuel' | 'water' | 'electricity' | 'pump-out' | 'wifi' | 'repair' | 'chandlery'>;
  customsHours: {
    open: string;
    close: string;
    weekendOpen: boolean;
  };
  depth: number; // meters
  maxLOA: number; // meters
  pricing: {
    dailyRate: number;
    currency: string;
  };
  contacts: {
    vhf: number;
    phone: string;
    email?: string;
  };
}

export interface AegeanHazard {
  type: 'fishing-nets' | 'military-zone' | 'ferry-route' | 'restricted-area' | 'shallow-water' | 'rocks';
  location: {
    latitude: number;
    longitude: number;
  };
  radius: number; // meters
  distance?: number; // from current position
  bearing?: number;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  descriptionTR: string;
  activeTime?: string; // "08:00-18:00" for fishing nets
  temporaryUntil?: Date; // for military exercises
}

// Ada.Hukuk (Legal) specific types
export interface LegalInstitution {
  code: string;
  name: string;
  nameTr: string;
  chambers?: number;
  boards?: number;
}

export interface CourtDecision {
  id: string;
  institution: string; // Yargıtay, Danıştay, etc.
  chamber?: string;
  decisionNumber: string;
  decisionDate: Date;
  caseNumber?: string;
  subject: string;
  summary: string;
  fullText: string;
  keywords: string[];
  relatedLaws: string[];
  url?: string;
}

export interface LegalSearchQuery {
  institution: LegalInstitution['code'];
  keyword?: string;
  exactPhrase?: string;
  startDate?: Date;
  endDate?: Date;
  chamber?: string;
  decisionNumber?: string;
  limit?: number;
}

export interface LegalSearchResult {
  query: LegalSearchQuery;
  results: CourtDecision[];
  totalResults: number;
  searchDate: Date;
  executionTime: number; // ms
}

export interface ContractAnalysis {
  contractId: string;
  contractType: string;
  parties: string[];
  analyzedDate: Date;
  risks: LegalRisk[];
  compliance: ComplianceCheck[];
  recommendations: string[];
  relatedDecisions: CourtDecision[];
}

export interface LegalRisk {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  clause?: string;
  recommendation: string;
  relatedLaw?: string;
}

export interface ComplianceCheck {
  area: string; // e.g., 'maritime-law', 'tourism-law', 'contract-law'
  compliant: boolean;
  requirements: string[];
  violations: string[];
  recommendedActions: string[];
}

export interface LegalConsultation {
  id: string;
  requesterId: string; // Node ID that requested consultation
  consultationType: 'contract-review' | 'compliance-check' | 'legal-opinion' | 'case-research';
  subject: string;
  details: any;
  response: {
    opinion: string;
    risks: LegalRisk[];
    recommendations: string[];
    relevantDecisions: CourtDecision[];
    relevantLaws: string[];
  };
  createdAt: Date;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface LegalDocument {
  id: string;
  type: 'contract' | 'agreement' | 'terms' | 'policy' | 'legal-opinion';
  title: string;
  parties: string[];
  content: string;
  createdDate: Date;
  effectiveDate?: Date;
  expiryDate?: Date;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  analysis?: ContractAnalysis;
}

// Ada.Legal (International Maritime Law) specific types

// IMO Regulations and Maritime Law
export interface IMORegulation {
  code: string; // e.g., 'SOLAS-III-20', 'MARPOL-Annex-I'
  title: string;
  category: 'SOLAS' | 'MARPOL' | 'STCW' | 'COLREGS' | 'MLC' | 'ISM' | 'ISPS';
  requirement: string;
  applicableTo: string[]; // vessel types
  effectiveDate: Date;
  amendments?: Array<{
    date: Date;
    description: string;
  }>;
}

export interface VesselCompliance {
  vesselId: string;
  vesselName: string;
  checkDate: Date;
  overallStatus: 'compliant' | 'partial' | 'non-compliant';
  regulations: Array<{
    regulation: IMORegulation;
    compliant: boolean;
    notes?: string;
  }>;
  recommendations: string[];
  nextInspectionDue: Date;
}

export interface SafetyEquipmentRequirement {
  equipment: string;
  quantity: number;
  regulation: string; // IMO regulation code
  inspectionRequired: boolean;
  certificationRequired: boolean;
}

export interface CrewRequirement {
  position: string;
  certificateRequired: string; // STCW certification
  minimumExperience: string;
  medicalRequirements: string[];
}

// KVKK/GDPR Compliance
export type PersonalDataCategory =
  | 'identity'
  | 'contact'
  | 'financial'
  | 'location'
  | 'biometric'
  | 'health'
  | 'criminal-records'
  | 'special-category';

export interface DataProcessingActivity {
  activityId: string;
  controller: string;
  purpose: string;
  legalBasis: 'consent' | 'contract' | 'legal-obligation' | 'legitimate-interests' | 'vital-interests' | 'public-task';
  dataCategories: PersonalDataCategory[];
  dataSubjects: string[];
  recipients: string[];
  crossBorderTransfer: boolean;
  transferDestinations?: string[];
  retentionPeriod: string;
  securityMeasures: string[];
  dpia: {
    required: boolean;
    completed: boolean;
    date?: Date;
  };
  complianceStatus: {
    kvkk: 'compliant' | 'partial' | 'non-compliant';
    gdpr: 'compliant' | 'partial' | 'non-compliant';
  };
}

export interface DataSubjectRight {
  requestId: string;
  dataSubject: {
    name: string;
    email: string;
    identityVerified: boolean;
  };
  requestType: 'access' | 'erasure' | 'rectification' | 'restriction' | 'portability' | 'objection';
  receivedDate: Date;
  deadline: Date; // 30 days for KVKK/GDPR
  status: 'received' | 'in-progress' | 'completed' | 'rejected';
  response?: string;
  completedDate?: Date;
}

export interface DataBreachIncident {
  incidentId: string;
  discoveredDate: Date;
  reportedDate?: Date;
  breachType: 'confidentiality' | 'integrity' | 'availability';
  affectedDataCategories: PersonalDataCategory[];
  affectedIndividuals: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  immediateActions: string[];
  notificationRequired: boolean;
  notified: {
    authority: boolean;
    dataSubjects: boolean;
  };
}

export interface PrivacyPolicy {
  version: string;
  language: 'tr' | 'en';
  effectiveDate: Date;
  controller: {
    name: string;
    address: string;
    contact: string;
  };
  sections: Array<{
    title: string;
    content: string;
  }>;
  kvkkCompliant: boolean;
  gdprCompliant: boolean;
  lastReviewed: Date;
}

// Maritime Insurance
export interface PIInsurancePolicy {
  policyId: string;
  club: string; // 'UK P&I Club', 'Gard', 'Skuld', etc.
  vesselId: string;
  coverage: {
    thirdPartyLiability: number;
    collisionLiability: number;
    cargoLiability: number;
    passengerLiability: number;
    crewLiability: number;
    pollutionLiability: number;
    wreckRemoval: number;
  };
  premium: {
    annual: number;
    callableCapital?: number; // P&I clubs are mutual
  };
  policyPeriod: {
    start: Date;
    end: Date;
  };
  deductible: number;
  currency: string;
}

export interface HullMachineryPolicy {
  policyId: string;
  insurer: string;
  vesselId: string;
  insuredValue: number;
  coverage: {
    hull: boolean;
    machinery: boolean;
    equipment: boolean;
    totalLoss: boolean;
    generalAverage: boolean;
  };
  navigationalLimits: string[];
  premium: {
    annual: number;
  };
  policyPeriod: {
    start: Date;
    end: Date;
  };
  deductible: number;
  currency: string;
}

export interface InsuranceClaim {
  claimId: string;
  policyId: string;
  policyType: 'PI' | 'hull-machinery' | 'cargo' | 'crew';
  incident: {
    date: Date;
    location: {
      latitude: number;
      longitude: number;
      description?: string;
    };
    description: string;
    witnesses?: string[];
  };
  claimAmount: {
    requested: number;
    breakdown: Array<{
      item: string;
      amount: number;
    }>;
  };
  status: 'submitted' | 'under-review' | 'survey-required' | 'negotiating' | 'settled' | 'rejected';
  submittedDate: Date;
  settledDate?: Date;
  settledAmount?: number;
  estimatedSettlement?: {
    low: number;
    expected: number;
    high: number;
  };
  documents: string[];
}

// International Contracts (Marina, Charter Parties)
export interface MarinaContractTerms {
  contractType: 'mooring' | 'dry-berthing' | 'lifting-launching' | 'service' | 'commercial-unit';
  parties: {
    marina: {
      name: string;
      legalEntity: string;
      address: string;
      country: string;
    };
    yachtOwner: {
      name: string;
      vessel: string;
      flag: string;
      loa: number;
      beam: number;
    };
  };
  terms: {
    startDate: Date;
    endDate: Date;
    autoRenewal: boolean;
    noticePeriod: number; // days
  };
  pricing: {
    currency: string;
    mooringFee?: number;
    liftingFee?: number;
    launchingFee?: number;
    advancePayment: number; // percentage
    paymentTerms: string;
  };
  services: {
    included: string[];
    additional: string[];
    prohibited: string[];
  };
  insurance: {
    required: boolean;
    minCoverage: number;
    types: string[];
  };
  liabilities: {
    marina: string[];
    yachtOwner: string[];
    excluded: string[];
  };
  termination: {
    conditions: string[];
    noticePeriod: number;
    refundPolicy: string;
    penalties?: Array<{
      breach: string;
      penalty: string;
    }>;
  };
  disputeResolution: {
    governingLaw: string;
    jurisdiction: string;
    arbitration?: {
      required: boolean;
      rules: string;
      location: string;
    };
  };
}

export interface ContractRiskClause {
  clause: string;
  risk: string;
  recommendation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}
