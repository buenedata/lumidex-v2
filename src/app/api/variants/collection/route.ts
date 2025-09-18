import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateVariantsForSet } from '@/lib/variants/engine';
import { mapDBVariantToUIVariant } from '@/lib/variants/mapper';
import type { UIVariantType, UIVariant } from '@/types/variants';

export const dynamic = 'force-dynamic';

/**
 * GET /api/variants/collection
 * Get user's collection with all variants optimized for bulk operations
 * This endpoint solves the N+1 query problem by fetching everything in one go
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // First, clean up any stale records with quantity 0
    await supabase
      .from('collection_items')
      .delete()
      .eq('user_id', user.id)
      .eq('quantity', 0);

    // Get user's collection with full card and set details
    const { data: collectionData, error: collectionError } = await supabase
      .from('collection_items')
      .select(`
        *,
        card:tcg_cards!inner (
          *,
          set:tcg_sets!inner (*)
        )
      `)
      .eq('user_id', user.id)
      .gt('quantity', 0)
      .order('created_at', { ascending: false });

    if (collectionError) {
      console.error('Error fetching collection:', collectionError);
      return NextResponse.json(
        { error: 'Failed to fetch collection' },
        { status: 500 }
      );
    }

    if (!collectionData || collectionData.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          cards: [],
          totalCards: 0,
          totalQuantity: 0
        }
      });
    }

    // Group collection items by card and set for efficient processing
    const cardGroups = new Map<string, any[]>();
    const setCards = new Map<string, any[]>();

    collectionData.forEach((item: any) => {
      // Filter out items with quantity <= 0 as an extra safety check
      if (item.quantity <= 0) return;

      const cardId = item.card_id;
      const setId = item.card.set_id;

      // Group by card ID for quantity aggregation
      const existing = cardGroups.get(cardId) || [];
      existing.push(item);
      cardGroups.set(cardId, existing);

      // Group by set for bulk variant generation
      const setCardsArray = setCards.get(setId) || [];
      const cardExists = setCardsArray.find(c => c.set_id === cardId);
      if (!cardExists) {
        setCardsArray.push({
          set_id: cardId,
          set_name: item.card.name,
          number: item.card.number,
          rarity: item.card.rarity,
          sets: {
            set_id: setId,
            set_series: item.card.set.name || 'Unknown',
            releaseDate: item.card.set.release_date || '2023/01/01'
          }
        });
        setCards.set(setId, setCardsArray);
      }
    });

    // Generate variants for all sets in bulk with performance tracking
    const variantsByCard = new Map<string, UIVariant[]>();
    const startVariantTime = Date.now();
    
    console.log(`[COLLECTION API] Processing ${setCards.size} sets with ${Array.from(setCards.values()).reduce((sum, cards) => sum + cards.length, 0)} total cards`);
    
    // Process sets in smaller batches to avoid timeouts
    const setEntries = Array.from(setCards.entries());
    const batchSize = 3; // Process 3 sets at a time
    
    for (let i = 0; i < setEntries.length; i += batchSize) {
      const batch = setEntries.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async ([setId, cards]) => {
        try {
          const setStartTime = Date.now();
          
          const variantResult = await generateVariantsForSet({
            setId,
            cards,
            userCollectionData: undefined // We'll add user quantities separately
          });

          const setEndTime = Date.now();
          console.log(`[COLLECTION API] Set ${setId}: ${cards.length} cards processed in ${setEndTime - setStartTime}ms`);

          // Process variant results for each card
          if (variantResult.results) {
            Object.entries(variantResult.results).forEach(([cardId, result]: [string, any]) => {
              if (result.variants) {
                const uiVariants: UIVariant[] = result.variants.map((variant: any) => ({
                  type: variant.type as UIVariantType,
                  userQuantity: 0, // Will be filled below
                  customVariantData: variant.customVariantData
                }));
                variantsByCard.set(cardId, uiVariants);
              }
            });
          }
        } catch (error) {
          console.error(`Error generating variants for set ${setId}:`, error);
          
          // Fallback: create basic variants for cards in this set
          cards.forEach((card: any) => {
            const basicVariants: UIVariant[] = ['normal', 'holo', 'reverse_holo_standard'].map(type => ({
              type: type as UIVariantType,
              userQuantity: 0
            }));
            variantsByCard.set(card.set_id, basicVariants);
          });
        }
      });
      
      // Wait for this batch to complete before processing the next
      await Promise.all(batchPromises);
    }
    
    const endVariantTime = Date.now();
    console.log(`[COLLECTION API] All variants processed in ${endVariantTime - startVariantTime}ms`);

    // Process cards with their variants and user quantities
    const processedCards: any[] = [];

    for (const [cardId, items] of Array.from(cardGroups.entries())) {
      const firstItem = items[0];
      const card = firstItem.card;
      const set = card.set;

      // Calculate user quantities for each variant
      const userQuantities: Partial<Record<UIVariantType, number>> = {};
      items.forEach((item: any) => {
        const uiVariantType = mapDBVariantToUIVariant(item.variant);
        if (uiVariantType && item.quantity > 0) {
          userQuantities[uiVariantType] = item.quantity;
        }
      });

      // Get variants for this card
      let allVariants = variantsByCard.get(cardId) || [];
      
      // If no variants found, create basic ones
      if (allVariants.length === 0) {
        allVariants = ['normal', 'holo', 'reverse_holo_standard'].map(type => ({
          type: type as UIVariantType,
          userQuantity: 0
        }));
      }

      // Apply user quantities to variants
      allVariants = allVariants.map(variant => ({
        ...variant,
        userQuantity: userQuantities[variant.type] || 0
      }));

      const totalOwned = Object.values(userQuantities).reduce((sum, qty) => sum + qty, 0);

      // Only include cards that have any collection entries
      if (totalOwned > 0) {
        const collectionCard = {
          id: card.id,
          name: card.name,
          number: card.number,
          rarity: card.rarity,
          types: card.types,
          hp: card.hp ? parseInt(card.hp, 10) : undefined,
          supertype: card.supertype,
          setId: set.id,
          setName: set.name,
          variants: allVariants,
          userQuantities,
          totalOwned,
          images: card.images || {}
        };

        processedCards.push(collectionCard);
      }
    }

    // Calculate summary statistics
    const totalCards = processedCards.length;
    const totalQuantity = processedCards.reduce((sum, card) => sum + card.totalOwned, 0);

    return NextResponse.json({
      success: true,
      data: {
        cards: processedCards,
        totalCards,
        totalQuantity,
        metadata: {
          fetchedAt: new Date().toISOString(),
          optimized: true,
          variantSetsProcessed: setCards.size
        }
      }
    });

  } catch (error) {
    console.error('Error in optimized collection endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}