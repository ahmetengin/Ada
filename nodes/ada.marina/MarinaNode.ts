/**
 * MarinaNode - AI-powered marina management node
 * Manages marina operations, berths, reservations, and services
 * Reference: West Istanbul Marina (WIM) - 155,000 sqm modern marina
 */

import { BaseNode, BaseNodeOptions } from '../../core/BaseNode.js';
import { Berth, MarinaService } from '../../core/types.js';
import { BerthManagement } from './services/BerthManagement.js';
import { ReservationService } from './services/ReservationService.js';
import { ContractManagement } from './services/ContractManagement.js';
import { EInvoiceIntegration } from './services/EInvoiceIntegration.js';

export interface MarinaNodeConfig extends Omit<BaseNodeOptions, 'type' | 'capabilities'> {
  marinaInfo: {
    name: string;
    location: string;
    area: number; // sqm
    capacity: number;
    coordinates: { latitude: number; longitude: number };
  };
}

export class MarinaNode extends BaseNode {
  private marinaInfo: MarinaNodeConfig['marinaInfo'];

  // Services
  private berthManagement: BerthManagement;
  private reservationService: ReservationService;
  private contractManagement: ContractManagement;
  private eInvoiceIntegration: EInvoiceIntegration;

  constructor(config: MarinaNodeConfig) {
    super({
      ...config,
      type: 'ada.marina',
      capabilities: {
        skills: [
          'berth-management',
          'reservation-management',
          'contract-management',
          'e-invoice-integration',
          'yacht-communication',
          'service-coordination',
        ],
        services: [
          'berth-allocation',
          'electricity',
          'water',
          'fuel',
          'maintenance',
          'cleaning',
          'security',
          'customs',
        ],
        integrations: [
          'e-fatura',
          'ada.sea-nodes',
          'payment-systems',
        ],
      },
    });

    this.marinaInfo = config.marinaInfo;

    // Initialize services
    this.berthManagement = new BerthManagement();
    this.reservationService = new ReservationService();
    this.contractManagement = new ContractManagement();
    this.eInvoiceIntegration = new EInvoiceIntegration();

    this.initializeDefaultBerths();
    this.initializeDefaultServices();
  }

  /**
   * Initialize the Marina node
   */
  async initialize(): Promise<void> {
    this.logEvent('Marina node initializing', { marina: this.marinaInfo });

    // Set up message handlers for yacht communication
    this.setupYachtHandlers();

    // Configure e-invoice integration
    this.eInvoiceIntegration.configure({
      apiUrl: 'https://efatura-integrator.example.com/api',
      apiKey: 'demo-key',
      companyTaxId: '1234567890',
      companyName: this.marinaInfo.name,
    });

    // Start periodic tasks
    setInterval(() => this.updateExpiredContracts(), 60 * 60 * 1000); // Every hour

    this.logEvent('Marina node initialized', { id: this.identity.id });
  }

