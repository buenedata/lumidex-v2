/**
 * Override Rules - Product Source Exceptions
 * 
 * Handles special cases and exceptions that don't follow normal era-based patterns.
 * These have the lowest precedence but can add variants that wouldn't otherwise exist.
 */

import type { CardInput, VariantResult, ProductSource, VariantFlag } from './types'

/**
 * Set-specific override rules for known problematic sets
 */
const SET_SPECIFIC_OVERRIDES: Record<string, (cards: CardInput) => Partial<VariantResult["variants"]>> = {
  // Celebrations (25th Anniversary)
  "cel25": (cards) => {
    const variants: Partial<VariantResult["variants"]> = {}
    
    // Most cards are special reprints - typically holo only
    if (cards.rarity !== "Common") {
      variants.holo = { exists: true, source: "override", confidence: "tcgplayer_prices_reverse_holofoil_high" }
    } else {
      variants.normal = { exists: true, source: "override", confidence: "tcgplayer_prices_reverse_holofoil_high" }
    }
    
    // No reverse in Celebrations
    variants.reverse = { exists: false, source: "override", confidence: "tcgplayer_prices_reverse_holofoil_high" }
    
    return variants
  },
  
  // McDonald's 2019 (Sun & Moon era promo)
  "mcd19": (cards) => ({
    normal: { exists: true, source: "override", confidence: "tcgplayer_prices_reverse_holofoil_high" }, // All McDonald's cards are non-holo
    holo: { exists: false, source: "override", confidence: "tcgplayer_prices_reverse_holofoil_high" },
    reverse: { exists: false, source: "override", confidence: "tcgplayer_prices_reverse_holofoil_high" }
  }),
  
  // Hidden Fates (special subset rules)
  "sm115": (cards) => {
    const cardNumber = parseInt(cards.number.split('/')[0])
    if (cardNumber > 68) {
      // Shiny Vault cards - special rules
      return {
        holo: { exists: true, source: "override", confidence: "tcgplayer_prices_reverse_holofoil_high" },
        normal: { exists: false, source: "override", confidence: "tcgplayer_prices_reverse_holofoil_high" },
        reverse: { exists: false, source: "override", confidence: "tcgplayer_prices_reverse_holofoil_high" }
      }
    }
    return {}
  },
  
  // Shining Legends
  "sm35": (cards) => {
    if (cards.set_name.includes("Shining ")) {
      return {
        holo: { exists: true, source: "override", confidence: "tcgplayer_prices_reverse_holofoil_high" },
        normal: { exists: false, source: "override", confidence: "tcgplayer_prices_reverse_holofoil_high" },
        reverse: { exists: false, source: "override", confidence: "tcgplayer_prices_reverse_holofoil_high" }
      }
    }
    return {}
  },
  
  // 151 Set (special reprint sets)
  "sv3pt5": (cards) => {
    const cardNumber = parseInt(cards.number.split('/')[0])
    if (cardNumber > 151) {
      // Secret rare cards
      return {
        holo: { exists: true, source: "override", confidence: "tcgplayer_prices_reverse_holofoil_high" },
        normal: { exists: false, source: "override", confidence: "tcgplayer_prices_reverse_holofoil_high" },
        reverse: { exists: false, source: "override", confidence: "tcgplayer_prices_reverse_holofoil_high" }
      }
    }
    return {}
  }
}

/**
 * Apply Theme Deck overrides
 */
