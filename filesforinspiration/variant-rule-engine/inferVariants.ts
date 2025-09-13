/**
 * Core Variant Rule Engine
 * 
 * Main function that applies all rules in hierarchical order to determine
 * which cards variants exist for a given Pokemon TCG cards.
 */

import type { CardInput, VariantResult, ProductSource, Finish, VariantFlag } from './types'
import { detectEra } from './era-mapping'
import { applyHardRules, generateHardRuleExplanations } from './hard-rules'
import { applyEraRules, generateEraRuleExplanations } from './era-rules'
import { applyOverrideRules, mergeWithOverrides, generateOverrideExplanations } from './override-rules'

/**
 * Validate cards input for required fields
 */
function validateCardInput(cards: any): cards is CardInput {
  return !!(
    cards?.set_id &&
    cards?.set_name &&
    cards?.number &&
    cards?.rarity &&
    cards?.sets?.set_id &&
    cards?.sets?.set_series &&
    cards?.sets?.releaseDate
  )
}

/**
 * Initialize empty variant flags
 */
function initializeVariants(): VariantResult["variants"] {
  return {
    normal: { exists: false },
    holo: { exists: false },
    reverse: { exists: false },
    firstEdNormal: { exists: false },
    firstEdHolo: { exists: false },
    pokeballPattern: { exists: false },
    masterballPattern: { exists: false }
  }
}

/**
 * Merge partial variant results with full variant results
 */
function mergeVariants(
  base: VariantResult["variants"],
  partial: Partial<VariantResult["variants"]>
): VariantResult["variants"] {
  const merged = { ...base }
  
  Object.keys(partial).forEach(finish => {
    const finishKey = finish as Finish
    const variant = partial[finishKey]
    
    if (variant) {
      merged[finishKey] = variant
    }
  })
  
  return merged
}

/**
 * Apply rule precedence: Hard Rules > Era Rules > Override Rules
 */
function applyRulePrecedence(
  hardRules: Partial<VariantResult["variants"]>,
  eraRules: Partial<VariantResult["variants"]>,
  overrideRules: Partial<VariantResult["variants"]>
): VariantResult["variants"] {
  
  // Start with empty variants
  let variants = initializeVariants()
  
  // Apply era rules first (lowest precedence among rule type)
  variants = mergeVariants(variants, eraRules)
  
  // Override rules can add or modify variants
  variants = mergeWithOverrides(variants, overrideRules)
  
  // Hard rules take precedence over everything
  variants = mergeVariants(variants, hardRules)
  
  return variants
}

/**
 * Collect explanations from all rule sources
 */
function collectExplanations(
  cards: CardInput,
  era: VariantResult["era"],
  productSources: ProductSource,
  hardRuleVariants: Partial<VariantResult["variants"]>,
  eraRuleVariants: Partial<VariantResult["variants"]>,
  overrideRuleVariants: Partial<VariantResult["variants"]>
): string[] {
  
  const explanations: string[] = []
  
  // Hard rule explanations (API signals)
  const hardExplanations = generateHardRuleExplanations(cards, hardRuleVariants)
  explanations.push(...hardExplanations)
  
  // Era rule explanations
  const eraExplanations = generateEraRuleExplanations(cards, era, eraRuleVariants)
  explanations.push(...eraExplanations)
  
  // Override rule explanations
  const overrideExplanations = generateOverrideExplanations(cards, productSources, overrideRuleVariants)
  explanations.push(...overrideExplanations)
  
  // Remove duplicates and empty explanations
  const filtered = explanations.filter(exp => exp && exp.trim().length > 0)
  return Array.from(new Set(filtered))
}

/**
 * Main variant inference function
 * 
 * @param cards - Pokemon TCG API cards object
 * @param productSources - Optional array of product sources (defaults to ["Booster"])
 * @returns Complete variant analysis result
 */
