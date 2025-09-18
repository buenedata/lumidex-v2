import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapDBVariantToUIVariant } from '@/lib/variants/mapper';
import type { UIVariantType, UIVariant } from '@/types/variants';

export const dynamic = 'force-dynamic';

/**
 * GET /api/collection/fast
 * Ultra-fast collection endpoint that bypasses complex variant engine
 * Uses simple fallback variants for instant loading
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

    const startTime = Date.now();

    // Clean up stale records with quantity 0
    await supabase
      .from('collection_items')
      .delete()
      .eq('user_id', user.id)
      .eq('quantity', 0);

    // Get user's collection with full card and set details in one optimized query
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

    // Group collection items by card for efficient processing
    const cardGroups = new Map<string, any[]>();

    collectionData.forEach((item: any) => {
      if (item.quantity <= 0) return;

      const cardId = item.card_id;
      const existing = cardGroups.get(cardId) || [];
      existing.push(item);
      cardGroups.set(cardId, existing);
    });

    // Process cards with simple, fast variant logic
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

      // Create simple variants based on what the user actually owns
      // No complex variant engine - just use what's in the database
      const allVariants: UIVariant[] = [];
      
      // Add variants based on user's actual collection
      Object.entries(userQuantities).forEach(([variantType, quantity]) => {
        if (quantity > 0) {
          allVariants.push({
            type: variantType as UIVariantType,
            userQuantity: quantity
          });
        }
      });

      // If no variants found, add a basic normal variant (shouldn't happen but safety)
      if (allVariants.length === 0) {
        allVariants.push({
          type: 'normal',
          userQuantity: 0
        });
      }

      const totalOwned = Object.values(userQuantities).reduce((sum, qty) => sum + qty, 0);

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

    const endTime = Date.now();
    const totalCards = processedCards.length;
    const totalQuantity = processedCards.reduce((sum, card) => sum + card.totalOwned, 0);

    console.log(`[FAST COLLECTION] Processed ${totalCards} cards in ${endTime - startTime}ms`);

    return NextResponse.json({
      success: true,
      data: {
        cards: processedCards,
        totalCards,
        totalQuantity,
        metadata: {
          fetchedAt: new Date().toISOString(),
          fast: true,
          processingTimeMs: endTime - startTime,
          variantEngine: false
        }
      }
    });

  } catch (error) {
    console.error('Error in fast collection endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}