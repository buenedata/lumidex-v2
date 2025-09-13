#!/usr/bin/env tsx

// Load environment variables from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createServiceClient } from '../src/lib/supabase/server';

/**
 * Migration script to add TCG type support to existing database
 * Run this after applying the database migration
 */
async function migrateTCGTypes() {
  console.log('🚀 Starting TCG types migration...');
  
  // Validate environment
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('  - NEXT_PUBLIC_SUPABASE_URL');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  const supabase = createServiceClient();
  
  try {
    // Check if migration is needed
    const { data: sets, error: fetchError } = await supabase
      .from('tcg_sets')
      .select('id, tcg_type')
      .limit(1);
    
    if (fetchError) {
      console.error('❌ Error checking existing data:', fetchError);
      return;
    }
    
    if (!sets || sets.length === 0) {
      console.log('ℹ️ No sets found, nothing to migrate');
      return;
    }
    
    // Check if already migrated
    const firstSet = sets[0];
    if (firstSet.tcg_type && firstSet.tcg_type !== null) {
      console.log('✅ TCG types already set, migration not needed');
      return;
    }
    
    // Update all existing sets to be Pokemon
    const { error: updateError } = await supabase
      .from('tcg_sets')
      .update({ tcg_type: 'pokemon' })
      .is('tcg_type', null);
    
    if (updateError) {
      console.error('❌ Error updating sets:', updateError);
      return;
    }
    
    console.log('✅ Successfully updated all existing sets to Pokemon TCG type');
    
    // Verify the update
    const { data: verifyData, error: verifyError } = await supabase
      .from('tcg_sets')
      .select('tcg_type')
      .eq('tcg_type', 'pokemon');
    
    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
      return;
    }
    
    console.log(`✅ Verified: ${verifyData?.length || 0} sets now have Pokemon TCG type`);
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
TCG Types Migration Script

Usage:
  npm run migrate:tcg-types        - Run the migration
  npm run migrate:tcg-types --help - Show this help message

Environment Variables Required:
  NEXT_PUBLIC_SUPABASE_URL     - Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY    - Supabase service role key

This script updates existing sets to have 'pokemon' as their tcg_type.
Run this after applying the database migration 0004_add_tcg_types.sql
    `);
    process.exit(0);
  }
  
  await migrateTCGTypes();
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle SIGINT gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Migration interrupted by user');
  process.exit(0);
});

// Run the migration if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
}

export { migrateTCGTypes };