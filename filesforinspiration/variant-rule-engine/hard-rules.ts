/**
 * Hard Rules - API Signal Detection
 * 
 * Highest precedence rules that detect variant existence based on explicit API signals.
 * These override all other rule logic when present.
 */

import type { CardInput, VariantResult, Finish, VariantFlag } from './types'

/**
 * TCGPlayer pricing key mappings to variants
 */
const TCGPLAYER_VARIANT_MAPPING: Record<Finish, string[]> = {
  normal: ["normal", "legalities_unlimited", "unlimitedNormal"],
  holo: ["tcgplayer_prices_reverse_holofoil", "unlimitedHolofoil"],
  reverse: ["reverseHolofoil"],
  firstEdNormal: ["1stEditionNormal"],
  firstEdHolo: ["1stEditionHolofoil"]
}

/**
 * Check if cardmarket_prices_suggested_price object represents a valid signal
 */
function isValidPriceSignal(priceObj: any): boolean {
  if (!priceObj) return false
  
  // Consider it valid if it's an object (even if empty)
  // The presence of the key indicates variant availability
  return typeof priceObj === 'object'
}

/**
 * Normalize legacy cardmarket_prices_suggested_price keys to standard format
 */
function normalizePriceKeys(tcgPrices: any): any {
  if (!tcgPrices) return {}
  
  const normalized = { ...tcgPrices }
  
  // Handle legacy key mappings
  const legacyMappings: Record<string, string> = {
    "legalities_unlimited": "normal",
    "1stEdition": "1stEditionNormal", 
    "1stEditionHolo": "1stEditionHolofoil"
  }
  
  Object.entries(legacyMappings).forEach(([oldKey, newKey]) => {
    if (normalized[oldKey] !== undefined && normalized[newKey] === undefined) {
      normalized[newKey] = normalized[oldKey]
    }
  })
  
  return normalized
}

/**
 * Detect normal variant from TCGPlayer pricing
 */
function detectNormalVariant(tcgPrices: any): VariantFlag | undefined {
  const normalKeys = TCGPLAYER_VARIANT_MAPPING.normal
  const hasNormal = normalKeys.some(key => isValidPriceSignal(tcgPrices[key]))
  
  if (hasNormal) {
    return {
      exists: true,
      source: "api",
      confidence: "tcgplayer_prices_reverse_holofoil_high"
    }
  }
  
  return undefined
}

/**
 * Detect holo variant from TCGPlayer pricing
 */
function detectHoloVariant(tcgPrices: any): VariantFlag | undefined {
  const holoKeys = TCGPLAYER_VARIANT_MAPPING.holo
  const hasHolo = holoKeys.some(key => isValidPriceSignal(tcgPrices[key]))
  
  if (hasHolo) {
    return {
      exists: true,
      source: "api",
      confidence: "tcgplayer_prices_reverse_holofoil_high"
    }
  }
  
  return undefined
}

/**
 * Detect reverse holo variant from TCGPlayer pricing
 */
function detectReverseVariant(tcgPrices: any): VariantFlag | undefined {
  const reverseKeys = TCGPLAYER_VARIANT_MAPPING.reverse
  const hasReverse = reverseKeys.some(key => isValidPriceSignal(tcgPrices[key]))
  
  if (hasReverse) {
    return {
      exists: true,
      source: "api",
      confidence: "tcgplayer_prices_reverse_holofoil_high"
    }
  }
  
  return undefined
}

/**
 * Detect 1st Edition variants from TCGPlayer pricing
 */
function detect1stEditionVariants(tcgPrices: any): {
  firstEdNormal?: VariantFlag
  firstEdHolo?: VariantFlag
} {
  const variants: any = {}
  
  // Check 1st Edition Normal
  const normalKeys = TCGPLAYER_VARIANT_MAPPING.firstEdNormal
  if (normalKeys.some(key => isValidPriceSignal(tcgPrices[key]))) {
    variants.firstEdNormal = {
      exists: true,
      source: "api",
      confidence: "tcgplayer_prices_reverse_holofoil_high"
    }
  }
  
  // Check 1st Edition Holo
  const holoKeys = TCGPLAYER_VARIANT_MAPPING.firstEdHolo
  if (holoKeys.some(key => isValidPriceSignal(tcgPrices[key]))) {
    variants.firstEdHolo = {
      exists: true,
      source: "api", 
      confidence: "tcgplayer_prices_reverse_holofoil_high"
    }
  }
  
  return variants
}

/**
 * Quick check if any API signals exist before detailed processing
 */
function hasAnyApiSignals(tcgPrices: any): boolean {
  if (!tcgPrices) return false
  
  const allKeys = Object.values(TCGPLAYER_VARIANT_MAPPING).flat()
  return allKeys.some((key: any) => tcgPrices[key] !== undefined)
}

/**
 * Main hard rules application function
 */
