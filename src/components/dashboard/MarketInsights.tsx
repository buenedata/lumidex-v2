import React from 'react';
import Link from 'next/link';
import { Panel } from '@/components/ui/Panel';
import { cn, formatCurrency } from '@/lib/utils';

export interface MarketTrend {
  cardName: string;
  set: string;
  changePercentage: number;
  changeDirection: 'up' | 'down' | 'stable';
  currentPrice: number;
  previousPrice: number;
  currency: string;
  category: 'trending_up' | 'price_drops' | 'rare_finds' | 'watchlist';
  timeframe: '24h' | '7d' | '30d';
  volume?: number;
  image?: string;
}

export interface PriceAlert {
  id: string;
  cardName: string;
  targetPrice: number;
  currentPrice: number;
  currency: string;
  isTriggered: boolean;
  createdAt: Date;
}

export interface MarketInsightsProps {
  trends: MarketTrend[];
  priceAlerts?: PriceAlert[];
  showAlerts?: boolean;
  maxItems?: number;
  className?: string;
}

export function MarketInsights({ 
  trends, 
  priceAlerts = [],
  showAlerts = true, 
  maxItems = 6,
  className 
}: MarketInsightsProps) {
  const trendingUp = trends.filter(t => t.category === 'trending_up').slice(0, 3);
  const priceDrops = trends.filter(t => t.category === 'price_drops').slice(0, 3);
  const triggeredAlerts = priceAlerts.filter(alert => alert.isTriggered);

  if (trends.length === 0) {
    return (
      <Panel className={cn('dashboard-widget', className)}>
        <div className="space-y-4">
          <div>
            <h3 className="text-dashboard-title text-text font-semibold">Market Insights</h3>
            <p className="text-dashboard-caption text-muted mt-1">
              Track price trends and market data
            </p>
          </div>
          
          <div className="empty-state py-8">
            <div className="empty-state-icon">
              <TrendingIcon />
            </div>
            <h4 className="text-lg font-medium text-text mb-2">No market data</h4>
            <p className="text-muted mb-4">
              Market insights will appear here when data is available
            </p>
            <Link href={"/market" as any} className="btn btn-primary btn-sm">
              Explore Market
            </Link>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel className={cn('dashboard-widget', className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-dashboard-title text-text font-semibold">Market Insights</h3>
            <p className="text-dashboard-caption text-muted mt-1">
              Price trends and market analysis
            </p>
          </div>
          <Link 
            href={"/market" as any}
            className="text-dashboard-caption text-brand2 hover:text-brand transition-colors"
          >
            Full Analysis
          </Link>
        </div>
        
        {/* Price Alerts */}
        {showAlerts && triggeredAlerts.length > 0 && (
          <div className="p-3 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-success">🔔 Price Alerts Triggered</span>
            </div>
            <div className="space-y-1">
              {triggeredAlerts.slice(0, 2).map((alert) => (
                <div key={alert.id} className="text-dashboard-body text-text">
                  <strong>{alert.cardName}</strong> reached your target of{' '}
                  {formatCurrency(alert.targetPrice, alert.currency)}
                </div>
              ))}
              {triggeredAlerts.length > 2 && (
                <div className="text-dashboard-caption text-muted">
                  +{triggeredAlerts.length - 2} more alerts
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Trending Up */}
        {trendingUp.length > 0 && (
          <div>
            <h4 className="text-dashboard-subtitle font-medium text-text mb-3 flex items-center">
              <span className="text-success mr-2">📈</span>
              Trending Up
            </h4>
            <div className="space-y-2">
              {trendingUp.map((trend, index) => (
                <TrendItem key={index} trend={trend} />
              ))}
            </div>
          </div>
        )}
        
        {/* Price Drops */}
        {priceDrops.length > 0 && (
          <div>
            <h4 className="text-dashboard-subtitle font-medium text-text mb-3 flex items-center">
              <span className="text-danger mr-2">📉</span>
              Price Drops
            </h4>
            <div className="space-y-2">
              {priceDrops.map((trend, index) => (
                <TrendItem key={index} trend={trend} />
              ))}
            </div>
          </div>
        )}
        
        {/* Quick Actions */}
        <div className="pt-3 border-t border-border">
          <div className="grid grid-cols-2 gap-3">
            <Link href={"/market/alerts" as any} className="btn btn-secondary btn-sm">
              Manage Alerts
            </Link>
            <Link href={"/market/trends" as any} className="btn btn-secondary btn-sm">
              View Trends
            </Link>
          </div>
        </div>
      </div>
    </Panel>
  );
}

interface TrendItemProps {
  trend: MarketTrend;
}

function TrendItem({ trend }: TrendItemProps) {
  const isPositive = trend.changeDirection === 'up';
  const changeColor = isPositive ? 'text-success' : trend.changeDirection === 'down' ? 'text-danger' : 'text-muted';
  const changeIcon = isPositive ? '↗' : trend.changeDirection === 'down' ? '↘' : '→';
  
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-panel2/30 hover:bg-panel2/50 transition-colors group">
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-dashboard-body font-medium text-text group-hover:text-gradient transition-colors">
              {trend.cardName}
            </h5>
            <div className="flex items-center space-x-2 text-dashboard-caption text-muted">
              <span>{trend.set}</span>
              <span>•</span>
              <span>{trend.timeframe}</span>
              {trend.volume && (
                <>
                  <span>•</span>
                  <span>{trend.volume} sales</span>
                </>
              )}
            </div>
          </div>
          
          <div className="text-right ml-3">
            <div className="text-dashboard-subtitle font-semibold text-text">
              {formatCurrency(trend.currentPrice, trend.currency)}
            </div>
            <div className={cn('text-dashboard-caption font-medium flex items-center', changeColor)}>
              <span className="mr-1">{changeIcon}</span>
              {Math.abs(trend.changePercentage)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Market Summary Component
export interface MarketSummaryProps {
  totalMarketValue: number;
  dailyChange: number;
  currency: string;
  topGainers: MarketTrend[];
  topLosers: MarketTrend[];
  className?: string;
}

export function MarketSummary({ 
  totalMarketValue, 
  dailyChange, 
  currency,
  topGainers,
  topLosers,
  className 
}: MarketSummaryProps) {
  const isPositiveChange = dailyChange >= 0;
  
  return (
    <Panel className={cn('dashboard-widget', className)}>
      <div className="space-y-4">
        <div>
          <h3 className="text-dashboard-title text-text font-semibold">Market Summary</h3>
          <p className="text-dashboard-caption text-muted mt-1">
            Overall market performance
          </p>
        </div>
        
        {/* Market Overview */}
        <div className="text-center p-4 rounded-lg bg-panel2/50">
          <div className="text-2xl font-bold text-text mb-1">
            {formatCurrency(totalMarketValue, currency)}
          </div>
          <div className="text-dashboard-caption text-muted mb-2">
            Total Market Value
          </div>
          <div className={cn(
            'text-dashboard-body font-medium flex items-center justify-center',
            isPositiveChange ? 'text-success' : 'text-danger'
          )}>
            <span className="mr-1">
              {isPositiveChange ? '↗' : '↘'}
            </span>
            {isPositiveChange ? '+' : ''}{dailyChange}% today
          </div>
        </div>
        
        {/* Top Movers */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-dashboard-subtitle font-medium text-success mb-2">
              Top Gainers
            </h4>
            <div className="space-y-1">
              {topGainers.slice(0, 3).map((trend, index) => (
                <div key={index} className="flex justify-between text-dashboard-caption">
                  <span className="text-text truncate mr-2">{trend.cardName}</span>
                  <span className="text-success">+{trend.changePercentage}%</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-dashboard-subtitle font-medium text-danger mb-2">
              Top Losers
            </h4>
            <div className="space-y-1">
              {topLosers.slice(0, 3).map((trend, index) => (
                <div key={index} className="flex justify-between text-dashboard-caption">
                  <span className="text-text truncate mr-2">{trend.cardName}</span>
                  <span className="text-danger">{trend.changePercentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

// Mock data for development
export const mockMarketTrends: MarketTrend[] = [
  {
    cardName: 'Charizard Base Set Holo',
    set: 'Base Set',
    changePercentage: 12.5,
    changeDirection: 'up',
    currentPrice: 234.50,
    previousPrice: 208.44,
    currency: 'EUR',
    category: 'trending_up',
    timeframe: '24h',
    volume: 23
  },
  {
    cardName: 'Blastoise Base Set Holo',
    set: 'Base Set',
    changePercentage: 8.3,
    changeDirection: 'up',
    currentPrice: 89.99,
    previousPrice: 83.12,
    currency: 'EUR',
    category: 'trending_up',
    timeframe: '7d',
    volume: 15
  },
  {
    cardName: 'Venusaur Base Set Holo',
    set: 'Base Set',
    changePercentage: 15.2,
    changeDirection: 'up',
    currentPrice: 67.89,
    previousPrice: 58.93,
    currency: 'EUR',
    category: 'trending_up',
    timeframe: '24h',
    volume: 31
  },
  {
    cardName: 'Pikachu Yellow Cheeks',
    set: 'Base Set',
    changePercentage: -5.4,
    changeDirection: 'down',
    currentPrice: 12.30,
    previousPrice: 13.01,
    currency: 'EUR',
    category: 'price_drops',
    timeframe: '7d',
    volume: 8
  },
  {
    cardName: 'Modern Set Cards',
    set: 'Various',
    changePercentage: -3.2,
    changeDirection: 'down',
    currentPrice: 25.67,
    previousPrice: 26.51,
    currency: 'EUR',
    category: 'price_drops',
    timeframe: '30d',
    volume: 156
  }
];

export const mockPriceAlerts: PriceAlert[] = [
  {
    id: '1',
    cardName: 'Charizard Base Set Holo',
    targetPrice: 200.00,
    currentPrice: 234.50,
    currency: 'EUR',
    isTriggered: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    id: '2',
    cardName: 'Pikachu Illustrator',
    targetPrice: 2000.00,
    currentPrice: 1845.30,
    currency: 'EUR',
    isTriggered: false,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  }
];

function TrendingIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}