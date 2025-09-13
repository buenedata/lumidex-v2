#!/usr/bin/env node

/**
 * Debug CardMarket data ingestion specifically
 */

require('dotenv').config({ path: '.env.local' });

async function debugCardMarketIngestion() {
  console.log('🔍 Debugging CardMarket data ingestion...\n');
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log(`❌ Missing Supabase credentials`);
      return;
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Check 1: Look specifically for CardMarket prices
    console.log('🔍 Searching for CardMarket prices in database...');
    const { data: cardmarketPrices, error: cardmarketError } = await supabase
      .from('tcg_card_prices')
      .select('*')
      .eq('source', 'cardmarket')
      .limit(10);
    
    if (cardmarketError) {
      console.log(`❌ Error querying CardMarket prices: ${cardmarketError.message}`);
    } else if (!cardmarketPrices || cardmarketPrices.length === 0) {
      console.log(`⚠️ No CardMarket prices found in database!`);
      console.log(`   This explains why you're not seeing EUR prices.`);
    } else {
      console.log(`✅ Found ${cardmarketPrices.length} CardMarket price records`);
      cardmarketPrices.forEach((price, i) => {
        console.log(`${i + 1}. Card: ${price.card_id}, Variant: ${price.variant}`);
        console.log(`   Currency: ${price.currency}, Market: ${price.market}, Mid: ${price.mid}`);
      });
    }
    
    // Check 2: Test API call to see if we can get CardMarket data
    console.log('\n' + '='.repeat(60));
    console.log('🌐 Testing direct API call for CardMarket data...');
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (process.env.POKEMONTCG_API_KEY) {
      headers['X-Api-Key'] = process.env.POKEMONTCG_API_KEY;
    }
    
    // Get a specific card with CardMarket data
    const testUrl = 'https://api.pokemontcg.io/v2/cards/base1-4'; // Charizard - should have prices
    const response = await fetch(testUrl, { headers });
    
    if (!response.ok) {
      console.log(`❌ API call failed: ${response.status}`);
      return;
    }
    
    const cardData = await response.json();
    const card = cardData.data;
    
    console.log(`📝 Test card: ${card.name} (${card.id})`);
    console.log(`   Has CardMarket: ${!!card.cardmarket}`);
    console.log(`   Has TCGPlayer: ${!!card.tcgplayer}`);
    
    if (card.cardmarket && card.cardmarket.prices) {
      console.log(`\n💰 CardMarket price structure:`);
      console.log(`   URL: ${card.cardmarket.url}`);
      console.log(`   Updated: ${card.cardmarket.updatedAt}`);
      console.log(`   Price fields: ${Object.keys(card.cardmarket.prices).join(', ')}`);
      
      // Show actual values
      const prices = card.cardmarket.prices;
      console.log(`\n💵 Actual CardMarket prices:`);
      console.log(`   Average Sell: ${prices.averageSellPrice}`);
      console.log(`   Low Price: ${prices.lowPrice}`);
      console.log(`   Trend Price: ${prices.trendPrice}`);
      console.log(`   Suggested: ${prices.suggestedPrice}`);
    }
    
    // Check 3: Look at price ingestion history
    console.log('\n' + '='.repeat(60));
    console.log('📜 Checking recent price updates...');
    
    const { data: recentPrices, error: recentError } = await supabase
      .from('tcg_card_prices')
      .select('card_id, source, currency, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10);
    
    if (recentError) {
      console.log(`❌ Error fetching recent prices: ${recentError.message}`);
    } else if (recentPrices && recentPrices.length > 0) {
      console.log(`📊 Most recent price updates:`);
      recentPrices.forEach((price, i) => {
        console.log(`${i + 1}. ${price.card_id} (${price.source}/${price.currency}) - Updated: ${price.updated_at}`);
      });
    } else {
      console.log(`⚠️ No recent price updates found`);
    }
    
    // Check 4: Look for any 0.11 values in USD or conversion
    console.log('\n' + '='.repeat(60));
    console.log('🔍 Searching for 0.11 values or conversion issues...');
    
    // Check for very small USD prices that might convert to 0.11 NOK
    const nokRate = 10.65; // USD to NOK rate from earlier
    const targetUsd = 0.11 / nokRate; // What USD amount would give 0.11 NOK?
    
    console.log(`💱 USD amount that would convert to 0.11 NOK: ${targetUsd.toFixed(4)} USD`);
    
    const { data: smallPrices } = await supabase
      .from('tcg_card_prices')
      .select('card_id, market, mid, low, high, currency, source')
      .eq('currency', 'USD')
      .gte('market', targetUsd - 0.001)
      .lte('market', targetUsd + 0.001)
      .limit(5);
    
    if (smallPrices && smallPrices.length > 0) {
      console.log(`🎯 Found USD prices that would convert to ~0.11 NOK:`);
      smallPrices.forEach((price, i) => {
        const nokPrice = price.market * nokRate;
        console.log(`${i + 1}. ${price.card_id}: ${price.market} USD = ${nokPrice.toFixed(2)} NOK`);
      });
    } else {
      console.log(`ℹ️ No USD prices found that would convert to exactly 0.11 NOK`);
    }
    
  } catch (error) {
    console.error(`❌ Debug failed: ${error.message}`);
    console.error(error.stack);
  }
}

debugCardMarketIngestion().catch(console.error);