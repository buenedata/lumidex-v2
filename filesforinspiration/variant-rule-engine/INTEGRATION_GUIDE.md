# Integration Guide - Variant Rule Engine

## Overview

This guide covers integrating the variant rule engine into the existing Lumidex Pokemon TCG app, including code changes, data flow updates, and UI modifications.

## Integration Points

### 1. Transform Card Data Function

**File:** `src/lib/pokemon-tcg-api.ts`

#### Current Implementation
The [`transformCardData`](src/lib/pokemon-tcg-api.ts:277-419) function currently extracts TCGPlayer variant availability manually.

#### New Integration

```typescript
// Add import
import { inferVariants, mapToCardVariants } from './variant-rule-engine'

export function transformCardData(apiCard: any, productSources?: string[]): PokemonCard {
  const cardData: PokemonCard = {
    // ... existing card data mapping
  }

  // Extract pricing data (existing logic)
  if (apiCard.cardmarket) {
    // ... existing cardmarket logic
  }

  if (apiCard.tcgplayer) {
    // ... existing tcgplayer logic
  }

  // NEW: Apply variant rule engine
  const variantAnalysis = inferVariants(apiCard, productSources)
  
  // Add variant analysis to card data
  cardData.variantAnalysis = variantAnalysis
  cardData.availableVariants = mapToCardVariants(variantAnalysis)
  
  // Existing validation and return
  return validateAndCorrectCardPricing(cardData, {
    correctInvalidPrices: true,
    logIssues: true,
    cardId: cardData.id,
    cardName: cardData.name
  })
}
```

#### Extended Card Interface

```typescript
// Update in src/types/domains/card.ts
export interface PokemonCard extends BaseEntity {
  // ... existing fields
  
  // NEW: Variant analysis results
  variantAnalysis?: VariantResult
  availableVariants?: CardVariant[]
}
```

### 2. Collection Buttons Integration

**File:** `src/components/pokemon/CollectionButtons.tsx`

#### Current Implementation
Uses [`getAvailableVariants`](src/components/pokemon/CollectionButtons.tsx:171-380) function with complex set-specific logic.

#### New Integration

```typescript
// Replace getAvailableVariants function
export const getAvailableVariants = (card: any): CardVariant[] => {
  // Use variant analysis if available
  if (card.variantAnalysis) {
    return mapToCardVariants(card.variantAnalysis)
  }
  
  // Fallback to existing logic for backwards compatibility
  return getAvailableVariantsLegacy(card)
}

// Keep existing logic as fallback
const getAvailableVariantsLegacy = (card: any): CardVariant[] => {
  // ... existing implementation as fallback
}
```

#### Enhanced Variant Display

```typescript
// Add variant confidence indicators
const getVariantConfidence = (card: any, variant: CardVariant): string => {
  if (!card.variantAnalysis) return "unknown"
  
  const ruleEngineVariant = mapCardVariantToFinish(variant)
  const flag = card.variantAnalysis.variants[ruleEngineVariant]
  
  return flag?.confidence || "unknown"
}

// Update button rendering to show confidence
<button
  key={variant}
  className={`variant-btn ${getVariantClass(variant)} ${isActive ? 'active' : ''} ${loading ? 'loading' : ''}`}
  onClick={(e) => handleVariantClick(e, variant)}
  onContextMenu={(e) => handleVariantRightClick(e, variant)}
  disabled={loading}
  title={`${getVariantTitle(variant)} (${quantity}) - ${getVariantConfidence(card, variant)} confidence`}
  data-confidence={getVariantConfidence(card, variant)}
>
  {quantity > 0 ? quantity : null}
</button>
```

### 3. Card Details Modal Integration

**File:** `src/components/pokemon/CardDetailsModal.tsx`

#### New Variant Information Section

