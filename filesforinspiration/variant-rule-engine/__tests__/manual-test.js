const { inferVariants } = require('../inferVariants');

// Manual test runner for the variant rule engine
function runContractTests() {
  console.log('Running Variant Rule Engine Contract Tests...\n');

  // Contract Test 1: Vivid Voltage Clefable - SWSH Rare with API signals
  console.log('Contract Test 1: Vivid Voltage Clefable - SWSH Rare with API signals');
  const clefableCard = {
    set_id: 'swsh4-120',
    set_name: 'Clefable',
    number: '120',
    rarity: 'Rare',
    sets: {
      set_id: 'swsh4',
      set_series: 'Sword & Shield',
      releaseDate: '2020/11/13'
    },
    tcgplayer: {
      cardmarket_prices: {
        normal: { cardmarket_prices_reverse_holo_low: 0.25, tcgplayer_prices_reverse_holofoil_mid: 0.50, tcgplayer_prices_reverse_holofoil_high: 1.00, tcgplayer_prices_reverse_holofoil_market: 0.45, directLow: null },
        reverseHolofoil: { cardmarket_prices_reverse_holo_low: 0.75, tcgplayer_prices_reverse_holofoil_mid: 1.25, tcgplayer_prices_reverse_holofoil_high: 2.00, tcgplayer_prices_reverse_holofoil_market: 1.10, directLow: null }
      }
    }
  };

  try {
    const result1 = inferVariants(clefableCard, ["Booster"]);
    console.log('✅ Test 1 executed successfully');
    console.log(`   Normal: ${result1.variants.normal.exists} (${result1.variants.normal.confidence})`);
    console.log(`   Reverse: ${result1.variants.reverse.exists} (${result1.variants.reverse.confidence})`);
    console.log(`   Holo: ${result1.variants.holo.exists}`);
    console.log(`   Era: ${result1.era}`);
    console.log(`   Explanations: ${result1.explanations.join(', ')}\n`);
    
    // Validate expectations
    if (result1.variants.normal.exists === true && 
        result1.variants.reverse.exists === true && 
        result1.variants.holo.exists === false &&
        result1.era === 'Sword & Shield') {
      console.log('✅ Contract Test 1 PASSED\n');
    } else {
      console.log('❌ Contract Test 1 FAILED\n');
    }
  } catch (error) {
    console.log('❌ Test 1 failed with error:', error.message, '\n');
  }

  // Contract Test 2: Scarlet & Violet Base Rare - No API signals, era inference
  console.log('Contract Test 2: Scarlet & Violet Base Rare - No API signals, era inference');
  const svRareCard = {
    set_id: 'sv1-100',
    set_name: 'Example Rare',
    number: '100',
    rarity: 'Rare',
    sets: {
      set_id: 'sv1',
      set_series: 'Scarlet & Violet',
      releaseDate: '2023/03/31'
    }
    // No tcgplayer pricing data
  };

  try {
    const result2 = inferVariants(svRareCard, ["Booster"]);
    console.log('✅ Test 2 executed successfully');
    console.log(`   Normal: ${result2.variants.normal.exists}`);
    console.log(`   Reverse: ${result2.variants.reverse.exists} (${result2.variants.reverse.confidence})`);
    console.log(`   Holo: ${result2.variants.holo.exists} (${result2.variants.holo.confidence})`);
    console.log(`   Era: ${result2.era}`);
    console.log(`   Explanations: ${result2.explanations.join(', ')}\n`);
    
    // Validate expectations
    if (result2.variants.holo.exists === true && 
        result2.variants.reverse.exists === true && 
        result2.variants.normal.exists === false &&
        result2.era === 'Scarlet & Violet') {
      console.log('✅ Contract Test 2 PASSED\n');
    } else {
      console.log('❌ Contract Test 2 FAILED\n');
    }
  } catch (error) {
    console.log('❌ Test 2 failed with error:', error.message, '\n');
  }

  // Contract Test 3: WotC Theme Deck Override - Product source affects variants
  console.log('Contract Test 3: WotC Theme Deck Override - Product source affects variants');
  const wotcCard = {
    set_id: 'base1-15',
    set_name: 'Alakazam',
    number: '15',
    rarity: 'Rare',
    sets: {
      set_id: 'base1',
      set_series: 'Base',
      releaseDate: '1999/01/09'
    },
    tcgplayer: {
      cardmarket_prices: {
        tcgplayer_prices_reverse_holofoil: { cardmarket_prices_reverse_holo_low: 15.00, tcgplayer_prices_reverse_holofoil_mid: 25.00, tcgplayer_prices_reverse_holofoil_high: 40.00, tcgplayer_prices_reverse_holofoil_market: 22.50, directLow: null }
      }
    }
  };

  try {
    // Test with Theme Deck source
    const themeDeckResult = inferVariants(wotcCard, ["Theme Deck"]);
    console.log('✅ Test 3a (Theme Deck) executed successfully');
    console.log(`   Normal: ${themeDeckResult.variants.normal.exists}`);
    console.log(`   Holo: ${themeDeckResult.variants.holo.exists} (${themeDeckResult.variants.holo.confidence})`);
    console.log(`   Reverse: ${themeDeckResult.variants.reverse.exists}`);
    console.log(`   Era: ${themeDeckResult.era}`);
    console.log(`   Explanations: ${themeDeckResult.explanations.join(', ')}\n`);

    // Test with Booster source (no override)
    const boosterResult = inferVariants(wotcCard, ["Booster"]);
    console.log('✅ Test 3b (Booster) executed successfully');
    console.log(`   Normal: ${boosterResult.variants.normal.exists}`);
    console.log(`   Holo: ${boosterResult.variants.holo.exists} (${boosterResult.variants.holo.confidence})`);
    console.log(`   Reverse: ${boosterResult.variants.reverse.exists}`);
    console.log(`   Era: ${boosterResult.era}`);
    console.log(`   Explanations: ${boosterResult.explanations.join(', ')}\n`);
    
    // Validate expectations
    if (themeDeckResult.variants.normal.exists === true && 
        themeDeckResult.variants.holo.exists === true && 
        boosterResult.variants.normal.exists === false &&
        boosterResult.variants.holo.exists === true &&
        themeDeckResult.era === 'WotC') {
      console.log('✅ Contract Test 3 PASSED\n');
    } else {
      console.log('❌ Contract Test 3 FAILED\n');
    }
  } catch (error) {
    console.log('❌ Test 3 failed with error:', error.message, '\n');
  }

  console.log('Contract tests completed!');
}

// Run the tests if this file is executed directly
if (require.main === module) {
  runContractTests();
}

module.exports = { runContractTests };
