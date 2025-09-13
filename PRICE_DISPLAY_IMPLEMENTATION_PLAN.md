# Price Display Implementation Plan

## Overview

This plan details the implementation of real database prices on card display components throughout the Lumidex application. The system will fetch prices from the `tcg_card_prices` table, respect user preferences, implement fallback logic, and display pricing with currency conversion.

## Key Requirements

1. **CardTile**: Display only the **cheapest price** across all variants
2. **CardDetailsModal**: Display comprehensive pricing for all variants in pricing tab
3. **Price Source Preference**: Use user's preferred source with fallback indicator
4. **Currency Conversion**: Convert prices to user's preferred currency
5. **Variant Logic**: Prioritize 'normal' variant, fall back to 'holofoil' for cheapest price

## Current State Analysis

### Issues Identified
1. Cards are fetched without price data from the database
2. CardTile components use hardcoded/mock price structure
3. No variant-specific pricing display  
4. CardDetailsModal pricing tab shows limited pricing info
5. Price source preferences not implemented in card display

### Existing Infrastructure ✅
- Complete currency conversion system (`src/lib/currency/`)
- User preference management (`profiles` table)
- Exchange rates table and API
- Price data structure in database (`tcg_card_prices`)
- PricePill component with conversion support

## Database Schema Reference

```sql
-- tcg_card_prices table structure
CREATE TABLE tcg_card_prices (
  card_id text NOT NULL,
  source price_source NOT NULL,              -- 'cardmarket' | 'tcgplayer'
  variant variant_name NOT NULL,             -- 'normal', 'holofoil', etc.
  last_updated timestamp with time zone,
  currency text DEFAULT 'EUR',              -- EUR for cardmarket, USD for tcgplayer
  low numeric,
  mid numeric, 
  high numeric,
  market numeric,
  direct_low numeric,
  url text,
  PRIMARY KEY (card_id, source, variant)
);

-- User preferences in profiles table
CREATE TABLE profiles (
  preferred_currency currency_code DEFAULT 'EUR',
  preferred_price_source price_source DEFAULT 'cardmarket'
);
```

## Implementation Phases

### Phase 1: Enhanced Database Queries & Types

#### 1.1 Update TypeScript Interfaces

**File:** `src/types/pricing.ts` (new file)

```typescript
import type { CurrencyCode, PriceSource, VariantName } from '@/types';

export interface VariantPriceData {
  variant: VariantName;
  source: PriceSource;
  currency: string;
  prices: {
    low?: number;
    mid?: number;
    high?: number;
    market?: number;
    direct_low?: number;
  };
  last_updated: string;
  url?: string;
}

export interface CheapestPriceData {
  variant: VariantName;
  price: number;
  currency: string;
  price_type: 'market' | 'mid' | 'low' | 'direct_low';
  source: PriceSource;
  last_updated: string;
}

export interface CardPriceData {
  preferred_source_prices: VariantPriceData[];
  fallback_source_prices: VariantPriceData[];
  cheapest_variant_price: CheapestPriceData | null;
  price_source_used: PriceSource;
  has_fallback: boolean;
  conversion_info?: {
    original_currency: string;
    converted_currency: CurrencyCode;
    exchange_rate: number;
  };
}

export interface CardWithPrices extends TCGCard {
  price_data: CardPriceData;
}
```

#### 1.2 Enhanced Database Queries

**File:** `src/lib/db/price-queries.ts` (new file)

