#!/usr/bin/env node

/**
 * Debug CardMarket data availability and processing
 */

require('dotenv').config({ path: '.env.local' });

async function debugCardMarketData() {
  console.log('🔍 Debugging CardMarket data availability and processing...\n');
  
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (process.env.POKEMONTCG_API_KEY) {
      headers['X-Api-Key'] = process.env.POKEMONTCG_API_KEY;
    }
    
    // Test 1: Check if CardMarket data exists in API
    console.log('Test 1: Checking CardMarket data availability');
    const url = 'https://api.pokemontcg.io/v2/cards?page=1&select=id,name,cardmarket,tcgplayer';
    console.log(`URL: ${url}`);
    
    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.log(`❌ API request failed: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    console.log(`✅ Got ${data.data.length} cards from API`);
    
    // Analyze CardMarket data availability
    let cardsWithCardmarket = 0;
    let cardsWithTcgplayer = 0;
    let cardmarketExamples = [];
    
    for (const card of data.data) {
      if (card.cardmarket && Object.keys(card.cardmarket).length > 0) {
        cardsWithCardmarket++;
        if (cardmarketExamples.length < 3) {
          cardmarketExamples.push({
            id: card.id,
            name: card.name,
            cardmarket: card.cardmarket
          });
        }
      }
      
      if (card.tcgplayer && Object.keys(card.tcgplayer).length > 0) {
        cardsWithTcgplayer++;
      }
    }
    
    console.log(`📊 CardMarket analysis:`);
    console.log(`   Cards with CardMarket data: ${cardsWithCardmarket}/${data.data.length}`);
    console.log(`   Cards with TCGPlayer data: ${cardsWithTcgplayer}/${data.data.length}`);
    
    if (cardmarketExamples.length > 0) {
      console.log(`\n💰 Sample CardMarket data:`);
      cardmarketExamples.forEach((example, i) => {
        console.log(`\n   Example ${i + 1}: ${example.name} (${example.id})`);
        console.log(`   CardMarket keys: ${Object.keys(example.cardmarket).join(', ')}`);
        
        if (example.cardmarket.prices) {
          console.log(`   Price variants: ${Object.keys(example.cardmarket.prices).join(', ')}`);
          
          // Check if we have rich price objects
          const firstVariant = Object.values(example.cardmarket.prices)[0];
          if (typeof firstVariant === 'object' && firstVariant !== null) {
            console.log(`   Rich price fields: ${Object.keys(firstVariant).join(', ')}`);
          } else {
            console.log(`   Simple price format: ${typeof firstVariant}`);
          }
        }
      });
    } else {
      console.log(`\n⚠️ No CardMarket data found in sample!`);
      console.log(`   This might explain why no prices are appearing in your database.`);
      
      // Show what we do have
      if (data.data.length > 0) {
        const sampleCard = data.data[0];
        console.log(`\n📝 Sample card structure:`);
        console.log(`   ID: ${sampleCard.id}`);
        console.log(`   Name: ${sampleCard.name || 'N/A'}`);
        console.log(`   Keys: ${Object.keys(sampleCard).join(', ')}`);
      }
    }
    
    // Test 2: Check database for existing prices
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test 2: Checking database for existing prices`);
    
    // Simple database check using node-postgres if available
    try {
      const { createClient } = require('@supabase/supabase-js');
      
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.log(`⚠️ Missing Supabase credentials - skipping database check`);
        return;
      }
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      // Check for any prices
      const { data: priceData, error: priceError } = await supabase
        .from('tcg_card_prices')
        .select('source, count(*)')
        .group('source');
      
      if (priceError) {
        console.log(`❌ Database query failed: ${priceError.message}`);
      } else {
        console.log(`📊 Current prices in database:`);
        if (priceData && priceData.length > 0) {
          priceData.forEach(row => {
            console.log(`   ${row.source}: ${row.count} price records`);
          });
        } else {
          console.log(`   No price records found`);
        }
      }
      
      // Check for CardMarket specifically
      const { data: cardmarketData, error: cardmarketError } = await supabase
        .from('tcg_card_prices')
        .select('*')
        .eq('source', 'cardmarket')
        .limit(5);
      
      if (!cardmarketError && cardmarketData && cardmarketData.length > 0) {
        console.log(`\n💰 Sample CardMarket prices in database:`);
        cardmarketData.forEach(price => {
          console.log(`   ${price.card_id} (${price.variant}): ${price.mid || price.market || 'N/A'} ${price.currency}`);
        });
      } else {
        console.log(`\n⚠️ No CardMarket prices found in database`);
      }
      
    } catch (dbError) {
      console.log(`⚠️ Could not check database: ${dbError.message}`);
    }
    
  } catch (error) {
    console.error(`❌ Debug failed: ${error.message}`);
  }
}

debugCardMarketData().catch(console.error);