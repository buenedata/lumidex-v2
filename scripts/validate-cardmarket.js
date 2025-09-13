#!/usr/bin/env node

/**
 * CardMarket Integration Validation Script
 * Tests the enhanced CardMarket price integration end-to-end
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function warning(message) {
  log(`⚠️ ${message}`, colors.yellow);
}

function info(message) {
  log(`ℹ️ ${message}`, colors.blue);
}

async function validateEnvironment() {
  log('\n=== Environment Validation ===', colors.bold);
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'POKEMONTCG_API_KEY'
  ];
  
  let allPresent = true;
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      success(`${varName} is set`);
    } else {
      error(`${varName} is missing`);
      allPresent = false;
    }
  }
  
  return allPresent;
}

async function validateDatabaseSchema() {
  log('\n=== Database Schema Validation ===', colors.bold);
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Check if enhanced columns exist
    const { data: columns, error } = await supabase
      .rpc('get_column_info', { 
        table_name: 'tcg_card_prices' 
      })
      .select();
    
    if (error) {
      // Fallback query if RPC doesn't exist
      const { data: tableInfo } = await supabase
        .from('tcg_card_prices')
        .select('*')
        .limit(1);
      
      if (tableInfo && tableInfo[0]) {
        const sampleRecord = tableInfo[0];
        const enhancedFields = [
          'average_sell_price', 'german_pro_low', 'suggested_price',
          'reverse_holo_sell', 'reverse_holo_low', 'reverse_holo_trend',
          'low_price_ex_plus', 'trend', 'trend_price',
          'avg_1_day', 'avg_7_day', 'avg_30_day'
        ];
        
        let foundCount = 0;
        enhancedFields.forEach(field => {
          if (sampleRecord.hasOwnProperty(field)) {
            foundCount++;
            success(`Column '${field}' exists`);
          } else {
            error(`Column '${field}' missing`);
          }
        });
        
        if (foundCount === enhancedFields.length) {
          success('All enhanced CardMarket columns are present');
          return true;
        } else {
          error(`Only ${foundCount}/${enhancedFields.length} enhanced columns found`);
          return false;
        }
      }
    }
    
    success('Database schema validation completed');
    return true;
    
  } catch (err) {
    error(`Database schema validation failed: ${err.message}`);
    return false;
  }
}

async function validateCardMarketData() {
  log('\n=== CardMarket Data Validation ===', colors.bold);
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Check for CardMarket prices
    const { data: cardmarketPrices, error } = await supabase
      .from('tcg_card_prices')
      .select('*')
      .eq('source', 'cardmarket')
      .limit(10);
    
    if (error) {
      error(`Failed to fetch CardMarket prices: ${error.message}`);
      return false;
    }
    
    if (!cardmarketPrices || cardmarketPrices.length === 0) {
      warning('No CardMarket prices found in database');
      info('Run the card ingestion script to populate CardMarket data');
      return false;
    }
    
    success(`Found ${cardmarketPrices.length} CardMarket price records`);
    
    // Check for enhanced data
    let enhancedCount = 0;
    let historicalCount = 0;
    
    cardmarketPrices.forEach(price => {
      if (price.average_sell_price || price.suggested_price) {
        enhancedCount++;
      }
      if (price.avg_30_day || price.avg_7_day || price.avg_1_day) {
        historicalCount++;
      }
    });
    
    if (enhancedCount > 0) {
      success(`${enhancedCount} records have enhanced CardMarket data`);
    } else {
      warning('No enhanced CardMarket data found');
    }
    
    if (historicalCount > 0) {
      success(`${historicalCount} records have historical data`);
    } else {
      warning('No historical CardMarket data found');
    }
    
    // Sample record inspection
    const sampleRecord = cardmarketPrices[0];
    info(`Sample record for card: ${sampleRecord.card_id}`);
    info(`  Market price: ${sampleRecord.market || 'N/A'}`);
    info(`  Average sell: ${sampleRecord.average_sell_price || 'N/A'}`);
    info(`  30-day avg: ${sampleRecord.avg_30_day || 'N/A'}`);
    info(`  Trend: ${sampleRecord.trend || 'N/A'}`);
    
    return true;
    
  } catch (err) {
    error(`CardMarket data validation failed: ${err.message}`);
    return false;
  }
}

async function validateAPIIntegration() {
  log('\n=== API Integration Validation ===', colors.bold);
  
  try {
    // Test the price API endpoint
    const testCardIds = ['base1-1', 'xy1-1', 'swsh1-1']; // Common card IDs
    
    const response = await fetch('http://localhost:3000/api/cards/prices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cardIds: testCardIds,
        forcePreferences: {
          preferred_currency: 'EUR',
          preferred_price_source: 'cardmarket'
        }
      }),
    });
    
    if (!response.ok) {
      error(`API request failed with status: ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    
    if (!data.success) {
      error('API returned unsuccessful response');
      return false;
    }
    
    success('Price API responded successfully');
    
    // Check response structure
    if (data.data && Array.isArray(data.data)) {
      success(`API returned data for ${data.data.length} cards`);
      
      const firstCard = data.data[0];
      if (firstCard && firstCard.price_data) {
        success('Price data structure is correct');
        
        // Check for enhanced CardMarket data
        const cardmarketPrice = firstCard.price_data.preferred_source_prices
          .find(p => p.source === 'cardmarket');
        
        if (cardmarketPrice && cardmarketPrice.cardmarket_data) {
          success('Enhanced CardMarket data is included in API response');
          
          if (cardmarketPrice.cardmarket_data.avg30) {
            success('Historical data is available in API response');
          }
        }
        
        // Check for historical trends
        if (firstCard.price_data.has_historical_data) {
          success('Historical data flag is set correctly');
        }
        
        if (firstCard.price_data.historical_trends) {
          success('Historical trends data is included');
        }
      }
    }
    
    return true;
    
  } catch (err) {
    error(`API integration validation failed: ${err.message}`);
    warning('Make sure the development server is running (npm run dev)');
    return false;
  }
}

async function validateTypeScript() {
  log('\n=== TypeScript Validation ===', colors.bold);
  
  const { spawn } = require('child_process');
  
  return new Promise((resolve) => {
    const tsc = spawn('npx', ['tsc', '--noEmit'], {
      stdio: 'pipe'
    });
    
    let output = '';
    
    tsc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    tsc.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    tsc.on('close', (code) => {
      if (code === 0) {
        success('TypeScript compilation successful');
        resolve(true);
      } else {
        error('TypeScript compilation failed');
        if (output) {
          log(output, colors.red);
        }
        resolve(false);
      }
    });
  });
}

async function generateReport(results) {
  log('\n=== Validation Report ===', colors.bold);
  
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(Boolean).length;
  const failed = total - passed;
  
  log(`\nResults: ${passed}/${total} tests passed`);
  
  Object.entries(results).forEach(([test, passed]) => {
    if (passed) {
      success(test);
    } else {
      error(test);
    }
  });
  
  if (failed === 0) {
    log('\n🎉 All validations passed! CardMarket integration is ready.', colors.green + colors.bold);
  } else {
    log(`\n⚠️ ${failed} validation(s) failed. Please review and fix issues.`, colors.yellow + colors.bold);
  }
  
  log('\nNext Steps:', colors.bold);
  if (failed === 0) {
    log('1. Run card ingestion: npm run ingest:cards');
    log('2. Test the frontend interface');
    log('3. Monitor CardMarket data quality');
  } else {
    log('1. Fix failing validations');
    log('2. Re-run this validation script');
    log('3. Check the test plan for detailed debugging steps');
  }
}

async function main() {
  log('🚀 CardMarket Integration Validation', colors.bold + colors.blue);
  log('===================================\n');
  
  const results = {};
  
  // Run all validations
  results['Environment Setup'] = await validateEnvironment();
  results['Database Schema'] = await validateDatabaseSchema();
  results['CardMarket Data'] = await validateCardMarketData();
  results['API Integration'] = await validateAPIIntegration();
  results['TypeScript Compilation'] = await validateTypeScript();
  
  // Generate final report
  await generateReport(results);
}

// Handle script execution
if (require.main === module) {
  main().catch(err => {
    error(`Validation script failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  validateEnvironment,
  validateDatabaseSchema,
  validateCardMarketData,
  validateAPIIntegration,
  validateTypeScript
};