```typescript
import { createClient } from '@/lib/supabase/client';
import { currencyConverter } from '@/lib/currency/conversion';
import type { CurrencyCode, PriceSource, UserPreferences } from '@/types';
import type { CardWithPrices, VariantPriceData, CheapestPriceData } from '@/types/pricing';

export class CardPriceService {
  async getCardsWithPrices(
    cardIds: string[],
    userPreferences: UserPreferences
  ): Promise<CardWithPrices[]> {
    const supabase = createClient();
    
    // 1. Fetch card basic data
    const { data: cards, error: cardsError } = await supabase
      .from('tcg_cards')
      .select('*')
      .in('id', cardIds);
    
    if (cardsError || !cards) {
      throw new Error(`Failed to fetch cards: ${cardsError?.message}`);
    }
    
    // 2. Fetch preferred source prices
    const { data: preferredPrices } = await supabase
      .from('tcg_card_prices')
      .select('*')
      .in('card_id', cardIds)
      .eq('source', userPreferences.preferred_price_source);
    
    // 3. Fetch fallback source prices
    const fallbackSource = userPreferences.preferred_price_source === 'cardmarket' 
      ? 'tcgplayer' 
      : 'cardmarket';
      
    const { data: fallbackPrices } = await supabase
      .from('tcg_card_prices')
      .select('*')
      .in('card_id', cardIds)
      .eq('source', fallbackSource);
    
    // 4. Process each card
    return await Promise.all(
      cards.map(card => this.processCardPrices(
        card, 
        preferredPrices || [], 
        fallbackPrices || [], 
        userPreferences
      ))
    );
  }

  private async processCardPrices(
    card: any,
    preferredPrices: any[],
    fallbackPrices: any[],
    userPreferences: UserPreferences
  ): Promise<CardWithPrices> {
    const cardPreferredPrices = preferredPrices.filter(p => p.card_id === card.id);
    const cardFallbackPrices = fallbackPrices.filter(p => p.card_id === card.id);
    
    // Determine which prices to use
    const hasPreferredPrices = cardPreferredPrices.length > 0;
    const pricesToUse = hasPreferredPrices ? cardPreferredPrices : cardFallbackPrices;
    const sourceUsed = hasPreferredPrices ? userPreferences.preferred_price_source : (userPreferences.preferred_price_source === 'cardmarket' ? 'tcgplayer' : 'cardmarket');
    
    // Find cheapest price across all variants
    const cheapestPrice = this.findCheapestPrice(pricesToUse, sourceUsed);
    
    // Convert to user currency if needed
    let convertedCheapestPrice = cheapestPrice;
    if (cheapestPrice && userPreferences.preferred_currency !== cheapestPrice.currency) {
      try {
        const conversion = await currencyConverter.convert(
          cheapestPrice.price,
          cheapestPrice.currency as CurrencyCode,
          userPreferences.preferred_currency
        );
        
        convertedCheapestPrice = {
          ...cheapestPrice,
          price: conversion.convertedAmount,
          currency: conversion.toCurrency
        };
      } catch (error) {
        console.warn(`Failed to convert price for card ${card.id}:`, error);
      }
    }
    
    return {
      ...card,
      price_data: {
        preferred_source_prices: cardPreferredPrices,
        fallback_source_prices: cardFallbackPrices,
        cheapest_variant_price: convertedCheapestPrice,
        price_source_used: sourceUsed,
        has_fallback: !hasPreferredPrices && cardFallbackPrices.length > 0
      }
    };
  }

  private findCheapestPrice(prices: any[], source: PriceSource): CheapestPriceData | null {
    if (prices.length === 0) return null;
    
    // Priority order for variants
    const variantPriority = ['normal', 'holofoil', 'reverse_holofoil', 'first_edition_normal', 'first_edition_holofoil', 'unlimited'];
    
    // Priority order for price fields
    const priceFields = ['market', 'mid', 'low', 'direct_low'] as const;
    
    let cheapest: CheapestPriceData | null = null;
    let cheapestPrice = Infinity;
    
    // First, try to find prices in variant priority order
    for (const variant of variantPriority) {
      const variantPrices = prices.filter(p => p.variant === variant);
      
      for (const priceData of variantPrices) {
        for (const field of priceFields) {
          const price = priceData[field];
          if (price && price > 0 && price < cheapestPrice) {
            cheapestPrice = price;
            cheapest = {
              variant: priceData.variant,
              price,
              currency: priceData.currency,
              price_type: field,
              source,
              last_updated: priceData.last_updated
            };
          }
        }
      }
      
      // If we found a price for this priority variant, use it
      if (cheapest) break;
    }
    
    // If no price found in priority variants, check all remaining variants
    if (!cheapest) {
      for (const priceData of prices) {
        if (!variantPriority.includes(priceData.variant)) {
          for (const field of priceFields) {
            const price = priceData[field];
            if (price && price > 0 && price < cheapestPrice) {
              cheapestPrice = price;
              cheapest = {
                variant: priceData.variant,
                price,
                currency: priceData.currency,
                price_type: field,
                source,
                last_updated: priceData.last_updated
              };
            }
          }
        }
      }
    }
    
    return cheapest;
  }
}

// Singleton instance
export const cardPriceService = new CardPriceService();
```

### Phase 2: API Endpoints

**File:** `src/app/api/cards/prices/route.ts` (new file)

```typescript
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
    
    // Get user preferences
    let userPreferences: UserPreferences = {
      preferred_currency: 'EUR',
      preferred_price_source: 'cardmarket'
    };
    
    if (forcePreferences) {
      userPreferences = forcePreferences;
    } else {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_currency, preferred_price_source')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          userPreferences = profile;
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
      preferences: userPreferences
    });
    
  } catch (error) {
    console.error('Error fetching card prices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Phase 3: Updated CardTile Components

**CardTile price display (to the right as requested) - Cheapest Price Only:**

```typescript
// In CardTile component
<div className="flex items-center justify-between pt-1">
  {card.rarity && <RarityPill rarity={card.rarity} size="sm" />}
  
  {/* Single cheapest price display */}
  <div className="ml-auto">
    {card.price_data?.cheapest_variant_price && (
      <PricePill
        price={card.price_data.cheapest_variant_price.price}
        currency={card.price_data.cheapest_variant_price.currency}
        userCurrency={userCurrency}
        source={card.price_data.source_used}
        size="sm"
        className="ml-auto"
        title={`From ${card.price_data.cheapest_variant_price.variant} variant${card.price_data.has_fallback ? ` (${card.price_data.source_used} source)` : ''}`}
        showFallbackIndicator={card.price_data.has_fallback}
      />
    )}
  </div>
