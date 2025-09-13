/**
 * Utility Functions for Variant Rule Engine
 * 
 * Helper functions for working with variant analysis results, providing common
 * operations needed throughout the application.
 */

import type { VariantResult, Finish, Source, Confidence } from './types'
import type { CardVariant } from '@/types/domains/card'

/**
 * Check if a specific variant exists for a cards
 */
export function hasVariant(result: VariantResult, variant: Finish): boolean {
  if (!result?.variants) return false
  
  switch (variant) {
    case 'normal': return result.variants.normal?.exists ?? false
    case 'holo': return result.variants.holo?.exists ?? false
    case 'reverse': return result.variants.reverse?.exists ?? false
    case 'firstEdNormal': return result.variants.firstEdNormal?.exists ?? false
    case 'firstEdHolo': return result.variants.firstEdHolo?.exists ?? false
    case 'pokeballPattern': return result.variants.pokeballPattern?.exists ?? false
    case 'masterballPattern': return result.variants.masterballPattern?.exists ?? false
    default: return false
  }
}

/**
 * Get all existing variants for a cards
 */
export function getExistingVariants(result: VariantResult): Finish[] {
  const existing: Finish[] = []
  
  if (!result?.variants) return existing
  
  if (result.variants.normal?.exists) existing.push('normal')
  if (result.variants.holo?.exists) existing.push('holo')
  if (result.variants.reverse?.exists) existing.push('reverse')
  if (result.variants.firstEdNormal?.exists) existing.push('firstEdNormal')
  if (result.variants.firstEdHolo?.exists) existing.push('firstEdHolo')
  if (result.variants.pokeballPattern?.exists) existing.push('pokeballPattern')
  if (result.variants.masterballPattern?.exists) existing.push('masterballPattern')
  
  return existing
}

/**
 * Check if cards has any holo variants (holo or firstEdHolo)
 */
export function hasAnyHoloVariant(result: VariantResult): boolean {
  return hasVariant(result, 'holo') || hasVariant(result, 'firstEdHolo')
}

/**
 * Check if cards has any normal variants (normal or firstEdNormal)
 */
export function hasAnyNormalVariant(result: VariantResult): boolean {
  return hasVariant(result, 'normal') || hasVariant(result, 'firstEdNormal')
}

/**
 * Check if cards has any 1st Edition variants
 */
export function has1stEditionVariants(result: VariantResult): boolean {
  return hasVariant(result, 'firstEdNormal') || hasVariant(result, 'firstEdHolo')
}

/**
 * Get variants by confidence level
 */
export function getVariantsByConfidence(result: VariantResult, confidence: Confidence): Finish[] {
  const matching: Finish[] = []
  
  if (!result?.variants) return matching
  
  if (result.variants.normal?.exists && result.variants.normal?.confidence === confidence) matching.push('normal')
  if (result.variants.holo?.exists && result.variants.holo?.confidence === confidence) matching.push('holo')
  if (result.variants.reverse?.exists && result.variants.reverse?.confidence === confidence) matching.push('reverse')
  if (result.variants.firstEdNormal?.exists && result.variants.firstEdNormal?.confidence === confidence) matching.push('firstEdNormal')
  if (result.variants.firstEdHolo?.exists && result.variants.firstEdHolo?.confidence === confidence) matching.push('firstEdHolo')
  if (result.variants.pokeballPattern?.exists && result.variants.pokeballPattern?.confidence === confidence) matching.push('pokeballPattern')
  if (result.variants.masterballPattern?.exists && result.variants.masterballPattern?.confidence === confidence) matching.push('masterballPattern')
  
  return matching
}

/**
 * Get variants by source
 */
