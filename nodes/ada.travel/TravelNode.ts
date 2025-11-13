/**
 * TravelNode - AI-powered travel agency node
 * Manages all travel agency operations: flights, hotels, tours, transport
 */

import { BaseNode, BaseNodeOptions } from '../../core/BaseNode.js';
import { v4 as uuidv4 } from 'uuid';
import {
  TravelBooking,
  FlightBooking,
  HotelReservation,
  TourPackage,
} from '../../core/types.js';

export interface TravelNodeConfig extends Omit<BaseNodeOptions, 'type' | 'capabilities'> {
  agencyInfo: {
    name: string;
    license: string;
    specializations: string[];
    gdsAccess?: {
      amadeus?: string;
      sabre?: string;
      galileo?: string;
    };
  };
}

interface VisaApplication {
  id: string;
  customerId: string;
  customerName: string;
  nationality: string;
  destination: string;
  visaType: 'tourist' | 'business' | 'transit' | 'student' | 'work';
  status: 'preparing' | 'submitted' | 'in-review' | 'approved' | 'rejected' | 'issued';
  applicationDate: Date;
  expectedProcessingDays: number;
  estimatedIssueDate?: Date;
  actualIssueDate?: Date;
  documents: VisaDocument[];
  fees: number;
  notes?: string;
}

interface VisaDocument {
  name: string;
  type: 'passport' | 'photo' | 'invitation' | 'financial' | 'insurance' | 'other';
  required: boolean;
  submitted: boolean;
  uploadDate?: Date;
}

interface VisaRequirement {
  country: string;
  forNationality: string;
  required: boolean;
  visaOnArrival: boolean;
  eTa: boolean; // Electronic Travel Authorization
  processingDays: number;
  fees: number;
  documents: string[];
}

interface GroundTransport {
  id: string;
  bookingId: string;
  type: 'airport-transfer' | 'car-rental' | 'train' | 'bus' | 'private-car' | 'taxi';
  origin: string;
  destination: string;
  pickupTime: Date;
  dropoffTime?: Date;
  vehicleType?: string;
  driver?: string;
  licensePlate?: string;
  price: number;
  status: 'booked' | 'confirmed' | 'in-transit' | 'completed' | 'cancelled';
}

interface GDSConnection {
  system: 'amadeus' | 'sabre' | 'galileo' | 'worldspan';
  connected: boolean;
  lastSync?: Date;
  recordLocator?: string;
}

export class TravelNode extends BaseNode {
  private agencyInfo: TravelNodeConfig['agencyInfo'];
  private bookings: Map<string, TravelBooking> = new Map();
  private flightBookings: Map<string, FlightBooking> = new Map();
  private hotelReservations: Map<string, HotelReservation> = new Map();
  private tourPackages: Map<string, TourPackage> = new Map();

  // NEW: Visa assistance
  private visaApplications: Map<string, VisaApplication> = new Map();
  private visaRequirements: Map<string, VisaRequirement> = new Map();

  // NEW: Ground transport
  private groundTransports: Map<string, GroundTransport> = new Map();

  // NEW: GDS connections
  private gdsConnections: Map<string, GDSConnection> = new Map();

  constructor(config: TravelNodeConfig) {
    super({
      ...config,
      type: 'ada.travel',
      capabilities: {
        skills: [
          'flight-booking',
          'hotel-reservation',
          'tour-management',
          'package-creation',
          'transport-coordination',
          'itinerary-planning',
          'visa-processing', // NEW
          'document-verification', // NEW
          'ground-transport-booking', // NEW
          'gds-integration', // NEW
          'multi-modal-routing', // NEW
        ],
        services: [
          'flight-search',
          'hotel-search',
          'tour-booking',
          'ground-transport',
          'travel-packages',
          'visa-assistance',
          'visa-requirement-check', // NEW
          'document-tracking', // NEW
          'airport-transfers', // NEW
          'car-rental', // NEW
          'train-tickets', // NEW
        ],
        integrations: [
          'gds-systems',
          'amadeus', // NEW
          'sabre', // NEW
          'galileo', // NEW
          'hotel-apis',
          'tour-operators',
          'payment-gateways',
          'visa-systems', // NEW
          'transport-providers', // NEW
        ],
      },
    });

    this.agencyInfo = config.agencyInfo;
    this.initializeTourPackages();
    this.initializeVisaRequirements();
    this.initializeGDSConnections();
  }

