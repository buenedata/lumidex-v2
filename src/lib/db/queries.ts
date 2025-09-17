import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PriceSource, VariantName } from '@/lib/variants/mapper';
import { mapDBVariantToUIVariant as mapDBToUI } from '@/lib/variants/mapper';
import type { TCGType, CurrencyCode, UserPreferences } from '@/types';
import { currencyConverter, type ConversionResult } from '@/lib/currency/conversion';

// Database types based on our schema
export interface TCGSet {
  id: string;
  name: string;
  series: string | null;
  tcg_type: TCGType;
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

export interface TCGCardWithConvertedPrices extends TCGCard {
  prices: (TCGCardPrice & {
    converted_amount?: number;
    converted_currency?: CurrencyCode;
    conversion_rate?: number;
    conversion_error?: string;
    is_approximate?: boolean;
  })[];
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

export interface UserProfile {
  id: string;
  username?: string;
  display_name?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatar_url?: string;
  banner_url?: string;
  preferred_currency: CurrencyCode;
  preferred_price_source: PriceSource;
  created_at: string;
  updated_at?: string;
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
 * Get sets by TCG type, optionally filtered by series
 */
export async function getSetsByTCGType(
  tcgType: TCGType,
  series?: string,
  limit = 50
): Promise<TCGSet[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('tcg_sets')
    .select('*')
    .eq('tcg_type', tcgType);
  
  if (series) {
    query = query.eq('series', series);
  }
  
  const { data, error } = await query
    .order('release_date', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching sets by TCG type:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get all series grouped by TCG type for megamenu, sorted by newest release date
 */
export async function getSeriesByTCGType(): Promise<Record<TCGType, string[]>> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('tcg_sets')
    .select('tcg_type, series, release_date')
    .not('series', 'is', null)
    .order('tcg_type')
    .order('release_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching series by TCG type:', error);
    return {} as Record<TCGType, string[]>;
  }
  
  // Group series by TCG type and maintain release date order
  const grouped = (data || []).reduce((acc, row) => {
    const tcg_type = row.tcg_type as TCGType;
    const series = row.series;
    if (!acc[tcg_type]) {
      acc[tcg_type] = [];
    }
    if (series && !acc[tcg_type].includes(series)) {
      acc[tcg_type].push(series);
    }
    return acc;
  }, {} as Record<TCGType, string[]>);
  
  return grouped;
}

/**
 * Get recent sets for each TCG type for megamenu preview
 */
export async function getRecentSetsByTCGType(limit = 6): Promise<Record<TCGType, TCGSet[]>> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('tcg_sets')
    .select('*')
    .order('tcg_type')
    .order('release_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching recent sets by TCG type:', error);
    return {} as Record<TCGType, TCGSet[]>;
  }
  
  // Group and limit sets by TCG type
  const grouped = (data || []).reduce((acc, set) => {
    const tcg_type = set.tcg_type as TCGType;
    if (!acc[tcg_type]) {
      acc[tcg_type] = [];
    }
    if (acc[tcg_type].length < limit) {
      acc[tcg_type].push(set as TCGSet);
    }
    return acc;
  }, {} as Record<TCGType, TCGSet[]>);
  
