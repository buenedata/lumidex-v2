import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Panel } from '@/components/ui/Panel';
import { cn, formatCurrency } from '@/lib/utils';

export interface HighlightCard {
  id: string;
  name: string;
  set: string;
  image: string;
  value: number;
  currency: string;
  type: 'most_valuable' | 'recent_addition' | 'price_gainer' | 'rare_find';
  rarity?: string;
  condition?: string;
  priceChange?: number;
  addedAt?: Date;
  href?: string;
}

export interface CollectionHighlightsProps {
  highlights: HighlightCard[];
  showImages?: boolean;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function CollectionHighlights({ 
  highlights, 
  showImages = true, 
  columns = 2,
  className 
}: CollectionHighlightsProps) {
  if (highlights.length === 0) {
    return (
      <Panel className={cn('dashboard-widget', className)}>
        <div className="space-y-4">
          <div>
            <h3 className="text-dashboard-title text-text font-semibold">Collection Highlights</h3>
            <p className="text-dashboard-caption text-muted mt-1">
              Your most notable cards
            </p>
          </div>
          
          <div className="empty-state py-8">
            <div className="empty-state-icon">
              <CardIcon />
            </div>
            <h4 className="text-lg font-medium text-text mb-2">No cards yet</h4>
            <p className="text-muted mb-4">
              Add cards to your collection to see highlights here
            </p>
            <Link href={"/cards" as any} className="btn btn-primary btn-sm">
              Browse Cards
            </Link>
          </div>
        </div>
      </Panel>
    );
  }

  const gridClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-3', 
    4: 'grid-cols-2 md:grid-cols-4'
  };

