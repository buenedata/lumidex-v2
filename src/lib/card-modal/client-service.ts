// Client-side service for card modal data operations

import { createClient } from '@/lib/supabase/client';
import type {
  DatabaseCard,
  DatabaseCardPrice,
  DatabaseCollectionItem,
  CardModalData,
  CardCollectionData
} from '@/types/card-modal';
import { adaptCardData, aggregatePricingData, adaptCollectionData } from './adapter';

/**
 * Client-side service class for card modal data operations
 */
export class CardModalClientService {
  private supabase;

  constructor() {
    this.supabase = createClient();
  }

  /**
   * Fetches complete card data for modal display
   */
  async fetchCardData(cardId: string): Promise<CardModalData | null> {
    try {
      // Fetch card data first
      const { data: cardData, error: cardError } = await this.supabase
        .from('tcg_cards')
        .select('*')
        .eq('id', cardId)
        .single();

      if (cardError || !cardData) {
        console.error('Error fetching card:', cardError);
        return null;
      }

      // Fetch set information separately
      const { data: setData, error: setError } = await this.supabase
        .from('tcg_sets')
        .select('id, name, series, release_date, images')
        .eq('id', cardData.set_id)
        .single();

      if (setError) {
        console.error('Error fetching set:', setError);
        // Continue without set data
      }

      // Adapt basic card data
      const adaptedCard = adaptCardData({
        ...cardData,
        set_name: setData?.name || null,
        set_series: setData?.series || null,
        set_release_date: setData?.release_date || null,
        set_images: setData?.images || null,
      });

      // Fetch pricing data
      const { data: priceData } = await this.supabase
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
   * Fetches user collection data for a card
   */
  async fetchUserCollection(cardId: string, userId: string): Promise<CardCollectionData | null> {
    try {
      const { data, error } = await this.supabase
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

  /**
   * Updates user collection item quantity
   */
  async updateCollectionQuantity(
    cardId: string,
    userId: string,
    variant: string,
    quantity: number,
    condition: string = 'near_mint'
  ): Promise<boolean> {
    try {
      if (quantity <= 0) {
        // Remove the item
        const { error } = await this.supabase
          .from('collection_items')
          .delete()
          .eq('card_id', cardId)
          .eq('user_id', userId)
          .eq('variant', variant);

        return !error;
      }

      // Check if item exists
      const { data: existing } = await this.supabase
        .from('collection_items')
        .select('id')
        .eq('card_id', cardId)
        .eq('user_id', userId)
        .eq('variant', variant)
        .single();

      if (existing) {
        // Update existing
        const { error } = await this.supabase
          .from('collection_items')
          .update({ 
            quantity, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', existing.id);

        return !error;
      } else {
        // Insert new
        const { error } = await this.supabase
          .from('collection_items')
          .insert({
            user_id: userId,
            card_id: cardId,
            variant,
            quantity,
            condition,
          });

        return !error;
      }
    } catch (error) {
      console.error('Error updating collection:', error);
      return false;
    }
  }

  /**
   * Gets current user
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      if (error) {
        console.error('Error getting user:', error);
        return null;
      }
      return user;
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      return null;
    }
  }
}