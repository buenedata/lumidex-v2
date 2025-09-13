import { NextRequest, NextResponse } from 'next/server';
import { generateVariantsForCard, generateVariantsForSet } from '@/lib/variants/engine';
import { UserVariantPersistence } from '@/lib/variants/persistence';
import { createClient } from '@/lib/supabase/server';
import type { PokemonTCGCard } from '@/lib/pokeapi/client';

/**
 * POST /api/variants/engine
 * Generate variants for cards using the Variant Rule Engine
 * 
 * Body:
 * {
 *   mode: 'single' | 'bulk';
 *   card?: PokemonTCGCard; // For single mode
 *   setId?: string; // For bulk mode
 *   cards?: PokemonTCGCard[]; // For bulk mode
 *   includeUserQuantities?: boolean;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.mode || (body.mode !== 'single' && body.mode !== 'bulk')) {
      return NextResponse.json(
        { error: 'mode must be either "single" or "bulk"' },
        { status: 400 }
      );
    }
    
    let userId: string | null = null;
    
    // Get user if requested for user quantities
    if (body.includeUserQuantities) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }
    
    if (body.mode === 'single') {
      if (!body.card) {
        return NextResponse.json(
          { error: 'card is required for single mode' },
          { status: 400 }
        );
      }
      
      // Get user quantities if requested
      let userQuantities;
      if (userId) {
        userQuantities = await UserVariantPersistence.getUserCardVariants(
          userId,
          body.card.set_id
        );
      }
      
      const result = await generateVariantsForCard({
        card: body.card,
        userQuantities
      });
      
      return NextResponse.json({
        success: true,
        data: result
      });
    }
    
    if (body.mode === 'bulk') {
      if (!body.setId || !Array.isArray(body.cards)) {
        return NextResponse.json(
          { error: 'setId and cards array are required for bulk mode' },
          { status: 400 }
        );
      }
      
      if (body.cards.length > 500) {
        return NextResponse.json(
          { error: 'Maximum 500 cards per bulk request' },
          { status: 400 }
        );
      }
      
      // Get user collection data if requested
      let userCollectionData;
      if (userId) {
        const cardIds = body.cards.map((card: any) => card.set_id);
        userCollectionData = await UserVariantPersistence.getUserVariantsForCards(
          userId,
          cardIds
        );
      }
      
      const result = await generateVariantsForSet({
        setId: body.setId,
        cards: body.cards,
        userCollectionData
      });
      
      return NextResponse.json({
        success: true,
        data: {
          results: result.results,
          setPolicy: result.setPolicy,
          errors: result.errors
        }
      });
    }
    
  } catch (error) {
    console.error('Error in variant engine:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}