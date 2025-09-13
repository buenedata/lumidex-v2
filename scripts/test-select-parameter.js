#!/usr/bin/env node

/**
 * Test if the select parameter is causing 404 errors
 */

require('dotenv').config({ path: '.env.local' });

async function testSelectParameter() {
  console.log('🧪 Testing select parameter issues...\n');
  
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (process.env.POKEMONTCG_API_KEY) {
      headers['X-Api-Key'] = process.env.POKEMONTCG_API_KEY;
    }
    
    // Test 1: Page 11 without select parameter
    console.log('Test 1: Page 11 WITHOUT select parameter');
    const url1 = 'https://api.pokemontcg.io/v2/cards?page=11';
    console.log(`URL: ${url1}`);
    
    const response1 = await fetch(url1, { headers });
    console.log(`Response: ${response1.status} ${response1.statusText}`);
    
    if (response1.ok) {
      const data1 = await response1.json();
      console.log(`✅ SUCCESS! Page 11 works without select: ${data1.data.length} cards`);
    } else {
      console.log(`❌ FAILED even without select`);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 2: Page 11 with select parameter
    console.log('Test 2: Page 11 WITH select parameter');
    const url2 = 'https://api.pokemontcg.io/v2/cards?page=11&select=id,cardmarket,tcgplayer';
    console.log(`URL: ${url2}`);
    
    const response2 = await fetch(url2, { headers });
    console.log(`Response: ${response2.status} ${response2.statusText}`);
    
    if (response2.ok) {
      const data2 = await response2.json();
      console.log(`✅ SUCCESS! Page 11 works with select: ${data2.data.length} cards`);
    } else {
      console.log(`❌ FAILED with select parameter - this is the issue!`);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 3: Page 1 with select (should work)
    console.log('Test 3: Page 1 WITH select parameter (baseline)');
    const url3 = 'https://api.pokemontcg.io/v2/cards?page=1&select=id,cardmarket,tcgplayer';
    console.log(`URL: ${url3}`);
    
    const response3 = await fetch(url3, { headers });
    console.log(`Response: ${response3.status} ${response3.statusText}`);
    
    if (response3.ok) {
      const data3 = await response3.json();
      console.log(`✅ SUCCESS! Page 1 works with select: ${data3.data.length} cards`);
    } else {
      console.log(`❌ FAILED - select parameter doesn't work at all`);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Conclusion
    if (response1.ok && !response2.ok) {
      console.log('🎯 CONCLUSION: The select parameter is causing 404 errors on higher pages!');
      console.log('   Recommendation: Remove select parameter and accept larger data transfer');
    } else if (!response1.ok) {
      console.log('🤔 CONCLUSION: Page 11 doesn\'t exist regardless of select parameter');
      console.log('   This might be normal - there may only be 10 pages of data');
    } else {
      console.log('✅ CONCLUSION: Select parameter works fine, issue is elsewhere');
    }
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
  }
}

testSelectParameter().catch(console.error);