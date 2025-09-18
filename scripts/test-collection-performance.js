/**
 * Performance test script for collection API optimization
 * Run with: node scripts/test-collection-performance.js
 */

const { performance } = require('perf_hooks');

async function testCollectionPerformance() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  console.log('🧪 Testing Collection Performance...');
  console.log(`📍 Base URL: ${baseUrl}`);
  
  try {
    // Test the optimized collection endpoint
    const startTime = performance.now();
    
    const response = await fetch(`${baseUrl}/api/variants/collection`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: This test requires authentication - run while logged in
      }
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️  Collection API Response Time: ${duration.toFixed(2)}ms`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Collection loaded successfully`);
        console.log(`📊 Statistics:`);
        console.log(`   - Total cards: ${data.data.totalCards}`);
        console.log(`   - Total quantity: ${data.data.totalQuantity}`);
        console.log(`   - Optimized: ${data.data.metadata?.optimized ? 'Yes' : 'No'}`);
        console.log(`   - Variant sets processed: ${data.data.metadata?.variantSetsProcessed || 'N/A'}`);
        
        // Performance benchmarks
        if (duration < 1000) {
          console.log(`🚀 EXCELLENT: Response time under 1 second`);
        } else if (duration < 5000) {
          console.log(`✅ GOOD: Response time under 5 seconds`);
        } else if (duration < 15000) {
          console.log(`⚠️  ACCEPTABLE: Response time under 15 seconds`);
        } else {
          console.log(`❌ SLOW: Response time over 15 seconds - needs optimization`);
        }
        
      } else {
        console.error(`❌ API Error: ${data.error}`);
      }
    } else {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      
      if (response.status === 401) {
        console.log(`💡 Note: This test requires authentication. Please:`);
        console.log(`   1. Open ${baseUrl}/collection in your browser`);
        console.log(`   2. Login to your account`);
        console.log(`   3. Run this test again from the browser console`);
      }
    }
    
  } catch (error) {
    console.error(`💥 Test failed:`, error.message);
    console.log(`💡 Make sure the development server is running on ${baseUrl}`);
  }
}

// Browser-compatible version for console testing
if (typeof window !== 'undefined') {
  window.testCollectionPerformance = testCollectionPerformance;
  console.log('🧪 Collection performance test loaded. Run: testCollectionPerformance()');
} else {
  // Node.js execution
  testCollectionPerformance();
}

module.exports = { testCollectionPerformance };