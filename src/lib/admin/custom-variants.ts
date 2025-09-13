import { createAdminClient } from './auth';
import type { 
  CustomCardVariant, 
  CreateCustomVariantInput, 
  UpdateCustomVariantInput,
  AdminCardSearchResult,
  AdminCardSearchFilters,
  VariantPreview
} from '@/types/custom-variants';
import { generateVariantsForCard } from '@/lib/variants/engine';

/**
 * Custom Variant Management
 * Admin-only operations for managing custom card variants
 */
export class CustomVariantManager {
  /**
   * Search cards for admin variant management
   */
  static async searchCards(filters: AdminCardSearchFilters): Promise<AdminCardSearchResult[]> {
    const supabase = await createAdminClient();
    
    try {
      console.log('Starting card search with filters:', filters);
      
      // Test basic connection first
      const { data: countData, error: countError } = await supabase
        .from('tcg_cards')
        .select('id', { count: 'exact', head: true });
      
      if (countError) {
        console.error('Database connection test failed:', countError);
        throw new Error(`Database connection failed: ${countError.message}`);
      }
      
      console.log('Total cards in database:', countData);
      
      // Build query step by step
      let query = supabase
        .from('tcg_cards')
        .select(`
          id,
          name,
          number,
          set_id,
          rarity,
          images
        `);

      // Apply search filter first
      if (filters.query) {
        const searchQuery = filters.query.toLowerCase().trim();
        console.log('Applying search filter:', searchQuery);
        
        // Check if search contains both name and number (e.g., "victini 12")
        const words = searchQuery.split(/\s+/);
        if (words.length > 1) {
          // Try to find a number in the search terms
          const numberWord = words.find(word => /^\d+$/.test(word));
          const nameWords = words.filter(word => !/^\d+$/.test(word));
          
          if (numberWord && nameWords.length > 0) {
            // Search for name AND number combination
            const nameSearchTerm = `%${nameWords.join(' ')}%`;
            const numberSearchTerm = `%${numberWord}%`;
            console.log('Searching for name:', nameSearchTerm, 'and number:', numberSearchTerm);
            query = query.ilike('name', nameSearchTerm).ilike('number', numberSearchTerm);
          } else {
            // Fallback to OR search
            const searchTerm = `%${searchQuery}%`;
            query = query.or(`name.ilike.${searchTerm},number.ilike.${searchTerm}`);
          }
        } else {
          // Single word search - use OR logic
          const searchTerm = `%${searchQuery}%`;
          query = query.or(`name.ilike.${searchTerm},number.ilike.${searchTerm}`);
        }
      }

      if (filters.set_id) {
        query = query.eq('set_id', filters.set_id);
      }

      if (filters.rarity) {
        query = query.eq('rarity', filters.rarity);
      }

      // Add order and limit
      query = query.order('name').limit(50);

      console.log('Executing main search query...');
      const { data, error } = await query;

      if (error) {
        console.error('Search query error:', error);
        throw new Error(`Failed to search cards: ${error.message}`);
      }

      console.log(`Search returned ${data?.length || 0} cards`);
      
      if (!data || data.length === 0) {
        // Try without any filters to see if we get results
        if (filters.query) {
          console.log('No results with filter, trying unfiltered query...');
          const { data: unfilteredData, error: unfilteredError } = await supabase
            .from('tcg_cards')
            .select('id, name, number')
            .limit(5);
          
          if (unfilteredError) {
            console.error('Unfiltered query failed:', unfilteredError);
          } else {
            console.log('Unfiltered sample:', unfilteredData);
          }
        }
        return [];
      }

      // Now try to get custom variants for these cards
      const cardIds = data.map(card => card.id);
      let customVariantsData: any[] = [];
      
      try {
        const { data: customVariants, error: customError } = await supabase
          .from('custom_card_variants')
          .select('*')
          .in('card_id', cardIds)
          .eq('is_active', true);
        
        if (!customError) {
          customVariantsData = customVariants || [];
        }
      } catch (customErr) {
        console.log('Custom variants table might not exist yet:', customErr);
        // Continue without custom variants
      }

      // Get set names for the cards
      const setIds = Array.from(new Set(data.map(card => card.set_id)));
      const { data: setsData } = await supabase
        .from('tcg_sets')
        .select('id, name')
        .in('id', setIds);
      
      const setNamesMap = new Map();
      if (setsData) {
        setsData.forEach(set => setNamesMap.set(set.id, set.name));
      }

      // Transform the data to match our interface
      const results: AdminCardSearchResult[] = data.map(row => {
        const cardCustomVariants = customVariantsData.filter(cv => cv.card_id === row.id);
        
        return {
          id: row.id,
          name: row.name,
          number: row.number,
          set_id: row.set_id,
          set_name: setNamesMap.get(row.set_id) || 'Unknown Set',
          rarity: row.rarity,
          images: row.images as any,
          custom_variants: cardCustomVariants as CustomCardVariant[]
        };
      });

      // Filter by custom variants if requested
      if (filters.has_custom_variants !== undefined) {
        return results.filter(card =>
          filters.has_custom_variants
            ? card.custom_variants && card.custom_variants.length > 0
            : !card.custom_variants || card.custom_variants.length === 0
        );
      }

      return results;
    } catch (error) {
      console.error('Full search error:', error);
      throw error;
    }
  }

