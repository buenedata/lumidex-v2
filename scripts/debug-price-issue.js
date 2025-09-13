#!/usr/bin/env node

/**
 * Debug the 0.11 NOK price issue
 */

require('dotenv').config({ path: '.env.local' });

async function debugPriceIssue() {
  console.log('🔍 Debugging 0.11 NOK price issue...\n');
  
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
    
    // Check 1: Get price distribution
    console.log('📊 Checking price distribution...');
    const { data: priceData, error: priceError } = await supabase
      .from('tcg_card_prices')
      .select('source, currency, market, mid, low, high, variant')
      .limit(50);
    
    if (priceError) {
      console.log(`❌ Failed to fetch prices: ${priceError.message}`);
      return;
    }
    
    if (!priceData || priceData.length === 0) {
      console.log(`⚠️ No price data found in database`);
      return;
    }
    
    console.log(`✅ Found ${priceData.length} price records (showing first 50)`);
    
    // Analyze price patterns
    const priceAnalysis = {
      sources: {},
      currencies: {},
      priceValues: {},
      variants: {}
    };
    
    priceData.forEach(price => {
      // Sources
      priceAnalysis.sources[price.source] = (priceAnalysis.sources[price.source] || 0) + 1;
      
      // Currencies
      priceAnalysis.currencies[price.currency] = (priceAnalysis.currencies[price.currency] || 0) + 1;
      
      // Variants
      priceAnalysis.variants[price.variant] = (priceAnalysis.variants[price.variant] || 0) + 1;
      
      // Price values (check for 0.11)
      [price.market, price.mid, price.low, price.high].forEach(val => {
        if (val !== null && val !== undefined) {
          const rounded = Math.round(val * 100) / 100;
          priceAnalysis.priceValues[rounded] = (priceAnalysis.priceValues[rounded] || 0) + 1;
        }
      });
    });
    
    console.log('\n📈 Analysis:');
    console.log('Sources:', priceAnalysis.sources);
    console.log('Currencies:', priceAnalysis.currencies);
    console.log('Variants:', priceAnalysis.variants);
    
    // Check for 0.11 specifically
    const count011 = priceAnalysis.priceValues[0.11] || 0;
    console.log(`\n🎯 0.11 price occurrences: ${count011}`);
    
    if (count011 > 0) {
      console.log('⚠️ Found 0.11 prices! This might be the issue.');
      
      // Get specific 0.11 price records
      const { data: specificPrices } = await supabase
        .from('tcg_card_prices')
        .select('card_id, source, currency, market, mid, low, high, variant')
        .or('market.eq.0.11,mid.eq.0.11,low.eq.0.11,high.eq.0.11')
        .limit(10);
        
      if (specificPrices && specificPrices.length > 0) {
        console.log('\n💰 Sample 0.11 price records:');
        specificPrices.forEach((price, i) => {
          console.log(`${i + 1}. Card: ${price.card_id}`);
          console.log(`   Source: ${price.source}, Currency: ${price.currency}, Variant: ${price.variant}`);
          console.log(`   Prices: market=${price.market}, mid=${price.mid}, low=${price.low}, high=${price.high}`);
        });
      }
    }
    
    // Check 2: Test currency conversion
    console.log('\n' + '='.repeat(60));
    console.log('💱 Testing currency conversion from EUR to NOK...');
    
    // Get a sample EUR price
    const { data: eurPrices } = await supabase
      .from('tcg_card_prices')
      .select('card_id, market, mid, low, high')
      .eq('currency', 'EUR')
      .not('market', 'is', null)
      .limit(5);
    
    if (eurPrices && eurPrices.length > 0) {
      console.log('\n📝 Sample EUR prices before conversion:');
      eurPrices.forEach((price, i) => {
        console.log(`${i + 1}. Card: ${price.card_id}`);
        console.log(`   EUR prices: market=${price.market}, mid=${price.mid}, low=${price.low}, high=${price.high}`);
        
        // Manual conversion check using approximate rate
        const approxNokRate = 11.80; // From the conversion.ts file
        if (price.market) {
          const convertedMarket = price.market * approxNokRate;
          console.log(`   Converted market (${price.market} * ${approxNokRate}): ${convertedMarket.toFixed(2)} NOK`);
          
          if (Math.round(convertedMarket * 100) / 100 === 0.11) {
            console.log(`   ⚠️ This would result in 0.11 NOK! Original EUR price is very low.`);
          }
        }
      });
    }
    
    // Check 3: Exchange rates
    console.log('\n' + '='.repeat(60));
    console.log('💱 Checking exchange rates...');
    
    const { data: exchangeRates } = await supabase
      .from('exchange_rates')
      .select('from_currency, to_currency, rate, updated_at')
      .or('from_currency.eq.EUR,to_currency.eq.NOK')
      .order('updated_at', { ascending: false })
      .limit(10);
    
    if (exchangeRates && exchangeRates.length > 0) {
      console.log('📊 Recent exchange rates:');
      exchangeRates.forEach((rate, i) => {
        console.log(`${i + 1}. ${rate.from_currency} -> ${rate.to_currency}: ${rate.rate} (${rate.updated_at})`);
      });
    } else {
      console.log('⚠️ No exchange rates found - using approximate rates from code');
    }
    
  } catch (error) {
    console.error(`❌ Debug failed: ${error.message}`);
    console.error(error.stack);
  }
}

debugPriceIssue().catch(console.error);