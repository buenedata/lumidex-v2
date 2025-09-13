#!/usr/bin/env tsx

/**
 * Pokemon TCG CardMarket Prices Only Update Script
 * Updates CardMarket prices for existing cards in the database
 * Usage: npm run ingest:prices [--since YYYY-MM-DD]
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createServiceClient } from '../../src/lib/supabase/server';
import { fetchAllCards, type PokemonTCGCard } from '../../src/lib/pokeapi/client';
import { mapVariantFromSource, type VariantName, type PriceSource } from '../../src/lib/variants/mapper';

interface DatabasePrice {
  card_id: string;
  source: PriceSource;
  variant: VariantName;
  last_updated: string;
  currency: string;
  low: number | null;
  mid: number | null;
  high: number | null;
  market: number | null;
  direct_low: number | null;
  url: string | null;
  
  // Enhanced CardMarket fields
  average_sell_price: number | null;
  german_pro_low: number | null;
  suggested_price: number | null;
  reverse_holo_sell: number | null;
  reverse_holo_low: number | null;
  reverse_holo_trend: number | null;
  low_price_ex_plus: number | null;
  trend: number | null;
  trend_price: number | null;
  
  // Historical averages
  avg_1_day: number | null;
  avg_7_day: number | null;
  avg_30_day: number | null;
}

/**
 * Get existing card IDs from database
 */
async function getExistingCardIds(): Promise<Set<string>> {
  const supabase = createServiceClient();
  
  console.log('📋 Fetching existing card IDs from database...');
  
  const { data, error } = await supabase
    .from('tcg_cards')
    .select('id');
  
  if (error) {
    throw new Error(`Failed to fetch existing cards: ${error.message}`);
  }
  
  const cardIds = new Set(data.map(card => card.id));
  console.log(`✅ Found ${cardIds.size} existing cards in database\n`);
  
  return cardIds;
}

/**
 * Processes CardMarket price data with correct Pokemon TCG API structure
 * CardMarket prices is Record<string, number> - field names mapped to values
 */
function processCardmarketPrices(card: PokemonTCGCard): DatabasePrice[] {
  if (!card.cardmarket?.prices) return [];

  const prices: DatabasePrice[] = [];
  const basePrice = {
    card_id: card.id,
    source: 'cardmarket' as const,
    last_updated: card.cardmarket.updatedAt,
    currency: 'EUR', // CardMarket uses EUR
    url: card.cardmarket.url
  };

  const priceData = card.cardmarket.prices;

  // Create normal variant entry if we have main price fields
  if (priceData.averageSellPrice || priceData.lowPrice || priceData.avg1) {
    prices.push({
      ...basePrice,
      variant: 'normal' as const,
      
      // Map API fields to our database columns
      low: priceData.lowPrice || null,
      mid: priceData.averageSellPrice || null,
      high: null, // Not provided in Pokemon TCG API
      market: priceData.averageSellPrice || null,
      direct_low: null, // Not provided in Pokemon TCG API
      
      // Enhanced CardMarket fields
      average_sell_price: priceData.averageSellPrice || null,
      german_pro_low: priceData.germanProLow || null,
      suggested_price: priceData.suggestedPrice || null,
      reverse_holo_sell: null, // This goes to reverse variant
      reverse_holo_low: null, // This goes to reverse variant
      reverse_holo_trend: null, // This goes to reverse variant
      low_price_ex_plus: priceData.lowPriceExPlus || null,
      trend: priceData.trendPrice || null,
      trend_price: priceData.trendPrice || null,
      
      // Historical averages (KEY FEATURE!)
      avg_1_day: priceData.avg1 || null,
      avg_7_day: priceData.avg7 || null,
      avg_30_day: priceData.avg30 || null,
    });
  }

  // Create reverse holofoil variant entry if we have reverse holo fields
  if (priceData.reverseHoloSell || priceData.reverseHoloLow || priceData.reverseHoloAvg1) {
    prices.push({
      ...basePrice,
      variant: 'reverse_holofoil' as const,
      
      // Map reverse holo fields
      low: priceData.reverseHoloLow || null,
      mid: priceData.reverseHoloSell || null,
      high: null,
      market: priceData.reverseHoloSell || null,
      direct_low: null,
      
      // Enhanced CardMarket fields (reverse holo specific)
      average_sell_price: priceData.reverseHoloSell || null,
      german_pro_low: null, // Only on normal variant
      suggested_price: null, // Only on normal variant
      reverse_holo_sell: priceData.reverseHoloSell || null,
      reverse_holo_low: priceData.reverseHoloLow || null,
      reverse_holo_trend: priceData.reverseHoloTrend || null,
      low_price_ex_plus: null, // Only on normal variant
      trend: priceData.reverseHoloTrend || null,
      trend_price: priceData.reverseHoloTrend || null,
      
      // Historical averages for reverse holo
      avg_1_day: priceData.reverseHoloAvg1 || null,
      avg_7_day: priceData.reverseHoloAvg7 || null,
      avg_30_day: priceData.reverseHoloAvg30 || null,
    });
  }

  return prices;
}

