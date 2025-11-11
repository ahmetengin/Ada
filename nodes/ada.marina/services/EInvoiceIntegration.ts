/**
 * EInvoiceIntegration - E-Invoice integration for Turkish marina operations
 * Integrates with e-Fatura (Turkish electronic invoice system)
 */

import { v4 as uuidv4 } from 'uuid';

export interface EInvoice {
  id: string;
  invoiceNumber: string;
  ettn: string; // Electronic Document Tracking Number
  customerId: string;
  customerName: string;
  customerTaxId: string;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'cancelled';
  notes?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // percentage
  amount: number;
}

export interface IntegratorConfig {
  apiUrl: string;
  apiKey: string;
  companyTaxId: string;
  companyName: string;
}

export class EInvoiceIntegration {
  private invoices: Map<string, EInvoice> = new Map();
  private config?: IntegratorConfig;

  /**
   * Configure integrator
   */
  configure(config: IntegratorConfig): void {
    this.config = config;
  }

  /**
   * Create e-invoice
   */
  createInvoice(
    customerId: string,
    customerName: string,
    customerTaxId: string,
    lineItems: InvoiceLineItem[],
    notes?: string
  ): EInvoice {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = lineItems.reduce(
      (sum, item) => sum + (item.amount * item.taxRate) / 100,
      0
    );
    const total = subtotal + taxAmount;

    const invoice: EInvoice = {
      id: uuidv4(),
      invoiceNumber: this.generateInvoiceNumber(),
      ettn: this.generateETTN(),
      customerId,
      customerName,
      customerTaxId,
      issueDate: new Date(),
      dueDate: this.calculateDueDate(new Date(), 30),
      currency: 'TRY',
      lineItems,
      subtotal,
      taxAmount,
      total,
      status: 'draft',
      notes,
    };

    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  /**
   * Send invoice to e-Fatura system
   */
  async sendInvoice(invoiceId: string): Promise<{
    success: boolean;
    message: string;
    ettn?: string;
  }> {
    const invoice = this.invoices.get(invoiceId);

    if (!invoice) {
      return { success: false, message: 'Invoice not found' };
    }

    if (!this.config) {
      return { success: false, message: 'Integrator not configured' };
    }

    // In production, this would make actual API call to e-Fatura integrator
    // For now, simulate the process
    try {
      invoice.status = 'sent';
      return {
        success: true,
        message: 'Invoice sent successfully',
        ettn: invoice.ettn,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send invoice: ${error}`,
      };
    }
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(invoiceId: string, reason: string): Promise<boolean> {
    const invoice = this.invoices.get(invoiceId);

    if (!invoice) return false;

    // Can only cancel sent invoices
    if (invoice.status !== 'sent') return false;

    // In production, would call API to cancel
    invoice.status = 'cancelled';
    invoice.notes = (invoice.notes || '') + `\nCancelled: ${reason}`;

    return true;
  }

  /**
   * Get invoice
   */
  getInvoice(invoiceId: string): EInvoice | undefined {
    return this.invoices.get(invoiceId);
  }

  /**
   * Get invoices by status
   */
  getInvoicesByStatus(status: EInvoice['status']): EInvoice[] {
    return Array.from(this.invoices.values()).filter(i => i.status === status);
  }

  /**
   * Get customer invoices
   */
  getCustomerInvoices(customerId: string): EInvoice[] {
    return Array.from(this.invoices.values()).filter(i => i.customerId === customerId);
  }

  /**
   * Generate invoice number
   */
  private generateInvoiceNumber(): string {
    const year = new Date().getFullYear();
    const sequence = this.invoices.size + 1;
    return `WIM${year}${sequence.toString().padStart(6, '0')}`;
  }

  /**
   * Generate ETTN (Electronic Document Tracking Number)
   */
  private generateETTN(): string {
    // ETTN format: 8-4-4-4-12 hexadecimal
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Calculate due date
   */
  private calculateDueDate(issueDate: Date, daysToAdd: number): Date {
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + daysToAdd);
    return dueDate;
  }

  /**
   * Generate invoice report
   */
  generateReport(startDate?: Date, endDate?: Date): {
    totalInvoices: number;
    byStatus: Record<string, number>;
    totalAmount: number;
    totalTax: number;
    currency: string;
  } {
    let invoices = Array.from(this.invoices.values());

    if (startDate) {
      invoices = invoices.filter(i => i.issueDate >= startDate);
    }
    if (endDate) {
      invoices = invoices.filter(i => i.issueDate <= endDate);
    }

    const byStatus: Record<string, number> = {
      draft: 0,
      sent: 0,
      accepted: 0,
      rejected: 0,
      cancelled: 0,
    };

    let totalAmount = 0;
    let totalTax = 0;

    invoices.forEach(invoice => {
      byStatus[invoice.status]++;
      if (invoice.status !== 'cancelled') {
        totalAmount += invoice.subtotal;
        totalTax += invoice.taxAmount;
      }
    });

    return {
      totalInvoices: invoices.length,
      byStatus,
      totalAmount,
      totalTax,
      currency: 'TRY',
    };
  }

  /**
   * Export invoice to XML (e-Fatura format)
   */
  exportToXML(invoiceId: string): string {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    // Simplified XML export - production would use proper e-Fatura XML schema
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice>
  <ID>${invoice.invoiceNumber}</ID>
  <UUID>${invoice.ettn}</UUID>
  <IssueDate>${invoice.issueDate.toISOString()}</IssueDate>
  <InvoiceTypeCode>SATIŞ</InvoiceTypeCode>
  <DocumentCurrencyCode>${invoice.currency}</DocumentCurrencyCode>
  <AccountingSupplierParty>
    <Party>
      <PartyName>${this.config?.companyName || 'West Istanbul Marina'}</PartyName>
      <PartyTaxScheme>
        <TaxSchemeID>${this.config?.companyTaxId || ''}</TaxSchemeID>
      </PartyTaxScheme>
    </Party>
  </AccountingSupplierParty>
  <AccountingCustomerParty>
    <Party>
      <PartyName>${invoice.customerName}</PartyName>
      <PartyTaxScheme>
        <TaxSchemeID>${invoice.customerTaxId}</TaxSchemeID>
      </PartyTaxScheme>
    </Party>
  </AccountingCustomerParty>
  <LegalMonetaryTotal>
    <LineExtensionAmount>${invoice.subtotal}</LineExtensionAmount>
    <TaxExclusiveAmount>${invoice.subtotal}</TaxExclusiveAmount>
    <TaxInclusiveAmount>${invoice.total}</TaxInclusiveAmount>
    <PayableAmount>${invoice.total}</PayableAmount>
  </LegalMonetaryTotal>
</Invoice>`;
  }
}
