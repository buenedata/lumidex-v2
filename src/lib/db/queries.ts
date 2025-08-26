import { createClient } from '@/lib/supabase/server';
import type { PriceSource, VariantName } from '@/lib/variants/mapper';

// Database types based on our schema
export interface TCGSet {
  id: string;
  name: string;
  series: string | null;
  ptcgo_code: string | null;
  printed_total: number | null;
  total: number | null;
  release_date: string | null;
  updated_at: string;
  legalities: any;
  images: any;
}

export interface TCGCard {
  id: string;
  set_id: string;
  number: string;
  name: string;
  supertype: string | null;
  subtypes: string[];
  hp: string | null;
  types: string[];
  evolves_from: string | null;
  rules: string[];
  regulation_mark: string | null;
  artist: string | null;
  rarity: string | null;
  flavor_text: string | null;
  national_pokedex_numbers: number[];
  legalities: any;
  images: any;
  updated_at: string;
}

export interface TCGCardPrice {
  card_id: string;
  source: PriceSource;
  variant: VariantName;
  last_updated: string;
  currency: string;
  low: number | null;
  mid: number | null;
  high: number | null;
  market: number | null;
  direct_low: number | null;
  url: string | null;
}

export interface TCGCardWithPrices extends TCGCard {
  prices: TCGCardPrice[];
}

