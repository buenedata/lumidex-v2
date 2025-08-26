# Lumidex v2 - Migration Notes & Technical Documentation

This document provides detailed technical information about the database schema, data migration patterns, and implementation details for Lumidex v2.

## 📊 Database Schema Overview

### Core Architecture

Lumidex v2 uses a PostgreSQL database hosted on Supabase with Row Level Security (RLS) for user data protection. The schema is designed to efficiently handle Pokemon TCG data while supporting multiple price sources and user collections.

### Schema Components

```sql
-- Core enums for type safety
CREATE TYPE variant_name AS ENUM (
  'normal', 'holofoil', 'reverse_holofoil',
  'first_edition_normal', 'first_edition_holofoil', 'unlimited'
);

CREATE TYPE price_source AS ENUM ('cardmarket', 'tcgplayer');
```

## 🗄️ Table Structures

### Public Reference Tables (No RLS)

These tables contain Pokemon TCG reference data that is publicly accessible:

#### `tcg_sets`
```sql
CREATE TABLE tcg_sets (
  id text PRIMARY KEY,                    -- e.g., 'sv4', 'base1'
  name text NOT NULL,                     -- e.g., 'Paradox Rift'
  series text,                            -- e.g., 'Scarlet & Violet'
  ptcgo_code text,                        -- PTCGO/Live code
  printed_total int,                      -- Cards printed in set
  total int,                              -- Total cards including secrets
  release_date date,                      -- Set release date
  updated_at timestamptz DEFAULT now(),  -- Last update timestamp
  legalities jsonb DEFAULT '{}',          -- Format legalities
  images jsonb DEFAULT '{}'               -- Logo/symbol URLs
);

-- Performance index for chronological queries
CREATE INDEX idx_tcg_sets_release_date ON tcg_sets(release_date DESC);
```

#### `tcg_cards`
```sql
CREATE TABLE tcg_cards (
  id text PRIMARY KEY,                    -- e.g., 'sv4-182'
  set_id text NOT NULL REFERENCES tcg_sets(id) ON DELETE CASCADE,
  number text NOT NULL,                   -- Card number in set
  name text NOT NULL,                     -- Card name
  supertype text,                         -- Pokémon, Trainer, Energy
  subtypes text[] DEFAULT '{}',           -- Stage 1, Supporter, etc.
  hp text,                                -- Hit points (Pokémon only)
  types text[] DEFAULT '{}',              -- Fire, Water, etc.
  evolves_from text,                      -- Evolution prerequisite
  rules text[] DEFAULT '{}',              -- Special rules/abilities
  regulation_mark text,                   -- Tournament regulation
  artist text,                            -- Card artist
  rarity text,                            -- Common, Rare, etc.
  flavor_text text,                       -- Flavor text
  national_pokedex_numbers int[] DEFAULT '{}', -- Pokédex numbers
  legalities jsonb DEFAULT '{}',          -- Format legalities
  images jsonb DEFAULT '{}',              -- Small/large image URLs
  updated_at timestamptz DEFAULT now()   -- Last update timestamp
);

-- Performance indexes
CREATE INDEX idx_tcg_cards_set_id ON tcg_cards(set_id);
CREATE INDEX idx_tcg_cards_rarity ON tcg_cards(rarity);
CREATE INDEX idx_tcg_cards_updated_at ON tcg_cards(updated_at);
CREATE INDEX idx_tcg_cards_types_gin ON tcg_cards USING GIN(types);
```

#### `tcg_card_prices`
```sql
CREATE TABLE tcg_card_prices (
  card_id text NOT NULL REFERENCES tcg_cards(id) ON DELETE CASCADE,
  source price_source NOT NULL,          -- cardmarket or tcgplayer
  variant variant_name NOT NULL,         -- Normalized variant name
  last_updated timestamptz DEFAULT now(), -- Price update timestamp
  currency text DEFAULT 'EUR',           -- Price currency
  low numeric,                            -- Lowest price
  mid numeric,                            -- Mid-range price
  high numeric,                           -- Highest price
  market numeric,                         -- Market price
  direct_low numeric,                     -- Direct seller lowest
  url text,                               -- Price source URL
  PRIMARY KEY (card_id, source, variant) -- Composite primary key
);

-- Index for efficient price queries
CREATE INDEX idx_tcg_card_prices_source_variant ON tcg_card_prices(source, variant);
```

### User Tables (RLS Enabled)

These tables contain user-specific data protected by Row Level Security:

#### `profiles`
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid(), -- Links to Supabase Auth
  username text UNIQUE,                   -- Display username
  created_at timestamptz DEFAULT now()    -- Account creation time
);

-- RLS Policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

