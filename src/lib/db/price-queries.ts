import { createClient } from '@/lib/supabase/client';
import { currencyConverter } from '@/lib/currency/conversion';
import type { CurrencyCode, PriceSource, UserPreferences } from '@/types';
import type { CardWithPrices, VariantPriceData, CheapestPriceData, CardPriceData } from '@/types/pricing';

export class CardPriceService {
  async getCardsWithPrices(
    cardIds: string[],
    userPreferences: UserPreferences
  ): Promise<CardWithPrices[]> {
    const supabase = createClient();
    
    // 1. Fetch card basic data
    const { data: cards, error: cardsError } = await supabase
      .from('tcg_cards')
      .select('*')
      .in('id', cardIds);
    
    if (cardsError || !cards) {
      throw new Error(`Failed to fetch cards: ${cardsError?.message}`);
    }
    
    // 2. Fetch preferred source prices with enhanced CardMarket fields
    const { data: preferredPrices } = await supabase
      .from('tcg_card_prices')
      .select(`
        *,
        average_sell_price,
        german_pro_low,
        suggested_price,
        reverse_holo_sell,
        reverse_holo_low,
        reverse_holo_trend,
        low_price_ex_plus,
        trend,
        trend_price,
        avg_1_day,
        avg_7_day,
        avg_30_day
      `)
      .in('card_id', cardIds)
      .eq('source', userPreferences.preferred_price_source);
    
    // 3. Fetch fallback source prices with enhanced CardMarket fields
    const fallbackSource = userPreferences.preferred_price_source === 'cardmarket'
      ? 'tcgplayer'
      : 'cardmarket';
      
    const { data: fallbackPrices } = await supabase
      .from('tcg_card_prices')
      .select(`
        *,
        average_sell_price,
        german_pro_low,
        suggested_price,
        reverse_holo_sell,
        reverse_holo_low,
        reverse_holo_trend,
        low_price_ex_plus,
        trend,
        trend_price,
        avg_1_day,
        avg_7_day,
        avg_30_day
      `)
      .in('card_id', cardIds)
      .eq('source', fallbackSource);
    
    // 4. Process each card
    return await Promise.all(
      cards.map(card => this.processCardPrices(
        card, 
        preferredPrices || [], 
        fallbackPrices || [], 
        userPreferences
      ))
    );
  }

  private async processCardPrices(
    card: any,
    preferredPrices: any[],
    fallbackPrices: any[],
    userPreferences: UserPreferences
  ): Promise<CardWithPrices> {
    const cardPreferredPrices = preferredPrices.filter(p => p.card_id === card.id);
    const cardFallbackPrices = fallbackPrices.filter(p => p.card_id === card.id);
    
    // Determine which prices to use
    const hasPreferredPrices = cardPreferredPrices.length > 0;
    const pricesToUse = hasPreferredPrices ? cardPreferredPrices : cardFallbackPrices;
    const sourceUsed = hasPreferredPrices 
      ? userPreferences.preferred_price_source 
      : (userPreferences.preferred_price_source === 'cardmarket' ? 'tcgplayer' : 'cardmarket');
    
    // Find cheapest price across all variants
    const cheapestPrice = this.findCheapestPrice(pricesToUse, sourceUsed);
    
    // Convert to user currency if needed
    let convertedCheapestPrice = cheapestPrice;
    if (cheapestPrice && userPreferences.preferred_currency !== cheapestPrice.currency) {
      try {
        const conversion = await currencyConverter.convert(
          cheapestPrice.price,
          cheapestPrice.currency as CurrencyCode,
          userPreferences.preferred_currency
        );
        
        convertedCheapestPrice = {
          ...cheapestPrice,
          price: conversion.convertedAmount,
          currency: conversion.toCurrency
        };
      } catch (error) {
        console.warn(`Failed to convert price for card ${card.id}:`, error);
      }
    }
    
    // Format preferred source prices with enhanced CardMarket data
    const formattedPreferredPrices: VariantPriceData[] = cardPreferredPrices.map(p => ({
      variant: p.variant,
      source: p.source,
      currency: p.currency,
      prices: {
        low: p.low,
        mid: p.mid,
        high: p.high,
        market: p.market,
        direct_low: p.direct_low
      },
      last_updated: p.last_updated,
      url: p.url,
      
      // Include enhanced CardMarket data when available
      cardmarket_data: p.source === 'cardmarket' ? {
        averageSellPrice: p.average_sell_price,
        germanProLow: p.german_pro_low,
        suggestedPrice: p.suggested_price,
        reverseHoloSell: p.reverse_holo_sell,
        reverseHoloLow: p.reverse_holo_low,
        reverseHoloTrend: p.reverse_holo_trend,
        lowPriceExPlus: p.low_price_ex_plus,
        trend: p.trend,
        trendPrice: p.trend_price,
        avg1: p.avg_1_day,
        avg7: p.avg_7_day,
        avg30: p.avg_30_day,
      } : undefined
    }));

    // Format fallback source prices with enhanced CardMarket data
    const formattedFallbackPrices: VariantPriceData[] = cardFallbackPrices.map(p => ({
      variant: p.variant,
      source: p.source,
      currency: p.currency,
      prices: {
        low: p.low,
        mid: p.mid,
        high: p.high,
        market: p.market,
        direct_low: p.direct_low
      },
      last_updated: p.last_updated,
      url: p.url,
      
      // Include enhanced CardMarket data when available
      cardmarket_data: p.source === 'cardmarket' ? {
        averageSellPrice: p.average_sell_price,
        germanProLow: p.german_pro_low,
        suggestedPrice: p.suggested_price,
        reverseHoloSell: p.reverse_holo_sell,
        reverseHoloLow: p.reverse_holo_low,
        reverseHoloTrend: p.reverse_holo_trend,
        lowPriceExPlus: p.low_price_ex_plus,
        trend: p.trend,
        trendPrice: p.trend_price,
        avg1: p.avg_1_day,
        avg7: p.avg_7_day,
        avg30: p.avg_30_day,
      } : undefined
    }));
    
    // Build historical trends data from CardMarket averages
    const historicalTrends = this.buildHistoricalTrends([...cardPreferredPrices, ...cardFallbackPrices]);
    const hasHistoricalData = Object.keys(historicalTrends).length > 0;

    const priceData: CardPriceData = {
      preferred_source_prices: formattedPreferredPrices,
      fallback_source_prices: formattedFallbackPrices,
      cheapest_variant_price: convertedCheapestPrice,
      price_source_used: sourceUsed,
      has_fallback: !hasPreferredPrices && cardFallbackPrices.length > 0,
      has_historical_data: hasHistoricalData,
      historical_trends: historicalTrends
    };
    
    return {
      ...card,
      price_data: priceData
    };
  }

