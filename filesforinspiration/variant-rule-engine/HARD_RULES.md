# Hard Rules - API Signal Detection

## Overview

Hard rules have the highest precedence in the variant rule engine. They detect variant existence based on explicit API signals (primarily TCGPlayer pricing data presence). When these signals exist, they override all other rule logic.

## Rule Priority

**Highest Precedence**: Hard Rules > Era Rules > Override Rules > Fallbacks

## API Signal Detection Rules

### TCGPlayer Pricing Signals

The presence of pricing keys in `tcgplayer.prices` definitively indicates that variant exists:

```typescript
const TCGPLAYER_VARIANT_MAPPING = {
  // Standard variants
  "normal": ["normal"],
  "holo": ["holofoil"],
  "reverse": ["reverseHolofoil"],
  
  // 1st Edition variants  
  "firstEdNormal": ["1stEditionNormal"],
  "firstEdHolo": ["1stEditionHolofoil"],
  
  // Alternative/legacy keys
  "normal": ["unlimited", "unlimitedNormal"],
  "holo": ["unlimitedHolofoil"]
} as const
```

### Hard Rule Logic

```typescript
function applyHardRules(card: CardInput): Partial<VariantResult["variants"]> {
  const variants: Partial<VariantResult["variants"]> = {}
  const tcgPrices = card.tcgplayer?.prices || {}
  
  // Check each potential variant
  Object.keys(TCGPLAYER_VARIANT_MAPPING).forEach(finish => {
    const priceKeys = TCGPLAYER_VARIANT_MAPPING[finish as Finish]
    const hasApiSignal = priceKeys.some(key => tcgPrices[key] !== undefined)
    
    if (hasApiSignal) {
      variants[finish as Finish] = {
        exists: true,
        source: "api",
        confidence: "high"
      }
    }
  })
  
  return variants
}
```

## Specific Detection Rules

### Normal Variant Detection

**API Keys**: `normal`, `unlimited`, `unlimitedNormal`

```typescript
function detectNormalVariant(tcgPrices: any): VariantFlag | undefined {
  const normalKeys = ["normal", "unlimited", "unlimitedNormal"]
  const hasNormal = normalKeys.some(key => tcgPrices[key] !== undefined)
  
  if (hasNormal) {
    return {
      exists: true,
      source: "api", 
      confidence: "high"
    }
  }
  
  return undefined
}
```

### Holo Variant Detection

**API Keys**: `holofoil`, `unlimitedHolofoil`

```typescript
function detectHoloVariant(tcgPrices: any): VariantFlag | undefined {
  const holoKeys = ["holofoil", "unlimitedHolofoil"]
  const hasHolo = holoKeys.some(key => tcgPrices[key] !== undefined)
  
  if (hasHolo) {
    return {
      exists: true,
      source: "api",
      confidence: "high"
    }
  }
  
  return undefined
}
```

### Reverse Holo Variant Detection

**API Keys**: `reverseHolofoil`

```typescript
function detectReverseVariant(tcgPrices: any): VariantFlag | undefined {
  if (tcgPrices.reverseHolofoil !== undefined) {
    return {
      exists: true,
      source: "api",
      confidence: "high"
    }
  }
  
  return undefined
}
```

### 1st Edition Detection

**API Keys**: `1stEditionNormal`, `1stEditionHolofoil`

```typescript
function detect1stEditionVariants(tcgPrices: any): {
  firstEdNormal?: VariantFlag
  firstEdHolo?: VariantFlag
} {
  const variants: any = {}
  
  if (tcgPrices["1stEditionNormal"] !== undefined) {
    variants.firstEdNormal = {
      exists: true,
      source: "api",
      confidence: "high"
    }
  }
  
  if (tcgPrices["1stEditionHolofoil"] !== undefined) {
    variants.firstEdHolo = {
      exists: true,
      source: "api", 
      confidence: "high"
    }
  }
  
  return variants
}
```

## Edge Cases and Special Handling

### Empty Price Objects

Sometimes TCGPlayer includes empty price objects that shouldn't count as signals:

```typescript
function isValidPriceSignal(priceObj: any): boolean {
  if (!priceObj) return false
  
  // Consider it valid if it's an object (even if empty)
  // The presence of the key indicates variant availability
  return typeof priceObj === 'object'
}
```

### Legacy Price Key Handling

Older cards might use different key naming:

```typescript
const LEGACY_PRICE_KEYS = {
  // Old TCGPlayer format
  "unlimited": "normal",
  "1stEdition": "firstEdNormal",
  "1stEditionHolo": "firstEdHolo"
}

function normalizePriceKeys(tcgPrices: any): any {
  const normalized = { ...tcgPrices }
  
  Object.entries(LEGACY_PRICE_KEYS).forEach(([oldKey, newKey]) => {
    if (normalized[oldKey] !== undefined && normalized[newKey] === undefined) {
      normalized[newKey] = normalized[oldKey]
    }
  })
  
  return normalized
}
```

### Multiple API Sources (Future Enhancement)

While currently focused on TCGPlayer, the system can be extended for other sources:

