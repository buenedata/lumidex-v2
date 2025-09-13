-- Debug query for Clefable variant detection issue
-- Run this in Supabase SQL editor to see what data exists

SELECT 
  set_id, 
  set_name, 
  number, 
  rarity, 
  set_id,
  tcgplayer_normal_available, 
  tcgplayer_holofoil_available, 
  tcgplayer_reverse_holo_available, 
  tcgplayer_1st_edition_available,
  cardmarket_avg_sell_price,
  cardmarket_reverse_holo_sell,
  cardmarket_low_price,
  cardmarket_reverse_holo_low
FROM cards 
WHERE set_name = 'Clefable' AND set_id = 'swsh4';

-- Also check what columns actually exist in the cards table
-- Run this to see the table structure:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'cards' 
-- AND column_name LIKE '%tcgplayer%' OR column_name LIKE '%cardmarket%'
-- ORDER BY column_name;