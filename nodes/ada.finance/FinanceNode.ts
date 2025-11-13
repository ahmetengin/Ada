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

export class FinanceNode extends BaseNode {
  private companyInfo: FinanceNodeConfig['companyInfo'];
  private payments: Map<string, Payment> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private transactions: Map<string, Transaction> = new Map();
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
  }
}
