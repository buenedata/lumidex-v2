#!/usr/bin/env node

/**
 * Debug Pokemon TCG API Issue
 * Identifies the exact problem with API connectivity
 */

require('dotenv').config({ path: '.env.local' });

async function testDirectAPI() {
  console.log('🔍 Testing Pokemon TCG API directly...\n');
  
  // Test 1: Basic connectivity without any modifications
  console.log('Test 1: Direct browser-compatible request');
  try {
    const response = await fetch('https://api.pokemontcg.io/v2/cards?pageSize=1');
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success: Got ${data.data?.length || 0} cards`);
      console.log(`Total cards available: ${data.totalCount}`);
    } else {
      const errorText = await response.text();
      console.log(`❌ Error response: ${errorText}`);
    }
  } catch (err) {
    console.log(`❌ Network error: ${err.message}`);
  }
  
  // Test 2: With API key
  console.log('\nTest 2: With API key header');
  const apiKey = process.env.POKEMONTCG_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch('https://api.pokemontcg.io/v2/cards?pageSize=1', {
        headers: {
          'X-Api-Key': apiKey
        }
      });
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        console.log('✅ API key works correctly');
      } else {
        const errorText = await response.text();
        console.log(`❌ API key error: ${errorText}`);
      }
    } catch (err) {
      console.log(`❌ API key test error: ${err.message}`);
    }
  } else {
    console.log('⚠️ No API key found');
  }
  
  // Test 3: Check exact URL that's failing
  console.log('\nTest 3: Testing exact URLs from client');
  const testUrls = [
    'https://api.pokemontcg.io/v2/cards?page=1&pageSize=250&orderBy=set.releaseDate,number',
    'https://api.pokemontcg.io/v2/sets?page=1&pageSize=250&orderBy=releaseDate'
  ];
  
  for (const url of testUrls) {
    console.log(`\nTesting: ${url}`);
    try {
      const headers = apiKey ? { 'X-Api-Key': apiKey } : {};
      const response = await fetch(url, { headers });
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`Error body: ${errorText.substring(0, 200)}...`);
      }
    } catch (err) {
      console.log(`Error: ${err.message}`);
    }
  }
}

async function checkClientCode() {
  console.log('\n🔧 Checking client configuration...\n');
  
  // Import our client to test
  try {
    const { pokemonTCGApi } = await import('../src/lib/pokeapi/client.ts');
    
    console.log('✅ Client imported successfully');
    
    // Test a simple request
    console.log('Testing client.fetchCards with minimal parameters...');
    try {
      const result = await pokemonTCGApi.fetchCards({ pageSize: 1 });
      console.log(`✅ Client works: ${result.data?.length || 0} cards returned`);
    } catch (err) {
      console.log(`❌ Client error: ${err.message}`);
      
      // Check if it's a URL issue
      if (err.message.includes('404')) {
        console.log('\n🔍 Investigating 404 error...');
        console.log('This suggests the URL or endpoint is incorrect');
        console.log('The Pokemon TCG API might have changed endpoints');
      }
    }
    
  } catch (importErr) {
    console.log(`❌ Failed to import client: ${importErr.message}`);
    
    // Manual test of the URL construction
    console.log('\n🔧 Manual URL construction test:');
    const baseUrl = 'https://api.pokemontcg.io/v2';
    const endpoint = '/cards';
    const url = new URL(`${baseUrl}${endpoint}`);
    url.searchParams.append('page', '1');
    url.searchParams.append('pageSize', '1');
    
    console.log(`Constructed URL: ${url.toString()}`);
    
    try {
      const response = await fetch(url.toString());
      console.log(`Manual test result: ${response.status} ${response.statusText}`);
    } catch (err) {
      console.log(`Manual test error: ${err.message}`);
    }
  }
}

async function suggestFixes() {
  console.log('\n🛠️ Potential fixes to try:\n');
  
  console.log('1. Network/DNS Issues:');
  console.log('   - Try: ping api.pokemontcg.io');
  console.log('   - Check if corporate firewall blocks the API');
  console.log('   - Try from a different network');
  
  console.log('\n2. URL/Endpoint Issues:');
  console.log('   - Verify API documentation at: https://docs.pokemontcg.io/');
  console.log('   - Check if endpoints have changed');
  
  console.log('\n3. Request Format Issues:');
  console.log('   - Remove or modify query parameters');
  console.log('   - Test with minimal request first');
  
  console.log('\n4. API Key Issues:');
  console.log('   - Verify key is correctly set in .env.local');
  console.log('   - Try without API key (rate limited but should work)');
  
  console.log('\n5. Code Issues:');
  console.log('   - Check TypeScript compilation');
  console.log('   - Verify imports and module resolution');
}

async function main() {
  console.log('🚨 Pokemon TCG API Debug Tool');
  console.log('============================\n');
  
  await testDirectAPI();
  await checkClientCode();
  await suggestFixes();
  
  console.log('\n📋 Summary:');
  console.log('Run this debug tool to identify the exact API connectivity issue.');
  console.log('Once identified, we can implement the specific fix needed.');
}

if (require.main === module) {
  main().catch(console.error);
}