# Comprehensive Test Cases for Variant Rule Engine

## Overview

This document defines the complete test suite for the variant rule engine, including contract tests, edge cases, and integration scenarios.

## Contract Tests (Required)

These tests validate the specific examples provided in the requirements:

### Test 1: Vivid Voltage Clefable

**Input:**
```json
{
  "id": "swsh4-082",
  "name": "Clefable",
  "number": "082",
  "rarity": "Rare",
  "set": {
    "id": "swsh4",
    "series": "Sword & Shield",
    "releaseDate": "2020/11/13"
  },
  "tcgplayer": {
    "prices": {
      "normal": {},
      "reverseHolofoil": {}
    }
  }
}
```

**Expected Output:**
```json
{
  "id": "swsh4-082",
  "setId": "swsh4",
  "era": "Sword & Shield",
  "rarity": "Rare",
  "variants": {
    "normal": {"exists": true, "source": "api", "confidence": "high"},
    "holo": {"exists": false, "source": "rule", "confidence": "high"},
    "reverse": {"exists": true, "source": "api", "confidence": "high"},
    "firstEdNormal": {"exists": false},
    "firstEdHolo": {"exists": false}
  },
  "printSources": ["Booster"],
  "explanations": [
    "API shows normal + reverseHolofoil; rarity 'Rare' in SWSH implies no regular holo."
  ]
}
```

### Test 2: Scarlet & Violet Base Rare

**Input:**
```json
{
  "id": "sv1-001",
  "name": "Test Card",
  "number": "001",
  "rarity": "Rare",
  "set": {
    "id": "sv1",
    "series": "Scarlet & Violet",
    "releaseDate": "2023/03/31"
  },
  "tcgplayer": {
    "prices": {}
  }
}
```

**Expected Output:**
```json
{
  "id": "sv1-001",
  "setId": "sv1",
  "era": "Scarlet & Violet",
  "rarity": "Rare",
  "variants": {
    "normal": {"exists": false, "source": "rule", "confidence": "high"},
    "holo": {"exists": true, "source": "rule", "confidence": "medium"},
    "reverse": {"exists": true, "source": "rule", "confidence": "medium"},
    "firstEdNormal": {"exists": false},
    "firstEdHolo": {"exists": false}
  },
  "printSources": ["Booster"],
  "explanations": [
    "S&V single-star rares are holo by default and also have reverse; no normal in boosters."
  ]
}
```

### Test 3: WotC Theme Deck Override

**Input:**
```json
{
  "id": "base1-4",
  "name": "Charizard",
  "number": "4",
  "rarity": "Rare Holo",
  "set": {
    "id": "base1",
    "series": "Base",
    "releaseDate": "1999/01/09"
  },
  "tcgplayer": {
    "prices": {
      "holofoil": {},
      "1stEditionHolofoil": {}
    }
  }
}
```

**Product Sources:** `["Booster", "Theme Deck"]`

**Expected Output:**
```json
{
  "variants": {
    "normal": {"exists": true, "source": "override", "confidence": "medium"},
    "holo": {"exists": true, "source": "api", "confidence": "high"},
    "reverse": {"exists": false, "source": "rule", "confidence": "high"},
    "firstEdNormal": {"exists": false},
    "firstEdHolo": {"exists": true, "source": "api", "confidence": "high"}
  },
  "explanations": [
    "API shows holofoil + 1stEditionHolofoil variants exist",
    "Theme Deck product source adds non-holo variant",
    "Pre-Legendary Collection set: no reverse holo"
  ]
}
```

## Era Detection Tests

### Test: Series-Based Detection

```typescript
describe('Era Detection', () => {
  const testCases = [
    { series: "Scarlet & Violet", expected: "Scarlet & Violet" },
    { series: "Sword & Shield", expected: "Sword & Shield" },
    { series: "Sun & Moon", expected: "Sun & Moon" },
    { series: "XY", expected: "XY" },
    { series: "Black & White", expected: "Black & White" },
    { series: "HeartGold & SoulSilver", expected: "HGSS" },
    { series: "Diamond & Pearl", expected: "DP" },
    { series: "Ruby & Sapphire", expected: "EX" },
    { series: "Base", expected: "WotC" }
  ]
  
  test.each(testCases)('should detect era for series $series', ({ series, expected }) => {
    const card = createTestCard({ set: { series, releaseDate: "2020/01/01" } })
    expect(detectEra(card)).toBe(expected)
  })
})
```

### Test: Date-Based Fallback