#### `collection_items`
```sql
CREATE TABLE collection_items (
  id bigserial PRIMARY KEY,               -- Auto-increment ID
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_id text NOT NULL REFERENCES tcg_cards(id) ON DELETE CASCADE,
  variant variant_name NOT NULL DEFAULT 'normal', -- Card variant
  quantity int NOT NULL DEFAULT 1,       -- Number owned
  condition text,                         -- Card condition
  acquired_at date,                       -- When acquired
  notes text,                             -- Personal notes
  created_at timestamptz DEFAULT now(),  -- Record creation
  updated_at timestamptz DEFAULT now(),  -- Last update
  UNIQUE(user_id, card_id, variant)      -- One entry per user/card/variant
);

-- RLS Policies for complete data isolation
CREATE POLICY "Users can view own collection" ON collection_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own collection items" ON collection_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own collection items" ON collection_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own collection items" ON collection_items
  FOR DELETE USING (auth.uid() = user_id);
```

## 🔄 Variant Normalization System

One of the most complex aspects of Lumidex v2 is handling card variant inconsistencies between price sources.

### Problem Statement

Different price sources use different naming conventions for card variants:

- **TCGplayer**: `"normal"`, `"holofoil"`, `"1stEditionHolofoil"`, `"reverseHolofoil"`
- **Cardmarket**: `"normal"`, `"holofoil"`, `"reverse holofoil"`, `"unlimited"`

### Solution: Internal Normalization

We define a canonical set of variant names and map external names to these internal values:

```typescript
// Internal canonical variants
type VariantName = 
  | 'normal' 
  | 'holofoil' 
  | 'reverse_holofoil' 
  | 'first_edition_normal' 
  | 'first_edition_holofoil' 
  | 'unlimited';

// TCGplayer mapping
const tcgplayerVariantMap: Record<string, VariantName> = {
  'normal': 'normal',
  'holofoil': 'holofoil',
  'reverseholofoil': 'reverse_holofoil',
  '1stedition': 'first_edition_normal',
  '1steditionholofoil': 'first_edition_holofoil',
  'unlimited': 'unlimited'
};

// Cardmarket mapping
const cardmarketVariantMap: Record<string, VariantName> = {
  'normal': 'normal',
  'holofoil': 'holofoil',
  'reverseholofoil': 'reverse_holofoil',
  'unlimited': 'unlimited',
  // Cardmarket rarely splits 1st edition
  '1stedition': 'normal',
  '1steditionholo': 'holofoil'
};
```

### Mapping Process

1. **Input**: External variant key from API (e.g., `"1stEditionHolofoil"`)
2. **Normalize**: Convert to lowercase, remove spaces/special chars
3. **Map**: Look up in source-specific mapping table
4. **Store**: Use internal variant name in database
5. **Skip**: If no mapping found, log warning and skip

## 📥 Data Ingestion Pipeline

### Sets Ingestion (`scripts/ingest/sets.ts`)

```typescript
// 1. Fetch all sets from Pokemon TCG API v2
const apiSets = await fetchAllSets();

// 2. Map API data to database schema
const dbSets = apiSets.map(mapSetToDatabase);

// 3. Batch upsert to database (500 sets per batch)
await upsertSetsInBatches(dbSets, 500);
```

### Cards Ingestion (`scripts/ingest/cards.ts`)

```typescript
// 1. Fetch cards (all or incremental)
const apiCards = await fetchAllCards(since);

// 2. Process cards and extract price data
for (const card of apiCards) {
  const dbCard = mapCardToDatabase(card);
  const prices = processCardPrices(card); // Variant mapping here
  
  allCards.push(dbCard);
  allPrices.push(...prices);
}

// 3. Batch upsert cards and prices
await upsertCardsInBatches(allCards, 500);
await upsertPricesInBatches(allPrices, 500);
```

### Incremental Updates

For regular updates, use the `--since` parameter:

```bash
npm run ingest:cards -- --since 2024-01-01
```

This adds a query filter: `q=updatedAt:[2024-01-01 TO *]`

## 🔐 Row Level Security (RLS) Implementation

RLS ensures users can only access their own data while keeping reference data publicly readable.

### Public Data Access

```sql
-- Grant SELECT to all users (including anonymous)
GRANT SELECT ON tcg_sets TO anon, authenticated;
GRANT SELECT ON tcg_cards TO anon, authenticated;
GRANT SELECT ON tcg_card_prices TO anon, authenticated;
```

### User Data Protection

```sql
-- Example RLS policy for collection_items
CREATE POLICY "Users can view own collection" ON collection_items
  FOR SELECT USING (auth.uid() = user_id);
```

This policy ensures that when a user queries `collection_items`, they only see records where `user_id` matches their authenticated user ID.

### RLS Testing

Verify RLS works correctly:

```sql
-- As an authenticated user, this should only return your items
SELECT * FROM collection_items;

-- This should work for any user (public data)
SELECT * FROM tcg_cards LIMIT 10;
```

## 🚀 Performance Optimizations

### Strategic Indexing

