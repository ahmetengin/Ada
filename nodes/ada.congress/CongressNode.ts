/**
 * CongressNode - AI-powered congress and event management node
 * Manages complete attendee journey from invitation to return home
 * Includes Apple PassKit QR code integration for tracking
 */

import { BaseNode, BaseNodeOptions } from '../../core/BaseNode.js';
import { v4 as uuidv4 } from 'uuid';
import {
  CongressEvent,
  Attendee,
  CongressRegistration,
  CongressItinerary,
  ItineraryStep,
  VenueInfo,
} from '../../core/types.js';

export interface CongressNodeConfig extends Omit<BaseNodeOptions, 'type' | 'capabilities'> {
  organizerInfo: {
    name: string;
    specialization: string[];
  };
}

export class CongressNode extends BaseNode {
  private organizerInfo: CongressNodeConfig['organizerInfo'];
  private events: Map<string, CongressEvent> = new Map();
  private registrations: Map<string, CongressRegistration> = new Map();
  private attendees: Map<string, Attendee> = new Map();
  private itineraries: Map<string, CongressItinerary> = new Map();

  // Integration nodes
  private travelNodes: string[] = [];

  constructor(config: CongressNodeConfig) {
    super({
      ...config,
      type: 'ada.congress',
      capabilities: {
        skills: [
          'event-management',
          'registration-management',
          'itinerary-planning',
          'logistics-coordination',
          'payment-processing',
          'passkit-integration',
          'attendee-tracking',
        ],
        services: [
          'invitation-management',
          'registration',
          'payment-collection',
          'travel-coordination',
          'venue-management',
          'daily-tours',
          'attendee-support',
        ],
        integrations: [
          'apple-passkit',
          'ada.travel',
          'payment-gateways',
          'hotel-systems',
        ],
      },
    });

    this.organizerInfo = config.organizerInfo;
  }

  /**
   * Initialize the Congress node
   */
  async initialize(): Promise<void> {
    this.logEvent('Congress node initializing', { organizer: this.organizerInfo });

    this.setupCongressHandlers();

    // Find and connect to travel nodes
    const travelNodes = BaseNode.findNodesByType('ada.travel');
    travelNodes.forEach(node => {
      this.connectToNode(node.getIdentity().id);
      this.travelNodes.push(node.getIdentity().id);
    });

    this.logEvent('Congress node initialized', { id: this.identity.id });
  }

