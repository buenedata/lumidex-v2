'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import type { CardWithPrices, VariantPriceData } from '@/types/pricing';
import type { VariantName } from '@/lib/variants/mapper';
import { getVariantDisplayName } from '@/lib/variants/mapper';

// Color mapping for variants (matching the variant colors but for charts)
const VARIANT_CHART_COLORS: Record<VariantName, string> = {
  'normal': '#eab308', // yellow-500
  'holofoil': '#a855f7', // purple-500
  'reverse_holofoil': '#3b82f6', // blue-500
  'first_edition_normal': '#22c55e', // green-500
  'first_edition_holofoil': '#16a34a', // green-600
  'unlimited': '#6b7280', // gray-500
} as const;

type TimePeriod = '1d' | '7d' | '1m';

interface PriceGraphProps {
  priceData: CardWithPrices['price_data'];
  currency?: string;
}

interface VariantSummary {
  variant: VariantName;
  displayName: string;
  color: string;
  marketPrice?: number;
  lowPrice?: number;
  highPrice?: number;
}

interface HistoricalDataPoint {
  date: string;
  [key: string]: string | number; // variant prices
}

export function PriceGraph({ priceData, currency }: PriceGraphProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1m');

  const timePeriods = [
    { id: '1d', label: '1 Day' },
    { id: '7d', label: '7 Days' },
    { id: '1m', label: '1 Month' },
  ] as const;

  const { variantSummaries, historicalData, hasHistoricalData } = useMemo(() => {
    // Combine preferred and fallback prices, prioritizing preferred
    const allPrices = [
      ...priceData.preferred_source_prices,
      ...priceData.fallback_source_prices.filter(
        fallback => !priceData.preferred_source_prices.some(
          preferred => preferred.variant === fallback.variant
        )
      )
    ];

    // Create variant summaries for the legend/info display
    const summaries: VariantSummary[] = allPrices.map(priceInfo => ({
      variant: priceInfo.variant,
      displayName: getVariantDisplayName(priceInfo.variant),
      color: VARIANT_CHART_COLORS[priceInfo.variant] || '#6b7280',
      marketPrice: priceInfo.prices.market,
      lowPrice: priceInfo.prices.low,
      highPrice: priceInfo.prices.high || priceInfo.prices.mid
    }));

    // Build historical data from CardMarket averages
    const historicalDataPoints: HistoricalDataPoint[] = [];
    let hasData = false;

    // Check if we have historical data available
    const hasHistoricalTrends = priceData.has_historical_data && priceData.historical_trends;
    
    if (hasHistoricalTrends) {
      hasData = true;
      
      // Create data points from CardMarket's historical averages
      const today = new Date();
      const dataPoints: HistoricalDataPoint[] = [];
      
      // Create historical data points based on selected period
      if (selectedPeriod === '1m') {
        // For 1-month view, use CardMarket's avg30, avg7, avg1 + current
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        
        const oneDayAgo = new Date(today);
        oneDayAgo.setDate(today.getDate() - 1);
        
        // Add data points for each variant that has historical data
        Object.entries(priceData.historical_trends || {}).forEach(([variant, trendData]) => {
          if (trendData.avg_30_day) {
            if (!dataPoints.find(dp => dp.date === thirtyDaysAgo.toISOString().split('T')[0])) {
              dataPoints.push({ date: thirtyDaysAgo.toISOString().split('T')[0] });
            }
            const point = dataPoints.find(dp => dp.date === thirtyDaysAgo.toISOString().split('T')[0]);
            if (point) point[variant] = trendData.avg_30_day;
          }
          
          if (trendData.avg_7_day) {
            if (!dataPoints.find(dp => dp.date === sevenDaysAgo.toISOString().split('T')[0])) {
              dataPoints.push({ date: sevenDaysAgo.toISOString().split('T')[0] });
            }
            const point = dataPoints.find(dp => dp.date === sevenDaysAgo.toISOString().split('T')[0]);
            if (point) point[variant] = trendData.avg_7_day;
          }
          
          if (trendData.avg_1_day) {
            if (!dataPoints.find(dp => dp.date === oneDayAgo.toISOString().split('T')[0])) {
              dataPoints.push({ date: oneDayAgo.toISOString().split('T')[0] });
            }
            const point = dataPoints.find(dp => dp.date === oneDayAgo.toISOString().split('T')[0]);
            if (point) point[variant] = trendData.avg_1_day;
          }
          
          // Add current price as latest point
          const currentVariantPrice = allPrices.find(p => p.variant === variant);
          if (currentVariantPrice?.prices.market) {
            if (!dataPoints.find(dp => dp.date === today.toISOString().split('T')[0])) {
              dataPoints.push({ date: today.toISOString().split('T')[0] });
            }
            const point = dataPoints.find(dp => dp.date === today.toISOString().split('T')[0]);
            if (point) point[variant] = currentVariantPrice.prices.market;
          }
        });
        
        // Sort data points by date
        historicalDataPoints.push(...dataPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      }
    }

    return {
      variantSummaries: summaries,
      historicalData: historicalDataPoints,
      hasHistoricalData: hasData
    };
  }, [priceData, selectedPeriod]);

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (selectedPeriod === '1d') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-panel border border-border rounded-lg p-3 shadow-lg">
          <p className="text-text font-medium mb-2">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {getVariantDisplayName(entry.dataKey)}: {formatPrice(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (variantSummaries.length === 0) {
    return (
      <div className="panel p-4">
        <div className="text-center py-6 text-muted">
          <div className="text-4xl mb-2 opacity-50">📊</div>
          <p className="text-sm">No pricing data available for graph</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Variant Information Display */}
      <div className="panel p-4">
        <h3 className="text-lg font-semibold text-text mb-4">Current Prices</h3>
        <div className="grid gap-3">
          {variantSummaries.map(summary => (
            <div key={summary.variant} className="flex items-center justify-between p-3 bg-panel2 rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full border border-white/20"
                  style={{ backgroundColor: summary.color }}
                />
                <span className="font-medium text-text">{summary.displayName}</span>
              </div>
              <div className="flex gap-4 text-sm">
                {summary.marketPrice && (
                  <span className="text-text">
                    Market: <span className="font-medium">{formatPrice(summary.marketPrice)}</span>
                  </span>
                )}
                {summary.lowPrice && (
                  <span className="text-success">
                    Low: <span className="font-medium">{formatPrice(summary.lowPrice)}</span>
                  </span>
                )}
                {summary.highPrice && (
                  <span className="text-warning">
                    High: <span className="font-medium">{formatPrice(summary.highPrice)}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Price Chart */}
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text">Price History</h3>
          
          {/* Time Period Tabs */}
          <div className="flex border border-border rounded-lg overflow-hidden">
            {timePeriods.map((period) => (
              <button
                key={period.id}
                onClick={() => setSelectedPeriod(period.id)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  selectedPeriod === period.id
                    ? 'bg-brand2 text-white'
                    : 'bg-panel2 text-muted hover:text-text hover:bg-panel'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {hasHistoricalData ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                  tickFormatter={formatDate}
                />
                <YAxis
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                  tickFormatter={(value) => formatPrice(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ color: '#9CA3AF' }}
                  formatter={(value) => (
                    <span className="text-text">
                      {getVariantDisplayName(value as VariantName)}
                    </span>
                  )}
                />
                {variantSummaries.map(summary => (
                  <Line
                    key={summary.variant}
                    type="monotone"
                    dataKey={summary.variant}
                    stroke={summary.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, stroke: summary.color, strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center bg-panel2 rounded-lg">
            <div className="text-center">
              <div className="text-4xl mb-4 opacity-50">📈</div>
              <h4 className="text-lg font-medium text-text mb-2">No Historical Data Available</h4>
              <p className="text-sm text-muted max-w-md">
                {priceData.price_source_used === 'cardmarket'
                  ? 'CardMarket historical data (1/7/30-day averages) not available for this card. This may be due to recent card releases or limited trading activity.'
                  : 'Switch to CardMarket pricing to see historical price trends. CardMarket provides 1-day, 7-day, and 30-day price averages for most cards.'
                }
              </p>
              {priceData.price_source_used !== 'cardmarket' && (
                <p className="text-xs text-muted mt-2">
                  Historical data is only available from CardMarket source.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* External Links */}
      <div className="panel p-4">
        <h3 className="text-lg font-semibold text-text mb-4">External Links</h3>
        
        {priceData.preferred_source_prices[0]?.url ? (
          <a
            href={priceData.preferred_source_prices[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-panel2 border border-border rounded-lg hover:bg-panel hover:border-brand2/50 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-text">
              View on {priceData.price_source_used === 'cardmarket' ? 'Cardmarket' : 'TCGPlayer'}
            </span>
            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ) : (
          <div className="text-center py-6 text-muted">
            <p className="text-sm">No external links available</p>
          </div>
        )}
      </div>
    </div>
  );
}