  return (
    <Panel className={cn('dashboard-widget', className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-dashboard-title text-text font-semibold">Collection Highlights</h3>
            <p className="text-dashboard-caption text-muted mt-1">
              Your most notable cards
            </p>
          </div>
          <Link 
            href={"/collection" as any}
            className="text-dashboard-caption text-brand2 hover:text-brand transition-colors"
          >
            View Collection
          </Link>
        </div>
        
        <div className={cn('grid gap-4', gridClasses[columns])}>
          {highlights.map((card) => (
            <HighlightCardItem 
              key={card.id} 
              card={card} 
              showImage={showImages}
            />
          ))}
        </div>
      </div>
    </Panel>
  );
}

interface HighlightCardItemProps {
  card: HighlightCard;
  showImage?: boolean;
}

function HighlightCardItem({ card, showImage = true }: HighlightCardItemProps) {
  const typeStyle = getTypeStyle(card.type);
  const rarityColor = getRarityColor(card.rarity);

  const content = (
    <div className={cn(
      'relative group rounded-lg border border-border bg-panel2/50 overflow-hidden',
      'hover:border-brand2/50 hover:shadow-lg transition-all duration-200',
      'hover:transform hover:-translate-y-1'
    )}>
      {/* Card Image */}
      {showImage && (
        <div className="aspect-card relative overflow-hidden bg-panel">
          {card.image ? (
            <Image
              src={card.image}
              alt={`${card.name} from ${card.set}`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-muted">
              🎴
            </div>
          )}
          
          {/* Type Badge */}
          <div className={cn(
            'absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium',
            typeStyle.background,
            typeStyle.text
          )}>
            {getTypeLabel(card.type)}
          </div>
          
          {/* Price Change Badge */}
          {card.priceChange && (
            <div className={cn(
              'absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium',
              card.priceChange > 0 
                ? 'bg-success/20 text-success' 
                : 'bg-danger/20 text-danger'
            )}>
              {card.priceChange > 0 ? '+' : ''}{card.priceChange}%
            </div>
          )}
        </div>
      )}
      
      {/* Card Info */}
      <div className="p-3 space-y-2">
        <div>
          <h4 className="font-medium text-text group-hover:text-gradient transition-colors line-clamp-1">
            {card.name}
          </h4>
          <p className="text-dashboard-caption text-muted line-clamp-1">
            {card.set}
          </p>
        </div>
        
        {/* Rarity and Condition */}
        {(card.rarity || card.condition) && (
          <div className="flex items-center space-x-2 text-xs">
            {card.rarity && (
              <span className={cn(
                'px-2 py-1 rounded-full font-medium',
                rarityColor.background,
                rarityColor.text
              )}>
                {card.rarity}
              </span>
            )}
            {card.condition && (
              <span className="px-2 py-1 rounded-full bg-panel text-muted border border-border">
                {card.condition}
              </span>
            )}
          </div>
        )}
        
        {/* Value */}
        <div className="flex items-center justify-between">
          <span className="text-dashboard-subtitle font-semibold text-text">
            {formatCurrency(card.value, card.currency)}
          </span>
          
          {card.addedAt && (
            <span className="text-dashboard-caption text-muted">
              Added {formatTimeAgo(card.addedAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (card.href) {
    return (
      <Link href={card.href as any}>
        {content}
      </Link>
    );
  }

  return content;
}

function getTypeStyle(type: HighlightCard['type']) {
  const styles = {
    most_valuable: {
      background: 'bg-warning/20',
      text: 'text-warning'
    },
    recent_addition: {
      background: 'bg-brand/20',
      text: 'text-brand'
    },
    price_gainer: {
      background: 'bg-success/20',
      text: 'text-success'
    },
    rare_find: {
      background: 'bg-brand2/20',
      text: 'text-brand2'
    }
  };
  
  return styles[type] || styles.most_valuable;
}

function getTypeLabel(type: HighlightCard['type']): string {
  const labels = {
    most_valuable: 'Most Valuable',
    recent_addition: 'New',
    price_gainer: 'Rising',
    rare_find: 'Rare'
  };
  
  return labels[type] || 'Highlight';
}

function getRarityColor(rarity?: string) {
  if (!rarity) return { background: 'bg-panel', text: 'text-muted' };
  
  const rarityLower = rarity.toLowerCase();
  
  if (rarityLower.includes('common')) {
    return { background: 'bg-muted/20', text: 'text-muted' };
  } else if (rarityLower.includes('uncommon')) {
    return { background: 'bg-success/20', text: 'text-success' };
  } else if (rarityLower.includes('rare') || rarityLower.includes('holo')) {
    return { background: 'bg-brand/20', text: 'text-brand' };
  } else if (rarityLower.includes('ultra') || rarityLower.includes('secret')) {
    return { background: 'bg-brand2/20', text: 'text-brand2' };
  }
  
  return { background: 'bg-accent/20', text: 'text-accent' };
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return 'today';
  } else if (diffInDays === 1) {
    return 'yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  }
}

// Mock data for development
export const mockCollectionHighlights: HighlightCard[] = [
  {
    id: '1',
    name: 'Charizard',
    set: 'Base Set Unlimited',
    image: 'https://images.pokemontcg.io/base1/4_hires.png',
    value: 234.50,
    currency: 'EUR',
    type: 'most_valuable',
    rarity: 'Rare Holo',
    condition: 'Near Mint',
    href: '/collection/cards/charizard-base-set'
  },
  {
    id: '2',
    name: 'Pikachu Promo',
    set: 'XY Black Star Promos',
    image: 'https://images.pokemontcg.io/xyp/XY95_hires.png',
    value: 12.30,
    currency: 'EUR',
    type: 'recent_addition',
    rarity: 'Promo',
    condition: 'Mint',
    addedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    href: '/collection/cards/pikachu-promo'
  },
  {
    id: '3',
    name: 'Blastoise',
    set: 'Base Set Unlimited',
    image: 'https://images.pokemontcg.io/base1/2_hires.png',
    value: 89.99,
    currency: 'EUR',
    type: 'price_gainer',
    rarity: 'Rare Holo',
    condition: 'Lightly Played',
    priceChange: 15,
    href: '/collection/cards/blastoise-base-set'
  },
  {
    id: '4',
    name: 'Shadowless Alakazam',
    set: 'Base Set Shadowless',
    image: 'https://images.pokemontcg.io/base1/1_hires.png',
    value: 156.00,
    currency: 'EUR',
    type: 'rare_find',
    rarity: 'Rare Holo',
    condition: 'Near Mint',
    href: '/collection/cards/alakazam-shadowless'
  }
];

function CardIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}