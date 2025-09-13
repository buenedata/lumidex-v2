-- Add support for multiple TCG types
-- Migration: Add TCG type enum and extend tcg_sets table

-- Create TCG type enum
CREATE TYPE tcg_type AS ENUM (
  'pokemon',
  'lorcana',
  'magic',
  'yugioh',
  'digimon',
  'onepiece'
);

-- Add tcg_type column to tcg_sets table
ALTER TABLE tcg_sets 
ADD COLUMN tcg_type tcg_type DEFAULT 'pokemon' NOT NULL;

-- Create index for efficient querying by TCG type and series
CREATE INDEX idx_tcg_sets_tcg_type_series ON tcg_sets(tcg_type, series);

-- Create index for TCG type and release date
CREATE INDEX idx_tcg_sets_tcg_type_release_date ON tcg_sets(tcg_type, release_date DESC);

-- Update the existing sets to have pokemon as the tcg_type (they're all pokemon currently)
UPDATE tcg_sets SET tcg_type = 'pokemon';

-- Add comment for documentation
COMMENT ON COLUMN tcg_sets.tcg_type IS 'The trading card game type (pokemon, lorcana, etc.)';
COMMENT ON TYPE tcg_type IS 'Supported trading card game types for multi-TCG support';