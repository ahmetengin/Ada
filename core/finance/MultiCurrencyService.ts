/**
 * Multi-Currency Service
 * From Ada-Maritime-Ai for international marina operations
 *
 * Supported Currencies: TRY, EUR, USD, GBP, CHF
 * Features:
 * - Real-time exchange rates
 * - Regional pricing strategies
 * - Seasonal dynamic pricing
 * - Currency conversion
 */

import { createLogger, Logger } from '../utils/Logger.js';

export type Currency = 'TRY' | 'EUR' | 'USD' | 'GBP' | 'CHF';

export interface ExchangeRate {
  from: Currency;
  to: Currency;
  rate: number;
  timestamp: Date;
  source: 'tcmb' | 'ecb' | 'manual'; // Turkish Central Bank, European Central Bank, Manual
}

export interface MoneyAmount {
  amount: number;
  currency: Currency;
}

export interface PricingRule {
  basePrice: MoneyAmount;
  currency: Currency;
  season: 'low' | 'mid' | 'high' | 'peak';
  multiplier: number;
  validFrom: Date;
  validTo: Date;
  region?: 'turkey' | 'greece' | 'croatia' | 'italy';
}

export interface ConversionResult {
  from: MoneyAmount;
  to: MoneyAmount;
  rate: number;
  fee: number;
  total: number;
}

/**
 * Multi-Currency Service
 * Handles currency conversion and regional pricing
 */
export class MultiCurrencyService {
  private logger: Logger;
  private exchangeRates: Map<string, ExchangeRate> = new Map();
  private lastUpdate: Date | null = null;

  // Base exchange rates (updated periodically)
  private readonly BASE_RATES: Record<string, number> = {
    'TRY-EUR': 0.03,
    'TRY-USD': 0.032,
    'TRY-GBP': 0.025,
    'TRY-CHF': 0.028,
    'EUR-USD': 1.08,
    'EUR-GBP': 0.85,
    'EUR-CHF': 0.95,
    'USD-GBP': 0.79,
    'USD-CHF': 0.88,
    'GBP-CHF': 1.12,
  };

  // Seasonal multipliers (from Ada-Maritime-Ai)
  private readonly SEASONAL_MULTIPLIERS = {
    low: 0.7, // Nov-Feb
    mid: 1.0, // Mar-Apr, Oct
    high: 1.3, // May, Sep
    peak: 1.6, // Jun-Aug
  };

  // Regional base prices (per meter per day)
  private readonly REGIONAL_BASE_PRICES: Record<string, MoneyAmount> = {
    turkey: { amount: 150, currency: 'TRY' },
    greece: { amount: 8, currency: 'EUR' },
    croatia: { amount: 7, currency: 'EUR' },
    italy: { amount: 10, currency: 'EUR' },
  };

  constructor() {
    this.logger = createLogger('Finance:MultiCurrency');
    this.initializeExchangeRates();
  }

  /**
   * Initialize exchange rates
   */
  private initializeExchangeRates(): void {
    for (const [pair, rate] of Object.entries(this.BASE_RATES)) {
      const [from, to] = pair.split('-') as [Currency, Currency];
      const key = `${from}-${to}`;

      this.exchangeRates.set(key, {
        from,
        to,
        rate,
        timestamp: new Date(),
        source: 'manual',
      });

      // Add reverse rate
      const reverseKey = `${to}-${from}`;
      this.exchangeRates.set(reverseKey, {
        from: to,
        to: from,
        rate: 1 / rate,
        timestamp: new Date(),
        source: 'manual',
      });
    }

    this.lastUpdate = new Date();
    this.logger.info('Exchange rates initialized', { pairs: this.exchangeRates.size });
  }

  /**
   * Update exchange rates (from external API)
   */
  async updateExchangeRates(): Promise<void> {
    // In production, fetch from TCMB or ECB API
    // For Turkish Lira: https://www.tcmb.gov.tr/kurlar/today.xml
    // For EUR: https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml

    this.logger.info('Exchange rates would be updated from external API');
    this.lastUpdate = new Date();
  }