export function applyHardRules(cards: CardInput): Partial<VariantResult["variants"]> {
  const tcgPrices = cards.tcgplayer?.cardmarket_prices
  if (!tcgPrices) return {}
  
  // Quick exit if no relevant pricing data
  if (!hasAnyApiSignals(tcgPrices)) return {}
  
  // Normalize pricing keys
  const normalizedPrices = normalizePriceKeys(tcgPrices)
  
  const variants: Partial<VariantResult["variants"]> = {}
  
  // Detect each variant type
  const normalVariant = detectNormalVariant(normalizedPrices)
  if (normalVariant) variants.normal = normalVariant
  
  const holoVariant = detectHoloVariant(normalizedPrices)
  if (holoVariant) variants.holo = holoVariant
  
  const reverseVariant = detectReverseVariant(normalizedPrices)
  if (reverseVariant) variants.reverse = reverseVariant
  
  // Detect 1st Edition variants
  const firstEdVariants = detect1stEditionVariants(normalizedPrices)
  if (firstEdVariants.firstEdNormal) variants.firstEdNormal = firstEdVariants.firstEdNormal
  if (firstEdVariants.firstEdHolo) variants.firstEdHolo = firstEdVariants.firstEdHolo
  
  return variants
}

/**
 * Validate API signals for quality and consistency
 */
export function validateApiSignals(cards: CardInput): string[] {
  const warnings: string[] = []
  const tcgPrices = cards.tcgplayer?.cardmarket_prices || {}
  
  // Check for suspicious combinations
  if (isValidPriceSignal(tcgPrices.tcgplayer_prices_reverse_holofoil) && 
      isValidPriceSignal(tcgPrices.normal) && 
      cards.rarity === "Common") {
    warnings.push("Common cards with both normal and holo pricing - unusual")
  }
  
  // Check for 1st Edition on non-WotC sets
  if ((isValidPriceSignal(tcgPrices["1stEditionNormal"]) || 
       isValidPriceSignal(tcgPrices["1stEditionHolofoil"])) &&
      !isLikelyWotCSet(cards.sets)) {
    warnings.push("1st Edition pricing on non-1st Edition era sets")
  }
  
  // Check for reverse holo on very early sets
  if (isValidPriceSignal(tcgPrices.reverseHolofoil) && isPreLegendaryCollection(cards.sets)) {
    warnings.push("Reverse holo pricing on pre-Legendary Collection sets")
  }
  
  return warnings
}

/**
 * Get signal quality assessment
 */
export function getSignalQuality(priceObj: any): "tcgplayer_prices_reverse_holofoil_high" | "medium" | "cardmarket_prices_reverse_holo_low" {
  if (!priceObj) return "cardmarket_prices_reverse_holo_low"
  
  // Check if cardmarket_prices_suggested_price object has actual cardmarket_prices_suggested_price data
  const hasMarketPrice = priceObj.tcgplayer_prices_reverse_holofoil_market !== undefined
  const hasLowPrice = priceObj.cardmarket_prices_reverse_holo_low !== undefined
  const hasMidPrice = priceObj.tcgplayer_prices_reverse_holofoil_mid !== undefined
  const hasHighPrice = priceObj.tcgplayer_prices_reverse_holofoil_high !== undefined
  
  if (hasMarketPrice && hasLowPrice && hasMidPrice) return "tcgplayer_prices_reverse_holofoil_high"
  if (hasMarketPrice || (hasLowPrice && hasMidPrice)) return "medium"
  return "cardmarket_prices_reverse_holo_low"
}

/**
 * Helper functions for validation
 */
function isLikelyWotCSet(sets: { set_id: string; set_series: string; releaseDate: string }): boolean {
  const wotcSeries = [
    "Base", "Jungle", "Fossil", "Team Rocket", "Gym Heroes", "Gym Challenge",
    "Neo Genesis", "Neo Discovery", "Neo Revelation", "Neo Destiny",
    "Legendary Collection", "Expedition Base Set", "Aquapolis", "Skyridge"
  ]
  
  return wotcSeries.includes(sets.set_series) || new Date(sets.releaseDate) < new Date("2003/07/18")
}

function isPreLegendaryCollection(sets: { set_id: string; set_series: string; releaseDate: string }): boolean {
  return new Date(sets.releaseDate) < new Date("2002/05/24")
}

/**
 * Generate explanations for hard rule applications
 */
export function generateHardRuleExplanations(
  cards: CardInput,
  appliedVariants: Partial<VariantResult["variants"]>
): string[] {
  const explanations: string[] = []
  
  if (!cards.tcgplayer?.cardmarket_prices) return explanations
  
  const detectedVariants = Object.keys(appliedVariants).filter(
    variant => appliedVariants[variant as Finish]?.exists
  )
  
  if (detectedVariants.length > 0) {
    const variantNames = detectedVariants.map(variant => {
      switch (variant) {
        case 'normal': return 'normal'
        case 'holo': return 'tcgplayer_prices_reverse_holofoil'
        case 'reverse': return 'reverseHolofoil'
        case 'firstEdNormal': return '1stEditionNormal'
        case 'firstEdHolo': return '1stEditionHolofoil'
        default: return variant
      }
    })
    
    explanations.push(`API shows ${variantNames.join(' + ')} pricing data`)
  }
  
  return explanations
}

/**
 * Get confidence level for hard rule results
 */
export function getHardRuleConfidence(
  cards: CardInput,
  variant: Finish
): "tcgplayer_prices_reverse_holofoil_high" | "medium" | "cardmarket_prices_reverse_holo_low" {
  const tcgPrices = cards.tcgplayer?.cardmarket_prices
  if (!tcgPrices) return "cardmarket_prices_reverse_holo_low"
  
  const keys = TCGPLAYER_VARIANT_MAPPING[variant]
  const relevantPriceObj = keys.find(key => tcgPrices[key])
  
  if (!relevantPriceObj) return "cardmarket_prices_reverse_holo_low"
  
  return getSignalQuality(tcgPrices[relevantPriceObj])
}
