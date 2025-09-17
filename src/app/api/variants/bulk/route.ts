import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapDBVariantToUIVariant } from '@/lib/variants/mapper';
import type { UIVariantType } from '@/types/variants';

export const dynamic = 'force-dynamic';

/**
 * POST /api/variants/bulk
 * Legacy endpoint for bulk variant requests from cached JavaScript
 * This endpoint handles the old batching system that might still be cached in browsers
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
    const { cardIds } = body;
    
    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return NextResponse.json(
        { error: 'cardIds must be a non-empty array' },
        { status: 400 }
      );
    }
    
    if (cardIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 cards per request' },
        { status: 400 }
      );
    }
    
    // Get user's collection items for these cards
    const { data, error } = await supabase
      .from('collection_items')
      .select('card_id, variant, quantity')
      .eq('user_id', user.id)
      .in('card_id', cardIds);
    
    if (error) {
      console.error('Error fetching bulk user variants:', error);
      return NextResponse.json({
        success: true,
        data: {}
      });
    }
    
    // Transform to the expected format
    const result: Record<string, Record<UIVariantType, number>> = {};
    
    // Initialize all cards with empty quantities
    for (const cardId of cardIds) {
      result[cardId] = {} as Record<UIVariantType, number>;
    }
    
    // Fill in actual quantities
    for (const row of data || []) {
      if (!row.card_id || !row.variant) continue;
      
      const uiVariant = mapDBVariantToUIVariant(row.variant);
      if (!uiVariant) continue;
      
      if (!result[row.card_id]) {
        result[row.card_id] = {} as Record<UIVariantType, number>;
      }
      
      result[row.card_id][uiVariant] = row.quantity || 0;
    }
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error in bulk variants endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/variants/bulk
 * Handle GET requests by redirecting to individual endpoints
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Use POST method for bulk requests or individual GET endpoints for single cards',
      endpoints: {
        single_card: '/api/variants/quantities?cardId={cardId}',
        bulk_post: '/api/variants/bulk (POST with cardIds array)'
      }
    },
    { status: 405 }
  );
}