/**
 * Processes TCGplayer price data and maps variants
 */
function processTCGplayerPrices(card: PokemonTCGCard): DatabasePrice[] {
  if (!card.tcgplayer?.prices) return [];

  const prices: DatabasePrice[] = [];
  const basePrice = {
    card_id: card.id,
    source: 'tcgplayer' as const,
    last_updated: card.tcgplayer.updatedAt,
    currency: 'USD', // TCGplayer uses USD
    url: card.tcgplayer.url,
    
    // TCGPlayer doesn't provide CardMarket-specific fields
    average_sell_price: null,
    german_pro_low: null,
    suggested_price: null,
    reverse_holo_sell: null,
    reverse_holo_low: null,
    reverse_holo_trend: null,
    low_price_ex_plus: null,
    trend: null,
    trend_price: null,
    avg_1_day: null,
    avg_7_day: null,
    avg_30_day: null,
  };

  for (const [externalVariant, priceData] of Object.entries(card.tcgplayer.prices)) {
    const internalVariant = mapVariantFromSource('tcgplayer', externalVariant);
    
    if (!internalVariant) {
      console.warn(`⚠️ Skipping unknown TCGplayer variant "${externalVariant}" for card ${card.id}`);
      continue;
    }

    if (priceData && typeof priceData === 'object') {
      prices.push({
        ...basePrice,
        variant: internalVariant,
        low: priceData.low || null,
        mid: priceData.mid || null,
        high: priceData.high || null,
        market: priceData.market || null,
        direct_low: priceData.directLow || null
      });
    }
  }

  return prices;
}

/**
 * Processes price data for existing cards only
 */
function processPricesForExistingCards(apiCards: PokemonTCGCard[], existingCardIds: Set<string>): DatabasePrice[] {
  const allPrices: DatabasePrice[] = [];
  let processedCards = 0;
  let skippedCards = 0;
  
  for (const card of apiCards) {
    if (!existingCardIds.has(card.id)) {
      skippedCards++;
      continue;
    }
    
    // Process CardMarket prices
    const cardmarketPrices = processCardmarketPrices(card);
    allPrices.push(...cardmarketPrices);
    
    // Process TCGplayer prices
    const tcgplayerPrices = processTCGplayerPrices(card);
    allPrices.push(...tcgplayerPrices);
    
    processedCards++;
    
    if (processedCards % 1000 === 0) {
      console.log(`   Processed prices for ${processedCards} existing cards...`);
    }
  }
  
  console.log(`✅ Processed ${allPrices.length} price records from ${processedCards} existing cards`);
  console.log(`ℹ️ Skipped ${skippedCards} cards not in database\n`);
  
  return allPrices;
}

/**
 * Upserts prices in batches
 */