  /**
   * Process tasks specific to marina management
   */
  async processTask(task: any): Promise<any> {
    const { type, data } = task;

    switch (type) {
      case 'find-berth':
        return this.findBerth(data);

      case 'create-reservation':
        return this.createReservation(data);

      case 'create-contract':
        return this.createContract(data);

      case 'generate-invoice':
        return this.generateInvoice(data);

      case 'get-availability':
        return this.getAvailability();

      case 'get-services':
        return this.reservationService.getAvailableServices();

      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  /**
   * Get node status
   */
  getStatus(): Record<string, any> {
    return {
      marina: this.marinaInfo,
      occupancy: this.berthManagement.getOccupancyRate(),
      reservations: this.reservationService.generateReport(),
      contracts: this.contractManagement.generateReport(),
      invoices: this.eInvoiceIntegration.generateReport(),
      revenue: this.berthManagement.getRevenueStats('monthly'),
    };
  }

  /**
   * Find suitable berth for vessel
   */
  findBerth(requirements: {
    length: number;
    beam?: number;
    draft?: number;
    amenities?: string[];
  }): Berth | null {
    return this.berthManagement.findBestBerth(
      requirements.length,
      requirements.beam || 0,
      requirements.draft || 0
    );
  }

  /**
   * Create reservation
   */
  createReservation(data: {
    vesselId: string;
    vesselName: string;
    vesselLength: number;
    checkIn: Date;
    checkOut: Date;
    contactNode?: string;
    services?: string[];
  }): any {
    // Find suitable berth
    const berth = this.berthManagement.findBestBerth(data.vesselLength, 0, 0);

    if (!berth) {
      return { success: false, message: 'No suitable berth available' };
    }

    // Check for conflicts
    const hasConflict = this.reservationService.hasConflict(
      berth.id,
      data.checkIn,
      data.checkOut
    );

    if (hasConflict) {
      return { success: false, message: 'Berth not available for selected dates' };
    }

    // Create reservation
    const reservation = this.reservationService.createReservation(
      berth.id,
      data.vesselId,
      data.vesselName,
      data.checkIn,
      data.checkOut,
      data.contactNode
    );

    // Add requested services
    if (data.services) {
      data.services.forEach(serviceId => {
        this.reservationService.addService(reservation.id, serviceId);
      });
    }

    // Calculate cost
    const days = Math.ceil(
      (data.checkOut.getTime() - data.checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );
    reservation.totalCost = berth.price.daily * days;

    // Update berth status
    this.berthManagement.updateBerthStatus(berth.id, 'reserved');

    // Confirm reservation
    this.reservationService.confirmReservation(reservation.id);

    // Log event
    this.remember('data', { reservation, berth }, ['reservation'], 8);

    // Notify yacht node if present
    if (data.contactNode) {
      this.sendMessage(
        data.contactNode,
        'marina-reservation-confirmed',
        {
          reservationId: reservation.id,
          berthNumber: berth.number,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          cost: reservation.totalCost,
        },
        { priority: 'high' }
      );
    }

    return {
      success: true,
      reservation,
      berth: {
        number: berth.number,
        amenities: berth.amenities,
      },
    };
  }

  /**
   * Create contract
   */
  createContract(data: {
    vesselId: string;
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate: Date;
    berthId: string;
    services: string[];
    amount: number;
  }): any {
    const contract = this.contractManagement.createContract(
      data.vesselId,
      data.type,
      data.startDate,
      data.berthId,
      data.services,
      data.amount
    );

    this.contractManagement.activateContract(contract.id);

    this.remember('data', { contract }, ['contract'], 8);

    return {
      success: true,
      contract,
    };
  }

  /**
   * Generate invoice
   */
  async generateInvoice(data: {
    customerId: string;
    customerName: string;
    customerTaxId: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
    }>;
    notes?: string;
  }): Promise<any> {
    const lineItems = data.items.map(item => ({
      ...item,
      amount: item.quantity * item.unitPrice,
    }));

    const invoice = this.eInvoiceIntegration.createInvoice(
      data.customerId,
      data.customerName,
      data.customerTaxId,
      lineItems,
      data.notes
    );

    // Send to e-Fatura system
    const result = await this.eInvoiceIntegration.sendInvoice(invoice.id);

    this.remember('data', { invoice, result }, ['invoice'], 7);

    return {
      success: result.success,
      invoice,
      ettn: result.ettn,
    };
  }

  /**
   * Get availability
   */
  getAvailability(): {
    availableBerths: number;
    totalBerths: number;
    occupancyRate: number;
  } {
    const stats = this.berthManagement.getOccupancyRate();
    return {
      availableBerths: stats.available,
      totalBerths: stats.total,
      occupancyRate: stats.rate,
    };
  }

  /**
   * Setup handlers for yacht communication
   */
  private setupYachtHandlers(): void {
    // Handle service requests from yachts
    this.communication.onMessage('service-request', async (message) => {
      const { vesselName, vesselLength, serviceType, details } = message.payload;

      this.remember('conversation', message, ['yacht-request'], 7);

      if (serviceType === 'berth-reservation') {
        return this.createReservation({
          vesselId: message.from,
          vesselName,
          vesselLength,
          checkIn: new Date(details.checkIn),
          checkOut: new Date(details.checkOut),
          contactNode: message.from,
          services: details.services,
        });
      }

      return { success: true, message: 'Service request received' };
    });

    // Handle availability queries
    this.communication.onMessage('check-availability', async () => {
      return this.getAvailability();
    });

    // Handle service catalog requests
    this.communication.onMessage('get-services', async () => {
      return this.reservationService.getAvailableServices();
    });
  }

  /**
   * Initialize default berths (for West Istanbul Marina)
   */
  private initializeDefaultBerths(): void {
    // Create sample berths - in production would load from database
    for (let i = 1; i <= 20; i++) {
      const berth: Berth = {
        id: `berth-${i}`,
        number: `A${i}`,
        length: 12 + Math.floor(i / 5) * 10,
        width: 4 + Math.floor(i / 5) * 2,
        depth: 3 + Math.floor(i / 10),
        status: 'available',
        amenities: ['electricity', 'water', 'wifi'],
        price: {
          daily: 50 + i * 5,
          weekly: 300 + i * 30,
          monthly: 1000 + i * 100,
          yearly: 10000 + i * 1000,
          currency: 'USD',
        },
      };

      if (i % 3 === 0) {
        berth.amenities.push('fuel');
      }

      this.berthManagement.addBerth(berth);
    }
  }

  /**
   * Initialize default services
   */
  private initializeDefaultServices(): void {
    const services: MarinaService[] = [
      {
        id: 'elec-1',
        type: 'electricity',
        name: 'Shore Power',
        description: '220V/50Hz shore power connection',
        price: 15,
        unit: 'per day',
        available: true,
      },
      {
        id: 'water-1',
        type: 'water',
        name: 'Fresh Water',
        description: 'Unlimited fresh water supply',
        price: 10,
        unit: 'per day',
        available: true,
      },
      {
        id: 'fuel-1',
        type: 'fuel',
        name: 'Diesel Fuel',
        description: 'Marine diesel refueling',
        price: 1.5,
        unit: 'per liter',
        available: true,
      },
      {
        id: 'maint-1',
        type: 'maintenance',
        name: 'Basic Maintenance',
        description: 'Hull cleaning and basic maintenance',
        price: 200,
        unit: 'per service',
        available: true,
      },
      {
        id: 'clean-1',
        type: 'cleaning',
        name: 'Yacht Cleaning',
        description: 'Interior and exterior cleaning',
        price: 150,
        unit: 'per service',
        available: true,
      },
      {
        id: 'sec-1',
        type: 'security',
        name: '24/7 Security',
        description: 'Round-the-clock security monitoring',
        price: 25,
        unit: 'per day',
        available: true,
      },
    ];

    services.forEach(service => {
      this.reservationService.registerService(service);
    });
  }

  /**
   * Update expired contracts
   */
  private updateExpiredContracts(): void {
    const updated = this.contractManagement.updateExpiredContracts();
    if (updated > 0) {
      this.logEvent('Contracts updated', { expiredCount: updated });
    }
  }
}
