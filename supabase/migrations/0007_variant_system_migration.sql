-- Variant Quantity Box System - Database Migration
-- Implements dual-write approach for safe schema transition

-- ================================
-- 1. NEW VARIANT ENUM
-- ================================

-- Create new UI-canonical variant enum
CREATE TYPE variant_name_v2 AS ENUM (
  'normal',
  'holo', 
  'reverse_holo_standard',
  'reverse_holo_pokeball',
  'reverse_holo_masterball',
  'first_edition',
  'custom'
);

-- ================================
-- 2. COLLECTION ITEMS MIGRATION
-- ================================

-- Add new variant column with dual-write support
ALTER TABLE collection_items ADD COLUMN variant_v2 variant_name_v2;

-- Add new unique constraint for the new variant system
ALTER TABLE collection_items ADD CONSTRAINT unique_user_card_variant_v2 
  UNIQUE(user_id, card_id, variant_v2);

-- ================================
-- 3. SET POLICIES TABLE
-- ================================

CREATE TABLE tcg_set_policies (
  set_id text PRIMARY KEY REFERENCES tcg_sets(id) ON DELETE CASCADE,
  has_standard_reverse boolean DEFAULT true,
  has_pokeball_reverse boolean DEFAULT false,
  has_masterball_reverse boolean DEFAULT false,
  has_first_edition boolean DEFAULT false,
  rare_policy text DEFAULT 'auto', -- 'auto', 'force_holo', 'allow_normal'
  era text DEFAULT 'modern', -- 'classic', 'modern', 'sv'
  special_rules jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX idx_tcg_set_policies_era ON tcg_set_policies(era);
CREATE INDEX idx_tcg_set_policies_set_id ON tcg_set_policies(set_id);

-- ================================
-- 4. RARITY MAPPINGS TABLE
-- ================================

CREATE TABLE rarity_variant_mappings (
  id bigserial PRIMARY KEY,
  rarity text NOT NULL,
  era text NOT NULL,
  allowed_variants text[] NOT NULL,
  force_variants text[] DEFAULT '{}',
  exclude_variants text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Unique constraint
ALTER TABLE rarity_variant_mappings 
  ADD CONSTRAINT unique_rarity_era UNIQUE(rarity, era);

-- Index for efficient lookups
CREATE INDEX idx_rarity_variant_mappings_rarity_era ON rarity_variant_mappings(rarity, era);

-- ================================
-- 5. CARD VARIANT EXCEPTIONS TABLE
-- ================================

CREATE TABLE card_variant_exceptions (
  id bigserial PRIMARY KEY,
  set_id text NOT NULL REFERENCES tcg_sets(id) ON DELETE CASCADE,
  card_number text NOT NULL,
  exception_type text NOT NULL, -- 'force', 'exclude', 'override'
  variant_changes jsonb NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(set_id, card_number, exception_type)
);

-- Indexes for efficient lookups
CREATE INDEX idx_card_variant_exceptions_set_id ON card_variant_exceptions(set_id);
CREATE INDEX idx_card_variant_exceptions_set_card ON card_variant_exceptions(set_id, card_number);

-- ================================
-- 6. DATA BACKFILL
-- ================================

-- Backfill existing collection_items with mapped variant_v2 values
UPDATE collection_items SET variant_v2 = CASE 
  WHEN variant = 'holofoil' THEN 'holo'::variant_name_v2
  WHEN variant = 'reverse_holofoil' THEN 'reverse_holo_standard'::variant_name_v2
  WHEN variant = 'first_edition_normal' THEN 'first_edition'::variant_name_v2
  WHEN variant = 'first_edition_holofoil' THEN 'first_edition'::variant_name_v2
  WHEN variant = 'unlimited' THEN 'normal'::variant_name_v2
  ELSE 'normal'::variant_name_v2
END
WHERE variant_v2 IS NULL;

-- ================================
-- 7. SEED DATA FOR RARITY MAPPINGS
-- ================================

-- Scarlet & Violet Era Mappings
INSERT INTO rarity_variant_mappings (rarity, era, allowed_variants, force_variants) VALUES
('Common', 'sv', ARRAY['normal', 'reverse_holo_standard'], ARRAY[]::text[]),
('Uncommon', 'sv', ARRAY['normal', 'reverse_holo_standard'], ARRAY[]::text[]),
('Rare', 'sv', ARRAY['holo', 'reverse_holo_standard'], ARRAY['holo']),
('Double Rare', 'sv', ARRAY['holo'], ARRAY['holo']),
('Ultra Rare', 'sv', ARRAY['holo'], ARRAY['holo']),
('Special Illustration Rare', 'sv', ARRAY['holo'], ARRAY['holo']),
('Hyper Rare', 'sv', ARRAY['holo'], ARRAY['holo']),
('ACE SPEC Rare', 'sv', ARRAY['holo'], ARRAY['holo']);

-- Modern Era Mappings (2017-2022)
INSERT INTO rarity_variant_mappings (rarity, era, allowed_variants, force_variants) VALUES
('Common', 'modern', ARRAY['normal', 'reverse_holo_standard'], ARRAY[]::text[]),
('Uncommon', 'modern', ARRAY['normal', 'reverse_holo_standard'], ARRAY[]::text[]),
('Rare', 'modern', ARRAY['normal', 'holo', 'reverse_holo_standard'], ARRAY[]::text[]),
('Rare Holo', 'modern', ARRAY['holo', 'reverse_holo_standard'], ARRAY['holo']),
('Ultra Rare', 'modern', ARRAY['holo'], ARRAY['holo']),
('Secret Rare', 'modern', ARRAY['holo'], ARRAY['holo']);

-- Classic Era Mappings (pre-2017)
INSERT INTO rarity_variant_mappings (rarity, era, allowed_variants, force_variants) VALUES
('Common', 'classic', ARRAY['normal', 'first_edition'], ARRAY[]::text[]),
('Uncommon', 'classic', ARRAY['normal', 'first_edition'], ARRAY[]::text[]),
('Rare', 'classic', ARRAY['normal', 'holo', 'first_edition'], ARRAY[]::text[]),
('Rare Holo', 'classic', ARRAY['holo', 'first_edition'], ARRAY['holo']);

-- ================================
-- 8. SEED DATA FOR SET POLICIES
-- ================================

-- Prismatic Evolutions (has Master Ball reverses)
INSERT INTO tcg_set_policies (set_id, has_pokeball_reverse, has_masterball_reverse, era) VALUES
('sv4pt5', true, true, 'sv');

-- Scarlet & Violet base sets (Poké Ball reverses only)
INSERT INTO tcg_set_policies (set_id, has_pokeball_reverse, era) VALUES
('sv1', true, 'sv'),
('sv2', true, 'sv'),
('sv3', true, 'sv'),
('sv4', true, 'sv');

-- Classic sets with 1st Edition
INSERT INTO tcg_set_policies (set_id, has_first_edition, era) VALUES
('base1', true, 'classic'),
('base2', true, 'classic'),
('base3', true, 'classic'),
('base4', true, 'classic');

-- ================================
-- 9. RLS POLICIES FOR NEW TABLES
-- ================================

-- Enable RLS on new tables
ALTER TABLE tcg_set_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE rarity_variant_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_variant_exceptions ENABLE ROW LEVEL SECURITY;

-- Set policies are readable by everyone, writable by admins only
CREATE POLICY "Set policies are readable by all" ON tcg_set_policies
  FOR SELECT USING (true);

-- Rarity mappings are readable by everyone, writable by admins only  
CREATE POLICY "Rarity mappings are readable by all" ON rarity_variant_mappings
  FOR SELECT USING (true);

-- Card exceptions are readable by everyone, writable by admins only
CREATE POLICY "Card exceptions are readable by all" ON card_variant_exceptions
  FOR SELECT USING (true);

-- ================================
-- 10. GRANTS AND PERMISSIONS
-- ================================

-- Grant SELECT permissions on new tables to anon and authenticated users
GRANT SELECT ON tcg_set_policies TO anon, authenticated;
GRANT SELECT ON rarity_variant_mappings TO anon, authenticated;
GRANT SELECT ON card_variant_exceptions TO anon, authenticated;

-- Grant usage on sequences
GRANT USAGE ON SEQUENCE rarity_variant_mappings_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE card_variant_exceptions_id_seq TO authenticated;

-- ================================
-- 11. HELPER FUNCTIONS
-- ================================

-- Function to get variants for a card based on rules
CREATE OR REPLACE FUNCTION get_allowed_variants_for_card(
  p_card_id text,
  p_rarity text,
  p_set_id text
) RETURNS text[] AS $$
DECLARE
  v_set_policy RECORD;
  v_rarity_mapping RECORD;
  v_allowed_variants text[];
  v_era text;
BEGIN
  -- Get set policy
  SELECT * INTO v_set_policy FROM tcg_set_policies WHERE set_id = p_set_id;
  
  -- Default era if no policy found
  v_era := COALESCE(v_set_policy.era, 'modern');
  
  -- Get rarity mapping
  SELECT * INTO v_rarity_mapping 
  FROM rarity_variant_mappings 
  WHERE rarity = p_rarity AND era = v_era;
  
  -- Start with rarity-allowed variants
  v_allowed_variants := COALESCE(v_rarity_mapping.allowed_variants, ARRAY['normal']);
  
  -- Add policy-driven variants
  IF v_set_policy.has_pokeball_reverse AND 'reverse_holo_standard' = ANY(v_allowed_variants) THEN
    v_allowed_variants := array_append(v_allowed_variants, 'reverse_holo_pokeball');
  END IF;
  
  IF v_set_policy.has_masterball_reverse AND 'reverse_holo_standard' = ANY(v_allowed_variants) THEN
    v_allowed_variants := array_append(v_allowed_variants, 'reverse_holo_masterball');
  END IF;
  
  IF v_set_policy.has_first_edition THEN
    v_allowed_variants := array_append(v_allowed_variants, 'first_edition');
  END IF;
  
  RETURN v_allowed_variants;
END;
$$ LANGUAGE plpgsql;

-- Function to migrate legacy variant data
CREATE OR REPLACE FUNCTION migrate_legacy_variants() RETURNS void AS $$
BEGIN
  -- Update any remaining NULL variant_v2 values
  UPDATE collection_items SET variant_v2 = CASE 
    WHEN variant = 'holofoil' THEN 'holo'::variant_name_v2
    WHEN variant = 'reverse_holofoil' THEN 'reverse_holo_standard'::variant_name_v2
    WHEN variant = 'first_edition_normal' THEN 'first_edition'::variant_name_v2
    WHEN variant = 'first_edition_holofoil' THEN 'first_edition'::variant_name_v2
    WHEN variant = 'unlimited' THEN 'normal'::variant_name_v2
    ELSE 'normal'::variant_name_v2
  END
  WHERE variant_v2 IS NULL;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- 12. TRIGGERS FOR UPDATED_AT
-- ================================

CREATE TRIGGER set_timestamp_tcg_set_policies
  BEFORE UPDATE ON tcg_set_policies
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

-- ================================
-- 13. COMMENTS FOR DOCUMENTATION
-- ================================

COMMENT ON TABLE tcg_set_policies IS 'Per-set variant policies for the Variant Rule Engine';
COMMENT ON TABLE rarity_variant_mappings IS 'Rarity-based variant rules by era';
COMMENT ON TABLE card_variant_exceptions IS 'Card-specific variant overrides and exceptions';
COMMENT ON TYPE variant_name_v2 IS 'UI-canonical variant names for the new variant system';
COMMENT ON FUNCTION get_allowed_variants_for_card IS 'Returns allowed variants for a card based on rarity and set policies';

-- ================================
-- 14. DATA INTEGRITY CHECKS
-- ================================

-- Verify migration integrity
DO $$
DECLARE
  v_old_count int;
  v_new_count int;
BEGIN
  -- Count old variant records
  SELECT COUNT(*) INTO v_old_count FROM collection_items WHERE variant IS NOT NULL;
  
  -- Count new variant records  
  SELECT COUNT(*) INTO v_new_count FROM collection_items WHERE variant_v2 IS NOT NULL;
  
  IF v_old_count != v_new_count THEN
    RAISE EXCEPTION 'Migration integrity check failed: old count % != new count %', v_old_count, v_new_count;
  END IF;
  
  RAISE NOTICE 'Migration completed successfully: % records migrated', v_new_count;
END;
$$;