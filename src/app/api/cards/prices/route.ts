import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cardPriceService } from '@/lib/db/price-queries';
import type { UserPreferences } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardIds, forcePreferences } = body;
    
    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return NextResponse.json(
        { error: 'cardIds array is required' },
        { status: 400 }
      );
    }
    
    if (cardIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 cards per request' },
        { status: 400 }
      );
    }
    
    // Validate card IDs are strings
    if (!cardIds.every(id => typeof id === 'string' && id.length > 0)) {
      return NextResponse.json(
        { error: 'All cardIds must be non-empty strings' },
        { status: 400 }
      );
    }
    
    // Get user preferences
    let userPreferences: UserPreferences = {
      preferred_currency: 'EUR',
      preferred_price_source: 'cardmarket'
    };
    
    if (forcePreferences) {
      // Validate forced preferences
      if (forcePreferences.preferred_currency && 
          !['EUR', 'USD', 'GBP', 'NOK'].includes(forcePreferences.preferred_currency)) {
        return NextResponse.json(
          { error: 'Invalid preferred_currency. Must be EUR, USD, GBP, or NOK' },
          { status: 400 }
        );
      }
      
      if (forcePreferences.preferred_price_source && 
          !['cardmarket', 'tcgplayer'].includes(forcePreferences.preferred_price_source)) {
        return NextResponse.json(
          { error: 'Invalid preferred_price_source. Must be cardmarket or tcgplayer' },
          { status: 400 }
        );
      }
      
      userPreferences = {
        preferred_currency: forcePreferences.preferred_currency || 'EUR',
        preferred_price_source: forcePreferences.preferred_price_source || 'cardmarket'
      };
    } else {
      // Get user preferences from profile
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_currency, preferred_price_source')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          userPreferences = {
            preferred_currency: profile.preferred_currency || 'EUR',
            preferred_price_source: profile.preferred_price_source || 'cardmarket'
          };
        }
      }
    }
    
    // Fetch cards with prices
    const cardsWithPrices = await cardPriceService.getCardsWithPrices(
      cardIds,
      userPreferences
    );
    
    return NextResponse.json({
      success: true,
      data: cardsWithPrices,
      preferences: userPreferences,
      count: cardsWithPrices.length
    });
    
  } catch (error) {
    console.error('Error fetching card prices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for fetching a single card's prices
 * Query params: cardId, preferredCurrency, preferredPriceSource
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const cardId = url.searchParams.get('cardId');
    const preferredCurrency = url.searchParams.get('preferredCurrency');
    const preferredPriceSource = url.searchParams.get('preferredPriceSource');
    
    if (!cardId) {
      return NextResponse.json(
        { error: 'cardId query parameter is required' },
        { status: 400 }
      );
    }
    
    // Get user preferences
    let userPreferences: UserPreferences = {
      preferred_currency: 'EUR',
      preferred_price_source: 'cardmarket'
    };
    
    if (preferredCurrency || preferredPriceSource) {
      // Validate parameters
      if (preferredCurrency && !['EUR', 'USD', 'GBP', 'NOK'].includes(preferredCurrency)) {
        return NextResponse.json(
          { error: 'Invalid preferredCurrency. Must be EUR, USD, GBP, or NOK' },
          { status: 400 }
        );
      }
      
      if (preferredPriceSource && !['cardmarket', 'tcgplayer'].includes(preferredPriceSource)) {
        return NextResponse.json(
          { error: 'Invalid preferredPriceSource. Must be cardmarket or tcgplayer' },
          { status: 400 }
        );
      }
      
      userPreferences = {
        preferred_currency: (preferredCurrency as any) || 'EUR',
        preferred_price_source: (preferredPriceSource as any) || 'cardmarket'
      };
    } else {
      // Get user preferences from profile
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_currency, preferred_price_source')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          userPreferences = {
            preferred_currency: profile.preferred_currency || 'EUR',
            preferred_price_source: profile.preferred_price_source || 'cardmarket'
          };
        }
      }
    }
    
    // Fetch single card with prices
    const cardWithPrices = await cardPriceService.getCardWithPrices(
      cardId,
      userPreferences
    );
    
    if (!cardWithPrices) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: cardWithPrices,
      preferences: userPreferences
    });
    
  } catch (error) {
    console.error('Error fetching card price:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}