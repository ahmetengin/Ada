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
import { FacilityManagement } from './services/FacilityManagement.js';

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
  private facilityManagement: FacilityManagement;

  // Payment tracking for long-term contracts
  private paymentSchedules: Map<string, {
    contractId: string;
    totalAmount: number;
    paidAmount: number;
    schedule: Array<{
      id: string;
      description: string;
      amount: number;
      dueDate: Date;
      status: 'pending' | 'paid' | 'overdue';
      paidAt?: Date;
      transactionId?: string;
    }>;
  }> = new Map();

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
          'facility-management',
          'package-deals',
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
          'restaurant',
          'spa-wellness',
          'fitness',
          'beach-club',
          'conference',
          'concierge',
        ],
        integrations: [
          'e-fatura',
          'ada.sea-nodes',
          'payment-systems',
          'ada.restaurant',
          'ada.maintenance',
          'ada.customer',
        ],
      },
    });

    this.marinaInfo = config.marinaInfo;

    // Initialize services
    this.berthManagement = new BerthManagement();
    this.reservationService = new ReservationService();
    this.contractManagement = new ContractManagement();
    this.eInvoiceIntegration = new EInvoiceIntegration();
    this.facilityManagement = new FacilityManagement();

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

      // Facility management
      case 'get-all-facilities':
        return this.facilityManagement.getAllFacilities();

      case 'get-facilities-by-category':
        return this.facilityManagement.getFacilitiesByCategory(data.category);

      case 'book-facility':
        return this.facilityManagement.bookFacility(data);

      case 'get-packages':
        return this.facilityManagement.getAllPackages();

      case 'get-popular-packages':
        return this.facilityManagement.getPopularPackages();

      case 'get-facility-stats':
        return this.facilityManagement.getStatistics();

      // Payment schedule operations
      case 'create-payment-schedule':
        return this.createPaymentSchedule(data);

      case 'confirm-scheduled-payment':
        return this.confirmScheduledPayment(data);

      case 'get-payment-schedule':
        return this.getPaymentSchedule(data.contractId);

      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  /**
   * Get node status
   */
  getStatus(): Record<string, any> {
    const facilityStats = this.facilityManagement.getStatistics();

    return {
      marina: this.marinaInfo,
      occupancy: this.berthManagement.getOccupancyRate(),
      reservations: this.reservationService.generateReport(),
      contracts: this.contractManagement.generateReport(),
      invoices: this.eInvoiceIntegration.generateReport(),
      revenue: this.berthManagement.getRevenueStats('monthly'),
      facilities: {
        total: facilityStats.totalFacilities,
        operational: facilityStats.operationalFacilities,
        averageRating: facilityStats.averageRating,
        categories: facilityStats.byCategory,
        topRated: facilityStats.popularFacilities,
      },
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

    // Create invoice via Finance node
    this.createInvoiceForReservation(reservation.id, data.vesselId, data.vesselName, berth, days)
      .catch(error => {
        console.error('Failed to create invoice:', error.message);
        // Continue even if invoice fails - reservation is still valid
      });

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
   * Create invoice for reservation via Finance node
   */
  private async createInvoiceForReservation(
    reservationId: string,
    vesselId: string,
    vesselName: string,
    berth: any,
    days: number
  ): Promise<void> {
    const financeNodes = BaseNode.findNodesByType('ada.finance');
    if (financeNodes.length === 0) {
      console.log('No finance node available for invoice creation');
      return;
    }

    try {
      const invoiceResponse = await this.requestFromNode(
        financeNodes[0].getIdentity().id,
        'create-invoice',
        {
          customerId: vesselId,
          customerName: vesselName,
          items: [
            {
              description: `Berth Rental - ${berth.number} (${days} days)`,
              quantity: days,
              unitPrice: berth.price.daily,
              vatRate: 20, // %20 KDV
            },
          ],
          withholdingRate: 0,
        }
      );

      this.remember('data', {
        reservationId,
        invoice: invoiceResponse,
      }, ['invoice', 'finance'], 8);

      console.log(`✅ Invoice created for reservation ${reservationId}: ${invoiceResponse.invoice?.invoiceNumber}`);
    } catch (error: any) {
      console.error(`Failed to create invoice for reservation ${reservationId}:`, error.message);
    }
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
   * Request facility maintenance from Maintenance node
   */
  async requestFacilityMaintenance(issue: {
    location: string;
    category: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }): Promise<any> {
    const maintenanceNodes = BaseNode.findNodesByType('ada.maintenance');
    if (maintenanceNodes.length === 0) {
      console.log('No maintenance node available');
      return { error: 'No maintenance node available' };
    }

    try {
      const result = await this.requestFromNode(
        maintenanceNodes[0].getIdentity().id,
        'request-maintenance',
        {
          requesterId: this.identity.id,
          requesterName: this.marinaInfo.name,
          category: issue.category,
          description: `${this.marinaInfo.name} - ${issue.location}: ${issue.description}`,
          type: issue.priority === 'high' ? 'emergency' : 'scheduled',
        }
      );

      this.remember('data', {
        maintenanceRequest: result,
        location: issue.location,
      }, ['maintenance', 'facility'], 7);

      console.log(`✅ Maintenance request created for ${issue.location}`);
      return result;
    } catch (error: any) {
      console.error('Failed to request maintenance:', error.message);
      return { error: error.message };
    }
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

  // ========================================
  // FACILITY MANAGEMENT - Public Methods
  // ========================================

  /**
   * Get all marina facilities
   */
  getAllFacilities() {
    return this.facilityManagement.getAllFacilities();
  }

  /**
   * Get facilities by category
   */
  getFacilitiesByCategory(category: string) {
    return this.facilityManagement.getFacilitiesByCategory(category as any);
  }

  /**
   * Book a facility
   */
  async bookFacility(data: {
    facilityId: string;
    customerId: string;
    customerName: string;
    date: Date;
    timeSlot?: { start: string; end: string };
    partySize?: number;
    specialRequests?: string;
  }) {
    const reservation = this.facilityManagement.bookFacility(data);

    // Track interaction in customer node
    if ('error' in reservation) {
      return reservation;
    }

    // Notify customer node
    const customerNodes = BaseNode.findNodesByType('ada.customer');
    if (customerNodes.length > 0) {
      await this.requestFromNode(
        customerNodes[0].getIdentity().id,
        'track-interaction',
        {
          customerId: data.customerId,
          nodeType: 'ada.marina',
          type: 'service',
          channel: 'system',
          subject: `Facility booking: ${reservation.facilityName}`,
          sentiment: 'positive',
        }
      );
    }

    this.remember('data', { facilityReservation: reservation }, ['facility', 'booking'], 7);
    return reservation;
  }

  /**
   * Get marina packages
   */
  getMarinaPackages() {
    return this.facilityManagement.getAllPackages();
  }

  /**
   * Get popular packages
   */
  getPopularPackages() {
    return this.facilityManagement.getPopularPackages();
  }

  /**
   * Get facility statistics
   */
  getFacilityStatistics() {
    return this.facilityManagement.getStatistics();
  }

  // ========================================
  // PAYMENT SCHEDULE MANAGEMENT
  // ========================================

  /**
   * Create payment schedule for long-term contract (MIXED payment policy)
   * Example: Yearly berth rental with 30% deposit + 12 monthly payments
   */
  async createPaymentSchedule(data: {
    contractId: string;
    totalAmount: number;
    depositPercent?: number; // Default 30%
    installments?: number; // Default 12 for yearly
    startDate: Date;
  }): Promise<any> {
    const depositPercent = data.depositPercent || 0.3; // 30% default
    const installments = data.installments || 12; // Monthly default

    const depositAmount = Math.round(data.totalAmount * depositPercent);
    const remainingAmount = data.totalAmount - depositAmount;
    const installmentAmount = Math.round(remainingAmount / installments);

    const schedule: Array<{
      id: string;
      description: string;
      amount: number;
      dueDate: Date;
      status: 'pending' | 'paid' | 'overdue';
      paidAt?: Date;
      transactionId?: string;
    }> = [];

    // Deposit (immediate)
    schedule.push({
      id: `${data.contractId}-deposit`,
      description: `Deposit (${Math.round(depositPercent * 100)}%)`,
      amount: depositAmount,
      dueDate: data.startDate,
      status: 'pending',
    });

    // Monthly installments
    for (let i = 1; i <= installments; i++) {
      const dueDate = new Date(data.startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        id: `${data.contractId}-installment-${i}`,
        description: `Installment ${i}/${installments}`,
        amount: i === installments
          ? remainingAmount - (installmentAmount * (installments - 1)) // Last installment adjusts for rounding
          : installmentAmount,
        dueDate: dueDate,
        status: 'pending',
      });
    }

    this.paymentSchedules.set(data.contractId, {
      contractId: data.contractId,
      totalAmount: data.totalAmount,
      paidAmount: 0,
      schedule: schedule,
    });

    // Create payment link for deposit
    const financeNodes = BaseNode.findNodesByType('ada.finance');
    let depositPaymentLink = '';

    if (financeNodes.length > 0) {
      try {
        const paymentResult = await this.requestFromNode(
          financeNodes[0].getIdentity().id,
          'create-payment-link',
          {
            bookingId: `${data.contractId}-deposit`,
            amount: depositAmount,
            currency: 'USD',
            customerEmail: 'customer@example.com', // Should come from contract
            customerName: 'Marina Customer',
            description: `Marina Contract Deposit - ${data.contractId}`,
          }
        );
        depositPaymentLink = paymentResult.paymentUrl;
      } catch (error: any) {
        console.error('Failed to create payment link:', error.message);
      }
    }

    this.remember('data', {
      contractId: data.contractId,
      paymentSchedule: schedule,
    }, ['payment', 'schedule'], 8);

    return {
      success: true,
      contractId: data.contractId,
      totalAmount: data.totalAmount,
      depositAmount: depositAmount,
      installmentAmount: installmentAmount,
      installments: installments,
      schedule: schedule,
      depositPaymentLink: depositPaymentLink,
      message: `💰 Payment schedule created: ${depositAmount} USD deposit + ${installments} x ${installmentAmount} USD`,
    };
  }

  /**
   * Confirm a scheduled payment
   */
  async confirmScheduledPayment(data: {
    contractId: string;
    paymentId: string;
    transactionId: string;
    paidAmount: number;
  }): Promise<any> {
    const paymentSchedule = this.paymentSchedules.get(data.contractId);

    if (!paymentSchedule) {
      return { success: false, message: 'Payment schedule not found' };
    }

    const payment = paymentSchedule.schedule.find(p => p.id === data.paymentId);

    if (!payment) {
      return { success: false, message: 'Payment not found in schedule' };
    }

    if (payment.status === 'paid') {
      return { success: false, message: 'Payment already processed' };
    }

    // Verify amount
    if (data.paidAmount < payment.amount) {
      return {
        success: false,
        message: `Insufficient payment. Required: ${payment.amount}, Paid: ${data.paidAmount}`,
      };
    }

    // Mark as paid
    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.transactionId = data.transactionId;

    paymentSchedule.paidAmount += data.paidAmount;

    // Check if all payments are complete
    const allPaid = paymentSchedule.schedule.every(p => p.status === 'paid');
    const remaining = paymentSchedule.schedule.filter(p => p.status === 'pending');

    this.remember('data', {
      contractId: data.contractId,
      paymentConfirmed: payment,
      allPaid: allPaid,
    }, ['payment', 'confirmation'], 8);

    return {
      success: true,
      message: allPaid
        ? '✅ All payments complete! Contract fully paid.'
        : `✅ Payment confirmed. ${remaining.length} payments remaining.`,
      payment: payment,
      totalPaid: paymentSchedule.paidAmount,
      totalAmount: paymentSchedule.totalAmount,
      remainingPayments: remaining.length,
      nextPayment: remaining.length > 0 ? remaining[0] : null,
      fullyPaid: allPaid,
    };
  }

  /**
   * Get payment schedule for a contract
   */
  getPaymentSchedule(contractId: string): any {
    const paymentSchedule = this.paymentSchedules.get(contractId);

    if (!paymentSchedule) {
      return { success: false, message: 'Payment schedule not found' };
    }

    const overdue = paymentSchedule.schedule.filter(
      p => p.status === 'pending' && new Date() > p.dueDate
    );

    const upcoming = paymentSchedule.schedule.filter(
      p => p.status === 'pending' && new Date() <= p.dueDate
    );

    const paid = paymentSchedule.schedule.filter(p => p.status === 'paid');

    return {
      success: true,
      contractId: contractId,
      totalAmount: paymentSchedule.totalAmount,
      paidAmount: paymentSchedule.paidAmount,
      remainingAmount: paymentSchedule.totalAmount - paymentSchedule.paidAmount,
      schedule: paymentSchedule.schedule,
      summary: {
        total: paymentSchedule.schedule.length,
        paid: paid.length,
        pending: upcoming.length,
        overdue: overdue.length,
      },
      nextDue: upcoming.length > 0 ? upcoming[0] : null,
      overdue: overdue,
    };
  }
}
