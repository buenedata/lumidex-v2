# Era-Based Variant Inference Rules

## Overview

Era rules provide fallback logic when hard API signals are missing. These rules apply era-specific patterns and rarity-based conventions to infer which variants should exist for a card.

## Rule Precedence

**Medium Priority**: Hard Rules > **Era Rules** > Override Rules > Fallbacks

Era rules only apply when hard rules haven't already determined a variant's existence.

## Era-Specific Rule Sets

### Scarlet & Violet Era (2023-Present)

#### Single-Star Rare Revolution
- **Key Change**: Single-star "Rare" cards are holo by default
- **No normal variants** in booster packs for single-star rares
- **Always includes reverse holo** unless API contradicts

```typescript
function applyScarletVioletRules(card: CardInput): Partial<VariantResult["variants"]> {
  const variants: Partial<VariantResult["variants"]> = {}
  
  if (card.rarity === "Rare") {
    // Single-star rares are holo by default, no normal in boosters
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.reverse = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "high" }
  } else if (card.rarity === "Rare Holo") {
    // Traditional holo rares
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.reverse = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "high" }
  } else if (["Common", "Uncommon"].includes(card.rarity)) {
    // Commons/Uncommons follow traditional patterns
    variants.normal = { exists: true, source: "rule", confidence: "medium" }
    variants.reverse = { exists: true, source: "rule", confidence: "medium" }
    variants.holo = { exists: false, source: "rule", confidence: "high" }
  } else if (isUltraRare(card.rarity)) {
    // Ultra rares (ex, Special Illustration, etc.)
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "high" }
    variants.reverse = { exists: false, source: "rule", confidence: "medium" }
  }
  
  return variants
}
```

### Sword & Shield Era (2020-2022)

#### Traditional Rare vs Rare Holo Distinction

```typescript
function applySwordShieldRules(card: CardInput): Partial<VariantResult["variants"]> {
  const variants: Partial<VariantResult["variants"]> = {}
  
  if (card.rarity === "Rare") {
    // Non-holo rares: normal + reverse, no holo in boosters
    variants.normal = { exists: true, source: "rule", confidence: "medium" }
    variants.reverse = { exists: true, source: "rule", confidence: "medium" }
    variants.holo = { exists: false, source: "rule", confidence: "high" }
  } else if (card.rarity === "Rare Holo") {
    // Holo rares: holo + reverse, no normal in boosters
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.reverse = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "high" }
  } else if (["Common", "Uncommon"].includes(card.rarity)) {
    variants.normal = { exists: true, source: "rule", confidence: "medium" }
    variants.reverse = { exists: true, source: "rule", confidence: "medium" }
    variants.holo = { exists: false, source: "rule", confidence: "high" }
  } else if (isUltraRare(card.rarity)) {
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "high" }
    variants.reverse = { exists: false, source: "rule", confidence: "medium" }
  }
  
  return variants
}
```

### Sun & Moon Era (2017-2019)

#### Similar to Sword & Shield but with GX specifics

```typescript
function applySunMoonRules(card: CardInput): Partial<VariantResult["variants"]> {
  // Very similar to Sword & Shield rules
  const variants = applySwordShieldRules(card)
  
  // GX cards are always holo, no reverse
  if (card.rarity.includes("GX")) {
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "high" }
    variants.reverse = { exists: false, source: "rule", confidence: "medium" }
  }
  
  return variants
}
```

### XY Era (2014-2016)

#### Mega Evolution and Break cards

```typescript
function applyXYRules(card: CardInput): Partial<VariantResult["variants"]> {
  const variants = applySwordShieldRules(card) // Base on S&S patterns
  
  // Mega Evolution cards
  if (card.name.includes("M ") || card.rarity.includes("Mega")) {
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "high" }
    variants.reverse = { exists: false, source: "rule", confidence: "medium" }
  }
  
  // Break cards
  if (card.rarity.includes("BREAK")) {
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "high" }
    variants.reverse = { exists: false, source: "rule", confidence: "medium" }
  }
  
  return variants
}
```

### Black & White Era (2011-2013)

#### EX cards return

```typescript
function applyBlackWhiteRules(card: CardInput): Partial<VariantResult["variants"]> {
  const variants = applySwordShieldRules(card) // Base patterns
  
  // EX cards are always holo
  if (card.rarity.includes("EX")) {
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "high" }
    variants.reverse = { exists: false, source: "rule", confidence: "medium" }
  }
  
  return variants
}
```

### HGSS Era (2010-2011)

#### LEGEND and Prime cards

