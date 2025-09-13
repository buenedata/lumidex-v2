# Override Rules - Product Source Exceptions

## Overview

Override rules handle special cases and exceptions that don't follow normal era-based patterns. They have the lowest precedence but can add variants that wouldn't otherwise exist.

## Rule Precedence

**Lowest Priority**: Hard Rules > Era Rules > **Override Rules** > Fallbacks

Override rules typically **add** variants rather than remove them, working alongside hard and era rules.

## Product Source-Based Overrides

### Theme Deck Variants

Many holo cards were reprinted in non-holo form in Theme Decks, creating additional variants not available in booster packs.

```typescript
function applyThemeDeckOverrides(
  card: CardInput, 
  productSources: ProductSource,
  existingVariants: Partial<VariantResult["variants"]>
): Partial<VariantResult["variants"]> {
  
  if (!productSources.includes("Theme Deck")) {
    return {}
  }
  
  const overrides: Partial<VariantResult["variants"]> = {}
  
  // If card is normally holo-only, Theme Deck might have non-holo version
  if (existingVariants.holo?.exists && !existingVariants.normal?.exists) {
    const raritySupportsThemeDeck = [
      "Rare Holo", "Rare Holo EX", "Rare Holo GX", 
      "Rare Holo V", "Rare Holo VMAX"
    ].some(pattern => card.rarity.includes(pattern))
    
    if (raritySupportsThemeDeck) {
      overrides.normal = {
        exists: true,
        source: "override",
        confidence: "medium"
      }
    }
  }
  
  return overrides
}
```

### Promo/Tin Variants

Promotional sets often have unique variant distributions:

```typescript
function applyPromoOverrides(
  card: CardInput,
  productSources: ProductSource,
  existingVariants: Partial<VariantResult["variants"]>
): Partial<VariantResult["variants"]> {
  
  const promoSources = ["Promo/Tin", "Promo", "Tin", "Collection Box"]
  if (!promoSources.some(source => productSources.includes(source))) {
    return {}
  }
  
  const overrides: Partial<VariantResult["variants"]> = {}
  
  // Promo cards often come in special finishes
  if (card.rarity.includes("Promo")) {
    // Most promo cards are holo regardless of original rarity
    if (!existingVariants.holo?.exists) {
      overrides.holo = {
        exists: true,
        source: "override", 
        confidence: "low"
      }
    }
    
    // Promos typically don't have reverse holo
    if (existingVariants.reverse?.exists) {
      overrides.reverse = {
        exists: false,
        source: "override",
        confidence: "medium"
      }
    }
  }
  
  return overrides
}
```

### Starter Set/Deck Variants

```typescript
function applyStarterOverrides(
  card: CardInput,
  productSources: ProductSource
): Partial<VariantResult["variants"]> {
  
  const starterSources = ["Starter Deck", "Theme Deck", "Battle Deck"]
  if (!starterSources.some(source => productSources.includes(source))) {
    return {}
  }
  
  const overrides: Partial<VariantResult["variants"]> = {}
  
  // Starter decks typically have non-holo versions of most cards
  if (["Common", "Uncommon", "Rare"].includes(card.rarity)) {
    overrides.normal = {
      exists: true,
      source: "override",
      confidence: "medium"
    }
    
    // Usually no reverse holo in starter products
    overrides.reverse = {
      exists: false,
      source: "override", 
      confidence: "medium"
    }
  }
  
  return overrides
}
```

## Set-Specific Overrides

### Known Problematic Sets

Some sets have unusual variant patterns that need special handling:

