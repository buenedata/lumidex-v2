/**
 * Currency Conversion Service
 * Handles converting prices between currencies with fallback mechanisms
 */

import { exchangeRateService } from '@/lib/exchange-rates/api';
import type { CurrencyCode } from '@/types';

export interface ConversionResult {
  originalAmount: number;
  convertedAmount: number;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  exchangeRate: number;
  convertedAt: Date;
  isApproximate?: boolean;
  fallbackUsed?: string;
  error?: string;
}

export interface ConversionOptions {
  allowApproximate?: boolean;
  useCache?: boolean;
  maxCacheAge?: number; // in milliseconds
}

/**
 * Approximate exchange rates as fallback when API rates are unavailable
 * These are rough estimates and should only be used as last resort
 * Updated with more current rates (as of late 2024)
 */
const APPROXIMATE_RATES: Record<string, Record<string, number>> = {
  EUR: {
    USD: 1.08,
    GBP: 0.86,
    NOK: 11.80
  },
  USD: {
    EUR: 0.93,
    GBP: 0.79,
    NOK: 10.90
  },
  GBP: {
    EUR: 1.16,
    USD: 1.27,
    NOK: 13.70
  },
  NOK: {
    EUR: 0.085,
    USD: 0.092,
    GBP: 0.073
  }
};

export class CurrencyConversionError extends Error {
  constructor(
    message: string,
    public fromCurrency: CurrencyCode,
    public toCurrency: CurrencyCode,
    public originalAmount: number
  ) {
    super(message);
    this.name = 'CurrencyConversionError';
  }
}

export class CurrencyConverter {
  private rateCache = new Map<string, { rate: number; timestamp: number }>();
  private readonly defaultCacheAge = 5 * 60 * 1000; // 5 minutes

  /**
   * Convert an amount from one currency to another
   */
  async convert(
    amount: number,
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    const {
      allowApproximate = true,
      useCache = true,
      maxCacheAge = this.defaultCacheAge
    } = options;

    // No conversion needed if currencies are the same
    if (fromCurrency === toCurrency) {
      return {
        originalAmount: amount,
        convertedAmount: amount,
        fromCurrency,
        toCurrency,
        exchangeRate: 1,
        convertedAt: new Date()
      };
    }

    try {
      // Try to get exchange rate
      const rate = await this.getExchangeRate(
        fromCurrency,
        toCurrency,
        { useCache, maxCacheAge, allowApproximate }
      );

      const convertedAmount = amount * rate.value;

      return {
        originalAmount: amount,
        convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
        fromCurrency,
        toCurrency,
        exchangeRate: rate.value,
        convertedAt: new Date(),
        isApproximate: rate.isApproximate,
        fallbackUsed: rate.fallbackUsed
      };

    } catch (error) {
      // If all conversion attempts fail, return original amount with error
      return {
        originalAmount: amount,
        convertedAmount: amount,
        fromCurrency,
        toCurrency: fromCurrency, // Keep original currency
        exchangeRate: 1,
        convertedAt: new Date(),
        error: error instanceof Error ? error.message : 'Conversion failed'
      };
    }
  }

  /**
   * Get exchange rate between two currencies with fallback mechanisms
   */
  private async getExchangeRate(
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
    options: { useCache: boolean; maxCacheAge: number; allowApproximate: boolean }
  ): Promise<{ value: number; isApproximate?: boolean; fallbackUsed?: string }> {
    const cacheKey = `${fromCurrency}-${toCurrency}`;

    // Check cache first if enabled
    if (options.useCache) {
      const cached = this.rateCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < options.maxCacheAge) {
        return { value: cached.rate };
      }
    }

    try {
      // Primary: Try to get rate from database (latest API data)
      const dbRate = await exchangeRateService.getLatestRate(fromCurrency, toCurrency);
      
      if (dbRate !== null) {
        // Cache the rate
        if (options.useCache) {
          this.rateCache.set(cacheKey, { rate: dbRate, timestamp: Date.now() });
        }
        return { value: dbRate };
      }

      // Fallback 1: Try inverse rate calculation
      const inverseRate = await exchangeRateService.getLatestRate(toCurrency, fromCurrency);
      if (inverseRate !== null) {
        const calculatedRate = 1 / inverseRate;
        
        if (options.useCache) {
          this.rateCache.set(cacheKey, { rate: calculatedRate, timestamp: Date.now() });
        }
        
        return {
          value: calculatedRate,
          fallbackUsed: 'inverse_calculation'
        };
      }

      // Fallback 2: Try cross-currency conversion through USD or EUR
      const crossRate = await this.getCrossRate(fromCurrency, toCurrency);
      if (crossRate !== null) {
        if (options.useCache) {
          this.rateCache.set(cacheKey, { rate: crossRate, timestamp: Date.now() });
        }
        
        return {
          value: crossRate,
          fallbackUsed: 'cross_currency'
        };
      }

    } catch (error) {
      console.warn(`Database exchange rate lookup failed: ${error}`);
    }