```typescript
function applyHGSSRules(card: CardInput): Partial<VariantResult["variants"]> {
  const variants = applySwordShieldRules(card) // Base patterns
  
  // LEGEND cards (two-card sets)
  if (card.rarity.includes("LEGEND")) {
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "high" }
    variants.reverse = { exists: false, source: "rule", confidence: "medium" }
  }
  
  // Prime cards
  if (card.name.includes(" Prime") || card.rarity.includes("Prime")) {
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "high" }
    variants.reverse = { exists: false, source: "rule", confidence: "medium" }
  }
  
  return variants
}
```

### DP Era (2007-2009)

#### LV.X cards

```typescript
function applyDPRules(card: CardInput): Partial<VariantResult["variants"]> {
  const variants = applySwordShieldRules(card) // Base patterns
  
  // LV.X cards
  if (card.name.includes(" LV.X") || card.rarity.includes("LV.X")) {
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "high" }
    variants.reverse = { exists: false, source: "rule", confidence: "medium" }
  }
  
  return variants
}
```

### EX Era (2003-2007)

#### ex cards and consistent reverse holo

```typescript
function applyEXRules(card: CardInput): Partial<VariantResult["variants"]> {
  const variants = applySwordShieldRules(card) // Base patterns
  
  // ex cards (lowercase)
  if (card.name.includes(" ex") || card.rarity.includes("ex")) {
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "high" }
    variants.reverse = { exists: false, source: "rule", confidence: "medium" }
  }
  
  // No 1st Edition in EX era
  variants.firstEdNormal = { exists: false, source: "rule", confidence: "high" }
  variants.firstEdHolo = { exists: false, source: "rule", confidence: "high" }
  
  return variants
}
```

### WotC Era (1998-2003)

#### Most complex due to evolution of printing

```typescript
function applyWotCRules(card: CardInput, releaseDate: string): Partial<VariantResult["variants"]> {
  const variants: Partial<VariantResult["variants"]> = {}
  
  // 1st Edition availability for most WotC sets
  if (is1stEditionSet(card.set.id)) {
    if (card.rarity === "Rare" || card.rarity === "Rare Holo") {
      variants.firstEdHolo = { exists: true, source: "rule", confidence: "medium" }
    }
    if (card.rarity === "Rare") {
      variants.firstEdNormal = { exists: true, source: "rule", confidence: "medium" }
    }
    if (["Common", "Uncommon"].includes(card.rarity)) {
      variants.firstEdNormal = { exists: true, source: "rule", confidence: "medium" }
    }
  }
  
  // Reverse holo introduced with Legendary Collection (2002)
  const hasReverseHolo = hasReverseHoloDefault(card.era, releaseDate)
  if (hasReverseHolo && !isSecretRare(card.rarity)) {
    variants.reverse = { exists: true, source: "rule", confidence: "medium" }
  } else {
    variants.reverse = { exists: false, source: "rule", confidence: "high" }
  }
  
  // Standard WotC patterns
  if (card.rarity === "Rare") {
    variants.normal = { exists: true, source: "rule", confidence: "medium" }
    variants.holo = { exists: false, source: "rule", confidence: "medium" }
  } else if (card.rarity === "Rare Holo") {
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "medium" }
  } else if (["Common", "Uncommon"].includes(card.rarity)) {
    variants.normal = { exists: true, source: "rule", confidence: "medium" }
    variants.holo = { exists: false, source: "rule", confidence: "high" }
  }
  
  return variants
}
```

## Era Rule Application Logic

### Main Era Rule Function

```typescript
function applyEraRules(card: CardInput, era: Era): Partial<VariantResult["variants"]> {
  switch (era) {
    case "Scarlet & Violet":
      return applyScarletVioletRules(card)
    case "Sword & Shield":
      return applySwordShieldRules(card)
    case "Sun & Moon":
      return applySunMoonRules(card)
    case "XY":
      return applyXYRules(card)
    case "Black & White":
      return applyBlackWhiteRules(card)
    case "HGSS":
      return applyHGSSRules(card)
    case "DP":
      return applyDPRules(card)
    case "EX":
      return applyEXRules(card)
    case "WotC":
      return applyWotCRules(card, card.set.releaseDate)
    default:
      return applyFallbackRules(card)
  }
}
```

### Fallback Rules for Unknown Eras

```typescript
function applyFallbackRules(card: CardInput): Partial<VariantResult["variants"]> {
  const variants: Partial<VariantResult["variants"]> = {}
  
  // Conservative fallback based on release date
  const releaseYear = new Date(card.set.releaseDate).getFullYear()
  
  if (releaseYear >= 2020) {
    // Modern era: assume S&S-style rules
    return applySwordShieldRules(card)
  } else if (releaseYear >= 2003) {
    // Post-WotC: assume reverse holo exists, no 1st edition
    variants.reverse = { exists: true, source: "rule", confidence: "low" }
    variants.firstEdNormal = { exists: false, source: "rule", confidence: "medium" }
    variants.firstEdHolo = { exists: false, source: "rule", confidence: "medium" }
  } else {
    // Early era: conservative WotC-style
    variants.reverse = { exists: false, source: "rule", confidence: "low" }
  }
  
  // Basic rarity patterns
  if (["Common", "Uncommon"].includes(card.rarity)) {
    variants.normal = { exists: true, source: "rule", confidence: "low" }
    variants.holo = { exists: false, source: "rule", confidence: "medium" }
  } else if (card.rarity === "Rare") {
    variants.normal = { exists: true, source: "rule", confidence: "low" }
    variants.holo = { exists: false, source: "rule", confidence: "low" }
  } else if (card.rarity === "Rare Holo") {
    variants.holo = { exists: true, source: "rule", confidence: "low" }
    variants.normal = { exists: false, source: "rule", confidence: "low" }
  }
  
  return variants
}
```