```typescript
const SET_SPECIFIC_OVERRIDES: Record<string, (card: CardInput) => Partial<VariantResult["variants"]>> = {
  // Celebrations (25th Anniversary)
  "cel25": (card) => ({
    // Most cards are special reprints - typically holo only
    holo: card.rarity !== "Common" ? { exists: true, source: "override", confidence: "high" } : undefined,
    reverse: { exists: false, source: "override", confidence: "high" }, // No reverse in Celebrations
    normal: card.rarity === "Common" ? { exists: true, source: "override", confidence: "high" } : undefined
  }),
  
  // McDonald's 2019 (Sun & Moon era promo)
  "mcd19": (card) => ({
    normal: { exists: true, source: "override", confidence: "high" }, // All McDonald's cards are non-holo
    holo: { exists: false, source: "override", confidence: "high" },
    reverse: { exists: false, source: "override", confidence: "high" }
  }),
  
  // Hidden Fates (special subset rules)
  "sm115": (card) => {
    const cardNumber = parseInt(card.number.split('/')[0])
    if (cardNumber > 68) {
      // Shiny Vault cards - special rules
      return {
        holo: { exists: true, source: "override", confidence: "high" },
        normal: { exists: false, source: "override", confidence: "high" },
        reverse: { exists: false, source: "override", confidence: "high" }
      }
    }
    return {}
  },
  
  // Shining Legends
  "sm35": (card) => {
    if (card.name.includes("Shining ")) {
      return {
        holo: { exists: true, source: "override", confidence: "high" },
        normal: { exists: false, source: "override", confidence: "high" },
        reverse: { exists: false, source: "override", confidence: "high" }
      }
    }
    return {}
  }
}

function applySetSpecificOverrides(card: CardInput): Partial<VariantResult["variants"]> {
  const override = SET_SPECIFIC_OVERRIDES[card.set.id.toLowerCase()]
  return override ? override(card) : {}
}
```

### Japanese Set Adaptations

When English sets differ from their Japanese origins:

```typescript
function applyJapaneseAdaptationOverrides(card: CardInput): Partial<VariantResult["variants"]> {
  // Some Japanese exclusive variants don't exist in English
  const japaneseOnlyPatterns = [
    "Character Rare", "Character Super Rare", "Special Art Rare"
  ]
  
  if (japaneseOnlyPatterns.some(pattern => card.rarity.includes(pattern))) {
    return {
      // These rarities typically don't have English reverse holo
      reverse: { exists: false, source: "override", confidence: "medium" }
    }
  }
  
  return {}
}
```

## Error Correction Overrides

### Known API Data Issues

```typescript
const KNOWN_CORRECTIONS: Record<string, Partial<VariantResult["variants"]>> = {
  // Example: Specific card with known incorrect API data
  "sv3pt5-4": { // Charmander from 151 set
    normal: { exists: true, source: "override", confidence: "high" },
    holo: { exists: false, source: "override", confidence: "high" },
    reverse: { exists: true, source: "override", confidence: "high" }
  },
  
  // Add more known corrections as discovered
}

function applyKnownCorrections(card: CardInput): Partial<VariantResult["variants"]> {
  return KNOWN_CORRECTIONS[card.id] || {}
}
```

### Rarity Name Standardization

```typescript
function applyRarityCorrections(card: CardInput): Partial<VariantResult["variants"]> {
  // Handle variant rarity names that might confuse era rules
  const correctedRarity = standardizeRarityName(card.rarity)
  
  if (correctedRarity !== card.rarity) {
    // Re-apply era rules with corrected rarity
    const correctedCard = { ...card, rarity: correctedRarity }
    return applyEraRules(correctedCard, detectEra(card))
  }
  
  return {}
}

function standardizeRarityName(rarity: string): string {
  const corrections: Record<string, string> = {
    "Holo Rare": "Rare Holo",
    "Ultra Rare": "Rare Ultra",
    "Secret Rare": "Rare Secret",
    "Rainbow Rare": "Rare Rainbow"
  }
  
  return corrections[rarity] || rarity
}
```

## Override Rule Application

### Main Override Function

```typescript
function applyOverrideRules(
  card: CardInput,
  productSources: ProductSource,
  existingVariants: Partial<VariantResult["variants"]>
): Partial<VariantResult["variants"]> {
  
  let overrides: Partial<VariantResult["variants"]> = {}
  
  // Apply different override types
  const themeDeckOverrides = applyThemeDeckOverrides(card, productSources, existingVariants)
  const promoOverrides = applyPromoOverrides(card, productSources, existingVariants)
  const starterOverrides = applyStarterOverrides(card, productSources)
  const setSpecificOverrides = applySetSpecificOverrides(card)
  const correctionOverrides = applyKnownCorrections(card)
  const rarityOverrides = applyRarityCorrections(card)
  
  // Merge all overrides (later ones take precedence for conflicts)
  overrides = mergeOverrides([
    themeDeckOverrides,
    promoOverrides, 
    starterOverrides,
    setSpecificOverrides,
    correctionOverrides,
    rarityOverrides
  ])
  
  return overrides
}
```

### Override Merging Strategy

