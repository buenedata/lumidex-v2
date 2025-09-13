# CardMarket Integration Test Plan

## Overview
This document outlines the testing strategy for the enhanced CardMarket price integration, including database migrations, data ingestion, and frontend display.

## Pre-Test Setup

### 1. Database Migration
```bash
# Apply the enhanced CardMarket schema
# Note: This should be done through your normal migration process
# The migration file: supabase/migrations/0002_enhance_cardmarket_prices.sql
```

### 2. Environment Verification
Ensure the following environment variables are set:
- `POKEMONTCG_API_KEY` - Valid Pokemon TCG API key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for ingestion

## Test Cases

### 1. Database Schema Validation
**Objective**: Verify that the enhanced schema is correctly applied

**Test Steps**:
```sql
-- Check if new columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tcg_card_prices' 
  AND column_name IN (
    'average_sell_price', 'german_pro_low', 'suggested_price',
    'reverse_holo_sell', 'reverse_holo_low', 'reverse_holo_trend',
    'low_price_ex_plus', 'trend', 'trend_price',
    'avg_1_day', 'avg_7_day', 'avg_30_day'
  );

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'tcg_card_prices' 
  AND indexname LIKE '%historical%';
```

**Expected Results**:
- All 12 new columns should exist with type `numeric`
- Historical and trends indexes should be present

### 2. Data Ingestion Test
**Objective**: Verify that enhanced CardMarket data is properly ingested

**Test Steps**:
```bash
# Run ingestion for a specific recent set
npm run ingest:cards --since 2024-01-01

# Or test with a single set known to have CardMarket data
# Check the console output for CardMarket processing logs
```

**Validation Queries**:
```sql
-- Check for CardMarket prices with enhanced data
SELECT 
  card_id,
  variant,
  market,
  average_sell_price,
  suggested_price,
  avg_1_day,
  avg_7_day,
  avg_30_day,
  trend,
  last_updated
FROM tcg_card_prices 
WHERE source = 'cardmarket' 
  AND (average_sell_price IS NOT NULL OR avg_30_day IS NOT NULL)
LIMIT 10;

-- Count enhanced vs basic CardMarket records
SELECT 
  COUNT(*) as total_cardmarket,
  COUNT(CASE WHEN avg_30_day IS NOT NULL THEN 1 END) as with_historical,
  COUNT(CASE WHEN average_sell_price IS NOT NULL THEN 1 END) as with_enhanced
FROM tcg_card_prices 
WHERE source = 'cardmarket';
```

### 3. API Response Test
**Objective**: Verify that the price API returns enhanced CardMarket data

**Test Steps**:
```bash
# Test the price API with a known card ID
curl -X POST http://localhost:3000/api/cards/prices \
  -H "Content-Type: application/json" \
  -d '{
    "cardIds": ["xy1-1"],
    "forcePreferences": {
      "preferred_currency": "EUR",
      "preferred_price_source": "cardmarket"
    }
  }'
```

**Expected Response Structure**:
```json
{
  "success": true,
  "data": [
    {
      "id": "xy1-1",
      "price_data": {
        "preferred_source_prices": [
          {
            "variant": "normal",
            "source": "cardmarket",
            "prices": {
              "market": 1.50,
              "low": 1.00,
              "mid": 1.25,
              "high": 2.00
            },
            "cardmarket_data": {
              "averageSellPrice": 1.45,
              "suggestedPrice": 1.60,
              "avg1": 1.52,
              "avg7": 1.48,
              "avg30": 1.40
            }
          }
        ],
        "has_historical_data": true,
        "historical_trends": {
          "normal": {
            "avg_1_day": 1.52,
            "avg_7_day": 1.48,
            "avg_30_day": 1.40,
            "trend_direction": "up",
            "trend_percentage": 7.14
          }
        }
      }
    }
  ]
}
```

### 4. Frontend Display Test
**Objective**: Verify that enhanced CardMarket data displays correctly

