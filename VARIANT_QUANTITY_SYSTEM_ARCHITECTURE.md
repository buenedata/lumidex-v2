# Variant Quantity Box System - Technical Architecture

## Overview

This document outlines the comprehensive architecture for implementing the data-driven Variant Rule Engine and colored quantity box UI system for Pokémon TCG cards in Lumidex. The system enables users to track different card variants with intuitive colored quantity boxes.

## System Requirements

### Core Functionality
- **Data-driven variant discovery** using TCGplayer pricing as the source of truth
- **Colored quantity boxes** rendered under cards on set overview and collection pages
- **Interactive quantity management** with left-click (+1), right-click/long-press (-1)
- **Set-level policy system** for variant rules (Poké Ball reverses, Master Ball reverses, etc.)
- **Era-specific logic** (Scarlet & Violet vs. earlier sets)
- **Bulk optimization** for set-level variant computation

### UI Contract
- **7 variant types**: 
  - normal (yellow)
  - holo (purple)
  - reverse_holo_standard (blue)
  - reverse_holo_pokeball (red)
  - reverse_holo_masterball (pink)
  - first_edition (green)
  - custom (grey)
- **Square colored boxes** with quantity numbers inside (>0) or empty (=0)
- **Aurora Crimson theming** integration
- **Accessibility compliant** with keyboard navigation and screen reader support

### Variant Order Preference
normal → holo → reverse_holo_standard → reverse_holo_pokeball → reverse_holo_masterball → first_edition

## Database Schema Changes

### 1. New Variant Enum
```sql
-- New UI-canonical variant enum
CREATE TYPE variant_name_v2 AS ENUM (
  'normal',
  'holo', 
  'reverse_holo_standard',
  'reverse_holo_pokeball',
  'reverse_holo_masterball',
  'first_edition',
  'custom'
);
```

### 2. User Card Variants Table (Migration)
```sql
-- Migration strategy: dual-write approach
ALTER TABLE collection_items ADD COLUMN variant_v2 variant_name_v2;

-- Add new unique constraint
ALTER TABLE collection_items ADD CONSTRAINT unique_user_card_variant_v2 
  UNIQUE(user_id, card_id, variant_v2);

-- Backfill data with mapping
UPDATE collection_items SET variant_v2 = CASE 
  WHEN variant = 'holofoil' THEN 'holo'::variant_name_v2
  WHEN variant = 'reverse_holofoil' THEN 'reverse_holo_standard'::variant_name_v2
  WHEN variant = 'first_edition_normal' THEN 'first_edition'::variant_name_v2
  WHEN variant = 'first_edition_holofoil' THEN 'first_edition'::variant_name_v2
  ELSE 'normal'::variant_name_v2
END;

-- Final cleanup (after deployment)
-- ALTER TABLE collection_items DROP COLUMN variant;
-- ALTER TABLE collection_items RENAME COLUMN variant_v2 TO variant;
```

### 3. Set Policies Table
```sql
CREATE TABLE tcg_set_policies (
  set_id text PRIMARY KEY REFERENCES tcg_sets(id) ON DELETE CASCADE,
  has_standard_reverse boolean DEFAULT true,
  has_pokeball_reverse boolean DEFAULT false,
  has_masterball_reverse boolean DEFAULT false,
  has_first_edition boolean DEFAULT false,
  rare_policy text DEFAULT 'auto', -- 'auto', 'force_holo', 'allow_normal'
  era text DEFAULT 'modern', -- 'classic', 'modern', 'sv'
  special_rules jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX idx_tcg_set_policies_era ON tcg_set_policies(era);
```

### 4. Rarity Mappings Table
```sql
CREATE TABLE rarity_variant_mappings (
  id bigserial PRIMARY KEY,
  rarity text NOT NULL,
  era text NOT NULL,
  allowed_variants text[] NOT NULL,
  force_variants text[] DEFAULT '{}',
  exclude_variants text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Unique constraint
ALTER TABLE rarity_variant_mappings 
  ADD CONSTRAINT unique_rarity_era UNIQUE(rarity, era);
```

### 5. Card Variant Exceptions Table
```sql
CREATE TABLE card_variant_exceptions (
  id bigserial PRIMARY KEY,
  set_id text NOT NULL REFERENCES tcg_sets(id) ON DELETE CASCADE,
  card_number text NOT NULL,
  exception_type text NOT NULL, -- 'force', 'exclude', 'override'
  variant_changes jsonb NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(set_id, card_number, exception_type)
);
```

## API Architecture

### 1. Variant Rule Engine Core

