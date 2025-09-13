#!/usr/bin/env node

/**
 * Test what the frontend receives vs what gets displayed
 */

require('dotenv').config({ path: '.env.local' });

async function testFrontendPriceDisplay() {
  console.log('🔍 Testing frontend price display logic...\n');
  
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
    
    // Simulate what happens in SetCardsWithFilters.tsx
    console.log('🎯 Simulating SetCardsWithFilters price fetching...');
    
    // Test the API call that the frontend makes
    const testApiCall = async (cardIds, preferences) => {
      console.log(`\n🧪 Testing API call with preferences:`, preferences);
      
      const requestBody = {
        cardIds: cardIds,
        forcePreferences: preferences
      };
      
      try {
        const response = await fetch('http://localhost:3000/api/cards/prices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        if (!response.ok) {
          console.log(`❌ API call failed: ${response.status}`);
          return null;
        }
        
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
          const card = result.data[0];
          console.log(`✅ API returned card: ${card.id}`);
          
          if (card.price_data && card.price_data.cheapest_variant_price) {
            const cheapest = card.price_data.cheapest_variant_price;
            console.log(`   Cheapest price: ${cheapest.price} ${cheapest.currency}`);
            console.log(`   Source: ${cheapest.source}`);
            console.log(`   Variant: ${cheapest.variant}`);
            console.log(`   Price type: ${cheapest.price_type}`);
            
            return {
              price: cheapest.price,
              currency: cheapest.currency,
              source: cheapest.source
            };
          }
        }
        
        return null;
      } catch (error) {
        console.log(`❌ API call error: ${error.message}`);
        return null;
      }
    };
    
    // Test with different preferences
    const testCards = ['bw10-1']; // Card we know has 0.11/0.02 EUR prices
    
    // Test 1: EUR preference (should return EUR prices)
    const eurResult = await testApiCall(testCards, {
      preferred_currency: 'EUR',
      preferred_price_source: 'cardmarket'
    });
    
    // Test 2: NOK preference (should return converted NOK prices)
    const nokResult = await testApiCall(testCards, {
      preferred_currency: 'NOK',
      preferred_price_source: 'cardmarket'
    });
    
    // Test 3: No preferences (default behavior)
    const defaultResult = await testApiCall(testCards, undefined);
    
    // Analysis
    console.log('\n📊 Results Analysis:');
    if (eurResult) {
      console.log(`EUR preference: ${eurResult.price} ${eurResult.currency}`);
    }
    if (nokResult) {
      console.log(`NOK preference: ${nokResult.price} ${nokResult.currency}`);
      
      if (nokResult.price === 0.11 && nokResult.currency === 'NOK') {
        console.log(`🚨 BUG CONFIRMED: API returning 0.11 NOK instead of converted price!`);
      } else if (nokResult.price > 1.0 && nokResult.currency === 'NOK') {
        console.log(`✅ Conversion appears correct`);
      }
    }
    if (defaultResult) {
      console.log(`Default: ${defaultResult.price} ${defaultResult.currency}`);
    }
    
    // Test what happens in the CardTile price extraction
    console.log('\n🏷️ Testing CardTile price extraction logic...');
    
    if (nokResult) {
      // Simulate the CardTile getPriceData function
      const mockCard = {
        price_data: {
          cheapest_variant_price: {
            price: nokResult.price,
            currency: nokResult.currency,
            variant: 'normal'
          },
          price_source_used: nokResult.source,
          has_fallback: false
        }
      };
      
      // This is similar to CardTile.tsx logic
      const priceData = mockCard.price_data.cheapest_variant_price;
      console.log(`CardTile would show: ${priceData.price} ${priceData.currency}`);
      
      // Test the PricePill component logic
      console.log('\n💰 Testing PricePill conversion logic...');
      
      // If user currency is NOK and price currency is NOK, no conversion should happen
      const userCurrency = 'NOK';
      const enableConversion = true;
      
      if (enableConversion && userCurrency && priceData.currency === userCurrency) {
        console.log(`No conversion needed: ${priceData.price} ${priceData.currency}`);
      } else if (enableConversion && userCurrency && priceData.currency !== userCurrency) {
        console.log(`Conversion would be attempted: ${priceData.price} ${priceData.currency} -> ${userCurrency}`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
  }
}

testFrontendPriceDisplay().catch(console.error);