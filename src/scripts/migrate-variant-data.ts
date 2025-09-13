#!/usr/bin/env node

/**
 * Migration Script for Variant System Data Cleanup
 * 
 * This script handles the migration of existing collection data to the new variant system.
 * It provides utilities for:
 * 1. Migrating legacy variant names to new UI-canonical names
 * 2. Cleaning up duplicate entries
 * 3. Validating data integrity
 * 4. Reporting migration statistics
 */

import { createClient } from '@supabase/supabase-js';
import { UserVariantPersistence } from '../lib/variants/persistence';

// Environment configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface MigrationStats {
  totalUsers: number;
  migratedUsers: number;
  totalItems: number;
  migratedItems: number;
  skippedItems: number;
  errorItems: number;
  duplicatesFound: number;
  duplicatesResolved: number;
}

/**
 * Main migration function
 */
async function runMigration(): Promise<void> {
  console.log('🚀 Starting variant system data migration...');
  console.log('='.repeat(60));

  const stats: MigrationStats = {
    totalUsers: 0,
    migratedUsers: 0,
    totalItems: 0,
    migratedItems: 0,
    skippedItems: 0,
    errorItems: 0,
    duplicatesFound: 0,
    duplicatesResolved: 0
  };

  try {
    // Step 1: Analyze current data state
    await analyzeDataState(stats);

    // Step 2: Migrate user data
    await migrateUserData(stats);

    // Step 3: Clean up duplicates
    await cleanupDuplicates(stats);

    // Step 4: Validate data integrity
    await validateDataIntegrity(stats);

    // Step 5: Report results
    reportMigrationResults(stats);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Analyze the current state of the data
 */
async function analyzeDataState(stats: MigrationStats): Promise<void> {
  console.log('📊 Analyzing current data state...');

  try {
    // Count total users with collection items
    const { data: userStats, error: userError } = await supabase
      .from('collection_items')
      .select('user_id', { count: 'exact' })
      .not('user_id', 'is', null);

    if (userError) throw userError;

    // Count total collection items
    const { data: itemStats, error: itemError } = await supabase
      .from('collection_items')
      .select('*', { count: 'exact' });

    if (itemError) throw itemError;

    // Count items needing migration (no variant_v2)
    const { data: unmigrated, error: unmigratedError } = await supabase
      .from('collection_items')
      .select('*', { count: 'exact' })
      .is('variant_v2', null);

    if (unmigratedError) throw unmigratedError;

    stats.totalUsers = new Set(userStats?.map(item => item.user_id)).size || 0;
    stats.totalItems = itemStats?.length || 0;

    console.log(`   👥 Total users with collections: ${stats.totalUsers}`);
    console.log(`   📦 Total collection items: ${stats.totalItems}`);
    console.log(`   🔄 Items needing migration: ${unmigrated?.length || 0}`);

  } catch (error) {
    console.error('Failed to analyze data state:', error);
    throw error;
  }
}

/**
 * Migrate user collection data
 */
async function migrateUserData(stats: MigrationStats): Promise<void> {
  console.log('\n🔄 Migrating user collection data...');

  try {
    // Get all users with collection items
    const { data: users, error: usersError } = await supabase
      .from('collection_items')
      .select('user_id')
      .not('user_id', 'is', null);

    if (usersError) throw usersError;

    const uniqueUsers = Array.from(new Set(users?.map(item => item.user_id) || []));

    for (const userId of uniqueUsers) {
      try {
        console.log(`   Processing user: ${userId}`);
        
        const result = await UserVariantPersistence.migrateLegacyVariants(userId);
        
        stats.migratedUsers++;
        stats.migratedItems += result.migrated;
        stats.skippedItems += result.skipped;
        stats.errorItems += result.errors.length;

        if (result.errors.length > 0) {
          console.log(`     ⚠️  ${result.errors.length} errors for user ${userId}`);
          result.errors.forEach(error => console.log(`       - ${error}`));
        }

        console.log(`     ✅ Migrated: ${result.migrated}, Skipped: ${result.skipped}`);

      } catch (error) {
        console.error(`     ❌ Failed to migrate user ${userId}:`, error);
        stats.errorItems++;
      }
    }

  } catch (error) {
    console.error('Failed to migrate user data:', error);
    throw error;
  }
}

/**
 * Clean up duplicate entries
 */
async function cleanupDuplicates(stats: MigrationStats): Promise<void> {
  console.log('\n🧹 Cleaning up duplicate entries...');

  try {
    // Find potential duplicates using a different approach since Supabase doesn't support GROUP BY in the client
    const { data: allItems, error: itemsError } = await supabase
      .from('collection_items')
      .select('user_id, card_id, variant_v2')
      .not('variant_v2', 'is', null);

    if (itemsError) throw itemsError;

    // Group items to find duplicates
    const groupedItems = new Map<string, number>();
    allItems?.forEach(item => {
      const key = `${item.user_id}:${item.card_id}:${item.variant_v2}`;
      groupedItems.set(key, (groupedItems.get(key) || 0) + 1);
    });

    const duplicates = Array.from(groupedItems.entries())
      .filter(([_, count]) => count > 1)
      .map(([key, _]) => {
        const [user_id, card_id, variant_v2] = key.split(':');
        return { user_id, card_id, variant_v2 };
      });

    stats.duplicatesFound = duplicates.length;

    if (stats.duplicatesFound === 0) {
      console.log('   ✅ No duplicates found');
      return;
    }

    console.log(`   🔍 Found ${stats.duplicatesFound} potential duplicate groups`);

    for (const duplicate of duplicates) {
      try {
        await resolveDuplicate(duplicate.user_id, duplicate.card_id, duplicate.variant_v2);
        stats.duplicatesResolved++;
      } catch (error) {
        console.error(`   ❌ Failed to resolve duplicate for ${duplicate.user_id}/${duplicate.card_id}/${duplicate.variant_v2}:`, error);
      }
    }

    console.log(`   ✅ Resolved ${stats.duplicatesResolved} duplicate groups`);

  } catch (error) {
    console.error('Failed to cleanup duplicates:', error);
    throw error;
  }
}

/**
 * Resolve a specific duplicate by merging quantities
 */
async function resolveDuplicate(userId: string, cardId: string, variant: string): Promise<void> {
  // Get all duplicate entries
  const { data: entries, error: entriesError } = await supabase
    .from('collection_items')
    .select('*')
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .eq('variant_v2', variant)
    .order('created_at', { ascending: true });

  if (entriesError) throw entriesError;
  if (!entries || entries.length <= 1) return;

  // Calculate total quantity
  const totalQuantity = entries.reduce((sum, entry) => sum + (entry.quantity || 0), 0);
  
  // Keep the oldest entry, update its quantity
  const keepEntry = entries[0];
  const deleteEntries = entries.slice(1);

  // Update the kept entry with total quantity
  const { error: updateError } = await supabase
    .from('collection_items')
    .update({ quantity: totalQuantity })
    .eq('id', keepEntry.id);

  if (updateError) throw updateError;

  // Delete the duplicate entries
  for (const entry of deleteEntries) {
    const { error: deleteError } = await supabase
      .from('collection_items')
      .delete()
      .eq('id', entry.id);

    if (deleteError) throw deleteError;
  }
}

/**
 * Validate data integrity after migration
 */
async function validateDataIntegrity(stats: MigrationStats): Promise<void> {
  console.log('\n🔍 Validating data integrity...');

  try {
    // Check for items without variant_v2
    const { data: unmigrated, error: unmigratedError } = await supabase
      .from('collection_items')
      .select('*', { count: 'exact' })
      .is('variant_v2', null);

    if (unmigratedError) throw unmigratedError;

    // Check for invalid variant_v2 values
    const validVariants = ['normal', 'holo', 'reverse_holo_standard', 'reverse_holo_pokeball', 'reverse_holo_masterball', 'first_edition', 'custom'];
    
    const { data: invalidVariants, error: invalidError } = await supabase
      .from('collection_items')
      .select('*', { count: 'exact' })
      .not('variant_v2', 'is', null)
      .not('variant_v2', 'in', `(${validVariants.map(v => `'${v}'`).join(',')})`);

    if (invalidError) throw invalidError;

    // Check for negative quantities
    const { data: negativeQty, error: negativeError } = await supabase
      .from('collection_items')
      .select('*', { count: 'exact' })
      .lt('quantity', 0);

    if (negativeError) throw negativeError;

    const unmigratedCount = unmigrated?.length || 0;
    const invalidCount = invalidVariants?.length || 0;
    const negativeCount = negativeQty?.length || 0;

    console.log(`   📊 Validation Results:`);
    console.log(`      - Unmigrated items: ${unmigratedCount}`);
    console.log(`      - Invalid variants: ${invalidCount}`);
    console.log(`      - Negative quantities: ${negativeCount}`);

    if (unmigratedCount === 0 && invalidCount === 0 && negativeCount === 0) {
      console.log(`   ✅ Data integrity validation passed`);
    } else {
      console.log(`   ⚠️  Data integrity issues found`);
    }

  } catch (error) {
    console.error('Failed to validate data integrity:', error);
    throw error;
  }
}

/**
 * Report final migration results
 */
function reportMigrationResults(stats: MigrationStats): void {
  console.log('\n' + '='.repeat(60));
  console.log('📈 MIGRATION COMPLETE - FINAL REPORT');
  console.log('='.repeat(60));
  
  console.log(`👥 Users:`);
  console.log(`   Total users: ${stats.totalUsers}`);
  console.log(`   Migrated users: ${stats.migratedUsers}`);
  
  console.log(`\n📦 Collection Items:`);
  console.log(`   Total items: ${stats.totalItems}`);
  console.log(`   Migrated items: ${stats.migratedItems}`);
  console.log(`   Skipped items: ${stats.skippedItems}`);
  console.log(`   Error items: ${stats.errorItems}`);
  
  console.log(`\n🧹 Duplicates:`);
  console.log(`   Found: ${stats.duplicatesFound}`);
  console.log(`   Resolved: ${stats.duplicatesResolved}`);
  
  const successRate = stats.totalItems > 0 ? (stats.migratedItems / stats.totalItems * 100).toFixed(1) : '0';
  console.log(`\n📊 Overall Success Rate: ${successRate}%`);
  
  if (stats.errorItems > 0) {
    console.log(`\n⚠️  ${stats.errorItems} items had errors and may need manual review`);
  }
  
  console.log('\n✨ Migration completed successfully!');
}

/**
 * Dry run mode - analyze without making changes
 */
async function runDryRun(): Promise<void> {
  console.log('🔍 Running migration in DRY RUN mode...');
  console.log('='.repeat(60));

  const stats: MigrationStats = {
    totalUsers: 0,
    migratedUsers: 0,
    totalItems: 0,
    migratedItems: 0,
    skippedItems: 0,
    errorItems: 0,
    duplicatesFound: 0,
    duplicatesResolved: 0
  };

  await analyzeDataState(stats);

  // Simulate migration for sample users
  const { data: sampleUsers, error } = await supabase
    .from('collection_items')
    .select('user_id')
    .is('variant_v2', null)
    .limit(5);

  if (!error && sampleUsers) {
    const uniqueUsers = Array.from(new Set(sampleUsers.map(item => item.user_id)));
    
    console.log(`\n🔍 Sample migration preview (${uniqueUsers.length} users):`);
    
    for (const userId of uniqueUsers) {
      const { data: userItems, error: userError } = await supabase
        .from('collection_items')
        .select('*')
        .eq('user_id', userId)
        .is('variant_v2', null);

      if (!userError && userItems) {
        console.log(`   User ${userId}: ${userItems.length} items to migrate`);
        
        userItems.slice(0, 3).forEach(item => {
          const newVariant = mapLegacyVariant(item.variant);
          console.log(`     - ${item.variant} → ${newVariant || 'SKIP'}`);
        });
        
        if (userItems.length > 3) {
          console.log(`     ... and ${userItems.length - 3} more`);
        }
      }
    }
  }

  console.log('\n💡 This was a dry run. No data was modified.');
  console.log('   Run with --execute to perform the actual migration.');
}

/**
 * Map legacy variant to new variant name
 */
function mapLegacyVariant(legacyVariant: string): string | null {
  const mapping: Record<string, string> = {
    'normal': 'normal',
    'holofoil': 'holo',
    'reverse_holofoil': 'reverse_holo_standard',
    'first_edition_normal': 'first_edition',
    'first_edition_holofoil': 'first_edition',
    'unlimited': 'normal'
  };

  return mapping[legacyVariant] || null;
}

// CLI Interface
const args = process.argv.slice(2);
const isDryRun = !args.includes('--execute');
const isForce = args.includes('--force');

if (isDryRun) {
  console.log('ℹ️  Running in dry run mode. Use --execute to run the actual migration.');
}

if (isForce) {
  console.log('⚠️  Force mode enabled. This will skip some safety checks.');
}

// Run the migration
(async () => {
  try {
    if (isDryRun) {
      await runDryRun();
    } else {
      if (!isForce) {
        console.log('⚠️  WARNING: This will modify your database!');
        console.log('   Make sure you have a backup before proceeding.');
        console.log('   Add --force to skip this warning.');
        process.exit(1);
      }
      await runMigration();
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
})();

export { runMigration, runDryRun };