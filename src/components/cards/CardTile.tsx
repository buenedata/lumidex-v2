import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Panel } from '@/components/ui/Panel';
import { Pill, PricePill, RarityPill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { cn, formatCardNumber } from '@/lib/utils';
import type { PriceSource } from '@/components/ui/PriceSourceToggle';
import type { CurrencyCode } from '@/types';
import type { CardWithPrices } from '@/types/pricing';
import { VariantQuantityButtonGroup } from '@/components/variants/VariantQuantityButtons';

export interface CardTileProps {
  card: CardWithPrices | {
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
    // Legacy price structure for backward compatibility
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
    // New price structure
    price_data?: CardWithPrices['price_data'];
  };
  priceSource?: PriceSource;
  userCurrency?: CurrencyCode;
  className?: string;
  showQuickActions?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  onAddToCollection?: (card: CardTileProps['card']) => void;
}

export function CardTile({
  card,
  priceSource = 'cardmarket',
  userCurrency,
  className,
  showQuickActions = false,
  variant = 'default',
  onAddToCollection
}: CardTileProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getPriceData = () => {
    // Use new price_data structure if available
    if ('price_data' in card && card.price_data?.cheapest_variant_price) {
      return {
        price: card.price_data.cheapest_variant_price.price,
        currency: card.price_data.cheapest_variant_price.currency,
        source: card.price_data.price_source_used,
        variant: card.price_data.cheapest_variant_price.variant,
        hasFallback: card.price_data.has_fallback
      };
    }
    
    // Fall back to legacy prices structure
    if ('prices' in card && card.prices) {
      let price: number | undefined;
      let currency: string;
      
      if (priceSource === 'cardmarket') {
        price = card.prices.cardmarket?.trendPrice || card.prices.cardmarket?.averageSellPrice;
        currency = 'EUR'; // Cardmarket prices are in EUR
      } else {
        price = card.prices.tcgplayer?.market || card.prices.tcgplayer?.mid;
        currency = 'USD'; // TCGPlayer prices are in USD
      }
      
      return price ? { price, currency, source: priceSource, variant: 'normal', hasFallback: false } : null;
    }
    
    return null;
  };

  const priceData = getPriceData();

  // Get primary type for holographic effect
  const primaryType = card.types?.[0]?.toLowerCase().replace(/\s+/g, '-') || 'normal';

  return (
    <div
      className={cn('group relative', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Panel
        variant="interactive"
        padding="none"
        className={cn('holographic-card-tile h-full relative', `type-${primaryType}`)}
      >
        {/* Card Image */}
        <div className="card-image-container relative aspect-card bg-panel2">
          {card.images?.small && !imageError ? (
            <Image
              src={card.images.small}
              alt={card.name}
              fill
              className="card-image object-contain p-1"
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
          {showQuickActions && onAddToCollection && (
            <div className="card-quick-actions absolute inset-0 bg-black/25 flex items-center justify-center backdrop-blur-sm">
              <Button
                size="sm"
                variant="primary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddToCollection(card);
                }}
                className="shadow-xl transform hover:scale-105 transition-transform duration-200"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="card-gradient-overlay absolute inset-0 bg-aurora-radial opacity-0 group-hover:opacity-10 pointer-events-none" />
        </div>

        {/* Card Info */}
        <div className="p-3 space-y-2 relative z-1">
          {/* Name and Number */}
          <div className="space-y-1">
            <h3 className={cn(
              'card-text-animated font-medium text-text group-hover:text-gradient',
              variant === 'compact' ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'
            )}>
              {card.name}
            </h3>
            
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="card-text-animated group-hover:text-text">#{formatCardNumber(card.number)}</span>
              {('setName' in card ? card.setName : undefined) && variant === 'detailed' && (
                <span className="card-text-animated truncate ml-2 group-hover:text-text">{'setName' in card ? card.setName : ''}</span>
              )}
            </div>
          </div>

          {/* Rarity and Price */}
          <div className="flex items-center justify-between pt-1">
            {card.rarity && (
              <RarityPill rarity={card.rarity} size="sm" className="card-pill-animated" />
            )}
            
            {priceData && (
              <PricePill
                price={priceData.price}
                currency={priceData.currency}
                userCurrency={userCurrency}
                source={priceData.source}
                size="sm"
                className="card-pill-animated ml-auto"
                enableConversion={true}
                title={`From ${priceData.variant} variant${priceData.hasFallback ? ` (${priceData.source} source)` : ''}`}
              />
            )}
          </div>

          {/* Variant Quantity Buttons */}
          <VariantQuantityButtonGroup
            card={{
              set_id: card.id,
              set_name: card.name,
              number: card.number,
              rarity: card.rarity || 'Common',
              sets: {
                set_id: card.set_id || '',
                set_series: ('setName' in card ? card.setName : undefined) || 'Unknown',
                releaseDate: '2023/01/01'
              }
            }}
            disabled={false}
            className="pt-1"
          />
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
  userCurrency?: CurrencyCode;
  loading?: boolean;
  className?: string;
  showQuickActions?: boolean;
  variant?: CardTileProps['variant'];
  onAddToCollection?: (card: CardTileProps['card']) => void;
}

export function CardGrid({
  cards,
  priceSource,
  userCurrency,
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
            userCurrency={userCurrency}
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