// Data Persistence Layer for User Variant Quantities
// Handles CRUD operations for user collection with new variant schema

import { createClient } from '@/lib/supabase/server';
import { createBrowserClient } from '@supabase/ssr';
import type { UIVariantType } from '@/types/variants';

// Database row type for collection_items
interface CollectionItemRow {
  id: number;
  user_id: string;
  card_id: string;
  variant: string;
  quantity: number;
  condition?: string;
  acquired_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Input types
export interface UserVariantQuantity {
  cardId: string;
  variant: UIVariantType;
  quantity: number;
  condition?: string;
  notes?: string;
}

export interface UpdateVariantQuantityInput {
  cardId: string;
  variant: UIVariantType;
  quantity: number;
  condition?: string;
  notes?: string;
}

export interface BulkUpdateVariantInput {
  updates: UpdateVariantQuantityInput[];
}

/**
 * User Variant Persistence Manager
 */
export class UserVariantPersistence {
  /**
   * Get user's variant quantities for a specific card
   */
  static async getUserCardVariants(
    userId: string,
    cardId: string
  ): Promise<Record<UIVariantType, number>> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('collection_items')
      .select('variant, quantity')
      .eq('user_id', userId)
      .eq('card_id', cardId)
      .gt('quantity', 0);
    
    if (error) {
      console.error('Error fetching user card variants:', error);
      return {} as Record<UIVariantType, number>;
    }
    
    const quantities: Partial<Record<UIVariantType, number>> = {};
    
    for (const row of data) {
      if (row.variant) {
        const uiVariantType = mapLegacyVariantToNew(row.variant);
        if (uiVariantType) {
          quantities[uiVariantType] = row.quantity || 0;
        }
      }
    }
    
    return quantities as Record<UIVariantType, number>;
  }

  /**
   * Get user's variant quantities for multiple cards (bulk operation)
   */
  static async getUserVariantsForCards(
    userId: string,
    cardIds: string[]
  ): Promise<Map<string, Record<UIVariantType, number>>> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('collection_items')
      .select('card_id, variant, quantity')
      .eq('user_id', userId)
      .in('card_id', cardIds)
      .gt('quantity', 0);
    
    if (error) {
      console.error('Error fetching user variants for cards:', error);
      return new Map();
    }
    
    const result = new Map<string, Record<UIVariantType, number>>();
    
    for (const row of data) {
      if (!row.card_id || !row.variant) continue;
      
      const uiVariantType = mapLegacyVariantToNew(row.variant);
      
      if (uiVariantType) {
        const cardQuantities = result.get(row.card_id) || {} as Record<UIVariantType, number>;
        cardQuantities[uiVariantType] = row.quantity || 0;
        result.set(row.card_id, cardQuantities);
      }
    }
    