```typescript
describe('Era Detection - Date Fallback', () => {
  const testCases = [
    { date: "2024/01/01", expected: "Scarlet & Violet" },
    { date: "2021/06/15", expected: "Sword & Shield" },
    { date: "2018/03/10", expected: "Sun & Moon" },
    { date: "2015/02/01", expected: "XY" },
    { date: "2012/05/15", expected: "Black & White" },
    { date: "2010/08/20", expected: "HGSS" },
    { date: "2008/01/15", expected: "DP" },
    { date: "2005/06/10", expected: "EX" },
    { date: "2001/12/25", expected: "WotC" }
  ]
  
  test.each(testCases)('should detect era by date $date', ({ date, expected }) => {
    const card = createTestCard({ 
      set: { series: "Unknown Series", releaseDate: date } 
    })
    expect(detectEra(card)).toBe(expected)
  })
})
```

## Hard Rules Tests

### Test: TCGPlayer Price Signal Detection

```typescript
describe('Hard Rules - TCGPlayer Signals', () => {
  test('should detect normal variant from multiple price keys', () => {
    const testCases = [
      { prices: { normal: { market: 1.50 } }, expectedNormal: true },
      { prices: { unlimited: { market: 1.25 } }, expectedNormal: true },
      { prices: { unlimitedNormal: { market: 1.00 } }, expectedNormal: true },
      { prices: { holofoil: { market: 5.00 } }, expectedNormal: false }
    ]
    
    testCases.forEach(({ prices, expectedNormal }) => {
      const card = createTestCard({ tcgplayer: { prices } })
      const result = applyHardRules(card)
      expect(result.normal?.exists).toBe(expectedNormal)
      if (expectedNormal) {
        expect(result.normal?.source).toBe("api")
        expect(result.normal?.confidence).toBe("high")
      }
    })
  })
  
  test('should detect holo variant', () => {
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
  
  test('should detect reverse holo variant', () => {
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
  
  test('should detect 1st Edition variants', () => {
    const card = createTestCard({
      tcgplayer: { 
        prices: { 
          "1stEditionNormal": { market: 10.00 },
          "1stEditionHolofoil": { market: 50.00 }
        } 
      }
    })
    
    const result = applyHardRules(card)
    expect(result.firstEdNormal).toEqual({
      exists: true,
      source: "api",
      confidence: "high"
    })
    expect(result.firstEdHolo).toEqual({
      exists: true,
      source: "api",
      confidence: "high"
    })
  })
})
```

## Era Rules Tests

### Test: Scarlet & Violet Single-Star Rares

```typescript
describe('Era Rules - Scarlet & Violet', () => {
  test('should make single-star rares holo by default', () => {
    const card = createTestCard({
      rarity: "Rare",
      set: { series: "Scarlet & Violet", releaseDate: "2023/03/31" }
    })
    
    const result = applyScarletVioletRules(card)
    expect(result.holo?.exists).toBe(true)
    expect(result.normal?.exists).toBe(false)
    expect(result.reverse?.exists).toBe(true)
  })
  
  test('should handle commons/uncommons traditionally', () => {
    const card = createTestCard({
      rarity: "Common",
      set: { series: "Scarlet & Violet", releaseDate: "2023/03/31" }
    })
    
    const result = applyScarletVioletRules(card)
    expect(result.normal?.exists).toBe(true)
    expect(result.holo?.exists).toBe(false)
    expect(result.reverse?.exists).toBe(true)
  })
})
```

### Test: Sword & Shield Rare vs Rare Holo

```typescript
describe('Era Rules - Sword & Shield', () => {
  test('should distinguish Rare from Rare Holo', () => {
    const rareCard = createTestCard({
      rarity: "Rare",
      set: { series: "Sword & Shield", releaseDate: "2020/02/07" }
    })
    
    const result = applySwordShieldRules(rareCard)
    expect(result.normal?.exists).toBe(true)
    expect(result.holo?.exists).toBe(false)
    expect(result.reverse?.exists).toBe(true)
  })
  
  test('should handle Rare Holo correctly', () => {
    const holoCard = createTestCard({
      rarity: "Rare Holo",
      set: { series: "Sword & Shield", releaseDate: "2020/02/07" }
    })
    
    const result = applySwordShieldRules(holoCard)
    expect(result.normal?.exists).toBe(false)
    expect(result.holo?.exists).toBe(true)
    expect(result.reverse?.exists).toBe(true)
  })
})
```

### Test: WotC Era 1st Edition