```typescript
// src/lib/variants/engine.ts

export interface VariantEngineInput {
  card: PokemonTCGCard;
  tcgplayerPrices?: Record<string, any>;
  cardmarketPrices?: Record<string, any>;
}

export interface VariantEngineOutput {
  variants: UIVariant[];
  metadata: {
    source: 'tcgplayer' | 'policy' | 'rarity';
    setPolicy: SetPolicy;
    appliedExceptions: string[];
  };
}

export interface UIVariant {
  type: 'normal' | 'holo' | 'reverse_holo_standard' | 'reverse_holo_pokeball' | 'reverse_holo_masterball' | 'first_edition' | 'custom';
  price?: number;
  priceSource?: 'tcgplayer' | 'cardmarket';
  userQuantity?: number;
}

export interface SetPolicy {
  setId: string;
  hasStandardReverse: boolean;
  hasPokeballReverse: boolean;
  hasMasterballReverse: boolean;
  hasFirstEdition: boolean;
  rarePolicy: 'auto' | 'force_holo' | 'allow_normal';
  era: 'classic' | 'modern' | 'sv';
  specialRules: Record<string, any>;
}

// Main engine function
export async function generateVariantsForCard(
  input: VariantEngineInput,
  setPolicy?: SetPolicy
): Promise<VariantEngineOutput> {
  // Implementation details...
}
```

### 2. Bulk Processing for Set Views

```typescript
// src/lib/variants/bulk.ts

export interface BulkVariantRequest {
  setId: string;
  cards: PokemonTCGCard[];
  userCollectionData?: Map<string, UserVariantQuantities>;
}

export interface UserVariantQuantities {
  [variantType: string]: number;
}

export async function generateVariantsForSet(
  request: BulkVariantRequest
): Promise<Map<string, VariantEngineOutput>> {
  // Optimized bulk processing
  // - Single set policy lookup
  // - Batched price data queries
  // - Cached rarity mappings
}
```

## UI Components Architecture

### 1. Variant Quantity Box Component

```typescript
// src/components/variants/VariantQuantityBox.tsx

export interface VariantQuantityBoxProps {
  variant: UIVariant;
  quantity: number;
  disabled?: boolean;
  onQuantityChange: (newQuantity: number) => void;
  onOptimisticChange?: (delta: number) => void;
}

export interface VariantQuantityBoxGroupProps {
  cardId: string;
  variants: UIVariant[];
  userQuantities: Record<string, number>;
  onQuantityChange: (cardId: string, variant: string, newQuantity: number) => Promise<void>;
}
```

### 2. Color System (Tailwind Classes)

```typescript
// src/lib/variants/colors.ts

export const VARIANT_COLORS = {
  normal: {
    bg: 'bg-yellow-500',
    border: 'border-yellow-400',
    hover: 'hover:bg-yellow-600',
    text: 'text-yellow-50'
  },
  holo: {
    bg: 'bg-purple-500', 
    border: 'border-purple-400',
    hover: 'hover:bg-purple-600',
    text: 'text-purple-50'
  },
  reverse_holo_standard: {
    bg: 'bg-blue-500',
    border: 'border-blue-400', 
    hover: 'hover:bg-blue-600',
    text: 'text-blue-50'
  },
  reverse_holo_pokeball: {
    bg: 'bg-red-500',
    border: 'border-red-400',
    hover: 'hover:bg-red-600', 
    text: 'text-red-50'
  },
  reverse_holo_masterball: {
    bg: 'bg-pink-500',
    border: 'border-pink-400',
    hover: 'hover:bg-pink-600',
    text: 'text-pink-50'
  },
  first_edition: {
    bg: 'bg-green-500',
    border: 'border-green-400',
    hover: 'hover:bg-green-600',
    text: 'text-green-50'
  },
  custom: {
    bg: 'bg-gray-500',
    border: 'border-gray-400',
    hover: 'hover:bg-gray-600',
    text: 'text-gray-50'
  }
} as const;
```

## Decision Flow Algorithm

### 1. Core Engine Logic

```typescript
async function processCardVariants(card: PokemonTCGCard, setPolicy: SetPolicy): Promise<UIVariant[]> {
  // Step 1: Load rarity's allowed variants
  const rarityMappings = await getRarityMappings(card.rarity, setPolicy.era);
  let allowedVariants = rarityMappings.allowedVariants;

  // Step 2: Intersect with TCGplayer pricing keys present
  const tcgplayerVariants = extractTCGplayerVariants(card.tcgplayer?.prices);
  
  const variants: UIVariant[] = [];

  // Step 3: TCGplayer-driven variants
  if (tcgplayerVariants.includes('normal')) {
    variants.push({ type: 'normal', price: card.tcgplayer.prices.normal.market });
  }
  
  if (tcgplayerVariants.includes('holofoil')) {
    variants.push({ type: 'holo', price: card.tcgplayer.prices.holofoil.market });
  }
  
  if (tcgplayerVariants.includes('reverseHolofoil')) {
    variants.push({ type: 'reverse_holo_standard', price: card.tcgplayer.prices.reverseHolofoil.market });
  }

  // Step 4: Policy-driven variants (same price bucket as reverseHolofoil)
  if (setPolicy.hasPokeballReverse && tcgplayerVariants.includes('reverseHolofoil')) {
    variants.push({ type: 'reverse_holo_pokeball', price: card.tcgplayer.prices.reverseHolofoil.market });
  }
  
  if (setPolicy.hasMasterballReverse && tcgplayerVariants.includes('reverseHolofoil')) {
    variants.push({ type: 'reverse_holo_masterball', price: card.tcgplayer.prices.reverseHolofoil.market });
  }

  // Step 5: First Edition logic
  if (setPolicy.hasFirstEdition) {
    // First edition can share pricing with normal or holo depending on era
    const firstEditionPrice = card.tcgplayer?.prices?.normal?.market || card.tcgplayer?.prices?.holofoil?.market;
    if (firstEditionPrice) {
      variants.push({ type: 'first_edition', price: firstEditionPrice });
    }
  }

  // Step 6: Apply set-level flags and exceptions
  const processedVariants = await applySetPolicies(variants, card, setPolicy);
  const finalVariants = await applyCardExceptions(processedVariants, card);

  // Step 7: Deduplicate and sort by global order
  return sortVariantsByOrder(deduplicateVariants(finalVariants));
}
```

