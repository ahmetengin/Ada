/**
 * Core types for the Ada Ecosystem
 * Each node type has its own domain-specific capabilities
 */

export type NodeType = 'ada.sea' | 'ada.marina' | 'ada.travel' | 'ada.congress';

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

export interface VesselData {
  name: string;
  imo?: string;
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
