/**
 * FinanceNode - Minimal payment gateway integration  
 * Handles PayTR redirect-based payments (no card storage)
 */

import { BaseNode, BaseNodeOptions } from '../../core/BaseNode.js';
import crypto from 'crypto';
import axios from 'axios';

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

  constructor(config: FinanceNodeConfig) {
    super({
      ...config,
      type: 'ada.finance',
      capabilities: {
        skills: ['payment-link-generation', 'webhook-verification'],
        services: ['paytr-integration', 'payment-redirect'],
        integrations: ['paytr', 'ada.travel', 'ada.congress', 'ada.restaurant'],
      },
    });
    this.config = config.paymentGateway;
  }

  async initialize(): Promise<void> {
    this.logEvent('Finance node initializing', { provider: this.config.provider });
    this.setupFinanceHandlers();
    this.logEvent('Finance node initialized');
  }

  async processTask(task: any): Promise<any> {
    const { type, data } = task;
    switch (type) {
      case 'create-payment-link':
        return this.createPaymentLink(data);
      case 'verify-webhook':
        return this.verifyWebhookSignature(data);
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
  }): Promise<{ paymentUrl: string; merchantOid: string; expiresAt: Date }> {
    const merchantOid = \`ADA-\${data.bookingId}-\${Date.now()}\`;
    const amountInKurus = Math.round(data.amount * 100);

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

    return {
      paymentUrl: \`https://www.paytr.com/odeme/guvenli/\${response.data.token}\`,
      merchantOid,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
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
  }

  getStatus(): Record<string, any> {
    return { provider: this.config.provider, ready: true };
  }
}
