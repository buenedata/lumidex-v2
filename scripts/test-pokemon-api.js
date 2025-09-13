#!/usr/bin/env node

/**
 * Pokemon TCG API Connection Test
 * Tests basic connectivity to Pokemon TCG API and diagnoses common issues
 */

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

async function testBasicConnectivity() {
  log('\n=== Basic Connectivity Test ===', colors.bold);
  
  try {
    const response = await fetch('https://api.pokemontcg.io/v2/cards?pageSize=1');
    
    if (response.ok) {
      const data = await response.json();
      success(`Pokemon TCG API is reachable`);
      success(`Sample response received with ${data.data?.length || 0} cards`);
      return true;
    } else {
      error(`API returned ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (err) {
    error(`Network error: ${err.message}`);
    return false;
  }
}

async function testWithApiKey() {
  log('\n=== API Key Test ===', colors.bold);
  
  const apiKey = process.env.POKEMONTCG_API_KEY;
  
  if (!apiKey) {
    warning('POKEMONTCG_API_KEY not found in environment');
    info('The API works without a key but has rate limits');
    info('Get a free API key at: https://dev.pokemontcg.io/');
    return false;
  }
  
  success(`API key found: ${apiKey.substring(0, 8)}...`);
  
  try {
    const response = await fetch('https://api.pokemontcg.io/v2/cards?pageSize=1', {
      headers: {
        'X-Api-Key': apiKey
      }
    });
    
    if (response.ok) {
      success('API key is valid and working');
      return true;
    } else {
      error(`API key test failed: ${response.status} ${response.statusText}`);
      
      if (response.status === 401 || response.status === 403) {
        warning('API key appears to be invalid or expired');
        info('Verify your API key at: https://dev.pokemontcg.io/');
      }
      
      return false;
    }
  } catch (err) {
    error(`API key test error: ${err.message}`);
    return false;
  }
}

async function testSpecificEndpoints() {
  log('\n=== Endpoint Tests ===', colors.bold);
  
  const apiKey = process.env.POKEMONTCG_API_KEY;
  const headers = apiKey ? { 'X-Api-Key': apiKey } : {};
  
  const endpoints = [
    { name: 'Sets', url: 'https://api.pokemontcg.io/v2/sets?pageSize=1' },
    { name: 'Cards', url: 'https://api.pokemontcg.io/v2/cards?pageSize=1' },
    { name: 'Cards with CardMarket', url: 'https://api.pokemontcg.io/v2/cards?q=cardmarket.prices:*&pageSize=1' }
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    try {
      info(`Testing ${endpoint.name}...`);
      const response = await fetch(endpoint.url, { headers });
      
      if (response.ok) {
        const data = await response.json();
        success(`${endpoint.name}: OK (${data.data?.length || 0} items)`);
        results[endpoint.name] = true;
        
        // Special check for CardMarket data
        if (endpoint.name === 'Cards with CardMarket' && data.data?.[0]?.cardmarket) {
          const card = data.data[0];
          success(`Sample CardMarket data found for: ${card.name}`);
          info(`CardMarket URL: ${card.cardmarket.url}`);
          info(`CardMarket prices available: ${Object.keys(card.cardmarket.prices || {}).length} variants`);
          
          // Check for enhanced pricing data
          const firstPrice = Object.values(card.cardmarket.prices || {})[0];
          if (firstPrice && typeof firstPrice === 'object' && firstPrice.avg30) {
            success('Enhanced CardMarket data with historical averages detected!');
          } else if (typeof firstPrice === 'number') {
            warning('Only basic CardMarket pricing detected (simple number format)');
          }
        }
      } else {
        error(`${endpoint.name}: ${response.status} ${response.statusText}`);
        results[endpoint.name] = false;
      }
    } catch (err) {
      error(`${endpoint.name}: ${err.message}`);
      results[endpoint.name] = false;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

async function diagnoseIssues() {
  log('\n=== Diagnosis & Recommendations ===', colors.bold);
  
  // Check environment
  if (!process.env.POKEMONTCG_API_KEY) {
    warning('Missing API Key');
    info('While the API works without a key, you may hit rate limits');
    info('Recommended: Get a free API key at https://dev.pokemontcg.io/');
    log('Add to .env.local: POKEMONTCG_API_KEY=your_key_here');
  }
  
  // Network suggestions
  info('If you\'re getting connection errors:');
  log('1. Check your internet connection');
  log('2. Verify firewall/proxy settings');
  log('3. Try accessing https://api.pokemontcg.io/v2/cards in your browser');
  
  // Rate limiting
  info('If you\'re getting 429 (rate limited):');
  log('1. Get an API key to increase rate limits');
  log('2. Add delays between requests');
  log('3. Use smaller page sizes');
  
  // 404 specific
  info('If you\'re getting 404 errors:');
  log('1. Verify the API endpoint URL is correct');
  log('2. Check if the Pokemon TCG API service is down');
  log('3. Ensure query parameters are properly formatted');
}

async function testCardMarketData() {
  log('\n=== CardMarket Data Test ===', colors.bold);
  
  const apiKey = process.env.POKEMONTCG_API_KEY;
  const headers = apiKey ? { 'X-Api-Key': apiKey } : {};
  
  try {
    // Try to fetch a recent card with CardMarket data
    const response = await fetch('https://api.pokemontcg.io/v2/cards?q=set.id:swsh1&pageSize=5', { headers });
    
    if (!response.ok) {
      error(`Failed to fetch test cards: ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    const cardsWithCardMarket = data.data.filter(card => card.cardmarket);
    
    if (cardsWithCardMarket.length === 0) {
      warning('No cards with CardMarket data found in test set');
      info('This might be normal - not all cards have CardMarket pricing');
      return false;
    }
    
    success(`Found ${cardsWithCardMarket.length} cards with CardMarket data`);
    
    // Analyze CardMarket data structure
    const sampleCard = cardsWithCardMarket[0];
    info(`Sample: ${sampleCard.name} (${sampleCard.id})`);
    
    if (sampleCard.cardmarket.prices) {
      const variants = Object.keys(sampleCard.cardmarket.prices);
      success(`CardMarket variants: ${variants.join(', ')}`);
      
      // Check price structure
      const firstVariant = variants[0];
      const priceData = sampleCard.cardmarket.prices[firstVariant];
      
      if (typeof priceData === 'number') {
        info('Price format: Simple number (legacy format)');
      } else if (typeof priceData === 'object') {
        info('Price format: Rich object (enhanced format)');
        const fields = Object.keys(priceData);
        info(`Available fields: ${fields.join(', ')}`);
        
        if (priceData.avg30 || priceData.avg7 || priceData.avg1) {
          success('Historical data (avg1/avg7/avg30) is available! 🎉');
        } else {
          warning('No historical data fields detected');
        }
      }
    }
    
    return true;
    
  } catch (err) {
    error(`CardMarket data test failed: ${err.message}`);
    return false;
  }
}

async function main() {
  log('🔍 Pokemon TCG API Connection Test', colors.bold + colors.blue);
  log('=====================================\n');
  
  const results = {};
  
  results.connectivity = await testBasicConnectivity();
  results.apiKey = await testWithApiKey();
  results.endpoints = await testSpecificEndpoints();
  results.cardmarket = await testCardMarketData();
  
  await diagnoseIssues();
  
  log('\n=== Summary ===', colors.bold);
  
  if (results.connectivity && results.endpoints.Cards) {
    success('✅ Pokemon TCG API is working correctly');
    
    if (results.cardmarket) {
      success('✅ CardMarket data is available');
      log('\nYou can now run: npm run ingest:cards');
    } else {
      warning('⚠️ CardMarket data may be limited');
      log('\nYou can still run: npm run ingest:cards');
      log('Check specific cards/sets for CardMarket availability');
    }
  } else {
    error('❌ Pokemon TCG API connection issues detected');
    log('\nPlease address the issues above before running card ingestion');
  }
  
  log('\nFor more help, visit: https://docs.pokemontcg.io/');
}

if (require.main === module) {
  main().catch(err => {
    error(`Test script failed: ${err.message}`);
    process.exit(1);
  });
}