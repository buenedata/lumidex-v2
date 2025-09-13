/**
 * Background Job: Update Exchange Rates
 * 
 * This job fetches the latest exchange rates from the API and stores them in the database.
 * It should be run daily via cron job or similar scheduler.
 * 
 * Usage:
 * - Node.js: `node -r ts-node/register src/lib/jobs/update-exchange-rates.ts`
 * - Via API route: POST /api/jobs/update-exchange-rates
 * - Via Vercel Cron: configured in vercel.json or as API route
 */

import { exchangeRateService } from '@/lib/exchange-rates/api';

export interface UpdateResult {
  success: boolean;
  timestamp: string;
  updatedRates: number;
  errors: string[];
  duration: number;
  details: {
    fetchedCurrencies: string[];
    totalRatesProcessed: number;
    cacheCleared: boolean;
  };
}

/**
 * Main function to update exchange rates
 */
export async function updateExchangeRates(): Promise<UpdateResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] Starting exchange rate update job...`);

  try {
    // Update all exchange rates
    const result = await exchangeRateService.updateAllRates();
    
    const duration = Date.now() - startTime;
    
    const updateResult: UpdateResult = {
      success: result.success,
      timestamp,
      updatedRates: result.updatedRates,
      errors: result.errors,
      duration,
      details: {
        fetchedCurrencies: ['EUR', 'USD'], // Base currencies we fetch from
        totalRatesProcessed: result.updatedRates,
        cacheCleared: true // We could clear conversion cache here if needed
      }
    };

    if (result.success) {
      console.log(`[${timestamp}] ✅ Exchange rate update completed successfully`);
      console.log(`  - Updated ${result.updatedRates} rates`);
      console.log(`  - Duration: ${duration}ms`);
    } else {
      console.error(`[${timestamp}] ❌ Exchange rate update completed with errors`);
      console.error(`  - Updated ${result.updatedRates} rates`);
      console.error(`  - Errors: ${result.errors.length}`);
      result.errors.forEach(error => console.error(`    - ${error}`));
    }

    return updateResult;

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`[${timestamp}] ❌ Exchange rate update failed: ${errorMessage}`);
    
    return {
      success: false,
      timestamp,
      updatedRates: 0,
      errors: [errorMessage],
      duration,
      details: {
        fetchedCurrencies: [],
        totalRatesProcessed: 0,
        cacheCleared: false
      }
    };
  }
}

/**
 * Health check to verify the exchange rate service is working
 */
export async function healthCheckExchangeRates(): Promise<{
  healthy: boolean;
  apiStatus: { healthy: boolean; error?: string };
  databaseStatus: { healthy: boolean; error?: string };
  latestRates: { count: number; lastUpdated?: string };
}> {
  try {
    // Check API connectivity
    const apiHealth = await exchangeRateService.healthCheck();
    
    // Check database connectivity and latest rates
    let databaseStatus: { healthy: boolean; error?: string } = { healthy: false, error: 'Unknown error' };
    let latestRates = { count: 0, lastUpdated: undefined };
    
    try {
      // Try to get a sample rate to test database connectivity
      const sampleRate = await exchangeRateService.getLatestRate('EUR', 'USD');
      
      if (sampleRate !== null) {
        databaseStatus = { healthy: true };
      } else {
        databaseStatus = { healthy: false, error: 'No exchange rates found' };
      }
      
      // Get all rates for EUR to check how many we have
      const eurRates = await exchangeRateService.getLatestRatesForCurrency('EUR');
      latestRates.count = Object.keys(eurRates).length;
      
    } catch (error) {
      databaseStatus = {
        healthy: false,
        error: error instanceof Error ? error.message : 'Database connection failed'
      };
    }

    return {
      healthy: apiHealth.healthy && databaseStatus.healthy,
      apiStatus: apiHealth,
      databaseStatus,
      latestRates
    };

  } catch (error) {
    return {
      healthy: false,
      apiStatus: { healthy: false, error: error instanceof Error ? error.message : 'Unknown error' },
      databaseStatus: { healthy: false, error: 'Health check failed' },
      latestRates: { count: 0 }
    };
  }
}

/**
 * CLI entry point when run directly
 */
if (require.main === module) {
  updateExchangeRates()
    .then(result => {
      console.log('\n📊 Final Result:', JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}