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

interface ServiceQuota {
  serviceType: string; // 'transfers', 'meals', 'rooms', etc.
  total: number;
  used: number;
  remaining: number;
  unitPrice: number; // Price per unit if quota exceeded
  resetPeriod: 'monthly' | 'yearly' | 'contract-term';
}

interface UsageRecord {
  id: string;
  contractId: string;
  serviceType: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  usedAt: Date;
  billedTo: string; // Which node/customer this was for
  invoiceId?: string;
  notes?: string;
}

interface ContractUsageTracking {
  contractId: string;
  supplier: string;
  period: { month: number; year: number };
  quotas: Map<string, ServiceQuota>; // service type → quota
  usageRecords: UsageRecord[];
  totalBilled: number;
  totalQuotaValue: number;
  overage: number; // Amount over quota
}

interface PaymentBatch {
  id: string;
  scheduledDate: Date; // 7th, 17th, or 27th of month
  suppliers: string[];
  totalAmount: number;
  currency: string;
  payments: Array<{
    payableId: string;
    supplier: string;
    amount: number;
    scheduleItemIds: string[];
  }>;
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
  processedAt?: Date;
}

interface LoanRepaymentScheduleItem {
  month: number; // 1, 2, 3, etc.
  dueDate: Date;
  principal: number; // Anapara ödemesi
  interest: number; // Faiz ödemesi
  total: number; // Toplam ödeme
  status: 'pending' | 'paid' | 'overdue';
  paidAt?: Date;
}

interface BankLoan {
  id: string;
  bankName: string;
  loanType: 'short-term' | 'long-term' | 'working-capital' | 'investment';
  principalAmount: number; // Anapara
  currency: string;
  interestRate: number; // Aylık faiz oranı (%)
  termMonths: number; // Vade (ay)
  purpose: string; // Kredi amacı
  disbursementDate: Date; // Kullandırım tarihi
  maturityDate: Date; // Vade sonu
  repaymentSchedule: LoanRepaymentScheduleItem[];
  totalInterestCost: number; // Toplam faiz maliyeti
  totalRepayment: number; // Toplam geri ödeme (principal + interest)
  remainingPrincipal: number; // Kalan anapara
  remainingInterest: number; // Kalan faiz
  status: 'active' | 'paid-off' | 'defaulted';
  createdAt: Date;
  paidOffAt?: Date;
}

