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
  };
}

export class TravelNode extends BaseNode {
  private agencyInfo: TravelNodeConfig['agencyInfo'];
  private bookings: Map<string, TravelBooking> = new Map();
  private flightBookings: Map<string, FlightBooking> = new Map();
  private hotelReservations: Map<string, HotelReservation> = new Map();
  private tourPackages: Map<string, TourPackage> = new Map();

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
        ],
        services: [
          'flight-search',
          'hotel-search',
          'tour-booking',
          'ground-transport',
          'travel-packages',
          'visa-assistance',
        ],
        integrations: [
          'gds-systems',
          'hotel-apis',
          'tour-operators',
          'payment-gateways',
        ],
      },
    });

    this.agencyInfo = config.agencyInfo;
    this.initializeTourPackages();
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
      rooms: data.rooms,
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
