/**
 * Paraşüt API Adapter for ada.finance
 * https://apidocs.parasut.com/
 *
 * Paraşüt is Turkey's leading cloud accounting software
 * Integrates real invoicing, accounting, and financial management
 */

import axios, { AxiosInstance } from 'axios';

export interface ParasutConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  companyId: string; // Firma ID
  redirectUri?: string;
}

export interface ParasutContact {
  id?: string;
  type: 'contacts';
  attributes: {
    email: string;
    name: string;
    contact_type: 'person' | 'company';
    tax_office?: string;
    tax_number?: string;
    city?: string;
    district?: string;
    address?: string;
    phone?: string;
  };
}

export interface ParasutSalesInvoice {
  id?: string;
  type: 'sales_invoices';
  attributes: {
    item_type: 'invoice' | 'estimate' | 'cancelled' | 'recurring_invoice' | 'refund';
    description?: string;
    issue_date: string; // YYYY-MM-DD
    due_date?: string; // YYYY-MM-DD
    invoice_series?: string;
    invoice_id?: number;
    currency: 'TRL' | 'USD' | 'EUR' | 'GBP';
    exchange_rate?: number;
    withholding_rate?: number;
    vat_withholding_rate?: number;
    invoice_discount_type?: 'percentage' | 'amount';
    invoice_discount?: number;
    billing_address?: string;
    billing_phone?: string;
    billing_fax?: string;
    tax_office?: string;
    tax_number?: string;
    city?: string;
    district?: string;
    is_abroad?: boolean;
    order_no?: string;
    order_date?: string;
  };
  relationships: {
    contact: {
      data: {
        id: string;
        type: 'contacts';
      };
    };
    details: {
      data: ParasutSalesInvoiceDetail[];
    };
  };
}

export interface ParasutSalesInvoiceDetail {
  id?: string;
  type: 'sales_invoice_details';
  attributes: {
    product_code?: string;
    description: string;
    quantity: number;
    unit_price: number;
    vat_rate: number; // 0, 1, 8, 18, 20 etc.
    discount_type?: 'percentage' | 'amount';
    discount_value?: number;
    excise_duty_type?: number;
    excise_duty_value?: number;
    communications_tax_rate?: number;
  };
}

export interface ParasutPayment {
  id?: string;
  type: 'payments';
  attributes: {
    amount: number;
    date: string; // YYYY-MM-DD
    description?: string;
    account_id: string; // Kasa/Banka hesap ID
  };
  relationships: {
    payable: {
      data: {
        id: string;
        type: 'sales_invoices' | 'purchase_bills';
      };
    };
  };
}

export interface ParasutResponse<T> {
  data: T;
  included?: any[];
  meta?: any;
}

/**
 * Paraşüt API Client
 */
export class ParasutAdapter {
  private config: ParasutConfig;
  private client: AxiosInstance;
  private accessToken?: string;
  private tokenExpiresAt?: Date;
  private readonly baseUrl = 'https://api.parasut.com/v4';