```typescript
// Add variant analysis display
const VariantAnalysisSection = ({ card }: { card: PokemonCard }) => {
  if (!card.variantAnalysis) return null
  
  const { variants, era, explanations } = card.variantAnalysis
  
  return (
    <div className="variant-analysis-section">
      <h3>Variant Analysis</h3>
      <div className="era-info">
        <span className="label">Era:</span>
        <span className="value">{era}</span>
      </div>
      
      <div className="variant-breakdown">
        {Object.entries(variants).map(([finish, flag]) => (
          <div key={finish} className={`variant-item ${flag.exists ? 'exists' : 'not-exists'}`}>
            <span className="finish-name">{formatFinishName(finish)}</span>
            <span className="status">{flag.exists ? '✓' : '✗'}</span>
            {flag.exists && (
              <span className="details">
                {flag.source} ({flag.confidence})
              </span>
            )}
          </div>
        ))}
      </div>
      
      <div className="explanations">
        <h4>Reasoning:</h4>
        <ul>
          {explanations.map((explanation, index) => (
            <li key={index}>{explanation}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

### 4. Pricing Display Integration

**File:** `src/components/PriceDisplay.tsx`

#### Variant-Aware Pricing

```typescript
// Update getCardPrice function in src/lib/price-utils.ts
export function getCardPrice(
  cardData: CardPriceData, 
  preferredSource: string,
  variant?: CardVariant
): { amount: number; currency: string } | null {
  
  // Existing logic for getting base price
  const basePrice = getBasePriceBySource(cardData, preferredSource)
  
  // NEW: Apply variant-specific pricing if available
  if (variant && cardData.variantAnalysis) {
    return getVariantSpecificPrice(cardData, variant, preferredSource)
  }
  
  return basePrice
}

function getVariantSpecificPrice(
  cardData: CardPriceData,
  variant: CardVariant, 
  source: string
): { amount: number; currency: string } | null {
  
  switch (variant) {
    case 'normal':
      return source === 'CardMarket' 
        ? { amount: cardData.cardmarket_avg_sell_price || 0, currency: 'EUR' }
        : { amount: cardData.tcgplayer_normal_market || 0, currency: 'USD' }
        
    case 'holo':
      return source === 'CardMarket'
        ? { amount: cardData.cardmarket_avg_sell_price || 0, currency: 'EUR' }
        : { amount: cardData.tcgplayer_holofoil_market || 0, currency: 'USD' }
        
    case 'reverse_holo':
      return source === 'CardMarket'
        ? { amount: cardData.cardmarket_reverse_holo_sell || 0, currency: 'EUR' }
        : { amount: cardData.tcgplayer_reverse_holo_market || 0, currency: 'USD' }
        
    case '1st_edition':
      return source === 'CardMarket'
        ? null // CardMarket doesn't distinguish 1st edition typically
        : { amount: cardData.tcgplayer_1st_edition_normal_market || cardData.tcgplayer_1st_edition_holofoil_market || 0, currency: 'USD' }
        
    default:
      return null
  }
}
```

### 5. Collection Value Calculations

**File:** `src/lib/collection-stats-service.ts`

#### Variant-Aware Collection Value

```typescript
// Update collection value calculation
export function calculateCollectionValue(
  collectionItems: UserCollectionEntry[],
  cardData: Map<string, PokemonCard>
): number {
  
  let totalValue = 0
  
  collectionItems.forEach(item => {
    const card = cardData.get(item.card_id)
    if (!card) return
    
    // Calculate value for each variant separately
    const variantQuantities = getVariantQuantities(item)
    
    Object.entries(variantQuantities).forEach(([variant, quantity]) => {
      if (quantity > 0) {
        const variantPrice = getVariantSpecificPrice(card, variant as CardVariant, 'CardMarket')
        if (variantPrice) {
          totalValue += variantPrice.amount * quantity
        }
      }
    })
  })
  
  return totalValue
}

function getVariantQuantities(item: UserCollectionEntry): Record<CardVariant, number> {
  return {
    normal: item.normal || 0,
    holo: item.holo || 0,
    reverse_holo: item.reverseHolo || 0,
    pokeball_pattern: item.pokeballPattern || 0,
    masterball_pattern: item.masterballPattern || 0,
    '1st_edition': item.firstEdition || 0
  }
}
```

### 6. Data Migration Strategy

#### Database Schema Updates

```sql
-- Add variant analysis column to cards table
ALTER TABLE cards ADD COLUMN variant_analysis JSONB;

-- Add index for variant analysis queries
CREATE INDEX idx_cards_variant_analysis ON cards USING GIN (variant_analysis);

