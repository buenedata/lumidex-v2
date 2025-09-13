// Adapter functions to bridge database schema with modal requirements

import type { 
  DatabaseCard, 
  DatabaseCardPrice, 
  DatabaseCollectionItem,
  CardModalData,
  CardCollectionData 
} from '@/types/card-modal';

/**
 * Adapts raw database card data to modal format
 */
export function adaptCardData(dbCard: DatabaseCard & {
  set_name?: string;
  set_series?: string;
  set_release_date?: string;
  set_images?: any;
}): CardModalData {
  return {
    // Core card info
    id: dbCard.id,
    set_id: dbCard.set_id,
    number: dbCard.number,
    name: dbCard.name,
    rarity: dbCard.rarity || 'Common',
    types: dbCard.types || [],
    artist: dbCard.artist,
    flavor_text: dbCard.flavor_text,
    hp: dbCard.hp,
    regulation_mark: dbCard.regulation_mark,
    
    // Images
    image_small: dbCard.images?.small || null,
    image_large: dbCard.images?.large || null,
    
    // Set info
    set_name: dbCard.set_name || null,
    set_series: dbCard.set_series || null,
    set_release_date: dbCard.set_release_date || null,
    set_symbol_url: dbCard.set_images?.symbol || null,
    
    // Initialize pricing fields (will be populated by aggregatePricingData)
    cardmarket_avg_sell_price: null,
    cardmarket_low_price: null,
    cardmarket_trend_price: null,
    cardmarket_reverse_holo_sell: null,
    cardmarket_reverse_holo_low: null,
    cardmarket_reverse_holo_trend: null,
    cardmarket_avg_7_days: null,
    cardmarket_avg_30_days: null,
    cardmarket_url: null,
    
    // Metadata
    created_at: dbCard.updated_at,
    updated_at: dbCard.updated_at,
  };
}

/**
 * Aggregates pricing data from tcg_card_prices table
 */
export function aggregatePricingData(prices: DatabaseCardPrice[]): Partial<CardModalData> {
  const pricing: Partial<CardModalData> = {};
  
  if (!prices || prices.length === 0) {
    return pricing;
  }

  // Find CardMarket prices
  const cardmarketPrices = prices.filter(p => p.source === 'cardmarket');
  
  if (cardmarketPrices.length > 0) {
    // Get normal variant price
    const normalPrice = cardmarketPrices.find(p => p.variant === 'normal');
    if (normalPrice) {
      pricing.cardmarket_avg_sell_price = normalPrice.market;
      pricing.cardmarket_low_price = normalPrice.low;
      pricing.cardmarket_trend_price = normalPrice.mid;
      pricing.cardmarket_url = normalPrice.url;
    }
    
    // Get reverse holo variant price
    const reverseHoloPrice = cardmarketPrices.find(p => p.variant === 'reverse_holo');
    if (reverseHoloPrice) {
      pricing.cardmarket_reverse_holo_sell = reverseHoloPrice.market;
      pricing.cardmarket_reverse_holo_low = reverseHoloPrice.low;
      pricing.cardmarket_reverse_holo_trend = reverseHoloPrice.mid;
    }
    
    // Calculate averages (simplified - in reality you'd need historical data)
    const allMarketPrices = cardmarketPrices
      .map(p => p.market)
      .filter((price): price is number => price !== null);
    
    if (allMarketPrices.length > 0) {
      const avgPrice = allMarketPrices.reduce((sum, price) => sum + price, 0) / allMarketPrices.length;
      pricing.cardmarket_avg_7_days = avgPrice;
      pricing.cardmarket_avg_30_days = avgPrice;
    }
  }
  
  return pricing;
}

/**
 * Adapts collection items to modal format
 */
export function adaptCollectionData(
  items: DatabaseCollectionItem[], 
  cardId: string, 
  userId: string
): CardCollectionData {
  const collectionData: CardCollectionData = {
    cardId,
    userId,
    normal: 0,
    holo: 0,
    reverseHolo: 0,
    pokeballPattern: 0,
    masterballPattern: 0,
    firstEdition: 0,
    totalQuantity: 0,
    dateAdded: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };

  if (!items || items.length === 0) {
    return collectionData;
  }

  // Map variant names to collection properties
  const variantMapping: Record<string, keyof Pick<CardCollectionData, 'normal' | 'holo' | 'reverseHolo' | 'pokeballPattern' | 'masterballPattern' | 'firstEdition'>> = {
    'normal': 'normal',
    'holo': 'holo',
    'reverse_holo': 'reverseHolo',
    'reverse holo': 'reverseHolo',
    'pokeball_pattern': 'pokeballPattern',
    'masterball_pattern': 'masterballPattern',
    'first_edition': 'firstEdition',
  };

  let earliestDate = new Date().toISOString();
  let latestDate = new Date(0).toISOString();

  items.forEach(item => {
    const variant = item.variant.toLowerCase();
    const mappedVariant = variantMapping[variant];
    
    if (mappedVariant) {
      collectionData[mappedVariant] += item.quantity;
    } else {
      // Default to normal variant for unknown variants
      collectionData.normal += item.quantity;
    }
    
    collectionData.totalQuantity += item.quantity;
    
    // Track dates
    if (item.created_at < earliestDate) {
      earliestDate = item.created_at;
    }
    if (item.updated_at > latestDate) {
      latestDate = item.updated_at;
    }
  });

  collectionData.dateAdded = earliestDate;
  collectionData.lastUpdated = latestDate;

  return collectionData;
}

/**
 * Server-side card modal service class
 */
export class CardModalService {
  /**
   * Fetches complete card data for modal display (server-side)
   */
  static async fetchCardData(cardId: string, supabaseClient: any): Promise<CardModalData | null> {
    try {
      // Fetch card with set information
      const { data: cardData, error: cardError } = await supabaseClient
        .from('tcg_cards')
        .select(`
          *,
          tcg_sets!inner (
            id,
            name,
            series,
            release_date,
            images
          )
        `)
        .eq('id', cardId)
        .single();

      if (cardError || !cardData) {
        console.error('Error fetching card:', cardError);
        return null;
      }

      // Adapt basic card data
      const adaptedCard = adaptCardData({
        ...cardData,
        set_name: cardData.tcg_sets.name,
        set_series: cardData.tcg_sets.series,
        set_release_date: cardData.tcg_sets.release_date,
        set_images: cardData.tcg_sets.images,
      });

      // Fetch pricing data
      const { data: priceData } = await supabaseClient
        .from('tcg_card_prices')
        .select('*')
        .eq('card_id', cardId);

      // Merge pricing data
      if (priceData && priceData.length > 0) {
        const pricingUpdate = aggregatePricingData(priceData);
        Object.assign(adaptedCard, pricingUpdate);
      }

      return adaptedCard;
    } catch (error) {
      console.error('Error in fetchCardData:', error);
      return null;
    }
  }

  /**
   * Fetches user collection data for a card (server-side)
   */
  static async fetchUserCollection(
    cardId: string, 
    userId: string, 
    supabaseClient: any
  ): Promise<CardCollectionData | null> {
    try {
      const { data, error } = await supabaseClient
        .from('collection_items')
        .select('*')
        .eq('card_id', cardId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching collection:', error);
        return null;
      }

      return adaptCollectionData(data || [], cardId, userId);
    } catch (error) {
      console.error('Error in fetchUserCollection:', error);
      return null;
    }
  }
}