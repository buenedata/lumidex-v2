-- Migration: Add exchange rates table for currency conversion
-- This table stores daily exchange rates for converting between currencies
-- Used to display prices in users' preferred currencies

-- Create exchange rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
    id SERIAL PRIMARY KEY,
    from_currency currency_code NOT NULL,
    to_currency currency_code NOT NULL,
    rate DECIMAL(10, 6) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate rates for same currency pair
-- Daily uniqueness will be handled in the application logic
ALTER TABLE exchange_rates
ADD CONSTRAINT unique_currency_pair_date
UNIQUE (from_currency, to_currency, updated_at);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies 
ON exchange_rates(from_currency, to_currency);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_updated 
ON exchange_rates(updated_at DESC);

-- Create index for latest rates lookup (most common query)
CREATE INDEX IF NOT EXISTS idx_exchange_rates_latest 
ON exchange_rates(from_currency, to_currency, updated_at DESC);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER set_timestamp_exchange_rates
    BEFORE UPDATE ON exchange_rates
    FOR EACH ROW
    EXECUTE PROCEDURE trigger_set_timestamp();

-- Add comments for documentation
COMMENT ON TABLE exchange_rates IS 'Daily exchange rates for currency conversion between supported currencies';
COMMENT ON COLUMN exchange_rates.from_currency IS 'Source currency code (e.g., EUR, USD)';
COMMENT ON COLUMN exchange_rates.to_currency IS 'Target currency code (e.g., NOK, GBP)';
COMMENT ON COLUMN exchange_rates.rate IS 'Exchange rate from from_currency to to_currency (1 from_currency = rate to_currency)';
COMMENT ON COLUMN exchange_rates.updated_at IS 'When this rate was last updated - used for daily rate tracking';

-- Insert some initial rates for development/testing
-- These will be replaced by real rates from the API
INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at) VALUES
    ('EUR', 'NOK', 11.50, CURRENT_DATE),
    ('EUR', 'USD', 1.08, CURRENT_DATE),
    ('EUR', 'GBP', 0.86, CURRENT_DATE),
    ('USD', 'NOK', 10.65, CURRENT_DATE),
    ('USD', 'EUR', 0.93, CURRENT_DATE),
    ('USD', 'GBP', 0.79, CURRENT_DATE),
    ('GBP', 'NOK', 13.40, CURRENT_DATE),
    ('GBP', 'EUR', 1.16, CURRENT_DATE),
    ('GBP', 'USD', 1.27, CURRENT_DATE),
    ('NOK', 'EUR', 0.087, CURRENT_DATE),
    ('NOK', 'USD', 0.094, CURRENT_DATE),
    ('NOK', 'GBP', 0.075, CURRENT_DATE)
ON CONFLICT (from_currency, to_currency, updated_at) DO NOTHING;