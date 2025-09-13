import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapUIVariantToDBVariant, mapDBVariantToUIVariant } from '@/lib/variants/mapper';
import type { UIVariantType } from '@/types/variants';

/**
 * GET /api/variants/quantities
 * Get user's variant quantities for specified cards
 * 
 * Query params:
 * - cardIds: comma-separated list of card IDs
 * - cardId: single card ID (alternative to cardIds)
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
    
    const url = new URL(request.url);
    const cardIdsParam = url.searchParams.get('cardIds');
    const cardIdParam = url.searchParams.get('cardId');
    
    if (!cardIdsParam && !cardIdParam) {
      return NextResponse.json(
        { error: 'cardIds or cardId parameter is required' },
        { status: 400 }
      );
    }
    
    // Handle single card request
    if (cardIdParam) {
      const { data, error } = await supabase
        .from('collection_items')
        .select('variant, quantity')
        .eq('user_id', user.id)
        .eq('card_id', cardIdParam);
      
      if (error) {
        console.error('Error fetching user card variants:', error);
        return NextResponse.json({
          success: true,
          quantities: {} as Record<UIVariantType, number>
        });
      }
      
      const quantities: Partial<Record<UIVariantType, number>> = {};
      
      for (const row of data) {
        if (row.variant) {
          const uiVariant = mapDBVariantToUIVariant(row.variant);
          if (uiVariant) {
            quantities[uiVariant] = row.quantity || 0;
          }
        }
      }
      
      return NextResponse.json({
        success: true,
        quantities: quantities
      });
    }
    
    // Handle multiple cards request
    const cardIds = cardIdsParam!.split(',').filter(Boolean);
    
    if (cardIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid card IDs provided' },
        { status: 400 }
      );
    }
    
    if (cardIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 cards per request' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('collection_items')
      .select('card_id, variant, quantity')
      .eq('user_id', user.id)
      .in('card_id', cardIds);
    
    if (error) {
      console.error('Error fetching user variants for cards:', error);
      return NextResponse.json({
        success: true,
        data: {}
      });
    }
    
    const result: Record<string, Record<UIVariantType, number>> = {};
    
    for (const row of data) {
      if (!row.card_id || !row.variant) continue;
      
      const uiVariant = mapDBVariantToUIVariant(row.variant);
      if (!uiVariant) continue;
      
      const cardQuantities = result[row.card_id] || {} as Record<UIVariantType, number>;
      cardQuantities[uiVariant] = row.quantity || 0;
      result[row.card_id] = cardQuantities;
    }
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error fetching variant quantities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/variants/quantities
 * Update variant quantity for a card
 * 
 * Body:
 * {
 *   cardId: string;
 *   variant: UIVariantType;
 *   quantity: number;
 *   condition?: string;
 *   notes?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Validate request body
    if (!body.cardId || typeof body.cardId !== 'string') {
      return NextResponse.json(
        { error: 'cardId is required and must be a string' },
        { status: 400 }
      );
    }
    
    if (!body.variant || typeof body.variant !== 'string') {
      return NextResponse.json(
        { error: 'variant is required and must be a string' },
        { status: 400 }
      );
    }
    
    if (typeof body.quantity !== 'number' || body.quantity < 0) {
      return NextResponse.json(
        { error: 'quantity must be a non-negative number' },
        { status: 400 }
      );
    }
    
    if (body.quantity > 9999) {
      return NextResponse.json(
        { error: 'quantity cannot exceed 9999' },
        { status: 400 }
      );
    }
    
    // Validate variant type
    const validVariants: UIVariantType[] = [
      'normal', 'holo', 'reverse_holo_standard', 
      'reverse_holo_pokeball', 'reverse_holo_masterball', 
      'first_edition', 'custom'
    ];
    
    if (!validVariants.includes(body.variant as UIVariantType)) {
      return NextResponse.json(
        { error: 'Invalid variant type' },
        { status: 400 }
      );
    }
    
    // Map UI variant to database variant name
    const dbVariant = mapUIVariantToDBVariant(body.variant as UIVariantType);
    
    if (body.quantity <= 0) {
      // Delete the record if quantity is 0 or negative
      const { error } = await supabase
        .from('collection_items')
        .delete()
        .eq('user_id', user.id)
        .eq('card_id', body.cardId)
        .eq('variant', dbVariant);
      
      if (error) {
        throw new Error(`Failed to delete variant quantity: ${error.message}`);
      }
    } else {
      // Upsert the record
      const { error } = await supabase
        .from('collection_items')
        .upsert({
          user_id: user.id,
          card_id: body.cardId,
          variant: dbVariant,
          quantity: body.quantity,
          condition: body.condition,
          notes: body.notes,
        }, {
          onConflict: 'user_id,card_id,variant'
        });
      
      if (error) {
        throw new Error(`Failed to update variant quantity: ${error.message}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Variant quantity updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating variant quantity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/variants/quantities
 * Bulk update variant quantities
 * 
 * Body:
 * {
 *   updates: Array<{
 *     cardId: string;
 *     variant: UIVariantType;
 *     quantity: number;
 *     condition?: string;
 *     notes?: string;
 *   }>
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    if (!Array.isArray(body.updates)) {
      return NextResponse.json(
        { error: 'updates must be an array' },
        { status: 400 }
      );
    }
    
    if (body.updates.length === 0) {
      return NextResponse.json(
        { error: 'At least one update is required' },
        { status: 400 }
      );
    }
    
    if (body.updates.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 updates per request' },
        { status: 400 }
      );
    }
    
    // Validate each update
    const validVariants: UIVariantType[] = [
      'normal', 'holo', 'reverse_holo_standard', 
      'reverse_holo_pokeball', 'reverse_holo_masterball', 
      'first_edition', 'custom'
    ];
    
    for (const [index, update] of body.updates.entries()) {
      if (!update.cardId || typeof update.cardId !== 'string') {
        return NextResponse.json(
          { error: `Update ${index}: cardId is required and must be a string` },
          { status: 400 }
        );
      }
      
      if (!update.variant || !validVariants.includes(update.variant)) {
        return NextResponse.json(
          { error: `Update ${index}: invalid variant type` },
          { status: 400 }
        );
      }
      
      if (typeof update.quantity !== 'number' || update.quantity < 0 || update.quantity > 9999) {
        return NextResponse.json(
          { error: `Update ${index}: quantity must be between 0 and 9999` },
          { status: 400 }
        );
      }
    }
    
    // Process updates
    for (const update of body.updates) {
      const dbVariant = mapUIVariantToDBVariant(update.variant);
      
      if (update.quantity <= 0) {
        await supabase
          .from('collection_items')
          .delete()
          .eq('user_id', user.id)
          .eq('card_id', update.cardId)
          .eq('variant', dbVariant);
      } else {
        await supabase
          .from('collection_items')
          .upsert({
            user_id: user.id,
            card_id: update.cardId,
            variant: dbVariant,
            quantity: update.quantity,
            condition: update.condition,
            notes: update.notes,
          }, {
            onConflict: 'user_id,card_id,variant'
          });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully updated ${body.updates.length} variant quantities`
    });
    
  } catch (error) {
    console.error('Error bulk updating variant quantities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}