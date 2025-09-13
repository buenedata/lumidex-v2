import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/user/collection/set/[setId]
 * Reset user's collection for a specific set (remove all cards from that set)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { setId: string } }
) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { setId } = params;

    if (!setId) {
      return NextResponse.json(
        { error: 'Set ID is required' },
        { status: 400 }
      );
    }

    // Verify that the set exists
    const { data: setData, error: setError } = await supabase
      .from('tcg_sets')
      .select('id, name')
      .eq('id', setId)
      .single();

    if (setError || !setData) {
      return NextResponse.json(
        { error: 'Set not found' },
        { status: 404 }
      );
    }

    // Get all cards from this set to build the list of card IDs to delete
    const { data: setCards, error: cardsError } = await supabase
      .from('tcg_cards')
      .select('id')
      .eq('set_id', setId);

    if (cardsError) {
      console.error('Error fetching set cards:', cardsError);
      return NextResponse.json(
        { error: 'Failed to fetch set cards' },
        { status: 500 }
      );
    }

    const cardIds = setCards.map(card => card.id);

    if (cardIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No cards found in this set',
        deletedCount: 0
      });
    }

    // Delete all collection items for cards in this set for the current user
    const { data: deletedItems, error: deleteError } = await supabase
      .from('collection_items')
      .delete()
      .eq('user_id', user.id)
      .in('card_id', cardIds)
      .select('id, card_id, variant_v2, quantity');

    if (deleteError) {
      console.error('Error deleting collection items:', deleteError);
      return NextResponse.json(
        { error: 'Failed to reset collection' },
        { status: 500 }
      );
    }

    const deletedCount = deletedItems?.length || 0;
    const totalQuantity = deletedItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

    return NextResponse.json({
      success: true,
      message: `Successfully reset collection for ${setData.name}`,
      deletedCount,
      totalQuantity,
      setName: setData.name
    });

  } catch (error) {
    console.error('Error in collection reset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/collection/set/[setId]
 * Get user's collection stats for a specific set
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { setId: string } }
) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { setId } = params;

    if (!setId) {
      return NextResponse.json(
        { error: 'Set ID is required' },
        { status: 400 }
      );
    }

    // Get all cards from this set
    const { data: setCards, error: cardsError } = await supabase
      .from('tcg_cards')
      .select('id')
      .eq('set_id', setId);

    if (cardsError) {
      console.error('Error fetching set cards:', cardsError);
      return NextResponse.json(
        { error: 'Failed to fetch set cards' },
        { status: 500 }
      );
    }

    const cardIds = setCards.map(card => card.id);

    if (cardIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalCards: 0,
          collectedCards: 0,
          totalQuantity: 0
        }
      });
    }

    // Get user's collection items for this set
    const { data: collectionItems, error: collectionError } = await supabase
      .from('collection_items')
      .select('card_id, variant_v2, quantity')
      .eq('user_id', user.id)
      .in('card_id', cardIds)
      .not('variant_v2', 'is', null);

    if (collectionError) {
      console.error('Error fetching collection items:', collectionError);
      return NextResponse.json(
        { error: 'Failed to fetch collection' },
        { status: 500 }
      );
    }

    // Calculate stats
    const uniqueCardsCollected = new Set(collectionItems.map(item => item.card_id)).size;
    const totalQuantity = collectionItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        totalCards: cardIds.length,
        collectedCards: uniqueCardsCollected,
        totalQuantity,
        completionPercentage: cardIds.length > 0 ? Math.round((uniqueCardsCollected / cardIds.length) * 100) : 0
      }
    });

  } catch (error) {
    console.error('Error in collection stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}