#!/usr/bin/env node

/**
 * Ultra-simple Pokemon TCG API test
 */

require('dotenv').config({ path: '.env.local' });

async function testBasicAPI() {
  console.log('🧪 Testing ultra-basic Pokemon TCG API call...\n');
  
  // Test 1: No parameters at all
  try {
    console.log('Test 1: Basic /cards endpoint (no parameters)');
    const url1 = 'https://api.pokemontcg.io/v2/cards';
    console.log(`URL: ${url1}`);
    
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.POKEMONTCG_API_KEY) {
      headers['X-Api-Key'] = process.env.POKEMONTCG_API_KEY;
      console.log('✅ Using API key');
    } else {
      console.log('⚠️ No API key found');
    }
    
    const response1 = await fetch(url1, { headers });
    console.log(`Response: ${response1.status} ${response1.statusText}`);
    
    if (response1.ok) {
      const data1 = await response1.json();
      console.log(`✅ SUCCESS! Got ${data1.data?.length || 0} cards, total: ${data1.totalCount}`);
    } else {
      console.log(`❌ FAILED: ${await response1.text()}`);
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 2: Just page parameter
  try {
    console.log('Test 2: With just page=2');
    const url2 = 'https://api.pokemontcg.io/v2/cards?page=2';
    console.log(`URL: ${url2}`);
    
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.POKEMONTCG_API_KEY) {
      headers['X-Api-Key'] = process.env.POKEMONTCG_API_KEY;
    }
    
    const response2 = await fetch(url2, { headers });
    console.log(`Response: ${response2.status} ${response2.statusText}`);
    
    if (response2.ok) {
      const data2 = await response2.json();
      console.log(`✅ SUCCESS! Got ${data2.data?.length || 0} cards, page: ${data2.page}`);
    } else {
      console.log(`❌ FAILED: ${await response2.text()}`);
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 3: Test without API key
  try {
    console.log('Test 3: Without API key');
    const url3 = 'https://api.pokemontcg.io/v2/cards';
    console.log(`URL: ${url3}`);
    
    const headers = { 'Content-Type': 'application/json' };
    // No API key
    
    const response3 = await fetch(url3, { headers });
    console.log(`Response: ${response3.status} ${response3.statusText}`);
    
    if (response3.ok) {
      const data3 = await response3.json();
      console.log(`✅ SUCCESS! Got ${data3.data?.length || 0} cards (no API key needed)`);
    } else {
      console.log(`❌ FAILED: ${await response3.text()}`);
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
}

testBasicAPI().catch(console.error);