## Utility Functions

### Rarity Classification

```typescript
function isUltraRare(rarity: string): boolean {
  const ultraRarePatterns = [
    "EX", "GX", "V", "VMAX", "VSTAR", "ex", 
    "Secret", "Gold", "Rainbow", "Special Illustration",
    "Illustration Rare", "Full Art", "Alt Art"
  ]
  
  return ultraRarePatterns.some(pattern => 
    rarity.includes(pattern)
  )
}

function isSecretRare(rarity: string): boolean {
  const secretPatterns = ["Secret", "Gold", "Rainbow"]
  return secretPatterns.some(pattern => rarity.includes(pattern))
}

function is1stEditionSet(setId: string): boolean {
  const firstEditionSets = [
    "base1", "base2", "base3", "base4", "base5",
    "gym1", "gym2", "neo1", "neo2", "neo3", "neo4",
    "ecard1", "ecard2", "ecard3"
  ]
  
  return firstEditionSets.includes(setId.toLowerCase())
}
```

### Era Rule Confidence

```typescript
function adjustEraRuleConfidence(
  baseConfidence: Confidence,
  era: Era,
  rarity: string
): Confidence {
  // Higher confidence for well-established patterns
  if (era === "Scarlet & Violet" && rarity === "Rare") {
    return "high" // S&V single-star rare rules are very consistent
  }
  
  if (era === "WotC" && rarity.includes("Holo")) {
    return "medium" // WotC holo patterns are fairly consistent
  }
  
  // Lower confidence for transitional periods
  if (era === "EX" && rarity === "Rare") {
    return "low" // Early EX era had some variations
  }
  
  return baseConfidence
}
```

## Rule Merge Strategy

Era rules must be merged with any existing hard rule results:

```typescript
function mergeEraRules(
  hardRuleVariants: Partial<VariantResult["variants"]>,
  eraRuleVariants: Partial<VariantResult["variants"]>
): VariantResult["variants"] {
  const merged: VariantResult["variants"] = {
    normal: { exists: false },
    holo: { exists: false },
    reverse: { exists: false },
    firstEdNormal: { exists: false },
    firstEdHolo: { exists: false }
  }
  
  // Apply era rules first
  Object.keys(merged).forEach(finish => {
    const finishKey = finish as Finish
    if (eraRuleVariants[finishKey]) {
      merged[finishKey] = eraRuleVariants[finishKey]!
    }
  })
  
  // Hard rules override era rules
  Object.keys(merged).forEach(finish => {
    const finishKey = finish as Finish
    if (hardRuleVariants[finishKey]) {
      merged[finishKey] = hardRuleVariants[finishKey]!
    }
  })
  
  return merged
}
```

## Testing Era Rules

### Era-Specific Test Cases

```typescript
describe('Era Rules', () => {
  describe('Scarlet & Violet Era', () => {
    test('should make single-star rares holo by default', () => {
      const card = createTestCard({
        rarity: "Rare",
        set: { series: "Scarlet & Violet" }
      })
      
      const variants = applyScarletVioletRules(card)
      expect(variants.holo?.exists).toBe(true)
      expect(variants.normal?.exists).toBe(false)
      expect(variants.reverse?.exists).toBe(true)
    })
  })
  
  describe('Sword & Shield Era', () => {
    test('should distinguish Rare from Rare Holo', () => {
      const rareCard = createTestCard({
        rarity: "Rare",
        set: { series: "Sword & Shield" }
      })
      
      const variants = applySwordShieldRules(rareCard)
      expect(variants.normal?.exists).toBe(true)
      expect(variants.holo?.exists).toBe(false)
    })
  })
  
  describe('WotC Era', () => {
    test('should include 1st Edition for Base Set cards', () => {
      const card = createTestCard({
        rarity: "Rare Holo",
        set: { id: "base1", series: "Base" }
      })
      
      const variants = applyWotCRules(card, "1999/01/09")
      expect(variants.firstEdHolo?.exists).toBe(true)
    })
  })
})
```

Era rules provide the intelligent fallback system that captures decades of Pokemon TCG printing conventions and patterns.