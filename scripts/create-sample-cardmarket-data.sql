-- Sample CardMarket Data for Testing (While API is Down)
-- This creates realistic test data to verify the CardMarket integration

-- Insert sample enhanced CardMarket price data
INSERT INTO tcg_card_prices (
  card_id, source, variant, last_updated, currency,
  low, mid, high, market, direct_low,
  -- Enhanced CardMarket fields
  average_sell_price, german_pro_low, suggested_price,
  reverse_holo_sell, reverse_holo_low, reverse_holo_trend,
  low_price_ex_plus, trend, trend_price,
  -- Historical averages (KEY FEATURE!)
  avg_1_day, avg_7_day, avg_30_day,
  url
) VALUES
-- Sample: Charizard EX (popular card with rich data)
('xy12-11', 'cardmarket', 'normal', NOW(), 'EUR',
  45.00, 52.50, 65.00, 48.75, 42.00,
  47.80, 44.50, 55.00,
  NULL, NULL, NULL,
  NULL, 8.5, 51.20,
  49.10, 47.90, 45.20,
  'https://cardmarket.com/en/Pokemon/Products/Singles/XY-Evolutions/Charizard-EX-11'),

-- Sample: Charizard EX Holofoil variant
('xy12-11', 'cardmarket', 'holofoil', NOW(), 'EUR',
  85.00, 95.00, 120.00, 92.50, 82.00,
  89.30, 84.00, 105.00,
  NULL, NULL, NULL,
  NULL, 12.3, 98.75,
  94.20, 91.40, 82.10,
  'https://cardmarket.com/en/Pokemon/Products/Singles/XY-Evolutions/Charizard-EX-11'),

-- Sample: Pikachu (common card)
('xy12-26', 'cardmarket', 'normal', NOW(), 'EUR',
  0.15, 0.25, 0.45, 0.22, 0.12,
  0.24, 0.18, 0.30,
  NULL, NULL, NULL,
  NULL, -5.2, 0.26,
  0.23, 0.25, 0.29,
  'https://cardmarket.com/en/Pokemon/Products/Singles/XY-Evolutions/Pikachu-26'),

-- Sample: Recent card with reverse holo data
('swsh1-25', 'cardmarket', 'reverse_holofoil', NOW(), 'EUR',
  1.20, 1.80, 2.50, 1.65, 1.10,
  1.72, 1.35, 2.00,
  2.10, 1.95, 3.2,
  NULL, 15.8, 1.90,
  1.68, 1.55, 1.42,
  'https://cardmarket.com/en/Pokemon/Products/Singles/Sword-Shield-Base-Set/Pokemon-25'),

-- Sample: High-value card showing trends
('base1-4', 'cardmarket', 'holofoil', NOW(), 'EUR',
  180.00, 220.00, 280.00, 205.00, 175.00,
  210.50, 185.00, 245.00,
  NULL, NULL, NULL,
  NULL, -8.9, 225.00,
  212.00, 218.50, 225.80,
  'https://cardmarket.com/en/Pokemon/Products/Singles/Base-Set/Charizard-4'),

-- Add corresponding TCGPlayer data for comparison
('xy12-11', 'tcgplayer', 'normal', NOW(), 'USD',
  52.00, 58.00, 72.00, 55.50, 48.00,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  'https://tcgplayer.com/product/xy12-11'),

-- Sample card data if missing (basic Pokemon cards)
INSERT INTO tcg_cards (
  id, set_id, number, name, supertype, subtypes, types, rarity, 
  artist, images, updated_at
) VALUES
('xy12-11', 'xy12', '11', 'Charizard-EX', 'Pokémon', ARRAY['Basic', 'EX'], ARRAY['Fire'], 'Rare Holo EX',
  'Eske Yoshinob', '{"small": "https://images.pokemontcg.io/xy12/11.png", "large": "https://images.pokemontcg.io/xy12/11_hires.png"}', NOW()),
  
('xy12-26', 'xy12', '26', 'Pikachu', 'Pokémon', ARRAY['Basic'], ARRAY['Lightning'], 'Common',
  'Midori Harada', '{"small": "https://images.pokemontcg.io/xy12/26.png", "large": "https://images.pokemontcg.io/xy12/26_hires.png"}', NOW()),

('swsh1-25', 'swsh1', '25', 'Pokémon Communication', 'Trainer', ARRAY['Item'], ARRAY[], 'Uncommon',
  'Toyste Beach', '{"small": "https://images.pokemontcg.io/swsh1/25.png", "large": "https://images.pokemontcg.io/swsh1/25_hires.png"}', NOW()),

('base1-4', 'base1', '4', 'Charizard', 'Pokémon', ARRAY['Stage 2'], ARRAY['Fire'], 'Rare Holo',
  'Mitsuhiro Arita', '{"small": "https://images.pokemontcg.io/base1/4.png", "large": "https://images.pokemontcg.io/base1/4_hires.png"}', NOW())

ON CONFLICT (id) DO NOTHING;

-- Add sample sets if missing
INSERT INTO tcg_sets (id, name, series, total, release_date, updated_at, images) VALUES
('xy12', 'XY—Evolutions', 'XY', 108, '2016-11-02', NOW(), '{"symbol": "https://images.pokemontcg.io/xy12/symbol.png", "logo": "https://images.pokemontcg.io/xy12/logo.png"}'),
('swsh1', 'Sword & Shield', 'Sword & Shield', 202, '2020-02-07', NOW(), '{"symbol": "https://images.pokemontcg.io/swsh1/symbol.png", "logo": "https://images.pokemontcg.io/swsh1/logo.png"}'),
('base1', 'Base', 'Base', 102, '1999-01-09', NOW(), '{"symbol": "https://images.pokemontcg.io/base1/symbol.png", "logo": "https://images.pokemontcg.io/base1/logo.png"}')
ON CONFLICT (id) DO NOTHING;

-- Verify the data was inserted
SELECT 
  c.name as card_name,
  p.variant,
  p.source,
  p.market,
  p.average_sell_price,
  p.avg_30_day,
  p.trend,
  CASE 
    WHEN p.avg_30_day IS NOT NULL THEN 'Has Historical Data ✅'
    ELSE 'Basic Data Only'
  END as data_richness
FROM tcg_card_prices p
JOIN tcg_cards c ON p.card_id = c.id
WHERE p.source = 'cardmarket'
ORDER BY p.market DESC;