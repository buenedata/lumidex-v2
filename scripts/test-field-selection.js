#!/usr/bin/env node

/**
 * Test field selection to verify we're only getting price data
 */

require('dotenv').config({ path: '.env.local' });

async function testFieldSelection() {
  console.log('🧪 Testing field selection for price-only data...\n');
  
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (process.env.POKEMONTCG_API_KEY) {
      headers['X-Api-Key'] = process.env.POKEMONTCG_API_KEY;
    }
    
    // Test 1: Full card data (to see the difference)
    console.log('Test 1: Full card data (baseline)');
    const fullUrl = 'https://api.pokemontcg.io/v2/cards?page=1';
    console.log(`URL: ${fullUrl}`);
    
    const fullResponse = await fetch(fullUrl, { headers });
    if (fullResponse.ok) {
      const fullData = await fullResponse.json();
      const fullSize = JSON.stringify(fullData).length;
      console.log(`✅ Full data: ${fullSize} characters, ${fullData.data.length} cards`);
      console.log(`   Sample fields: ${Object.keys(fullData.data[0] || {}).join(', ')}`);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test 2: Price-only fields
    console.log('Test 2: Price-only fields (optimized)');
    const priceUrl = 'https://api.pokemontcg.io/v2/cards?page=1&select=id,cardmarket,tcgplayer';
    console.log(`URL: ${priceUrl}`);
    
    const priceResponse = await fetch(priceUrl, { headers });
    if (priceResponse.ok) {
      const priceData = await priceResponse.json();
      const priceSize = JSON.stringify(priceData).length;
      console.log(`✅ Price-only data: ${priceSize} characters, ${priceData.data.length} cards`);
      console.log(`   Sample fields: ${Object.keys(priceData.data[0] || {}).join(', ')}`);
      
      // Calculate efficiency gain
      if (fullResponse.ok) {
        const fullSize = JSON.stringify(await fullResponse.clone().json()).length;
        const reduction = Math.round((1 - priceSize / fullSize) * 100);
        console.log(`\n🎯 Data reduction: ${reduction}% smaller!`);
        console.log(`   Full: ${Math.round(fullSize / 1024)}KB vs Price-only: ${Math.round(priceSize / 1024)}KB`);
      }
      
      // Check if we have price data
      const cardWithPrices = priceData.data.find(card => card.cardmarket || card.tcgplayer);
      if (cardWithPrices) {
        console.log(`\n💰 Sample price data found:`);
        if (cardWithPrices.cardmarket) {
          console.log(`   CardMarket: ${Object.keys(cardWithPrices.cardmarket).join(', ')}`);
        }
        if (cardWithPrices.tcgplayer) {
          console.log(`   TCGPlayer: ${Object.keys(cardWithPrices.tcgplayer).join(', ')}`);
        }
      }
    }
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
  }
}

testFieldSelection().catch(console.error);