export function getVariantsBySource(result: VariantResult, source: Source): Finish[] {
  const matching: Finish[] = []
  
  if (!result?.variants) return matching
  
  if (result.variants.normal?.exists && result.variants.normal?.source === source) matching.push('normal')
  if (result.variants.holo?.exists && result.variants.holo?.source === source) matching.push('holo')
  if (result.variants.reverse?.exists && result.variants.reverse?.source === source) matching.push('reverse')
  if (result.variants.firstEdNormal?.exists && result.variants.firstEdNormal?.source === source) matching.push('firstEdNormal')
  if (result.variants.firstEdHolo?.exists && result.variants.firstEdHolo?.source === source) matching.push('firstEdHolo')
  if (result.variants.pokeballPattern?.exists && result.variants.pokeballPattern?.source === source) matching.push('pokeballPattern')
  if (result.variants.masterballPattern?.exists && result.variants.masterballPattern?.source === source) matching.push('masterballPattern')
  
  return matching
}

/**
 * Get highest confidence level among existing variants
 */
export function getHighestConfidence(result: VariantResult): Confidence | null {
  const existingVariants = getExistingVariants(result)
  if (existingVariants.length === 0) return null
  
  const confidenceLevels = existingVariants
    .map(variant => {
      if (!result?.variants) return undefined
      
      switch (variant) {
        case 'normal': return result.variants.normal?.confidence
        case 'holo': return result.variants.holo?.confidence
        case 'reverse': return result.variants.reverse?.confidence
        case 'firstEdNormal': return result.variants.firstEdNormal?.confidence
        case 'firstEdHolo': return result.variants.firstEdHolo?.confidence
        case 'pokeballPattern': return result.variants.pokeballPattern?.confidence
        case 'masterballPattern': return result.variants.masterballPattern?.confidence
        default: return undefined
      }
    })
    .filter(confidence => confidence !== undefined) as Confidence[]
  
  if (confidenceLevels.includes('tcgplayer_prices_reverse_holofoil_high')) return 'tcgplayer_prices_reverse_holofoil_high'
  if (confidenceLevels.includes('medium')) return 'medium'
  if (confidenceLevels.includes('cardmarket_prices_reverse_holo_low')) return 'cardmarket_prices_reverse_holo_low'
  return null
}

/**
 * Check if all variants have tcgplayer_prices_reverse_holofoil_high confidence
 */
export function hasHighConfidenceAnalysis(result: VariantResult): boolean {
  const existingVariants = getExistingVariants(result)
  return existingVariants.every(variant => {
    if (!result?.variants) return false
    
    switch (variant) {
      case 'normal': return result.variants.normal?.confidence === 'tcgplayer_prices_reverse_holofoil_high'
      case 'holo': return result.variants.holo?.confidence === 'tcgplayer_prices_reverse_holofoil_high'
      case 'reverse': return result.variants.reverse?.confidence === 'tcgplayer_prices_reverse_holofoil_high'
      case 'firstEdNormal': return result.variants.firstEdNormal?.confidence === 'tcgplayer_prices_reverse_holofoil_high'
      case 'firstEdHolo': return result.variants.firstEdHolo?.confidence === 'tcgplayer_prices_reverse_holofoil_high'
      case 'pokeballPattern': return result.variants.pokeballPattern?.confidence === 'tcgplayer_prices_reverse_holofoil_high'
      case 'masterballPattern': return result.variants.masterballPattern?.confidence === 'tcgplayer_prices_reverse_holofoil_high'
      default: return false
    }
  })
}

/**
 * Map rule engine Finish type to app CardVariant type
 */
const FINISH_TO_VARIANT_MAP: Record<Finish, CardVariant | null> = {
  normal: 'normal',
  holo: 'holo',
  reverse: 'reverse_holo',
  firstEdNormal: '1st_edition',
  firstEdHolo: '1st_edition',
  pokeballPattern: 'pokeball_pattern',
  masterballPattern: 'masterball_pattern'
}

/**
 * Map app CardVariant type to rule engine Finish type
 */
