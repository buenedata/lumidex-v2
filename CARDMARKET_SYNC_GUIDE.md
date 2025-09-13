# CardMarket Enhanced Integration Guide

## Overview

This guide covers the complete CardMarket price integration in Lumidex, including setup, sync process, and usage of enhanced pricing features.

## What's New

The enhanced CardMarket integration provides:

### 🎯 **Rich Pricing Data**
- **Market Price**: Current market price
- **Average Sell Price**: Real average selling price
- **Suggested Price**: CardMarket's suggested retail price
- **German Pro Low**: Professional seller low price
- **Trend Data**: Price trend indicators

### 📈 **Historical Price Tracking**
- **1-Day Average**: Recent price movement
- **7-Day Average**: Weekly price trends  
- **30-Day Average**: Monthly price analysis
- **Trend Direction**: Up/Down/Stable indicators
- **Trend Percentage**: Quantified price changes

### 🔄 **Enhanced User Experience**
- Real historical price graphs (no more mock data!)
- Detailed price breakdowns per variant
- Trend analysis with visual indicators
- Fallback support to TCGPlayer

## Setup & Installation

### 1. Database Migration

Apply the enhanced schema:

```bash
# The migration should be applied through your migration system
# File: supabase/migrations/0002_enhance_cardmarket_prices.sql
```

**What it adds:**
- 12 new columns for enhanced CardMarket data
- Indexes for historical price queries
- Comments for documentation

### 2. Environment Variables

Ensure these are set in `.env.local`:

```bash
POKEMONTCG_API_KEY=your_pokemon_tcg_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Validation

Run the validation script:

```bash
node scripts/validate-cardmarket.js
```

## Data Ingestion

### Running the Enhanced Sync

```bash
# Full sync (all cards)
npm run ingest:cards

# Incremental sync (cards updated since date)
npm run ingest:cards --since 2024-01-01

# Test specific functionality
npm run ingest:cards --test
```

### What Happens During Sync

1. **API Data Fetching**: Retrieves complete CardMarket data from Pokemon TCG API
2. **Variant Mapping**: Maps external variant names to internal normalized names
3. **Price Processing**: Handles both legacy (simple) and enhanced (rich) price formats
4. **Database Storage**: Stores all enhanced fields with null handling
5. **Historical Tracking**: Preserves avg1/avg7/avg30 data for trend analysis

### Sync Output Example

```
🚀 Starting Pokemon TCG cards ingestion...
📡 Fetching cards from Pokemon TCG API v2...
✅ Fetched 15,420 cards from API
💰 Processing price data...
   ✅ CardMarket: 8,934 price records (6,234 with enhanced data)
   ✅ TCGPlayer: 12,456 price records
💾 Starting database upsert...
✅ Cards database upsert completed
✅ Prices database upsert completed
🎉 Cards ingestion completed successfully!
```

## API Usage

### Fetching Enhanced CardMarket Data

```javascript
// Single card with CardMarket preference
const response = await fetch('/api/cards/prices', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cardIds: ['xy1-1'],
    forcePreferences: {
      preferred_currency: 'EUR',
      preferred_price_source: 'cardmarket'
    }
  })
});

const data = await response.json();
```

### Enhanced Response Structure

```json
{
  "success": true,
  "data": [
    {
      "id": "xy1-1",
      "name": "Xerneas-EX",
      "price_data": {
        "preferred_source_prices": [
          {
            "variant": "normal",
            "source": "cardmarket",
            "currency": "EUR",
            "prices": {
              "market": 15.50,
              "low": 12.00,
              "mid": 14.00,
              "high": 18.00
            },
            "cardmarket_data": {
              "averageSellPrice": 15.25,
              "suggestedPrice": 16.00,
              "germanProLow": 13.50,
              "trend": 8.5,
              "avg1": 15.80,
              "avg7": 14.90,
              "avg30": 14.20
            },
            "last_updated": "2024-01-15T10:30:00Z",
            "url": "https://cardmarket.com/..."
          }
        ],
        "has_historical_data": true,
        "historical_trends": {
          "normal": {
            "avg_1_day": 15.80,
            "avg_7_day": 14.90,
            "avg_30_day": 14.20,
            "trend_direction": "up",
            "trend_percentage": 9.15
          }
        }
      }
    }
  ]
}
```

## Frontend Integration

### Using CardMarket Display Component

```tsx
import { CardMarketPriceDisplay } from '@/components/cards';

function CardPriceSection({ cardData }) {
  const cardmarketPrice = cardData.price_data.preferred_source_prices
    .find(p => p.source === 'cardmarket');
    
  if (cardmarketPrice) {
    return (
      <CardMarketPriceDisplay 
        priceData={cardmarketPrice}
        currency={cardData.price_data.preferred_currency}
      />
    );
  }
  
  return <div>CardMarket pricing not available</div>;
}
```

### Enhanced Price Graph

The PriceGraph component now automatically:
- Uses CardMarket's historical averages for real price history
- Shows trend indicators and percentages
- Displays proper fallback messages
- Handles both enhanced and basic price data

```tsx
import { PriceGraph } from '@/components/cards';

