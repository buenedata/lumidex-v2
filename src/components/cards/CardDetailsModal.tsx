'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import type {
  CardModalProps,
  CardModalData,
  CardCollectionData
} from '@/types/card-modal';
import { LoadingState } from '@/types/card-modal';
import { CardModalClientService } from '@/lib/card-modal/client-service';
import { VariantQuantityButtonGroup } from '@/components/variants/VariantQuantityButtons';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import type { VariantEngineInput, UIVariant } from '@/types/variants';
import { useCardWithVariants, useUpdateCardQuantity } from '@/hooks/use-variant-queries';
import { createClient } from '@/lib/supabase/client';
import { useCurrencyOptional } from '@/lib/currency/context';
import { cardPriceService } from '@/lib/db/price-queries';
import type { CardWithPrices, VariantPriceData } from '@/types/pricing';
import type { UserPreferences } from '@/types';
import { PriceGraph } from './PriceGraph';

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;

  const debounced = ((...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  }) as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

// Pricing Tab Component
function PricingTabContent({ cardId }: { cardId: string }) {
  const [priceData, setPriceData] = useState<CardWithPrices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currencyContext = useCurrencyOptional();

  useEffect(() => {
    async function fetchPrices() {
      setLoading(true);
      setError(null);

      try {
        const userPreferences: UserPreferences = {
          preferred_currency: currencyContext?.userCurrency || 'EUR',
          preferred_price_source: currencyContext?.priceSource || 'cardmarket'
        };

        const cardWithPrices = await cardPriceService.getCardWithPrices(cardId, userPreferences);
        setPriceData(cardWithPrices);
      } catch (err) {
        console.error('Error fetching card prices:', err);
        setError(err instanceof Error ? err.message : 'Failed to load pricing data');
      } finally {
        setLoading(false);
      }
    }

    if (cardId) {
      fetchPrices();
    }
  }, [cardId, currencyContext?.userCurrency, currencyContext?.priceSource]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="panel p-4">
          <div className="animate-pulse">
            <div className="h-6 bg-panel2 rounded mb-4 w-32"></div>
            <div className="space-y-3">
              <div className="h-4 bg-panel2 rounded w-full"></div>
              <div className="h-4 bg-panel2 rounded w-3/4"></div>
              <div className="h-4 bg-panel2 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel p-4">
        <div className="text-center py-6">
          <div className="text-4xl mb-2 opacity-50">⚠️</div>
          <p className="text-sm text-muted mb-2">Failed to load pricing data</p>
          <p className="text-xs text-muted">{error}</p>
        </div>
      </div>
    );
  }

  if (!priceData?.price_data) {
    return (
      <div className="panel p-4">
        <div className="text-center py-6 text-muted">
          <div className="text-4xl mb-2 opacity-50">💰</div>
          <p className="text-sm">No pricing data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PriceGraph
        priceData={priceData.price_data}
        currency={currencyContext?.userCurrency || 'EUR'}
      />
    </div>
  );
}

// Custom variant interface for database results
interface CustomVariant {
  id: number;
  variant_name: string;
  variant_type: string;
  display_name: string;
  description: string;
  source_product?: string;
  price_usd?: number;
  price_eur?: number;
  userQuantity?: number;
}