```typescript
function mergeOverrides(overrideList: Array<Partial<VariantResult["variants"]>>): Partial<VariantResult["variants"]> {
  const merged: Partial<VariantResult["variants"]> = {}
  
  overrideList.forEach(override => {
    Object.keys(override).forEach(finish => {
      const finishKey = finish as Finish
      const variant = override[finishKey]
      
      if (variant) {
        // If variant says it exists, always apply
        if (variant.exists) {
          merged[finishKey] = variant
        } 
        // If variant says it doesn't exist, only apply if not already set to exist
        else if (!merged[finishKey]?.exists) {
          merged[finishKey] = variant
        }
      }
    })
  })
  
  return merged
}
```

### Final Variant Merge

Override rules are merged with existing variants from hard/era rules:

```typescript
function mergeWithOverrides(
  baseVariants: VariantResult["variants"],
  overrides: Partial<VariantResult["variants"]>
): VariantResult["variants"] {
  
  const final = { ...baseVariants }
  
  Object.keys(overrides).forEach(finish => {
    const finishKey = finish as Finish
    const override = overrides[finishKey]
    
    if (override) {
      // Override can add variants that don't exist
      if (override.exists && !final[finishKey].exists) {
        final[finishKey] = override
      }
      // Override can remove variants with high confidence
      else if (!override.exists && override.confidence === "high") {
        final[finishKey] = override
      }
      // Override can increase confidence of existing variants
      else if (override.exists && final[finishKey].exists && 
               getConfidenceLevel(override.confidence) > getConfidenceLevel(final[finishKey].confidence)) {
        final[finishKey] = override
      }
    }
  })
  
  return final
}

function getConfidenceLevel(confidence?: Confidence): number {
  switch (confidence) {
    case "high": return 3
    case "medium": return 2
    case "low": return 1
    default: return 0
  }
}
```

## Override Rule Explanations

Override rules must provide clear explanations for their decisions:

```typescript
function generateOverrideExplanations(
  card: CardInput,
  productSources: ProductSource,
  appliedOverrides: Partial<VariantResult["variants"]>
): string[] {
  
  const explanations: string[] = []
  
  if (productSources.includes("Theme Deck") && appliedOverrides.normal?.exists) {
    explanations.push("Theme Deck product source adds non-holo variant")
  }
  
  if (productSources.includes("Promo") && appliedOverrides.holo?.exists) {
    explanations.push("Promo cards typically come in holo finish")
  }
  
  if (SET_SPECIFIC_OVERRIDES[card.set.id]) {
    explanations.push(`Special rules applied for ${card.set.id} set`)
  }
  
  if (KNOWN_CORRECTIONS[card.id]) {
    explanations.push("Known data correction applied")
  }
  
  return explanations
}
```

## Testing Override Rules

### Product Source Tests

```typescript
describe('Override Rules - Product Sources', () => {
  test('should add normal variant for Theme Deck holo card', () => {
    const card = createTestCard({
      rarity: "Rare Holo",
      set: { series: "Sword & Shield" }
    })
    
    const existingVariants = { 
      holo: { exists: true, source: "rule", confidence: "medium" },
      normal: { exists: false, source: "rule", confidence: "high" }
    }
    
    const overrides = applyThemeDeckOverrides(card, ["Booster", "Theme Deck"], existingVariants)
    
    expect(overrides.normal).toEqual({
      exists: true,
      source: "override",
      confidence: "medium"
    })
  })
  
  test('should handle Celebrations special reprint rules', () => {
    const card = createTestCard({
      rarity: "Rare Holo",
      set: { id: "cel25", series: "Celebrations" }
    })
    
    const overrides = applySetSpecificOverrides(card)
    
    expect(overrides.holo?.exists).toBe(true)
    expect(overrides.reverse?.exists).toBe(false)
  })
})
```

### Error Correction Tests

```typescript
describe('Override Rules - Error Corrections', () => {
  test('should apply known corrections for specific cards', () => {
    const card = createTestCard({
      id: "sv3pt5-4",
      name: "Charmander",
      rarity: "Common"
    })
    
    const corrections = applyKnownCorrections(card)
    
    expect(corrections).toBeDefined()
    expect(corrections.normal?.exists).toBe(true)
  })
})
```

Override rules provide the final layer of nuance and exception handling, ensuring edge cases are properly handled while maintaining system determinism.