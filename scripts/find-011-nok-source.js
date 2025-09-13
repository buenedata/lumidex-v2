#!/usr/bin/env node

/**
 * Find the source of 0.11 NOK prices specifically
 */

require('dotenv').config({ path: '.env.local' });

async function find011NOKSource() {
  console.log('🔍 Finding source of 0.11 NOK prices...\n');
  
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
    
    // Test multiple cards that might produce 0.11 NOK when converted
    console.log('🎯 Testing cards that might result in 0.11 NOK...');
    
    // Find EUR prices that would convert to ~0.11 NOK
    const nokRate = 11.5; // Current EUR->NOK rate
    const targetEUR = 0.11 / nokRate; // ~0.0096 EUR
    
    console.log(`💡 Looking for EUR prices around ${targetEUR.toFixed(4)} that would convert to 0.11 NOK...`);
    
    const { data: candidateCards } = await supabase
      .from('tcg_card_prices')
      .select('card_id, market, mid, low, high, currency, source, variant')
      .eq('currency', 'EUR')
      .gte('market', targetEUR - 0.002)
      .lte('market', targetEUR + 0.002)
      .limit(10);
    
    if (candidateCards && candidateCards.length > 0) {
      console.log(`\n📋 Found ${candidateCards.length} EUR prices that would convert to ~0.11 NOK:`);
      
      for (const card of candidateCards) {
        const convertedNOK = card.market * nokRate;
        console.log(`   ${card.card_id}: ${card.market} EUR → ${convertedNOK.toFixed(2)} NOK`);
        
        // Test this card specifically
        const testResult = await testSpecificCard(card.card_id);
        if (testResult && testResult.price === 0.11) {
          console.log(`   🚨 THIS CARD PRODUCES 0.11 NOK!`);
        }
      }
    } else {
      console.log(`   No EUR prices found that would convert to exactly 0.11 NOK`);
    }
    
    // Test if it's a rounding issue
    console.log('\n🔍 Testing rounding behavior...');
    
    const testRounding = (eurAmount) => {
      const nokAmount = eurAmount * nokRate;
      const rounded = Math.round(nokAmount * 100) / 100;
      console.log(`   ${eurAmount} EUR → ${nokAmount.toFixed(4)} NOK → rounded: ${rounded} NOK`);
      return rounded;
    };
    
    // Test various small amounts
    [0.009, 0.0095, 0.0096, 0.01, 0.011].forEach(testRounding);
    
    // Find the exact EUR amount that rounds to 0.11 NOK
    for (let eur = 0.009; eur <= 0.012; eur += 0.0001) {
      const rounded = testRounding(eur);
      if (rounded === 0.11) {
        console.log(`   🎯 FOUND: ${eur.toFixed(4)} EUR rounds to exactly 0.11 NOK`);
        
        // Check if we have any cards with this exact price
        await checkForExactPrice(supabase, eur);
        break;
      }
    }
    
    // Check TCGPlayer USD prices that might be involved
    console.log('\n🇺🇸 Checking USD prices that might convert to 0.11 NOK...');
    
    const { data: usdRates } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('from_currency', 'USD')
      .eq('to_currency', 'NOK')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (usdRates && usdRates.length > 0) {
      const usdNokRate = usdRates[0].rate;
      const targetUSD = 0.11 / usdNokRate;
      
      console.log(`💡 Looking for USD prices around ${targetUSD.toFixed(4)} that would convert to 0.11 NOK...`);
      
      const { data: usdCandidates } = await supabase
        .from('tcg_card_prices')
        .select('card_id, market, currency, source')
        .eq('currency', 'USD')
        .gte('market', targetUSD - 0.002)
        .lte('market', targetUSD + 0.002)
        .limit(5);
      
      if (usdCandidates && usdCandidates.length > 0) {
        console.log(`   Found ${usdCandidates.length} USD candidates:`);
        usdCandidates.forEach(card => {
          const convertedNOK = card.market * usdNokRate;
          console.log(`   ${card.card_id}: ${card.market} USD → ${convertedNOK.toFixed(2)} NOK`);
        });
      }
    }
    
  } catch (error) {
    console.error(`❌ Search failed: ${error.message}`);
  }
}

async function testSpecificCard(cardId) {
  try {
    const response = await fetch('http://localhost:3000/api/cards/prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardIds: [cardId],
        forcePreferences: {
          preferred_currency: 'NOK',
          preferred_price_source: 'cardmarket'
        }
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data.length > 0) {
        const card = result.data[0];
        return card.price_data?.cheapest_variant_price;
      }
    }
  } catch (error) {
    // Ignore API errors for this test
  }
  return null;
}

async function checkForExactPrice(supabase, eurAmount) {
  const { data: exactMatches } = await supabase
    .from('tcg_card_prices')
    .select('card_id, market, currency')
    .eq('currency', 'EUR')
    .eq('market', eurAmount)
    .limit(3);
  
  if (exactMatches && exactMatches.length > 0) {
    console.log(`   💰 Found cards with exactly ${eurAmount} EUR:`);
    exactMatches.forEach(card => {
      console.log(`     ${card.card_id}: ${card.market} EUR`);
    });
  }
}

find011NOKSource().catch(console.error);