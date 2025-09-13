-- Add user set preferences table for master set collection toggle
-- This stores whether a user collects a set as "master set" (all variants required) or normal

CREATE TABLE user_set_preferences (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  set_id text NOT NULL REFERENCES tcg_sets(id) ON DELETE CASCADE,
  is_master_set boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, set_id)
);

-- Enable RLS on user_set_preferences
ALTER TABLE user_set_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own set preferences
CREATE POLICY "Users can view own set preferences" ON user_set_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own set preferences" ON user_set_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own set preferences" ON user_set_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own set preferences" ON user_set_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_set_preferences_user_id ON user_set_preferences(user_id);
CREATE INDEX idx_user_set_preferences_set_id ON user_set_preferences(set_id);

-- Grant permissions to authenticated users
GRANT ALL ON user_set_preferences TO authenticated;
GRANT USAGE ON SEQUENCE user_set_preferences_id_seq TO authenticated;

-- Create trigger for updated_at timestamp
CREATE TRIGGER set_timestamp_user_set_preferences
  BEFORE UPDATE ON user_set_preferences
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

-- Add comment for documentation
COMMENT ON TABLE user_set_preferences IS 'User preferences for set collection mode (master set vs normal set)';