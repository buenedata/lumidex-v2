#!/usr/bin/env tsx

/**
 * Pokemon TCG Sets Ingestion Script
 * Fetches all sets from Pokemon TCG API v2 and upserts them into Supabase
 * Usage: npm run ingest:sets
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createServiceClient } from '../../src/lib/supabase/server';
import { fetchAllSets, type PokemonTCGSet } from '../../src/lib/pokeapi/client';

interface DatabaseSet {
  id: string;
  name: string;
  series: string | null;
  ptcgo_code: string | null;
  printed_total: number | null;
  total: number | null;
  release_date: string | null;
  updated_at: string;
  legalities: any;
  images: any;
}

/**
 * Maps Pokemon TCG API set data to database schema
 */
function mapSetToDatabase(set: PokemonTCGSet): DatabaseSet {
  return {
    id: set.id,
    name: set.name,
    series: set.series || null,
    ptcgo_code: set.ptcgoCode || null,
    printed_total: set.printedTotal || null,
    total: set.total || null,
    release_date: set.releaseDate || null,
    updated_at: set.updatedAt,
    legalities: set.legalities || {},
    images: set.images || {}
  };
}

/**
 * Upserts sets in batches for better performance
 */
async function upsertSetsInBatches(sets: DatabaseSet[], batchSize = 500) {
  const supabase = createServiceClient();
  const totalBatches = Math.ceil(sets.length / batchSize);
  
  console.log(`Upserting ${sets.length} sets in ${totalBatches} batches of ${batchSize}...`);
  
  for (let i = 0; i < sets.length; i += batchSize) {
    const batch = sets.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} sets)...`);
    
    try {
      const { error } = await supabase
        .from('tcg_sets')
        .upsert(batch, {
          onConflict: 'id',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error(`Error in batch ${batchNumber}:`, error);
        throw error;
      }
      
      console.log(`✅ Batch ${batchNumber} completed successfully`);
    } catch (error) {
      console.error(`❌ Failed to upsert batch ${batchNumber}:`, error);
      throw error;
    }
  }
}

/**
 * Validates environment variables
 */
function validateEnvironment() {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'POKEMONTCG_API_KEY'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`  - ${varName}`));
    process.exit(1);
  }
}

/**
 * Main ingestion function
 */
async function ingestSets() {
  console.log('🚀 Starting Pokemon TCG sets ingestion...\n');
  
  try {
    // Validate environment
    console.log('🔍 Validating environment variables...');
    validateEnvironment();
    console.log('✅ Environment validation passed\n');
    
    // Fetch sets from Pokemon TCG API
    console.log('📡 Fetching sets from Pokemon TCG API v2...');
    const apiSets = await fetchAllSets();
    console.log(`✅ Fetched ${apiSets.length} sets from API\n`);
    
    if (apiSets.length === 0) {
      console.log('ℹ️ No sets found in API response');
      return;
    }
    
    // Map to database format
    console.log('🔄 Mapping sets to database format...');
    const dbSets = apiSets.map(mapSetToDatabase);
    console.log(`✅ Mapped ${dbSets.length} sets\n`);
    
    // Upsert to database
    console.log('💾 Starting database upsert...');
    await upsertSetsInBatches(dbSets, 500);
    console.log('✅ Database upsert completed\n');
    
    // Summary
    console.log('🎉 Sets ingestion completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Sets processed: ${apiSets.length}`);
    console.log(`   - Latest set: ${apiSets[0]?.name || 'N/A'}`);
    console.log(`   - Oldest set: ${apiSets[apiSets.length - 1]?.name || 'N/A'}`);
    
  } catch (error) {
    console.error('❌ Sets ingestion failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    
    process.exit(1);
  }
}

/**
 * Test database connection
 */
async function testConnection() {
  try {
    console.log('🔗 Testing Supabase connection...');
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('tcg_sets')
      .select('id')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Supabase connection successful\n');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return false;
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    const connected = await testConnection();
    process.exit(connected ? 0 : 1);
  }
  
  if (args.includes('--help')) {
    console.log(`
Pokemon TCG Sets Ingestion Script

Usage:
  npm run ingest:sets         - Run full sets ingestion
  npm run ingest:sets --test  - Test database connection only
  npm run ingest:sets --help  - Show this help message

Environment Variables Required:
  NEXT_PUBLIC_SUPABASE_URL     - Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY    - Supabase service role key (not anon key!)
  POKEMONTCG_API_KEY          - Pokemon TCG API v2 key

The script will:
1. Fetch all sets from Pokemon TCG API v2
2. Map API data to database schema
3. Upsert sets to Supabase (handles conflicts automatically)
4. Process in batches for optimal performance
    `);
    process.exit(0);
  }
  
  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.error('Cannot proceed without database connection');
    process.exit(1);
  }
  
  // Run ingestion
  await ingestSets();
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle SIGINT gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Ingestion interrupted by user');
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}