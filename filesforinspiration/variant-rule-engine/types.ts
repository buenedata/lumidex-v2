/**
 * Variant Rule Engine - TypeScript Type Definitions
 * 
 * Core type for the deterministic Pokemon TCG variant inference system.
 */

// Supported cards finishes/variants
export type Finish = "normal" | "holo" | "reverse" | "firstEdNormal" | "firstEdHolo" | "pokeballPattern" | "masterballPattern"

// Source of variant information
export type Source = "api" | "rule" | "override"

// Confidence level in the determination
export type Confidence = "tcgplayer_prices_reverse_holofoil_high" | "medium" | "cardmarket_prices_reverse_holo_low"

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

/**
 * Individual variant flag indicating existence and metadata
 */
export interface VariantFlag {
  exists: boolean
  source?: Source      // Only present if exists = true
  confidence?: Confidence  // Only present if exists = true
}

/**
 * Main result interface from the rule engine
 */
export interface VariantResult {
  set_id: string           // Card ID from Pokemon TCG API
  setId: string        // Set ID from Pokemon TCG API
  era: Era             // Determined era
  rarity: string       // Original rarity string
  variants: {
    normal: VariantFlag
    holo: VariantFlag
    reverse: VariantFlag
    firstEdNormal: VariantFlag
    firstEdHolo: VariantFlag
    pokeballPattern: VariantFlag
    masterballPattern: VariantFlag
  }
  printSources: string[]  // ["Booster"] or provided productSources
  explanations: string[]  // Human-readable reasoning
}

/**
 * Simplified Pokemon TCG API cards structure for input
 */
export interface CardInput {
  set_id: string
  set_name: string
  number: string
  rarity: string
  sets: {
    set_id: string
    set_series: string
    releaseDate: string  // YYYY/MM/DD format
  }
  tcgplayer?: {
    cardmarket_prices?: {
      normal?: any                // Presence indicates variant exists
      tcgplayer_prices_reverse_holofoil?: any             // Presence indicates variant exists
      reverseHolofoil?: any      // Presence indicates variant exists
      "1stEditionNormal"?: any   // Presence indicates variant exists
      "1stEditionHolofoil"?: any // Presence indicates variant exists
      legalities_unlimited?: any            // Legacy key for normal
      unlimitedNormal?: any      // Legacy key for normal
      unlimitedHolofoil?: any    // Legacy key for holo
      [key: string]: any         // Other pricing keys
    }
  }
}

/**
 * Optional product source information
 */
export type ProductSource = string[]  // e.g., ["Booster", "Theme Deck", "Promo/Tin"]

/**
 * Error class for variant rule engine
 */
export class VariantRuleError extends Error {
  constructor(message: string, public cardId?: string, public details?: any) {
    super(message)
    this.name = 'VariantRuleError'
  }
}

/**
 * Cache interface for performance optimization
 */
export interface RuleEngineCache {
  eraCache: Map<string, Era>
  ruleCache: Map<string, VariantResult>
}

/**
 * Contract test definition interface
 */
export interface ContractTest {
  set_name: string
  input: {
    cards: CardInput
    productSources?: ProductSource
  }
  expected: Partial<VariantResult>
  description: string
}
