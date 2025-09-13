/**
 * Tests for Currency Conversion System
 * 
 * Tests conversion accuracy, performance, and error handling
 */

import { CurrencyConverter, convertCurrency, formatConvertedPrice } from '../conversion';
import { exchangeRateService } from '../../exchange-rates/api';
import type { CurrencyCode } from '@/types';

// Mock the exchange rate service
jest.mock('../../exchange-rates/api');
const mockExchangeRateService = exchangeRateService as jest.Mocked<typeof exchangeRateService>;

describe('CurrencyConverter', () => {
  let converter: CurrencyConverter;

  beforeEach(() => {
    converter = new CurrencyConverter();
    converter.clearCache();
    jest.clearAllMocks();
  });

  describe('convert', () => {
    it('should return same amount for same currency', async () => {
      const result = await converter.convert(100, 'EUR', 'EUR');
      
      expect(result.originalAmount).toBe(100);
      expect(result.convertedAmount).toBe(100);
      expect(result.fromCurrency).toBe('EUR');
      expect(result.toCurrency).toBe('EUR');
      expect(result.exchangeRate).toBe(1);
      expect(result.error).toBeUndefined();
    });

    it('should convert between different currencies', async () => {
      mockExchangeRateService.getLatestRate.mockResolvedValue(11.5); // EUR to NOK
      
      const result = await converter.convert(100, 'EUR', 'NOK');
      
      expect(result.originalAmount).toBe(100);
      expect(result.convertedAmount).toBe(1150);
      expect(result.fromCurrency).toBe('EUR');
      expect(result.toCurrency).toBe('NOK');
      expect(result.exchangeRate).toBe(11.5);
      expect(result.error).toBeUndefined();
    });

    it('should round to 2 decimal places', async () => {
      mockExchangeRateService.getLatestRate.mockResolvedValue(1.23456);
      
      const result = await converter.convert(100, 'EUR', 'USD');
      
      expect(result.convertedAmount).toBe(123.46);
    });

    it('should use cache for repeated conversions', async () => {
      mockExchangeRateService.getLatestRate.mockResolvedValue(1.08);
      
      // First conversion
      await converter.convert(100, 'EUR', 'USD');
      
      // Second conversion should use cache
      const result = await converter.convert(200, 'EUR', 'USD');
      
      expect(mockExchangeRateService.getLatestRate).toHaveBeenCalledTimes(1);
      expect(result.convertedAmount).toBe(216);
    });

    it('should try inverse rate when direct rate not available', async () => {
      mockExchangeRateService.getLatestRate
        .mockResolvedValueOnce(null) // Direct rate not available
        .mockResolvedValueOnce(0.87); // Inverse rate available (USD to EUR)
      
      const result = await converter.convert(100, 'EUR', 'USD');
      
      expect(result.convertedAmount).toBe(114.94); // 100 / 0.87, rounded
      expect(result.fallbackUsed).toBe('inverse_calculation');
    });

    it('should use approximate rates when database rates unavailable', async () => {
      mockExchangeRateService.getLatestRate.mockResolvedValue(null);
      
      const result = await converter.convert(100, 'EUR', 'USD', { allowApproximate: true });
      
      expect(result.convertedAmount).toBe(108); // Approximate rate 1.08
      expect(result.isApproximate).toBe(true);
      expect(result.fallbackUsed).toBe('approximate_rate');
    });

    it('should return error when no conversion possible', async () => {
      mockExchangeRateService.getLatestRate.mockResolvedValue(null);
      
      const result = await converter.convert(100, 'EUR', 'USD', { allowApproximate: false });
      
      expect(result.originalAmount).toBe(100);
      expect(result.convertedAmount).toBe(100);
      expect(result.toCurrency).toBe('EUR'); // Kept original currency
      expect(result.error).toBeDefined();
    });

    it('should handle API errors gracefully', async () => {
      mockExchangeRateService.getLatestRate.mockRejectedValue(new Error('API Error'));
      
      const result = await converter.convert(100, 'EUR', 'USD');
      
      expect(result.error).toBeDefined();
      expect(result.convertedAmount).toBe(100);
    });
  });

  describe('convertBatch', () => {
    it('should convert multiple amounts efficiently', async () => {
      mockExchangeRateService.getLatestRate.mockResolvedValue(1.08);
      
      const conversions = [
        { amount: 100, fromCurrency: 'EUR' as CurrencyCode, toCurrency: 'USD' as CurrencyCode },
        { amount: 200, fromCurrency: 'EUR' as CurrencyCode, toCurrency: 'USD' as CurrencyCode },
        { amount: 50, fromCurrency: 'EUR' as CurrencyCode, toCurrency: 'USD' as CurrencyCode }
      ];
      
      const results = await converter.convertBatch(conversions);
      
      expect(results).toHaveLength(3);
      expect(results[0].convertedAmount).toBe(108);
      expect(results[1].convertedAmount).toBe(216);
      expect(results[2].convertedAmount).toBe(54);
      
      // Should use cache, so only one API call
      expect(mockExchangeRateService.getLatestRate).toHaveBeenCalledTimes(1);
    });
  });

  describe('canConvert', () => {
    it('should return true for same currency', async () => {
      const canConvert = await converter.canConvert('EUR', 'EUR');
      expect(canConvert).toBe(true);
    });

    it('should return true when rate is available', async () => {
      mockExchangeRateService.getLatestRate.mockResolvedValue(1.08);
      
      const canConvert = await converter.canConvert('EUR', 'USD');
      expect(canConvert).toBe(true);
    });

    it('should return false when no rate available', async () => {
      mockExchangeRateService.getLatestRate.mockResolvedValue(null);
      
      const canConvert = await converter.canConvert('EUR', 'USD', { allowApproximate: false });
      expect(canConvert).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should respect cache age', async () => {
      mockExchangeRateService.getLatestRate.mockResolvedValue(1.08);
      
      // First call
      await converter.convert(100, 'EUR', 'USD', { maxCacheAge: 1000 });
      
      // Wait for cache to expire (simulate)
      jest.advanceTimersByTime(2000);
      
      // Second call should fetch fresh rate
      await converter.convert(100, 'EUR', 'USD', { maxCacheAge: 1000 });
      
      expect(mockExchangeRateService.getLatestRate).toHaveBeenCalledTimes(2);
    });

    it('should clear cache correctly', async () => {
      mockExchangeRateService.getLatestRate.mockResolvedValue(1.08);
      
      await converter.convert(100, 'EUR', 'USD');
      
      const statsBefore = converter.getCacheStats();
      expect(statsBefore.size).toBeGreaterThan(0);
      
      converter.clearCache();
      
      const statsAfter = converter.getCacheStats();
      expect(statsAfter.size).toBe(0);
    });
  });
});

