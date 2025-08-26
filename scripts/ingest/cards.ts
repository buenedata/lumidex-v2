#!/usr/bin/env tsx

/**
 * Pokemon TCG Cards Ingestion Script
 * Fetches all cards from Pokemon TCG API v2, processes price data, and upserts to Supabase
 * Usage: npm run ingest:cards [--since YYYY-MM-DD]
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createServiceClient } from '../../src/lib/supabase/server';
import { fetchAllCards, type PokemonTCGCard } from '../../src/lib/pokeapi/client';
import { mapVariantFromSource, type VariantName, type PriceSource } from '../../src/lib/variants/mapper';

interface DatabaseCard {
  id: string;
  set_id: string;
  number: string;
  name: string;
  supertype: string | null;
  subtypes: string[];
  hp: string | null;
  types: string[];
  evolves_from: string | null;
  rules: string[];
  regulation_mark: string | null;
  artist: string | null;
  rarity: string | null;
  flavor_text: string | null;
  national_pokedex_numbers: number[];
  legalities: any;
  images: any;
  updated_at: string;
}

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
}

/**
 * Maps Pokemon TCG API card data to database schema
 */
function mapCardToDatabase(card: PokemonTCGCard): DatabaseCard {
  return {
    id: card.id,
    set_id: card.set.id,
    number: card.number,
    name: card.name,
    supertype: card.supertype || null,
    subtypes: card.subtypes || [],
    hp: card.hp || null,
    types: card.types || [],
    evolves_from: card.evolvesFrom || null,
    rules: card.rules || [],
    regulation_mark: card.regulationMark || null,
    artist: card.artist || null,
    rarity: card.rarity || null,
    flavor_text: card.flavorText || null,
    national_pokedex_numbers: card.nationalPokedexNumbers || [],
    legalities: card.legalities || {},
    images: card.images || {},
    updated_at: card.updatedAt
  };
}

/**
 * Processes Cardmarket price data and maps variants
 */
function processCardmarketPrices(card: PokemonTCGCard): DatabasePrice[] {
  if (!card.cardmarket?.prices) return [];

  const prices: DatabasePrice[] = [];
  const basePrice: Omit<DatabasePrice, 'variant' | 'low' | 'mid' | 'high' | 'market' | 'direct_low'> = {
    card_id: card.id,
    source: 'cardmarket',
    last_updated: card.cardmarket.updatedAt,
    currency: 'EUR', // Cardmarket uses EUR
    url: card.cardmarket.url
  };

  for (const [externalVariant, price] of Object.entries(card.cardmarket.prices)) {
    const internalVariant = mapVariantFromSource('cardmarket', externalVariant);
    
    if (!internalVariant) {
      console.warn(`⚠️ Skipping unknown Cardmarket variant "${externalVariant}" for card ${card.id}`);
      continue;
    }

    if (typeof price === 'number' && price > 0) {
      prices.push({
        ...basePrice,
        variant: internalVariant,
        low: null,
        mid: price,
        high: null,
        market: price,
        direct_low: null
      });
    }
  }

  return prices;
}

/**
 * Processes TCGplayer price data and maps variants
 */