  private findCheapestPrice(prices: any[], source: PriceSource): CheapestPriceData | null {
    if (prices.length === 0) return null;
    
    // Priority order for variants (normal first, then holofoil for holo-only cards)
    const variantPriority = [
      'normal', 
      'holofoil', 
      'reverse_holofoil', 
      'first_edition_normal', 
      'first_edition_holofoil', 
      'unlimited'
    ];
    
    // Priority order for price fields (market first as it's most accurate)
    const priceFields = ['market', 'mid', 'low', 'direct_low'] as const;
    
    let cheapest: CheapestPriceData | null = null;
    let cheapestPrice = Infinity;
    
    // First, try to find prices in variant priority order
    for (const variant of variantPriority) {
      const variantPrices = prices.filter(p => p.variant === variant);
      
      for (const priceData of variantPrices) {
        for (const field of priceFields) {
          const price = priceData[field];
          if (price && price > 0 && price < cheapestPrice) {
            cheapestPrice = price;
            cheapest = {
              variant: priceData.variant,
              price,
              currency: priceData.currency,
              price_type: field,
              source,
              last_updated: priceData.last_updated
            };
          }
        }
      }
      
      // If we found a price for this priority variant, use it
      if (cheapest) break;
    }
    
    // If no price found in priority variants, check all remaining variants
    if (!cheapest) {
      for (const priceData of prices) {
        if (!variantPriority.includes(priceData.variant)) {
          for (const field of priceFields) {
            const price = priceData[field];
            if (price && price > 0 && price < cheapestPrice) {
              cheapestPrice = price;
              cheapest = {
                variant: priceData.variant,
                price,
                currency: priceData.currency,
                price_type: field,
                source,
                last_updated: priceData.last_updated
              };
            }
          }
        }
      }
    }
    
    return cheapest;
  }

  /**
   * Build historical trends data from CardMarket averages
   */
  private buildHistoricalTrends(prices: any[]): { [variant: string]: any } {
    const trends: { [variant: string]: any } = {};
    
    // Process CardMarket prices that have historical data
    const cardmarketPrices = prices.filter(p => p.source === 'cardmarket');
    
    for (const price of cardmarketPrices) {
      if (price.avg_1_day || price.avg_7_day || price.avg_30_day) {
        const currentPrice = price.market || price.mid || price.low;
        
        // Calculate trend direction and percentage from 30-day average
        let trendDirection: 'up' | 'down' | 'stable' = 'stable';
        let trendPercentage = 0;
        
        if (currentPrice && price.avg_30_day) {
          const change = ((currentPrice - price.avg_30_day) / price.avg_30_day) * 100;
          trendPercentage = Math.round(change * 100) / 100;
          
          if (Math.abs(change) > 5) { // Consider >5% change as significant
            trendDirection = change > 0 ? 'up' : 'down';
          }
        }
        
        trends[price.variant] = {
          avg_1_day: price.avg_1_day,
          avg_7_day: price.avg_7_day,
          avg_30_day: price.avg_30_day,
          trend_direction: trendDirection,
          trend_percentage: trendPercentage
        };
      }
    }
    
    return trends;
  }

  /**
   * Get a single card with prices
   */
  async getCardWithPrices(
    cardId: string,
    userPreferences: UserPreferences
  ): Promise<CardWithPrices | null> {
    const results = await this.getCardsWithPrices([cardId], userPreferences);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get cheapest price for a single card (utility method)
   */
  async getCheapestPrice(
    cardId: string,
    userPreferences: UserPreferences
  ): Promise<CheapestPriceData | null> {
    const card = await this.getCardWithPrices(cardId, userPreferences);
    return card?.price_data.cheapest_variant_price || null;
  }
}

// Singleton instance
export const cardPriceService = new CardPriceService();

/**
 * Utility function for quick price fetching
 */
export async function getCardsWithPrices(
  cardIds: string[],
  userPreferences: UserPreferences
): Promise<CardWithPrices[]> {
  return cardPriceService.getCardsWithPrices(cardIds, userPreferences);
}

/**
 * Utility function for single card price fetching
 */
export async function getCardWithPrices(
  cardId: string,
  userPreferences: UserPreferences
): Promise<CardWithPrices | null> {
  return cardPriceService.getCardWithPrices(cardId, userPreferences);
}