# Variant Rule Engine API Specification

## TypeScript Interfaces

### Core Types

```typescript
// Supported card finishes/variants
export type Finish = "normal" | "holo" | "reverse" | "firstEdNormal" | "firstEdHolo"

// Source of variant information
export type Source = "api" | "rule" | "override"

// Confidence level in the determination
export type Confidence = "high" | "medium" | "low"

// Pokemon TCG Eras
export type Era = 
  | "WotC"
  | "EX" 
  | "DP"
  | "HGSS"
  | "Black & White"
  | "XY"
  | "Sun & Moon"
  | "Sword & Shield"
  | "Scarlet & Violet"
```

### Variant Flag

```typescript
export interface VariantFlag {
  exists: boolean
  source?: Source      // Only present if exists = true
  confidence?: Confidence  // Only present if exists = true
}
```

### Main Result Interface

```typescript
export interface VariantResult {
  id: string           // Card ID from Pokemon TCG API
  setId: string        // Set ID from Pokemon TCG API
  era: Era             // Determined era
  rarity: string       // Original rarity string
  variants: {
    normal: VariantFlag
    holo: VariantFlag
    reverse: VariantFlag
    firstEdNormal: VariantFlag
    firstEdHolo: VariantFlag
  }
  printSources: string[]  // ["Booster"] or provided productSources
  explanations: string[]  // Human-readable reasoning
}
```

### Input Interfaces

```typescript
// Simplified Pokemon TCG API card structure
export interface CardInput {
  id: string
  name: string
  number: string
  rarity: string
  set: {
    id: string
    series: string
    releaseDate: string  // YYYY/MM/DD format
  }
  tcgplayer?: {
    prices?: {
      normal?: any                // Presence indicates variant exists
      holofoil?: any             // Presence indicates variant exists
      reverseHolofoil?: any      // Presence indicates variant exists
      "1stEditionNormal"?: any   // Presence indicates variant exists
      "1stEditionHolofoil"?: any // Presence indicates variant exists
      [key: string]: any         // Other pricing keys
    }
  }
}

// Optional product source information
export type ProductSource = string[]  // e.g., ["Booster", "Theme Deck", "Promo/Tin"]
```

## Main Function Signature

```typescript
/**
 * Infer card variant availability using deterministic rules
 * 
 * @param card - Pokemon TCG API card object
 * @param productSources - Optional array of product sources
 * @returns VariantResult with variant availability and explanations
 */
export function inferVariants(
  card: CardInput,
  productSources?: ProductSource
): VariantResult
```

## Example Usage

### Basic Usage

```typescript
import { inferVariants } from './variant-rule-engine'

const card = {
  id: "swsh4-082",
  name: "Clefable", 
  number: "082",
  rarity: "Rare",
  set: {
    id: "swsh4",
    series: "Sword & Shield",
    releaseDate: "2020/11/13"
  },
  tcgplayer: {
    prices: {
      normal: {},
      reverseHolofoil: {}
    }
  }
}

const result = inferVariants(card)
// Returns: {
//   id: "swsh4-082",
//   setId: "swsh4", 
//   era: "Sword & Shield",
//   rarity: "Rare",
//   variants: {
//     normal: { exists: true, source: "api", confidence: "high" },
//     holo: { exists: false, source: "rule", confidence: "high" },
//     reverse: { exists: true, source: "api", confidence: "high" },
//     firstEdNormal: { exists: false },
//     firstEdHolo: { exists: false }
//   },
//   printSources: ["Booster"],
//   explanations: [
//     "API shows normal + reverseHolofoil; rarity 'Rare' in SWSH implies no regular holo."
//   ]
// }
```

### With Product Sources

```typescript
const card = {
  id: "base1-4",
  name: "Charizard",
  number: "4", 
  rarity: "Rare Holo",
  set: {
    id: "base1",
    series: "Base",
    releaseDate: "1999/01/09"
  },
  tcgplayer: {
    prices: {
      holofoil: {},
      "1stEditionHolofoil": {}
    }
  }
}

const result = inferVariants(card, ["Booster", "Theme Deck"])
// Returns variants including normal variant from Theme Deck override
```

## Result Processing Helpers

