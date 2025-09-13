# Utility Functions for Variant Rule Engine

## Overview

This document defines utility functions and helper methods that work with the variant rule engine results, providing common operations needed throughout the application.

## Core Utility Functions

### Variant Checking Utilities

```typescript
// Check if a specific variant exists for a card
export function hasVariant(result: VariantResult, variant: Finish): boolean {
  return result.variants[variant].exists
}

// Get all existing variants for a card
export function getExistingVariants(result: VariantResult): Finish[] {
  return Object.keys(result.variants)
    .filter(variant => result.variants[variant as Finish].exists) as Finish[]
}

// Check if card has any holo variants (holo or firstEdHolo)
export function hasAnyHoloVariant(result: VariantResult): boolean {
  return hasVariant(result, 'holo') || hasVariant(result, 'firstEdHolo')
}

// Check if card has any normal variants (normal or firstEdNormal)
export function hasAnyNormalVariant(result: VariantResult): boolean {
  return hasVariant(result, 'normal') || hasVariant(result, 'firstEdNormal')
}

// Check if card has any 1st Edition variants
export function has1stEditionVariants(result: VariantResult): boolean {
  return hasVariant(result, 'firstEdNormal') || hasVariant(result, 'firstEdHolo')
}
```

### Confidence and Source Utilities

```typescript
// Get variants by confidence level
export function getVariantsByConfidence(result: VariantResult, confidence: Confidence): Finish[] {
  return Object.keys(result.variants)
    .filter(variant => {
      const flag = result.variants[variant as Finish]
      return flag.exists && flag.confidence === confidence
    }) as Finish[]
}

// Get variants by source
export function getVariantsBySource(result: VariantResult, source: Source): Finish[] {
  return Object.keys(result.variants)
    .filter(variant => {
      const flag = result.variants[variant as Finish]
      return flag.exists && flag.source === source
    }) as Finish[]
}

// Get highest confidence level among existing variants
export function getHighestConfidence(result: VariantResult): Confidence | null {
  const existingVariants = getExistingVariants(result)
  if (existingVariants.length === 0) return null
  
  const confidenceLevels = existingVariants
    .map(variant => result.variants[variant].confidence)
    .filter(confidence => confidence !== undefined) as Confidence[]
  
  if (confidenceLevels.includes('high')) return 'high'
  if (confidenceLevels.includes('medium')) return 'medium'
  if (confidenceLevels.includes('low')) return 'low'
  return null
}

// Check if all variants have high confidence
export function hasHighConfidenceAnalysis(result: VariantResult): boolean {
  const existingVariants = getExistingVariants(result)
  return existingVariants.every(variant => 
    result.variants[variant].confidence === 'high'
  )
}
```

### Type Mapping Utilities

```typescript
// Map rule engine Finish types to app CardVariant types
const FINISH_TO_VARIANT_MAP: Record<Finish, CardVariant | null> = {
  normal: 'normal',
  holo: 'holo',
  reverse: 'reverse_holo',
  firstEdNormal: '1st_edition',
  firstEdHolo: '1st_edition'
}

// Map app CardVariant types to rule engine Finish types
const VARIANT_TO_FINISH_MAP: Record<CardVariant, Finish[]> = {
  normal: ['normal'],
  holo: ['holo'],
  reverse_holo: ['reverse'],
  pokeball_pattern: [], // Not handled by rule engine
  masterball_pattern: [], // Not handled by rule engine
  '1st_edition': ['firstEdNormal', 'firstEdHolo']
}

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

export function mapCardVariantToFinishes(variant: CardVariant): Finish[] {
  return VARIANT_TO_FINISH_MAP[variant] || []
}

// Check if a CardVariant exists in the analysis
export function hasCardVariant(result: VariantResult, variant: CardVariant): boolean {
  const finishes = mapCardVariantToFinishes(variant)
  return finishes.some(finish => hasVariant(result, finish))
}
```

### Pricing Support Utilities

