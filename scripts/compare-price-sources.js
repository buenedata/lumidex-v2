#!/usr/bin/env node

/**
 * Compare price sources between set page and card modal
 */

require('dotenv').config({ path: '.env.local' });

async function comparePriceSources() {
  console.log('🔍 Comparing price sources between set page and card modal...\n');
  
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
    
    const testCardId = 'bw10-1'; // Card we know has price issues
    
    console.log(`🎯 Testing card: ${testCardId}\n`);
    
    // Test 1: Set page method (API endpoint)
    console.log('📄 Testing SET PAGE method (API endpoint)...');
    
    try {
      const setPageResponse = await fetch('http://localhost:3000/api/cards/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardIds: [testCardId],
          forcePreferences: {
            preferred_currency: 'NOK',
            preferred_price_source: 'cardmarket'
          }
        }),
      });
      
      if (setPageResponse.ok) {
        const setPageResult = await setPageResponse.json();
        if (setPageResult.success && setPageResult.data.length > 0) {
          const setPageCard = setPageResult.data[0];
          const setPagePrice = setPageCard.price_data?.cheapest_variant_price;
          
          console.log(`✅ Set page result:`);
          console.log(`   Price: ${setPagePrice?.price} ${setPagePrice?.currency}`);
          console.log(`   Source: ${setPagePrice?.source}`);
          console.log(`   Variant: ${setPagePrice?.variant}`);
          console.log(`   Price type: ${setPagePrice?.price_type}`);
          console.log(`   Has fallback: ${setPageCard.price_data?.has_fallback}`);
        } else {
          console.log(`❌ Set page: No data returned`);
        }
      } else {
        console.log(`❌ Set page API failed: ${setPageResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ Set page error: ${error.message}`);
    }
    
    // Test 2: Card modal method (direct service)
    console.log('\n🃏 Testing CARD MODAL method (direct service)...');
    
    try {
      // Import the service the same way the modal does
      const pathLib = require('path');
      const { cardPriceService } = require(pathLib.join(process.cwd(), 'src/lib/db/price-queries'));
      
      const modalUserPreferences = {
        preferred_currency: 'NOK',
        preferred_price_source: 'cardmarket'
      };
      
      const modalResult = await cardPriceService.getCardWithPrices(testCardId, modalUserPreferences);
      
      if (modalResult?.price_data) {
        const modalPrice = modalResult.price_data.cheapest_variant_price;
        
        console.log(`✅ Card modal result:`);
        console.log(`   Price: ${modalPrice?.price} ${modalPrice?.currency}`);
        console.log(`   Source: ${modalPrice?.source}`);
        console.log(`   Variant: ${modalPrice?.variant}`);
        console.log(`   Price type: ${modalPrice?.price_type}`);
        console.log(`   Has fallback: ${modalResult.price_data.has_fallback}`);
      } else {
        console.log(`❌ Card modal: No price data returned`);
      }
    } catch (error) {
      console.log(`❌ Card modal error: ${error.message}`);
      console.log(error.stack);
    }
    
    // Test 3: Check if it's a server vs client environment issue
    console.log('\n🔧 Testing server vs client context...');
    
    // Check if the issue is related to Supabase client creation
    console.log('   Checking server-side Supabase client...');
    
    try {
      const { createClient: createServerClient } = require(require('path').join(process.cwd(), 'src/lib/supabase/server'));
      const serverSupabase = createServerClient();
      
      console.log(`   Server client created: ${!!serverSupabase}`);
    } catch (error) {
      console.log(`   Server client error: ${error.message}`);
    }
    
    // Test 4: Compare raw database queries
    console.log('\n💾 Testing raw database queries...');
    
    const { data: rawPrices } = await supabase
      .from('tcg_card_prices')
      .select('*')
      .eq('card_id', testCardId)
      .eq('source', 'cardmarket');
    
    if (rawPrices && rawPrices.length > 0) {
      console.log(`✅ Found ${rawPrices.length} raw price records:`);
      rawPrices.forEach((price, i) => {
        console.log(`   ${i + 1}. ${price.variant}: ${price.market} ${price.currency} (${price.source})`);
      });
      
      // Check what the cheapest price selection logic would choose
      const priceFields = ['market', 'mid', 'low', 'direct_low'];
      let cheapest = null;
      let cheapestPrice = Infinity;
      
      for (const priceData of rawPrices) {
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
        console.log(`\n💰 Raw cheapest selection:`);
        console.log(`   Price: ${cheapest.price} ${cheapest.currency}`);
        console.log(`   Source: ${cheapest.source}`);
        console.log(`   Variant: ${cheapest.variant}`);
        console.log(`   Price type: ${cheapest.price_type}`);
        
        // Test manual conversion
        const { data: eurToNok } = await supabase
          .from('exchange_rates')
          .select('rate')
          .eq('from_currency', 'EUR')
          .eq('to_currency', 'NOK')
          .order('updated_at', { ascending: false })
          .limit(1);
        
        if (eurToNok && eurToNok.length > 0 && cheapest.currency === 'EUR') {
          const manualConversion = cheapest.price * eurToNok[0].rate;
          const rounded = Math.round(manualConversion * 100) / 100;
          console.log(`   Manual conversion: ${cheapest.price} EUR * ${eurToNok[0].rate} = ${manualConversion.toFixed(4)} → ${rounded} NOK`);
        }
      }
    } else {
      console.log(`❌ No raw price records found`);
    }
    
  } catch (error) {
    console.error(`❌ Comparison failed: ${error.message}`);
    console.error(error.stack);
  }
}

comparePriceSources().catch(console.error);