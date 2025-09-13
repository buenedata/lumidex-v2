/**
 * Exchange Rate API Integration
 * Fetches exchange rates from exchangerate-api.io and manages rate storage
 */

import { createClient } from '@/lib/supabase/client';
import type { CurrencyCode } from '@/types';

export interface ExchangeRateResponse {
  success: boolean;
  base: string;
  date: string;
  rates: Record<string, number>;
  error?: {
    type: string;
    info: string;
  };
}

export interface ExchangeRateRecord {
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  rate: number;
  updated_at: string;
}

export class ExchangeRateAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public apiError?: any
  ) {
    super(message);
    this.name = 'ExchangeRateAPIError';
  }
}

export class ExchangeRateService {
  private readonly baseUrl = 'https://api.exchangerate-api.io/v4/latest';
  private readonly supportedCurrencies: CurrencyCode[] = ['EUR', 'USD', 'GBP', 'NOK'];
  
  /**
   * Fetch exchange rates from API for a specific base currency
   */
  async fetchRates(baseCurrency: CurrencyCode): Promise<ExchangeRateResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${baseCurrency}`, {
        headers: {
          'User-Agent': 'Lumidex-Currency-Service/1.0'
        }
      });

      if (!response.ok) {
        throw new ExchangeRateAPIError(
          `API request failed with status ${response.status}`,
          response.status
        );
      }

      const data: ExchangeRateResponse = await response.json();
      
      if (!data.success) {
        throw new ExchangeRateAPIError(
          `API returned error: ${data.error?.info || 'Unknown error'}`,
          undefined,
          data.error
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ExchangeRateAPIError) {
        throw error;
      }
      
      throw new ExchangeRateAPIError(
        `Failed to fetch exchange rates: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Store exchange rates in the database
   */
  async storeRates(rates: ExchangeRateRecord[]): Promise<void> {
    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from('exchange_rates')
        .upsert(rates, {
          onConflict: 'from_currency,to_currency,updated_at',
          ignoreDuplicates: true
        });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to store exchange rates: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Convert API response to database records
   */
  private convertToRecords(
    baseCurrency: CurrencyCode, 
    rates: Record<string, number>, 
    date: string
  ): ExchangeRateRecord[] {
    const records: ExchangeRateRecord[] = [];
    
    // Add rates from base currency to all supported currencies
    this.supportedCurrencies.forEach(targetCurrency => {
      if (targetCurrency !== baseCurrency && rates[targetCurrency]) {
        records.push({
          from_currency: baseCurrency,
          to_currency: targetCurrency,
          rate: rates[targetCurrency],
          updated_at: date
        });
      }
    });

    return records;
  }

  /**
   * Update all exchange rates (called by daily cron job)
   */
  async updateAllRates(): Promise<{
    success: boolean;
    updatedRates: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let updatedRates = 0;
    
    // We need to fetch rates from both EUR and USD since our prices are stored in these currencies
    const baseCurrencies: CurrencyCode[] = ['EUR', 'USD'];
    
    for (const baseCurrency of baseCurrencies) {
      try {
        console.log(`Fetching exchange rates for ${baseCurrency}...`);
        
        const response = await this.fetchRates(baseCurrency);
        const records = this.convertToRecords(baseCurrency, response.rates, response.date);
        
        if (records.length > 0) {
          await this.storeRates(records);
          updatedRates += records.length;
          console.log(`Stored ${records.length} rates for ${baseCurrency}`);
        }
        
        // Add a small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        const errorMessage = `Failed to update rates for ${baseCurrency}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        errors.push(errorMessage);
        console.error(errorMessage);
      }
    }

    return {
      success: errors.length === 0,
      updatedRates,
      errors
    };
  }

  /**
   * Get the latest exchange rate between two currencies
   */
  async getLatestRate(
    fromCurrency: CurrencyCode, 
    toCurrency: CurrencyCode
  ): Promise<number | null> {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const supabase = createClient();
    
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        console.warn(`No exchange rate found for ${fromCurrency} to ${toCurrency}`);
        return null;
      }

      return data.rate;
    } catch (error) {
      console.error(`Error fetching exchange rate: ${error}`);
      return null;
    }
  }

  /**
   * Get all latest exchange rates for a base currency
   */
  async getLatestRatesForCurrency(baseCurrency: CurrencyCode): Promise<Record<CurrencyCode, number>> {
    const supabase = createClient();
    
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('to_currency, rate')
        .eq('from_currency', baseCurrency)
        .order('updated_at', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const rates: Record<string, number> = {};
      
      // Get the latest rate for each currency pair
      data?.forEach(record => {
        if (!rates[record.to_currency]) {
          rates[record.to_currency] = record.rate;
        }
      });

      // Always include identity rate
      rates[baseCurrency] = 1;

      return rates as Record<CurrencyCode, number>;
    } catch (error) {
      console.error(`Error fetching rates for ${baseCurrency}:`, error);
      return { [baseCurrency]: 1 } as Record<CurrencyCode, number>;
    }
  }

  /**
   * Health check to verify API connectivity
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const response = await this.fetchRates('EUR');
      return { healthy: !!response.success };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Singleton instance
export const exchangeRateService = new ExchangeRateService();