const VARIANT_TO_FINISH_MAP: Record<CardVariant, Finish[]> = {
  normal: ['normal'],
  holo: ['holo'],
  reverse_holo: ['reverse'],
  pokeball_pattern: ['pokeballPattern'],
  masterball_pattern: ['masterballPattern'],
  '1st_edition': ['firstEdNormal', 'firstEdHolo']
}

/**
 * Convert rule engine results to app CardVariant array
 */
export function mapToCardVariants(result: VariantResult): CardVariant[] {
  const existingFinishes = getExistingVariants(result)
  const variants = new Set<CardVariant>()
  
  existingFinishes.forEach(finish => {
    const variant = FINISH_TO_VARIANT_MAP[finish]
    if (variant) {
      variants.add(variant)
    }
  })
  
  return Array.from(variants)
}

/**
 * Convert app CardVariant to rule engine Finish type
 */
export function mapCardVariantToFinishes(variant: CardVariant): Finish[] {
  return VARIANT_TO_FINISH_MAP[variant] || []
}

/**
 * Check if a CardVariant exists in the analysis
 */
export function hasCardVariant(result: VariantResult, variant: CardVariant): boolean {
  const finishes = mapCardVariantToFinishes(variant)
  return finishes.some(finish => hasVariant(result, finish))
}

/**
 * Get appropriate pricing variant for collection value calculation
 */
export function getPricingVariant(result: VariantResult, userVariant: CardVariant): Finish | null {
  const finishes = mapCardVariantToFinishes(userVariant)
  
  // Return the first existing finish that matches the user's variant
  for (const finish of finishes) {
    if (hasVariant(result, finish)) {
      return finish
    }
  }
  
  return null
}

/**
 * Determine if variant should use special pricing logic
 */
export function requiresSpecialPricing(result: VariantResult, variant: CardVariant): boolean {
  // 1st Edition cards often have separate pricing
  if (variant === '1st_edition') return true
  
  // Reverse holo often has separate pricing
  if (variant === 'reverse_holo' && hasVariant(result, 'reverse')) return true
  
  return false
}

/**
 * Get fallback pricing variant if specific variant pricing unavailable
 */
export function getFallbackPricingVariant(result: VariantResult, variant: CardVariant): Finish | null {
  // If looking for specific variant that doesn't exist, find best fallback
  if (!hasCardVariant(result, variant)) {
    const existingVariants = getExistingVariants(result)
    
    // Prefer holo over normal for fallback
    if (existingVariants.includes('holo')) return 'holo'
    if (existingVariants.includes('normal')) return 'normal'
    
    // Fallback to any existing variant
    return existingVariants[0] || null
  }
  
  return getPricingVariant(result, variant)
}

/**
 * Format variant name for display
 */
export function formatVariantDisplayName(variant: Finish): string {
  const displayNames: Record<Finish, string> = {
    normal: 'Normal',
    holo: 'Holo',
    reverse: 'Reverse Holo',
    firstEdNormal: '1st Edition',
    firstEdHolo: '1st Edition Holo',
    pokeballPattern: 'Pokeball Pattern',
    masterballPattern: 'Masterball Pattern'
  }
  
  return displayNames[variant] || variant
}

/**
 * Get CSS class for variant confidence level
 */
export function getConfidenceClass(confidence: Confidence): string {
  return `confidence-${confidence}`
}

/**
 * Get CSS class for variant source
 */
export function getSourceClass(source: Source): string {
  return `source-${source}`
}

/**
 * Format explanation text for display
 */
export function formatExplanations(explanations: string[]): string {
  if (explanations.length === 0) return 'No specific rules applied.'
  if (explanations.length === 1) return explanations[0]
  
  return explanations.map((exp, index) => `${index + 1}. ${exp}`).join(' ')
}

/**
 * Get variant availability summary for tooltips
 */