// Collection Management Component
function CollectionManagementSection({
  variantEngineInput,
  collectionState,
  variantData,
  userQuantities
}: {
  variantEngineInput: VariantEngineInput;
  collectionState: { data: CardCollectionData | null; loading: boolean };
  variantData?: any;
  userQuantities?: Record<string, Record<string, number>>;
}) {
  // Use pre-fetched data if available, otherwise fall back to API calls
  const shouldUsePrefetched = variantData && userQuantities;
  
  const {
    isLoading,
    isError,
    variantsWithQuantities,
  } = useCardWithVariants(variantEngineInput, !shouldUsePrefetched);
  
  // Merge pre-fetched data if available
  const finalVariantsWithQuantities = shouldUsePrefetched
    ? variantData.variants?.map((variant: any) => ({
        ...variant,
        userQuantity: userQuantities[variantEngineInput.card.set_id]?.[variant.type] || 0
      })) || []
    : variantsWithQuantities;
  
  const updateQuantityMutation = useUpdateCardQuantity();
  
  // State for custom variants
  const [customVariants, setCustomVariants] = useState<CustomVariant[]>([]);
  const [customVariantsLoading, setCustomVariantsLoading] = useState(false);
  
  // Fetch custom variants from database
  useEffect(() => {
    async function fetchCustomVariants() {
      setCustomVariantsLoading(true);
      try {
        const supabase = createClient();
        
        // Fetch custom variants for this card
        const { data: customVariantsData, error } = await supabase
          .from('custom_card_variants')
          .select('*')
          .eq('card_id', variantEngineInput.card.set_id)
          .eq('is_active', true);
        
        if (error) {
          console.error('Error fetching custom variants:', error);
          return;
        }
        
        // Fetch user quantities for custom variants if user is signed in
        const { data: { user } } = await supabase.auth.getUser();
        let quantities: Record<string, number> = {};
        
        if (user && customVariantsData?.length > 0) {
          const { data: collectionData } = await supabase
            .from('collection_items')
            .select('variant, quantity')
            .eq('user_id', user.id)
            .eq('card_id', variantEngineInput.card.set_id)
            .in('variant', customVariantsData.map(v => v.variant_name));
          
          if (collectionData) {
            quantities = collectionData.reduce((acc, item) => {
              acc[item.variant] = item.quantity;
              return acc;
            }, {} as Record<string, number>);
          }
        }
        
        // Merge custom variants with user quantities
        const customVariantsWithQuantities = (customVariantsData || []).map(variant => ({
          ...variant,
          userQuantity: quantities[variant.variant_name] || 0
        }));
        
        setCustomVariants(customVariantsWithQuantities);
      } catch (error) {
        console.error('Error in fetchCustomVariants:', error);
      } finally {
        setCustomVariantsLoading(false);
      }
    }
    
    if (variantEngineInput.card.set_id) {
      fetchCustomVariants();
    }
  }, [variantEngineInput.card.set_id]);
  
  // Standard variants only (no custom type filtering needed since they come from variant engine)
  const standardVariants = variantsWithQuantities;
  
  // Handle quantity changes for custom variants
  const handleCustomVariantQuantityChange = useCallback(async (variant: CustomVariant, delta: number) => {
    const currentQuantity = variant.userQuantity || 0;
    const newQuantity = Math.max(0, currentQuantity + delta);
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Please sign in to manage your collection');
        return;
      }
      
      if (newQuantity === 0) {
        // Remove from collection
        await supabase
          .from('collection_items')
          .delete()
          .eq('user_id', user.id)
          .eq('card_id', variantEngineInput.card.set_id)
          .eq('variant', variant.variant_name);
      } else {
        // Upsert collection item
        await supabase
          .from('collection_items')
          .upsert({
            user_id: user.id,
            card_id: variantEngineInput.card.set_id,
            variant: variant.variant_name,
            quantity: newQuantity,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,card_id,variant'
          });
      }
      
      // Update local state
      setCustomVariants(prev =>
        prev.map(v =>
          v.id === variant.id
            ? { ...v, userQuantity: newQuantity }
            : v
        )
      );
      
    } catch (error) {
      console.error(`Failed to update quantity for custom variant:`, error);
      alert('Failed to update collection. Please try again.');
    }
  }, [variantEngineInput.card.set_id]);

  return (
    <div className="mb-6">
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text">Add to Your Collection</h3>
        </div>
        
        {/* Standard Variants */}
        <div className="mb-4">
          <div className="text-sm font-medium text-muted mb-2">Standard variants</div>
          <div onClick={(e) => e.stopPropagation()}>
            <VariantQuantityButtonGroup
              card={variantEngineInput.card}
              disabled={false}
              variantData={shouldUsePrefetched ? {
                variants: finalVariantsWithQuantities,
                metadata: variantData?.metadata
              } : undefined}
              variantsLoading={shouldUsePrefetched ? false : isLoading}
            />
          </div>
        </div>
        
        {/* Additional Variants - Only show if there are custom variants */}
        {(customVariantsLoading || customVariants.length > 0) && (
          <div className="mb-4">
            <div className="text-sm font-medium text-muted mb-2">Additional variants</div>
            
            {customVariantsLoading ? (
              <div className="text-xs text-muted italic animate-pulse">
                Loading custom variants...
              </div>
            ) : (
              <div className="space-y-3">
                {customVariants.map((variant) => (
                  <div key={`custom-${variant.id}`} className="space-y-2">
                    {/* Custom variant button row */}
                    <div className="collection-buttons-row" onClick={(e) => e.stopPropagation()}>
                      <div className={`collection-btn ${(variant.userQuantity || 0) > 0 ? 'active' : ''}`}>
                        {(variant.userQuantity || 0) > 0 ? (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                      </div>
                      
                      <div className="variant-buttons">
                        <button
                          type="button"
                          onClick={() => handleCustomVariantQuantityChange(variant, 1)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handleCustomVariantQuantityChange(variant, -1);
                          }}
                          className={cn(
                            'variant-btn custom-btn',
                            { 'active': (variant.userQuantity || 0) > 0 }
                          )}
                          title={`${variant.display_name} - ${variant.userQuantity || 0} owned`}
                        >
                          {(variant.userQuantity || 0) > 99 ? '99+' : (variant.userQuantity || 0) > 0 ? (variant.userQuantity || 0) : ''}
                        </button>
                      </div>
                    </div>
                    
                    {/* Custom variant info */}
                    <div className="text-xs text-muted ml-8">
                      <div className="font-medium">{variant.display_name}</div>
                      <div>{variant.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {collectionState.data && (
          <div className="mt-4 p-3 bg-panel2 rounded-lg">
            <div className="text-sm text-muted mb-2">In your collection:</div>
            <div className="text-lg font-semibold text-text">
              {collectionState.data.totalQuantity} card{collectionState.data.totalQuantity !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-muted mt-1">
              Added: {formatDate(collectionState.data.dateAdded)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CardDetailsModal({
  cardId,
  isOpen,
  onClose,
  onCollectionChange,
  onWishlistChange,
  // Add optional pre-fetched variant data to prevent individual API calls
  variantData,
  userQuantities
}: CardModalProps & {
  variantData?: any;
  userQuantities?: Record<string, Record<string, number>>;
}) {
  const router = useRouter();
  const cardModalService = useMemo(() => new CardModalClientService(), []);

  // Consolidated state
  const [cardState, setCardState] = useState<{
    data: CardModalData | null;
    loadingState: LoadingState;
    error: string | null;
  }>({
    data: null,
    loadingState: LoadingState.IDLE,
    error: null
  });

  const [collectionState, setCollectionState] = useState<{
    data: CardCollectionData | null;
    loading: boolean;
  }>({
    data: null,
    loading: false
  });

  // Removed tab state - now everything is in one view

  // Debounced fetch function
  const fetchCard = useCallback(async (set_id: string, retryCount = 0) => {
    setCardState(prev => ({
      ...prev,
      loadingState: LoadingState.LOADING,
      error: null,
      data: null
    }));

    try {
      const cardData = await cardModalService.fetchCardData(set_id);
      
      if (!cardData) {
        throw new Error('No data returned from query');
      }

      setCardState({
        data: cardData,
        loadingState: LoadingState.SUCCESS,
        error: null
      });
    } catch (error: any) {
      console.error('CardDetailsModal: Error fetching card:', error, 'Retry count:', retryCount);
      
      if (retryCount < 2) {
        setTimeout(() => {
          fetchCard(set_id, retryCount + 1);
        }, (retryCount + 1) * 1000);
      } else {
        setCardState({
          data: null,
          loadingState: LoadingState.ERROR,
          error: `Failed to load card details: ${error.message || 'Unknown error'}`
        });
      }
    }
  }, [cardModalService]);

  // Memoized debounced fetch
  const debouncedFetchCard = useMemo(
    () => debounce(fetchCard, 300),
    [fetchCard]
  );

  // Effect to handle card loading
  useEffect(() => {
    if (isOpen && cardId) {
      // Always fetch if cardId is different from current data, or if we don't have data
      const needsFetch = !cardState.data || cardState.data.id !== cardId;
      
      if (needsFetch) {
        setCardState({
          data: null,
          loadingState: LoadingState.LOADING,
          error: null
        });
        setCollectionState({
          data: null,
          loading: false
        });

        // Fetch card data immediately
        fetchCard(cardId);
      }
    }

    // Cleanup on close
    if (!isOpen) {
      debouncedFetchCard.cancel();
      setCardState({
        data: null,
        loadingState: LoadingState.IDLE,
        error: null
      });
    }

    return () => {
      debouncedFetchCard.cancel();
    };
  }, [isOpen, cardId, fetchCard, debouncedFetchCard, cardState.data]);

  // Render loading state
  const renderLoading = () => (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand2 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted">Loading card details...</p>
      </div>
    </div>
  );

  // Render error state
  const renderError = () => (
    <div className="flex items-center justify-center py-20">
      <div className="text-center max-w-md mx-auto">
        <div className="text-6xl mb-4 opacity-50">🃏</div>
        <h1 className="text-2xl font-bold text-text mb-2">Unable to Load Card</h1>
        <p className="text-muted mb-4">{cardState.error || 'The requested card could not be found.'}</p>
        {cardState.error?.includes('refresh') && (
          <Button
            onClick={() => window.location.reload()}
            variant="primary"
          >
            Refresh Page
          </Button>
        )}
      </div>
    </div>
  );

  // Render card content
  const renderCardContent = () => {
    const { data: card } = cardState;
    if (!card) return null;

    // Create variant engine input for the VariantQuantityButtonGroup
    const variantEngineInput: VariantEngineInput = {
      card: {
        set_id: card.id,
        set_name: card.name,
        number: card.number,
        rarity: card.rarity,
        sets: {
          set_id: card.set_id,
          set_series: card.set_series || 'Unknown',
          releaseDate: card.set_release_date || ''
        }
      }
    };

    return (
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card Image */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-md">
              <div className="aspect-card relative">
                {card.image_large ? (
                  <Image
                    src={card.image_large}
                    alt={card.name}
                    fill
                    className="object-contain rounded-lg shadow-lg transition-opacity duration-300"
                    sizes="(max-width: 768px) 90vw, (max-width: 1024px) 45vw, 35vw"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-panel2 rounded-lg flex items-center justify-center">
                    <span className="text-muted">No image available</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card Details */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h2 className="text-3xl font-bold text-text mb-4">{card.name}</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center space-x-2">
                  <span className="text-muted">Number:</span>
                  <span className="text-text font-medium">#{card.number}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-muted">Rarity:</span>
                  <span className="text-text font-medium">{card.rarity}</span>
                </div>
                
                {card.set_name && (
                  <>
                    <div className="flex items-center space-x-2">
                      <span className="text-muted">Set:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/pokemon/sets/${card.set_id}`);
                        }}
                        className="text-text font-medium hover:text-brand2 transition-colors underline decoration-dotted underline-offset-2"
                        title={`View ${card.set_name} set`}
                      >
                        {card.set_name}
                      </button>
                    </div>
                    
                    {card.set_release_date && (
                      <div className="flex items-center space-x-2">
                        <span className="text-muted">Released:</span>
                        <span className="text-text font-medium">
                          {formatDate(card.set_release_date)}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {card.artist && (
                  <div className="flex items-center space-x-2 col-span-2">
                    <span className="text-muted">Artist:</span>
                    <span className="text-text font-medium">{card.artist}</span>
                  </div>
                )}
              </div>

              {/* Collection Management */}
              <CollectionManagementSection
                variantEngineInput={variantEngineInput}
                collectionState={collectionState}
                variantData={variantData}
                userQuantities={userQuantities}
              />

              {/* Quick Actions */}
              <div className="panel p-4">
                <h3 className="text-lg font-semibold text-text mb-4">Quick Actions</h3>
                
                <div className="space-y-3">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      // TODO: Implement friends functionality
                      alert('Friends feature coming soon!');
                    }}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Check Friends
                  </Button>
                  
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      // TODO: Implement wishlist functionality
                      alert('Wishlist feature coming soon!');
                    }}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Add to Wishlist
                  </Button>
                  
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: card.name,
                          text: `Check out this ${card.name} card!`,
                          url: window.location.href
                        });
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        alert('Link copied to clipboard!');
                      }
                    }}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    Share Card
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Price Graph Section - Full Width Below Card */}
        <div className="mt-8">
          <PricingTabContent cardId={card.id} />
        </div>
      </div>
    );
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      size="xl"
      className="bg-bg"
    >
      <div className="relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-panel rounded-full text-muted hover:text-text hover:bg-panel2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand2/50"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        {cardState.loadingState === LoadingState.LOADING && renderLoading()}
        {cardState.loadingState === LoadingState.ERROR && renderError()}
        {cardState.loadingState === LoadingState.SUCCESS && renderCardContent()}
      </div>
    </Dialog>
  );
}