async function upsertPricesInBatches(prices: DatabasePrice[], batchSize = 500) {
  if (prices.length === 0) {
    console.log('ℹ️ No prices to upsert');
    return;
  }

  const supabase = createServiceClient();
  const totalBatches = Math.ceil(prices.length / batchSize);
  
  console.log(`💾 Upserting ${prices.length} price records in ${totalBatches} batches of ${batchSize}...`);
  
  for (let i = 0; i < prices.length; i += batchSize) {
    const batch = prices.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    console.log(`   Processing prices batch ${batchNumber}/${totalBatches} (${batch.length} prices)...`);
    
    try {
      const { error } = await supabase
        .from('tcg_card_prices')
        .upsert(batch, {
          onConflict: 'card_id,source,variant',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error(`Error in prices batch ${batchNumber}:`, error);
        throw error;
      }
      
      console.log(`✅ Prices batch ${batchNumber} completed successfully`);
    } catch (error) {
      console.error(`❌ Failed to upsert prices batch ${batchNumber}:`, error);
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
 * Main price update function
 */
async function updatePricesOnly(since?: string) {
  console.log('💰 Starting CardMarket prices-only update...\n');
  
  try {
    // Validate environment
    console.log('🔍 Validating environment variables...');
    validateEnvironment();
    console.log('✅ Environment validation passed\n');
    
    // Get existing card IDs from database
    const existingCardIds = await getExistingCardIds();
    
    // Fetch cards from Pokemon TCG API (for price data only)
    if (since) {
      console.log(`📡 Fetching ONLY price data updated since ${since} from Pokemon TCG API v2...`);
    } else {
      console.log('📡 Fetching ONLY price data from Pokemon TCG API v2...');
    }
    
    // Note: select parameter doesn't work in Pokemon TCG API (causes 404s)
    // Fetching full card objects but only processing price data
    
    const apiCards = await fetchAllCards(since);
    console.log(`✅ Fetched ${apiCards.length} cards from API\n`);
    
    if (apiCards.length === 0) {
      console.log('ℹ️ No cards found in API response');
      return;
    }
    
    // Process price data for existing cards only
    console.log('💰 Processing price data for existing cards only...');
    const allPrices = processPricesForExistingCards(apiCards, existingCardIds);
    
    // Upsert prices to database (NO CARD DATA!)
    console.log('💾 Starting prices database update...');
    await upsertPricesInBatches(allPrices, 500);
    console.log('✅ Prices database update completed\n');
    
    // Summary
    console.log('🎉 CardMarket prices update completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Cards with price data: ${allPrices.length > 0 ? new Set(allPrices.map(p => p.card_id)).size : 0}`);
    console.log(`   - Price records updated: ${allPrices.length}`);
    console.log(`   - CardMarket prices: ${allPrices.filter(p => p.source === 'cardmarket').length}`);
    console.log(`   - TCGplayer prices: ${allPrices.filter(p => p.source === 'tcgplayer').length}`);
    console.log(`   - Cards in database: ${existingCardIds.size}`);
    
    if (since) {
      console.log(`   - Incremental update since: ${since}`);
    }
    
  } catch (error) {
    console.error('❌ Prices update failed:', error);
    
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
      .from('tcg_cards')
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
Pokemon TCG CardMarket Prices Only Update Script

Usage:
  npm run ingest:prices                    - Update all CardMarket prices for existing cards
  npm run ingest:prices --since 2024-01-01 - Update prices changed since date
  npm run ingest:prices --test             - Test database connection only
  npm run ingest:prices --help             - Show this help message

Environment Variables Required:
  NEXT_PUBLIC_SUPABASE_URL     - Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY    - Supabase service role key (not anon key!)
  POKEMONTCG_API_KEY          - Pokemon TCG API v2 key

The script will:
1. Fetch existing card IDs from your database
2. Fetch price data from Pokemon TCG API v2 (all or incremental)
3. Process ONLY price data (no card data imported!)
4. Update prices for cards that exist in your database
5. Skip any cards not already in your database

This is much faster than the full card ingestion and only updates what you need!
    `);
    process.exit(0);
  }
  
  // Parse --since parameter
  let since: string | undefined;
  const sinceIndex = args.indexOf('--since');
  if (sinceIndex !== -1 && args[sinceIndex + 1]) {
    since = args[sinceIndex + 1];
    console.log(`ℹ️ Incremental mode: processing prices since ${since}\n`);
  }
  
  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.error('Cannot proceed without database connection');
    process.exit(1);
  }
  
  // Run price update
  await updatePricesOnly(since);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle SIGINT gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Price update interrupted by user');
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}