```typescript
describe('Era Rules - WotC Era', () => {
  test('should include 1st Edition for Base Set cards', () => {
    const card = createTestCard({
      rarity: "Rare Holo",
      set: { id: "base1", series: "Base", releaseDate: "1999/01/09" }
    })
    
    const result = applyWotCRules(card, "1999/01/09")
    expect(result.firstEdHolo?.exists).toBe(true)
    expect(result.holo?.exists).toBe(true)
    expect(result.reverse?.exists).toBe(false) // Pre-Legendary Collection
  })
  
  test('should handle post-Legendary Collection reverse holo', () => {
    const card = createTestCard({
      rarity: "Rare",
      set: { id: "ecard1", series: "Expedition Base Set", releaseDate: "2002/09/15" }
    })
    
    const result = applyWotCRules(card, "2002/09/15")
    expect(result.reverse?.exists).toBe(true) // Post-Legendary Collection
    expect(result.firstEdNormal?.exists).toBe(true)
  })
})
```

## Override Rules Tests

### Test: Theme Deck Overrides

```typescript
describe('Override Rules - Theme Deck', () => {
  test('should add normal variant for Theme Deck holo card', () => {
    const card = createTestCard({
      rarity: "Rare Holo",
      set: { series: "Sword & Shield" }
    })
    
    const existingVariants = {
      holo: { exists: true, source: "rule", confidence: "medium" },
      normal: { exists: false, source: "rule", confidence: "high" }
    }
    
    const result = applyThemeDeckOverrides(card, ["Booster", "Theme Deck"], existingVariants)
    expect(result.normal).toEqual({
      exists: true,
      source: "override",
      confidence: "medium"
    })
  })
  
  test('should not override if normal already exists', () => {
    const card = createTestCard({ rarity: "Rare" })
    const existingVariants = {
      normal: { exists: true, source: "api", confidence: "high" }
    }
    
    const result = applyThemeDeckOverrides(card, ["Theme Deck"], existingVariants)
    expect(result.normal).toBeUndefined()
  })
})
```

### Test: Set-Specific Overrides

```typescript
describe('Override Rules - Set Specific', () => {
  test('should apply Celebrations special rules', () => {
    const card = createTestCard({
      rarity: "Rare Holo",
      set: { id: "cel25", series: "Celebrations" }
    })
    
    const result = applySetSpecificOverrides(card)
    expect(result.holo?.exists).toBe(true)
    expect(result.reverse?.exists).toBe(false) // No reverse in Celebrations
  })
  
  test('should apply McDonald\'s 2019 rules', () => {
    const card = createTestCard({
      rarity: "Promo",
      set: { id: "mcd19", series: "Sun & Moon" }
    })
    
    const result = applySetSpecificOverrides(card)
    expect(result.normal?.exists).toBe(true)
    expect(result.holo?.exists).toBe(false)
    expect(result.reverse?.exists).toBe(false)
  })
})
```

## Integration Tests

### Test: Full Pipeline

```typescript
describe('Integration Tests - Full Pipeline', () => {
  test('should properly prioritize hard rules over era rules', () => {
    // S&V rare would normally be holo-only by era rules
    // But API shows normal variant exists
    const card = createTestCard({
      rarity: "Rare",
      set: { series: "Scarlet & Violet", releaseDate: "2023/03/31" },
      tcgplayer: { prices: { normal: {}, reverseHolofoil: {} } }
    })
    
    const result = inferVariants(card)
    
    // Hard rules should override era rules
    expect(result.variants.normal.source).toBe("api")
    expect(result.variants.reverse.source).toBe("api")
    expect(result.variants.holo.exists).toBe(false)
  })
  
  test('should merge override rules correctly', () => {
    const card = createTestCard({
      rarity: "Rare Holo",
      set: { id: "base1", series: "Base", releaseDate: "1999/01/09" },
      tcgplayer: { prices: { holofoil: {}, "1stEditionHolofoil": {} } }
    })
    
    const result = inferVariants(card, ["Booster", "Theme Deck"])
    
    // Should have API-detected holo and 1st edition
    expect(result.variants.holo.source).toBe("api")
    expect(result.variants.firstEdHolo.source).toBe("api")
    
    // Should have override-added normal from Theme Deck
    expect(result.variants.normal.source).toBe("override")
    
    // Should have era-rule reverse (false for pre-Legendary Collection)
    expect(result.variants.reverse.exists).toBe(false)
  })
})
```

## Edge Cases Tests

### Test: Empty/Invalid Data