```typescript
// Get appropriate pricing variant for collection value calculation
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

// Determine if variant should use special pricing logic
export function requiresSpecialPricing(result: VariantResult, variant: CardVariant): boolean {
  // 1st Edition cards often have separate pricing
  if (variant === '1st_edition') return true
  
  // Reverse holo often has separate pricing
  if (variant === 'reverse_holo' && hasVariant(result, 'reverse')) return true
  
  return false
}

// Get fallback pricing variant if specific variant pricing unavailable
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
```

### Display and UI Utilities

```typescript
// Format variant name for display
export function formatVariantDisplayName(variant: Finish): string {
  const displayNames: Record<Finish, string> = {
    normal: 'Normal',
    holo: 'Holo',
    reverse: 'Reverse Holo',
    firstEdNormal: '1st Edition',
    firstEdHolo: '1st Edition Holo'
  }
  
  return displayNames[variant] || variant
}

// Get CSS class for variant confidence level
export function getConfidenceClass(confidence: Confidence): string {
  return `confidence-${confidence}`
}

// Get CSS class for variant source
export function getSourceClass(source: Source): string {
  return `source-${source}`
}

// Format explanation text for display
export function formatExplanations(explanations: string[]): string {
  if (explanations.length === 0) return 'No specific rules applied.'
  if (explanations.length === 1) return explanations[0]
  
  return explanations.map((exp, index) => `${index + 1}. ${exp}`).join(' ')
}

// Get variant availability summary for tooltips
export function getVariantSummary(result: VariantResult): string {
  const existingVariants = getExistingVariants(result)
  const variantNames = existingVariants.map(formatVariantDisplayName)
  
  if (variantNames.length === 0) return 'No variants available'
  if (variantNames.length === 1) return `Available in: ${variantNames[0]}`
  
  return `Available in: ${variantNames.slice(0, -1).join(', ')} and ${variantNames.slice(-1)}`
}
```

### Collection Integration Utilities

```typescript
// Calculate total variants owned
export function getTotalVariantsOwned(
  result: VariantResult, 
  collectionData: CardCollectionData
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

// Get collection completion percentage
export function getVariantCompletionPercentage(
  result: VariantResult,
  collectionData: CardCollectionData
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

// Check if user owns all available variants
export function hasCompleteVariantCollection(
  result: VariantResult,
  collectionData: CardCollectionData
): boolean {
  return getVariantCompletionPercentage(result, collectionData) === 100
}

// Get missing variants for collection
export function getMissingVariants(
  result: VariantResult,
  collectionData: CardCollectionData
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
```

### Validation Utilities

```typescript
// Validate that a variant result is well-formed
export function validateVariantResult(result: any): result is VariantResult {
  if (!result || typeof result !== 'object') return false
  
  // Check required fields
  if (!result.id || !result.setId || !result.era || !result.rarity) return false
  
  // Check variants structure
  if (!result.variants || typeof result.variants !== 'object') return false
  
  const requiredVariants: Finish[] = ['normal', 'holo', 'reverse', 'firstEdNormal', 'firstEdHolo']
  for (const variant of requiredVariants) {
    const flag = result.variants[variant]
    if (!flag || typeof flag.exists !== 'boolean') return false
    
    if (flag.exists && (!flag.source || !flag.confidence)) return false
  }
  
  // Check arrays
  if (!Array.isArray(result.printSources) || !Array.isArray(result.explanations)) return false
  
  return true
}

// Sanitize variant result for safe usage
export function sanitizeVariantResult(result: any): VariantResult | null {
  if (!validateVariantResult(result)) return null
  
  // Ensure all required fields are present with fallbacks
  return {
    id: result.id,
    setId: result.setId,
    era: result.era,
    rarity: result.rarity,
    variants: {
      normal: result.variants.normal || { exists: false },
      holo: result.variants.holo || { exists: false },
      reverse: result.variants.reverse || { exists: false },
      firstEdNormal: result.variants.firstEdNormal || { exists: false },
      firstEdHolo: result.variants.firstEdHolo || { exists: false }
    },
    printSources: Array.isArray(result.printSources) ? result.printSources : ['Booster'],
    explanations: Array.isArray(result.explanations) ? result.explanations : []
  }
}
```

