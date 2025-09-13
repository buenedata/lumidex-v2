# Pokémon TCG Variant Rule Engine

## Overview

A deterministic rule engine that infers which card finishes/variants exist for each Pokémon TCG card when the API lacks explicit data. This engine drives UI rendering, pricing calculations, and collection management.

## Architecture

### Core Components

1. **Rule Engine Core** (`inferVariants.ts`)
   - Pure function: `inferVariants(card, productSources?) -> VariantResult`
   - 100% deterministic, no randomness
   - Prioritized rule application (Hard Rules → Era Rules → Fallbacks)

2. **Era Detection** (`era-mapping.ts`)
   - Maps set.series and releaseDate to Pokemon eras
   - Supports: WotC, EX, DP, HGSS, Black & White, XY, Sun & Moon, Sword & Shield, Scarlet & Violet

3. **Hard Rules** (`hard-rules.ts`)
   - Highest precedence: TCGPlayer pricing signals
   - API presence = variant exists (source: "api", confidence: "high")

4. **Era Rules** (`era-rules.ts`)
   - Fallback logic based on era + rarity patterns
   - Set-specific behaviors (Legendary Collection reverse, S&V single-star rares)

5. **Override System** (`override-rules.ts`)
   - Product source exceptions (Theme Deck non-holo variants, etc.)
   - Manual corrections for known edge cases

## Data Flow

```
Pokemon TCG API Card Input
         ↓
    Era Detection
         ↓
    Hard Rules (API Signals)
         ↓
    Era Rules (Fallback Logic)
         ↓
    Override Rules (Exceptions)
         ↓
    VariantResult Output
```

## TypeScript Interfaces

### Core Types

```typescript
export type Finish = "normal" | "holo" | "reverse" | "firstEdNormal" | "firstEdHolo"
export type Source = "api" | "rule" | "override"
export type Confidence = "high" | "medium" | "low"
export type Era = "WotC"|"EX"|"DP"|"HGSS"|"Black & White"|"XY"|"Sun & Moon"|"Sword & Shield"|"Scarlet & Violet"

export interface VariantFlag {
  exists: boolean
  source?: Source
  confidence?: Confidence
}

export interface VariantResult {
  id: string
  setId: string
  era: Era
  rarity: string
  variants: Record<Finish, VariantFlag>
  printSources: string[]
  explanations: string[]
}
```

### Input Types

```typescript
export interface TCGPlayerPrices {
  normal?: any
  holofoil?: any
  reverseHolofoil?: any
  "1stEditionNormal"?: any
  "1stEditionHolofoil"?: any
}

export interface CardInput {
  id: string
  name: string
  number: string
  rarity: string
  set: {
    id: string
    series: string
    releaseDate: string
  }
  tcgplayer?: {
    prices?: TCGPlayerPrices
  }
}
```

## Rule Precedence

1. **Hard Rules** (Highest Priority)
   - TCGPlayer price presence = variant exists
   - Source: "api", Confidence: "high"

2. **Era Rules** (Medium Priority)
   - Scarlet & Violet: Single-star Rares are holo by default + reverse
   - Legendary Collection+: Reverse holo exists by default
   - Pre-S&V: "Rare Holo" = holo+reverse, "Rare" = normal+reverse
   - Source: "rule", Confidence: "medium"

3. **Override Rules** (Exception Handling)
   - Theme Deck non-holo variants of holo cards
   - Known product source exceptions
   - Source: "override", Confidence varies

## Era Mapping Strategy

### By Set Series
- "Sword & Shield" → "Sword & Shield"
- "Scarlet & Violet" → "Scarlet & Violet"
- "Sun & Moon" → "Sun & Moon"

### By Release Date (Fallback)
- 2025+ → "Scarlet & Violet"
- 2019-2024 → "Sword & Shield"
- 2017-2019 → "Sun & Moon"
- etc.

### Special Cases
- Legendary Collection (2002) → Enable reverse holo default
- WotC Base-Neo → Enable 1st Edition variants

## Integration Points

### 1. Transform Card Data
```typescript
// In pokemon-tcg-api.ts transformCardData()
const variantResult = inferVariants(apiCard, productSources)
cardData.availableVariants = Object.keys(variantResult.variants)
  .filter(variant => variantResult.variants[variant].exists)
```

### 2. UI Component Usage
```typescript
// In CollectionButtons.tsx
const availableVariants = card.variantAnalysis?.variants || getAvailableVariants(card)
```

### 3. Pricing Calculations
```typescript
// Variant-aware pricing
function getVariantPrice(card: PokemonCard, variant: CardVariant): number {
  const analysis = card.variantAnalysis
  if (analysis?.variants[variant]?.exists) {
    return getVariantSpecificPrice(card, variant)
  }
  return 0
}
```

## Testing Strategy

### Contract Tests
1. **Vivid Voltage Clefable Test**
   - Input: `{id:"swsh4-082", rarity:"Rare", tcgplayer:{prices:{normal:{}, reverseHolofoil:{}}}}`
   - Expected: `{normal: true, reverse: true, holo: false}`

2. **S&V Base Rare Test**
   - Input: Any S&V single-star rare without API signals
   - Expected: `{holo: true, reverse: true, normal: false}`

3. **WotC Theme Deck Override**
   - Input: Holo card with productSources: ["Theme Deck"]
   - Expected: Normal variant added with source: "override"

### Edge Cases
- Cards with no pricing data
- Unknown eras/sets
- Conflicting API signals
- Missing productSources

## File Structure

```
src/lib/variant-rule-engine/
├── README.md                 # This document
├── types.ts                  # TypeScript interfaces
├── inferVariants.ts          # Main engine function
├── era-mapping.ts            # Era detection logic
├── hard-rules.ts             # API signal rules
├── era-rules.ts              # Era-based fallback rules
├── override-rules.ts         # Exception handling
├── utils.ts                  # Helper utilities
├── __tests__/
│   ├── inferVariants.test.ts # Core engine tests
│   ├── contract-tests.ts     # Contract validation
│   └── edge-cases.test.ts    # Edge case handling
└── examples/
    ├── basic-usage.md        # Simple examples
    └── advanced-usage.md     # Complex scenarios
```

## Migration Strategy

### Phase 1: Core Engine
1. Create variant rule engine with basic era detection
2. Implement hard rules (API signals)
3. Add era-based fallback rules
4. Create comprehensive tests

### Phase 2: Integration
1. Integrate into transformCardData function
2. Update existing variant detection to use new engine
3. Add variant analysis to card data structure
4. Test with existing UI components

### Phase 3: Enhancement
1. Add override system for exceptions
2. Implement variant-aware pricing
3. Create utility functions for common operations
4. Add comprehensive documentation and examples

### Phase 4: Optimization
1. Performance optimization
2. Extended era support
3. Advanced variant detection
4. Analytics and monitoring

## Benefits

1. **Deterministic**: Same input always produces same output
2. **Maintainable**: Clear rule hierarchy and separation of concerns
3. **Extensible**: Easy to add new eras, rules, or exceptions
4. **Testable**: Pure functions with comprehensive test coverage
5. **Integrated**: Seamlessly works with existing UI and pricing systems
6. **Documented**: Clear explanations for each decision made

## Next Steps

1. Create TypeScript interfaces and types
2. Implement era detection and mapping
3. Build hard rules for API signal detection
4. Add era-based inference rules
5. Create override system for exceptions
6. Integrate with existing transformCardData function
7. Update UI components to use new variant data
8. Add comprehensive testing and documentation