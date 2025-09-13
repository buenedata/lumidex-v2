#!/usr/bin/env node

/**
 * Debug the actual CardMarket data structure from Pokemon TCG API
 */

require('dotenv').config({ path: '.env.local' });

async function debugCardMarketStructure() {
  console.log('🔍 Debugging actual CardMarket data structure...\n');
  
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (process.env.POKEMONTCG_API_KEY) {
      headers['X-Api-Key'] = process.env.POKEMONTCG_API_KEY;
    }
    
    const url = 'https://api.pokemontcg.io/v2/cards?page=1';
    console.log(`Fetching from: ${url}`);
    
    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.log(`❌ Failed: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    console.log(`✅ Got ${data.data.length} cards`);
    
    // Find a card with CardMarket data
    const cardWithCardmarket = data.data.find(card => card.cardmarket && card.cardmarket.prices);
    
    if (!cardWithCardmarket) {
      console.log('❌ No cards with CardMarket data found');
      return;
    }
    
    console.log(`\n📋 Card: ${cardWithCardmarket.name} (${cardWithCardmarket.id})`);
    console.log(`\n💰 CardMarket structure:`);
    console.log(JSON.stringify(cardWithCardmarket.cardmarket, null, 2));
    
    console.log(`\n🔍 Prices object type: ${typeof cardWithCardmarket.cardmarket.prices}`);
    console.log(`🔍 Prices object keys: ${Object.keys(cardWithCardmarket.cardmarket.prices)}`);
    
    // Check individual fields
    const prices = cardWithCardmarket.cardmarket.prices;
    console.log(`\n📊 Individual price fields:`);
    console.log(`  averageSellPrice: ${prices.averageSellPrice} (type: ${typeof prices.averageSellPrice})`);
    console.log(`  lowPrice: ${prices.lowPrice} (type: ${typeof prices.lowPrice})`);
    console.log(`  avg1: ${prices.avg1} (type: ${typeof prices.avg1})`);
    console.log(`  germanProLow: ${prices.germanProLow} (type: ${typeof prices.germanProLow})`);
    console.log(`  reverseHoloSell: ${prices.reverseHoloSell} (type: ${typeof prices.reverseHoloSell})`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

debugCardMarketStructure().catch(console.error);