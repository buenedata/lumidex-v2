/**
 * Database Integration for Variant Rule Engine
 * 
 * Functions to apply the rule engine to cards fetched directly from the database,
 * ensuring consistent variant detection across all parts of the application.
 */

import { inferVariants, mapToCardVariants } from './index'
import type { VariantResult, CardInput } from './type'
import type { CardVariant } from '@/type/domains/cards'

/**
 * Enhanced database cards with rule engine analysis
 */
export interface EnhancedDatabaseCard {
  set_id: string
  set_name: string
  number: string
  rarity: string
  type: string[]
  image_small: string
  image_large: string
  cardmarket_avg_sell_price?: number | null
  cardmarket_low_price?: number | null
  cardmarket_trend_price?: number | null
  cardmarket_reverse_holo_sell?: number | null
  cardmarket_reverse_holo_low?: number | null
  cardmarket_reverse_holo_trend?: number | null
  set_id?: string
  // Database TCGPlayer fields
  tcgplayer_normal_available?: boolean | null
  tcgplayer_holofoil_available?: boolean | null
  tcgplayer_reverse_holo_available?: boolean | null
  tcgplayer_1st_edition_available?: boolean | null
  // Enhanced fields
  variantAnalysis?: VariantResult
  availableVariants?: CardVariant[]
}

/**
 * Transform database cards data to Pokemon TCG API format for rule engine compatibility
 * Now works with normalized pricing data from tcg_prices table
 */
async function transformDatabaseCardForRuleEngine(
  databaseCard: any,
  setData: { set_id: string; set_name: string; set_series: string; release_date: string }
): Promise<CardInput> {
  // Build TCGPlayer pricing structure from normalized pricing data
  const cardmarket_prices: any = {}
  
  // Check if cards has pricing data from our normalized pricing system
  // This query should be done via Supabase client, but for now we'll use the availability flags
  // from the compatibility view or detect variants based on cards properties
  
  // Use availability flags if they exist (evolves_from compatibility view)
  if (databaseCard.tcgplayer_normal_available) {
    cardmarket_prices.normal = { tcgplayer_prices_reverse_holofoil_market: 1.0 }
  }
  
  if (databaseCard.tcgplayer_holofoil_available) {
    cardmarket_prices.tcgplayer_prices_reverse_holofoil = { tcgplayer_prices_reverse_holofoil_market: 1.0 }
  }
  
  if (databaseCard.tcgplayer_reverse_holo_available) {
    cardmarket_prices.reverseHolofoil = { tcgplayer_prices_reverse_holofoil_market: 1.0 }
  }
  
  if (databaseCard.tcgplayer_1st_edition_available) {
    cardmarket_prices['1stEditionHolofoil'] = { tcgplayer_prices_reverse_holofoil_market: 1.0 }
  }
  
  // If no availability flags, infer variants from cards properties
  if (Object.keys(cardmarket_prices).length === 0) {
    // Always assume normal variant exists
    cardmarket_prices.normal = { tcgplayer_prices_reverse_holofoil_market: 1.0 }
    
    // Add holo variant for rare cards
    if (databaseCard.rarity && ['Rare Holo', 'Rare Holo EX', 'Rare Holo V', 'Rare Holo VMAX'].includes(databaseCard.rarity)) {
      cardmarket_prices.tcgplayer_prices_reverse_holofoil = { tcgplayer_prices_reverse_holofoil_market: 1.0 }
    }
  }

  return {
    set_id: databaseCard.set_id,
    set_name: databaseCard.set_name,
    number: databaseCard.number,
    rarity: databaseCard.rarity || 'Common',
    sets: {
      set_id: setData.set_id,
      set_series: setData.set_series,
      releaseDate: setData.release_date
    },
    // Include tcgplayer data for variant detection
    tcgplayer: { cardmarket_prices }
  }
}

/**
 * Apply rule engine analysis to a database cards
 * Now supports async transformation for normalized pricing queries
 */
export async function enhanceDatabaseCard(
  databaseCard: any,
  setData: { set_id: string; set_name: string; set_series: string; release_date: string },
  productSources: string[] = ["Booster"]
): Promise<EnhancedDatabaseCard> {
  const enhanced = {
    ...databaseCard,
    type: databaseCard.type || [], // Ensure type is always an array
    image_small: databaseCard.image_small || '', // Ensure image_small is always a string
    image_large: databaseCard.image_large || '' // Ensure image_large is always a string
  } as EnhancedDatabaseCard
  
  try {
    // Transform to format expected by rule engine (now async)
    const cardInput = await transformDatabaseCardForRuleEngine(databaseCard, setData)
    
    // Apply rule engine analysis
    const variantAnalysis = inferVariants(cardInput, productSources)
    enhanced.variantAnalysis = variantAnalysis
    enhanced.availableVariants = mapToCardVariants(variantAnalysis)
    
  } catch (error) {
    console.warn(`Variant analysis failed for database cards ${databaseCard.set_id}:`, error)
    // Fallback to existing logic if rule engine fails
    enhanced.availableVariants = ['normal'] // Safe fallback
  }
  
  return enhanced
}

/**
 * Apply rule engine analysis to multiple database cards
 * Now supports async processing
 */
export async function enhanceDatabaseCards(
  databaseCards: any[],
  setData: { set_id: string; set_name: string; set_series: string; release_date: string },
  productSources: string[] = ["Booster"]
): Promise<EnhancedDatabaseCard[]> {
  const enhancedCards = await Promise.all(
    databaseCards.map(cards => enhanceDatabaseCard(cards, setData, productSources))
  )
  return enhancedCards
}

/**
 * Get available variants from enhanced database cards
 */
export function getAvailableVariantsFromEnhanced(
  enhancedCard: EnhancedDatabaseCard
): CardVariant[] {
  if (enhancedCard.availableVariants) {
    return enhancedCard.availableVariants
  }
  
  // Fallback to basic logic
  return ['normal']
}