```typescript
// Extract available variants for UI rendering
export function getAvailableVariants(result: VariantResult): Finish[] {
  return Object.keys(result.variants)
    .filter(variant => result.variants[variant as Finish].exists) as Finish[]
}

// Check if specific variant exists
export function hasVariant(result: VariantResult, variant: Finish): boolean {
  return result.variants[variant].exists
}

// Get variant source information
export function getVariantSource(result: VariantResult, variant: Finish): Source | null {
  const flag = result.variants[variant]
  return flag.exists ? flag.source || null : null
}

// Get high-confidence variants only
export function getHighConfidenceVariants(result: VariantResult): Finish[] {
  return Object.keys(result.variants)
    .filter(variant => {
      const flag = result.variants[variant as Finish]
      return flag.exists && flag.confidence === "high"
    }) as Finish[]
}
```

## Integration with Existing Types

### Mapping to Existing CardVariant Type

```typescript
// Map rule engine Finish to existing CardVariant
const finishToVariantMap: Record<Finish, CardVariant> = {
  "normal": "normal",
  "holo": "holo", 
  "reverse": "reverse_holo",
  "firstEdNormal": "1st_edition",  // Simplified mapping
  "firstEdHolo": "1st_edition"     // Simplified mapping
}

export function mapToCardVariants(result: VariantResult): CardVariant[] {
  return getAvailableVariants(result)
    .map(finish => finishToVariantMap[finish])
    .filter((variant, index, array) => array.indexOf(variant) === index) // Remove duplicates
}
```

### Extended PokemonCard Interface

```typescript
// Extend existing PokemonCard interface to include variant analysis
export interface PokemonCardWithVariants extends PokemonCard {
  variantAnalysis?: VariantResult
  availableVariants?: CardVariant[]  // Computed from variantAnalysis
}
```

## Error Handling

```typescript
// Errors thrown by inferVariants function
export class VariantRuleError extends Error {
  constructor(message: string, public cardId?: string, public details?: any) {
    super(message)
    this.name = 'VariantRuleError'
  }
}

// Validation function
export function validateCardInput(card: any): card is CardInput {
  return !!(
    card?.id &&
    card?.name &&
    card?.number &&
    card?.rarity &&
    card?.set?.id &&
    card?.set?.series &&
    card?.set?.releaseDate
  )
}
```

## Performance Considerations

```typescript
// Memoization for expensive operations
export interface RuleEngineCache {
  eraCache: Map<string, Era>
  ruleCache: Map<string, VariantResult>
}

// Optional cache parameter for performance
export function inferVariantsWithCache(
  card: CardInput,
  productSources?: ProductSource,
  cache?: RuleEngineCache
): VariantResult
```

## Contract Test Definitions

```typescript
export interface ContractTest {
  name: string
  input: {
    card: CardInput
    productSources?: ProductSource
  }
  expected: Partial<VariantResult>
  description: string
}

export const CONTRACT_TESTS: ContractTest[] = [
  {
    name: "Vivid Voltage Clefable",
    input: {
      card: {
        id: "swsh4-082",
        name: "Clefable",
        number: "082", 
        rarity: "Rare",
        set: { id: "swsh4", series: "Sword & Shield", releaseDate: "2020/11/13" },
        tcgplayer: { prices: { normal: {}, reverseHolofoil: {} } }
      }
    },
    expected: {
      variants: {
        normal: { exists: true, source: "api", confidence: "high" },
        holo: { exists: false },
        reverse: { exists: true, source: "api", confidence: "high" }
      }
    },
    description: "SWSH Rare with API signals should have normal + reverse, no holo"
  },
  {
    name: "Scarlet & Violet Base Rare",
    input: {
      card: {
        id: "sv1-001",
        name: "Test Card",
        number: "001",
        rarity: "Rare",
        set: { id: "sv1", series: "Scarlet & Violet", releaseDate: "2023/03/31" },
        tcgplayer: { prices: {} }
      }
    },
    expected: {
      variants: {
        normal: { exists: false },
        holo: { exists: true, source: "rule", confidence: "medium" },
        reverse: { exists: true, source: "rule", confidence: "medium" }
      }
    },
    description: "S&V single-star rares are holo by default, no normal in boosters"
  }
]
```

This API specification provides a complete contract for implementing the variant rule engine while maintaining compatibility with your existing type system.