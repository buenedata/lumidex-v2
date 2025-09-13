-- Disabled Standard Variants Migration
-- Allows admin to disable specific standard variants for individual cards

-- Create table to track disabled standard variants
CREATE TABLE disabled_standard_variants (
  id bigserial PRIMARY KEY,
  card_id text NOT NULL REFERENCES tcg_cards(id) ON DELETE CASCADE,
  variant_type text NOT NULL, -- The UI variant type (e.g., 'reverse_holo_pokeball')
  disabled_by uuid REFERENCES profiles(id),
  disabled_at timestamptz DEFAULT now(),
  reason text, -- Optional reason for disabling
  UNIQUE(card_id, variant_type)
);

-- Enable RLS on disabled_standard_variants
ALTER TABLE disabled_standard_variants ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admin can manage disabled variants" ON disabled_standard_variants
  FOR ALL USING (is_admin_user());

-- Public can view disabled variants (needed for variant engine)
CREATE POLICY "Public can view disabled variants" ON disabled_standard_variants
  FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX idx_disabled_standard_variants_card_id ON disabled_standard_variants(card_id);
CREATE INDEX idx_disabled_standard_variants_type ON disabled_standard_variants(variant_type);

-- Grant permissions
GRANT SELECT ON disabled_standard_variants TO anon, authenticated;
GRANT ALL ON disabled_standard_variants TO authenticated;
GRANT USAGE ON SEQUENCE disabled_standard_variants_id_seq TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE disabled_standard_variants IS 'Admin-disabled standard variants for specific cards';
COMMENT ON COLUMN disabled_standard_variants.variant_type IS 'The UI variant type that should be disabled (e.g., reverse_holo_pokeball)';
COMMENT ON COLUMN disabled_standard_variants.reason IS 'Optional reason why this variant was disabled';