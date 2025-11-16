/**
 * FinanceNode - Minimal payment gateway integration  
 * Handles PayTR redirect-based payments (no card storage)
 */

import { BaseNode, BaseNodeOptions } from '../../core/BaseNode.js';
import crypto from 'crypto';
import axios from 'axios';
import { PaymentPersistence } from '../../core/persistence/PaymentPersistence.js';
import { PaymentMonitor } from '../../core/monitoring/PaymentMonitor.js';

export interface FinanceNodeConfig extends Omit<BaseNodeOptions, 'type' | 'capabilities'> {
  paymentGateway: {
    provider: 'paytr' | 'iyzico';
    merchantId: string;
    merchantKey: string;
    merchantSalt: string;
  };
}

export class FinanceNode extends BaseNode {
  private config: FinanceNodeConfig['paymentGateway'];
  private persistence: PaymentPersistence;
  private monitor: PaymentMonitor;

  // Refund tracking
  private refunds: Map<string, {
    refundId: string;
    originalTransactionId: string;
    merchantOid: string;
    amount: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    requestedBy: string;
    requestedAt: Date;
    completedAt?: Date;
    provider: 'paytr' | 'iyzico';
  }> = new Map();

  // GIB e-Fatura tracking
  private invoices: Map<string, {
    invoiceNumber: string;
    customerId: string;
    customerName: string;
    customerTaxId: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      vatRate: number;
      vatAmount: number;
      totalAmount: number;
    }>;
    subtotal: number;
    totalVat: number;
    totalAmount: number;
    withholdingAmount: number;
    currency: string;
    status: 'draft' | 'sent' | 'accepted' | 'rejected';
    gibStatus?: string;
    ettn?: string; // e-Fatura Unique ID
    createdAt: Date;
    sentAt?: Date;
  }> = new Map();

  constructor(config: FinanceNodeConfig) {
    super({
      ...config,
      type: 'ada.finance',
      capabilities: {
        skills: ['payment-link-generation', 'webhook-verification', 'payment-persistence', 'monitoring-alerting'],
        services: ['paytr-integration', 'payment-redirect', 'database-persistence', 'real-time-monitoring'],
        integrations: ['paytr', 'iyzico', 'ada.travel', 'ada.congress', 'ada.restaurant'],
      },
    });
    this.config = config.paymentGateway;
    this.persistence = new PaymentPersistence();
    this.monitor = new PaymentMonitor();
  }

  async initialize(): Promise<void> {
    this.logEvent('Finance node initializing', { provider: this.config.provider });

    // Initialize persistence
    await this.persistence.initialize();

    this.setupFinanceHandlers();

    // Start cleanup job (runs daily)
    setInterval(async () => {
      const removed = await this.persistence.cleanup(90); // Keep 90 days
      if (removed > 0) {
        this.logEvent('Payment cleanup completed', { removed });
      }
    }, 24 * 60 * 60 * 1000); // Daily

    this.logEvent('Finance node initialized');
  }

  async processTask(task: any): Promise<any> {
    const { type, data } = task;
    switch (type) {
      case 'create-payment-link':
        return this.createPaymentLink(data);
      case 'verify-webhook':
        return this.verifyWebhookSignature(data);
      case 'create-invoice':
        return this.createInvoice(data);
      case 'submit-to-gib':
        return this.submitToGIB(data);
      case 'get-invoice':
        return this.getInvoice(data.invoiceNumber);
      case 'get-health':
        return this.monitor.getHealthStatus();
      case 'get-metrics':
        return this.monitor.getStatistics(data.timeWindowMinutes || 60);
      case 'export-prometheus':
        return { metrics: this.monitor.exportPrometheusMetrics() };
      case 'request-refund':
        return this.requestRefund(data);
      case 'approve-refund':
        return this.approveRefund(data);
      case 'get-refund':
        return this.getRefund(data.refundId);
      default:
        throw new Error(\`Unknown task type: \${type}\`);
    }
  }

  async createPaymentLink(data: {
    bookingId: string;
    amount: number;
    currency: string;
    customerEmail: string;
    customerName: string;
    description: string;
  }): Promise<{ paymentUrl: string; merchantOid: string; expiresAt: Date; provider: string }> {
    // Try PayTR first, fallback to iyzico if it fails
    try {
      return await this.createPayTRLink(data);
    } catch (error: any) {
      console.error('PayTR payment link failed:', error.message);

      // Fallback to iyzico
      if (this.config.provider === 'iyzico') {
        console.log('Falling back to iyzico...');
        return await this.createIyzicoLink(data);
      }

      throw error;
    }
  }

  private async createPayTRLink(data: {
    bookingId: string;
    amount: number;
    currency: string;
    customerEmail: string;
    customerName: string;
    description: string;
  }): Promise<{ paymentUrl: string; merchantOid: string; expiresAt: Date; provider: string }> {
    const merchantOid = \`ADA-\${data.bookingId}-\${Date.now()}\`;
    const amountInKurus = Math.round(data.amount * 100);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const hashStr = \`\${this.config.merchantId}\${data.customerEmail}\${merchantOid}\${amountInKurus}\${this.config.merchantSalt}\`;
    const token = crypto.createHmac('sha256', this.config.merchantKey).update(hashStr).digest('base64');

    const requestData = {
      merchant_id: this.config.merchantId,
      user_ip: '127.0.0.1',
      merchant_oid: merchantOid,
      email: data.customerEmail,
      payment_amount: amountInKurus.toString(),
      currency: data.currency,
      user_basket: JSON.stringify([[data.description, data.amount, 1]]),
      no_installment: '1',
      max_installment: '0',
      user_name: data.customerName,
      user_address: 'N/A',
      user_phone: 'N/A',
      merchant_ok_url: \`\${process.env.BASE_URL || 'https://ada-ecosystem.com'}/payment/success\`,
      merchant_fail_url: \`\${process.env.BASE_URL || 'https://ada-ecosystem.com'}/payment/failed\`,
      timeout_limit: '30',
      lang: 'tr',
      paytr_token: token,
    };

    const response = await axios.post(
      'https://www.paytr.com/odeme/api/get-token',
      new URLSearchParams(requestData as any).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (response.data.status !== 'success') {
      throw new Error(\`PayTR error: \${response.data.reason}\`);
    }

    // Persist payment
    await this.persistence.savePayment({
      id: crypto.randomUUID(),
      bookingId: data.bookingId,
      amount: data.amount,
      currency: data.currency,
      status: 'pending',
      provider: 'paytr',
      merchantOid: merchantOid,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      metadata: {
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        description: data.description,
      },
    });

    // Track metric
    this.monitor.trackMetric({
      timestamp: new Date(),
      metricType: 'payment_created',
      provider: 'paytr',
      amount: data.amount,
      currency: data.currency,
      bookingId: data.bookingId,
    });

    return {
      paymentUrl: \`https://www.paytr.com/odeme/guvenli/\${response.data.token}\`,
      merchantOid,
      expiresAt: expiresAt,
      provider: 'paytr',
    };
  }

  private async createIyzicoLink(data: {
    bookingId: string;
    amount: number;
    currency: string;
    customerEmail: string;
    customerName: string;
    description: string;
  }): Promise<{ paymentUrl: string; merchantOid: string; expiresAt: Date; provider: string }> {
    const conversationId = \`ADA-\${data.bookingId}-\${Date.now()}\`;

    // iyzico uses different pricing format (string with 2 decimals)
    const priceFormatted = data.amount.toFixed(2);

    const requestData = {
      locale: 'tr',
      conversationId: conversationId,
      price: priceFormatted,
      paidPrice: priceFormatted,
      currency: data.currency === 'USD' ? 'USD' : 'TRY',
      basketId: data.bookingId,
      paymentGroup: 'PRODUCT',
      callbackUrl: \`\${process.env.BASE_URL || 'https://ada-ecosystem.com'}/payment/iyzico/callback\`,
      enabledInstallments: [1],
      buyer: {
        id: data.customerEmail,
        name: data.customerName.split(' ')[0] || 'Customer',
        surname: data.customerName.split(' ')[1] || 'User',
        email: data.customerEmail,
        identityNumber: '11111111111',
        registrationAddress: 'N/A',
        city: 'Istanbul',
        country: 'Turkey',
        ip: '127.0.0.1',
      },
      shippingAddress: {
        contactName: data.customerName,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'N/A',
      },
      billingAddress: {
        contactName: data.customerName,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'N/A',
      },
      basketItems: [
        {
          id: data.bookingId,
          name: data.description,
          category1: 'Service',
          itemType: 'VIRTUAL',
          price: priceFormatted,
        },
      ],
    };

    // Create authorization header for iyzico
    const randomString = crypto.randomBytes(16).toString('hex');
    const authString = [
      'apiKey:' + this.config.merchantKey,
      randomString,
      JSON.stringify(requestData),
    ].join('');

    const authHash = crypto
      .createHmac('sha256', this.config.merchantSalt)
      .update(authString)
      .digest('base64');

    const authHeader = \`apiKey:\${this.config.merchantId}&randomKey:\${randomString}&signature:\${authHash}\`;

    const response = await axios.post(
      'https://api.iyzipay.com/payment/iyzipos/checkoutform/initialize/auth/ecom',
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
      }
    );

    if (response.data.status !== 'success') {
      throw new Error(\`iyzico error: \${response.data.errorMessage}\`);
    }

    return {
      paymentUrl: response.data.paymentPageUrl,
      merchantOid: conversationId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      provider: 'iyzico',
    };
  }

  verifyWebhookSignature(data: {
    merchant_oid: string;
    status: string;
    total_amount: string;
    hash: string;
  }): boolean {
    const computedHash = crypto
      .createHmac('sha256', this.config.merchantKey)
      .update(data.merchant_oid + this.config.merchantSalt + data.status + data.total_amount)
      .digest('base64');
    return computedHash === data.hash;
  }

  private setupFinanceHandlers(): void {
    this.communication.onMessage('create-payment-link', async (message) => {
      return await this.createPaymentLink(message.payload);
    });
    this.communication.onMessage('verify-webhook', async (message) => {
      return { valid: this.verifyWebhookSignature(message.payload) };
    });
    this.communication.onMessage('create-invoice', async (message) => {
      return await this.createInvoice(message.payload);
    });
    this.communication.onMessage('submit-to-gib', async (message) => {
      return await this.submitToGIB(message.payload);
    });
  }

  // ========================================
  // REFUND SYSTEM
  // ========================================

  /**
   * Request a refund for a payment
   */
  async requestRefund(data: {
    merchantOid: string;
    amount: number;
    reason: string;
    requestedBy: string;
  }): Promise<any> {
    // Find the original payment
    const payment = await this.persistence.getPaymentByMerchantOid(data.merchantOid);

    if (!payment) {
      return { success: false, message: 'Original payment not found' };
    }

    if (payment.status !== 'paid') {
      return {
        success: false,
        message: `Cannot refund payment with status: ${payment.status}`,
      };
    }

    if (data.amount > payment.amount) {
      return {
        success: false,
        message: `Refund amount (${data.amount}) exceeds original payment (${payment.amount})`,
      };
    }

    const refundId = crypto.randomUUID();

    const refund = {
      refundId: refundId,
      originalTransactionId: payment.transactionId || payment.merchantOid,
      merchantOid: data.merchantOid,
      amount: data.amount,
      reason: data.reason,
      status: 'pending' as const,
      requestedBy: data.requestedBy,
      requestedAt: new Date(),
      provider: payment.provider,
    };

    this.refunds.set(refundId, refund);

    return {
      success: true,
      refund: refund,
      message: '⏳ Refund request created. Awaiting approval.',
    };
  }

  /**
   * Approve and process a refund
   */
  async approveRefund(data: {
    refundId: string;
    approvedBy: string;
  }): Promise<any> {
    const refund = this.refunds.get(data.refundId);

    if (!refund) {
      return { success: false, message: 'Refund request not found' };
    }

    if (refund.status !== 'pending') {
      return {
        success: false,
        message: `Refund already ${refund.status}`,
      };
    }

    // Process refund with payment gateway
    const result = await this.processRefundWithGateway(refund);

    if (result.success) {
      refund.status = 'completed';
      refund.completedAt = new Date();

      // Update payment status
      await this.persistence.updatePaymentStatus(
        refund.originalTransactionId,
        'cancelled'
      );

      return {
        success: true,
        refund: refund,
        message: '✅ Refund processed successfully',
        gatewayResponse: result,
      };
    } else {
      refund.status = 'rejected';

      return {
        success: false,
        refund: refund,
        message: `❌ Refund failed: ${result.error}`,
      };
    }
  }

  /**
   * Get refund status
   */
  getRefund(refundId: string): any {
    const refund = this.refunds.get(refundId);

    if (!refund) {
      return { success: false, message: 'Refund not found' };
    }

    return {
      success: true,
      refund: refund,
    };
  }

  /**
   * Process refund with payment gateway
   * Simulated - production would call actual gateway API
   */
  private async processRefundWithGateway(refund: {
    originalTransactionId: string;
    amount: number;
    provider: 'paytr' | 'iyzico';
  }): Promise<{ success: boolean; error?: string }> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 95% success rate simulation
    if (Math.random() > 0.05) {
      return { success: true };
    } else {
      return {
        success: false,
        error: 'Gateway refund API temporarily unavailable',
      };
    }
  }

  // ========================================
  // GIB e-FATURA INTEGRATION
  // ========================================

  /**
   * Create Turkish e-Fatura (GIB compliant)
   * Required by Turkish tax law for all commercial transactions
   */
  async createInvoice(data: {
    customerId: string;
    customerName: string;
    customerTaxId: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      vatRate: number; // Turkey uses 1%, 10%, 20% KDV rates
    }>;
    withholdingRate?: number; // Stopaj oranı (optional, 0-20%)
  }): Promise<any> {
    const invoiceNumber = this.generateInvoiceNumber();

    // Calculate totals
    let subtotal = 0;
    let totalVat = 0;

    const processedItems = data.items.map(item => {
      const amount = item.quantity * item.unitPrice;
      const vatAmount = amount * (item.vatRate / 100);

      subtotal += amount;
      totalVat += vatAmount;

      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        vatAmount: vatAmount,
        totalAmount: amount + vatAmount,
      };
    });

    const withholdingRate = data.withholdingRate || 0;
    const withholdingAmount = subtotal * (withholdingRate / 100);
    const totalAmount = subtotal + totalVat - withholdingAmount;

    const invoice = {
      invoiceNumber: invoiceNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      customerTaxId: data.customerTaxId,
      items: processedItems,
      subtotal: subtotal,
      totalVat: totalVat,
      totalAmount: totalAmount,
      withholdingAmount: withholdingAmount,
      currency: 'TRY',
      status: 'draft' as const,
      createdAt: new Date(),
    };

    this.invoices.set(invoiceNumber, invoice);

    return {
      success: true,
      invoice: invoice,
      message: 'e-Fatura oluşturuldu (taslak)',
    };
  }

  /**
   * Submit e-Fatura to GIB (Gelir İdaresi Başkanlığı)
   * Simulated for now - production would use GIB web service
   */
  async submitToGIB(data: { invoiceNumber: string }): Promise<any> {
    const invoice = this.invoices.get(data.invoiceNumber);

    if (!invoice) {
      return { success: false, message: 'Fatura bulunamadı' };
    }

    if (invoice.status === 'sent' || invoice.status === 'accepted') {
      return { success: false, message: 'Fatura zaten GIB\'e gönderilmiş' };
    }

    // Generate ETTN (e-Fatura Unique Number)
    const ettn = this.generateETTN();

    // Simulate GIB submission
    // In production, this would call GIB web service:
    // https://efatura.gib.gov.tr/FaturaBS/...
    const gibResponse = await this.simulateGIBSubmission(invoice, ettn);

    if (gibResponse.success) {
      invoice.status = 'accepted';
      invoice.ettn = ettn;
      invoice.gibStatus = 'KABUL EDİLDİ';
      invoice.sentAt = new Date();

      return {
        success: true,
        invoice: invoice,
        ettn: ettn,
        message: '✅ e-Fatura GIB\'e başarıyla gönderildi',
      };
    } else {
      invoice.status = 'rejected';
      invoice.gibStatus = gibResponse.error;

      return {
        success: false,
        invoice: invoice,
        message: \`❌ GIB reddi: \${gibResponse.error}\`,
      };
    }
  }

  /**
   * Get invoice by number
   */
  getInvoice(invoiceNumber: string): any {
    const invoice = this.invoices.get(invoiceNumber);

    if (!invoice) {
      return { success: false, message: 'Fatura bulunamadı' };
    }

    return {
      success: true,
      invoice: invoice,
    };
  }

  /**
   * Generate invoice number (Turkish format)
   * Example: ADA2025000001
   */
  private generateInvoiceNumber(): string {
    const year = new Date().getFullYear();
    const count = this.invoices.size + 1;
    return \`ADA\${year}\${count.toString().padStart(6, '0')}\`;
  }

  /**
   * Generate ETTN (e-Fatura Unique ID)
   * 36-character UUID format required by GIB
   */
  private generateETTN(): string {
    return crypto.randomUUID();
  }

  /**
   * Simulate GIB web service call
   * In production, this would integrate with actual GIB API
   */
  private async simulateGIBSubmission(
    invoice: any,
    ettn: string
  ): Promise<{ success: boolean; error?: string }> {
    // Validation checks (similar to GIB requirements)
    if (!invoice.customerTaxId || invoice.customerTaxId.length < 10) {
      return { success: false, error: 'Geçersiz vergi numarası' };
    }

    if (invoice.totalAmount <= 0) {
      return { success: false, error: 'Fatura tutarı sıfırdan büyük olmalı' };
    }

    if (invoice.items.length === 0) {
      return { success: false, error: 'Fatura kalemleri eksik' };
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // 95% success rate simulation
    if (Math.random() > 0.05) {
      return { success: true };
    } else {
      return { success: false, error: 'GIB sistemi geçici olarak kullanılamıyor' };
    }
  }

  async getStatus(): Promise<Record<string, any>> {
    const paymentStats = await this.persistence.getStatistics();
    const health = this.monitor.getHealthStatus();

    const refundStats = {
      total: this.refunds.size,
      pending: Array.from(this.refunds.values()).filter(r => r.status === 'pending').length,
      approved: Array.from(this.refunds.values()).filter(r => r.status === 'approved').length,
      completed: Array.from(this.refunds.values()).filter(r => r.status === 'completed').length,
      rejected: Array.from(this.refunds.values()).filter(r => r.status === 'rejected').length,
      totalAmount: Array.from(this.refunds.values())
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + r.amount, 0),
    };

    return {
      provider: this.config.provider,
      ready: true,
      health: health.status,
      payments: paymentStats,
      refunds: refundStats,
      monitoring: {
        status: health.status,
        stats: health.stats,
        recentAlerts: health.recentAlerts.length,
      },
      invoices: {
        total: this.invoices.size,
        draft: Array.from(this.invoices.values()).filter(i => i.status === 'draft').length,
        sent: Array.from(this.invoices.values()).filter(i => i.status === 'sent').length,
        accepted: Array.from(this.invoices.values()).filter(i => i.status === 'accepted').length,
        rejected: Array.from(this.invoices.values()).filter(i => i.status === 'rejected').length,
      },
      persistence: {
        enabled: true,
        type: 'file-based',
        note: 'Production: Migrate to PostgreSQL/MongoDB',
      },
    };
  }
}