**Test Steps**:
1. Start the development server: `npm run dev`
2. Navigate to a card with CardMarket pricing
3. Verify the CardMarket display component shows:
   - Current prices (market, low, mid, high)
   - Enhanced fields (average sell, suggested price)
   - Historical trends (1-day, 7-day, 30-day averages)
   - Trend indicators (arrows and percentages)
4. Check the price graph for historical data visualization

**Visual Verification**:
- [ ] CardMarket price section displays
- [ ] Historical trend data shows with up/down indicators
- [ ] Price graph shows historical data points (when available)
- [ ] Proper fallback messages when data unavailable

### 5. TypeScript Compilation Test
**Objective**: Ensure all TypeScript interfaces are correct

```bash
# Build the project to check for type errors
npm run build

# Run type checking
npx tsc --noEmit
```

**Expected Results**:
- No TypeScript compilation errors
- All new interfaces properly typed
- No missing properties warnings

### 6. Performance Test
**Objective**: Verify that enhanced queries don't significantly impact performance

**Test Steps**:
```sql
-- Test query performance with enhanced fields
EXPLAIN ANALYZE 
SELECT *
FROM tcg_card_prices 
WHERE card_id IN ('xy1-1', 'xy1-2', 'xy1-3', 'xy1-4', 'xy1-5')
  AND source = 'cardmarket';

-- Test historical data query performance
EXPLAIN ANALYZE
SELECT card_id, variant, avg_30_day, trend, last_updated
FROM tcg_card_prices 
WHERE source = 'cardmarket' 
  AND avg_30_day IS NOT NULL
ORDER BY last_updated DESC
LIMIT 100;
```

## Data Quality Validation

### CardMarket Data Integrity
```sql
-- Check for reasonable price ranges
SELECT card_id, variant, market, avg_30_day,
  CASE 
    WHEN market > avg_30_day * 3 THEN 'High variance'
    WHEN market < avg_30_day * 0.33 THEN 'Low variance'
    ELSE 'Normal'
  END as variance_check
FROM tcg_card_prices 
WHERE source = 'cardmarket' 
  AND market IS NOT NULL 
  AND avg_30_day IS NOT NULL;

-- Verify trend calculations
SELECT card_id, variant, market, avg_30_day, trend,
  ROUND(((market - avg_30_day) / avg_30_day * 100)::numeric, 2) as calculated_trend
FROM tcg_card_prices 
WHERE source = 'cardmarket' 
  AND trend IS NOT NULL 
  AND avg_30_day IS NOT NULL
LIMIT 10;
```

## Error Scenarios

### 1. Missing CardMarket Data
**Test**: Ingest cards from sets with no CardMarket pricing
**Expected**: Graceful fallback to TCGPlayer data

### 2. Malformed API Response
**Test**: Simulate API response with missing fields
**Expected**: Ingestion continues with null values for missing fields

### 3. Database Connection Issues
**Test**: Temporary database unavailability during ingestion
**Expected**: Proper error handling and retry mechanisms

## Success Criteria

✅ **Database Migration**: All new columns and indexes created successfully
✅ **Data Ingestion**: Enhanced CardMarket data successfully stored
✅ **API Integration**: Enhanced data properly returned via API
✅ **Frontend Display**: Rich CardMarket pricing displayed correctly
✅ **Historical Data**: Price trends and averages working
✅ **Performance**: No significant performance degradation
✅ **Type Safety**: All TypeScript interfaces working correctly

## Rollback Plan

If critical issues are found:

1. **Database**: Revert migration by dropping the new columns
2. **Code**: Revert to previous interfaces and processing logic
3. **Frontend**: Fallback to basic price display

## Post-Deployment Monitoring

Monitor the following metrics:
- CardMarket data ingestion success rate
- API response times for price queries
- Frontend error rates for price display
- Database query performance
- Historical data accuracy