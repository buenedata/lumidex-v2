'use client';

import type { VariantPriceData } from '@/types/pricing';
import { getVariantDisplayName } from '@/lib/variants/mapper';

interface PriceFieldProps {
  label: string;
  value?: number;
  currency: string;
  className?: string;
}

function PriceField({ label, value, currency, className = "" }: PriceFieldProps) {
  if (!value) return null;
  
  const formatPrice = (price: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price);
    } catch {
      return `${price.toFixed(2)} ${currency || 'EUR'}`;
    }
  };

  return (
    <div className={`flex justify-between text-sm ${className}`}>
      <span className="text-muted">{label}:</span>
      <span className="font-medium text-text">{formatPrice(value)}</span>
    </div>
  );
}

interface TrendFieldProps {
  label: string;
  value?: number;
  current?: number;
  currency: string;
}

function TrendField({ label, value, current, currency }: TrendFieldProps) {
  if (!value) return null;
  
  const formatPrice = (price: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price);
    } catch {
      return `${price.toFixed(2)} ${currency || 'EUR'}`;
    }
  };

  // Calculate trend direction and percentage
  let trendIndicator = '';
  let trendClass = 'text-muted';
  
  if (current && value) {
    const change = ((current - value) / value) * 100;
    if (Math.abs(change) > 1) { // Show trend for >1% change
      const percentage = Math.abs(change).toFixed(1);
      if (change > 0) {
        trendIndicator = ` (↑${percentage}%)`;
        trendClass = 'text-success';
      } else {
        trendIndicator = ` (↓${percentage}%)`;
        trendClass = 'text-warning';
      }
    }
  }

  return (
    <div className="text-center p-2 bg-panel rounded">
      <div className="text-xs text-muted mb-1">{label} Avg</div>
      <div className={`text-sm font-medium ${trendClass}`}>
        {formatPrice(value)}
        {trendIndicator}
      </div>
    </div>
  );
}

interface CardMarketPriceDisplayProps {
  priceData: VariantPriceData;
  currency: string;
}

export function CardMarketPriceDisplay({ priceData, currency }: CardMarketPriceDisplayProps) {
  const { cardmarket_data } = priceData;
  
  if (!cardmarket_data) {
    return (
      <div className="bg-panel2 rounded-lg p-4">
        <h4 className="font-semibold mb-3">
          CardMarket - {getVariantDisplayName(priceData.variant)}
        </h4>
        <div className="text-sm text-muted">Basic pricing data only</div>
      </div>
    );
  }

  return (
    <div className="bg-panel2 rounded-lg p-4 space-y-4">
      <h4 className="font-semibold mb-3">
        CardMarket - {getVariantDisplayName(priceData.variant)}
      </h4>
      
      {/* Current Prices */}
      <div>
        <h5 className="font-medium text-sm mb-2">Current Prices</h5>
        <div className="space-y-1">
          <PriceField label="Market" value={priceData.prices.market} currency={currency} />
          <PriceField label="Low" value={priceData.prices.low} currency={currency} />
          <PriceField label="Mid" value={priceData.prices.mid} currency={currency} />
          <PriceField label="High" value={priceData.prices.high} currency={currency} />
          <PriceField 
            label="Average Sell" 
            value={cardmarket_data.averageSellPrice} 
            currency={currency} 
          />
          <PriceField 
            label="Suggested" 
            value={cardmarket_data.suggestedPrice} 
            currency={currency} 
          />
        </div>
      </div>
      
      {/* Historical Trends */}
      {(cardmarket_data.avg1 || cardmarket_data.avg7 || cardmarket_data.avg30) && (
        <div>
          <h5 className="font-medium text-sm mb-3">Price History</h5>
          <div className="grid grid-cols-3 gap-2">
            <TrendField 
              label="1 Day" 
              value={cardmarket_data.avg1} 
              current={priceData.prices.market} 
              currency={currency} 
            />
            <TrendField 
              label="7 Day" 
              value={cardmarket_data.avg7} 
              current={priceData.prices.market} 
              currency={currency} 
            />
            <TrendField 
              label="30 Day" 
              value={cardmarket_data.avg30} 
              current={priceData.prices.market} 
              currency={currency} 
            />
          </div>
        </div>
      )}
      
      {/* Extended Pricing (if available) */}
      {(cardmarket_data.germanProLow || cardmarket_data.trend || cardmarket_data.trendPrice) && (
        <div>
          <h5 className="font-medium text-sm mb-2">Extended Data</h5>
          <div className="space-y-1">
            <PriceField 
              label="German Pro Low" 
              value={cardmarket_data.germanProLow} 
              currency={currency} 
            />
            <PriceField 
              label="Trend Price" 
              value={cardmarket_data.trendPrice} 
              currency={currency} 
            />
            {cardmarket_data.trend && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Trend:</span>
                <span className={`font-medium ${
                  cardmarket_data.trend > 0 ? 'text-success' : 
                  cardmarket_data.trend < 0 ? 'text-warning' : 'text-text'
                }`}>
                  {cardmarket_data.trend > 0 ? '↗' : cardmarket_data.trend < 0 ? '↘' : '→'} 
                  {Math.abs(cardmarket_data.trend).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Reverse Holo Data (if available) */}
      {(cardmarket_data.reverseHoloSell || cardmarket_data.reverseHoloLow) && (
        <div>
          <h5 className="font-medium text-sm mb-2">Reverse Holo</h5>
          <div className="space-y-1">
            <PriceField 
              label="Reverse Holo Sell" 
              value={cardmarket_data.reverseHoloSell} 
              currency={currency} 
            />
            <PriceField 
              label="Reverse Holo Low" 
              value={cardmarket_data.reverseHoloLow} 
              currency={currency} 
            />
          </div>
        </div>
      )}
      
      {/* Last Updated */}
      <div className="text-xs text-muted pt-2 border-t border-border">
        Last updated: {new Date(priceData.last_updated).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric'
        })}
      </div>
    </div>
  );
}