export function inferVariants(
  cards: CardInput,
  productSources: ProductSource = ["Booster"]
): VariantResult {
  
  // Validate input
  if (!validateCardInput(cards)) {
    throw new Error(`Invalid cards input: missing required fields`)
  }
  
  // Ensure productSources is valid
  const validProductSources = Array.isArray(productSources) ? productSources : ["Booster"]
  
  try {
    // Step 1: Detect era
    const era = detectEra(cards)
    
    // Step 2: Apply hard rules (highest precedence)
    const hardRuleVariants = applyHardRules(cards)
    
    // Step 3: Apply era rules (medium precedence)
    const eraRuleVariants = applyEraRules(cards, era)
    
    // Step 4: Apply override rules (lowest precedence)
    const overrideRuleVariants = applyOverrideRules(cards, validProductSources, {
      ...eraRuleVariants,
      ...hardRuleVariants
    })
    
    // Step 5: Merge all rules with proper precedence
    const finalVariants = applyRulePrecedence(
      hardRuleVariants,
      eraRuleVariants,
      overrideRuleVariants
    )
    
    // Step 6: Collect explanations
    const explanations = collectExplanations(
      cards,
      era,
      validProductSources,
      hardRuleVariants,
      eraRuleVariants,
      overrideRuleVariants
    )
    
    // Step 7: Build final result
    const result: VariantResult = {
      set_id: cards.set_id,
      setId: cards.sets.set_id,
      era,
      rarity: cards.rarity,
      variants: finalVariants,
      printSources: validProductSources,
      explanations
    }
    
    return result
    
  } catch (error) {
    throw new Error(`Variant inference failed for cards ${cards.set_id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Batch process multiple cards for efficiency
 */
export function inferVariantsBatch(
  cards: CardInput[],
  productSourcesMap?: Map<string, ProductSource>
): Map<string, VariantResult> {
  
  const results = new Map<string, VariantResult>()
  
  cards.forEach(cards => {
    try {
      const productSources = productSourcesMap?.get(cards.set_id) || ["Booster"]
      const analysis = inferVariants(cards, productSources)
      results.set(cards.set_id, analysis)
    } catch (error) {
      console.error(`Failed to analyze cards ${cards.set_id}:`, error)
      // Continue processing other cards even if one fails
    }
  })
  
  return results
}

/**
 * Validate that a variant result is well-formed
 */
export function validateVariantResult(result: any): result is VariantResult {
  if (!result || typeof result !== 'object') return false
  
  // Check required fields
  if (!result.set_id || !result.setId || !result.era || !result.rarity) return false
  
  // Check variants structure
  if (!result.variants || typeof result.variants !== 'object') return false
  
  const requiredVariants: Finish[] = ['normal', 'holo', 'reverse', 'firstEdNormal', 'firstEdHolo', 'pokeballPattern', 'masterballPattern']
  for (const variant of requiredVariants) {
    const flag = result.variants[variant]
    if (!flag || typeof flag.exists !== 'boolean') return false
    
    if (flag.exists && (!flag.source || !flag.confidence)) return false
  }
  
  // Check arrays
  if (!Array.isArray(result.printSources) || !Array.isArray(result.explanations)) return false
  
  return true
}

/**
 * Sanitize variant result for safe usage
 */
export function sanitizeVariantResult(result: any): VariantResult | null {
  if (!validateVariantResult(result)) return null
  
  // Ensure all required fields are present with fallbacks
  return {
    set_id: result.set_id,
    setId: result.setId,
    era: result.era,
    rarity: result.rarity,
    variants: {
      normal: result.variants.normal || { exists: false },
      holo: result.variants.holo || { exists: false },
      reverse: result.variants.reverse || { exists: false },
      firstEdNormal: result.variants.firstEdNormal || { exists: false },
      firstEdHolo: result.variants.firstEdHolo || { exists: false },
      pokeballPattern: result.variants.pokeballPattern || { exists: false },
      masterballPattern: result.variants.masterballPattern || { exists: false }
    },
    printSources: Array.isArray(result.printSources) ? result.printSources : ['Booster'],
    explanations: Array.isArray(result.explanations) ? result.explanations : []
  }
}

/**
 * Create a summary of the analysis for debugging
 */
export function createAnalysisSummary(result: VariantResult): {
  existingVariants: Finish[]
  apiVariants: Finish[]
  ruleVariants: Finish[]
  overrideVariants: Finish[]
  confidence: { tcgplayer_prices_reverse_holofoil_high: number; medium: number; cardmarket_prices_reverse_holo_low: number }
} {
  const existingVariants: Finish[] = []
  const apiVariants: Finish[] = []
  const ruleVariants: Finish[] = []
  const overrideVariants: Finish[] = []
  const confidence = { tcgplayer_prices_reverse_holofoil_high: 0, medium: 0, cardmarket_prices_reverse_holo_low: 0 }
  
  Object.keys(result.variants).forEach(finish => {
    const finishKey = finish as Finish
    const variant = result.variants[finishKey]
    
    if (variant.exists) {
      existingVariants.push(finishKey)
      
      if (variant.source === 'api') apiVariants.push(finishKey)
      else if (variant.source === 'rule') ruleVariants.push(finishKey)
      else if (variant.source === 'override') overrideVariants.push(finishKey)
      
      if (variant.confidence === 'tcgplayer_prices_reverse_holofoil_high') confidence.tcgplayer_prices_reverse_holofoil_high++
      else if (variant.confidence === 'medium') confidence.medium++
      else if (variant.confidence === 'cardmarket_prices_reverse_holo_low') confidence.cardmarket_prices_reverse_holo_low++
    }
  })
  
  return {
    existingVariants,
    apiVariants,
    ruleVariants,
    overrideVariants,
    confidence
  }
}

/**
 * Check if analysis has tcgplayer_prices_reverse_holofoil_high confidence across all variants
 */
export function hasHighConfidenceAnalysis(result: VariantResult): boolean {
  const existingVariants = Object.values(result.variants).filter((v: any) => v.exists)
  return existingVariants.every((variant: any) => variant.confidence === 'high')
}

/**
 * Get the most common confidence level
 */
export function getMostCommonConfidence(variants: VariantResult["variants"]): "tcgplayer_prices_reverse_holofoil_high" | "medium" | "cardmarket_prices_reverse_holo_low" | null {
  const confidenceCounts = { tcgplayer_prices_reverse_holofoil_high: 0, medium: 0, cardmarket_prices_reverse_holo_low: 0 }
  
  Object.values(variants).forEach((variant: any) => {
    if (variant.exists && variant.confidence) {
      confidenceCounts[variant.confidence as keyof typeof confidenceCounts]++
    }
  })
  
  if (confidenceCounts.tcgplayer_prices_reverse_holofoil_high > 0) return 'tcgplayer_prices_reverse_holofoil_high'
  if (confidenceCounts.medium > 0) return 'medium'
  if (confidenceCounts.cardmarket_prices_reverse_holo_low > 0) return 'cardmarket_prices_reverse_holo_low'
  return null
}

// Export main function as default
export default inferVariants
