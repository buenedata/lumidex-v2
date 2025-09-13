# CardMarket Enhanced Integration Implementation Plan

## Overview
Complete implementation plan to fix and enhance CardMarket price integration in Lumidex, enabling rich pricing data and historical trends.

## Phase 1: Core Data Structure Updates

### 1.1 Enhanced TypeScript Interfaces

**File: `src/lib/pokeapi/client.ts`**
```typescript
// Replace existing cardmarket interface
cardmarket?: {
  url: string;
  updatedAt: string;
  prices: Record<string, CardMarketPriceData>;
};

interface CardMarketPriceData {
  // Core pricing (always available)
  low: number;
  mid: number;
  high: number;
  market: number;
  directLow?: number;
  
  // Extended CardMarket pricing
  averageSellPrice?: number;
  germanProLow?: number;
  suggestedPrice?: number;
  reverseHoloSell?: number;
  reverseHoloLow?: number;
  reverseHoloTrend?: number;
  lowPriceExPlus?: number;
  trend?: number;
  trendPrice?: number;
  
  // Historical averages (KEY FEATURE!)
  avg1?: number;   // 1-day average
  avg7?: number;   // 7-day average  
  avg30?: number;  // 30-day average
}
```

### 1.2 Database Schema Enhancement

**File: `supabase/migrations/0002_enhance_cardmarket_prices.sql`**
```sql
-- Add new columns to tcg_card_prices for enhanced CardMarket data
ALTER TABLE tcg_card_prices ADD COLUMN IF NOT EXISTS average_sell_price numeric;
ALTER TABLE tcg_card_prices ADD COLUMN IF NOT EXISTS german_pro_low numeric;
ALTER TABLE tcg_card_prices ADD COLUMN IF NOT EXISTS suggested_price numeric;
ALTER TABLE tcg_card_prices ADD COLUMN IF NOT EXISTS reverse_holo_sell numeric;
ALTER TABLE tcg_card_prices ADD COLUMN IF NOT EXISTS reverse_holo_low numeric;
ALTER TABLE tcg_card_prices ADD COLUMN IF NOT EXISTS reverse_holo_trend numeric;
ALTER TABLE tcg_card_prices ADD COLUMN IF NOT EXISTS low_price_ex_plus numeric;
ALTER TABLE tcg_card_prices ADD COLUMN IF NOT EXISTS trend numeric;
ALTER TABLE tcg_card_prices ADD COLUMN IF NOT EXISTS trend_price numeric;

-- Historical averages
ALTER TABLE tcg_card_prices ADD COLUMN IF NOT EXISTS avg_1_day numeric;
ALTER TABLE tcg_card_prices ADD COLUMN IF NOT EXISTS avg_7_day numeric;
ALTER TABLE tcg_card_prices ADD COLUMN IF NOT EXISTS avg_30_day numeric;

-- Add index for historical queries
CREATE INDEX IF NOT EXISTS idx_tcg_card_prices_historical 
ON tcg_card_prices(card_id, source, last_updated DESC) 
WHERE avg_30_day IS NOT NULL;
```

## Phase 2: Enhanced Ingestion Script

### 2.1 Updated CardMarket Processing Function

**File: `scripts/ingest/cards.ts`**
```typescript
function processCardmarketPrices(card: PokemonTCGCard): DatabasePrice[] {
  if (!card.cardmarket?.prices) return [];

  const prices: DatabasePrice[] = [];
  const basePrice = {
    card_id: card.id,
    source: 'cardmarket' as const,
    last_updated: card.cardmarket.updatedAt,
    currency: 'EUR',
    url: card.cardmarket.url
  };

  for (const [externalVariant, priceData] of Object.entries(card.cardmarket.prices)) {
    const internalVariant = mapVariantFromSource('cardmarket', externalVariant);
    
    if (!internalVariant) {
      console.warn(`⚠️ Skipping unknown CardMarket variant "${externalVariant}" for card ${card.id}`);
      continue;
    }

    // Handle both simple number prices and rich price objects
    if (typeof priceData === 'number' && priceData > 0) {
      // Legacy simple price format
      prices.push({
        ...basePrice,
        variant: internalVariant,
        low: null,
        mid: priceData,
        high: null,
        market: priceData,
        direct_low: null
      });
    } else if (typeof priceData === 'object' && priceData) {
      // Enhanced price object format
      prices.push({
        ...basePrice,
        variant: internalVariant,
        low: priceData.low || null,
        mid: priceData.mid || null,
        high: priceData.high || null,
        market: priceData.market || null,
        direct_low: priceData.directLow || null,
        
        // Enhanced CardMarket fields
        average_sell_price: priceData.averageSellPrice || null,
        german_pro_low: priceData.germanProLow || null,
        suggested_price: priceData.suggestedPrice || null,
        reverse_holo_sell: priceData.reverseHoloSell || null,
        reverse_holo_low: priceData.reverseHoloLow || null,
        reverse_holo_trend: priceData.reverseHoloTrend || null,
        low_price_ex_plus: priceData.lowPriceExPlus || null,
        trend: priceData.trend || null,
        trend_price: priceData.trendPrice || null,
        
        // Historical averages
        avg_1_day: priceData.avg1 || null,
        avg_7_day: priceData.avg7 || null,
        avg_30_day: priceData.avg30 || null,
      });
    }
  }

  return prices;
}
```

