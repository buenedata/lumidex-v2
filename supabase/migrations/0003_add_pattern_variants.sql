-- Add pokeball and masterball patterns to original variant_name enum
-- This extends the existing enum to support pattern variants

ALTER TYPE variant_name ADD VALUE 'reverse_holo_pokeball';
ALTER TYPE variant_name ADD VALUE 'reverse_holo_masterball';