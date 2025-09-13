#!/usr/bin/env node

/**
 * Test the specific currency conversion bug for 0.11 EUR -> NOK
 */

require('dotenv').config({ path: '.env.local' });

async function testCurrencyConversionBug() {
  console.log('🔍 Testing 0.11 EUR -> NOK conversion bug...\n');
  
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
    
    // Find any cards with 0.11 EUR prices
    console.log('🎯 Finding cards with 0.11 EUR prices...');
    const { data: problemCards } = await supabase
      .from('tcg_card_prices')
      .select('*')
      .eq('currency', 'EUR')
      .eq('market', 0.11)
      .limit(5);
    
    if (!problemCards || problemCards.length === 0) {
      console.log('❌ Could not find any cards with 0.11 EUR prices');
      
      // Let's find cards with any small EUR prices
      const { data: smallPrices } = await supabase
        .from('tcg_card_prices')
        .select('*')
        .eq('currency', 'EUR')
        .lte('market', 1.0)
        .limit(5);
        
      if (smallPrices && smallPrices.length > 0) {
        console.log('\n📊 Found cards with small EUR prices:');
        smallPrices.forEach((card, i) => {
          console.log(`${i + 1}. ${card.card_id}: ${card.market} EUR`);
        });
        
        // Use the first one for testing
        var problemCard = smallPrices[0];
      } else {
        console.log('❌ No small EUR prices found at all');
        return;
      }
    } else {
      var problemCard = problemCards[0];
      console.log(`✅ Found ${problemCards.length} cards with 0.11 EUR price`);
    }
    
    console.log(`\n📝 Using test card:`);
    console.log(`   Card ID: ${problemCard.card_id}`);
    console.log(`   Source: ${problemCard.source}`);
    console.log(`   Currency: ${problemCard.currency}`);
    console.log(`   Market Price: ${problemCard.market} EUR`);
    console.log(`   Variant: ${problemCard.variant}`);
    
    // Test the price service directly
    console.log('\n🧪 Testing price service directly...');
    
    const pathLib = require('path');
    const { cardPriceService } = require(pathLib.join(process.cwd(), 'src/lib/db/price-queries'));
    
    try {
      const userPreferences = {
        preferred_currency: 'NOK',
        preferred_price_source: 'cardmarket'
      };
      
      const cardsWithPrices = await cardPriceService.getCardsWithPrices([problemCard.card_id], userPreferences);
      
      if (cardsWithPrices.length > 0) {
        const cardWithPrice = cardsWithPrices[0];
        console.log(`✅ Price service result:`);
        console.log(`   Card: ${cardWithPrice.name || cardWithPrice.id}`);
        
        if (cardWithPrice.price_data && cardWithPrice.price_data.cheapest_variant_price) {
          const cheapest = cardWithPrice.price_data.cheapest_variant_price;
          console.log(`   Cheapest price: ${cheapest.price} ${cheapest.currency}`);
          console.log(`   Source used: ${cardWithPrice.price_data.price_source_used}`);
          console.log(`   Has fallback: ${cardWithPrice.price_data.has_fallback}`);
          
          if (cheapest.price === 0.11 && cheapest.currency === 'NOK') {
            console.log(`\n🚨 BUG CONFIRMED: 0.11 EUR is being returned as 0.11 NOK!`);
            console.log(`   Expected: ~1.27 NOK (0.11 EUR * 11.5 rate)`);
            console.log(`   Actual: 0.11 NOK`);
          } else if (cheapest.currency === 'NOK' && cheapest.price > 1) {
            console.log(`\n✅ Conversion appears correct: ${cheapest.price} NOK`);
          }
        }
        
        // Check the raw price data
        if (cardWithPrice.price_data && cardWithPrice.price_data.preferred_source_prices) {
          console.log('\n📊 Raw price data:');
          cardWithPrice.price_data.preferred_source_prices.forEach((priceData, i) => {
            console.log(`   ${i + 1}. Variant: ${priceData.variant}`);
            console.log(`      Source: ${priceData.source}`);
            console.log(`      Currency: ${priceData.currency}`);
            console.log(`      Market: ${priceData.prices.market}`);
          });
        }
      } else {
        console.log(`❌ No price data returned from service`);
      }
      
    } catch (serviceError) {
      console.log(`❌ Price service failed: ${serviceError.message}`);
    }
    
    // Test manual conversion
    console.log('\n🔧 Testing manual currency conversion...');
    
    // Import the currency converter
    const pathLib2 = require('path');
    const { currencyConverter } = require(pathLib2.join(process.cwd(), 'src/lib/currency/conversion'));
    
    try {
      const conversionResult = await currencyConverter.convert(0.11, 'EUR', 'NOK');
      console.log(`✅ Manual conversion result:`);
      console.log(`   Original: ${conversionResult.originalAmount} ${conversionResult.fromCurrency}`);
      console.log(`   Converted: ${conversionResult.convertedAmount} ${conversionResult.toCurrency}`);
      console.log(`   Exchange rate: ${conversionResult.exchangeRate}`);
      console.log(`   Is approximate: ${conversionResult.isApproximate}`);
      console.log(`   Fallback used: ${conversionResult.fallbackUsed}`);
      console.log(`   Error: ${conversionResult.error}`);
      
      if (conversionResult.convertedAmount === 0.11) {
        console.log(`\n🚨 MANUAL CONVERSION BUG: Currency converter returning wrong value!`);
      }
    } catch (conversionError) {
      console.log(`❌ Manual conversion failed: ${conversionError.message}`);
    }
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
  }
}

testCurrencyConversionBug().catch(console.error);