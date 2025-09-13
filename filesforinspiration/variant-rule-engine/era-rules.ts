/**
 * Era-Based Variant Inference Rules
 * 
 * Fallback logic when hard API signals are missing. These rules apply era-specific 
 * patterns and rarity-based conventions to infer which variants should exist.
 */

import type { CardInput, VariantResult, Era, VariantFlag } from './types'
import { hasReverseHoloDefault, has1stEditionVariants, isScarletVioletSingleStarHolo } from './era-mapping'

/**
 * Check if rarity indicates ultra rare cards
 */
function isUltraRare(rarity: string): boolean {
  const ultraRarePatterns = [
    "EX", "GX", "V", "VMAX", "VSTAR", "ex", 
    "Secret", "Gold", "Rainbow", "Special Illustration",
    "Illustration Rare", "Full Art", "Alt Art", "Ultra Rare",
    "Double Rare", "LEGEND", "Prime", "LV.X", "BREAK"
  ]
  
  return ultraRarePatterns.some(pattern => rarity.includes(pattern))
}

/**
 * Check if rarity indicates secret rare
 */
function isSecretRare(rarity: string): boolean {
  const secretPatterns = ["Secret", "Gold", "Rainbow"]
  return secretPatterns.some(pattern => rarity.includes(pattern))
}

/**
 * Check if cards is from a special pattern sets
 */
function isSpecialPatternSet(setId: string): { isPrismaticEvolutions: boolean; isBlackBolt: boolean; isWhiteFlare: boolean } {
  const setIdLower = setId.toLowerCase()
  return {
    isPrismaticEvolutions: setIdLower === 'sv8pt5',
    isBlackBolt: setIdLower === 'zsv10pt5',
    isWhiteFlare: setIdLower === 'rsv10pt5'
  }
}

/**
 * Check if cards is Pokemon (not Trainer or Energy)
 */
function isPokemonCard(cards: CardInput): boolean {
  // For rule engine, we need to infer from rarity since type aren't always available
  // Pokemon cards typically have these rarity, while Trainers/Energy have different patterns
  const pokemonRarities = ['Common', 'Uncommon', 'Rare', 'Rare Holo', 'Double Rare', 'Ultra Rare', 'Illustration Rare', 'Special Illustration Rare']
  const trainerEnergyRarities = ['Trainer', 'Special Energy', 'Basic Energy']
  
  // If explicitly trainer/energy rarity, return false
  if (trainerEnergyRarities.some(rarity => cards.rarity.includes(rarity))) {
    return false
  }
  
  // Default to Pokemon if standard rarity
  return pokemonRarities.some(rarity => cards.rarity.includes(rarity)) ||
         !trainerEnergyRarities.some(rarity => cards.rarity.includes(rarity))
}

/**
 * Apply Scarlet & Violet era rules
 */
