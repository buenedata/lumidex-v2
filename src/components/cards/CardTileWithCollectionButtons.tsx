'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { Panel } from '@/components/ui/Panel';
import { Pill, PricePill, RarityPill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { cn, formatCardNumber } from '@/lib/utils';
import { VariantQuantityButtonGroup } from '@/components/variants/VariantQuantityButtons';
import type { VariantEngineInput } from '@/types/variants';
import type { PriceSource } from '@/components/ui/PriceSourceToggle';
import type { CurrencyCode } from '@/types';
import type { CardWithPrices } from '@/types/pricing';

export interface CardCompletionStatus {
  isCompleted: boolean;
  isMasterSetMode: boolean;
  hasAnyVariant: boolean;
  hasAllVariants: boolean;
}

export interface CardTileWithCollectionButtonsProps {
  card: CardWithPrices | {
    id: string;
    name: string;
    number: string;
    rarity?: string;
    types?: string[];
    hp?: number;
    supertype?: string;
    set_id?: string;
    setId?: string; // Support both naming conventions
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
    // Collection-specific fields
    variants?: any[];
    userQuantities?: Record<string, number>;
    totalOwned?: number;
    totalValue?: number;
  };
  priceSource?: PriceSource;
  userCurrency?: CurrencyCode;
  className?: string;
  showQuickActions?: boolean;
  variant?: 'default' | 'compact' | 'detailed' | 'list';
  disabled?: boolean;
  onAddToCollection?: (card: CardTileWithCollectionButtonsProps['card']) => void;
  onClick?: (cardId: string) => void;
  onRefresh?: () => void; // For collection updates
  variantData?: any; // Pre-fetched variant data from bulk API call
  variantsLoading?: boolean; // Loading state for variants
  completionStatus?: CardCompletionStatus; // Completion status for visual indicators
}

export function CardTileWithCollectionButtons({
  card,
  priceSource = 'cardmarket',
  userCurrency,
  className,
  showQuickActions = false,
  variant = 'default',
  disabled = false,
  onAddToCollection,
  onClick,
  onRefresh,
  variantData,
  variantsLoading = false,
  completionStatus
}: CardTileWithCollectionButtonsProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(false);

  const getPriceData = useCallback(() => {
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
  }, [card, priceSource]);

  const priceData = getPriceData();

  // Convert card to VariantEngineInput format for the cached variant system
  const cardInput: VariantEngineInput = {
    card: {
      set_id: card.id,  // Card ID (e.g., "swsh4-082")
      set_name: card.name,
      number: card.number,
      rarity: card.rarity || 'Unknown',
      sets: {
        set_id: card.set_id || ('setId' in card ? card.setId : '') || '',  // Set ID (e.g., "swsh4") - support both naming conventions
        set_series: ('setName' in card ? card.setName : undefined) || 'Unknown',
        releaseDate: '2023/01/01'   // Default modern date
      },
      tcgplayer: ('prices' in card && card.prices?.tcgplayer) ? {
        cardmarket_prices: (() => {
          const prices: Record<string, any> = {};
          if ('prices' in card && card.prices?.tcgplayer) {
            const tcg = card.prices.tcgplayer;
            if (tcg.market || tcg.mid || tcg.low) {
              prices.normal = {
                market: tcg.market,
                low: tcg.low,
                mid: tcg.mid
              };
            }
          }
          return prices;
        })()
      } : undefined
    }
  };

  // For collection items, we already have the variant data with user quantities
  // Use the pre-existing variant data if available, otherwise fall back to API calls
  const collectionVariantData = ('variants' in card && card.variants) ? {
    variants: card.variants
  } : variantData;

  // Get primary type for holographic effect, handle trainer/item cards
  const getCardTypeClass = () => {
    if (card.supertype?.toLowerCase() === 'trainer' || card.supertype?.toLowerCase() === 'item') {
      return 'type-trainer';
    }
    return `type-${card.types?.[0]?.toLowerCase().replace(/\s+/g, '-') || 'colorless'}`;
  };

  // Render list view
  if (variant === 'list') {
    return (
      <div className="p-4 hover:bg-panel2 transition-colors">
        <div className="flex items-center gap-4">
          {/* Card Image - Clickable */}
          <div
            className="w-16 h-24 bg-panel2 rounded overflow-hidden flex-shrink-0 cursor-pointer"
            onClick={onClick && !disabled ? () => onClick(card.id) : undefined}
          >
            {card.images?.small && !imageError ? (
              <Image
                src={card.images.small}
                alt={card.name}
                width={64}
                height={96}
                className="object-contain w-full h-full"
                onError={() => setImageError(true)}
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <CardIcon className="w-6 h-6 text-muted" />
              </div>
            )}
          </div>

          {/* Card Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-text">{card.name}</h3>
                <div className="text-sm text-muted flex items-center gap-4 mt-1">
                  <span>#{formatCardNumber(card.number)}</span>
                  {'setName' in card && card.setName && <span>{card.setName}</span>}
                  {card.rarity && <span>{card.rarity}</span>}
                  {'totalOwned' in card && card.totalOwned !== undefined && (
                    <span>{card.totalOwned} owned</span>
                  )}
                </div>
              </div>

              {/* Total quantity display for collection items */}
              {'totalOwned' in card && card.totalOwned !== undefined && (
                <div className="ml-4 flex items-center gap-2">
                  <div className="bg-brand text-white text-sm font-bold px-3 py-1 rounded-full">
                    {card.totalOwned}
                  </div>
                  <span className="text-xs text-muted">owned</span>
                </div>
              )}
            </div>

            {/* Variant Controls - Stop propagation to prevent modal opening */}
            <div onClick={(e) => e.stopPropagation()}>
              <VariantQuantityButtonGroup
                card={cardInput.card}
                disabled={disabled}
                className="mt-3"
                onCollectionChange={onRefresh}
                variantData={collectionVariantData}
                variantsLoading={variantsLoading}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Render grid view (default)
  return (
    <div
      className={cn('group relative', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Panel
        variant="interactive"
        padding="none"
        className={cn(
          'holographic-card-tile h-full transition-all duration-200 cursor-pointer',
          getCardTypeClass(),
          {
            'opacity-50': disabled,
            'cursor-not-allowed': disabled,
            'card-completed': completionStatus?.isCompleted
          }
        )}
        onClick={onClick && !disabled ? () => onClick(card.id) : undefined}
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
                disabled={disabled}
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          )}

          {/* Completion Badge */}
          {completionStatus?.isCompleted && (
            <div
              className={cn('completion-badge visible')}
              aria-label={`Card completed in ${completionStatus.isMasterSetMode ? 'master set' : 'normal set'} mode`}
              role="status"
            />
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
          <div onClick={(e) => e.stopPropagation()}>
            <VariantQuantityButtonGroup
              card={cardInput.card}
              disabled={disabled}
              className="pt-1"
              onCollectionChange={onRefresh}
              variantData={collectionVariantData}
              variantsLoading={variantsLoading}
            />
          </div>
        </div>
      </Panel>
    </div>
  );
}

export interface CardTileWithCollectionButtonsSkeletonProps {
  className?: string;
  variant?: CardTileWithCollectionButtonsProps['variant'];
}

export function CardTileWithCollectionButtonsSkeleton({ 
  className, 
  variant = 'default' 
}: CardTileWithCollectionButtonsSkeletonProps) {
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

          {/* Variant boxes skeleton */}
          <div className="flex flex-wrap gap-1.5 mt-2 pt-1">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </Panel>
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