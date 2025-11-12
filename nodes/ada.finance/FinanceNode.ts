/**
 * FinanceNode - AI-powered financial management node
 * Manages payments, invoicing, accounting, and financial tracking
 */

import { BaseNode, BaseNodeOptions } from '../../core/BaseNode.js';
import { v4 as uuidv4 } from 'uuid';

export interface FinanceNodeConfig extends Omit<BaseNodeOptions, 'type' | 'capabilities'> {
  companyInfo: {
    name: string;
    taxId: string;
    currency: string;
  };
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
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  items: InvoiceItem[];
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
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
          'financial-reporting',
          'transaction-tracking',
          'refund-processing',
          'multi-currency',
        ],
        services: [
          'payment-gateway',
          'invoice-generation',
          'financial-analytics',
          'tax-compliance',
          'payment-tracking',
          'revenue-reporting',
        ],
        integrations: [
          'stripe',
          'paypal',
          'bank-apis',
          'accounting-software',
          'tax-systems',
        ],
      },
    });

    this.companyInfo = config.companyInfo;
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
   * Create invoice
   */
  createInvoice(data: {
    customerId: string;
    customerName: string;
    items: InvoiceItem[];
    dueInDays?: number;
  }): Invoice {
    const amount = data.items.reduce((sum, item) => sum + item.total, 0);
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (data.dueInDays || 30));

    const invoice: Invoice = {
      id: uuidv4(),
      invoiceNumber: `INV-${this.invoiceCounter++}`,
      customerId: data.customerId,
      customerName: data.customerName,
      amount,
      currency: this.companyInfo.currency,
      items: data.items,
      status: 'sent',
      issueDate,
      dueDate,
    };

    this.invoices.set(invoice.id, invoice);

    // Record as pending income
    this.recordTransaction({
      type: 'income',
      category: 'invoice',
      amount,
      currency: this.companyInfo.currency,
      description: `Invoice ${invoice.invoiceNumber} for ${data.customerName}`,
      relatedEntityId: invoice.id,
    });

    this.remember('data', { invoice }, ['invoice', 'accounting'], 8);

    return invoice;
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