    return result;
  }

  /**
   * Get user's complete collection with variant breakdown
   */
  static async getUserCollection(userId: string): Promise<UserVariantQuantity[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('collection_items')
      .select('*')
      .eq('user_id', userId)
      .gt('quantity', 0)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user collection:', error);
      return [];
    }
    
    return data.map((row: CollectionItemRow) => {
      const uiVariantType = mapLegacyVariantToNew(row.variant);
      return {
        cardId: row.card_id,
        variant: uiVariantType || 'normal',
        quantity: row.quantity,
        condition: row.condition || undefined,
        notes: row.notes || undefined
      };
    }).filter(item => item.variant); // Filter out any unmappable variants
  }

  /**
   * Update or create a user's variant quantity
   */
  static async updateVariantQuantity(
    userId: string,
    input: UpdateVariantQuantityInput
  ): Promise<void> {
    const supabase = createClient();
    
    // Map UI variant to database variant
    const dbVariant = mapNewVariantToLegacy(input.variant);
    
    if (input.quantity <= 0) {
      // Delete the record if quantity is 0 or negative
      const { error } = await supabase
        .from('collection_items')
        .delete()
        .eq('user_id', userId)
        .eq('card_id', input.cardId)
        .eq('variant', dbVariant);
      
      if (error) {
        throw new Error(`Failed to delete variant quantity: ${error.message}`);
      }
    } else {
      // Upsert the record
      const { error } = await supabase
        .from('collection_items')
        .upsert({
          user_id: userId,
          card_id: input.cardId,
          variant: dbVariant,
          quantity: input.quantity,
          condition: input.condition,
          notes: input.notes,
        }, {
          onConflict: 'user_id,card_id,variant'
        });
      
      if (error) {
        throw new Error(`Failed to update variant quantity: ${error.message}`);
      }
    }
  }

  /**
   * Bulk update multiple variant quantities for a user
   */
  static async bulkUpdateVariantQuantities(
    userId: string,
    updates: UpdateVariantQuantityInput[]
  ): Promise<void> {
    const supabase = createClient();
    
    // Separate deletes and upserts
    const toDelete = updates.filter(u => u.quantity <= 0);
    const toUpsert = updates.filter(u => u.quantity > 0);
    
    // Process deletions
    if (toDelete.length > 0) {
      const deletePromises = toDelete.map(update => {
        const dbVariant = mapNewVariantToLegacy(update.variant);
        return supabase
          .from('collection_items')
          .delete()
          .eq('user_id', userId)
          .eq('card_id', update.cardId)
          .eq('variant', dbVariant);
      });
      
      const deleteResults = await Promise.all(deletePromises);
      const deleteErrors = deleteResults.filter(r => r.error);
      
      if (deleteErrors.length > 0) {
        console.error('Bulk delete errors:', deleteErrors);
        throw new Error(`Failed to delete ${deleteErrors.length} variant quantities`);
      }
    }
    
    // Process upserts
    if (toUpsert.length > 0) {
      const upsertData = toUpsert.map(update => ({
        user_id: userId,
        card_id: update.cardId,
        variant: mapNewVariantToLegacy(update.variant),
        quantity: update.quantity,
        condition: update.condition,
        notes: update.notes,
      }));
      
      const { error } = await supabase
        .from('collection_items')
        .upsert(upsertData, {
          onConflict: 'user_id,card_id,variant'
        });
      
      if (error) {
        throw new Error(`Failed to bulk update variant quantities: ${error.message}`);
      }
    }
  }

  /**
   * Get user's total cards count by variant type
   */
  static async getUserVariantStats(
    userId: string
  ): Promise<Record<UIVariantType, number>> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('collection_items')
      .select('variant_v2, quantity')
      .eq('user_id', userId)
      .not('variant_v2', 'is', null);
    
    if (error) {
      console.error('Error fetching user variant stats:', error);
      return {} as Record<UIVariantType, number>;
    }
    
    const stats: Partial<Record<UIVariantType, number>> = {};
    
    for (const row of data) {
      if (row.variant_v2) {
        const variant = row.variant_v2 as UIVariantType;
        stats[variant] = (stats[variant] || 0) + (row.quantity || 0);
      }
    }
    
    return stats as Record<UIVariantType, number>;
  }

  /**
   * Get user's collection value by variant (requires price data)
   */
  static async getUserCollectionValue(
    userId: string,
    priceSource: 'tcgplayer' | 'cardmarket' = 'tcgplayer'
  ): Promise<{ totalValue: number; breakdown: Record<UIVariantType, number> }> {
    const supabase = createClient();
    
    // Join collection with price data
    const { data, error } = await supabase
      .from('collection_items')
      .select(`
        variant_v2,
        quantity,
        card_id,
        tcg_card_prices!inner(
          variant,
          market,
          source
        )
      `)
      .eq('user_id', userId)
      .eq('tcg_card_prices.source', priceSource)
      .not('variant_v2', 'is', null);
    
    if (error) {
      console.error('Error fetching collection value:', error);
      return { totalValue: 0, breakdown: {} as Record<UIVariantType, number> };
    }
    
    let totalValue = 0;
    const breakdown: Partial<Record<UIVariantType, number>> = {};
    
    for (const row of data as any[]) {
      if (row.variant_v2 && row.quantity && row.tcg_card_prices?.market) {
        const variant = row.variant_v2 as UIVariantType;
        const value = row.quantity * row.tcg_card_prices.market;
        
        totalValue += value;
        breakdown[variant] = (breakdown[variant] || 0) + value;
      }
    }
    
    return {
      totalValue,
      breakdown: breakdown as Record<UIVariantType, number>
    };
  }

  /**
   * Delete all variants for a specific card
   */
  static async deleteCardVariants(
    userId: string,
    cardId: string
  ): Promise<void> {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('user_id', userId)
      .eq('card_id', cardId);
    
    if (error) {
      throw new Error(`Failed to delete card variants: ${error.message}`);
    }
  }

  /**
   * Migrate user's legacy variants to new system
   */
  static async migrateLegacyVariants(userId: string): Promise<{
    migrated: number;
    skipped: number;
    errors: string[];
  }> {
    const supabase = createClient();
    
    // Get all items with legacy variant but no variant_v2
    const { data, error } = await supabase
      .from('collection_items')
      .select('*')
      .eq('user_id', userId)
      .is('variant_v2', null)
      .not('variant', 'is', null);
    
    if (error) {
      throw new Error(`Failed to fetch legacy variants: ${error.message}`);
    }
    
    let migrated = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    for (const row of data as CollectionItemRow[]) {
      try {
        const newVariant = mapLegacyVariantToNew(row.variant);
        
        if (!newVariant) {
          skipped++;
          continue;
        }
        
        const { error: updateError } = await supabase
          .from('collection_items')
          .update({ variant_v2: newVariant })
          .eq('id', row.id);
        
        if (updateError) {
          errors.push(`Failed to migrate item ${row.id}: ${updateError.message}`);
        } else {
          migrated++;
        }
      } catch (err) {
        errors.push(`Error processing item ${row.id}: ${err}`);
      }
    }
    
    return { migrated, skipped, errors };
  }
}

