import type { CurrencyCode, PriceSource, VariantName } from '@/types';

export interface VariantPriceData {
  variant: VariantName;
  source: PriceSource;
  currency: string;
  prices: {
    low?: number;
    mid?: number;
    high?: number;
    market?: number;
    direct_low?: number;
  };
  last_updated: string;
  url?: string;
  
  // Enhanced CardMarket fields
  cardmarket_data?: {
    averageSellPrice?: number;
    germanProLow?: number;
    suggestedPrice?: number;
    reverseHoloSell?: number;
    reverseHoloLow?: number;
    reverseHoloTrend?: number;
    lowPriceExPlus?: number;
    trend?: number;
    trendPrice?: number;
    
    // Historical averages (KEY FEATURE!)
    avg1?: number;   // 1-day average
    avg7?: number;   // 7-day average
    avg30?: number;  // 30-day average
  };
}

export interface CheapestPriceData {
  variant: VariantName;
  price: number;
  currency: string;
  price_type: 'market' | 'mid' | 'low' | 'direct_low';
  source: PriceSource;
  last_updated: string;
}

export interface CardPriceData {
  preferred_source_prices: VariantPriceData[];
  fallback_source_prices: VariantPriceData[];
  cheapest_variant_price: CheapestPriceData | null;
  price_source_used: PriceSource;
  has_fallback: boolean;
  conversion_info?: {
    original_currency: string;
    converted_currency: CurrencyCode;
    exchange_rate: number;
  };
  
  // Historical price trend data
  has_historical_data?: boolean;
  historical_trends?: {
    [variant: string]: {
      avg_1_day?: number;
      avg_7_day?: number;
      avg_30_day?: number;
      trend_direction?: 'up' | 'down' | 'stable';
      trend_percentage?: number;
    };
  };
}

export interface CardWithPrices {
  id: string;
  set_id: string;
  number: string;
  name: string;
  supertype: string | null;
  subtypes: string[];
  hp: string | null;
  types: string[];
  evolves_from: string | null;
  rules: string[];
  regulation_mark: string | null;
  artist: string | null;
  rarity: string | null;
  flavor_text: string | null;
  national_pokedex_numbers: number[];
  legalities: any;
  images: any;
  updated_at: string;
  price_data: CardPriceData;
}