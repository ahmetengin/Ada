/**
 * PaymentPersistence - Simple file-based persistence for payment data
 * Production: Replace with PostgreSQL/MongoDB
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface PersistedPayment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  provider: 'paytr' | 'iyzico';
  transactionId?: string;
  merchantOid: string;
  createdAt: string;
  paidAt?: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export class PaymentPersistence {
  private dataDir: string;
  private paymentsFile: string;

  constructor(dataDir: string = './data/payments') {
    this.dataDir = dataDir;
    this.paymentsFile = path.join(dataDir, 'payments.json');
  }

  /**
   * Initialize persistence (create directories if needed)
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });

      // Create file if it doesn't exist
      try {
        await fs.access(this.paymentsFile);
      } catch {
        await fs.writeFile(this.paymentsFile, JSON.stringify([], null, 2));
      }
    } catch (error: any) {
      console.error('Failed to initialize payment persistence:', error.message);
    }
  }

  /**
   * Save payment record
   */
  async savePayment(payment: PersistedPayment): Promise<void> {
    try {
      const payments = await this.loadAllPayments();

      // Remove existing payment with same ID (upsert)
      const filtered = payments.filter(p => p.id !== payment.id);
      filtered.push(payment);

      await fs.writeFile(
        this.paymentsFile,
        JSON.stringify(filtered, null, 2)
      );
    } catch (error: any) {
      console.error('Failed to save payment:', error.message);
      throw error;
    }
  }

  /**
   * Get payment by ID
   */
  async getPayment(id: string): Promise<PersistedPayment | null> {
    try {
      const payments = await this.loadAllPayments();
      return payments.find(p => p.id === id) || null;
    } catch (error: any) {
      console.error('Failed to get payment:', error.message);
      return null;
    }
  }

  /**
   * Get payment by merchant order ID
   */
  async getPaymentByMerchantOid(merchantOid: string): Promise<PersistedPayment | null> {
    try {
      const payments = await this.loadAllPayments();
      return payments.find(p => p.merchantOid === merchantOid) || null;
    } catch (error: any) {
      console.error('Failed to get payment by merchant OID:', error.message);
      return null;
    }
  }

  /**
   * Get all payments for a booking
   */
  async getPaymentsByBooking(bookingId: string): Promise<PersistedPayment[]> {
    try {
      const payments = await this.loadAllPayments();
      return payments.filter(p => p.bookingId === bookingId);
    } catch (error: any) {
      console.error('Failed to get payments by booking:', error.message);
      return [];
    }
  }

  /**
   * Get expired pending payments
   */
  async getExpiredPayments(): Promise<PersistedPayment[]> {
    try {
      const payments = await this.loadAllPayments();
      const now = new Date();

      return payments.filter(p => {
        if (p.status !== 'pending' || !p.expiresAt) return false;
        return new Date(p.expiresAt) < now;
      });
    } catch (error: any) {
      console.error('Failed to get expired payments:', error.message);
      return [];
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    id: string,
    status: PersistedPayment['status'],
    transactionId?: string
  ): Promise<void> {
    try {
      const payment = await this.getPayment(id);
      if (!payment) {
        throw new Error(`Payment ${id} not found`);
      }

      payment.status = status;
      if (transactionId) {
        payment.transactionId = transactionId;
      }
      if (status === 'paid') {
        payment.paidAt = new Date().toISOString();
      }

      await this.savePayment(payment);
    } catch (error: any) {
      console.error('Failed to update payment status:', error.message);
      throw error;
    }
  }

  /**
   * Get payment statistics
   */
  async getStatistics(): Promise<{
    total: number;
    pending: number;
    paid: number;
    failed: number;
    cancelled: number;
    totalAmount: number;
    paidAmount: number;
  }> {
    try {
      const payments = await this.loadAllPayments();

      const stats = {
        total: payments.length,
        pending: payments.filter(p => p.status === 'pending').length,
        paid: payments.filter(p => p.status === 'paid').length,
        failed: payments.filter(p => p.status === 'failed').length,
        cancelled: payments.filter(p => p.status === 'cancelled').length,
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
        paidAmount: payments
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + p.amount, 0),
      };

      return stats;
    } catch (error: any) {
      console.error('Failed to get payment statistics:', error.message);
      return {
        total: 0,
        pending: 0,
        paid: 0,
        failed: 0,
        cancelled: 0,
        totalAmount: 0,
        paidAmount: 0,
      };
    }
  }

  /**
   * Load all payments from file
   */
  private async loadAllPayments(): Promise<PersistedPayment[]> {
    try {
      const data = await fs.readFile(this.paymentsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      console.error('Failed to load payments:', error.message);
      return [];
    }
  }

  /**
   * Clean up old paid/failed payments (older than 90 days)
   */
  async cleanup(daysToKeep: number = 90): Promise<number> {
    try {
      const payments = await this.loadAllPayments();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const filtered = payments.filter(p => {
        // Keep all pending payments
        if (p.status === 'pending') return true;

        // Keep recent payments
        const createdAt = new Date(p.createdAt);
        return createdAt > cutoffDate;
      });

      const removed = payments.length - filtered.length;

      if (removed > 0) {
        await fs.writeFile(
          this.paymentsFile,
          JSON.stringify(filtered, null, 2)
        );
      }

      return removed;
    } catch (error: any) {
      console.error('Failed to cleanup payments:', error.message);
      return 0;
    }
  }
}