  /**
   * Initialize the Travel node
   */
  async initialize(): Promise<void> {
    this.logEvent('Travel node initializing', { agency: this.agencyInfo });
    this.setupTravelHandlers();
    this.logEvent('Travel node initialized', { id: this.identity.id });
  }

  /**
   * Process travel-related tasks
   */
  async processTask(task: any): Promise<any> {
    const { type, data } = task;

    switch (type) {
      case 'book-flight':
        return this.bookFlight(data);
      case 'reserve-hotel':
        return this.reserveHotel(data);
      case 'book-tour':
        return this.bookTour(data);
      case 'create-package':
        return this.createPackage(data);
      case 'search-flights':
        return this.searchFlights(data);
      case 'search-hotels':
        return this.searchHotels(data);
      case 'get-packages':
        return this.getAvailablePackages();
      // NEW: Visa assistance
      case 'check-visa-requirements':
        return this.checkVisaRequirements(data);
      case 'apply-for-visa':
        return this.applyForVisa(data);
      case 'get-visa-status':
        return this.getVisaStatus(data);
      // NEW: Ground transport
      case 'book-ground-transport':
        return this.bookGroundTransport(data);
      case 'get-transport-options':
        return this.getTransportOptions(data);
      // NEW: GDS
      case 'search-gds-flights':
        return this.searchGDSFlights(data);
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  /**
   * Get node status
   */
  getStatus(): Record<string, any> {
    const byType: Record<string, number> = {};
    this.bookings.forEach(b => {
      byType[b.type] = (byType[b.type] || 0) + 1;
    });

    return {
      agency: this.agencyInfo,
      totalBookings: this.bookings.size,
      bookingsByType: byType,
      activePackages: this.tourPackages.size,
      recentBookings: Array.from(this.bookings.values())
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10),
    };
  }

  /**
   * Book flight
   */
  async bookFlight(data: {
    customerId: string;
    departure: { airport: string; date: Date };
    arrival: { airport: string; date: Date };
    passengers: any[];
    class: 'economy' | 'business' | 'first';
  }): Promise<any> {
    const flightBooking: FlightBooking = {
      pnr: this.generatePNR(),
      airline: 'TK', // Turkish Airlines
      flightNumber: `TK${Math.floor(Math.random() * 9000) + 1000}`,
      departure: data.departure,
      arrival: data.arrival,
      passengers: data.passengers,
      class: data.class,
      price: this.calculateFlightPrice(data.class, data.passengers.length),
    };

    const booking: TravelBooking = {
      id: uuidv4(),
      customerId: data.customerId,
      type: 'flight',
      status: 'confirmed',
      details: flightBooking,
      totalPrice: flightBooking.price,
      currency: 'USD',
      createdAt: new Date(),
    };

    this.bookings.set(booking.id, booking);
    this.flightBookings.set(flightBooking.pnr, flightBooking);

    this.remember('data', { booking, flight: flightBooking }, ['flight', 'booking'], 8);

    return {
      success: true,
      booking,
      pnr: flightBooking.pnr,
      flightNumber: flightBooking.flightNumber,
    };
  }

  /**
   * Reserve hotel
   */
  async reserveHotel(data: {
    customerId: string;
    hotelName: string;
    location: string;
    checkIn: Date;
    checkOut: Date;
    rooms: Array<{ type: string; guests: string[] }>;
  }): Promise<any> {
    const nights = Math.ceil(
      (data.checkOut.getTime() - data.checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );

    const hotelReservation: HotelReservation = {
      confirmationNumber: this.generateConfirmationNumber(),
      hotelName: data.hotelName,
      address: data.location,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      rooms: data.rooms.map(room => ({
        type: room.type,
        count: 1,
        guests: room.guests,
      })),
      price: nights * data.rooms.length * 150, // $150 per room per night
    };

    const booking: TravelBooking = {
      id: uuidv4(),
      customerId: data.customerId,
      type: 'hotel',
      status: 'confirmed',
      details: hotelReservation,
      totalPrice: hotelReservation.price,
      currency: 'USD',
      createdAt: new Date(),
    };

    this.bookings.set(booking.id, booking);
    this.hotelReservations.set(hotelReservation.confirmationNumber, hotelReservation);

    this.remember('data', { booking, hotel: hotelReservation }, ['hotel', 'booking'], 8);

    return {
      success: true,
      booking,
      confirmationNumber: hotelReservation.confirmationNumber,
    };
  }

  /**
   * Book tour
   */
  async bookTour(data: {
    customerId: string;
    packageId: string;
    participants: number;
    startDate: Date;
  }): Promise<any> {
    const tourPackage = this.tourPackages.get(data.packageId);

    if (!tourPackage) {
      return { success: false, message: 'Tour package not found' };
    }

    if (data.participants > tourPackage.maxParticipants) {
      return {
        success: false,
        message: `Maximum ${tourPackage.maxParticipants} participants allowed`,
      };
    }

    const booking: TravelBooking = {
      id: uuidv4(),
      customerId: data.customerId,
      type: 'tour',
      status: 'confirmed',
      details: {
        package: tourPackage,
        participants: data.participants,
        startDate: data.startDate,
      },
      totalPrice: tourPackage.price * data.participants,
      currency: 'USD',
      createdAt: new Date(),
    };

    this.bookings.set(booking.id, booking);

    this.remember('data', { booking, tour: tourPackage }, ['tour', 'booking'], 8);

    return {
      success: true,
      booking,
      tourName: tourPackage.name,
      duration: tourPackage.duration,
    };
  }

  /**
   * Create travel package
   */
  async createPackage(data: {
    name: string;
    description: string;
    duration: number;
    destinations: string[];
    included: string[];
    excluded: string[];
    price: number;
    maxParticipants: number;
  }): Promise<TourPackage> {
    const tourPackage: TourPackage = {
      id: uuidv4(),
      ...data,
    };

    this.tourPackages.set(tourPackage.id, tourPackage);

    this.remember('data', { package: tourPackage }, ['tour', 'package'], 7);

    return tourPackage;
  }

  /**
   * Search flights
   */
  async searchFlights(data: {
    from: string;
    to: string;
    date: Date;
    passengers: number;
  }): Promise<any[]> {
    // Simulated flight search results
    return [
      {
        airline: 'TK',
        flightNumber: 'TK1984',
        departure: { airport: data.from, time: '10:00' },
        arrival: { airport: data.to, time: '14:00' },
        price: 350,
        class: 'economy',
        available: true,
      },
      {
        airline: 'TK',
        flightNumber: 'TK1985',
        departure: { airport: data.from, time: '18:00' },
        arrival: { airport: data.to, time: '22:00' },
        price: 420,
        class: 'business',
        available: true,
      },
    ];
  }

  /**
   * Search hotels
   */
  async searchHotels(data: {
    location: string;
    checkIn: Date;
    checkOut: Date;
    rooms: number;
  }): Promise<any[]> {
    // Simulated hotel search results
    return [
      {
        name: 'Grand Hotel',
        location: data.location,
        rating: 5,
        price: 200,
        amenities: ['wifi', 'pool', 'spa', 'restaurant'],
        available: true,
      },
      {
        name: 'City Hotel',
        location: data.location,
        rating: 4,
        price: 120,
        amenities: ['wifi', 'breakfast', 'gym'],
        available: true,
      },
    ];
  }

  /**
   * Get available packages
   */
  getAvailablePackages(): TourPackage[] {
    return Array.from(this.tourPackages.values());
  }

  /**
   * Check visa requirements for a destination
   */
  checkVisaRequirements(data: {
    nationality: string;
    destination: string;
  }): any {
    const key = `${data.destination}-${data.nationality}`;
    const requirement = this.visaRequirements.get(key);

    if (requirement) {
      return {
        success: true,
        requirement,
        recommendation: requirement.required
          ? `Visa required. Processing time: ${requirement.processingDays} days. Fee: $${requirement.fees}`
          : requirement.visaOnArrival
          ? 'Visa on arrival available'
          : requirement.eTa
          ? 'Electronic Travel Authorization (eTA) required'
          : 'No visa required',
      };
    }

    // Default response if not in database
    return {
      success: true,
      requirement: null,
      recommendation: 'Please verify with embassy. Requirements not in database.',
    };
  }

  /**
   * Apply for visa
   */
  async applyForVisa(data: {
    customerId: string;
    customerName: string;
    nationality: string;
    destination: string;
    visaType: VisaApplication['visaType'];
    travelDate: Date;
  }): Promise<VisaApplication> {
    // Get visa requirements
    const key = `${data.destination}-${data.nationality}`;
    const requirement = this.visaRequirements.get(key);

    if (!requirement) {
      throw new Error('Visa requirements not found for this destination');
    }

    // Determine required documents
    const documents: VisaDocument[] = requirement.documents.map(doc => ({
      name: doc,
      type: this.determineDocumentType(doc),
      required: true,
      submitted: false,
    }));

    // Calculate estimated issue date
    const estimatedIssueDate = new Date();
    estimatedIssueDate.setDate(estimatedIssueDate.getDate() + requirement.processingDays);

    const application: VisaApplication = {
      id: uuidv4(),
      customerId: data.customerId,
      customerName: data.customerName,
      nationality: data.nationality,
      destination: data.destination,
      visaType: data.visaType,
      status: 'preparing',
      applicationDate: new Date(),
      expectedProcessingDays: requirement.processingDays,
      estimatedIssueDate,
      documents,
      fees: requirement.fees,
      notes: `Application for ${data.visaType} visa to ${data.destination}`,
    };

    this.visaApplications.set(application.id, application);

    this.remember('data', { application }, ['visa', 'application'], 8);

    return application;
  }

  /**
   * Get visa application status
   */
  getVisaStatus(data: { applicationId: string }): any {
    const application = this.visaApplications.get(data.applicationId);

    if (!application) {
      return { success: false, message: 'Application not found' };
    }

    const pendingDocs = application.documents.filter(d => d.required && !d.submitted);

    return {
      success: true,
      application,
      pendingDocuments: pendingDocs,
      progress: ((application.documents.length - pendingDocs.length) / application.documents.length) * 100,
      estimatedDaysRemaining:
        application.estimatedIssueDate
          ? Math.ceil(
              (application.estimatedIssueDate.getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null,
    };
  }

  /**
   * Book ground transport
   */
  async bookGroundTransport(data: {
    bookingId?: string;
    type: GroundTransport['type'];
    origin: string;
    destination: string;
    pickupTime: Date;
    passengers: number;
    vehicleType?: string;
  }): Promise<any> {
    // Calculate price based on transport type
    const basePrices = {
      'airport-transfer': 50,
      'car-rental': 80,
      'train': 30,
      'bus': 15,
      'private-car': 120,
      'taxi': 40,
    };

    const transport: GroundTransport = {
      id: uuidv4(),
      bookingId: data.bookingId || uuidv4(),
      type: data.type,
      origin: data.origin,
      destination: data.destination,
      pickupTime: data.pickupTime,
      vehicleType: data.vehicleType || 'Standard',
      price: basePrices[data.type] * data.passengers,
      status: 'booked',
    };

    this.groundTransports.set(transport.id, transport);

    this.remember('data', { transport }, ['ground-transport', 'booking'], 7);

    return {
      success: true,
      transport,
      confirmationNumber: transport.id,
    };
  }

  /**
   * Get transport options
   */
  async getTransportOptions(data: {
    origin: string;
    destination: string;
    date: Date;
  }): Promise<any[]> {
    // Simulated transport options
    return [
      {
        type: 'airport-transfer',
        provider: 'Airport Shuttle Service',
        vehicleType: 'Shuttle Van',
        duration: 45,
        price: 50,
        available: true,
      },
      {
        type: 'private-car',
        provider: 'Executive Transport',
        vehicleType: 'Mercedes E-Class',
        duration: 35,
        price: 120,
        available: true,
      },
      {
        type: 'taxi',
        provider: 'City Taxi',
        vehicleType: 'Standard Sedan',
        duration: 40,
        price: 40,
        available: true,
      },
      {
        type: 'train',
        provider: 'Airport Express',
        vehicleType: 'Train',
        duration: 50,
        price: 30,
        available: true,
      },
    ];
  }

  /**
   * Search flights via GDS (simulated)
   */
  async searchGDSFlights(data: {
    from: string;
    to: string;
    date: Date;
    passengers: number;
    class?: string;
  }): Promise<any> {
    // Check GDS connection
    const gdsSystem = this.agencyInfo.gdsAccess?.amadeus
      ? 'amadeus'
      : this.agencyInfo.gdsAccess?.sabre
      ? 'sabre'
      : this.agencyInfo.gdsAccess?.galileo
      ? 'galileo'
      : null;

    if (!gdsSystem) {
      return {
        success: false,
        message: 'No GDS system connected. Please use standard flight search.',
        fallback: await this.searchFlights(data),
      };
    }

    const connection = this.gdsConnections.get(gdsSystem);

    // In production, this would query the actual GDS
    // For now, return enhanced search results
    const results = await this.searchFlights(data);

    return {
      success: true,
      gdsSystem: gdsSystem.toUpperCase(),
      connection: connection,
      flights: results.map((flight: any) => ({
        ...flight,
        gdsRecordLocator: this.generateGDSLocator(gdsSystem),
        fareRules: ['Refundable with fee', 'Changes allowed', '2 checked bags'],
        seatMap: true,
        mileageEarning: Math.floor(Math.random() * 2000) + 500,
      })),
      totalResults: results.length,
    };
  }

  /**
   * Determine document type from name
   */
  private determineDocumentType(
    docName: string
  ): 'passport' | 'photo' | 'invitation' | 'financial' | 'insurance' | 'other' {
    const name = docName.toLowerCase();
    if (name.includes('passport')) return 'passport';
    if (name.includes('photo')) return 'photo';
    if (name.includes('invitation') || name.includes('letter')) return 'invitation';
    if (name.includes('bank') || name.includes('financial')) return 'financial';
    if (name.includes('insurance')) return 'insurance';
    return 'other';
  }

  /**
   * Generate GDS record locator
   */
  private generateGDSLocator(system: string): string {
    const prefix = system.substring(0, 2).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${random}`;
  }

  /**
   * Initialize visa requirements database
   */
  private initializeVisaRequirements(): void {
    const requirements: VisaRequirement[] = [
      // Turkey visa requirements
      {
        country: 'Turkey',
        forNationality: 'USA',
        required: false,
        visaOnArrival: false,
        eTa: true,
        processingDays: 1,
        fees: 60,
        documents: ['Valid passport', 'Return ticket'],
      },
      {
        country: 'Turkey',
        forNationality: 'UK',
        required: false,
        visaOnArrival: false,
        eTa: true,
        processingDays: 1,
        fees: 60,
        documents: ['Valid passport', 'Return ticket'],
      },
      // US visa requirements
      {
        country: 'USA',
        forNationality: 'Turkey',
        required: true,
        visaOnArrival: false,
        eTa: false,
        processingDays: 90,
        fees: 160,
        documents: [
          'Valid passport',
          'DS-160 form',
          'Passport photos',
          'Bank statements',
          'Employment letter',
          'Travel insurance',
        ],
      },
      // Schengen visa requirements
      {
        country: 'Schengen',
        forNationality: 'Turkey',
        required: true,
        visaOnArrival: false,
        eTa: false,
        processingDays: 15,
        fees: 80,
        documents: [
          'Valid passport',
          'Application form',
          'Passport photos',
          'Travel insurance',
          'Bank statements',
          'Hotel reservation',
          'Flight tickets',
        ],
      },
      // Dubai visa
      {
        country: 'UAE',
        forNationality: 'Turkey',
        required: true,
        visaOnArrival: true,
        eTa: false,
        processingDays: 3,
        fees: 100,
        documents: ['Valid passport', 'Return ticket', 'Hotel reservation'],
      },
    ];

    requirements.forEach(req => {
      const key = `${req.country}-${req.forNationality}`;
      this.visaRequirements.set(key, req);
    });
  }

  /**
   * Initialize GDS connections
   */
  private initializeGDSConnections(): void {
    // Amadeus
    if (this.agencyInfo.gdsAccess?.amadeus) {
      this.gdsConnections.set('amadeus', {
        system: 'amadeus',
        connected: true,
        lastSync: new Date(),
      });
    }

    // Sabre
    if (this.agencyInfo.gdsAccess?.sabre) {
      this.gdsConnections.set('sabre', {
        system: 'sabre',
        connected: true,
        lastSync: new Date(),
      });
    }

    // Galileo
    if (this.agencyInfo.gdsAccess?.galileo) {
      this.gdsConnections.set('galileo', {
        system: 'galileo',
        connected: true,
        lastSync: new Date(),
      });
    }
  }

  /**
   * Setup travel-specific message handlers
   */
  private setupTravelHandlers(): void {
    this.communication.onMessage('travel-inquiry', async (message) => {
      this.remember('conversation', message, ['inquiry'], 6);
      return {
        agency: this.agencyInfo,
        services: this.capabilities.services,
        packages: this.getAvailablePackages().slice(0, 5),
      };
    });

    this.communication.onMessage('booking-status', async (message) => {
      const booking = this.bookings.get(message.payload.bookingId);
      return booking || { error: 'Booking not found' };
    });

    // Flight booking handler
    this.communication.onMessage('book-flight', async (message) => {
      this.remember('conversation', message, ['flight-booking'], 7);
      const result = await this.bookFlight(message.payload);
      return result;
    });

    // Hotel reservation handler
    this.communication.onMessage('reserve-hotel', async (message) => {
      this.remember('conversation', message, ['hotel-reservation'], 7);
      const result = await this.reserveHotel(message.payload);
      return result;
    });

    // Visa assistance handlers
    this.communication.onMessage('check-visa', async (message) => {
      const result = this.checkVisaRequirements(message.payload);
      return result;
    });

    this.communication.onMessage('apply-visa', async (message) => {
      this.remember('conversation', message, ['visa-application'], 8);
      const application = await this.applyForVisa(message.payload);
      return { success: true, application };
    });

    this.communication.onMessage('visa-status', async (message) => {
      return this.getVisaStatus(message.payload);
    });

    // Ground transport handlers
    this.communication.onMessage('book-transport', async (message) => {
      this.remember('conversation', message, ['ground-transport'], 7);
      const result = await this.bookGroundTransport(message.payload);
      return result;
    });

    this.communication.onMessage('transport-options', async (message) => {
      const options = await this.getTransportOptions(message.payload);
      return { options };
    });

    // GDS handlers
    this.communication.onMessage('gds-search', async (message) => {
      const result = await this.searchGDSFlights(message.payload);
      return result;
    });
  }

  /**
   * Initialize sample tour packages
   */
  private initializeTourPackages(): void {
    const packages: TourPackage[] = [
      {
        id: uuidv4(),
        name: 'Istanbul Grand Tour',
        description: 'Explore the historic and modern Istanbul',
        duration: 3,
        destinations: ['Sultanahmet', 'Bosphorus', 'Grand Bazaar'],
        included: ['Guide', 'Transport', 'Lunch', 'Entrance Fees'],
        excluded: ['Dinner', 'Personal Expenses'],
        price: 350,
        maxParticipants: 15,
      },
      {
        id: uuidv4(),
        name: 'Cappadocia Adventure',
        description: 'Hot air balloon and cave exploration',
        duration: 2,
        destinations: ['Göreme', 'Uchisar', 'Underground City'],
        included: ['Hot Air Balloon', 'Guide', 'Hotel', 'Meals'],
        excluded: ['Flights', 'Personal Expenses'],
        price: 450,
        maxParticipants: 20,
      },
      {
        id: uuidv4(),
        name: 'Aegean Coast Tour',
        description: 'Beautiful beaches and ancient ruins',
        duration: 5,
        destinations: ['Ephesus', 'Pamukkale', 'Bodrum', 'Kuşadası'],
        included: ['Accommodation', 'Transport', 'Guide', 'Some Meals'],
        excluded: ['Flights', 'All Meals', 'Personal Expenses'],
        price: 750,
        maxParticipants: 25,
      },
    ];

    packages.forEach(pkg => this.tourPackages.set(pkg.id, pkg));
  }

  /**
   * Generate PNR (Passenger Name Record)
   */
  private generatePNR(): string {
    return Array.from({ length: 6 }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
    ).join('');
  }

  /**
   * Generate hotel confirmation number
   */
  private generateConfirmationNumber(): string {
    return `HTL${Date.now().toString().slice(-8)}`;
  }

  /**
   * Calculate flight price
   */
  private calculateFlightPrice(flightClass: string, passengers: number): number {
    const basePrice = {
      economy: 300,
      business: 800,
      first: 1500,
    };

    return basePrice[flightClass as keyof typeof basePrice] * passengers;
  }
}
