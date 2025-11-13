/**
 * FinanceNode - AI-powered financial management node
 * Manages payments, invoicing, accounting, and financial tracking
 * Integrated with Paraşüt for Turkish tax compliance
 */

import { BaseNode, BaseNodeOptions } from '../../core/BaseNode.js';
import { v4 as uuidv4 } from 'uuid';
import { ParasutAdapter, ParasutConfig, ParasutHelper } from './ParasutAdapter.js';

export interface FinanceNodeConfig extends Omit<BaseNodeOptions, 'type' | 'capabilities'> {
  companyInfo: {
    name: string;
    taxId: string; // Vergi Kimlik Numarası
    taxOffice?: string; // Vergi Dairesi
    currency: string;
  };
  parasut?: ParasutConfig; // Optional Paraşüt integration
}

interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  method: 'credit-card' | 'bank-transfer' | 'crypto' | 'cash';
  customerId: string;
  timestamp: Date;
  transactionId?: string;
  parasutPaymentId?: string; // Paraşüt'teki ödeme ID
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerTaxId?: string; // Müşteri VKN/TCKN
  customerTaxOffice?: string; // Müşteri Vergi Dairesi
  subtotal: number; // KDV hariç tutar
  vatAmount: number; // KDV tutarı
  withholdingAmount: number; // Stopaj tutarı
  amount: number; // Toplam tutar (KDV dahil, stopaj hariç)
  netAmount: number; // Net tutar (stopaj düşülmüş)
  currency: string;
  items: InvoiceItem[];
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  parasutInvoiceId?: string; // Paraşüt'teki fatura ID
  eInvoiceUuid?: string; // e-Fatura UUID (GİB)
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number; // KDV oranı (0, 1, 8, 10, 18, 20)
  total: number; // KDV hariç toplam
  vatAmount: number; // KDV tutarı
  totalWithVat: number; // KDV dahil toplam
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  currency: string;
  description: string;
  date: Date;
  relatedNodeId?: string;
}

interface PayableContract {
  id: string;
  contractId: string; // From ada.legal
  contractType: string;
  supplier: {
    name: string;
    taxId?: string;
    bankAccount?: string;
  };
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  paymentSchedule: PaymentScheduleItem[];
  paymentMethod?: string;
  lateFeeRate?: number;
  status: 'active' | 'completed' | 'defaulted' | 'cancelled';
  nextPaymentDue?: Date;
  createdAt: Date;
  lastPaymentAt?: Date;
}

interface PaymentScheduleItem {
  date: Date;
  amount: number;
  description: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paidAt?: Date;
  invoiceNumber?: string;
}

interface PaymentReminder {
  id: string;
  payableId: string;
  paymentDate: Date;
  amount: number;
  supplier: string;
  daysUntilDue: number;
  sent: boolean;
  sentAt?: Date;
}

export class FinanceNode extends BaseNode {
  private companyInfo: FinanceNodeConfig['companyInfo'];
  private payments: Map<string, Payment> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  private payables: Map<string, PayableContract> = new Map(); // Borçlar
  private reminders: Map<string, PaymentReminder> = new Map(); // Ödeme hatırlatıcıları
  private invoiceCounter: number = 1000;
  private parasutAdapter?: ParasutAdapter;

  // Turkish VAT rates (KDV oranları)
  private readonly VAT_RATES = {
    STANDARD: 20, // %20 - Genel oran
    REDUCED_1: 10, // %10 - İndirimli oran
    REDUCED_2: 8,  // %8 - İndirimli oran (eski)
    REDUCED_3: 1,  // %1 - İndirimli oran
    ZERO: 0,       // %0 - İstisna
  };

  // Withholding tax rates (Stopaj oranları)
  private readonly WITHHOLDING_RATES = {
    SERVICE: 20,    // %20 - Serbest meslek hizmet stopajı
    TRANSPORT: 10,  // %10 - Nakliye stopajı
    RENT: 20,       // %20 - Kira stopajı
    NONE: 0,        // Stopaj yok
  };

