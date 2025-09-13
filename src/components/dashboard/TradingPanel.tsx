import React from 'react';
import Link from 'next/link';
import { Panel } from '@/components/ui/Panel';
import { cn, formatCurrency } from '@/lib/utils';

export interface TradingOverview {
  activeTrades: number;
  newMessages: number;
  friendsOnline: number;
  marketplaceHighlights: MarketplaceListing[];
  totalTrades: number;
  successfulTrades: number;
  tradeRating?: number;
}

export interface MarketplaceListing {
  id: string;
  cardName: string;
  price: number;
  currency: string;
  condition: string;
  type: 'buy' | 'sell';
  sellerName?: string;
  timeLeft?: string;
  image?: string;
}

export interface TradingPanelProps {
  data: TradingOverview;
  isAuthenticated: boolean;
  isFeatureEnabled?: boolean;
  className?: string;
}

export function TradingPanel({ 
  data, 
  isAuthenticated, 
  isFeatureEnabled = false,
  className 
}: TradingPanelProps) {
  // Coming soon state
  if (!isFeatureEnabled) {
    return (
      <Panel className={cn('dashboard-widget', className)}>
        <div className="space-y-4">
          <div>
            <h3 className="text-dashboard-title text-text font-semibold">Trading & Community</h3>
            <p className="text-dashboard-caption text-muted mt-1">
              Connect with other collectors
            </p>
          </div>
          
          <div className="space-y-4">
            {/* Coming Soon Banner */}
            <div className="p-4 rounded-lg bg-aurora-radial border border-brand/20">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">🚀</span>
                <span className="text-dashboard-subtitle font-medium text-text">Coming Soon</span>
              </div>
              <p className="text-dashboard-body text-text mb-3">
                Advanced trading and marketplace features are in development
              </p>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
                <span className="text-dashboard-caption text-muted">Expected Q2 2024</span>
              </div>
            </div>
            
            {/* Preview Features */}
            <div className="space-y-3">
              <PreviewFeature
                icon="🤝"
                title="Peer-to-Peer Trading"
                description="Trade cards directly with other collectors"
                status="In Development"
              />
              
              <PreviewFeature
                icon="🏪"
                title="Marketplace"
                description="Buy and sell cards in our integrated marketplace"
                status="Planned"
              />
              
              <PreviewFeature
                icon="👥"
                title="Community Features"
                description="Connect with friends and join collector groups"
                status="Planned"
              />
            </div>
            
            {/* Beta Signup */}
            <div className="pt-3 border-t border-border">
              <p className="text-dashboard-caption text-muted mb-3">
                Be the first to know when trading features launch
              </p>
              <Link href={"/beta-signup" as any} className="btn btn-primary btn-sm w-full">
                Join Beta List
              </Link>
            </div>
          </div>
        </div>
      </Panel>
    );
  }

  // Full trading panel (when feature is enabled)
  return (
    <Panel className={cn('dashboard-widget', className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-dashboard-title text-text font-semibold">Trading & Community</h3>
            <p className="text-dashboard-caption text-muted mt-1">
              Your trading activity and marketplace
            </p>
          </div>
          <Link 
            href={"/trading" as any}
            className="text-dashboard-caption text-brand2 hover:text-brand transition-colors"
          >
            View All
          </Link>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-panel2/50">
            <div className="text-dashboard-value text-brand font-bold">
              {data.activeTrades}
            </div>
            <div className="text-dashboard-caption text-muted">
              Active Trades
            </div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-panel2/50">
            <div className="text-dashboard-value text-success font-bold">
              {data.newMessages}
            </div>
            <div className="text-dashboard-caption text-muted">
              New Messages
            </div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-panel2/50">
            <div className="text-dashboard-value text-accent font-bold">
              {data.friendsOnline}
            </div>
            <div className="text-dashboard-caption text-muted">
              Friends Online
            </div>
          </div>
        </div>
        
        {/* Marketplace Highlights */}
        {data.marketplaceHighlights.length > 0 && (
          <div>
            <h4 className="text-dashboard-subtitle font-medium text-text mb-3">
              🏪 Marketplace Highlights
            </h4>
            <div className="space-y-2">
              {data.marketplaceHighlights.slice(0, 3).map((listing) => (
                <MarketplaceItem key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
        )}
        
        {/* Trading Stats */}
        {isAuthenticated && (
          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between text-dashboard-caption">
              <div className="text-muted">
                Total Trades: <span className="text-text font-medium">{data.totalTrades}</span>
              </div>
              {data.tradeRating && (
                <div className="text-muted">
                  Rating: <span className="text-success font-medium">{data.tradeRating}/5 ⭐</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Link href={"/trading/new" as any} className="btn btn-primary btn-sm">
            Start Trade
          </Link>
          <Link href={"/marketplace" as any} className="btn btn-secondary btn-sm">
            Browse Market
          </Link>
        </div>
      </div>
    </Panel>
  );
}

interface PreviewFeatureProps {
  icon: string;
  title: string;
  description: string;
  status: string;
}

function PreviewFeature({ icon, title, description, status }: PreviewFeatureProps) {
  const statusColor = status === 'In Development' ? 'text-warning' : 'text-muted';
  
  return (
    <div className="flex items-start space-x-3 p-3 rounded-lg bg-panel2/30">
      <div className="text-lg">{icon}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <h5 className="text-dashboard-subtitle font-medium text-text">{title}</h5>
          <span className={cn('text-xs font-medium px-2 py-1 rounded-full bg-panel', statusColor)}>
            {status}
          </span>
        </div>
        <p className="text-dashboard-caption text-muted">{description}</p>
      </div>
    </div>
  );
}

interface MarketplaceItemProps {
  listing: MarketplaceListing;
}

function MarketplaceItem({ listing }: MarketplaceItemProps) {
  const typeColor = listing.type === 'buy' ? 'text-success' : 'text-brand';
  const typeIcon = listing.type === 'buy' ? '🛒' : '💰';
  
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-panel2/30 hover:bg-panel2/50 transition-colors group">
      <div className="flex items-center space-x-3">
        <div className="text-base">{typeIcon}</div>
        <div>
          <h5 className="text-dashboard-body font-medium text-text group-hover:text-gradient transition-colors">
            {listing.cardName}
          </h5>
          <div className="flex items-center space-x-2 text-dashboard-caption text-muted">
            <span>{listing.condition}</span>
            {listing.sellerName && (
              <>
                <span>•</span>
                <span>by {listing.sellerName}</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <div className={cn('text-dashboard-subtitle font-semibold', typeColor)}>
          {formatCurrency(listing.price, listing.currency)}
        </div>
        {listing.timeLeft && (
          <div className="text-dashboard-caption text-muted">
            {listing.timeLeft}
          </div>
        )}
      </div>
    </div>
  );
}

// Mock data for development
export const mockTradingData: TradingOverview = {
  activeTrades: 3,
  newMessages: 2,
  friendsOnline: 5,
  totalTrades: 47,
  successfulTrades: 45,
  tradeRating: 4.8,
  marketplaceHighlights: [
    {
      id: '1',
      cardName: 'Charizard Base Set Holo',
      price: 150.00,
      currency: 'EUR',
      condition: 'Near Mint',
      type: 'sell',
      sellerName: 'CardMaster92',
      timeLeft: '2d left'
    },
    {
      id: '2',
      cardName: 'Complete your Base Set',
      price: 45.99,
      currency: 'EUR',
      condition: 'Mixed',
      type: 'buy',
      sellerName: 'SetCompleter',
      timeLeft: '5h left'
    },
    {
      id: '3',
      cardName: 'Pikachu Illustrator',
      price: 2500.00,
      currency: 'EUR',
      condition: 'PSA 9',
      type: 'sell',
      sellerName: 'RareCards_Pro',
      timeLeft: '1d left'
    }
  ]
};