  /**
   * Process congress-related tasks
   */
  async processTask(task: any): Promise<any> {
    const { type, data } = task;

    switch (type) {
      case 'create-event':
        return this.createEvent(data);
      case 'register-attendee':
        return this.registerAttendee(data);
      case 'create-itinerary':
        return this.createItinerary(data);
      case 'update-step-status':
        return this.updateStepStatus(data);
      case 'generate-pass':
        return this.generateApplePass(data);
      case 'get-event-status':
        return this.getEventStatus(data.eventId);
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  /**
   * Get node status
   */
  getStatus(): Record<string, any> {
    const events = Array.from(this.events.values());
    const registrations = Array.from(this.registrations.values());

    return {
      organizer: this.organizerInfo,
      totalEvents: events.length,
      upcomingEvents: events.filter(e => e.startDate > new Date()).length,
      totalRegistrations: registrations.length,
      totalAttendees: this.attendees.size,
      connectedTravelNodes: this.travelNodes.length,
      recentEvents: events.slice(0, 5),
    };
  }

  /**
   * Create new event
   */
  createEvent(data: {
    name: string;
    startDate: Date;
    endDate: Date;
    venue: VenueInfo;
    expectedAttendees: number;
  }): CongressEvent {
    const event: CongressEvent = {
      id: uuidv4(),
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      venue: data.venue,
      expectedAttendees: data.expectedAttendees,
      status: 'planning',
    };

    this.events.set(event.id, event);

    this.remember('data', { event }, ['event', 'planning'], 9);

    return event;
  }

  /**
   * Register attendee
   */
  async registerAttendee(data: {
    eventId: string;
    attendee: Attendee;
    packageType: 'standard' | 'premium' | 'vip';
    homeAddress?: string;
  }): Promise<any> {
    const event = this.events.get(data.eventId);

    if (!event) {
      return { success: false, message: 'Event not found' };
    }

    if (event.status !== 'registration-open') {
      return { success: false, message: 'Registration not open' };
    }

    // Add attendee
    this.attendees.set(data.attendee.id, data.attendee);

    // Calculate price based on package
    const prices = {
      standard: 500,
      premium: 1000,
      vip: 2000,
    };

    const registration: CongressRegistration = {
      id: uuidv4(),
      eventId: data.eventId,
      attendee: data.attendee,
      registrationDate: new Date(),
      paymentStatus: 'pending',
      amount: prices[data.packageType],
      currency: 'USD',
      packageType: data.packageType,
    };

    this.registrations.set(registration.id, registration);

    // Create initial itinerary
    const itinerary = await this.createCompleteItinerary(
      data.attendee,
      event,
      data.homeAddress
    );

    registration.itinerary = itinerary;

    // Generate Apple Pass
    const passUrl = await this.generateApplePass({
      registrationId: registration.id,
      attendee: data.attendee,
      event,
    });

    this.remember(
      'data',
      { registration, itinerary, passUrl },
      ['registration', 'attendee'],
      9
    );

    return {
      success: true,
      registration,
      itinerary,
      applePassUrl: passUrl,
    };
  }

  /**
   * Create complete itinerary (home to home)
   */
  private async createCompleteItinerary(
    attendee: Attendee,
    event: CongressEvent,
    homeAddress?: string
  ): Promise<CongressItinerary> {
    const steps: ItineraryStep[] = [];
    let sequence = 0;

    // Calculate times
    const pickupTime = new Date(event.startDate);
    pickupTime.setDate(pickupTime.getDate() - 1);
    pickupTime.setHours(8, 0, 0, 0);

    const flightTime = new Date(pickupTime);
    flightTime.setHours(pickupTime.getHours() + 2);

    const arrivalTime = new Date(flightTime);
    arrivalTime.setHours(flightTime.getHours() + 2);

    const hotelCheckIn = new Date(arrivalTime);
    hotelCheckIn.setHours(arrivalTime.getHours() + 1);

    // Step 1: Pickup from home
    if (homeAddress) {
      steps.push({
        id: uuidv4(),
        sequence: sequence++,
        type: 'pickup',
        scheduledTime: pickupTime,
        location: homeAddress,
        description: 'Pickup from home address',
        status: 'pending',
        details: { driver: 'TBD', vehicle: 'Executive Car' },
      });
    }

    // Step 2: Flight
    steps.push({
      id: uuidv4(),
      sequence: sequence++,
      type: 'flight',
      scheduledTime: flightTime,
      location: 'International Airport',
      description: `Flight to ${event.venue.address}`,
      status: 'pending',
      details: { flightNumber: 'TBD', airline: 'TBD' },
    });

    // Step 3: Arrival transfer
    steps.push({
      id: uuidv4(),
      sequence: sequence++,
      type: 'transfer',
      scheduledTime: arrivalTime,
      location: `${event.venue.address} Airport`,
      description: 'Airport to hotel transfer',
      status: 'pending',
      details: { driver: 'TBD', vehicle: 'Shuttle' },
    });

    // Step 4: Hotel check-in
    steps.push({
      id: uuidv4(),
      sequence: sequence++,
      type: 'checkin',
      scheduledTime: hotelCheckIn,
      location: 'Event Hotel',
      description: 'Hotel check-in',
      status: 'pending',
      details: { hotel: 'TBD', room: 'TBD' },
    });

    // Step 5-N: Event sessions (simplified - would create detailed schedule)
    const eventDays = Math.ceil(
      (event.endDate.getTime() - event.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    for (let day = 0; day < eventDays; day++) {
      const sessionTime = new Date(event.startDate);
      sessionTime.setDate(sessionTime.getDate() + day);
      sessionTime.setHours(9, 0, 0, 0);

      steps.push({
        id: uuidv4(),
        sequence: sequence++,
        type: 'session',
        scheduledTime: sessionTime,
        location: event.venue.name,
        description: `Day ${day + 1} Sessions`,
        status: 'pending',
        details: { venue: event.venue },
      });

      // Daily tour (optional)
      if (day > 0) {
        const tourTime = new Date(sessionTime);
        tourTime.setHours(17, 0, 0, 0);

        steps.push({
          id: uuidv4(),
          sequence: sequence++,
          type: 'tour',
          scheduledTime: tourTime,
          location: 'City Tour',
          description: `Evening city tour - Day ${day + 1}`,
          status: 'pending',
          details: { duration: '3 hours', type: 'cultural' },
        });
      }
    }

    // Final steps: Checkout and return
    const checkoutTime = new Date(event.endDate);
    checkoutTime.setHours(12, 0, 0, 0);

    steps.push(
      {
        id: uuidv4(),
        sequence: sequence++,
        type: 'checkout',
        scheduledTime: checkoutTime,
        location: 'Event Hotel',
        description: 'Hotel checkout',
        status: 'pending',
        details: {},
      },
      {
        id: uuidv4(),
        sequence: sequence++,
        type: 'transfer',
        scheduledTime: new Date(checkoutTime.getTime() + 60 * 60 * 1000),
        location: 'Airport',
        description: 'Hotel to airport transfer',
        status: 'pending',
        details: { driver: 'TBD', vehicle: 'Shuttle' },
      },
      {
        id: uuidv4(),
        sequence: sequence++,
        type: 'flight',
        scheduledTime: new Date(checkoutTime.getTime() + 3 * 60 * 60 * 1000),
        location: 'International Airport',
        description: 'Return flight',
        status: 'pending',
        details: { flightNumber: 'TBD', airline: 'TBD' },
      }
    );

    if (homeAddress) {
      steps.push({
        id: uuidv4(),
        sequence: sequence++,
        type: 'dropoff',
        scheduledTime: new Date(checkoutTime.getTime() + 7 * 60 * 60 * 1000),
        location: homeAddress,
        description: 'Return to home address',
        status: 'pending',
        details: { driver: 'TBD', vehicle: 'Executive Car' },
      });
    }

    const itinerary: CongressItinerary = {
      attendeeId: attendee.id,
      steps,
      status: 'planned',
    };

    this.itineraries.set(attendee.id, itinerary);

    return itinerary;
  }

  /**
   * Create itinerary for attendee
   */
  async createItinerary(data: {
    attendeeId: string;
    steps: ItineraryStep[];
  }): Promise<CongressItinerary> {
    const itinerary: CongressItinerary = {
      attendeeId: data.attendeeId,
      steps: data.steps,
      status: 'planned',
    };

    this.itineraries.set(data.attendeeId, itinerary);

    this.remember('data', { itinerary }, ['itinerary'], 8);

    return itinerary;
  }

  /**
   * Update itinerary step status
   */
  updateStepStatus(data: {
    attendeeId: string;
    stepId: string;
    status: ItineraryStep['status'];
    actualTime?: Date;
  }): boolean {
    const itinerary = this.itineraries.get(data.attendeeId);

    if (!itinerary) return false;

    const step = itinerary.steps.find(s => s.id === data.stepId);

    if (!step) return false;

    step.status = data.status;
    if (data.actualTime) {
      step.actualTime = data.actualTime;
    }

    // Update overall itinerary status
    const allCompleted = itinerary.steps.every(s => s.status === 'completed');
    const anyInProgress = itinerary.steps.some(s => s.status === 'in-progress');

    if (allCompleted) {
      itinerary.status = 'completed';
    } else if (anyInProgress) {
      itinerary.status = 'in-progress';
    }

    this.remember('event', { stepUpdate: data }, ['itinerary', 'tracking'], 7);

    return true;
  }

  /**
   * Generate Apple PassKit pass
   */
  async generateApplePass(data: {
    registrationId: string;
    attendee: Attendee;
    event: CongressEvent;
  }): Promise<string> {
    // In production, this would integrate with Apple PassKit API
    // For now, generate a mock URL
    const passId = uuidv4();

    const passData = {
      passTypeIdentifier: 'pass.com.ada.congress',
      serialNumber: passId,
      organizationName: this.organizerInfo.name,
      description: `${data.event.name} - Attendee Pass`,
      logoText: data.event.name,
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(60, 65, 76)',
      barcode: {
        message: data.registrationId,
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1',
      },
      generic: {
        primaryFields: [
          {
            key: 'name',
            label: 'Name',
            value: data.attendee.name,
          },
        ],
        secondaryFields: [
          {
            key: 'event',
            label: 'Event',
            value: data.event.name,
          },
          {
            key: 'date',
            label: 'Date',
            value: data.event.startDate.toLocaleDateString(),
          },
        ],
        auxiliaryFields: [
          {
            key: 'venue',
            label: 'Venue',
            value: data.event.venue.name,
          },
        ],
      },
    };

    // Simulated pass URL
    const passUrl = `https://passes.ada-ecosystem.com/${passId}`;

    // Store pass data in itinerary
    const itinerary = Array.from(this.itineraries.values()).find(
      i => i.attendeeId === data.attendee.id
    );

    if (itinerary) {
      itinerary.applePassUrl = passUrl;
    }

    this.remember('data', { passData, passUrl }, ['apple-pass'], 7);

    return passUrl;
  }

  /**
   * Get event status
   */
  getEventStatus(eventId: string): any {
    const event = this.events.get(eventId);

    if (!event) {
      return { error: 'Event not found' };
    }

    const eventRegistrations = Array.from(this.registrations.values()).filter(
      r => r.eventId === eventId
    );

    const paidCount = eventRegistrations.filter(r => r.paymentStatus === 'paid').length;

    return {
      event,
      registrations: {
        total: eventRegistrations.length,
        paid: paidCount,
        pending: eventRegistrations.length - paidCount,
      },
      attendance: {
        registered: eventRegistrations.length,
        expected: event.expectedAttendees,
        fillRate: (eventRegistrations.length / event.expectedAttendees) * 100,
      },
    };
  }

  /**
   * Setup congress-specific message handlers
   */
  private setupCongressHandlers(): void {
    this.communication.onMessage('event-inquiry', async (message) => {
      const upcomingEvents = Array.from(this.events.values()).filter(
        e => e.startDate > new Date() && e.status === 'registration-open'
      );

      return {
        organizer: this.organizerInfo,
        upcomingEvents,
      };
    });

    this.communication.onMessage('registration-inquiry', async (message) => {
      const { registrationId } = message.payload;
      return this.registrations.get(registrationId) || { error: 'Not found' };
    });

    this.communication.onMessage('itinerary-status', async (message) => {
      const { attendeeId } = message.payload;
      return this.itineraries.get(attendeeId) || { error: 'Not found' };
    });
  }
}