export interface CollectionItem {
  id: number;
  user_id: string;
  card_id: string;
  variant: VariantName;
  quantity: number;
  condition: string | null;
  acquired_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get recent TCG sets ordered by release date
 */
export async function getRecentSets(limit = 50): Promise<TCGSet[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('tcg_sets')
    .select('*')
    .order('release_date', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching sets:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get a specific set by ID
 */
export async function getSetById(setId: string): Promise<TCGSet | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('tcg_sets')
    .select('*')
    .eq('id', setId)
    .single();
  
  if (error) {
    console.error('Error fetching set:', error);
    return null;
  }
  
  return data;
}

/**
 * Get cards for a specific set
 */
export async function getCardsForSet(setId: string): Promise<TCGCard[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('tcg_cards')
    .select('*')
    .eq('set_id', setId)
    .order('number');
  
  if (error) {
    console.error('Error fetching cards for set:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Search cards with filters and pagination
 */
export async function searchCards(options: {
  query?: string;
  setId?: string;
  types?: string[];
  rarity?: string;
  regulationMark?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ cards: TCGCard[]; totalCount: number }> {
  const supabase = createClient();
  const page = options.page || 1;
  const pageSize = options.pageSize || 24;
  const offset = (page - 1) * pageSize;
  
  let query = supabase
    .from('tcg_cards')
    .select('*', { count: 'exact' });
  
  // Apply filters
  if (options.query) {
    query = query.ilike('name', `%${options.query}%`);
  }
  
  if (options.setId) {
    query = query.eq('set_id', options.setId);
  }
  
  if (options.types && options.types.length > 0) {
    query = query.overlaps('types', options.types);
  }
  
  if (options.rarity) {
    query = query.eq('rarity', options.rarity);
  }
  
  if (options.regulationMark) {
    query = query.eq('regulation_mark', options.regulationMark);
  }
  
  // Apply pagination and ordering
  const { data, error, count } = await query
    .order('updated_at', { ascending: false })
    .range(offset, offset + pageSize - 1);
  
  if (error) {
    console.error('Error searching cards:', error);
    return { cards: [], totalCount: 0 };
  }
  
  return { 
    cards: data || [], 
    totalCount: count || 0 
  };
}

/**
 * Get cards with their prices from a specific source
 */
export async function getCardsWithPrices(
  cardIds: string[], 
  priceSource: PriceSource
): Promise<TCGCardWithPrices[]> {
  const supabase = createClient();
  
  const { data: cards, error: cardsError } = await supabase
    .from('tcg_cards')
    .select('*')
    .in('id', cardIds);
  
  if (cardsError || !cards) {
    console.error('Error fetching cards:', cardsError);
    return [];
  }
  
  const { data: prices, error: pricesError } = await supabase
    .from('tcg_card_prices')
    .select('*')
    .in('card_id', cardIds)
    .eq('source', priceSource);
  
  if (pricesError) {
    console.error('Error fetching prices:', pricesError);
    return cards.map(card => ({ ...card, prices: [] }));
  }
  
  // Group prices by card_id
  const pricesByCard = (prices || []).reduce((acc, price) => {
    if (!acc[price.card_id]) {
      acc[price.card_id] = [];
    }
    acc[price.card_id].push(price);
    return acc;
  }, {} as Record<string, TCGCardPrice[]>);
  
  return cards.map(card => ({
    ...card,
    prices: pricesByCard[card.id] || []
  }));
}

/**
 * Get user's collection items
 */
export async function getUserCollection(userId: string): Promise<CollectionItem[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('collection_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching collection:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Add item to user's collection
 */
export async function addToCollection(item: {
  user_id: string;
  card_id: string;
  variant: VariantName;
  quantity: number;
  condition?: string;
  acquired_at?: string;
  notes?: string;
}): Promise<boolean> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('collection_items')
    .upsert({
      ...item,
      acquired_at: item.acquired_at || new Date().toISOString().split('T')[0]
    }, {
      onConflict: 'user_id,card_id,variant'
    });
  
  if (error) {
    console.error('Error adding to collection:', error);
    return false;
  }
  
  return true;
}

/**
 * Update collection item quantity
 */
export async function updateCollectionQuantity(
  itemId: number, 
  quantity: number
): Promise<boolean> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('collection_items')
    .update({ quantity })
    .eq('id', itemId);
  
  if (error) {
    console.error('Error updating collection quantity:', error);
    return false;
  }
  
  return true;
}

/**
 * Remove item from collection
 */
export async function removeFromCollection(itemId: number): Promise<boolean> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('collection_items')
    .delete()
    .eq('id', itemId);
  
  if (error) {
    console.error('Error removing from collection:', error);
    return false;
  }
  
  return true;
}

/**
 * Get collection value summary
 */
export async function getCollectionValue(
  userId: string, 
  priceSource: PriceSource
): Promise<{
  totalCards: number;
  totalQuantity: number;
  totalValue: number;
  currency: string;
}> {
  const supabase = createClient();
  
  // Get collection items
  const { data: items, error: itemsError } = await supabase
    .from('collection_items')
    .select('card_id, variant, quantity')
    .eq('user_id', userId);
  
  if (itemsError || !items) {
    return { totalCards: 0, totalQuantity: 0, totalValue: 0, currency: 'EUR' };
  }
  
  if (items.length === 0) {
    return { totalCards: 0, totalQuantity: 0, totalValue: 0, currency: 'EUR' };
  }
  
  // Get prices for collection items
  const cardIds = items.map(item => item.card_id);
  const { data: prices, error: pricesError } = await supabase
    .from('tcg_card_prices')
    .select('card_id, variant, market, mid, currency')
    .in('card_id', cardIds)
    .eq('source', priceSource);
  
  if (pricesError) {
    console.error('Error fetching collection prices:', pricesError);
    return { totalCards: items.length, totalQuantity: 0, totalValue: 0, currency: 'EUR' };
  }
  
  // Calculate totals
  const priceMap = new Map<string, number>();
  let currency = 'EUR';
  
  (prices || []).forEach(price => {
    const key = `${price.card_id}-${price.variant}`;
    const value = price.market || price.mid || 0;
    priceMap.set(key, value);
    currency = price.currency || currency;
  });
  
  let totalQuantity = 0;
  let totalValue = 0;
  
  items.forEach(item => {
    totalQuantity += item.quantity;
    const key = `${item.card_id}-${item.variant}`;
    const pricePerCard = priceMap.get(key) || 0;
    totalValue += pricePerCard * item.quantity;
  });
  
  return {
    totalCards: items.length,
    totalQuantity,
    totalValue,
    currency
  };
}