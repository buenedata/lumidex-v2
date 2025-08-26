import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Panel } from '@/components/ui/Panel';
import { Pill, PricePill, RarityPill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { cn, formatCardNumber } from '@/lib/utils';
import type { PriceSource } from '@/components/ui/PriceSourceToggle';

export interface CardTileProps {
  card: {
    id: string;
    name: string;
    number: string;
    rarity?: string;
    types?: string[];
    hp?: number;
    supertype?: string;
    set_id?: string;
    setName?: string;
    images?: {
      small?: string;
      large?: string;
    };
    prices?: {
      cardmarket?: {
        averageSellPrice?: number;
        lowPrice?: number;
        trendPrice?: number;
      };
      tcgplayer?: {
        market?: number;
        low?: number;
        mid?: number;
      };
    };
  };
  priceSource: PriceSource;
  className?: string;
  showQuickActions?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  onAddToCollection?: (card: CardTileProps['card']) => void;
}

export function CardTile({ 
  card, 
  priceSource, 
  className, 
  showQuickActions = false,
  variant = 'default',
  onAddToCollection
}: CardTileProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getPrice = () => {
    if (!card.prices) return null;
    
    if (priceSource === 'cardmarket') {
      return card.prices.cardmarket?.trendPrice || card.prices.cardmarket?.averageSellPrice;
    }
    
    return card.prices.tcgplayer?.market || card.prices.tcgplayer?.mid;
  };

  const price = getPrice();

  return (
    <div 
      className={cn('group relative', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Panel 
        variant="interactive"
        padding="none"
        className="card-interactive h-full overflow-hidden"
      >
        {/* Card Image */}
        <div className="relative aspect-card bg-panel2 overflow-hidden">
          {card.images?.small && !imageError ? (
            <Image
              src={card.images.small}
              alt={card.name}
              fill
              className="object-contain group-hover:scale-105 transition-transform duration-300 p-1"
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-border rounded mx-auto mb-2 flex items-center justify-center">
                  <CardIcon className="w-6 h-6 text-muted" />
                </div>
                <p className="text-xs text-muted">No image</p>
              </div>
            </div>
          )}

          {/* Quick Actions Overlay */}
          {showQuickActions && isHovered && onAddToCollection && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                size="sm"
                variant="primary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddToCollection(card);
                }}
                className="shadow-lg"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-aurora-radial opacity-0 group-hover:opacity-5 transition-opacity duration-200 pointer-events-none" />
        </div>

        {/* Card Info */}
        <div className="p-3 space-y-2">
          {/* Name and Number */}
          <div className="space-y-1">
            <h3 className={cn(
              'font-medium text-text group-hover:text-gradient transition-colors duration-200',
              variant === 'compact' ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'
            )}>
              {card.name}
            </h3>
            
            <div className="flex items-center justify-between text-xs text-muted">
              <span>#{formatCardNumber(card.number)}</span>
              {card.setName && variant === 'detailed' && (
                <span className="truncate ml-2">{card.setName}</span>
              )}
            </div>
          </div>


          {/* Rarity and Price */}
          <div className="flex items-center justify-between pt-1">
            {card.rarity && (
              <RarityPill rarity={card.rarity} size="sm" />
            )}
            
            {price && (
              <PricePill 
                price={price} 
                source={priceSource}
                size="sm"
                className="ml-auto"
              />
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}

export interface CardTileSkeletonProps {
  className?: string;
  variant?: CardTileProps['variant'];
}

export function CardTileSkeleton({ className, variant = 'default' }: CardTileSkeletonProps) {
  return (
    <div className={cn('animate-fade-in', className)}>
      <Panel padding="none" className="h-full overflow-hidden">
        {/* Image Skeleton */}
        <div className="aspect-card skeleton" />
        
        {/* Info Skeleton */}
        <div className="p-3 space-y-2">
          <div className="space-y-1">
            <div className={cn(
              'skeleton rounded',
              variant === 'compact' ? 'h-3 w-20' : 'h-4 w-24'
            )} />
            <div className="flex justify-between">
              <div className="h-3 w-8 skeleton rounded" />
              {variant === 'detailed' && (
                <div className="h-3 w-16 skeleton rounded" />
              )}
            </div>
          </div>
          
          
          <div className="flex justify-between pt-1">
            <div className="h-5 w-12 skeleton rounded-full" />
            <div className="h-5 w-16 skeleton rounded-full" />
          </div>
        </div>
      </Panel>
    </div>
  );
}

export interface CardGridProps {
  cards: CardTileProps['card'][];
  priceSource: PriceSource;
  loading?: boolean;
  className?: string;
  showQuickActions?: boolean;
  variant?: CardTileProps['variant'];
  onAddToCollection?: (card: CardTileProps['card']) => void;
}

export function CardGrid({ 
  cards, 
  priceSource, 
  loading, 
  className, 
  showQuickActions,
  variant,
  onAddToCollection 
}: CardGridProps) {
  if (loading) {
    return (
      <div className={cn('grid-cards', className)}>
        {Array.from({ length: 12 }, (_, i) => (
          <CardTileSkeleton key={i} variant={variant} />
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 text-muted opacity-50">
          <CardIcon />
        </div>
        <h3 className="text-lg font-medium text-text mb-2">No cards found</h3>
        <p className="text-muted mb-6">
          Try adjusting your search criteria or browse all cards
        </p>
        <div className="space-y-2 text-sm text-muted">
          <p>To load cards data, run the ingestion script:</p>
          <code className="bg-panel2 px-2 py-1 rounded font-mono">
            npm run ingest:cards
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('grid-cards', className)}>
      {cards.map((card) => (
        <Link key={card.id} href={`/cards/${card.id}` as any}>
          <CardTile
            card={card}
            priceSource={priceSource}
            showQuickActions={showQuickActions}
            variant={variant}
            onAddToCollection={onAddToCollection}
          />
        </Link>
      ))}
    </div>
  );
}

// Icons
function CardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5} 
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}