```typescript
describe('Edge Cases - Invalid Data', () => {
  test('should handle card with no TCGPlayer data', () => {
    const card = createTestCard({
      rarity: "Rare",
      set: { series: "Sword & Shield", releaseDate: "2020/02/07" }
      // No tcgplayer property
    })
    
    const result = inferVariants(card)
    
    // Should fall back to era rules
    expect(result.variants.normal.source).toBe("rule")
    expect(result.variants.reverse.source).toBe("rule")
  })
  
  test('should handle unknown era gracefully', () => {
    const card = createTestCard({
      rarity: "Rare",
      set: { series: "Unknown Series", releaseDate: "1995/01/01" }
    })
    
    const result = inferVariants(card)
    
    // Should apply conservative fallback rules
    expect(result.era).toBe("WotC") // Date-based fallback
    expect(result.variants.normal.confidence).toBe("low")
  })
  
  test('should handle malformed product sources', () => {
    const card = createTestCard({ rarity: "Rare" })
    
    const result = inferVariants(card, null as any)
    
    expect(result.printSources).toEqual(["Booster"]) // Default fallback
  })
})
```

### Test: Boundary Conditions

```typescript
describe('Edge Cases - Boundary Conditions', () => {
  test('should handle cards at era transition dates', () => {
    // Test card exactly at S&V transition
    const card = createTestCard({
      rarity: "Rare",
      set: { series: "Scarlet & Violet", releaseDate: "2023/03/31" }
    })
    
    const result = inferVariants(card)
    expect(result.era).toBe("Scarlet & Violet")
    expect(result.variants.holo.exists).toBe(true) // S&V rules applied
  })
  
  test('should handle Legendary Collection boundary for reverse holo', () => {
    const preLegendary = createTestCard({
      set: { series: "Neo Destiny", releaseDate: "2001/02/28" }
    })
    const postLegendary = createTestCard({
      set: { series: "Legendary Collection", releaseDate: "2002/05/24" }
    })
    
    const preResult = inferVariants(preLegendary)
    const postResult = inferVariants(postLegendary)
    
    expect(preResult.variants.reverse.exists).toBe(false)
    expect(postResult.variants.reverse.exists).toBe(true)
  })
})
```

## Performance Tests

```typescript
describe('Performance Tests', () => {
  test('should process large batch of cards efficiently', () => {
    const cards = Array.from({ length: 1000 }, (_, i) => 
      createTestCard({ 
        id: `test-${i}`,
        rarity: i % 2 === 0 ? "Rare" : "Common"
      })
    )
    
    const start = Date.now()
    const results = cards.map(card => inferVariants(card))
    const duration = Date.now() - start
    
    expect(results).toHaveLength(1000)
    expect(duration).toBeLessThan(1000) // Should process 1000 cards in under 1 second
  })
  
  test('should be deterministic with repeated calls', () => {
    const card = createTestCard({
      rarity: "Rare",
      set: { series: "Sword & Shield" }
    })
    
    const result1 = inferVariants(card)
    const result2 = inferVariants(card)
    const result3 = inferVariants(card)
    
    expect(result1).toEqual(result2)
    expect(result2).toEqual(result3)
  })
})
```

## Test Utilities

```typescript
// Helper function for creating test cards
function createTestCard(overrides: Partial<CardInput> = {}): CardInput {
  return {
    id: "test-card-001",
    name: "Test Card",
    number: "001",
    rarity: "Common",
    set: {
      id: "test1",
      series: "Test Series",
      releaseDate: "2020/01/01"
    },
    ...overrides
  }
}

// Helper for asserting variant flags
function expectVariant(
  variant: VariantFlag, 
  expected: { exists: boolean; source?: Source; confidence?: Confidence }
) {
  expect(variant.exists).toBe(expected.exists)
  if (expected.exists) {
    expect(variant.source).toBe(expected.source)
    expect(variant.confidence).toBe(expected.confidence)
  }
}

// Test data generators
const TEST_ERAS = [
  "WotC", "EX", "DP", "HGSS", "Black & White", 
  "XY", "Sun & Moon", "Sword & Shield", "Scarlet & Violet"
] as const

const TEST_RARITIES = [
  "Common", "Uncommon", "Rare", "Rare Holo", "Rare Holo EX",
  "Rare Holo GX", "Rare Holo V", "Rare Holo VMAX", "Rare Secret"
] as const

function generateTestCards(count: number): CardInput[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `generated-${i}`,
    name: `Generated Card ${i}`,
    number: String(i + 1).padStart(3, '0'),
    rarity: TEST_RARITIES[i % TEST_RARITIES.length],
    set: {
      id: `gen${Math.floor(i / 50)}`,
      series: TEST_ERAS[i % TEST_ERAS.length],
      releaseDate: `202${(i % 5)}/0${(i % 9) + 1}/01`
    }
  }))
}
```

This comprehensive test suite ensures the variant rule engine behaves correctly across all scenarios and maintains its deterministic guarantees.