## Phase 3: Frontend Enhancements

### 3.1 Enhanced Price Display Component

**File: `src/components/cards/CardMarketPriceDisplay.tsx`** (New)
```typescript
interface CardMarketPriceDisplayProps {
  priceData: CardMarketPriceData;
  variant: VariantName;
  currency: string;
}

export function CardMarketPriceDisplay({ priceData, variant, currency }: CardMarketPriceDisplayProps) {
  return (
    <div className="bg-panel2 rounded-lg p-4">
      <h4 className="font-semibold mb-3">CardMarket - {getVariantDisplayName(variant)}</h4>
      
      {/* Current Prices */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <PriceField label="Market" value={priceData.market} currency={currency} />
        <PriceField label="Low" value={priceData.low} currency={currency} />
        <PriceField label="Mid" value={priceData.mid} currency={currency} />
        <PriceField label="High" value={priceData.high} currency={currency} />
      </div>
      
      {/* Historical Trends */}
      {(priceData.avg_1_day || priceData.avg_7_day || priceData.avg_30_day) && (
        <div>
          <h5 className="font-medium mb-2">Price Trends</h5>
          <div className="grid grid-cols-3 gap-2">
            <TrendField label="1 Day" value={priceData.avg_1_day} current={priceData.market} currency={currency} />
            <TrendField label="7 Day" value={priceData.avg_7_day} current={priceData.market} currency={currency} />
            <TrendField label="30 Day" value={priceData.avg_30_day} current={priceData.market} currency={currency} />
          </div>
        </div>
      )}
    </div>
  );
}
```

### 3.2 Enhanced Price Graph with Historical Data

**File: `src/components/cards/PriceGraph.tsx`** (Updates)
```typescript
// Leverage CardMarket's avg1, avg7, avg30 for historical chart
const historicalData = useMemo(() => {
  const dataPoints: HistoricalDataPoint[] = [];
  
  // Use CardMarket's historical averages to create trend data
  priceData.preferred_source_prices
    .filter(p => p.source === 'cardmarket')
    .forEach(priceInfo => {
      if (priceInfo.avg_30_day || priceInfo.avg_7_day || priceInfo.avg_1_day) {
        // Create historical data points from averages
        // This gives us immediate historical context!
      }
    });
    
  return dataPoints;
}, [priceData]);
```

## Phase 4: Testing & Validation

### 4.1 Test CardMarket Data Ingestion
```bash
# Run enhanced ingestion script
npm run ingest:cards --since 2024-01-01

# Verify CardMarket data in database
SELECT 
  card_id, 
  variant, 
  market, 
  avg_30_day, 
  trend,
  last_updated 
FROM tcg_card_prices 
WHERE source = 'cardmarket' 
  AND avg_30_day IS NOT NULL 
LIMIT 10;
```

### 4.2 Frontend Testing
- Test CardMarket price display
- Verify historical trend visualization
- Confirm currency conversion works
- Test fallback to TCGPlayer when CardMarket unavailable

## Implementation Timeline

### Week 1: Core Updates
- [ ] Update TypeScript interfaces
- [ ] Create database migration
- [ ] Update ingestion script

### Week 2: Frontend & Testing  
- [ ] Enhance price display components
- [ ] Update price graph with historical data
- [ ] Run comprehensive testing
- [ ] Document usage and maintenance

## Expected Benefits

1. **Rich CardMarket Data**: Full access to all CardMarket pricing fields
2. **Historical Trends**: Immediate access to 1/7/30-day averages from CardMarket
3. **Better Price Analysis**: Trend data, suggested prices, regional pricing
4. **Enhanced User Experience**: Comprehensive price visualization
5. **Data Foundation**: Solid base for advanced price analytics

## Risk Mitigation

- **Backward Compatibility**: Support both simple and enhanced price formats
- **Gradual Rollout**: Test with subset of cards first
- **Fallback Handling**: Graceful degradation when enhanced data unavailable
- **Performance**: Indexed queries for historical data access