function applyThemeDeckOverrides(
  cards: CardInput, 
  productSources: ProductSource,
  existingVariants: Partial<VariantResult["variants"]>
): Partial<VariantResult["variants"]> {
  
  if (!productSources.includes("Theme Deck")) {
    return {}
  }
  
  const overrides: Partial<VariantResult["variants"]> = {}
  
  // If cards is normally holo-only, Theme Deck might have non-holo version
  if (existingVariants.holo?.exists && !existingVariants.normal?.exists) {
    const raritySupportsThemeDeck = [
      "Rare Holo", "Rare Holo EX", "Rare Holo GX", 
      "Rare Holo V", "Rare Holo VMAX"
    ].some(pattern => cards.rarity.includes(pattern))
    
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

/**
 * Apply Promo/Tin overrides
 */
function applyPromoOverrides(
  cards: CardInput,
  productSources: ProductSource,
  existingVariants: Partial<VariantResult["variants"]>
): Partial<VariantResult["variants"]> {
  
  const promoSources = ["Promo/Tin", "Promo", "Tin", "Collection Box"]
  if (!promoSources.some(source => productSources.includes(source))) {
    return {}
  }
  
  const overrides: Partial<VariantResult["variants"]> = {}
  
  // Promo cards often come in special finishes
  if (cards.rarity.includes("Promo")) {
    // Most promo cards are holo regardless of original rarity
    if (!existingVariants.holo?.exists) {
      overrides.holo = {
        exists: true,
        source: "override", 
        confidence: "cardmarket_prices_reverse_holo_low"
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

/**
 * Apply Starter Set/Deck overrides
 */
function applyStarterOverrides(
  cards: CardInput,
  productSources: ProductSource
): Partial<VariantResult["variants"]> {
  
  const starterSources = ["Starter Deck", "Theme Deck", "Battle Deck"]
  if (!starterSources.some(source => productSources.includes(source))) {
    return {}
  }
  
  const overrides: Partial<VariantResult["variants"]> = {}
  
  // Starter decks typically have non-holo versions of most cards
  if (["Common", "Uncommon", "Rare"].includes(cards.rarity)) {
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

/**
 * Apply sets-specific overrides
 */
function applySetSpecificOverrides(cards: CardInput): Partial<VariantResult["variants"]> {
  const override = SET_SPECIFIC_OVERRIDES[cards.sets.set_id.toLowerCase()]
  return override ? override(cards) : {}
}

/**
 * Known cards corrections for specific problem cards
 */
const KNOWN_CORRECTIONS: Record<string, Partial<VariantResult["variants"]>> = {
  // Example: Specific cards with known incorrect API data
  "sv3pt5-4": { // Charmander from 151 sets
    normal: { exists: true, source: "override", confidence: "tcgplayer_prices_reverse_holofoil_high" },
    holo: { exists: false, source: "override", confidence: "tcgplayer_prices_reverse_holofoil_high" },
    reverse: { exists: true, source: "override", confidence: "tcgplayer_prices_reverse_holofoil_high" }
  }
  
  // Add more known corrections as discovered
}

/**
 * Apply known corrections for specific cards
 */
function applyKnownCorrections(cards: CardInput): Partial<VariantResult["variants"]> {
  return KNOWN_CORRECTIONS[cards.set_id] || {}
}

/**
 * Apply rarity set_name standardization corrections
 */
function applyRarityCorrections(cards: CardInput): Partial<VariantResult["variants"]> {
  // Handle variant rarity set_name that might confuse era rules
  const correctedRarity = standardizeRarityName(cards.rarity)
  
  if (correctedRarity !== cards.rarity) {
    // If rarity was corrected, we might need to re-evaluate
    // For now, just return empty - this would require importing era rules
    // which could create circular dependencies
    return {}
  }
  
  return {}
}

/**
 * Standardize rarity set_name variants
 */
function standardizeRarityName(rarity: string): string {
  const corrections: Record<string, string> = {
    "Holo Rare": "Rare Holo",
    "Ultra Rare": "Rare Ultra",
    "Secret Rare": "Rare Secret",
    "Rainbow Rare": "Rare Rainbow"
  }
  
  return corrections[rarity] || rarity
}

/**
 * Apply Japanese sets adaptation overrides
 */
function applyJapaneseAdaptationOverrides(cards: CardInput): Partial<VariantResult["variants"]> {
  // Some Japanese exclusive variants don't exist in English
  const japaneseOnlyPatterns = [
    "Character Rare", "Character Super Rare", "Special Art Rare"
  ]
  
  if (japaneseOnlyPatterns.some(pattern => cards.rarity.includes(pattern))) {
    return {
      // These rarity typically don't have English reverse holo
      reverse: { exists: false, source: "override", confidence: "medium" }
    }
  }
  
  return {}
}

/**
 * Merge multiple override results
 */
function mergeOverrides(overrideList: Array<Partial<VariantResult["variants"]>>): Partial<VariantResult["variants"]> {
  const merged: Partial<VariantResult["variants"]> = {}
  
  overrideList.forEach(override => {
    Object.keys(override).forEach(finish => {
      const finishKey = finish as keyof VariantResult["variants"]
      const variant = override[finishKey]
      
      if (variant) {
        // If variant says it exists, always apply
        if (variant.exists) {
          merged[finishKey] = variant
        } 
        // If variant says it doesn't exist, only apply if not already sets to exist
        else if (!merged[finishKey]?.exists) {
          merged[finishKey] = variant
        }
      }
    })
  })
  
  return merged
}

/**
 * Main override rules application function
 */
export function applyOverrideRules(
  cards: CardInput,
  productSources: ProductSource,
  existingVariants: Partial<VariantResult["variants"]>
): Partial<VariantResult["variants"]> {
  
  // Apply different override type
  const themeDeckOverrides = applyThemeDeckOverrides(cards, productSources, existingVariants)
  const promoOverrides = applyPromoOverrides(cards, productSources, existingVariants)
  const starterOverrides = applyStarterOverrides(cards, productSources)
  const setSpecificOverrides = applySetSpecificOverrides(cards)
  const correctionOverrides = applyKnownCorrections(cards)
  const rarityOverrides = applyRarityCorrections(cards)
  const japaneseOverrides = applyJapaneseAdaptationOverrides(cards)
  
  // Merge all overrides (later ones take precedence for conflicts)
  const overrides = mergeOverrides([
    themeDeckOverrides,
    promoOverrides, 
    starterOverrides,
    setSpecificOverrides,
    correctionOverrides,
    rarityOverrides,
    japaneseOverrides
  ])
  
  return overrides
}

/**
 * Merge override results with existing variants from hard/era rules
 */
export function mergeWithOverrides(
  baseVariants: VariantResult["variants"],
  overrides: Partial<VariantResult["variants"]>
): VariantResult["variants"] {
  
  const final = { ...baseVariants }
  
  Object.keys(overrides).forEach(finish => {
    const finishKey = finish as keyof VariantResult["variants"]
    const override = overrides[finishKey]
    
    if (override) {
      // Override can add variants that don't exist
      if (override.exists && !final[finishKey].exists) {
        final[finishKey] = override
      }
      // Override can remove variants with tcgplayer_prices_reverse_holofoil_high confidence
      else if (!override.exists && override.confidence === "tcgplayer_prices_reverse_holofoil_high") {
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

/**
 * Get numeric confidence level for comparison
 */
function getConfidenceLevel(confidence?: "tcgplayer_prices_reverse_holofoil_high" | "medium" | "cardmarket_prices_reverse_holo_low"): number {
  switch (confidence) {
    case "tcgplayer_prices_reverse_holofoil_high": return 3
    case "medium": return 2
    case "cardmarket_prices_reverse_holo_low": return 1
    default: return 0
  }
}

/**
 * Generate explanations for override rule applications
 */
export function generateOverrideExplanations(
  cards: CardInput,
  productSources: ProductSource,
  appliedOverrides: Partial<VariantResult["variants"]>
): string[] {
  
  const explanations: string[] = []
  
  if (productSources.includes("Theme Deck") && appliedOverrides.normal?.exists) {
    explanations.push("Theme Deck product source adds non-holo variant")
  }
  
  if (productSources.some(source => ["Promo", "Promo/Tin"].includes(source)) && appliedOverrides.holo?.exists) {
    explanations.push("Promo cards typically come in holo finish")
  }
  
  if (SET_SPECIFIC_OVERRIDES[cards.sets.set_id.toLowerCase()]) {
    explanations.push(`Special rules applied for ${cards.sets.set_id} sets`)
  }
  
  if (KNOWN_CORRECTIONS[cards.set_id]) {
    explanations.push("Known data correction applied")
  }
  
  return explanations
}

/**
 * Validate override rules for potential conflicts
 */
export function validateOverrides(
  cards: CardInput,
  overrides: Partial<VariantResult["variants"]>
): string[] {
  const warnings: string[] = []
  
  // Check for conflicting overrides
  if (overrides.normal?.exists && overrides.holo?.exists && 
      overrides.normal.source === "override" && overrides.holo.source === "override") {
    warnings.push("Conflicting overrides: both normal and holo marked as existing")
  }
  
  // Check for suspicious override combinations
  if (overrides.reverse?.exists === false && cards.sets.releaseDate > "2002/05/24") {
    warnings.push("Override removing reverse holo from post-Legendary Collection cards")
  }
  
  return warnings
}