  /**
   * Get detailed card info with variants for admin
   */
  static async getCardWithVariants(cardId: string): Promise<AdminCardSearchResult | null> {
    const supabase = await createAdminClient();
    
    const { data, error } = await supabase
      .from('tcg_cards')
      .select(`
        id,
        name,
        number,
        set_id,
        rarity,
        images,
        tcg_sets!inner(name, series, release_date),
        custom_card_variants(*)
      `)
      .eq('id', cardId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get card: ${error.message}`);
    }

    return {
      id: data.id,
      name: data.name,
      number: data.number,
      set_id: data.set_id,
      set_name: (data.tcg_sets as any).name,
      rarity: data.rarity,
      images: data.images as any,
      custom_variants: data.custom_card_variants as CustomCardVariant[]
    };
  }

  /**
   * Preview how variants will appear after changes
   */
  static async previewVariants(cardId: string): Promise<VariantPreview> {
    const card = await this.getCardWithVariants(cardId);
    if (!card) {
      throw new Error('Card not found');
    }

    // Get standard variants from the variant engine
    const engineInput = {
      card: {
        set_id: card.id,
        set_name: card.name,
        number: card.number,
        rarity: card.rarity,
        sets: {
          set_id: card.set_id,
          set_series: 'Unknown', // We'd need to get this from the set data
          releaseDate: '2023/01/01' // Default date
        }
      }
    };

    const variantResult = await generateVariantsForCard(engineInput);
    const standardVariants = variantResult.variants.map(v => v.type);

    // Get active custom variants
    const customVariants = card.custom_variants?.filter(v => v.is_active) || [];

    // Calculate what will be displayed
    const hiddenVariants: string[] = [];
    const displayVariants: string[] = [...standardVariants];

    // Remove standard variants that are replaced by custom ones
    customVariants.forEach(customVariant => {
      if (customVariant.replaces_standard_variant) {
        const index = displayVariants.indexOf(customVariant.replaces_standard_variant);
        if (index > -1) {
          displayVariants.splice(index, 1);
          hiddenVariants.push(customVariant.replaces_standard_variant);
        }
      }
    });

    return {
      standard_variants: standardVariants,
      custom_variants: customVariants,
      display_variants: displayVariants,
      hidden_variants: hiddenVariants
    };
  }

  /**
   * Get all custom variants for a card
   */
  static async getCustomVariants(cardId: string): Promise<CustomCardVariant[]> {
    const supabase = await createAdminClient();
    
    const { data, error } = await supabase
      .from('custom_card_variants')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get custom variants: ${error.message}`);
    }

    return data as CustomCardVariant[];
  }

  /**
   * Create a new custom variant
   */
  static async createCustomVariant(input: CreateCustomVariantInput): Promise<CustomCardVariant> {
    const supabase = await createAdminClient();
    
    const { data, error } = await supabase
      .from('custom_card_variants')
      .insert({
        card_id: input.card_id,
        variant_name: input.variant_name,
        variant_type: input.variant_type,
        display_name: input.display_name,
        description: input.description,
        source_product: input.source_product,
        price_usd: input.price_usd,
        price_eur: input.price_eur,
        replaces_standard_variant: input.replaces_standard_variant
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create custom variant: ${error.message}`);
    }

    return data as CustomCardVariant;
  }

  /**
   * Update a custom variant
   */
  static async updateCustomVariant(
    id: number, 
    input: UpdateCustomVariantInput
  ): Promise<CustomCardVariant> {
    const supabase = await createAdminClient();
    
    const updateData: Record<string, any> = {};
    
    if (input.variant_name !== undefined) updateData.variant_name = input.variant_name;
    if (input.variant_type !== undefined) updateData.variant_type = input.variant_type;
    if (input.display_name !== undefined) updateData.display_name = input.display_name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.source_product !== undefined) updateData.source_product = input.source_product;
    if (input.price_usd !== undefined) updateData.price_usd = input.price_usd;
    if (input.price_eur !== undefined) updateData.price_eur = input.price_eur;
    if (input.replaces_standard_variant !== undefined) updateData.replaces_standard_variant = input.replaces_standard_variant;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabase
      .from('custom_card_variants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update custom variant: ${error.message}`);
    }

    return data as CustomCardVariant;
  }

  /**
   * Delete a custom variant
   */
  static async deleteCustomVariant(id: number): Promise<void> {
    const supabase = await createAdminClient();
    
    const { error } = await supabase
      .from('custom_card_variants')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete custom variant: ${error.message}`);
    }
  }

  /**
   * Toggle active status of a custom variant
   */
  static async toggleCustomVariant(id: number, isActive: boolean): Promise<CustomCardVariant> {
    return this.updateCustomVariant(id, { is_active: isActive });
  }

  /**
   * Get statistics for admin dashboard
   */
  static async getStatistics() {
    const supabase = await createAdminClient();
    
    const [
      { count: totalCustomVariants },
      { count: activeCustomVariants },
      { count: cardsWithCustomVariants }
    ] = await Promise.all([
      supabase.from('custom_card_variants').select('*', { count: 'exact', head: true }),
      supabase.from('custom_card_variants').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('custom_card_variants').select('card_id', { count: 'exact', head: true }).eq('is_active', true)
    ]);

    return {
      total_custom_variants: totalCustomVariants || 0,
      active_custom_variants: activeCustomVariants || 0,
      cards_with_custom_variants: cardsWithCustomVariants || 0
    };
  }
}