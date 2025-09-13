-- Admin Custom Variants Migration
-- Adds support for admin-managed custom card variants

-- Create custom variant types enum
CREATE TYPE custom_variant_type AS ENUM (
  'reverse_holo_pokeball',
  'reverse_holo_masterball', 
  'special_edition',
  'promo',
  'custom'
);

-- Custom Card Variants table for admin-managed special variants
CREATE TABLE custom_card_variants (
  id bigserial PRIMARY KEY,
  card_id text NOT NULL REFERENCES tcg_cards(id) ON DELETE CASCADE,
  variant_name text NOT NULL,
  variant_type custom_variant_type NOT NULL,
  display_name text NOT NULL,
  description text NOT NULL,
  source_product text, -- e.g., "Victini Illustration Collection"
  price_usd numeric,
  price_eur numeric,
  is_active boolean NOT NULL DEFAULT true,
  replaces_standard_variant text, -- Which standard variant this replaces (if any)
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(card_id, variant_name),
  UNIQUE(card_id, variant_type) -- Only one custom variant per type per card
);

-- Enable RLS on custom_card_variants 
ALTER TABLE custom_card_variants ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy - only specific admin email can modify
CREATE POLICY "Admin can manage custom variants" ON custom_card_variants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'kbbuene@gmail.com'
    )
  );

-- Public can view active custom variants
CREATE POLICY "Public can view active custom variants" ON custom_card_variants
  FOR SELECT USING (is_active = true);

-- Create indexes for performance
CREATE INDEX idx_custom_card_variants_card_id ON custom_card_variants(card_id);
CREATE INDEX idx_custom_card_variants_active ON custom_card_variants(is_active) WHERE is_active = true;
CREATE INDEX idx_custom_card_variants_type ON custom_card_variants(variant_type);

-- Add trigger for updated_at timestamp
CREATE TRIGGER set_timestamp_custom_card_variants
  BEFORE UPDATE ON custom_card_variants
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

-- Grant permissions
GRANT SELECT ON custom_card_variants TO anon, authenticated;
GRANT ALL ON custom_card_variants TO authenticated;
GRANT USAGE ON SEQUENCE custom_card_variants_id_seq TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE custom_card_variants IS 'Admin-managed custom variants for special cards like collection exclusives';
COMMENT ON COLUMN custom_card_variants.replaces_standard_variant IS 'If set, this custom variant replaces the standard variant in default display';
COMMENT ON COLUMN custom_card_variants.source_product IS 'Product or source where this variant is available';
COMMENT ON TYPE custom_variant_type IS 'Types of custom variants that can be created by admin';

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = 'kbbuene@gmail.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for card variants that combines standard and custom variants
CREATE OR REPLACE VIEW card_variants_combined AS
SELECT 
  c.id as card_id,
  c.name as card_name,
  c.number as card_number,
  c.set_id,
  s.name as set_name,
  c.rarity,
  -- Standard variants (from pricing or rules)
  NULL as custom_variant_id,
  'standard' as variant_source,
  NULL as variant_type,
  NULL as display_name,
  NULL as description,
  NULL as source_product,
  NULL as price_usd,
  NULL as price_eur,
  true as is_active,
  NULL as replaces_standard_variant
FROM tcg_cards c
JOIN tcg_sets s ON c.set_id = s.id

UNION ALL

SELECT 
  cv.card_id,
  c.name as card_name,
  c.number as card_number,
  c.set_id,
  s.name as set_name,
  c.rarity,
  -- Custom variants
  cv.id as custom_variant_id,
  'custom' as variant_source,
  cv.variant_type::text,
  cv.display_name,
  cv.description,
  cv.source_product,
  cv.price_usd,
  cv.price_eur,
  cv.is_active,
  cv.replaces_standard_variant
FROM custom_card_variants cv
JOIN tcg_cards c ON cv.card_id = c.id
JOIN tcg_sets s ON c.set_id = s.id
WHERE cv.is_active = true;

-- Grant access to the view
GRANT SELECT ON card_variants_combined TO anon, authenticated;

COMMENT ON VIEW card_variants_combined IS 'Combined view of standard and custom variants for easy querying';