function CardDetails({ cardData }) {
  return (
    <div>
      <PriceGraph 
        priceData={cardData.price_data}
        currency="EUR"
      />
    </div>
  );
}
```

## Data Quality & Monitoring

### Quality Checks

```sql
-- Check CardMarket data coverage
SELECT 
  COUNT(*) as total_cards,
  COUNT(CASE WHEN source = 'cardmarket' THEN 1 END) as cardmarket_prices,
  COUNT(CASE WHEN source = 'cardmarket' AND avg_30_day IS NOT NULL THEN 1 END) as with_historical
FROM tcg_card_prices;

-- Identify price outliers
SELECT card_id, variant, market, avg_30_day,
  ABS(market - avg_30_day) / avg_30_day * 100 as variance_percent
FROM tcg_card_prices 
WHERE source = 'cardmarket' 
  AND market IS NOT NULL 
  AND avg_30_day IS NOT NULL
  AND ABS(market - avg_30_day) / avg_30_day > 0.5  -- >50% variance
ORDER BY variance_percent DESC;
```

### Monitoring Queries

```sql
-- Recent sync status
SELECT 
  source,
  COUNT(*) as records,
  MAX(last_updated) as latest_update,
  COUNT(CASE WHEN last_updated > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_updates
FROM tcg_card_prices 
GROUP BY source;

-- Historical data availability
SELECT 
  COUNT(CASE WHEN avg_1_day IS NOT NULL THEN 1 END) as with_1_day,
  COUNT(CASE WHEN avg_7_day IS NOT NULL THEN 1 END) as with_7_day,
  COUNT(CASE WHEN avg_30_day IS NOT NULL THEN 1 END) as with_30_day
FROM tcg_card_prices 
WHERE source = 'cardmarket';
```

## Troubleshooting

### Common Issues

#### 1. No CardMarket Data After Sync

**Symptom**: API returns empty CardMarket prices
**Solutions**:
- Check if Pokemon TCG API provides CardMarket data for your target cards
- Verify API key has proper permissions
- Some older sets may not have CardMarket pricing

#### 2. Missing Historical Data

**Symptom**: Charts show "No Historical Data Available"
**Solutions**:
- CardMarket historical data is only available for actively traded cards
- New cards may not have 30-day averages yet
- Run sync more frequently to capture evolving data

#### 3. Type Errors in Frontend

**Symptom**: TypeScript compilation errors
**Solutions**:
- Ensure all new types are imported: `CardMarketPriceData`
- Check that enhanced pricing types are properly used
- Verify optional chaining for CardMarket data access

#### 4. Performance Issues

**Symptom**: Slow API responses
**Solutions**:
- Check database indexes are properly created
- Monitor query performance with `EXPLAIN ANALYZE`
- Consider limiting historical data queries

### Debug Commands

```bash
# Test database connectivity
node scripts/validate-cardmarket.js

# Check specific card ingestion
npm run ingest:cards --since 2024-01-01 | grep "xy1-1"

# Verify TypeScript compilation
npx tsc --noEmit

# Test API endpoint directly
curl -X POST http://localhost:3000/api/cards/prices \
  -H "Content-Type: application/json" \
  -d '{"cardIds": ["xy1-1"], "forcePreferences": {"preferred_price_source": "cardmarket"}}'
```

## Best Practices

### 1. Sync Frequency
- **Daily**: Full sync for active trading periods
- **Weekly**: Regular sync for stable market periods
- **Incremental**: Use `--since` for frequent updates

### 2. Data Handling
- Always check for null values when accessing enhanced data
- Use optional chaining: `priceData.cardmarket_data?.avg30`
- Provide fallbacks for missing historical data

### 3. User Experience
- Show loading states during price fetching
- Display trend indicators clearly
- Provide context for historical data gaps

### 4. Performance
- Cache price data appropriately
- Use database indexes for historical queries
- Monitor API response times

## Maintenance

### Regular Tasks

1. **Weekly**: Review data quality metrics
2. **Monthly**: Analyze sync performance and optimize
3. **Quarterly**: Update variant mappings if needed

### Monitoring Alerts

Set up alerts for:
- Failed sync operations
- Unusual price variances (>200% changes)
- Missing historical data for popular cards
- API response time degradation

---

## Support

For issues with CardMarket integration:

1. **Check**: `CARDMARKET_TEST_PLAN.md` for detailed testing procedures
2. **Run**: `scripts/validate-cardmarket.js` for health checks
3. **Review**: Database logs and API response times
4. **Verify**: Pokemon TCG API status and CardMarket data availability

The enhanced CardMarket integration provides a robust foundation for comprehensive TCG price analysis with real historical data and trend tracking capabilities.