  constructor(config: FinanceNodeConfig) {
    super({
      ...config,
      type: 'ada.finance',
      capabilities: {
        skills: [
          'payment-processing',
          'invoicing',
          'accounting',
          'tax-calculation',
          'kdv-calculation', // KDV hesaplama
          'stopaj-calculation', // Stopaj hesaplama
          'e-invoice', // e-Fatura
          'financial-reporting',
          'transaction-tracking',
          'refund-processing',
          'multi-currency',
          'parasut-integration', // Paraşüt entegrasyonu
          'gib-compliance', // GİB uyumluluk
        ],
        services: [
          'payment-gateway',
          'invoice-generation',
          'e-invoice-generation',
          'financial-analytics',
          'tax-compliance',
          'payment-tracking',
          'revenue-reporting',
        ],
        integrations: [
          'parasut',
          'stripe',
          'paypal',
          'bank-apis',
          'gib', // Gelir İdaresi Başkanlığı
          'tax-systems',
        ],
      },
    });

    this.companyInfo = config.companyInfo;

    // Initialize Paraşüt if config provided
    if (config.parasut) {
      this.parasutAdapter = new ParasutAdapter(config.parasut);
    }
  }

  /**
   * Initialize the Finance node
   */
  async initialize(): Promise<void> {
    this.logEvent('Finance node initializing', { company: this.companyInfo });
    this.setupFinanceHandlers();
    this.logEvent('Finance node initialized', { id: this.identity.id });
  }

  /**
   * Process finance-related tasks
   */
  async processTask(task: any): Promise<any> {
    const { type, data } = task;

    switch (type) {
      case 'create-invoice':
        return this.createInvoice(data);
      case 'process-payment':
        return this.processPayment(data);
      case 'get-invoice':
        return this.getInvoice(data.invoiceId);
      case 'get-payment-status':
        return this.getPaymentStatus(data.paymentId);
      case 'record-transaction':
        return this.recordTransaction(data);
      case 'get-financial-report':
        return this.getFinancialReport(data);
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  /**
   * Get node status
   */
  getStatus(): Record<string, any> {
    const totalRevenue = Array.from(this.transactions.values())
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const pendingPayments = Array.from(this.payments.values())
      .filter(p => p.status === 'pending').length;

    const overdueInvoices = Array.from(this.invoices.values())
      .filter(i => i.status === 'overdue').length;

    return {
      company: this.companyInfo,
      totalInvoices: this.invoices.size,
      totalPayments: this.payments.size,
      totalRevenue,
      pendingPayments,
      overdueInvoices,
      currency: this.companyInfo.currency,
    };
  }

  /**
   * Create invoice with Turkish tax compliance (KDV & Stopaj)
   */
  async createInvoice(data: {
    customerId: string;
    customerName: string;
    customerEmail?: string;
    customerTaxId?: string;
    customerTaxOffice?: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      vatRate?: number; // KDV oranı (varsayılan %20)
    }>;
    withholdingRate?: number; // Stopaj oranı (varsayılan 0)
    dueInDays?: number;
    sendToParasut?: boolean; // Paraşüt'e gönder
  }): Promise<Invoice> {
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (data.dueInDays || 30));

    // Calculate items with VAT
    const items: InvoiceItem[] = data.items.map(item => {
      const vatRate = item.vatRate ?? this.VAT_RATES.STANDARD; // Varsayılan %20
      const total = item.quantity * item.unitPrice;
      const vatAmount = ParasutHelper.calculateVAT(total, vatRate);
      const totalWithVat = total + vatAmount;

      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate,
        total,
        vatAmount,
        totalWithVat,
      };
    });

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const vatAmount = items.reduce((sum, item) => sum + item.vatAmount, 0);
    const amount = subtotal + vatAmount; // KDV dahil

    // Calculate withholding tax (stopaj)
    const withholdingRate = data.withholdingRate ?? this.WITHHOLDING_RATES.NONE;
    const withholdingAmount = (subtotal * withholdingRate) / 100;
    const netAmount = amount - withholdingAmount; // Stopaj düşülmüş