export function getVariantSummary(result: VariantResult): string {
  const existingVariants = getExistingVariants(result)
  const variantNames = existingVariants.map(formatVariantDisplayName)
  
  if (variantNames.length === 0) return 'No variants available'
  if (variantNames.length === 1) return `Available in: ${variantNames[0]}`
  
  return `Available in: ${variantNames.slice(0, -1).join(', ')} and ${variantNames.slice(-1)}`
}

/**
 * Calculate total variants owned (requires collection data interface)
 */
export function getTotalVariantsOwned(
  result: VariantResult,
  collectionData: any // Using any to avoid circular dependency
): number {
  let total = 0
  
  if (hasVariant(result, 'normal')) total += collectionData.normal || 0
  if (hasVariant(result, 'holo')) total += collectionData.holo || 0
  if (hasVariant(result, 'reverse')) total += collectionData.reverseHolo || 0
  if (hasVariant(result, 'firstEdNormal') || hasVariant(result, 'firstEdHolo')) {
    total += collectionData.firstEdition || 0
  }
  
  return total
}

/**
 * Get collection completion percentage
 */
export function getVariantCompletionPercentage(
  result: VariantResult,
  collectionData: any // Using any to avoid circular dependency
): number {
  const existingVariants = getExistingVariants(result)
  if (existingVariants.length === 0) return 0
  
  let ownedVariants = 0
  
  if (hasVariant(result, 'normal') && (collectionData.normal || 0) > 0) ownedVariants++
  if (hasVariant(result, 'holo') && (collectionData.holo || 0) > 0) ownedVariants++
  if (hasVariant(result, 'reverse') && (collectionData.reverseHolo || 0) > 0) ownedVariants++
  if ((hasVariant(result, 'firstEdNormal') || hasVariant(result, 'firstEdHolo')) && 
      (collectionData.firstEdition || 0) > 0) ownedVariants++
  
  return Math.round((ownedVariants / existingVariants.length) * 100)
}

/**
 * Check if user owns all available variants
 */
export function hasCompleteVariantCollection(
  result: VariantResult,
  collectionData: any // Using any to avoid circular dependency
): boolean {
  return getVariantCompletionPercentage(result, collectionData) === 100
}

/**
 * Get missing variants for collection
 */
export function getMissingVariants(
  result: VariantResult,
  collectionData: any // Using any to avoid circular dependency
): Finish[] {
  const existingVariants = getExistingVariants(result)
  const missing: Finish[] = []
  
  existingVariants.forEach(variant => {
    let isOwned = false
    
    switch (variant) {
      case 'normal':
        isOwned = (collectionData.normal || 0) > 0
        break
      case 'holo':
        isOwned = (collectionData.holo || 0) > 0
        break
      case 'reverse':
        isOwned = (collectionData.reverseHolo || 0) > 0
        break
      case 'firstEdNormal':
      case 'firstEdHolo':
        isOwned = (collectionData.firstEdition || 0) > 0
        break
    }
    
    if (!isOwned) {
      missing.push(variant)
    }
  })
  
  return missing
}

/**
 * Compare two variant results for equality
 */
export function compareVariantResults(a: VariantResult, b: VariantResult): boolean {
  if (a.set_id !== b.set_id || a.era !== b.era) return false
  
  const finishes: Finish[] = ['normal', 'holo', 'reverse', 'firstEdNormal', 'firstEdHolo']
  
  return finishes.every(finish => {
    if (!a?.variants || !b?.variants) return false
    
    switch (finish) {
      case 'normal': return (a.variants.normal?.exists ?? false) === (b.variants.normal?.exists ?? false)
      case 'holo': return (a.variants.holo?.exists ?? false) === (b.variants.holo?.exists ?? false)
      case 'reverse': return (a.variants.reverse?.exists ?? false) === (b.variants.reverse?.exists ?? false)
      case 'firstEdNormal': return (a.variants.firstEdNormal?.exists ?? false) === (b.variants.firstEdNormal?.exists ?? false)
      case 'firstEdHolo': return (a.variants.firstEdHolo?.exists ?? false) === (b.variants.firstEdHolo?.exists ?? false)
      default: return true
    }
  })
}

