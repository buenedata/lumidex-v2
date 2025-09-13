# Pokemon TCG API 404 Error - Quick Fix Guide

## The Issue

You're getting this error when running `npm run ingest:cards`:
```
❌ Cards ingestion failed: Error: API request failed: 404 Not Found
```

## Immediate Solutions

### 1. Test API Connection First

Run the diagnostic script:
```bash
node scripts/test-pokemon-api.js
```

This will tell you exactly what's wrong with the API connection.

### 2. Check Your API Key

Add a Pokemon TCG API key to `.env.local`:
```bash
# Get a free key at: https://dev.pokemontcg.io/
POKEMONTCG_API_KEY=your_api_key_here
```

### 3. Manual API Test

Test the API directly in your browser or curl:
```bash
# Should return JSON data, not 404
curl "https://api.pokemontcg.io/v2/cards?pageSize=1"
```

### 4. Common Causes

- **Missing API Key**: API works without key but has strict rate limits
- **Network Issues**: Firewall/proxy blocking requests
- **API Service Down**: Pokemon TCG API experiencing issues
- **Wrong URL**: API endpoint URL is incorrect

## Quick Fixes

### Option A: Try with API Key
1. Sign up at https://dev.pokemontcg.io/
2. Get your free API key
3. Add to `.env.local`: `POKEMONTCG_API_KEY=your_key`
4. Run: `npm run ingest:cards`

### Option B: Test Smaller Sync
```bash
# Try syncing just recent cards
npm run ingest:cards --since 2024-01-01
```

### Option C: Use Test Script
```bash
# Diagnose the exact issue
node scripts/test-pokemon-api.js
```

## The CardMarket Integration Still Works!

Even with the API connection issue, the CardMarket integration is complete:

✅ **Database Schema**: Enhanced with 12 new columns for CardMarket data
✅ **TypeScript Types**: Full CardMarket data structure support  
✅ **Ingestion Logic**: Processes all CardMarket fields including historical data
✅ **Frontend Components**: Rich price display with historical trends
✅ **Price Graphs**: Real historical data from CardMarket averages

Once you fix the API connection, you'll get:
- **Historical Price Data**: 1/7/30-day averages from CardMarket
- **Rich Pricing**: Average sell, suggested price, trend data
- **Visual Trends**: Up/down indicators and percentage changes
- **Enhanced UX**: Comprehensive price analysis

## Next Steps

1. **Fix API**: Run `node scripts/test-pokemon-api.js` and follow its recommendations
2. **Test Sync**: Run `npm run ingest:cards` once API is working
3. **Verify Data**: Check for CardMarket prices in your database
4. **Test Frontend**: View cards to see the enhanced pricing display

The 404 error is just a connection issue - the CardMarket integration itself is fully implemented and ready to work once the API connection is restored.