  return grouped;
}

/**
 * Search sets across all TCG types
 */
export async function searchSetsAcrossTCGs(query: string, limit = 20): Promise<TCGSet[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('tcg_sets')
    .select('*')
    .or(`name.ilike.%${query}%, series.ilike.%${query}%`)
    .order('release_date', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error searching sets:', error);
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
    .eq('set_id', setId);
  
  if (error) {
    console.error('Error fetching cards for set:', error);
    return [];
  }
  
  // Sort cards numerically by number (handle formats like "001", "001/100", etc.)
  const sortedData = (data || []).sort((a, b) => {
    // Extract the numeric part before any slash or non-digit character
    const getNumericValue = (number: string) => {
      const match = number.match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    };
    
    const aNum = getNumericValue(a.number);
    const bNum = getNumericValue(b.number);
    
    return aNum - bNum;
  });
  
  return sortedData;
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
 * Get cards with their prices converted to user's preferred currency
 */
export async function getCardsWithConvertedPrices(
  cardIds: string[],
  priceSource: PriceSource,
  userCurrency?: CurrencyCode
): Promise<TCGCardWithConvertedPrices[]> {
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
  
  // Convert prices to user's preferred currency if specified
  const cardsWithConvertedPrices = await Promise.all(
    cards.map(async (card) => {
      const cardPrices = pricesByCard[card.id] || [];
      
      if (!userCurrency || cardPrices.length === 0) {
        return {
          ...card,
          prices: cardPrices
        };
      }
      
      // Convert each price to user's preferred currency
      const convertedPrices = await Promise.all(
        cardPrices.map(async (price: TCGCardPrice) => {
          try {
            const marketPrice = price.market || price.mid || 0;
            if (marketPrice === 0) {
              return price;
            }
            
            const conversion = await currencyConverter.convert(
              marketPrice,
              price.currency as CurrencyCode,
              userCurrency
            );
            
            return {
              ...price,
              converted_amount: conversion.convertedAmount,
              converted_currency: conversion.toCurrency,
              conversion_rate: conversion.exchangeRate,
              conversion_error: conversion.error,
              is_approximate: conversion.isApproximate
            };
          } catch (error) {
            console.warn(`Failed to convert price for card ${card.id}:`, error);
            return {
              ...price,
              conversion_error: error instanceof Error ? error.message : 'Conversion failed'
            };
          }
        })
      );
      
      return {
        ...card,
        prices: convertedPrices
      };
    })
  );
  
  return cardsWithConvertedPrices;
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
 * Get user's collection items with full card and set details including images
 */
export async function getUserCollectionWithDetails(userId: string): Promise<any[]> {
  const supabase = createClient();
  
  // First, clean up any stale records with quantity 0
  await supabase
    .from('collection_items')
    .delete()
    .eq('user_id', userId)
    .eq('quantity', 0);
  
  const { data, error } = await supabase
    .from('collection_items')
    .select(`
      *,
      card:tcg_cards!inner (
        *,
        set:tcg_sets!inner (*)
      )
    `)
    .eq('user_id', userId)
    .gt('quantity', 0)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching collection with details:', error);
    return [];
  }
  
  // Additional filter to ensure no zero quantities slip through
  let filteredData = (data || []).filter(item => item.quantity > 0);
  
  // Clean up invalid variants by validating against the variant engine
  filteredData = await cleanupInvalidVariants(userId, filteredData);
  
  return filteredData;
}

/**
 * Clean up invalid variant records that don't match the variant engine rules
 */
async function cleanupInvalidVariants(userId: string, collectionData: any[]): Promise<any[]> {
  // Skip variant validation during server-side rendering to prevent 500 errors
  if (typeof window === 'undefined') {
    console.log('Skipping variant cleanup during SSR');
    return collectionData;
  }
  
  const supabase = createClient();
  const validRecords: any[] = [];
  const invalidRecords: any[] = [];
  
  // Group records by card to validate variants
  const cardGroups = new Map<string, any[]>();
  collectionData.forEach(item => {
    const cardId = item.card_id;
    const existing = cardGroups.get(cardId) || [];
    existing.push(item);
    cardGroups.set(cardId, existing);
  });
  
  // Validate each card's variants against the engine
  for (const [cardId, items] of Array.from(cardGroups.entries())) {
    try {
      const firstItem = items[0];
      const card = firstItem.card;
      
      // Get valid variants from the engine
      const engineResponse = await fetch(`/api/variants/engine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'single',
          card: {
            set_id: card.id,
            set_name: card.name,
            number: card.number,
            rarity: card.rarity,
            sets: {
              set_id: card.set_id,
              set_series: card.set?.name || 'Unknown',
              releaseDate: card.set?.release_date || '2023/01/01'
            }
          },
          includeUserQuantities: false
        })
      });
      
      if (engineResponse.ok) {
        const engineData = await engineResponse.json();
        const validVariantTypes = new Set(
          engineData.data.variants.map((v: any) => v.type)
        );
        
        // Check each database record against valid variants
        for (const item of items) {
          // Map database variant to UI variant type
          const uiVariantType = mapDBVariantToUIVariant(item.variant);
          
          if (uiVariantType && validVariantTypes.has(uiVariantType)) {
            validRecords.push(item);
          } else {
            console.warn(`Invalid variant found: ${item.variant} for card ${card.name} (${cardId})`);
            invalidRecords.push(item);
          }
        }
      } else {
        console.warn(`Failed to validate variants for card ${cardId}, keeping all records`);
        validRecords.push(...items);
      }
    } catch (error) {
      console.error(`Error validating variants for card ${cardId}:`, error);
      // On error, keep the records to avoid data loss
      validRecords.push(...items);
    }
  }
  
  // Delete invalid records from database
  if (invalidRecords.length > 0) {
    console.log(`Cleaning up ${invalidRecords.length} invalid variant records`);
    
    for (const invalidRecord of invalidRecords) {
      await supabase
        .from('collection_items')
        .delete()
        .eq('id', invalidRecord.id);
    }
  }
  
  return validRecords;
}

/**
 * Wrapper function to maintain compatibility with existing code
 * @deprecated Use mapDBVariantToUIVariant from '@/lib/variants/mapper' directly
 */
function mapDBVariantToUIVariant(dbVariant: string): string | null {
  const uiVariant = mapDBToUI(dbVariant);
  return uiVariant; // This returns UIVariantType | null, which is compatible with string | null
}

/**
 * Get user's collection statistics and overview data
 */
export async function getUserCollectionStats(userId: string): Promise<{
  totalCards: number;
  totalQuantity: number;
  completedSets: number;
  rarityBreakdown: Array<{ label: string; count: number; percentage: number }>;
  recentSets: Array<{ id: string; name: string; series: string; totalCards: number; ownedCards: number; completionPercentage: number; images: any }>;
}> {
  const supabase = createClient();
  
  // Get collection items with card details
  const { data: items, error: itemsError } = await supabase
    .from('collection_items')
    .select(`
      *,
      card:tcg_cards!inner (
        *,
        set:tcg_sets!inner (*)
      )
    `)
    .eq('user_id', userId);
  
  if (itemsError || !items) {
    return {
      totalCards: 0,
      totalQuantity: 0,
      completedSets: 0,
      rarityBreakdown: [],
      recentSets: []
    };
  }
  
  // Calculate totals
  const totalCards = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  
  // Calculate rarity breakdown
  const rarityCount: Record<string, number> = {};
  items.forEach(item => {
    const rarity = item.card.rarity || 'Unknown';
    rarityCount[rarity] = (rarityCount[rarity] || 0) + item.quantity;
  });
  
  const rarityBreakdown = Object.entries(rarityCount).map(([label, count]) => ({
    label,
    count,
    percentage: Math.round((count / totalQuantity) * 100)
  }));
  
  // Get recent sets with completion data
  const setStats = new Map<string, { set: any; owned: number; total: number }>();
  
  items.forEach(item => {
    const setId = item.card.set.id;
    if (!setStats.has(setId)) {
      setStats.set(setId, {
        set: item.card.set,
        owned: 0,
        total: item.card.set.total || 0
      });
    }
    setStats.get(setId)!.owned += 1;
  });
  
  const recentSets = Array.from(setStats.values())
    .slice(0, 5)
    .map(({ set, owned, total }) => ({
      id: set.id,
      name: set.name,
      series: set.series || 'Unknown',
      totalCards: total,
      ownedCards: owned,
      completionPercentage: total > 0 ? Math.round((owned / total) * 100) : 0,
      images: set.images
    }));
  
  return {
    totalCards,
    totalQuantity,
    completedSets: recentSets.filter(s => s.completionPercentage === 100).length,
    rarityBreakdown,
    recentSets
  };
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
 * Get collection value summary with currency conversion
 */
export async function getCollectionValue(
  userId: string,
  priceSource: PriceSource,
  userCurrency?: CurrencyCode
): Promise<{
  totalCards: number;
  totalQuantity: number;
  totalValue: number;
  currency: string;
  originalValue?: number;
  originalCurrency?: string;
  conversionRate?: number;
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
  
  // Convert to user's preferred currency if specified
  let finalValue = totalValue;
  let finalCurrency = currency;
  let conversionInfo: { originalValue?: number; originalCurrency?: string; conversionRate?: number } = {};

  if (userCurrency && currency !== userCurrency) {
    try {
      const conversion = await currencyConverter.convert(
        totalValue,
        currency as CurrencyCode,
        userCurrency
      );
      
      if (!conversion.error) {
        conversionInfo = {
          originalValue: totalValue,
          originalCurrency: currency,
          conversionRate: conversion.exchangeRate
        };
        finalValue = conversion.convertedAmount;
        finalCurrency = userCurrency;
      }
    } catch (error) {
      console.warn('Failed to convert collection value:', error);
    }
  }

  return {
    totalCards: items.length,
    totalQuantity,
    totalValue: finalValue,
    currency: finalCurrency,
    ...conversionInfo
  };
}

/**
 * Update user profile
 */
export async function updateProfile(userId: string, updates: {
  display_name?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatar_url?: string;
  banner_url?: string;
}): Promise<boolean> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  
  if (error) {
    console.error('Error updating profile:', error);
    return false;
  }
  
  return true;
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  
  return data;
}

/**
 * Create or update user profile
 */
export async function upsertProfile(userId: string, profileData: {
  username?: string;
  display_name?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatar_url?: string;
  banner_url?: string;
  preferred_currency?: CurrencyCode;
  preferred_price_source?: PriceSource;
}): Promise<boolean> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      ...profileData
    });
  
  if (error) {
    console.error('Error upserting profile:', error);
    return false;
  }
  
  return true;
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<boolean> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('profiles')
    .update(preferences)
    .eq('id', userId);
  
  if (error) {
    console.error('Error updating user preferences:', error);
    return false;
  }
  
  return true;
}

/**
 * Get user preferences
 */
export async function getUserPreferences(userId: string, supabaseClient?: SupabaseClient): Promise<UserPreferences | null> {
  const supabase = supabaseClient || createClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('preferred_currency, preferred_price_source')
    .eq('id', userId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No profile found - try to create one for authenticated user
      console.log('No profile found for user, attempting to create profile');
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          preferred_currency: 'NOK' as CurrencyCode,
          preferred_price_source: 'cardmarket' as PriceSource
        });
      
      if (insertError) {
        console.error('Error creating profile:', insertError);
        // Return defaults if creation fails
        return {
          preferred_currency: 'NOK',
          preferred_price_source: 'cardmarket'
        };
      }
      
      // Return the default preferences we just inserted
      return {
        preferred_currency: 'NOK',
        preferred_price_source: 'cardmarket'
      };
    }
    
    console.error('Error fetching user preferences:', error);
    return null;
  }
  
  return data;
}

/**
 * Delete all collection items for a user (dangerous operation)
 */
export async function deleteUserCollection(userId: string): Promise<boolean> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('collection_items')
    .delete()
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error deleting user collection:', error);
    return false;
  }
  
  return true;
}

/**
 * Delete user account and all associated data (dangerous operation)
 */
export async function deleteUserAccount(userId: string): Promise<boolean> {
  const supabase = createClient();
  
  // Delete collection items first (cascade should handle this, but explicit is better)
  const { error: collectionError } = await supabase
    .from('collection_items')
    .delete()
    .eq('user_id', userId);
  
  if (collectionError) {
    console.error('Error deleting user collection:', collectionError);
    return false;
  }
  
  // Delete profile
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);
  
  if (profileError) {
    console.error('Error deleting user profile:', profileError);
    return false;
  }
  
  // Note: Supabase auth user deletion should be handled separately
  // via admin API or auth.admin.deleteUser()
  
  return true;
}

/**
 * Get collection item count for user (for confirmation dialogs)
 */
export async function getUserCollectionCount(userId: string): Promise<number> {
  const supabase = createClient();
  
  const { count, error } = await supabase
    .from('collection_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error counting collection items:', error);
    return 0;
  }
  
  return count || 0;
}