/**
 * Get differences between two variant results
 */
export function getVariantDifferences(
  oldResult: VariantResult, 
  newResult: VariantResult
): { added: Finish[]; removed: Finish[]; changed: Finish[] } {
  
  const added: Finish[] = []
  const removed: Finish[] = []
  const changed: Finish[] = []
  
  const finishes: Finish[] = ['normal', 'holo', 'reverse', 'firstEdNormal', 'firstEdHolo']
  
  finishes.forEach(finish => {
    if (!oldResult?.variants || !newResult?.variants) return
    
    let oldExists = false
    let newExists = false
    let oldFlag = null
    let newFlag = null
    
    switch (finish) {
      case 'normal':
        oldExists = oldResult.variants.normal?.exists ?? false
        newExists = newResult.variants.normal?.exists ?? false
        oldFlag = oldResult.variants.normal
        newFlag = newResult.variants.normal
        break
      case 'holo':
        oldExists = oldResult.variants.holo?.exists ?? false
        newExists = newResult.variants.holo?.exists ?? false
        oldFlag = oldResult.variants.holo
        newFlag = newResult.variants.holo
        break
      case 'reverse':
        oldExists = oldResult.variants.reverse?.exists ?? false
        newExists = newResult.variants.reverse?.exists ?? false
        oldFlag = oldResult.variants.reverse
        newFlag = newResult.variants.reverse
        break
      case 'firstEdNormal':
        oldExists = oldResult.variants.firstEdNormal?.exists ?? false
        newExists = newResult.variants.firstEdNormal?.exists ?? false
        oldFlag = oldResult.variants.firstEdNormal
        newFlag = newResult.variants.firstEdNormal
        break
      case 'firstEdHolo':
        oldExists = oldResult.variants.firstEdHolo?.exists ?? false
        newExists = newResult.variants.firstEdHolo?.exists ?? false
        oldFlag = oldResult.variants.firstEdHolo
        newFlag = newResult.variants.firstEdHolo
        break
      default:
        return
    }
    
    if (!oldExists && newExists) {
      added.push(finish)
    } else if (oldExists && !newExists) {
      removed.push(finish)
    } else if (oldExists && newExists && oldFlag && newFlag) {
      if (oldFlag.source !== newFlag.source || oldFlag.confidence !== newFlag.confidence) {
        changed.push(finish)
      }
    }
  })
  
  return { added, removed, changed }
}

/**
 * Get variant confidence for a specific card variant
 */
export function getVariantConfidence(result: VariantResult, variant: CardVariant): Confidence | null {
  const finishes = mapCardVariantToFinishes(variant)
  
  for (const finish of finishes) {
    if (hasVariant(result, finish)) {
      if (!result?.variants) return null
      
      switch (finish) {
        case 'normal': return result.variants.normal?.confidence || null
        case 'holo': return result.variants.holo?.confidence || null
        case 'reverse': return result.variants.reverse?.confidence || null
        case 'firstEdNormal': return result.variants.firstEdNormal?.confidence || null
        case 'firstEdHolo': return result.variants.firstEdHolo?.confidence || null
        case 'pokeballPattern': return result.variants.pokeballPattern?.confidence || null
        case 'masterballPattern': return result.variants.masterballPattern?.confidence || null
        default: return null
      }
    }
  }
  
  return null
}

/**
 * Create a simple variant availability object for legacy compatibility
 */
export function createLegacyVariantData(result: VariantResult): Record<string, boolean> {
  return {
    normal: hasVariant(result, 'normal'),
    holo: hasVariant(result, 'holo'),
    reverseHolo: hasVariant(result, 'reverse'),
    firstEdition: has1stEditionVariants(result)
  }
}