function applyScarletVioletRules(cards: CardInput): Partial<VariantResult["variants"]> {
  const variants: Partial<VariantResult["variants"]> = {}
  const cardNumber = parseInt(cards.number.split('/')[0]) || 0
  const specialSets = isSpecialPatternSet(cards.sets.set_id)
  const isAnySpecialSet = specialSets.isPrismaticEvolutions || specialSets.isBlackBolt || specialSets.isWhiteFlare
  
  
  // Handle special pattern sets
  if (isAnySpecialSet) {
    const isPokemon = isPokemonCard(cards)
    const isSecretRare = (specialSets.isPrismaticEvolutions && cardNumber > 131) ||
                        ((specialSets.isBlackBolt || specialSets.isWhiteFlare) && cardNumber > 86)
    
    if (isSecretRare) {
      // Secret rares: always holo only
      variants.holo = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
      variants.normal = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
      variants.reverse = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
      variants.pokeballPattern = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
      variants.masterballPattern = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
    } else if (specialSets.isPrismaticEvolutions) {
      // Prismatic Evolutions rules
      if (isPokemon && !cards.rarity.includes('ex') && !cards.rarity.includes('ACE SPEC')) {
        // Pokemon (except ex and ACE SPEC): Normal, Reverse Holo, Poké Ball, Master Ball
        variants.normal = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.reverse = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.holo = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.pokeballPattern = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.masterballPattern = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
      } else if (isPokemon && (cards.rarity.includes('ex') || cards.rarity.includes('ACE SPEC'))) {
        // ex and ACE SPEC cards: Normal, Reverse Holo, Poké Ball - NO Master Ball
        variants.normal = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.reverse = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.holo = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.pokeballPattern = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.masterballPattern = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
      } else {
        // Trainer and Basic Energy: Normal, Reverse Holo, Poké Ball - NO Master Ball
        variants.normal = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.reverse = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.holo = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.pokeballPattern = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.masterballPattern = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
      }
    } else if (specialSets.isBlackBolt || specialSets.isWhiteFlare) {
      // Black Bolt & White Flare rules
      if (isPokemon && ["Common", "Uncommon"].includes(cards.rarity)) {
        // Pokemon (Common/Uncommon): Normal, Reverse Holo, Poké Ball, Master Ball
        variants.normal = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.reverse = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.holo = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.pokeballPattern = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.masterballPattern = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
      } else if (isPokemon && ["Rare", "Rare Holo"].includes(cards.rarity)) {
        // Pokemon (Rare/Rare Holo): Holo, Reverse Holo, Poké Ball, Master Ball - NO normal
        variants.normal = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.reverse = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.holo = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.pokeballPattern = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.masterballPattern = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
      } else if (!isPokemon && !cards.rarity.includes('Special Energy')) {
        // Trainer: Normal, Reverse Holo, Poké Ball - NO Master Ball
        variants.normal = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.reverse = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.holo = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.pokeballPattern = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.masterballPattern = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
      } else if (!isPokemon && cards.rarity.includes('Basic Energy')) {
        // Basic Energy: Normal, Reverse Holo - NO patterns
        variants.normal = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.reverse = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.holo = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.pokeballPattern = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.masterballPattern = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
      } else if (isUltraRare(cards.rarity)) {
        // Ultra rare cards: always holo only
        variants.holo = { exists: true, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.normal = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.reverse = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.pokeballPattern = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
        variants.masterballPattern = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
      }
    }
  } else {
    // Regular Scarlet & Violet sets - no pattern variants
    variants.pokeballPattern = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
    variants.masterballPattern = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
    
    if (cards.rarity === "Rare") {
      // Single-star rares are holo by default, no normal in boosters
      variants.holo = { exists: true, source: "rule", confidence: "medium" }
      variants.reverse = { exists: true, source: "rule", confidence: "medium" }
      variants.normal = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
    } else if (cards.rarity === "Rare Holo") {
      // Traditional holo rares
      variants.holo = { exists: true, source: "rule", confidence: "medium" }
      variants.reverse = { exists: true, source: "rule", confidence: "medium" }
      variants.normal = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
    } else if (["Common", "Uncommon"].includes(cards.rarity)) {
      // Commons/Uncommons follow traditional patterns
      variants.normal = { exists: true, source: "rule", confidence: "medium" }
      variants.reverse = { exists: true, source: "rule", confidence: "medium" }
      variants.holo = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
    } else if (isUltraRare(cards.rarity)) {
      // Ultra rares (ex, Special Illustration, etc.)
      variants.holo = { exists: true, source: "rule", confidence: "medium" }
      variants.normal = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
      variants.reverse = { exists: false, source: "rule", confidence: "medium" }
    }
  }
  
  return variants
}

/**
 * Apply Sword & Shield era rules
 */
function applySwordShieldRules(cards: CardInput): Partial<VariantResult["variants"]> {
  const variants: Partial<VariantResult["variants"]> = {}
  
  // No pattern variants in Sword & Shield era
  variants.pokeballPattern = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
  variants.masterballPattern = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
  
  if (cards.rarity === "Rare") {
    // Non-holo rares: normal + reverse, no holo in boosters
    variants.normal = { exists: true, source: "rule", confidence: "medium" }
    variants.reverse = { exists: true, source: "rule", confidence: "medium" }
    variants.holo = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
  } else if (cards.rarity === "Rare Holo") {
    // Holo rares: holo + reverse, no normal in boosters
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.reverse = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
  } else if (["Common", "Uncommon"].includes(cards.rarity)) {
    variants.normal = { exists: true, source: "rule", confidence: "medium" }
    variants.reverse = { exists: true, source: "rule", confidence: "medium" }
    variants.holo = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
  } else if (isUltraRare(cards.rarity)) {
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
    variants.reverse = { exists: false, source: "rule", confidence: "medium" }
  }
  
  return variants
}

/**
 * Apply Sun & Moon era rules
 */
function applySunMoonRules(cards: CardInput): Partial<VariantResult["variants"]> {
  // Very similar to Sword & Shield rules
  const variants = applySwordShieldRules(cards)
  
  // GX cards are always holo, no reverse
  if (cards.rarity.includes("GX")) {
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
    variants.reverse = { exists: false, source: "rule", confidence: "medium" }
  }
  
  return variants
}

/**
 * Apply XY era rules
 */
function applyXYRules(cards: CardInput): Partial<VariantResult["variants"]> {
  const variants = applySwordShieldRules(cards) // Base on S&S patterns
  
  // Mega Evolution cards
  if (cards.set_name.includes("M ") || cards.rarity.includes("Mega")) {
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
    variants.reverse = { exists: false, source: "rule", confidence: "medium" }
  }
  
  // Break cards
  if (cards.rarity.includes("BREAK")) {
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
    variants.reverse = { exists: false, source: "rule", confidence: "medium" }
  }
  
  return variants
}

/**
 * Apply Black & White era rules
 */
function applyBlackWhiteRules(cards: CardInput): Partial<VariantResult["variants"]> {
  const variants = applySwordShieldRules(cards) // Base patterns
  
  // EX cards are always holo
  if (cards.rarity.includes("EX")) {
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
    variants.reverse = { exists: false, source: "rule", confidence: "medium" }
  }
  
  return variants
}

/**
 * Apply HGSS era rules
 */
function applyHGSSRules(cards: CardInput): Partial<VariantResult["variants"]> {
  const variants = applySwordShieldRules(cards) // Base patterns
  
  // LEGEND cards (two-cards sets)
  if (cards.rarity.includes("LEGEND")) {
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
    variants.reverse = { exists: false, source: "rule", confidence: "medium" }
  }
  
  // Prime cards
  if (cards.set_name.includes(" Prime") || cards.rarity.includes("Prime")) {
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
    variants.reverse = { exists: false, source: "rule", confidence: "medium" }
  }
  
  return variants
}

/**
 * Apply DP era rules
 */
function applyDPRules(cards: CardInput): Partial<VariantResult["variants"]> {
  const variants = applySwordShieldRules(cards) // Base patterns
  
  // LV.X cards
  if (cards.set_name.includes(" LV.X") || cards.rarity.includes("LV.X")) {
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
    variants.reverse = { exists: false, source: "rule", confidence: "medium" }
  }
  
  return variants
}

/**
 * Apply EX era rules
 */
function applyEXRules(cards: CardInput): Partial<VariantResult["variants"]> {
  const variants = applySwordShieldRules(cards) // Base patterns
  
  // ex cards (lowercase)
  if (cards.set_name.includes(" ex") || cards.rarity.includes("ex")) {
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
    variants.reverse = { exists: false, source: "rule", confidence: "medium" }
  }
  
  // No 1st Edition in EX era
  variants.firstEdNormal = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
  variants.firstEdHolo = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
  
  return variants
}

/**
 * Apply WotC era rules (most complex due to evolution of printing)
 */
function applyWotCRules(cards: CardInput, releaseDate: string): Partial<VariantResult["variants"]> {
  const variants: Partial<VariantResult["variants"]> = {}
  
  // No pattern variants in WotC era
  variants.pokeballPattern = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
  variants.masterballPattern = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
  
  // Check if API signals indicate this is a holo-only cards
  const hasHoloApiSignal = !!(cards.tcgplayer?.cardmarket_prices?.tcgplayer_prices_reverse_holofoil || cards.tcgplayer?.cardmarket_prices?.unlimitedHolofoil)
  const hasNormalApiSignal = !!(cards.tcgplayer?.cardmarket_prices?.normal || cards.tcgplayer?.cardmarket_prices?.legalities_unlimited || cards.tcgplayer?.cardmarket_prices?.unlimitedNormal)
  
  // 1st Edition availability for most WotC sets
  if (has1stEditionVariants("WotC")) {
    const is1stEditionSet = isLikely1stEditionSet(cards.sets.set_id)
    
    if (is1stEditionSet) {
      if (cards.rarity === "Rare" || cards.rarity === "Rare Holo") {
        variants.firstEdHolo = { exists: true, source: "rule", confidence: "medium" }
      }
      if (cards.rarity === "Rare" && !hasHoloApiSignal) {
        variants.firstEdNormal = { exists: true, source: "rule", confidence: "medium" }
      }
      if (["Common", "Uncommon"].includes(cards.rarity)) {
        variants.firstEdNormal = { exists: true, source: "rule", confidence: "medium" }
      }
    } else {
      variants.firstEdNormal = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
      variants.firstEdHolo = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
    }
  }
  
  // Reverse holo introduced with Legendary Collection (2002)
  const hasReverse = hasReverseHoloDefault("WotC", releaseDate)
  if (hasReverse && !isSecretRare(cards.rarity)) {
    variants.reverse = { exists: true, source: "rule", confidence: "medium" }
  } else {
    variants.reverse = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
  }
  
  // Standard WotC patterns - but defer to API signals when available
  if (cards.rarity === "Rare") {
    // If API shows holo-only pricing, treat as holo-only cards
    if (hasHoloApiSignal && !hasNormalApiSignal) {
      variants.holo = { exists: true, source: "rule", confidence: "medium" }
      variants.normal = { exists: false, source: "rule", confidence: "medium" }
    } else {
      // Default WotC rare pattern: normal only (no holo in boosters)
      variants.normal = { exists: true, source: "rule", confidence: "medium" }
      variants.holo = { exists: false, source: "rule", confidence: "medium" }
    }
  } else if (cards.rarity === "Rare Holo") {
    variants.holo = { exists: true, source: "rule", confidence: "medium" }
    variants.normal = { exists: false, source: "rule", confidence: "medium" }
  } else if (["Common", "Uncommon"].includes(cards.rarity)) {
    variants.normal = { exists: true, source: "rule", confidence: "medium" }
    variants.holo = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
  }
  
  return variants
}

/**
 * Fallback rules for unknown eras
 */
function applyFallbackRules(cards: CardInput): Partial<VariantResult["variants"]> {
  const variants: Partial<VariantResult["variants"]> = {}
  
  // No pattern variants in unknown eras (conservative)
  variants.pokeballPattern = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
  variants.masterballPattern = { exists: false, source: "rule", confidence: "tcgplayer_prices_reverse_holofoil_high" }
  
  // Conservative fallback based on release set_release_date
  const releaseYear = new Date(cards.sets.releaseDate).getFullYear()
  
  if (releaseYear >= 2020) {
    // Modern era: assume S&S-style rules
    return applySwordShieldRules(cards)
  } else if (releaseYear >= 2003) {
    // Post-WotC: assume reverse holo exists, no 1st edition
    variants.reverse = { exists: true, source: "rule", confidence: "cardmarket_prices_reverse_holo_low" }
    variants.firstEdNormal = { exists: false, source: "rule", confidence: "medium" }
    variants.firstEdHolo = { exists: false, source: "rule", confidence: "medium" }
  } else {
    // Early era: conservative WotC-style
    variants.reverse = { exists: false, source: "rule", confidence: "cardmarket_prices_reverse_holo_low" }
  }
  
  // Basic rarity patterns
  if (["Common", "Uncommon"].includes(cards.rarity)) {
    variants.normal = { exists: true, source: "rule", confidence: "cardmarket_prices_reverse_holo_low" }
    variants.holo = { exists: false, source: "rule", confidence: "medium" }
  } else if (cards.rarity === "Rare") {
    variants.normal = { exists: true, source: "rule", confidence: "cardmarket_prices_reverse_holo_low" }
    variants.holo = { exists: false, source: "rule", confidence: "cardmarket_prices_reverse_holo_low" }
  } else if (cards.rarity === "Rare Holo") {
    variants.holo = { exists: true, source: "rule", confidence: "cardmarket_prices_reverse_holo_low" }
    variants.normal = { exists: false, source: "rule", confidence: "cardmarket_prices_reverse_holo_low" }
  }
  
  return variants
}

/**
 * Main era rules application function
 */
export function applyEraRules(cards: CardInput, era: Era): Partial<VariantResult["variants"]> {
  switch (era) {
    case "Scarlet & Violet":
      return applyScarletVioletRules(cards)
    case "Sword & Shield":
      return applySwordShieldRules(cards)
    case "Sun & Moon":
      return applySunMoonRules(cards)
    case "XY":
      return applyXYRules(cards)
    case "Black & White":
      return applyBlackWhiteRules(cards)
    case "HGSS":
      return applyHGSSRules(cards)
    case "DP":
      return applyDPRules(cards)
    case "EX":
      return applyEXRules(cards)
    case "WotC":
      return applyWotCRules(cards, cards.sets.releaseDate)
    default:
      return applyFallbackRules(cards)
  }
}

/**
 * Adjust era rule confidence based on patterns
 */
export function adjustEraRuleConfidence(
  baseConfidence: "tcgplayer_prices_reverse_holofoil_high" | "medium" | "cardmarket_prices_reverse_holo_low",
  era: Era,
  rarity: string
): "tcgplayer_prices_reverse_holofoil_high" | "medium" | "cardmarket_prices_reverse_holo_low" {
  // Higher confidence for well-established patterns
  if (era === "Scarlet & Violet" && rarity === "Rare") {
    return "tcgplayer_prices_reverse_holofoil_high" // S&V single-star rare rules are very consistent
  }
  
  if (era === "WotC" && rarity.includes("Holo")) {
    return "medium" // WotC holo patterns are fairly consistent
  }
  
  // Lower confidence for transitional periods
  if (era === "EX" && rarity === "Rare") {
    return "cardmarket_prices_reverse_holo_low" // Early EX era had some variations
  }
  
  return baseConfidence
}

/**
 * Generate explanations for era rule applications
 */
export function generateEraRuleExplanations(
  cards: CardInput,
  era: Era,
  appliedVariants: Partial<VariantResult["variants"]>
): string[] {
  const explanations: string[] = []
  
  if (era === "Scarlet & Violet" && cards.rarity === "Rare") {
    explanations.push("S&V single-star rares are holo by default and also have reverse; no normal in boosters")
  } else if (era === "Sword & Shield") {
    if (cards.rarity === "Rare") {
      explanations.push("SWSH 'Rare' cards have normal + reverse variants; no holo in boosters")
    } else if (cards.rarity === "Rare Holo") {
      explanations.push("SWSH 'Rare Holo' cards have holo + reverse variants; no normal in boosters")
    }
  } else if (era === "WotC") {
    if (appliedVariants.firstEdNormal?.exists || appliedVariants.firstEdHolo?.exists) {
      explanations.push("WotC era sets supports 1st Edition variants")
    }
    if (appliedVariants.reverse?.exists === false) {
      explanations.push("Pre-Legendary Collection sets: no reverse holo")
    } else if (appliedVariants.reverse?.exists === true) {
      explanations.push("Post-Legendary Collection sets: reverse holo available")
    }
  }
  
  // Add rarity-based explanations
  if (isUltraRare(cards.rarity)) {
    explanations.push("Ultra rare cards typically holo-only")
  }
  
  return explanations
}

/**
 * Helper function to check if sets likely supports 1st Edition
 */
function isLikely1stEditionSet(setId: string): boolean {
  const firstEditionSets = [
    "base1", "base2", "base3", "base4", "base5",
    "gym1", "gym2", "neo1", "neo2", "neo3", "neo4",
    "ecard1", "ecard2", "ecard3"
  ]
  
  return firstEditionSets.includes(setId.toLowerCase())
}