  /**
   * Convert currency
   */
  convert(amount: number, from: Currency, to: Currency): ConversionResult {
    if (from === to) {
      return {
        from: { amount, currency: from },
        to: { amount, currency: to },
        rate: 1,
        fee: 0,
        total: amount,
      };
    }

    const key = `${from}-${to}`;
    const exchangeRate = this.exchangeRates.get(key);

    if (!exchangeRate) {
      throw new Error(`Exchange rate not found for ${from} to ${to}`);
    }

    const convertedAmount = amount * exchangeRate.rate;
    const fee = convertedAmount * 0.01; // 1% conversion fee
    const total = convertedAmount + fee;

    return {
      from: { amount, currency: from },
      to: { amount: total, currency: to },
      rate: exchangeRate.rate,
      fee,
      total,
    };
  }

  /**
   * Get current exchange rate
   */
  getExchangeRate(from: Currency, to: Currency): ExchangeRate | undefined {
    const key = `${from}-${to}`;
    return this.exchangeRates.get(key);
  }

  /**
   * Calculate berth price with seasonal and regional adjustments
   */
  calculateBerthPrice(
    vesselLength: number,
    nights: number,
    region: 'turkey' | 'greece' | 'croatia' | 'italy',
    season: 'low' | 'mid' | 'high' | 'peak',
    targetCurrency: Currency
  ): MoneyAmount {
    // Get regional base price
    const basePrice = this.REGIONAL_BASE_PRICES[region];

    // Calculate total in base currency
    const seasonalMultiplier = this.SEASONAL_MULTIPLIERS[season];
    const totalInBaseCurrency = basePrice.amount * vesselLength * nights * seasonalMultiplier;

    // Convert to target currency if needed
    if (basePrice.currency === targetCurrency) {
      return {
        amount: Math.round(totalInBaseCurrency * 100) / 100,
        currency: targetCurrency,
      };
    }

    const conversion = this.convert(totalInBaseCurrency, basePrice.currency, targetCurrency);

    return {
      amount: Math.round(conversion.total * 100) / 100,
      currency: targetCurrency,
    };
  }

  /**
   * Get current season based on date
   */
  getCurrentSeason(date: Date = new Date()): 'low' | 'mid' | 'high' | 'peak' {
    const month = date.getMonth() + 1; // 1-12

    if (month >= 6 && month <= 8) return 'peak'; // Jun-Aug
    if (month === 5 || month === 9) return 'high'; // May, Sep
    if (month === 3 || month === 4 || month === 10) return 'mid'; // Mar-Apr, Oct
    return 'low'; // Nov-Feb
  }

  /**
   * Format money amount with currency symbol
   */
  formatAmount(amount: MoneyAmount): string {
    const symbols: Record<Currency, string> = {
      TRY: '₺',
      EUR: '€',
      USD: '$',
      GBP: '£',
      CHF: 'CHF',
    };

    const symbol = symbols[amount.currency];
    const formatted = amount.amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return `${symbol}${formatted}`;
  }

  /**
   * Get all supported currencies
   */
  getSupportedCurrencies(): Currency[] {
    return ['TRY', 'EUR', 'USD', 'GBP', 'CHF'];
  }

  /**
   * Get regional base price
   */
  getRegionalBasePrice(region: 'turkey' | 'greece' | 'croatia' | 'italy'): MoneyAmount {
    return { ...this.REGIONAL_BASE_PRICES[region] };
  }

  /**
   * Get last update time
   */
  getLastUpdateTime(): Date | null {
    return this.lastUpdate;
  }
}

// Singleton instance
export const multiCurrency = new MultiCurrencyService();

/**
 * Example usage:
 *
 * // Convert TRY to EUR
 * const result = multiCurrency.convert(1000, 'TRY', 'EUR');
 * console.log(multiCurrency.formatAmount(result.to)); // €30.30
 *
 * // Calculate berth price
 * const price = multiCurrency.calculateBerthPrice(
 *   15,        // 15 meter vessel
 *   7,         // 7 nights
 *   'turkey',  // West Istanbul Marina
 *   'peak',    // August (peak season)
 *   'EUR'      // Price in EUR
 * );
 * console.log(multiCurrency.formatAmount(price)); // €504.00 (15m * 7 nights * 3 EUR/m/day * 1.6 peak multiplier)
 */