    // Fallback 3: Always try approximate rates when database fails
    const approximateRate = this.getApproximateRate(fromCurrency, toCurrency);
    if (approximateRate !== null) {
      console.log(`Using approximate rate: ${fromCurrency} to ${toCurrency} = ${approximateRate}`);
      
      if (options.useCache) {
        this.rateCache.set(cacheKey, { rate: approximateRate, timestamp: Date.now() });
      }
      
      return {
        value: approximateRate,
        isApproximate: true,
        fallbackUsed: 'approximate_rate'
      };
    }

    throw new CurrencyConversionError(
      `No exchange rate available for ${fromCurrency} to ${toCurrency}`,
      fromCurrency,
      toCurrency,
      0
    );
  }

  /**
   * Try to get cross-currency rate through USD or EUR
   */
  private async getCrossRate(
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode
  ): Promise<number | null> {
    const intermediateCurrencies: CurrencyCode[] = ['USD', 'EUR'];

    for (const intermediate of intermediateCurrencies) {
      if (intermediate === fromCurrency || intermediate === toCurrency) {
        continue;
      }

      try {
        const fromToIntermediate = await exchangeRateService.getLatestRate(fromCurrency, intermediate);
        const intermediateToTo = await exchangeRateService.getLatestRate(intermediate, toCurrency);

        if (fromToIntermediate !== null && intermediateToTo !== null) {
          return fromToIntermediate * intermediateToTo;
        }
      } catch (error) {
        console.warn(`Cross-rate calculation failed through ${intermediate}:`, error);
      }
    }

    return null;
  }

  /**
   * Get approximate exchange rate as last resort
   */
  private getApproximateRate(
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode
  ): number | null {
    return APPROXIMATE_RATES[fromCurrency]?.[toCurrency] || null;
  }

  /**
   * Convert multiple amounts at once for better performance
   */
  async convertBatch(
    conversions: Array<{
      amount: number;
      fromCurrency: CurrencyCode;
      toCurrency: CurrencyCode;
    }>,
    options: ConversionOptions = {}
  ): Promise<ConversionResult[]> {
    return Promise.all(
      conversions.map(({ amount, fromCurrency, toCurrency }) =>
        this.convert(amount, fromCurrency, toCurrency, options)
      )
    );
  }

  /**
   * Clear conversion cache
   */
  clearCache(): void {
    this.rateCache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.rateCache.size,
      keys: Array.from(this.rateCache.keys())
    };
  }

  /**
   * Validate if conversion is possible between currencies
   */
  async canConvert(
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode
  ): Promise<boolean> {
    if (fromCurrency === toCurrency) {
      return true;
    }

    try {
      await this.getExchangeRate(fromCurrency, toCurrency, {
        useCache: true,
        maxCacheAge: this.defaultCacheAge,
        allowApproximate: true
      });
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance for the application
export const currencyConverter = new CurrencyConverter();

/**
 * Utility function for quick conversions
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  options?: ConversionOptions
): Promise<ConversionResult> {
  return currencyConverter.convert(amount, fromCurrency, toCurrency, options);
}

/**
 * Utility function to format converted price for display
 */
export function formatConvertedPrice(
  conversion: ConversionResult,
  options: Intl.NumberFormatOptions = {}
): string {
  const formatOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: conversion.toCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  };

  try {
    const formatted = new Intl.NumberFormat('en-US', formatOptions).format(conversion.convertedAmount);
    
    // Add approximate indicator if needed
    if (conversion.isApproximate) {
      return `~${formatted}`;
    }
    
    return formatted;
  } catch (error) {
    // Fallback formatting if Intl.NumberFormat fails
    return `${conversion.convertedAmount.toFixed(2)} ${conversion.toCurrency}`;
  }
}