describe('formatConvertedPrice', () => {
  it('should format converted price correctly', () => {
    const conversion = {
      originalAmount: 100,
      convertedAmount: 1150,
      fromCurrency: 'EUR' as CurrencyCode,
      toCurrency: 'NOK' as CurrencyCode,
      exchangeRate: 11.5,
      convertedAt: new Date()
    };
    
    const formatted = formatConvertedPrice(conversion);
    expect(formatted).toBe('kr 1,150.00');
  });

  it('should add approximate indicator for approximate conversions', () => {
    const conversion = {
      originalAmount: 100,
      convertedAmount: 108,
      fromCurrency: 'EUR' as CurrencyCode,
      toCurrency: 'USD' as CurrencyCode,
      exchangeRate: 1.08,
      convertedAt: new Date(),
      isApproximate: true
    };
    
    const formatted = formatConvertedPrice(conversion);
    expect(formatted).toBe('~$108.00');
  });

  it('should handle fallback formatting', () => {
    const conversion = {
      originalAmount: 100,
      convertedAmount: 108,
      fromCurrency: 'EUR' as CurrencyCode,
      toCurrency: 'INVALID' as CurrencyCode, // Invalid currency to trigger fallback
      exchangeRate: 1.08,
      convertedAt: new Date()
    };
    
    const formatted = formatConvertedPrice(conversion);
    expect(formatted).toBe('108.00 INVALID');
  });
});

describe('convertCurrency utility', () => {
  it('should work as a convenience function', async () => {
    mockExchangeRateService.getLatestRate.mockResolvedValue(1.08);
    
    const result = await convertCurrency(100, 'EUR', 'USD');
    
    expect(result.convertedAmount).toBe(108);
    expect(result.fromCurrency).toBe('EUR');
    expect(result.toCurrency).toBe('USD');
  });
});

describe('Performance Tests', () => {
  beforeEach(() => {
    jest.setTimeout(10000); // 10 second timeout for performance tests
  });

  it('should handle large batch conversions efficiently', async () => {
    mockExchangeRateService.getLatestRate.mockResolvedValue(1.08);
    
    const conversions = Array.from({ length: 1000 }, (_, i) => ({
      amount: i + 1,
      fromCurrency: 'EUR' as CurrencyCode,
      toCurrency: 'USD' as CurrencyCode
    }));
    
    const startTime = performance.now();
    const results = await converter.convertBatch(conversions);
    const endTime = performance.now();
    
    expect(results).toHaveLength(1000);
    expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    
    // Should use cache efficiently
    expect(mockExchangeRateService.getLatestRate).toHaveBeenCalledTimes(1);
  });

  it('should convert individual amounts quickly', async () => {
    mockExchangeRateService.getLatestRate.mockResolvedValue(1.08);
    
    const iterations = 100;
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      await converter.convert(100, 'EUR', 'USD');
    }
    
    const endTime = performance.now();
    const avgTime = (endTime - startTime) / iterations;
    
    expect(avgTime).toBeLessThan(10); // Should average less than 10ms per conversion
  });
});

describe('Error Handling', () => {
  it('should handle network timeouts gracefully', async () => {
    mockExchangeRateService.getLatestRate.mockImplementation(
      () => new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
    );
    
    const result = await converter.convert(100, 'EUR', 'USD');
    
    expect(result.error).toBeDefined();
    expect(result.convertedAmount).toBe(100); // Falls back to original
  });

  it('should handle invalid currency gracefully in production', async () => {
    // This test simulates what happens if invalid data somehow gets through validation
    const result = await converter.convert(100, 'INVALID' as CurrencyCode, 'USD');
    
    expect(result.error).toBeDefined();
  });
});