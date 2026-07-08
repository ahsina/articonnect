import { Injectable, BadRequestException } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

export enum Currency {
  EUR = 'EUR',
  USD = 'USD',
  GBP = 'GBP',
}

export interface ExchangeRates {
  base: Currency;
  rates: Record<string, number>;
  lastUpdated: Date;
}

@Injectable()
export class CurrencyService {
  private readonly CACHE_KEY = 'currency:exchange_rates';
  private readonly CACHE_TTL = 3600; // 1 hour

  // Default exchange rates (should be updated from external API in production)
  private readonly DEFAULT_RATES: Record<Currency, Record<string, number>> = {
    [Currency.EUR]: {
      USD: 1.10,
      GBP: 0.85,
      EUR: 1.00,
    },
    [Currency.USD]: {
      EUR: 0.91,
      GBP: 0.77,
      USD: 1.00,
    },
    [Currency.GBP]: {
      EUR: 1.18,
      USD: 1.30,
      GBP: 1.00,
    },
  };

  constructor(private readonly redis: RedisService) {}

  /**
   * Convert amount from one currency to another
   */
  async convert(amount: number, from: Currency, to: Currency): Promise<number> {
    if (from === to) return amount;

    const rates = await this.getExchangeRates(from);
    const rate = rates.rates[to];

    if (!rate) {
      throw new BadRequestException(`Exchange rate not available for ${from} to ${to}`);
    }

    return Math.round(amount * rate * 100) / 100;
  }

  /**
   * Get exchange rates for a base currency
   */
  async getExchangeRates(base: Currency): Promise<ExchangeRates> {
    const cacheKey = `${this.CACHE_KEY}:${base}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // Corrupted cache; fall through to regenerate rates
      }
    }

    // In production, fetch from external API (e.g., exchangeratesapi.io)
    const rates: ExchangeRates = {
      base,
      rates: this.DEFAULT_RATES[base],
      lastUpdated: new Date(),
    };

    await this.redis.set(cacheKey, JSON.stringify(rates), this.CACHE_TTL);
    return rates;
  }

  /**
   * Format amount with currency symbol
   */
  formatAmount(amount: number, currency: Currency): string {
    const symbols = {
      [Currency.EUR]: '€',
      [Currency.USD]: '$',
      [Currency.GBP]: '£',
    };

    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    const symbol = symbols[currency];
    return currency === Currency.USD ? `${symbol}${formatted}` : `${formatted}${symbol}`;
  }

  /**
   * Get all supported currencies
   */
  getSupportedCurrencies(): Currency[] {
    return Object.values(Currency);
  }

  /**
   * Validate currency code
   */
  isValidCurrency(code: string): boolean {
    return Object.values(Currency).includes(code as Currency);
  }

  /**
   * Get currency for a country
   */
  getCurrencyForCountry(countryCode: string): Currency {
    const countryToCurrency: Record<string, Currency> = {
      LU: Currency.EUR,
      FR: Currency.EUR,
      BE: Currency.EUR,
      DE: Currency.EUR,
      ES: Currency.EUR,
      IT: Currency.EUR,
      US: Currency.USD,
      GB: Currency.GBP,
      UK: Currency.GBP,
    };

    return countryToCurrency[countryCode.toUpperCase()] || Currency.EUR;
  }

  /**
   * Convert price with fee calculation
   */
  async convertWithFees(
    amount: number,
    from: Currency,
    to: Currency,
    platformFeePercent: number = 12,
  ): Promise<{
    original: number;
    converted: number;
    platformFee: number;
    netAmount: number;
  }> {
    const converted = await this.convert(amount, from, to);
    const platformFee = Math.round(converted * (platformFeePercent / 100) * 100) / 100;
    const netAmount = converted - platformFee;

    return {
      original: amount,
      converted,
      platformFee,
      netAmount: Math.round(netAmount * 100) / 100,
    };
  }
}