### Comparison Utilities

```typescript
// Compare two variant results for equality
export function compareVariantResults(a: VariantResult, b: VariantResult): boolean {
  if (a.id !== b.id || a.era !== b.era) return false
  
  const finishes: Finish[] = ['normal', 'holo', 'reverse', 'firstEdNormal', 'firstEdHolo']
  
  return finishes.every(finish => 
    a.variants[finish].exists === b.variants[finish].exists
  )
}

// Get differences between two variant results
export function getVariantDifferences(
  oldResult: VariantResult, 
  newResult: VariantResult
): { added: Finish[]; removed: Finish[]; changed: Finish[] } {
  
  const added: Finish[] = []
  const removed: Finish[] = []
  const changed: Finish[] = []
  
  const finishes: Finish[] = ['normal', 'holo', 'reverse', 'firstEdNormal', 'firstEdHolo']
  
  finishes.forEach(finish => {
    const oldExists = oldResult.variants[finish].exists
    const newExists = newResult.variants[finish].exists
    
    if (!oldExists && newExists) {
      added.push(finish)
    } else if (oldExists && !newExists) {
      removed.push(finish)
    } else if (oldExists && newExists) {
      const oldFlag = oldResult.variants[finish]
      const newFlag = newResult.variants[finish]
      
      if (oldFlag.source !== newFlag.source || oldFlag.confidence !== newFlag.confidence) {
        changed.push(finish)
      }
    }
  })
  
  return { added, removed, changed }
}
```

### Export All Utilities

```typescript
// Main exports for easy importing
export {
  // Variant checking
  hasVariant,
  getExistingVariants,
  hasAnyHoloVariant,
  hasAnyNormalVariant,
  has1stEditionVariants,
  
  // Confidence and source
  getVariantsByConfidence,
  getVariantsBySource,
  getHighestConfidence,
  hasHighConfidenceAnalysis,
  
  // Type mapping
  mapToCardVariants,
  mapCardVariantToFinishes,
  hasCardVariant,
  
  // Pricing support
  getPricingVariant,
  requiresSpecialPricing,
  getFallbackPricingVariant,
  
  // Display and UI
  formatVariantDisplayName,
  getConfidenceClass,
  getSourceClass,
  formatExplanations,
  getVariantSummary,
  
  // Collection integration
  getTotalVariantsOwned,
  getVariantCompletionPercentage,
  hasCompleteVariantCollection,
  getMissingVariants,
  
  // Validation
  validateVariantResult,
  sanitizeVariantResult,
  
  // Comparison
  compareVariantResults,
  getVariantDifferences
}
```

## Usage Examples

### Basic Variant Checking

```typescript
import { inferVariants, hasVariant, getExistingVariants } from './variant-rule-engine'

const card = { /* Pokemon TCG API card data */ }
const analysis = inferVariants(card)

// Check if card has holo variant
if (hasVariant(analysis, 'holo')) {
  console.log('Card has holo variant!')
}

// Get all available variants
const variants = getExistingVariants(analysis)
console.log('Available variants:', variants)
```

### Collection Integration

```typescript
import { getTotalVariantsOwned, getMissingVariants } from './variant-rule-engine'

const analysis = inferVariants(card)
const collectionData = getUserCollectionData(card.id)

// Calculate total owned
const totalOwned = getTotalVariantsOwned(analysis, collectionData)

// Find missing variants
const missing = getMissingVariants(analysis, collectionData)
console.log('Missing variants:', missing.map(formatVariantDisplayName))
```

### UI Integration

```typescript
import { getVariantSummary, hasHighConfidenceAnalysis } from './variant-rule-engine'

const analysis = inferVariants(card)

// Show variant summary in tooltip
const summary = getVariantSummary(analysis)
const isReliable = hasHighConfidenceAnalysis(analysis)

return (
  <div title={summary} className={isReliable ? 'high-confidence' : 'low-confidence'}>
    {/* Card component */}
  </div>
)
```

These utilities provide a comprehensive toolkit for working with variant analysis results throughout the application.