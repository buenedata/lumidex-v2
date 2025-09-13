'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { UIVariantType, UIVariant } from '@/types/variants';
import { getVariantDisplayName } from '@/types/variants';

interface VariantQuantityButtonProps {
  variant: UIVariant;
  cardId: string;
  disabled?: boolean;
  onQuantityChange: (variantType: UIVariantType, delta: number) => Promise<void>;
  className?: string;
}

function VariantQuantityButton({
  variant,
  cardId,
  disabled = false,
  onQuantityChange,
  className
}: VariantQuantityButtonProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  
  const displayName = variant.customVariantData?.display_name || getVariantDisplayName(variant.type);
  const quantity = variant.userQuantity || 0;
  
  const handleClick = async (delta: number) => {
    if (disabled || isUpdating) return;
    
    setIsUpdating(true);
    try {
      await onQuantityChange(variant.type, delta);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const getVariantClass = (variantType: UIVariantType): string => {
    switch (variantType) {
      case 'normal': return 'normal-btn';
      case 'holo': return 'holo-btn';
      case 'reverse_holo_standard': return 'reverse-holo-btn';
      case 'reverse_holo_pokeball': return 'pokeball-btn';
      case 'reverse_holo_masterball': return 'masterball-btn';
      case 'first_edition': return 'first-edition-btn';
      case 'custom': return 'custom-btn';
      default: return 'normal-btn';
    }
  };

  return (
    <button
      type="button"
      disabled={disabled || isUpdating}
      onClick={() => handleClick(1)}
      onContextMenu={(e) => {
        e.preventDefault();
        handleClick(-1);
      }}
      className={cn(
        'variant-btn',
        getVariantClass(variant.type),
        {
          'active': quantity > 0,
          'loading': isUpdating
        },
        className
      )}
      aria-label={`${displayName} variant, ${quantity} owned. Click to add, right-click to remove.`}
      title={`${displayName} - ${quantity} owned`}
    >
      {quantity > 99 ? '99+' : quantity > 0 ? quantity : ''}
    </button>
  );
}

interface Card {
  set_id: string;
  set_name: string;
  number: string;
  rarity: string;
  sets: {
    set_id: string;
    set_series: string;
    releaseDate: string;
  };
}

interface VariantQuantityButtonGroupProps {
  card: Card;
  disabled?: boolean;
  className?: string;
  onCollectionChange?: () => void;
  variantData?: any; // Pre-fetched variant data from bulk API call
  variantsLoading?: boolean; // Loading state for variants
}

export function VariantQuantityButtonGroup({
  card,
  disabled = false,
  className,
  onCollectionChange,
  variantData,
  variantsLoading = false
}: VariantQuantityButtonGroupProps) {
  const [variants, setVariants] = useState<UIVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use pre-fetched variant data - no individual API calls allowed
  useEffect(() => {
    if (variantData && variantData.variants) {
      // Use pre-fetched variant data (already includes user quantities from parent component)
      setVariants(variantData.variants);
      setLoading(false);
      setError(null);
    } else if (variantsLoading) {
      // Bulk loading in progress, wait for it to complete
      setLoading(true);
      setError(null);
    } else {
      // No pre-fetched data available and not loading - show empty state
      setLoading(false);
      setVariants([]);
      setError('No variant data available');
    }
  }, [variantData, card.set_id, variantsLoading]);
  
  // Handle quantity changes
  const handleQuantityChange = async (variantType: UIVariantType, delta: number) => {
    const currentVariant = variants.find(v => v.type === variantType);
    const currentQuantity = currentVariant?.userQuantity || 0;
    const newQuantity = Math.max(0, currentQuantity + delta);
    
    // Optimistic update
    setVariants(prev => prev.map(v => 
      v.type === variantType ? { ...v, userQuantity: newQuantity } : v
    ));
    
    try {
      const response = await fetch('/api/variants/quantities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: card.set_id,
          variant: variantType,
          quantity: newQuantity
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update quantity');
      }
      
      // Wait a bit before notifying parent to ensure database consistency
      // This prevents race conditions where the refresh happens before the DB update is committed
      if (onCollectionChange) {
        setTimeout(() => {
          onCollectionChange();
        }, 150);
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
      
      // Revert optimistic update on error
      setVariants(prev => prev.map(v => 
        v.type === variantType ? { ...v, userQuantity: currentQuantity } : v
      ));
    }
  };
  
  // Calculate if card is in collection
  const inCollection = variants.some(v => (v.userQuantity || 0) > 0);

  // Use variantsLoading prop when available, otherwise use local loading state
  const isLoading = variantData ? variantsLoading : loading;

  if (isLoading) {
    // Show basic variant buttons immediately while loading user quantities
    // This provides instant visual feedback instead of gray loading boxes
    return (
      <div className={cn('collection-buttons-row', className)}>
        <div className="collection-btn opacity-60" title="Loading...">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div className="variant-buttons">
          {/* Show common variant buttons immediately with 0 quantities */}
          <button className="variant-btn normal-btn opacity-60" disabled title="Normal - Loading...">
            
          </button>
          <button className="variant-btn holo-btn opacity-60" disabled title="Holo - Loading...">
            
          </button>
          <button className="variant-btn reverse-holo-btn opacity-60" disabled title="Reverse Holo - Loading...">
            
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    // Show fallback variant buttons even on error instead of breaking the UI
    return (
      <div className={cn('collection-buttons-row', className)}>
        <div className="collection-btn opacity-50" title={`Error: ${error}`}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="variant-buttons">
          {/* Fallback to basic variant buttons with 0 quantities on error */}
          <button
            className="variant-btn normal-btn opacity-50"
            disabled
            title={`Normal - Error: ${error}`}
          >
            
          </button>
          <button
            className="variant-btn holo-btn opacity-50"
            disabled
            title={`Holo - Error: ${error}`}
          >
            
          </button>
          <button
            className="variant-btn reverse-holo-btn opacity-50"
            disabled
            title={`Reverse Holo - Error: ${error}`}
          >
            
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('collection-buttons-row', className)}
      role="group"
      aria-label="Card variant quantities"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Main collection status indicator */}
      <div
        className={cn('collection-btn', { 'active': inCollection })}
        title={inCollection ? 'Card is in collection' : 'Card not in collection'}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {inCollection ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        )}
      </div>

      {/* Variant buttons */}
      <div
        className="variant-buttons"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {variants.map((variant) => (
          <VariantQuantityButton
            key={variant.type}
            variant={variant}
            cardId={card.set_id}
            disabled={disabled}
            onQuantityChange={handleQuantityChange}
          />
        ))}
      </div>
    </div>
  );
}