-- Add user preferences to profiles table
-- Migration: Extend profiles table with user settings and preferences

-- Create currency enum for supported currencies
CREATE TYPE currency_code AS ENUM (
  'EUR',
  'USD', 
  'GBP',
  'NOK'
);

-- Add new columns to profiles table for user preferences and extended profile data
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_currency currency_code DEFAULT 'EUR';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_price_source price_source DEFAULT 'cardmarket';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create index for efficient querying by preferences
CREATE INDEX IF NOT EXISTS idx_profiles_preferences ON profiles(preferred_currency, preferred_price_source);

-- Add trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS set_timestamp_profiles ON profiles;
CREATE TRIGGER set_timestamp_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

-- Update comments for documentation
COMMENT ON COLUMN profiles.display_name IS 'User display name shown in UI';
COMMENT ON COLUMN profiles.bio IS 'User bio/description text';
COMMENT ON COLUMN profiles.location IS 'User location text';
COMMENT ON COLUMN profiles.website IS 'User website URL';
COMMENT ON COLUMN profiles.avatar_url IS 'URL to user avatar image';
COMMENT ON COLUMN profiles.banner_url IS 'URL to user banner image';
COMMENT ON COLUMN profiles.preferred_currency IS 'User preferred currency for price display';
COMMENT ON COLUMN profiles.preferred_price_source IS 'User preferred price data source';
COMMENT ON TYPE currency_code IS 'Supported currency codes for price display';