/**
 * Client-side variant persistence for browser usage
 */
export class ClientVariantPersistence {
  private supabase: ReturnType<typeof createBrowserClient>;
  
  constructor() {
    this.supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  async updateVariantQuantity(input: UpdateVariantQuantityInput): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    return UserVariantPersistence.updateVariantQuantity(user.id, input);
  }

  async getUserCardVariants(cardId: string): Promise<Record<UIVariantType, number>> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return {} as Record<UIVariantType, number>;
    
    return UserVariantPersistence.getUserCardVariants(user.id, cardId);
  }

  async bulkUpdateVariantQuantities(updates: UpdateVariantQuantityInput[]): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    return UserVariantPersistence.bulkUpdateVariantQuantities(user.id, updates);
  }
}

/**
 * Helper functions for variant mapping during transition
 */
function mapNewVariantToLegacy(newVariant: UIVariantType): string {
  const mapping: Record<UIVariantType, string> = {
    normal: 'normal',
    holo: 'holofoil',
    reverse_holo_standard: 'reverse_holofoil',
    reverse_holo_pokeball: 'first_edition_normal', // Use existing enum value to avoid conflicts
    reverse_holo_masterball: 'first_edition_holofoil', // Use existing enum value to avoid conflicts
    first_edition: 'first_edition_normal',
    custom: 'unlimited' // Use existing enum value to avoid conflicts
  };
  
  return mapping[newVariant] || 'normal';
}

function mapLegacyVariantToNew(legacyVariant: string): UIVariantType | null {
  const mapping: Record<string, UIVariantType> = {
    normal: 'normal',
    holofoil: 'holo',
    reverse_holofoil: 'reverse_holo_standard',
    reverse_holo_pokeball: 'reverse_holo_pokeball',
    reverse_holo_masterball: 'reverse_holo_masterball',
    first_edition_normal: 'first_edition',
    first_edition_holofoil: 'first_edition',
    unlimited: 'normal'
  };
  
  return mapping[legacyVariant] || null;
}

/**
 * Utility function to create client instance for browser usage
 */
export function createClientVariantPersistence(): ClientVariantPersistence {
  return new ClientVariantPersistence();
}