</div>
```

**Cheapest Price Logic:**
- Prioritize 'normal' variant if available
- Fall back to 'holofoil' if normal not available
- Use market price, then mid price, then low price for comparison
- Display the variant name as tooltip: "From {variant} variant"

### Phase 4: Enhanced CardDetailsModal Pricing Tab

**Comprehensive pricing display in modal:**

```typescript
// In CardDetailsModal pricing tab
{activeTab === 'pricing' && (
  <div className="animate-fade-in space-y-6">
    {/* Preferred Source Prices */}
    {card.price_data?.preferred_source_prices?.length > 0 && (
      <div className="panel p-4">
        <h3 className="text-lg font-semibold text-text mb-4">
          {userPreferences.preferred_price_source === 'cardmarket' ? 'Cardmarket' : 'TCGPlayer'} Prices
        </h3>
        
        <div className="space-y-3">
          {card.price_data.preferred_source_prices.map(priceGroup => (
            <VariantPriceRow 
              key={priceGroup.variant}
              variant={priceGroup.variant}
              prices={priceGroup.prices}
              currency={priceGroup.currency}
              userCurrency={userCurrency}
              lastUpdated={priceGroup.last_updated}
              isCheapest={priceGroup.variant === card.price_data.cheapest_variant_price?.variant}
            />
          ))}
        </div>
      </div>
    )}
    
    {/* Fallback Source Prices */}
    {card.price_data?.fallback_source_prices?.length > 0 && (
      <div className="panel p-4">
        <h3 className="text-lg font-semibold text-text mb-4">
          {userPreferences.preferred_price_source === 'cardmarket' ? 'TCGPlayer' : 'Cardmarket'} Prices
          <span className="text-sm text-muted ml-2">(Alternative Source)</span>
        </h3>
        
        <div className="space-y-3">
          {card.price_data.fallback_source_prices.map(priceGroup => (
            <VariantPriceRow 
              key={priceGroup.variant}
              variant={priceGroup.variant}
              prices={priceGroup.prices}
              currency={priceGroup.currency}
              userCurrency={userCurrency}
              lastUpdated={priceGroup.last_updated}
              isAlternativeSource={true}
            />
          ))}
        </div>
      </div>
    )}
    
    {/* No Prices Available */}
    {(!card.price_data?.preferred_source_prices?.length && !card.price_data?.fallback_source_prices?.length) && (
      <div className="panel p-4">
        <div className="text-center py-6 text-muted">
          <div className="text-4xl mb-2 opacity-50">💰</div>
          <p className="text-sm">No pricing data available</p>
        </div>
      </div>
    )}
    
    {/* External Links */}
    <div className="panel p-4">
      <h3 className="text-lg font-semibold text-text mb-4">External Links</h3>
      
      {card.price_data?.preferred_source_prices?.[0]?.url ? (
        <a
          href={card.price_data.preferred_source_prices[0].url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 bg-panel2 border border-border rounded-lg hover:bg-panel hover:border-brand2/50 transition-colors"
        >
          <span className="text-text">
            View on {userPreferences.preferred_price_source === 'cardmarket' ? 'Cardmarket' : 'TCGPlayer'}
          </span>
          <ExternalLinkIcon />
        </a>
      ) : (
        <div className="text-center py-6 text-muted">
          <p className="text-sm">No external links available</p>
        </div>
      )}
    </div>
  </div>
)}
```

### Phase 5: Update Existing Database Queries

**File:** `src/lib/db/queries.ts` (enhance existing functions)

```typescript
// Add to existing queries.ts file

/**
 * Get cards for a set with pricing data
 */
export async function getCardsForSetWithPrices(
  setId: string,
  userPreferences?: UserPreferences
): Promise<CardWithPrices[]> {
  const cards = await getCardsForSet(setId);
  
  if (!userPreferences) {
    return cards.map(card => ({ ...card, price_data: null }));
  }
  
  const cardIds = cards.map(card => card.id);
  return await cardPriceService.getCardsWithPrices(cardIds, userPreferences);
}
```

## Implementation Priority & Timeline

### Week 1: Foundation
- [ ] Create TypeScript interfaces (`src/types/pricing.ts`)
- [ ] Implement price service (`src/lib/db/price-queries.ts`)
- [ ] Create API endpoint (`src/app/api/cards/prices/route.ts`)

### Week 2: CardTile Integration
- [ ] Update CardTile component with cheapest price display
- [ ] Update CardTileWithCollectionButtons
- [ ] Test price source fallback logic

### Week 3: CardDetailsModal Enhancement
- [ ] Enhance pricing tab with comprehensive variant pricing
- [ ] Add price source indicators
- [ ] Test currency conversion integration

### Week 4: Integration & Testing
- [ ] Update SetCardsWithModal to fetch prices
- [ ] Update other card display locations
- [ ] End-to-end testing with real price data
- [ ] Performance optimization

## Success Criteria

✅ **CardTile displays cheapest price** across all variants
✅ **Price source preference** respected with fallback
✅ **Currency conversion** working correctly
✅ **CardDetailsModal** shows comprehensive pricing
✅ **Performance** under 100ms for price fetching
✅ **Fallback indicators** clearly visible
✅ **Mobile responsive** price display

This implementation ensures a robust, user-friendly pricing system that respects preferences while providing comprehensive price information where needed.