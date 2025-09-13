-- Lumidex v2 Initial Database Schema
-- Creates all tables, enums, indexes, RLS policies, and grants

-- Create custom enums
CREATE TYPE variant_name AS ENUM (
  'normal',
  'holofoil', 
  'reverse_holofoil',
  'first_edition_normal',
  'first_edition_holofoil',
  'unlimited'
);

CREATE TYPE price_source AS ENUM (
  'cardmarket',
  'tcgplayer'
);

-- ================================
-- PUBLIC REFERENCE TABLES (no RLS)
-- ================================

-- TCG Sets table
CREATE TABLE tcg_sets (
  id text PRIMARY KEY,
  name text NOT NULL,
  series text,
  tcg_type text NOT NULL DEFAULT 'pokemon',
  ptcgo_code text,
  printed_total int,
  total int,
  release_date date,
  updated_at timestamptz DEFAULT now(),
  legalities jsonb DEFAULT '{}',
  images jsonb DEFAULT '{}'
);

-- Create index on release_date for chronological queries
CREATE INDEX idx_tcg_sets_release_date ON tcg_sets(release_date DESC);

-- TCG Cards table
CREATE TABLE tcg_cards (
  id text PRIMARY KEY,
  set_id text NOT NULL REFERENCES tcg_sets(id) ON DELETE CASCADE,
  number text NOT NULL,
  name text NOT NULL,
  supertype text,
  subtypes text[] DEFAULT '{}',
  hp text,
  types text[] DEFAULT '{}',
  evolves_from text,
  rules text[] DEFAULT '{}',
  regulation_mark text,
  artist text,
  rarity text,
  flavor_text text,
  national_pokedex_numbers int[] DEFAULT '{}',
  legalities jsonb DEFAULT '{}',
  images jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for tcg_cards
CREATE INDEX idx_tcg_cards_set_id ON tcg_cards(set_id);
CREATE INDEX idx_tcg_cards_rarity ON tcg_cards(rarity);
CREATE INDEX idx_tcg_cards_updated_at ON tcg_cards(updated_at);
CREATE INDEX idx_tcg_cards_types_gin ON tcg_cards USING GIN(types);

-- TCG Card Prices table
CREATE TABLE tcg_card_prices (
  card_id text NOT NULL REFERENCES tcg_cards(id) ON DELETE CASCADE,
  source price_source NOT NULL,
  variant variant_name NOT NULL,
  last_updated timestamptz DEFAULT now(),
  currency text DEFAULT 'EUR',
  low numeric,
  mid numeric,
  high numeric,
  market numeric,
  direct_low numeric,
  url text,
  PRIMARY KEY (card_id, source, variant)
);

-- Create index for price queries
CREATE INDEX idx_tcg_card_prices_source_variant ON tcg_card_prices(source, variant);

-- ================================
-- USER TABLES (RLS enabled)
-- ================================

-- User Profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  username text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Collection Items table
CREATE TABLE collection_items (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_id text NOT NULL REFERENCES tcg_cards(id) ON DELETE CASCADE,
  variant variant_name NOT NULL DEFAULT 'normal',
  variant_v2 text, -- New variant system
  quantity int NOT NULL DEFAULT 1,
  condition text,
  acquired_at date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, card_id, variant),
  UNIQUE(user_id, card_id, variant_v2)
);

-- Enable RLS on collection_items
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own collection items
CREATE POLICY "Users can view own collection" ON collection_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collection items" ON collection_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collection items" ON collection_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collection items" ON collection_items
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for collection_items
CREATE INDEX idx_collection_items_user_id ON collection_items(user_id);
CREATE INDEX idx_collection_items_card_id ON collection_items(card_id);

-- ================================
-- GRANTS AND PERMISSIONS
-- ================================

-- Grant SELECT permissions on public reference tables to anon and authenticated users
GRANT SELECT ON tcg_sets TO anon, authenticated;
GRANT SELECT ON tcg_cards TO anon, authenticated;
GRANT SELECT ON tcg_card_prices TO anon, authenticated;

-- Grant CRUD permissions on user tables to authenticated users (controlled by RLS)
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON collection_items TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON SEQUENCE collection_items_id_seq TO authenticated;

-- ================================
-- HELPER FUNCTIONS
-- ================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER set_timestamp_tcg_sets
  BEFORE UPDATE ON tcg_sets
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_tcg_cards
  BEFORE UPDATE ON tcg_cards
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_collection_items
  BEFORE UPDATE ON collection_items
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

-- ================================
-- COMMENTS FOR DOCUMENTATION
-- ================================

COMMENT ON TABLE tcg_sets IS 'Pokemon TCG sets data from Pokemon TCG API v2';
COMMENT ON TABLE tcg_cards IS 'Pokemon TCG cards data with normalized fields';
COMMENT ON TABLE tcg_card_prices IS 'Price data from cardmarket and tcgplayer with variant mapping';
COMMENT ON TABLE profiles IS 'User profiles linked to Supabase Auth';
COMMENT ON TABLE collection_items IS 'User collection items with RLS protection';

COMMENT ON TYPE variant_name IS 'Normalized card variant names for consistent price mapping';
COMMENT ON TYPE price_source IS 'Supported price data sources';