1. **Chronological queries**: `release_date DESC` for recent sets
2. **Foreign key joins**: `set_id` for card-to-set relationships
3. **Search operations**: GIN index on `types` array for type filtering
4. **Price queries**: Composite index on `(source, variant)`
5. **User data**: Indexes on `user_id` for collection queries

### Query Optimization Examples

```sql
-- Efficient: Uses idx_tcg_sets_release_date
SELECT * FROM tcg_sets ORDER BY release_date DESC LIMIT 50;

-- Efficient: Uses idx_tcg_cards_set_id
SELECT * FROM tcg_cards WHERE set_id = 'sv4';

-- Efficient: Uses idx_tcg_cards_types_gin
SELECT * FROM tcg_cards WHERE types && ARRAY['Fire', 'Water'];

-- Efficient: Uses idx_tcg_card_prices_source_variant
SELECT * FROM tcg_card_prices WHERE source = 'cardmarket' AND variant = 'holofoil';
```

### Batch Processing

All ingestion operations use batching to prevent memory issues and improve performance:

- **Sets**: 500 per batch
- **Cards**: 500 per batch  
- **Prices**: 500 per batch

## 🔄 Price Source Toggle Implementation

The price source toggle is implemented as a URL parameter that persists across navigation:

```typescript
// Client-side price source management
const priceSource = searchParams.get('source') as PriceSource || 'cardmarket';

// URL updates preserve other parameters
const updatePriceSource = (newSource: PriceSource) => {
  const params = new URLSearchParams(searchParams);
  params.set('source', newSource);
  router.push(`${pathname}?${params.toString()}`);
};
```

This approach ensures:
1. Price source preference persists while browsing
2. URLs are shareable with specific price sources
3. No additional state management required

## 🧪 Data Validation & Error Handling

### API Data Validation

- **Required fields**: Validate `id`, `name` presence before insertion
- **Type safety**: Use TypeScript interfaces for all API responses
- **Graceful degradation**: Continue processing if individual records fail

### Variant Mapping Validation

```typescript
const internalVariant = mapVariantFromSource('tcgplayer', externalVariant);
if (!internalVariant) {
  console.warn(`Unknown variant "${externalVariant}" for source tcgplayer`);
  continue; // Skip this price entry
}
```

### Database Constraint Handling

- **Unique constraints**: Handle conflicts with `ON CONFLICT` clauses
- **Foreign key violations**: Cascade deletes for data consistency
- **RLS violations**: Return empty results rather than errors

## 📈 Monitoring & Maintenance

### Regular Maintenance Tasks

1. **Data Updates**: Run ingestion scripts weekly or after major TCG releases
2. **Database Cleanup**: Monitor storage usage and archive old price data if needed
3. **Index Maintenance**: PostgreSQL handles this automatically, but monitor query performance
4. **RLS Auditing**: Regularly test that user data isolation works correctly

### Performance Monitoring

Key metrics to track:

- **Query performance**: Average response times for card searches
- **Database size**: Total storage used, growth rate
- **Ingestion performance**: Time to process full card updates
- **Error rates**: Failed variant mappings, API timeouts

### Troubleshooting Common Issues

**Slow card searches**: Check if GIN index on `types` is being used
```sql
EXPLAIN ANALYZE SELECT * FROM tcg_cards WHERE types && ARRAY['Fire'];
```

**RLS not working**: Verify policies are enabled and user is authenticated
```sql
SELECT * FROM pg_policies WHERE tablename = 'collection_items';
```

**Price data missing**: Check variant mapping logs for skipped variants
```bash
npm run ingest:cards 2>&1 | grep "Skipping unknown"
```

## 🔧 Development Workflow

### Local Development Setup

1. **Database**: Use local Supabase or connect to development instance
2. **API Keys**: Use development/test API keys when available
3. **Data**: Start with small datasets for faster development cycles

### Schema Changes

When modifying the database schema:

1. Create new migration file: `supabase/migrations/NNNN_description.sql`
2. Test migration locally: `npm run db:push`
3. Update TypeScript types: `npm run types:gen`
4. Update affected queries and components
5. Test thoroughly before deploying

### Adding New Price Sources

To support additional price sources:

1. Add new enum value to `price_source` type
2. Create variant mapping for new source
3. Update ingestion scripts to process new source data
4. Add UI toggle option for new source
5. Test variant mapping thoroughly

## 🚀 Deployment Considerations

### Environment Variables

**Never expose in browser**:
- `SUPABASE_SERVICE_ROLE_KEY`

**Safe for browser**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

### Production Database

- Enable connection pooling in Supabase
- Set up automated backups
- Monitor database performance metrics
- Consider read replicas for high traffic

### Ingestion in Production

- Run ingestion scripts during low-traffic periods
- Use incremental updates (`--since`) for regular maintenance
- Set up monitoring/alerting for failed ingestions
- Consider rate limiting for API calls

This concludes the comprehensive technical documentation for Lumidex v2. The system is designed for scalability, performance, and maintainability while handling the complexities of Pokemon TCG data and pricing inconsistencies.