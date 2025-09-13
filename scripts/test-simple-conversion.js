#!/usr/bin/env node

/**
 * Simple test of currency conversion for 0.11 EUR -> NOK
 */

require('dotenv').config({ path: '.env.local' });

async function testSimpleConversion() {
  console.log('🔍 Testing 0.11 EUR -> NOK conversion...\n');
  
  try {
    // Test 1: Check exchange rates in database
    const { createClient } = require('@supabase/supabase-js');
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log(`❌ Missing Supabase credentials`);
      return;
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    console.log('📊 Checking EUR -> NOK exchange rate...');
    const { data: eurToNok } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('from_currency', 'EUR')
      .eq('to_currency', 'NOK')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (eurToNok && eurToNok.length > 0) {
      const rate = eurToNok[0];
      console.log(`✅ Found EUR -> NOK rate: ${rate.rate} (updated: ${rate.updated_at})`);
      
      const converted = 0.11 * rate.rate;
      console.log(`💱 Manual conversion: 0.11 EUR * ${rate.rate} = ${converted.toFixed(2)} NOK`);
      
      if (Math.round(converted * 100) / 100 === 0.11) {
        console.log(`🚨 ISSUE: This would round to 0.11 NOK - exchange rate problem!`);
      }
    } else {
      console.log(`⚠️ No EUR -> NOK rate found in database`);
    }
    
    // Test 2: Check if there's any 1:1 conversion happening
    console.log('\n🔍 Testing approximate rates...');
    
    // These are the approximate rates from the code
    const approxRates = {
      'EUR': { 'NOK': 11.80 },
      'USD': { 'NOK': 10.90 }
    };
    
    const approxConverted = 0.11 * approxRates.EUR.NOK;
    console.log(`💱 Using approximate rate: 0.11 EUR * ${approxRates.EUR.NOK} = ${approxConverted.toFixed(2)} NOK`);
    
    // Test 3: Look for patterns in the database
    console.log('\n📋 Checking for price patterns...');
    
    const { data: pricePatterns } = await supabase
      .from('tcg_card_prices')
      .select('card_id, market, currency, source')
      .in('market', [0.11, 0.12, 0.13, 0.10])
      .limit(10);
    
    if (pricePatterns && pricePatterns.length > 0) {
      console.log(`Found cards with small prices:`);
      const groupedByCurrency = {};
      pricePatterns.forEach(price => {
        if (!groupedByCurrency[price.currency]) {
          groupedByCurrency[price.currency] = [];
        }
        groupedByCurrency[price.currency].push(price.market);
      });
      
      Object.entries(groupedByCurrency).forEach(([currency, prices]) => {
        console.log(`   ${currency}: ${prices.join(', ')}`);
      });
    }
    
    // Test 4: Test if the issue is in the price selection logic
    console.log('\n🎯 Testing price selection logic...');
    
    const { data: testCard } = await supabase
      .from('tcg_card_prices')
      .select('*')
      .eq('card_id', 'bw10-1')
      .eq('currency', 'EUR');
    
    if (testCard && testCard.length > 0) {
      console.log(`Card bw10-1 EUR prices:`);
      testCard.forEach(price => {
        console.log(`   ${price.variant}: market=${price.market}, mid=${price.mid}, low=${price.low}, high=${price.high}`);
      });
      
      // Simulate the cheapest price finding logic
      const priceFields = ['market', 'mid', 'low', 'direct_low'];
      let cheapest = null;
      let cheapestPrice = Infinity;
      
      for (const priceData of testCard) {
        for (const field of priceFields) {
          const price = priceData[field];
          if (price && price > 0 && price < cheapestPrice) {
            cheapestPrice = price;
            cheapest = {
              variant: priceData.variant,
              price,
              currency: priceData.currency,
              price_type: field,
              source: priceData.source
            };
          }
        }
      }
      
      if (cheapest) {
        console.log(`\n💰 Cheapest price found: ${cheapest.price} ${cheapest.currency} (${cheapest.price_type}, ${cheapest.variant})`);
        
        // Check what happens when this gets converted
        if (eurToNok && eurToNok.length > 0) {
          const shouldBe = cheapest.price * eurToNok[0].rate;
          console.log(`   Should convert to: ${shouldBe.toFixed(2)} NOK`);
          
          if (shouldBe < 0.5) {
            console.log(`   ⚠️ Very small converted value - could be rounding issue`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
  }
}

testSimpleConversion().catch(console.error);