interface CashFlowGap {
  period: { from: Date; to: Date };
  expectedIncome: number;
  expectedExpense: number;
  gap: number; // Negative = need financing
  recommendedLoanAmount: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class FinanceNode extends BaseNode {
  private companyInfo: FinanceNodeConfig['companyInfo'];
  private payments: Map<string, Payment> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  private payables: Map<string, PayableContract> = new Map(); // Borçlar
  private reminders: Map<string, PaymentReminder> = new Map(); // Ödeme hatırlatıcıları
  private usageTracking: Map<string, ContractUsageTracking> = new Map(); // Kota takibi
  private paymentBatches: Map<string, PaymentBatch> = new Map(); // Toplu ödeme planları
  private bankLoans: Map<string, BankLoan> = new Map(); // Banka kredileri
  private invoiceCounter: number = 1000;
  private parasutAdapter?: ParasutAdapter;

  // Payment batch dates (3 times per month)
  private readonly PAYMENT_BATCH_DAYS = [7, 17, 27];

  // Default interest rates (can be overridden by bank)
  private readonly DEFAULT_LOAN_RATES = {
    'short-term': 3.5,      // %3.5 aylık (kısa vadeli)
    'long-term': 2.5,       // %2.5 aylık (uzun vadeli)
    'working-capital': 3.0, // %3.0 aylık (işletme sermayesi)
    'investment': 2.0,      // %2.0 aylık (yatırım kredisi)
  };

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

    // Initialize usage tracking for a contract
    this.communication.onMessage('init-usage-tracking', async (message) => {
      const { contractId, supplier, quotas } = message.payload;
      this.initializeUsageTracking(contractId, supplier, quotas);
      return { success: true, message: 'Usage tracking initialized' };
    });

    // Record service usage
    this.communication.onMessage('record-usage', async (message) => {
      const result = await this.recordUsage(message.payload);
      return result;
    });

    // Get usage summary
    this.communication.onMessage('get-usage-summary', async (message) => {
      const { contractId, month, year } = message.payload;
      return this.getUsageSummary(contractId, month, year);
    });

    // Schedule monthly payment batches
    this.communication.onMessage('schedule-payment-batches', async (message) => {
      this.scheduleMonthlyPaymentBatches();
      return { success: true, message: 'Payment batches scheduled' };
    });

    // Process payment batch
    this.communication.onMessage('process-payment-batch', async (message) => {
      const result = await this.processPaymentBatch(message.payload.batchId);
      return result;
    });

    // Get payment batch summary
    this.communication.onMessage('get-payment-batch-summary', async (message) => {
      return this.getPaymentBatchSummary();
    });

    // Request bank loan
    this.communication.onMessage('request-bank-loan', async (message) => {
      const loan = await this.requestBankLoan(message.payload);
      return { success: true, loan };
    });

    // Record loan repayment
    this.communication.onMessage('record-loan-repayment', async (message) => {
      const result = await this.recordLoanRepayment(message.payload);
      return result;
    });

    // Analyze cash flow gap
    this.communication.onMessage('analyze-cash-flow-gap', async (message) => {
      const gap = this.analyzeCashFlowGap(message.payload?.days || 30);
      return gap || { message: 'No cash flow gap detected' };
    });

    // Get active loans
    this.communication.onMessage('get-active-loans', async (message) => {
      return this.getActiveLoans();
    });

    // Get loan details
    this.communication.onMessage('get-loan-details', async (message) => {
      const loan = this.getLoanDetails(message.payload.loanId);
      return loan || { error: 'Loan not found' };
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

  /**
   * Initialize usage tracking for a contract with quotas
   */
  private initializeUsageTracking(
    contractId: string,
    supplier: string,
    quotas: Array<{ serviceType: string; total: number; unitPrice: number; resetPeriod: 'monthly' | 'yearly' | 'contract-term' }>
  ): void {
    const now = new Date();
    const trackingKey = `${contractId}-${now.getFullYear()}-${now.getMonth() + 1}`;

    const quotaMap = new Map<string, ServiceQuota>();
    quotas.forEach(q => {
      quotaMap.set(q.serviceType, {
        serviceType: q.serviceType,
        total: q.total,
        used: 0,
        remaining: q.total,
        unitPrice: q.unitPrice,
        resetPeriod: q.resetPeriod,
      });
    });

    const tracking: ContractUsageTracking = {
      contractId,
      supplier,
      period: { month: now.getMonth() + 1, year: now.getFullYear() },
      quotas: quotaMap,
      usageRecords: [],
      totalBilled: 0,
      totalQuotaValue: quotas.reduce((sum, q) => sum + (q.total * q.unitPrice), 0),
      overage: 0,
    };

    this.usageTracking.set(trackingKey, tracking);

    this.logEvent('Usage tracking initialized', {
      contractId,
      supplier,
      quotas: quotas.length,
    });
  }

  /**
   * Record service usage against a contract quota
   */
  private async recordUsage(data: {
    contractId: string;
    serviceType: string;
    quantity: number;
    billedTo: string;
    notes?: string;
  }): Promise<any> {
    const now = new Date();
    const trackingKey = `${data.contractId}-${now.getFullYear()}-${now.getMonth() + 1}`;

    let tracking = this.usageTracking.get(trackingKey);

    if (!tracking) {
      return { success: false, error: 'No usage tracking found for this contract/period' };
    }

    const quota = tracking.quotas.get(data.serviceType);

    if (!quota) {
      return { success: false, error: `No quota found for service type: ${data.serviceType}` };
    }

    // Check if usage exceeds quota
    const willExceedQuota = quota.used + data.quantity > quota.total;
    const quantityWithinQuota = willExceedQuota ? quota.remaining : data.quantity;
    const overage = willExceedQuota ? (quota.used + data.quantity - quota.total) : 0;

    // Calculate cost
    const totalCost = data.quantity * quota.unitPrice;

    // Create usage record
    const usageRecord: UsageRecord = {
      id: uuidv4(),
      contractId: data.contractId,
      serviceType: data.serviceType,
      quantity: data.quantity,
      unitPrice: quota.unitPrice,
      totalCost,
      usedAt: now,
      billedTo: data.billedTo,
      notes: data.notes,
    };

    tracking.usageRecords.push(usageRecord);
    tracking.totalBilled += totalCost;

    // Update quota
    quota.used += data.quantity;
    quota.remaining = Math.max(0, quota.total - quota.used);

    // Update overage
    if (overage > 0) {
      tracking.overage += overage * quota.unitPrice;
    }

    this.remember('data', { usage: usageRecord, quota }, ['usage', 'quota'], 7);

    this.logEvent('Usage recorded', {
      contractId: data.contractId,
      serviceType: data.serviceType,
      quantity: data.quantity,
      withinQuota: !willExceedQuota,
      overage,
    });

    // Emit alert if quota exceeded
    if (willExceedQuota) {
      this.emit('quota-exceeded', {
        contractId: data.contractId,
        supplier: tracking.supplier,
        serviceType: data.serviceType,
        quotaTotal: quota.total,
        used: quota.used,
        overage,
      });
    }

    return {
      success: true,
      usageRecord,
      quota: {
        total: quota.total,
        used: quota.used,
        remaining: quota.remaining,
      },
      alert: willExceedQuota ? `⚠️ Quota exceeded! Over by ${overage} units` : null,
    };
  }

  /**
   * Get usage summary for a contract
   */
  private getUsageSummary(contractId: string, month?: number, year?: number): any {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();
    const trackingKey = `${contractId}-${targetYear}-${targetMonth}`;

    const tracking = this.usageTracking.get(trackingKey);

    if (!tracking) {
      return { error: 'No usage tracking found for this contract/period' };
    }

    const quotaSummary: any[] = [];
    tracking.quotas.forEach((quota, serviceType) => {
      quotaSummary.push({
        serviceType,
        total: quota.total,
        used: quota.used,
        remaining: quota.remaining,
        utilizationRate: Math.round((quota.used / quota.total) * 100),
        unitPrice: quota.unitPrice,
        valueUsed: quota.used * quota.unitPrice,
      });
    });

    return {
      contractId: tracking.contractId,
      supplier: tracking.supplier,
      period: tracking.period,
      quotas: quotaSummary,
      totalUsageRecords: tracking.usageRecords.length,
      totalBilled: tracking.totalBilled,
      totalQuotaValue: tracking.totalQuotaValue,
      overage: tracking.overage,
      utilizationRate: Math.round((tracking.totalBilled / tracking.totalQuotaValue) * 100),
    };
  }

  /**
   * Schedule payment batches for the month (7th, 17th, 27th)
   */
  private scheduleMonthlyPaymentBatches(): void {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    for (const day of this.PAYMENT_BATCH_DAYS) {
      const batchDate = new Date(currentYear, currentMonth, day);

      // Skip if date has passed
      if (batchDate < now) continue;

      // Collect all pending payments due before or on this batch date
      const batchPayments: PaymentBatch['payments'] = [];
      const suppliers = new Set<string>();
      let totalAmount = 0;

      for (const payable of this.payables.values()) {
        if (payable.status !== 'active') continue;

        for (const scheduleItem of payable.paymentSchedule) {
          if (scheduleItem.status === 'pending' && scheduleItem.date <= batchDate) {
            batchPayments.push({
              payableId: payable.id,
              supplier: payable.supplier.name,
              amount: scheduleItem.amount,
              scheduleItemIds: [scheduleItem.description], // Using description as ID for now
            });

            suppliers.add(payable.supplier.name);
            totalAmount += scheduleItem.amount;
          }
        }
      }

      if (batchPayments.length === 0) continue;

      const batch: PaymentBatch = {
        id: uuidv4(),
        scheduledDate: batchDate,
        suppliers: Array.from(suppliers),
        totalAmount,
        currency: this.companyInfo.currency,
        payments: batchPayments,
        status: 'scheduled',
      };

      this.paymentBatches.set(batch.id, batch);

      this.logEvent('Payment batch scheduled', {
        batchId: batch.id,
        date: batchDate,
        suppliers: batch.suppliers.length,
        totalAmount,
      });
    }
  }

  /**
   * Process payment batch on scheduled date
   */
  private async processPaymentBatch(batchId: string): Promise<any> {
    const batch = this.paymentBatches.get(batchId);

    if (!batch) {
      return { success: false, error: 'Batch not found' };
    }

    if (batch.status !== 'scheduled') {
      return { success: false, error: `Batch already ${batch.status}` };
    }

    batch.status = 'processing';

    const results: any[] = [];

    for (const payment of batch.payments) {
      try {
        const result = await this.recordPaymentMade({
          payableId: payment.payableId,
          amount: payment.amount,
          paymentDate: batch.scheduledDate,
        });

        results.push({
          supplier: payment.supplier,
          amount: payment.amount,
          success: result.success,
        });
      } catch (error: any) {
        results.push({
          supplier: payment.supplier,
          amount: payment.amount,
          success: false,
          error: error.message,
        });
      }
    }

    const allSuccessful = results.every(r => r.success);
    batch.status = allSuccessful ? 'completed' : 'failed';
    batch.processedAt = new Date();

    this.logEvent('Payment batch processed', {
      batchId,
      totalPayments: batch.payments.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    });

    return {
      success: allSuccessful,
      batch,
      results,
    };
  }

  /**
   * Get next payment batch date
   */
  private getNextPaymentBatchDate(): Date {
    const now = new Date();
    const currentDay = now.getDate();

    // Find next batch day
    const nextBatchDay = this.PAYMENT_BATCH_DAYS.find(day => day > currentDay);

    if (nextBatchDay) {
      // Next batch is this month
      return new Date(now.getFullYear(), now.getMonth(), nextBatchDay);
    } else {
      // Next batch is next month (7th)
      return new Date(now.getFullYear(), now.getMonth() + 1, this.PAYMENT_BATCH_DAYS[0]);
    }
  }

  /**
   * Get payment batch summary
   */
  private getPaymentBatchSummary(): any {
    const scheduled = Array.from(this.paymentBatches.values())
      .filter(b => b.status === 'scheduled');

    const nextBatchDate = this.getNextPaymentBatchDate();

    return {
      nextBatchDate,
      scheduledBatches: scheduled.length,
      batches: scheduled.map(b => ({
        id: b.id,
        date: b.scheduledDate,
        suppliers: b.suppliers.length,
        payments: b.payments.length,
        totalAmount: b.totalAmount,
      })),
      strategy: `Payments processed on ${this.PAYMENT_BATCH_DAYS.join(', ')} of each month`,
    };
  }

  /**
   * Request bank loan (for cash flow gaps)
   */
  private async requestBankLoan(data: {
    amount: number;
    currency: string;
    loanType: BankLoan['loanType'];
    termMonths: number;
    purpose: string;
    bankName?: string;
    interestRate?: number; // Bank can override default rate
  }): Promise<BankLoan> {
    const interestRate = data.interestRate || this.DEFAULT_LOAN_RATES[data.loanType];

    const now = new Date();
    const maturityDate = new Date(now);
    maturityDate.setMonth(maturityDate.getMonth() + data.termMonths);

    // Generate repayment schedule
    const repaymentSchedule: LoanRepaymentScheduleItem[] = [];
    let totalInterest = 0;

    for (let month = 1; month <= data.termMonths; month++) {
      const dueDate = new Date(now);
      dueDate.setMonth(dueDate.getMonth() + month);

      // Calculate interest for this month
      const monthlyInterest = (data.amount * interestRate) / 100;
      totalInterest += monthlyInterest;

      // Principal payment (balloon payment at end)
      const principalPayment = month === data.termMonths ? data.amount : 0;

      repaymentSchedule.push({
        month,
        dueDate,
        principal: principalPayment,
        interest: monthlyInterest,
        total: principalPayment + monthlyInterest,
        status: 'pending',
      });
    }

    const loan: BankLoan = {
      id: uuidv4(),
      bankName: data.bankName || 'Ada Bank',
      loanType: data.loanType,
      principalAmount: data.amount,
      currency: data.currency,
      interestRate,
      termMonths: data.termMonths,
      purpose: data.purpose,
      disbursementDate: now,
      maturityDate,
      repaymentSchedule,
      totalInterestCost: totalInterest,
      totalRepayment: data.amount + totalInterest,
      remainingPrincipal: data.amount,
      remainingInterest: totalInterest,
      status: 'active',
      createdAt: now,
    };

    this.bankLoans.set(loan.id, loan);

    // Record loan disbursement as income transaction
    const transaction: Transaction = {
      id: uuidv4(),
      type: 'income',
      category: 'bank-loan',
      amount: data.amount,
      currency: data.currency,
      description: `Bank loan: ${data.purpose}`,
      date: now,
    };

    this.transactions.set(transaction.id, transaction);

    this.remember('data', { loan }, ['bank-loan', 'financing'], 9);

    this.logEvent('Bank loan created', {
      loanId: loan.id,
      amount: data.amount,
      termMonths: data.termMonths,
      totalCost: totalInterest,
    });

    return loan;
  }

  /**
   * Record loan repayment
   */
  private async recordLoanRepayment(data: {
    loanId: string;
    month: number;
    paymentDate: Date;
  }): Promise<any> {
    const loan = this.bankLoans.get(data.loanId);

    if (!loan) {
      return { success: false, error: 'Loan not found' };
    }

    const scheduleItem = loan.repaymentSchedule.find(item => item.month === data.month);

    if (!scheduleItem) {
      return { success: false, error: 'Invalid month' };
    }

    if (scheduleItem.status === 'paid') {
      return { success: false, error: 'Already paid' };
    }

    // Mark as paid
    scheduleItem.status = 'paid';
    scheduleItem.paidAt = data.paymentDate;

    // Update remaining amounts
    loan.remainingPrincipal -= scheduleItem.principal;
    loan.remainingInterest -= scheduleItem.interest;

    // Check if fully paid off
    if (loan.remainingPrincipal <= 0) {
      loan.status = 'paid-off';
      loan.paidOffAt = data.paymentDate;
    }

    // Record transaction
    const transaction: Transaction = {
      id: uuidv4(),
      type: 'expense',
      category: 'loan-repayment',
      amount: scheduleItem.total,
      currency: loan.currency,
      description: `Loan repayment: ${loan.bankName} - Month ${data.month} (Principal: ${scheduleItem.principal}, Interest: ${scheduleItem.interest})`,
      date: data.paymentDate,
    };

    this.transactions.set(transaction.id, transaction);

    this.remember('data', { loanId: data.loanId, payment: scheduleItem }, ['loan-repayment'], 9);

    this.logEvent('Loan repayment recorded', {
      loanId: data.loanId,
      month: data.month,
      amount: scheduleItem.total,
      remainingPrincipal: loan.remainingPrincipal,
    });

    return {
      success: true,
      loan,
      payment: scheduleItem,
      remainingPrincipal: loan.remainingPrincipal,
      remainingInterest: loan.remainingInterest,
      status: loan.status,
    };
  }

  /**
   * Analyze cash flow gap and recommend loan
   */
  private analyzeCashFlowGap(days: number = 30): CashFlowGap | null {
    const forecast = this.getCashFlowForecast(days);

    if (forecast.summary.netCashFlow >= 0) {
      return null; // No gap
    }

    const gap = Math.abs(forecast.summary.netCashFlow);

    // Add 20% buffer for safety
    const recommendedLoanAmount = Math.round(gap * 1.2);

    // Determine severity
    let severity: CashFlowGap['severity'];
    if (gap < 10000) {
      severity = 'low';
    } else if (gap < 50000) {
      severity = 'medium';
    } else if (gap < 100000) {
      severity = 'high';
    } else {
      severity = 'critical';
    }

    return {
      period: forecast.period,
      expectedIncome: forecast.summary.expectedIncome,
      expectedExpense: forecast.summary.expectedExpense,
      gap,
      recommendedLoanAmount,
      severity,
    };
  }

  /**
   * Get active loans summary
   */
  private getActiveLoans(): any {
    const activeLoans = Array.from(this.bankLoans.values())
      .filter(loan => loan.status === 'active');

    const totalPrincipal = activeLoans.reduce((sum, loan) => sum + loan.remainingPrincipal, 0);
    const totalInterest = activeLoans.reduce((sum, loan) => sum + loan.remainingInterest, 0);

    // Get upcoming loan payments (next 30 days)
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const upcomingPayments: any[] = [];
    for (const loan of activeLoans) {
      for (const item of loan.repaymentSchedule) {
        if (item.status === 'pending' && item.dueDate <= thirtyDaysFromNow) {
          upcomingPayments.push({
            loanId: loan.id,
            bankName: loan.bankName,
            month: item.month,
            dueDate: item.dueDate,
            principal: item.principal,
            interest: item.interest,
            total: item.total,
          });
        }
      }
    }

    upcomingPayments.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return {
      totalActiveLoans: activeLoans.length,
      totalDebt: {
        principal: totalPrincipal,
        interest: totalInterest,
        total: totalPrincipal + totalInterest,
      },
      upcomingPayments,
      loans: activeLoans.map(loan => ({
        id: loan.id,
        bankName: loan.bankName,
        loanType: loan.loanType,
        principalAmount: loan.principalAmount,
        remainingPrincipal: loan.remainingPrincipal,
        remainingInterest: loan.remainingInterest,
        interestRate: loan.interestRate,
        maturityDate: loan.maturityDate,
      })),
    };
  }

  /**
   * Get loan details
   */
  private getLoanDetails(loanId: string): BankLoan | null {
    return this.bankLoans.get(loanId) || null;
  }
}
