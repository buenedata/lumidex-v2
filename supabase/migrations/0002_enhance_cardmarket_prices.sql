-- Enhanced CardMarket Price Support Migration
-- Adds columns for comprehensive CardMarket pricing data including historical averages

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

-- Historical averages from CardMarket (key feature for price history!)
ALTER TABLE tcg_card_prices ADD COLUMN IF NOT EXISTS avg_1_day numeric;
ALTER TABLE tcg_card_prices ADD COLUMN IF NOT EXISTS avg_7_day numeric;
ALTER TABLE tcg_card_prices ADD COLUMN IF NOT EXISTS avg_30_day numeric;

-- Add index for historical price queries
CREATE INDEX IF NOT EXISTS idx_tcg_card_prices_historical 
ON tcg_card_prices(card_id, source, last_updated DESC) 
WHERE avg_30_day IS NOT NULL;

-- Add index for CardMarket trend analysis
CREATE INDEX IF NOT EXISTS idx_tcg_card_prices_trends
ON tcg_card_prices(card_id, source, variant)
WHERE trend IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN tcg_card_prices.average_sell_price IS 'CardMarket average sell price';
COMMENT ON COLUMN tcg_card_prices.german_pro_low IS 'CardMarket German Pro low price';
COMMENT ON COLUMN tcg_card_prices.suggested_price IS 'CardMarket suggested price';
COMMENT ON COLUMN tcg_card_prices.reverse_holo_sell IS 'CardMarket reverse holo sell price';
COMMENT ON COLUMN tcg_card_prices.reverse_holo_low IS 'CardMarket reverse holo low price';
COMMENT ON COLUMN tcg_card_prices.reverse_holo_trend IS 'CardMarket reverse holo trend';
COMMENT ON COLUMN tcg_card_prices.low_price_ex_plus IS 'CardMarket low price ex plus';
COMMENT ON COLUMN tcg_card_prices.trend IS 'CardMarket price trend indicator';
COMMENT ON COLUMN tcg_card_prices.trend_price IS 'CardMarket trend price';
COMMENT ON COLUMN tcg_card_prices.avg_1_day IS 'CardMarket 1-day average price';
COMMENT ON COLUMN tcg_card_prices.avg_7_day IS 'CardMarket 7-day average price';
COMMENT ON COLUMN tcg_card_prices.avg_30_day IS 'CardMarket 30-day average price';