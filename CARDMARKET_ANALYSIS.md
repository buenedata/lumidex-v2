# CardMarket Price Integration Analysis

## Problem Identified
The current CardMarket integration in Lumidex is incomplete. The TypeScript interfaces and ingestion scripts only capture basic price data, missing the rich pricing information available from the Pokemon TCG API.

## Current Implementation Issues

### 1. Oversimplified CardMarket Interface
**File:** `src/lib/pokeapi/client.ts:63-67`
```typescript
cardmarket?: {
  url: string;
  updatedAt: string;
  prices: Record<string, number>; // ❌ Too simplified
};
```

### 2. Basic Price Processing
**File:** `scripts/ingest/cards.ts:81-115`
- Only processes single price values per variant
- Missing additional price fields available in the API

## Complete CardMarket Data Structure (From Pokemon TCG API)

According to the Pokemon TCG API documentation, CardMarket provides:

```typescript
cardmarket: {
  url: string;
  updatedAt: string;
  prices: {
    [variant: string]: {
      low: number;
      mid: number; 
      high: number;
      market: number;
      directLow?: number;
      // Additional fields:
      averageSellPrice?: number;
      germanProLow?: number;
      suggestedPrice?: number;
      reverseHoloSell?: number;
      reverseHoloLow?: number;
      reverseHoloTrend?: number;
      lowPriceExPlus?: number;
      trend?: number;
      trendPrice?: number;
      // 30-day historical data:
      avg1?: number;
      avg7?: number; 
      avg30?: number;
    }
  }
}
```

## Required Changes

### 1. Update TypeScript Interfaces
- `src/lib/pokeapi/client.ts` - Complete CardMarket interface
- `src/types/pricing.ts` - Enhanced pricing types

### 2. Enhance Database Schema  
- `supabase/migrations/` - Add columns for additional price fields
- Consider separate table for historical data

### 3. Update Ingestion Script
- `scripts/ingest/cards.ts` - Process all CardMarket price fields
- Handle historical data (avg1, avg7, avg30)

### 4. Frontend Updates
- `src/components/cards/PriceGraph.tsx` - Display historical trends
- Enhanced price visualization with CardMarket's rich data

## Implementation Priority
1. **High**: Fix basic CardMarket price ingestion (all current fields)
2. **Medium**: Add historical data tracking (avg1, avg7, avg30)
3. **Low**: Advanced price analysis features

## Expected Outcome
- Complete CardMarket price data in database
- Historical price trends from CardMarket's 30-day averages
- Rich price visualization in the UI
- Proper sync mechanism for ongoing updates