```typescript
interface ApiSources {
  tcgplayer?: any
  cardmarket?: any
  ebay?: any
}

function detectApiSignals(sources: ApiSources): Partial<VariantResult["variants"]> {
  let variants: Partial<VariantResult["variants"]> = {}
  
  // TCGPlayer (primary source)
  if (sources.tcgplayer?.prices) {
    const tcgVariants = applyTCGPlayerRules(sources.tcgplayer.prices)
    variants = { ...variants, ...tcgVariants }
  }
  
  // Future: CardMarket signals
  if (sources.cardmarket?.prices) {
    const cmVariants = applyCardMarketRules(sources.cardmarket.prices)
    // Merge with existing, preferring TCGPlayer when conflicts
    variants = mergeVariantSources(variants, cmVariants, "tcgplayer")
  }
  
  return variants
}
```

## Conflict Resolution

When multiple API sources provide conflicting information:

### Priority Order
1. **TCGPlayer** (Primary - most reliable for English cards)
2. **CardMarket** (Secondary - European focus)
3. **Other sources** (Tertiary)

### Confidence Adjustment
```typescript
function resolveApiConflicts(
  primary: VariantFlag, 
  secondary: VariantFlag
): VariantFlag {
  // If both agree, maintain high confidence
  if (primary.exists === secondary.exists) {
    return primary
  }
  
  // If conflict, prefer primary but reduce confidence
  return {
    ...primary,
    confidence: "medium"
  }
}
```

## Validation and Quality Checks

### Signal Validation

```typescript
function validateApiSignals(card: CardInput): string[] {
  const warnings: string[] = []
  const tcgPrices = card.tcgplayer?.prices || {}
  
  // Check for suspicious combinations
  if (tcgPrices.holofoil && tcgPrices.normal && card.rarity === "Common") {
    warnings.push("Common card with both normal and holo pricing - unusual")
  }
  
  if (tcgPrices["1stEditionNormal"] && !is1stEditionSet(card.set)) {
    warnings.push("1st Edition pricing on non-1st Edition set")
  }
  
  return warnings
}
```

### Data Quality Indicators

```typescript
function getSignalQuality(priceObj: any): "high" | "medium" | "low" {
  if (!priceObj) return "low"
  
  // Check if price object has actual price data
  const hasMarketPrice = priceObj.market !== undefined
  const hasLowPrice = priceObj.low !== undefined
  const hasMidPrice = priceObj.mid !== undefined
  
  if (hasMarketPrice && hasLowPrice && hasMidPrice) return "high"
  if (hasMarketPrice || hasLowPrice) return "medium"
  return "low"
}
```

## Testing Hard Rules

### Unit Tests

```typescript
describe('Hard Rules - API Signal Detection', () => {
  test('should detect normal variant from tcgplayer.prices.normal', () => {
    const card = createTestCard({
      tcgplayer: { prices: { normal: { market: 1.50 } } }
    })
    
    const result = applyHardRules(card)
    expect(result.normal).toEqual({
      exists: true,
      source: "api",
      confidence: "high"
    })
  })
  
  test('should detect holo variant from tcgplayer.prices.holofoil', () => {
    const card = createTestCard({
      tcgplayer: { prices: { holofoil: { market: 5.00 } } }
    })
    
    const result = applyHardRules(card)
    expect(result.holo).toEqual({
      exists: true,
      source: "api", 
      confidence: "high"
    })
  })
  
  test('should detect reverse holo from tcgplayer.prices.reverseHolofoil', () => {
    const card = createTestCard({
      tcgplayer: { prices: { reverseHolofoil: { market: 3.00 } } }
    })
    
    const result = applyHardRules(card)
    expect(result.reverse).toEqual({
      exists: true,
      source: "api",
      confidence: "high"
    })
  })
})
```

### Integration Tests

```typescript
describe('Hard Rules Integration', () => {
  test('should override era rules when API signals present', () => {
    // S&V rare would normally be holo-only by era rules
    // But API shows normal variant exists
    const card = createTestCard({
      rarity: "Rare",
      set: { series: "Scarlet & Violet" },
      tcgplayer: { prices: { normal: {}, reverseHolofoil: {} } }
    })
    
    const result = inferVariants(card)
    
    // API signals should override era rules
    expect(result.variants.normal.source).toBe("api")
    expect(result.variants.reverse.source).toBe("api")
  })
})
```

## Performance Considerations

### Efficient Signal Detection

```typescript
function quickSignalCheck(tcgPrices: any): boolean {
  // Fast check if any signals exist before detailed processing
  const knownKeys = ["normal", "holofoil", "reverseHolofoil", "1stEditionNormal", "1stEditionHolofoil"]
  return knownKeys.some(key => tcgPrices[key] !== undefined)
}
```

### Memoization for Repeated Cards

```typescript
const apiSignalCache = new Map<string, Partial<VariantResult["variants"]>>()

function getCachedApiSignals(cardId: string, tcgPrices: any): Partial<VariantResult["variants"]> | null {
  const cacheKey = `${cardId}-${JSON.stringify(Object.keys(tcgPrices).sort())}`
  return apiSignalCache.get(cacheKey) || null
}
```

Hard rules provide the foundation of truth for the variant rule engine, ensuring that when explicit API data is available, it takes precedence over all inference logic.