    const invoice: Invoice = {
      id: uuidv4(),
      invoiceNumber: `INV-${this.invoiceCounter++}`,
      customerId: data.customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerTaxId: data.customerTaxId,
      customerTaxOffice: data.customerTaxOffice,
      subtotal,
      vatAmount,
      withholdingAmount,
      amount,
      netAmount,
      currency: this.companyInfo.currency,
      items,
      status: 'sent',
      issueDate,
      dueDate,
    };

    this.invoices.set(invoice.id, invoice);

    // Send to Paraşüt if enabled
    if (data.sendToParasut && this.parasutAdapter) {
      try {
        await this.sendInvoiceToParasut(invoice);
      } catch (error) {
        console.error('Paraşüt invoice creation failed:', error);
        // Continue even if Paraşüt fails - invoice is still created locally
      }
    }

    // Record as pending income
    this.recordTransaction({
      type: 'income',
      category: 'invoice',
      amount: netAmount, // Use net amount (after withholding)
      currency: this.companyInfo.currency,
      description: `Invoice ${invoice.invoiceNumber} for ${data.customerName}`,
      relatedEntityId: invoice.id,
    });

    this.remember('data', { invoice }, ['invoice', 'accounting', 'kdv', 'stopaj'], 9);

    return invoice;
  }

  /**
   * Send invoice to Paraşüt
   */
  private async sendInvoiceToParasut(invoice: Invoice): Promise<void> {
    if (!this.parasutAdapter) {
      throw new Error('Paraşüt adapter not initialized');
    }

    // Find or create contact
    let contact = await this.parasutAdapter.findContactByEmail(invoice.customerEmail || '');

    if (!contact && invoice.customerEmail) {
      const contactResponse = await this.parasutAdapter.createContact({
        type: 'contacts',
        attributes: {
          email: invoice.customerEmail,
          name: invoice.customerName,
          contact_type: 'company',
          tax_number: invoice.customerTaxId,
          tax_office: invoice.customerTaxOffice,
        },
      });
      contact = contactResponse.data;
    }

    if (!contact) {
      throw new Error('Could not create or find contact in Paraşüt');
    }

    // Convert to Paraşüt format
    const parasutInvoice = ParasutHelper.convertToParasutInvoice(
      contact.id!,
      invoice.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
      })),
      {
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        currency: invoice.currency as 'TRL' | 'USD' | 'EUR',
        description: `Ada Invoice ${invoice.invoiceNumber}`,
      }
    );

    // Create invoice in Paraşüt
    const parasutResponse = await this.parasutAdapter.createSalesInvoice(parasutInvoice);

    // Store Paraşüt invoice ID
    invoice.parasutInvoiceId = parasutResponse.data.id;

    // Send e-Invoice if email provided
    if (invoice.customerEmail && parasutResponse.data.id) {
      try {
        await this.parasutAdapter.sendEInvoice(parasutResponse.data.id, invoice.customerEmail);
      } catch (error) {
        console.error('e-Invoice send failed:', error);
      }
    }
  }

  /**
   * Process payment
   */
  async processPayment(data: {
    invoiceId: string;
    customerId: string;
    amount: number;
    method: Payment['method'];
  }): Promise<any> {
    const invoice = this.invoices.get(data.invoiceId);

    if (!invoice) {
      return { success: false, message: 'Invoice not found' };
    }

    if (invoice.status === 'paid') {
      return { success: false, message: 'Invoice already paid' };
    }

    if (data.amount !== invoice.amount) {
      return { success: false, message: 'Payment amount does not match invoice' };
    }

    // Simulate payment processing
    const payment: Payment = {
      id: uuidv4(),
      invoiceId: data.invoiceId,
      amount: data.amount,
      currency: invoice.currency,
      status: 'completed',
      method: data.method,
      customerId: data.customerId,
      timestamp: new Date(),
      transactionId: `TXN-${Date.now()}`,
    };

    this.payments.set(payment.id, payment);

    // Update invoice status
    invoice.status = 'paid';
    invoice.paidDate = new Date();

    // Record transaction
    this.recordTransaction({
      type: 'income',
      category: 'payment-received',
      amount: data.amount,
      currency: invoice.currency,
      description: `Payment for ${invoice.invoiceNumber}`,
      relatedEntityId: payment.id,
    });

    this.remember('data', { payment, invoice }, ['payment', 'transaction'], 9);

    return {
      success: true,
      payment,
      transactionId: payment.transactionId,
    };
  }

  /**
   * Get invoice
   */
  getInvoice(invoiceId: string): Invoice | null {
    return this.invoices.get(invoiceId) || null;
  }

  /**
   * Get payment status
   */
  getPaymentStatus(paymentId: string): Payment | null {
    return this.payments.get(paymentId) || null;
  }

  /**
   * Record transaction
   */
  recordTransaction(data: {
    type: 'income' | 'expense';
    category: string;
    amount: number;
    currency: string;
    description: string;
    relatedEntityId?: string;
  }): Transaction {
    const transaction: Transaction = {
      id: uuidv4(),
      type: data.type,
      category: data.category,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      date: new Date(),
      relatedNodeId: data.relatedEntityId,
    };

    this.transactions.set(transaction.id, transaction);

    this.remember('data', { transaction }, ['transaction', 'accounting'], 7);

    return transaction;
  }

  /**
   * Get financial report
   */
  getFinancialReport(data: { startDate?: Date; endDate?: Date }): any {
    const start = data.startDate || new Date(0);
    const end = data.endDate || new Date();

    const transactions = Array.from(this.transactions.values())
      .filter(t => t.date >= start && t.date <= end);

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const profit = income - expenses;

    const invoices = Array.from(this.invoices.values())
      .filter(i => i.issueDate >= start && i.issueDate <= end);

    return {
      period: { start, end },
      summary: {
        totalIncome: income,
        totalExpenses: expenses,
        profit,
        currency: this.companyInfo.currency,
      },
      invoices: {
        total: invoices.length,
        paid: invoices.filter(i => i.status === 'paid').length,
        pending: invoices.filter(i => i.status === 'sent').length,
        overdue: invoices.filter(i => i.status === 'overdue').length,
      },
      transactions: transactions.length,
    };
  }

  /**
   * Setup finance-specific message handlers
   */
  private setupFinanceHandlers(): void {
    // Invoice creation request from other nodes
    this.communication.onMessage('create-invoice', async (message) => {
      this.remember('conversation', message, ['invoice-request'], 7);
      const invoice = this.createInvoice(message.payload);
      return { success: true, invoice };
    });

    // Payment processing request
    this.communication.onMessage('process-payment', async (message) => {
      this.remember('conversation', message, ['payment-request'], 8);
      const result = await this.processPayment(message.payload);
      return result;
    });

    // Financial inquiry
    this.communication.onMessage('financial-inquiry', async (message) => {
      return {
        company: this.companyInfo,
        status: this.getStatus(),
      };
    });

    // Invoice status check
    this.communication.onMessage('invoice-status', async (message) => {
      const invoice = this.getInvoice(message.payload.invoiceId);
      return invoice || { error: 'Invoice not found' };
    });

    // Register payable contract (we owe money)
    this.communication.onMessage('register-payable-contract', async (message) => {
      this.remember('conversation', message, ['payable-registration'], 8);
      const payable = await this.registerPayableContract(message.payload);
      return { success: true, payable };
    });

    // Register receivable contract (we receive money) - already handled by create-invoice
    this.communication.onMessage('register-receivable-contract', async (message) => {
      this.remember('conversation', message, ['receivable-registration'], 7);
      // For receivables, we'll track them via invoices (already implemented)
      return { success: true, message: 'Receivable will be tracked via invoices' };
    });

    // Record payment made (we paid a supplier)
    this.communication.onMessage('record-payment-made', async (message) => {
      const result = await this.recordPaymentMade(message.payload);
      return result;
    });

    // Get payables summary
    this.communication.onMessage('get-payables', async (message) => {
      return this.getPayablesSummary();
    });

    // Get cash flow forecast
    this.communication.onMessage('get-cash-flow-forecast', async (message) => {
      return this.getCashFlowForecast(message.payload?.days || 30);
    });
  }

  /**
   * Register a payable contract (we owe money to a supplier)
   */
  private async registerPayableContract(data: {
    contractId: string;
    contractType: string;
    counterparty: { name: string; taxId?: string };
    totalAmount: number;
    currency: string;
    paymentSchedule: PaymentScheduleItem[];
    paymentMethod?: string;
    lateFeeRate?: number;
  }): Promise<PayableContract> {
    const payable: PayableContract = {
      id: uuidv4(),
      contractId: data.contractId,
      contractType: data.contractType,
      supplier: {
        name: data.counterparty.name,
        taxId: data.counterparty.taxId,
      },
      totalAmount: data.totalAmount,
      paidAmount: 0,
      remainingAmount: data.totalAmount,
      currency: data.currency,
      paymentSchedule: data.paymentSchedule,
      paymentMethod: data.paymentMethod,
      lateFeeRate: data.lateFeeRate,
      status: 'active',
      nextPaymentDue: data.paymentSchedule[0]?.date,
      createdAt: new Date(),
    };

    this.payables.set(payable.id, payable);

    this.remember('data', { payable }, ['payable', 'contract'], 9);

    // Schedule payment reminders
    this.schedulePaymentReminders(payable);

    this.logEvent('Payable contract registered', {
      payableId: payable.id,
      supplier: payable.supplier.name,
      amount: payable.totalAmount,
    });

    return payable;
  }

  /**
   * Record a payment made to supplier
   */
  private async recordPaymentMade(data: {
    payableId: string;
    amount: number;
    paymentDate: Date;
    invoiceNumber?: string;
  }): Promise<any> {
    const payable = this.payables.get(data.payableId);

    if (!payable) {
      return { success: false, error: 'Payable not found' };
    }

    // Find the payment schedule item
    const scheduleItem = payable.paymentSchedule.find(
      item => item.status === 'pending' || item.status === 'overdue'
    );

    if (!scheduleItem) {
      return { success: false, error: 'No pending payments found' };
    }

    // Mark as paid
    scheduleItem.status = 'paid';
    scheduleItem.paidAt = data.paymentDate;
    scheduleItem.invoiceNumber = data.invoiceNumber;

    // Update totals
    payable.paidAmount += data.amount;
    payable.remainingAmount -= data.amount;
    payable.lastPaymentAt = data.paymentDate;

    // Update next payment due
    const nextPending = payable.paymentSchedule.find(item => item.status === 'pending');
    payable.nextPaymentDue = nextPending?.date;

    // Check if fully paid
    if (payable.remainingAmount <= 0) {
      payable.status = 'completed';
    }

    // Record transaction
    const transaction: Transaction = {
      id: uuidv4(),
      type: 'expense',
      category: payable.contractType,
      amount: data.amount,
      currency: payable.currency,
      description: `Payment to ${payable.supplier.name} - ${scheduleItem.description}`,
      date: data.paymentDate,
    };

    this.transactions.set(transaction.id, transaction);

    this.remember('data', { payment: data, payable }, ['payment-made', 'expense'], 9);

    this.logEvent('Payment recorded', {
      payableId: data.payableId,
      amount: data.amount,
      supplier: payable.supplier.name,
    });

    return {
      success: true,
      payable,
      remainingAmount: payable.remainingAmount,
      status: payable.status,
    };
  }

  /**
   * Schedule payment reminders for a payable contract
   */
  private schedulePaymentReminders(payable: PayableContract): void {
    const reminderDays = [7, 3, 1]; // Remind 7, 3, and 1 days before due date

    for (const scheduleItem of payable.paymentSchedule) {
      for (const days of reminderDays) {
        const reminderDate = new Date(scheduleItem.date);
        reminderDate.setDate(reminderDate.getDate() - days);

        const reminder: PaymentReminder = {
          id: uuidv4(),
          payableId: payable.id,
          paymentDate: scheduleItem.date,
          amount: scheduleItem.amount,
          supplier: payable.supplier.name,
          daysUntilDue: days,
          sent: false,
        };

        this.reminders.set(reminder.id, reminder);
      }
    }
  }

  /**
   * Check and send payment reminders
   * This should be called periodically (e.g., daily)
   */
  private async checkPaymentReminders(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const reminder of this.reminders.values()) {
      if (reminder.sent) continue;

      const reminderDate = new Date(reminder.paymentDate);
      reminderDate.setDate(reminderDate.getDate() - reminder.daysUntilDue);
      reminderDate.setHours(0, 0, 0, 0);

      if (reminderDate.getTime() === today.getTime()) {
        // Send reminder to ada.legal or emit event
        this.emit('payment-reminder', {
          payableId: reminder.payableId,
          supplier: reminder.supplier,
          amount: reminder.amount,
          dueDate: reminder.paymentDate,
          daysUntilDue: reminder.daysUntilDue,
        });

        reminder.sent = true;
        reminder.sentAt = new Date();

        this.logEvent('Payment reminder sent', {
          supplier: reminder.supplier,
          amount: reminder.amount,
          daysUntilDue: reminder.daysUntilDue,
        });
      }
    }
  }

  /**
   * Get payables summary
   */
  private getPayablesSummary(): any {
    const active = Array.from(this.payables.values()).filter(p => p.status === 'active');

    const totalOutstanding = active.reduce((sum, p) => sum + p.remainingAmount, 0);

    // Get upcoming payments (next 30 days)
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const upcomingPayments: any[] = [];
    for (const payable of active) {
      for (const item of payable.paymentSchedule) {
        if (item.status === 'pending' && item.date <= thirtyDaysFromNow) {
          upcomingPayments.push({
            payableId: payable.id,
            supplier: payable.supplier.name,
            amount: item.amount,
            currency: payable.currency,
            dueDate: item.date,
            description: item.description,
          });
        }
      }
    }

    // Sort by due date
    upcomingPayments.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return {
      totalPayables: this.payables.size,
      activePayables: active.length,
      totalOutstanding,
      upcomingPayments,
    };
  }

  /**
   * Get cash flow forecast
   */
  private getCashFlowForecast(days: number = 30): any {
    const today = new Date();
    const forecastEnd = new Date();
    forecastEnd.setDate(today.getDate() + days);

    // Receivables (money coming in)
    const receivables: any[] = [];
    for (const invoice of this.invoices.values()) {
      if (invoice.status !== 'paid' && invoice.dueDate <= forecastEnd) {
        receivables.push({
          from: invoice.customerName,
          amount: invoice.netAmount,
          currency: invoice.currency,
          dueDate: invoice.dueDate,
          type: 'invoice',
        });
      }
    }

    // Payables (money going out)
    const payables: any[] = [];
    for (const payable of this.payables.values()) {
      if (payable.status === 'active') {
        for (const item of payable.paymentSchedule) {
          if (item.status === 'pending' && item.date <= forecastEnd) {
            payables.push({
              to: payable.supplier.name,
              amount: item.amount,
              currency: payable.currency,
              dueDate: item.date,
              type: 'contract-payment',
              description: item.description,
            });
          }
        }
      }
    }

    // Calculate net cash flow
    const receivablesTotal = receivables.reduce((sum, r) => sum + r.amount, 0);
    const payablesTotal = payables.reduce((sum, p) => sum + p.amount, 0);
    const netCashFlow = receivablesTotal - payablesTotal;

    return {
      period: { from: today, to: forecastEnd, days },
      receivables: receivables.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()),
      payables: payables.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()),
      summary: {
        expectedIncome: receivablesTotal,
        expectedExpense: payablesTotal,
        netCashFlow,
        alert: netCashFlow < 0 ? '⚠️ Negative cash flow forecast!' : '✓ Positive cash flow',
      },
    };
  }
}