function processTCGplayerPrices(card: PokemonTCGCard): DatabasePrice[] {
  if (!card.tcgplayer?.prices) return [];

  const prices: DatabasePrice[] = [];
  const basePrice: Omit<DatabasePrice, 'variant' | 'low' | 'mid' | 'high' | 'market' | 'direct_low'> = {
    card_id: card.id,
    source: 'tcgplayer',
    last_updated: card.tcgplayer.updatedAt,
    currency: 'USD', // TCGplayer uses USD
    url: card.tcgplayer.url
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
 * Processes all price data for a card
 */
function processCardPrices(card: PokemonTCGCard): DatabasePrice[] {
  const allPrices: DatabasePrice[] = [];
  
  // Process Cardmarket prices
  const cardmarketPrices = processCardmarketPrices(card);
  allPrices.push(...cardmarketPrices);
  
  // Process TCGplayer prices
  const tcgplayerPrices = processTCGplayerPrices(card);
  allPrices.push(...tcgplayerPrices);
  
  return allPrices;
}

/**
 * Upserts cards in batches
 */
async function upsertCardsInBatches(cards: DatabaseCard[], batchSize = 500) {
  const supabase = createServiceClient();
  const totalBatches = Math.ceil(cards.length / batchSize);
  
  console.log(`Upserting ${cards.length} cards in ${totalBatches} batches of ${batchSize}...`);
  
  for (let i = 0; i < cards.length; i += batchSize) {
    const batch = cards.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    console.log(`Processing cards batch ${batchNumber}/${totalBatches} (${batch.length} cards)...`);
    
    try {
      const { error } = await supabase
        .from('tcg_cards')
        .upsert(batch, {
          onConflict: 'id',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error(`Error in cards batch ${batchNumber}:`, error);
        throw error;
      }
      
      console.log(`✅ Cards batch ${batchNumber} completed successfully`);
    } catch (error) {
      console.error(`❌ Failed to upsert cards batch ${batchNumber}:`, error);
      throw error;
    }
  }
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
  
  console.log(`Upserting ${prices.length} price records in ${totalBatches} batches of ${batchSize}...`);
  
  for (let i = 0; i < prices.length; i += batchSize) {
    const batch = prices.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    console.log(`Processing prices batch ${batchNumber}/${totalBatches} (${batch.length} prices)...`);
    
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
 * Main ingestion function
 */
async function ingestCards(since?: string) {
  console.log('🚀 Starting Pokemon TCG cards ingestion...\n');
  
  try {
    // Validate environment
    console.log('🔍 Validating environment variables...');
    validateEnvironment();
    console.log('✅ Environment validation passed\n');
    
    // Fetch cards from Pokemon TCG API
    if (since) {
      console.log(`📡 Fetching cards updated since ${since} from Pokemon TCG API v2...`);
    } else {
      console.log('📡 Fetching all cards from Pokemon TCG API v2...');
    }
    
    const apiCards = await fetchAllCards(since);
    console.log(`✅ Fetched ${apiCards.length} cards from API\n`);
    
    if (apiCards.length === 0) {
      console.log('ℹ️ No cards found in API response');
      return;
    }
    
    // Map cards to database format
    console.log('🔄 Mapping cards to database format...');
    const dbCards = apiCards.map(mapCardToDatabase);
    console.log(`✅ Mapped ${dbCards.length} cards\n`);
    
    // Process price data
    console.log('💰 Processing price data...');
    const allPrices: DatabasePrice[] = [];
    let processedCards = 0;
    let skippedVariants = 0;
    
    for (const card of apiCards) {
      const cardPrices = processCardPrices(card);
      allPrices.push(...cardPrices);
      processedCards++;
      
      if (processedCards % 1000 === 0) {
        console.log(`   Processed prices for ${processedCards}/${apiCards.length} cards...`);
      }
    }
    
    console.log(`✅ Processed ${allPrices.length} price records from ${processedCards} cards\n`);
    
    // Upsert cards to database
    console.log('💾 Starting cards database upsert...');
    await upsertCardsInBatches(dbCards, 500);
    console.log('✅ Cards database upsert completed\n');
    
    // Upsert prices to database
    console.log('💾 Starting prices database upsert...');
    await upsertPricesInBatches(allPrices, 500);
    console.log('✅ Prices database upsert completed\n');
    
    // Summary
    console.log('🎉 Cards ingestion completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Cards processed: ${apiCards.length}`);
    console.log(`   - Price records: ${allPrices.length}`);
    console.log(`   - Cardmarket prices: ${allPrices.filter(p => p.source === 'cardmarket').length}`);
    console.log(`   - TCGplayer prices: ${allPrices.filter(p => p.source === 'tcgplayer').length}`);
    
    if (since) {
      console.log(`   - Incremental update since: ${since}`);
    }
    
  } catch (error) {
    console.error('❌ Cards ingestion failed:', error);
    
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
Pokemon TCG Cards Ingestion Script

Usage:
  npm run ingest:cards                    - Run full cards ingestion
  npm run ingest:cards --since 2024-01-01 - Incremental update since date
  npm run ingest:cards --test             - Test database connection only
  npm run ingest:cards --help             - Show this help message

Environment Variables Required:
  NEXT_PUBLIC_SUPABASE_URL     - Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY    - Supabase service role key (not anon key!)
  POKEMONTCG_API_KEY          - Pokemon TCG API v2 key

The script will:
1. Fetch cards from Pokemon TCG API v2 (all or incremental)
2. Map API data to database schema
3. Process price data from cardmarket and tcgplayer
4. Normalize variants using the variant mapper
5. Upsert cards and prices to Supabase (handles conflicts automatically)
6. Process in batches for optimal performance

Incremental Mode:
  Use --since YYYY-MM-DD to only fetch cards updated since that date.
  This is much faster for regular updates.
    `);
    process.exit(0);
  }
  
  // Parse --since parameter
  let since: string | undefined;
  const sinceIndex = args.indexOf('--since');
  if (sinceIndex !== -1 && args[sinceIndex + 1]) {
    since = args[sinceIndex + 1];
    console.log(`ℹ️ Incremental mode: processing cards since ${since}\n`);
  }
  
  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.error('Cannot proceed without database connection');
    process.exit(1);
  }
  
  // Run ingestion
  await ingestCards(since);
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