  constructor(config: ParasutConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Authenticate with Paraşüt API (OAuth2 Password Grant)
   */
  async authenticate(): Promise<void> {
    try {
      const response = await axios.post('https://api.parasut.com/oauth/token', {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        username: this.config.username,
        password: this.config.password,
        grant_type: 'password',
        redirect_uri: this.config.redirectUri || 'urn:ietf:wg:oauth:2.0:oob',
      });

      this.accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 7200; // Default 2 hours
      this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

      // Set token in client
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
    } catch (error: any) {
      throw new Error(`Paraşüt authentication failed: ${error.message}`);
    }
  }

  /**
   * Check and refresh token if needed
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || !this.tokenExpiresAt || new Date() >= this.tokenExpiresAt) {
      await this.authenticate();
    }
  }

  /**
   * Create a contact (müşteri/tedarikçi)
   */
  async createContact(contact: ParasutContact): Promise<ParasutResponse<ParasutContact>> {
    await this.ensureAuthenticated();

    const response = await this.client.post(
      `/${this.config.companyId}/contacts`,
      { data: contact }
    );

    return response.data;
  }

  /**
   * Get contact by ID
   */
  async getContact(contactId: string): Promise<ParasutResponse<ParasutContact>> {
    await this.ensureAuthenticated();

    const response = await this.client.get(
      `/${this.config.companyId}/contacts/${contactId}`
    );

    return response.data;
  }

  /**
   * Find contact by email
   */
  async findContactByEmail(email: string): Promise<ParasutContact | null> {
    await this.ensureAuthenticated();

    try {
      const response = await this.client.get(
        `/${this.config.companyId}/contacts`,
        {
          params: {
            'filter[email]': email,
          },
        }
      );

      if (response.data.data && response.data.data.length > 0) {
        return response.data.data[0];
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Create sales invoice (satış faturası)
   */
  async createSalesInvoice(
    invoice: ParasutSalesInvoice
  ): Promise<ParasutResponse<ParasutSalesInvoice>> {
    await this.ensureAuthenticated();

    const response = await this.client.post(
      `/${this.config.companyId}/sales_invoices`,
      { data: invoice }
    );

    return response.data;
  }

  /**
   * Get sales invoice by ID
   */
  async getSalesInvoice(invoiceId: string): Promise<ParasutResponse<ParasutSalesInvoice>> {
    await this.ensureAuthenticated();

    const response = await this.client.get(
      `/${this.config.companyId}/sales_invoices/${invoiceId}`,
      {
        params: {
          include: 'contact,details',
        },
      }
    );

    return response.data;
  }

  /**
   * Create payment (ödeme)
   */
  async createPayment(payment: ParasutPayment): Promise<ParasutResponse<ParasutPayment>> {
    await this.ensureAuthenticated();

    const response = await this.client.post(
      `/${this.config.companyId}/payments`,
      { data: payment }
    );

    return response.data;
  }

  /**
   * Get e-Invoice (e-Fatura) PDF
   */
  async getInvoicePdf(invoiceId: string): Promise<Buffer> {
    await this.ensureAuthenticated();

    const response = await this.client.get(
      `/${this.config.companyId}/sales_invoices/${invoiceId}/pdf`,
      {
        responseType: 'arraybuffer',
      }
    );

    return Buffer.from(response.data);
  }

  /**
   * Send e-Invoice to customer
   */
  async sendEInvoice(invoiceId: string, email: string): Promise<void> {
    await this.ensureAuthenticated();

    await this.client.post(
      `/${this.config.companyId}/sales_invoices/${invoiceId}/send`,
      {
        data: {
          attributes: {
            email,
          },
        },
      }
    );
  }

  /**
   * Get accounts (kasa/banka hesapları)
   */
  async getAccounts(): Promise<any[]> {
    await this.ensureAuthenticated();

    const response = await this.client.get(`/${this.config.companyId}/accounts`);

    return response.data.data;
  }

  /**
   * Get financial reports
   */
  async getFinancialReport(startDate: string, endDate: string): Promise<any> {
    await this.ensureAuthenticated();

    const response = await this.client.get(
      `/${this.config.companyId}/reports/income_statement`,
      {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      }
    );

    return response.data;
  }

  /**
   * Get exchange rates (döviz kurları)
   */
  async getExchangeRates(date?: string): Promise<any> {
    await this.ensureAuthenticated();

    const queryDate = date || new Date().toISOString().split('T')[0];

    const response = await this.client.get(
      `/${this.config.companyId}/exchange_rates`,
      {
        params: { date: queryDate },
      }
    );

    return response.data.data;
  }

  /**
   * Get products (ürünler/hizmetler)
   */
  async getProducts(params?: { page?: number; per_page?: number }): Promise<any> {
    await this.ensureAuthenticated();

    const response = await this.client.get(`/${this.config.companyId}/products`, {
      params: {
        page: params?.page || 1,
        per_page: params?.per_page || 25,
      },
    });

    return response.data;
  }

  /**
   * Create product
   */
  async createProduct(product: {
    name: string;
    code?: string;
    vat_rate: number;
    sales_price?: number;
    purchase_price?: number;
    unit?: string;
  }): Promise<any> {
    await this.ensureAuthenticated();

    const response = await this.client.post(`/${this.config.companyId}/products`, {
      data: {
        type: 'products',
        attributes: product,
      },
    });

    return response.data;
  }

  /**
   * Get categories (kategoriler)
   */
  async getCategories(): Promise<any> {
    await this.ensureAuthenticated();

    const response = await this.client.get(`/${this.config.companyId}/item_categories`);

    return response.data;
  }

  /**
   * Get taxes (vergiler)
   */
  async getTaxes(): Promise<any> {
    await this.ensureAuthenticated();

    const response = await this.client.get(`/${this.config.companyId}/taxes`);

    return response.data;
  }

  /**
   * Archive/Cancel invoice
   */
  async archiveInvoice(invoiceId: string): Promise<void> {
    await this.ensureAuthenticated();

    await this.client.delete(`/${this.config.companyId}/sales_invoices/${invoiceId}`);
  }

  /**
   * Get invoice by invoice_no (fatura numarasına göre)
   */
  async findInvoiceByNumber(invoiceNumber: string): Promise<any> {
    await this.ensureAuthenticated();

    const response = await this.client.get(`/${this.config.companyId}/sales_invoices`, {
      params: {
        'filter[invoice_no]': invoiceNumber,
      },
    });

    return response.data.data[0] || null;
  }

  /**
   * Recover invoice from archive
   */
  async recoverInvoice(invoiceId: string): Promise<void> {
    await this.ensureAuthenticated();

    await this.client.patch(`/${this.config.companyId}/sales_invoices/${invoiceId}/recover`);
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.ensureAuthenticated();
      await this.client.get(`/${this.config.companyId}/me`);
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Helper functions for common operations
 */
export class ParasutHelper {
  /**
   * Convert Ada invoice to Paraşüt format
   */
  static convertToParasutInvoice(
    contactId: string,
    items: Array<{ description: string; quantity: number; unitPrice: number; vatRate: number }>,
    options: {
      issueDate?: Date;
      dueDate?: Date;
      currency?: 'TRL' | 'USD' | 'EUR';
      description?: string;
    } = {}
  ): ParasutSalesInvoice {
    const issueDate = options.issueDate || new Date();
    const dueDate = options.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    return {
      type: 'sales_invoices',
      attributes: {
        item_type: 'invoice',
        issue_date: issueDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        currency: options.currency || 'TRL',
        description: options.description,
      },
      relationships: {
        contact: {
          data: {
            id: contactId,
            type: 'contacts',
          },
        },
        details: {
          data: items.map(item => ({
            type: 'sales_invoice_details',
            attributes: {
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              vat_rate: item.vatRate,
            },
          })),
        },
      },
    };
  }

  /**
   * Format Turkish Lira amount
   */
  static formatTRY(amount: number): string {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  }

  /**
   * Calculate VAT (KDV)
   */
  static calculateVAT(amount: number, vatRate: number): number {
    return (amount * vatRate) / 100;
  }

  /**
   * Calculate total with VAT
   */
  static calculateTotalWithVAT(amount: number, vatRate: number): number {
    return amount + this.calculateVAT(amount, vatRate);
  }
}