### 2. Era-Specific Rules

```typescript
function applyEraRules(variants: UIVariant[], card: PokemonTCGCard, era: string): UIVariant[] {
  switch (era) {
    case 'sv':
      // Scarlet & Violet: All "Rare" cards are holo; never show normal for Rare
      if (card.rarity === 'Rare') {
        return variants.filter(v => v.type !== 'normal');
      }
      break;
      
    case 'classic':
      // Classic era: Different pricing structure
      // Implementation for older sets
      break;
      
    case 'modern':
      // Modern era: Standard TCGplayer-driven logic
      break;
  }
  
  return variants;
}
```

## API Endpoints

### 1. Variant Management

```typescript
// src/app/api/variants/route.ts

// GET /api/variants?cardIds=id1,id2,id3
export async function GET(request: NextRequest) {
  // Bulk variant generation for multiple cards
}

// POST /api/variants/quantities
export async function POST(request: NextRequest) {
  // Update user variant quantities
  const { cardId, variant, quantity } = await request.json();
  // Implementation...
}
```

### 2. Set Policy Management

```typescript
// src/app/api/admin/set-policies/route.ts

// GET /api/admin/set-policies
export async function GET() {
  // List all set policies
}

// POST /api/admin/set-policies
export async function POST(request: NextRequest) {
  // Create/update set policy
}
```

## Integration Points

### 1. Set Overview Page Integration

```typescript
// src/app/(site)/pokemon/sets/[id]/page.tsx

export default async function SetPage({ params }: { params: { id: string } }) {
  const cards = await fetchCardsForSet(params.id);
  const variantData = await generateVariantsForSet({
    setId: params.id,
    cards,
    userCollectionData: await getUserCollectionForSet(params.id)
  });

  return (
    <div>
      {cards.map(card => (
        <CardTile 
          key={card.id} 
          card={card}
          variants={variantData.get(card.id)?.variants || []}
          userQuantities={variantData.get(card.id)?.userQuantities || {}}
        />
      ))}
    </div>
  );
}
```

### 2. Collection Page Integration

```typescript
// src/app/(site)/collection/page.tsx

// Similar integration but with user's existing collection data
```

## Performance Optimizations

### 1. Caching Strategy
- **Set Policy Cache**: Redis cache for frequently accessed set policies
- **Rarity Mapping Cache**: In-memory cache for rarity → variant mappings
- **Client-side Cache**: React Query cache for variant rule engine results

### 2. Database Optimizations
- **Compound Indexes**: On (user_id, card_id, variant) for fast quantity lookups
- **Prepared Statements**: For bulk variant quantity updates
- **Connection Pooling**: Optimized for concurrent variant calculations

### 3. Bulk Processing
- **Batch Price Lookups**: Single query for all cards in a set
- **Parallel Processing**: Concurrent variant calculation for large sets
- **Streaming Results**: Progressive loading for large card collections

## Testing Strategy

### 1. Unit Tests
- Variant Rule Engine logic
- Color mapping functions
- TCGplayer price parsing
- Set policy application

### 2. Integration Tests
- Bulk variant generation
- Database migration scripts
- API endpoint functionality
- UI component interactions

### 3. E2E Tests
- Complete user interaction flows
- Cross-browser compatibility
- Mobile touch interactions
- Accessibility compliance

## Deployment Plan

### Phase 1: Database Migration
1. Deploy new schema with dual-write support
2. Backfill existing data
3. Verify data integrity

### Phase 2: Backend Implementation
1. Deploy variant rule engine
2. Set up set policy system
3. Create API endpoints

### Phase 3: Frontend Integration
1. Deploy UI components
2. Integrate with existing pages
3. Add quantity management

### Phase 4: Cleanup
1. Remove old individual card pages
2. Clean up legacy variant system
3. Optimize performance

## Monitoring and Metrics

### 1. Performance Metrics
- Variant calculation time per set
- API response times
- Cache hit rates
- Database query performance

### 2. User Engagement
- Variant box interaction rates
- Quantity update frequency
- Error rates and user feedback

### 3. Data Quality
- Variant discovery accuracy
- Price data freshness
- Policy application correctness