-- Update existing cards with variant analysis
UPDATE cards 
SET variant_analysis = NULL -- Will be populated by background job
WHERE variant_analysis IS NULL;
```

#### Background Migration Job

```typescript
// scripts/migrate-variant-analysis.ts
export async function migrateVariantAnalysis() {
  const { data: cards } = await supabase
    .from('cards')
    .select('*')
    .is('variant_analysis', null)
    .limit(1000)
  
  for (const card of cards) {
    try {
      const apiCard = transformToApiFormat(card)
      const variantAnalysis = inferVariants(apiCard)
      
      await supabase
        .from('cards')
        .update({ variant_analysis: variantAnalysis })
        .eq('id', card.id)
        
    } catch (error) {
      console.error(`Failed to migrate card ${card.id}:`, error)
    }
  }
}
```

### 7. API Endpoint Updates

#### Cards API Integration

```typescript
// src/app/api/cards/[id]/route.ts
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { data: card } = await supabase
    .from('cards')
    .select(`
      *,
      sets!inner(*)
    `)
    .eq('id', params.id)
    .single()
  
  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }
  
  // If variant analysis is missing, generate it
  if (!card.variant_analysis) {
    const apiCard = transformToApiFormat(card)
    card.variant_analysis = inferVariants(apiCard)
    
    // Update database with new analysis (background)
    supabase
      .from('cards')
      .update({ variant_analysis: card.variant_analysis })
      .eq('id', card.id)
      .then() // Fire and forget
  }
  
  return NextResponse.json({ data: card })
}
```

### 8. Performance Optimizations

#### Caching Strategy

```typescript
// src/lib/variant-rule-engine/cache.ts
class VariantAnalysisCache {
  private cache = new Map<string, VariantResult>()
  private readonly TTL = 24 * 60 * 60 * 1000 // 24 hours
  
  get(cardId: string, cardHash: string): VariantResult | null {
    const key = `${cardId}-${cardHash}`
    const cached = this.cache.get(key)
    
    if (cached && this.isValid(cached)) {
      return cached
    }
    
    this.cache.delete(key)
    return null
  }
  
  set(cardId: string, cardHash: string, analysis: VariantResult): void {
    const key = `${cardId}-${cardHash}`
    this.cache.set(key, {
      ...analysis,
      _cached_at: Date.now()
    })
  }
  
  private isValid(analysis: any): boolean {
    return Date.now() - analysis._cached_at < this.TTL
  }
}

export const variantCache = new VariantAnalysisCache()
```

#### Batch Processing

```typescript
// src/lib/variant-rule-engine/batch.ts
export function inferVariantsBatch(
  cards: CardInput[],
  productSourcesMap?: Map<string, string[]>
): Map<string, VariantResult> {
  
  const results = new Map<string, VariantResult>()
  
  // Group cards by era for optimized processing
  const cardsByEra = groupCardsByEra(cards)
  
  Object.entries(cardsByEra).forEach(([era, eraCards]) => {
    eraCards.forEach(card => {
      const productSources = productSourcesMap?.get(card.id)
      const analysis = inferVariants(card, productSources)
      results.set(card.id, analysis)
    })
  })
  
  return results
}
```

### 9. Error Handling and Fallbacks

#### Graceful Degradation

```typescript
// Wrap variant analysis calls in try-catch
function safeInferVariants(card: CardInput, productSources?: string[]): VariantResult | null {
  try {
    return inferVariants(card, productSources)
  } catch (error) {
    console.error('Variant analysis failed for card:', card.id, error)
    
    // Log error for monitoring
    logVariantAnalysisError(card, error)
    
    // Return null to fall back to existing logic
    return null
  }
}

// Update existing components to handle missing analysis
const availableVariants = card.variantAnalysis 
  ? mapToCardVariants(card.variantAnalysis)
  : getAvailableVariantsLegacy(card)
```

### 10. Monitoring and Analytics

#### Usage Tracking

```typescript
// Track variant analysis usage and accuracy
export function trackVariantAnalysis(analysis: VariantResult) {
  // Send to analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'variant_analysis', {
      era: analysis.era,
      variant_count: Object.values(analysis.variants).filter(v => v.exists).length,
      has_api_signals: Object.values(analysis.variants).some(v => v.source === 'api'),
      confidence_level: getMostCommonConfidence(analysis.variants)
    })
  }
}
```

This integration guide provides a comprehensive roadmap for implementing the variant rule engine while maintaining backward compatibility and ensuring smooth migration.