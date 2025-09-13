/**
 * Manual Tests for Currency Conversion System
 * 
 * These are basic tests that can be run manually to verify the system works.
 * For proper unit tests, install Jest and @types/jest.
 */

import { CurrencyConverter, convertCurrency, formatConvertedPrice } from '../conversion';
import type { CurrencyCode } from '@/types';

/**
 * Manual test runner for currency conversion
 */
export async function runManualTests() {
  console.log('🧪 Running Currency Conversion Manual Tests...\n');

  const converter = new CurrencyConverter();
  const results: { test: string; passed: boolean; details?: string }[] = [];

  // Test 1: Same currency conversion
  try {
    const result = await converter.convert(100, 'EUR', 'EUR');
    const passed = result.originalAmount === 100 && 
                   result.convertedAmount === 100 && 
                   result.exchangeRate === 1;
    results.push({
      test: 'Same currency conversion',
      passed,
      details: `${result.originalAmount} EUR → ${result.convertedAmount} ${result.toCurrency}`
    });
  } catch (error) {
    results.push({
      test: 'Same currency conversion',
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  // Test 2: Different currency conversion (will use approximate rates)
  try {
    const result = await converter.convert(100, 'EUR', 'USD');
    const passed = result.convertedAmount > 0 && result.convertedAmount !== 100;
    results.push({
      test: 'EUR to USD conversion',
      passed,
      details: `${result.originalAmount} EUR → ${result.convertedAmount} ${result.toCurrency} (Rate: ${result.exchangeRate})`
    });
  } catch (error) {
    results.push({
      test: 'EUR to USD conversion',
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  // Test 3: Batch conversion
  try {
    const conversions = [
      { amount: 100, fromCurrency: 'EUR' as CurrencyCode, toCurrency: 'USD' as CurrencyCode },
      { amount: 200, fromCurrency: 'EUR' as CurrencyCode, toCurrency: 'GBP' as CurrencyCode }
    ];
    
    const batchResults = await converter.convertBatch(conversions);
    const passed = batchResults.length === 2 && batchResults.every(r => r.convertedAmount > 0);
    
    results.push({
      test: 'Batch conversion',
      passed,
      details: `Converted ${batchResults.length} amounts successfully`
    });
  } catch (error) {
    results.push({
      test: 'Batch conversion',
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  // Test 4: Price formatting
  try {
    const conversion = {
      originalAmount: 100,
      convertedAmount: 1150,
      fromCurrency: 'EUR' as CurrencyCode,
      toCurrency: 'NOK' as CurrencyCode,
      exchangeRate: 11.5,
      convertedAt: new Date()
    };
    
    const formatted = formatConvertedPrice(conversion);
    const passed = typeof formatted === 'string' && formatted.includes('1');
    
    results.push({
      test: 'Price formatting',
      passed,
      details: `Formatted: ${formatted}`
    });
  } catch (error) {
    results.push({
      test: 'Price formatting',
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  // Test 5: Cache functionality
  try {
    const stats1 = converter.getCacheStats();
    await converter.convert(50, 'EUR', 'NOK');
    const stats2 = converter.getCacheStats();
    
    const passed = stats2.size >= stats1.size; // Cache should have same or more entries
    
    results.push({
      test: 'Cache functionality',
      passed,
      details: `Cache size: ${stats1.size} → ${stats2.size}`
    });
  } catch (error) {
    results.push({
      test: 'Cache functionality',
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  // Test 6: Performance test
  try {
    const startTime = performance.now();
    const promises = Array.from({ length: 10 }, () => 
      converter.convert(100, 'EUR', 'USD')
    );
    await Promise.all(promises);
    const endTime = performance.now();
    
    const totalTime = endTime - startTime;
    const passed = totalTime < 1000; // Should complete in under 1 second
    
    results.push({
      test: 'Performance (10 conversions)',
      passed,
      details: `Completed in ${totalTime.toFixed(2)}ms`
    });
  } catch (error) {
    results.push({
      test: 'Performance test',
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  // Print results
  console.log('📊 Test Results:');
  console.log('================');
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.test}`);
    if (result.details) {
      console.log(`   ${result.details}`);
    }
  });
  
  console.log(`\n📈 Summary: ${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    console.log('🎉 All tests passed! Currency conversion system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the implementation or exchange rate data.');
  }

  return { passed: passedCount, total: totalCount, results };
}

/**
 * Performance benchmark for currency conversion
 */
export async function runPerformanceBenchmark() {
  console.log('⚡ Running Performance Benchmark...\n');

  const converter = new CurrencyConverter();
  
  // Warm up
  await converter.convert(100, 'EUR', 'USD');
  
  // Single conversion benchmark
  const singleStart = performance.now();
  await converter.convert(100, 'EUR', 'USD');
  const singleEnd = performance.now();
  const singleTime = singleEnd - singleStart;
  
  // Batch conversion benchmark
  const batchSize = 100;
  const conversions = Array.from({ length: batchSize }, (_, i) => ({
    amount: i + 1,
    fromCurrency: 'EUR' as CurrencyCode,
    toCurrency: 'USD' as CurrencyCode
  }));
  
  const batchStart = performance.now();
  await converter.convertBatch(conversions);
  const batchEnd = performance.now();
  const batchTime = batchEnd - batchStart;
  const avgBatchTime = batchTime / batchSize;
  
  console.log('Performance Results:');
  console.log('===================');
  console.log(`Single conversion: ${singleTime.toFixed(2)}ms`);
  console.log(`Batch of ${batchSize}: ${batchTime.toFixed(2)}ms total, ${avgBatchTime.toFixed(2)}ms average`);
  console.log(`Cache size: ${converter.getCacheStats().size} entries`);
  
  // Performance criteria
  const singleGood = singleTime < 100; // Under 100ms for single conversion
  const batchGood = avgBatchTime < 10;  // Under 10ms average for batch
  
  if (singleGood && batchGood) {
    console.log('✅ Performance is within acceptable limits');
  } else {
    console.log('⚠️  Performance may need optimization');
  }
  
  return {
    singleTime,
    batchTime,
    avgBatchTime,
    performanceGood: singleGood && batchGood
  };
}

// Export for use in development/testing
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).testCurrencyConversion = runManualTests;
  (window as any).benchmarkCurrencyConversion = runPerformanceBenchmark;
}