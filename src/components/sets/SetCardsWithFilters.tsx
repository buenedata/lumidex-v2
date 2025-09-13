'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { CardTileWithCollectionButtons, type CardCompletionStatus } from '@/components/cards/CardTileWithCollectionButtons';
import { CardDetailsModal } from '@/components/cards/CardDetailsModal';
import { SetFilters } from './SetFilters';
import { SetSorting, type SortConfig } from './SetSorting';
import { MasterSetToggle, MasterSetInfo } from './MasterSetToggle';
import { ResetCollectionDialog } from './ResetCollectionDialog';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { useSetCollection, type FilterType } from '@/hooks/use-set-collection';
import type { PriceSource } from '@/components/ui/PriceSourceToggle';
import type { CurrencyCode, UserPreferences } from '@/types';
import type { CardWithPrices } from '@/types/pricing';
import type { UIVariantType } from '@/types/variants';
import { useCurrencyOptional } from '@/lib/currency/context';
import { sortCards } from '@/lib/utils/sorting';
import { cn } from '@/lib/utils';

interface SetCard {
  id: string;
  name: string;
  number: string;
  rarity: string | null;
  types: string[] | null;
  hp: string | null;
  supertype: string | null;
  set_id: string | null;
  images: {
    small?: string;
    large?: string;
  } | null;
}

interface SetCardsWithFiltersProps {
  setId: string;
  setName: string;
  cards: SetCard[];
  priceSource?: PriceSource;
  userCurrency?: CurrencyCode;
  onPriceStatsChange?: (stats: SetPriceStats | null) => void;
  hideCollectionToggle?: boolean;
}

export interface SetPriceStats {
  mostExpensive: {
    price: number;
    currency: string;
    cardName: string;
  } | null;
}

export function SetCardsWithFilters({
  setId,
  setName,
  cards,
  priceSource = 'cardmarket',
  userCurrency,
  onPriceStatsChange,
  hideCollectionToggle = false
}: SetCardsWithFiltersProps) {
  // Set global bulk mode flag IMMEDIATELY to prevent any individual API calls
  if (typeof window !== 'undefined') {
    (window as any).__LUMIDEX_BULK_MODE = true;
  }
  
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cardsWithPrices, setCardsWithPrices] = useState<(SetCard | CardWithPrices)[]>(cards);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showMasterSetInfo, setShowMasterSetInfo] = useState(false);
  const [variantData, setVariantData] = useState<Record<string, any>>({});
  const [variantsLoading, setVariantsLoading] = useState(true);
  const [variantError, setVariantError] = useState<string | null>(null);
  const [refreshingCards, setRefreshingCards] = useState(new Set<string>());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: null, direction: 'asc' });
  // Initialize with empty object to immediately signal bulk mode to useSetCollection
  const [userQuantities, setUserQuantities] = useState<Record<string, Record<string, number>>>({});
  const [quantitiesLoading, setQuantitiesLoading] = useState(true);
  
  const currencyContext = useCurrencyOptional();
  
  // Refs for debouncing
  const pendingRefreshes = useRef(new Set<string>());
  const refreshTimeout = useRef<NodeJS.Timeout | null>(null);

  // Use the set collection hook - convert null to undefined for rarity
  const normalizedCards = cards.map(card => ({
    id: card.id,
    name: card.name,
    number: card.number,
    rarity: card.rarity ?? undefined,
    images: card.images || undefined,
  }));
  
  const setCollection = useSetCollection({
    setId,
    cards: normalizedCards,
    userQuantities: userQuantities, // Always pass this object to enable bulk mode
    variantData: variantData // Pass variant data for proper hasAllVariants calculation
  });
  
  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const { cardStatuses, totalCards } = setCollection;
    const { isMasterSet } = setCollection;
    
    const haveCount = cardStatuses.filter(status => 
      isMasterSet ? status.hasAllVariants : status.hasAnyVariant
    ).length;
    
    const needCount = totalCards - haveCount;
    const duplicatesCount = cardStatuses.filter(status => 
      status.duplicateVariants.length > 0
    ).length;

    return {
      all: totalCards,
      have: haveCount,
      need: needCount,
      duplicates: duplicatesCount,
    };
  }, [setCollection]);

  // Get filtered and sorted cards with completion status
  const filteredAndSortedCards = useMemo(() => {
    const { cardStatuses, isMasterSet } = setCollection;
    
    // First apply filtering
    const filtered = cards.filter((card, index) => {
      const status = cardStatuses[index];
      if (!status) return false;

      switch (activeFilter) {
        case 'all':
          return true;
        case 'have':
          return isMasterSet ? status.hasAllVariants : status.hasAnyVariant;
        case 'need':
          return isMasterSet ? !status.hasAllVariants : !status.hasAnyVariant;
        case 'duplicates':
          return status.duplicateVariants.length > 0;
        default:
          return true;
      }
    });

    // Then apply sorting - merge with price data for sorting
    const cardsWithPricesForSorting = filtered.map(card => {
      const cardWithPrices = cardsWithPrices.find(c => c.id === card.id) || card;
      return cardWithPrices;
    });

    return sortCards(cardsWithPricesForSorting, sortConfig.field, sortConfig.direction);
  }, [cards, setCollection, activeFilter, sortConfig, cardsWithPrices]);

  // Calculate completion status for each card - more reactive to userQuantities changes
  const getCardCompletionStatus = useCallback((cardId: string): CardCompletionStatus => {
    const { cardStatuses, isMasterSet } = setCollection;
    const cardIndex = cards.findIndex(card => card.id === cardId);
    const status = cardStatuses[cardIndex];
    
    // Also directly check userQuantities for immediate reactivity
    const directQuantities = userQuantities[cardId] || {};
    const hasDirectAnyVariant = Object.values(directQuantities).some((qty: number) => qty > 0);
    
    // Check if card has all variants (for master set mode) using variant data
    let hasDirectAllVariants = hasDirectAnyVariant; // Fallback to hasAnyVariant if no variant data
    
    if (variantData && variantData[cardId]) {
      // Get all available variant types for this card from the variant engine
      const availableVariantTypes = variantData[cardId].variants.map((v: any) => v.type as UIVariantType);
      
      // Check if ALL available variants have quantity > 0
      hasDirectAllVariants = availableVariantTypes.length > 0 &&
        availableVariantTypes.every((variantType: UIVariantType) => (directQuantities[variantType] || 0) > 0);
    }
    
    // Debug logging for specific card
    if (cardId.includes('petilil') || cardId.includes('sv3pt5-6')) {
      console.log(`[DEBUG] Card ${cardId}:`, {
        cardIndex,
        status,
        isMasterSet,
        userQuantitiesForCard: userQuantities[cardId],
        directQuantities,
        hasDirectAnyVariant,
        hasDirectAllVariants,
        cardStatuses: cardStatuses.length
      });
    }
    
    if (!status) {
      // Fallback to direct calculation when status is not available
      console.log(`[DEBUG] No status found for card ${cardId}, using direct calculation`);
      return {
        isCompleted: isMasterSet ? hasDirectAllVariants : hasDirectAnyVariant,
        isMasterSetMode: isMasterSet,
        hasAnyVariant: hasDirectAnyVariant,
        hasAllVariants: hasDirectAllVariants
      };
    }

    // Use direct calculation for more immediate reactivity
    const isCompleted = isMasterSet ? hasDirectAllVariants : hasDirectAnyVariant;
    
    if (cardId.includes('petilil') || cardId.includes('sv3pt5-6')) {
      console.log(`[DEBUG] Card ${cardId} completion:`, {
        hookBasedAnyVariant: status.hasAnyVariant,
        hookBasedAllVariants: status.hasAllVariants,
        directAnyVariant: hasDirectAnyVariant,
        directAllVariants: hasDirectAllVariants,
        isCompleted,
        isMasterSet
      });
    }

    return {
      isCompleted,
      isMasterSetMode: isMasterSet,
      hasAnyVariant: hasDirectAnyVariant,
      hasAllVariants: hasDirectAllVariants
    };
  }, [cards, setCollection, userQuantities]);

  // Fetch prices for all cards when component mounts or preferences change
  useEffect(() => {
    async function fetchCardPrices() {
      if (cards.length === 0) return;

      setPricesLoading(true);
      try {
        const userPreferences: UserPreferences = {
          preferred_currency: userCurrency || currencyContext?.userCurrency || 'EUR',
          preferred_price_source: priceSource || currencyContext?.priceSource || 'cardmarket'
        };

        const cardIds = cards.map(card => card.id);
        
        // Split card IDs into batches of 100 (API limit)
        const batchSize = 100;
        const batches: string[][] = [];
        for (let i = 0; i < cardIds.length; i += batchSize) {
          batches.push(cardIds.slice(i, i + batchSize));
        }
        
        // Fetch all batches concurrently
        const batchPromises = batches.map(async (batch, index) => {
          const requestBody = {
            cardIds: batch,
            ...(userPreferences && { forcePreferences: userPreferences })
          };
          
          const response = await fetch('/api/cards/prices', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Batch ${index + 1} API error:`, response.status, errorText);
            throw new Error(`Failed to fetch prices for batch ${index + 1}: ${response.status} - ${errorText}`);
          }

          const apiResponse = await response.json();
          
          if (!apiResponse.success) {
            console.error(`Batch ${index + 1} response not successful:`, apiResponse);
            throw new Error(`Batch ${index + 1} API response indicates failure`);
          }

          return apiResponse.data;
        });
        
        // Wait for all batches to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Flatten all batch results into single array
        const cardsWithPriceData = batchResults.flat();
        
        // Merge price data with original card data
        const mergedCards = cards.map(card => {
          const priceCard = cardsWithPriceData.find((p: any) => p.id === card.id);
          if (priceCard) {
            return {
              ...card,
              ...priceCard
            };
          }
          return card;
        });

        setCardsWithPrices(mergedCards);
      } catch (error) {
        console.error('Error fetching card prices:', error);
        // Keep original cards without price data on error
        setCardsWithPrices(cards);
      } finally {
        setPricesLoading(false);
      }
    }

    fetchCardPrices();
  }, [cards, priceSource, userCurrency, currencyContext?.userCurrency, currencyContext?.priceSource]);

  // Calculate and emit price statistics whenever cardsWithPrices changes
  useEffect(() => {
    if (!cardsWithPrices || cardsWithPrices.length === 0 || !onPriceStatsChange) {
      onPriceStatsChange?.(null);
      return;
    }

    // Extract prices from cards with price data
    const cardPrices: Array<{ price: number; currency: string; cardName: string }> = [];
    
    cardsWithPrices.forEach(card => {
      if ('price_data' in card && card.price_data?.cheapest_variant_price) {
        cardPrices.push({
          price: card.price_data.cheapest_variant_price.price,
          currency: card.price_data.cheapest_variant_price.currency,
          cardName: card.name
        });
      }
    });

    if (cardPrices.length === 0) {
      onPriceStatsChange(null);
      return;
    }

    // Find most expensive card
    const mostExpensive = cardPrices.reduce((max, current) =>
      current.price > max.price ? current : max
    );

    const stats: SetPriceStats = {
      mostExpensive: {
        price: mostExpensive.price,
        currency: mostExpensive.currency,
        cardName: mostExpensive.cardName
      }
    };

    onPriceStatsChange(stats);
  }, [cardsWithPrices, onPriceStatsChange]);

  // Fetch user quantities for all cards in bulk
  useEffect(() => {
    async function fetchBulkUserQuantities() {
      if (cards.length === 0) return;

      // Set global flag to prevent individual API calls
      if (typeof window !== 'undefined') {
        (window as any).__LUMIDEX_BULK_MODE = true;
        console.log('🚀 BULK MODE ENABLED - individual API calls will be blocked');
      }

      setQuantitiesLoading(true);
      
      try {
        const cardIds = cards.map(card => card.id);
        
        // Split card IDs into batches of 100 (API limit)
        const batchSize = 100;
        const batches: string[][] = [];
        for (let i = 0; i < cardIds.length; i += batchSize) {
          batches.push(cardIds.slice(i, i + batchSize));
        }
        
        // Fetch all batches concurrently
        const batchPromises = batches.map(async (batch) => {
          const response = await fetch(`/api/variants/quantities?cardIds=${batch.join(',')}`);
          
          if (!response.ok) {
            if (response.status === 401) {
              // User not authenticated, return empty quantities
              return {};
            }
            throw new Error(`Failed to fetch quantities: ${response.status}`);
          }
          
          const data = await response.json();
          return data.success ? data.data || {} : {};
        });
        
        // Wait for all batches to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Merge all batch results into single object
        const allQuantities = batchResults.reduce((acc, batch) => ({ ...acc, ...batch }), {});
        
        setUserQuantities(allQuantities);
        
      } catch (error) {
        console.error('Error fetching bulk user quantities:', error);
        // Set empty quantities on error so components don't break
        setUserQuantities({});
      } finally {
        setQuantitiesLoading(false);
      }
    }

    fetchBulkUserQuantities();
  }, [cards]);

  // Fetch variants and user quantities for all cards in bulk
  useEffect(() => {
    async function fetchBulkVariantData() {
      if (cards.length === 0) return;

      setVariantsLoading(true);
      setVariantError(null);
      
      try {
        // Convert cards to the format expected by the variant engine
        const cardsForEngine = cards.map(card => ({
          set_id: card.id, // Card ID (e.g., "swsh4-082")
          set_name: card.name,
          number: card.number,
          rarity: card.rarity || 'Unknown',
          sets: {
            set_id: card.set_id || setId, // Set ID (e.g., "swsh4")
            set_series: setName || 'Unknown',
            releaseDate: '2023/01/01' // Default modern date
          }
        }));

        // Split into batches if there are too many cards to prevent timeout
        const batchSize = 50; // Smaller batch size for variant data
        const batches: typeof cardsForEngine[] = [];
        for (let i = 0; i < cardsForEngine.length; i += batchSize) {
          batches.push(cardsForEngine.slice(i, i + batchSize));
        }

        const allResults: any[] = [];

        // Process batches with error handling and retry logic
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          let retryCount = 0;
          const maxRetries = 2;

          while (retryCount <= maxRetries) {
            try {
              const response = await fetch('/api/variants/engine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  mode: 'bulk',
                  setId: setId,
                  cards: batch,
                  includeUserQuantities: false // We'll get quantities separately for better performance
                }),
              });

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }

              const data = await response.json();
              
              if (data.success && data.data.results) {
                // data.data.results is a Record<string, VariantEngineOutput>, not an array
                // Convert to the format we need for the lookup
                Object.entries(data.data.results).forEach(([cardId, variantOutput]) => {
                  const typedOutput = variantOutput as any; // Type assertion for API response
                  allResults.push({
                    cardId,
                    success: true,
                    variants: typedOutput.variants,
                    metadata: typedOutput.metadata
                  });
                });
                break; // Success, exit retry loop
              } else {
                throw new Error(data.error || 'Invalid response format');
              }
            } catch (error) {
              retryCount++;
              console.warn(`Batch ${batchIndex + 1} attempt ${retryCount} failed:`, error);
              
              if (retryCount > maxRetries) {
                console.error(`Batch ${batchIndex + 1} failed after ${maxRetries} retries:`, error);
                // Continue with other batches instead of failing completely
                break;
              } else {
                // Wait before retry with exponential backoff
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              }
            }
          }
        }

        // Convert results to a lookup map by card ID
        const variantLookup: Record<string, any> = {};
        allResults.forEach((result: any) => {
          if (result.success && result.cardId) {
            variantLookup[result.cardId] = {
              variants: result.variants,
              metadata: result.metadata
            };
          }
        });
        
        setVariantData(variantLookup);
        
        // Show warning if some cards failed to load
        const failedCount = cards.length - Object.keys(variantLookup).length;
        if (failedCount > 0) {
          console.warn(`${failedCount} cards failed to load variant data`);
          setVariantError(`Some variant data could not be loaded (${failedCount} cards). Functionality may be limited.`);
        }
        
      } catch (error) {
        console.error('Error fetching bulk variant data:', error);
        setVariantError(error instanceof Error ? error.message : 'Failed to load variant data');
        // Set empty variant data on error so individual components can fall back
        setVariantData({});
      } finally {
        setVariantsLoading(false);
      }
    }

    fetchBulkVariantData();
  }, [cards, setId, setName]);

  // Merge variant data with user quantities
  const getMergedVariantData = useCallback((cardId: string) => {
    const baseVariantData = variantData[cardId];
    const cardQuantities = userQuantities[cardId] || {};
    
    if (!baseVariantData) return null;
    
    // Merge user quantities into variants
    const variantsWithQuantities = baseVariantData.variants?.map((variant: any) => ({
      ...variant,
      userQuantity: cardQuantities[variant.type] || 0
    })) || [];
    
    return {
      ...baseVariantData,
      variants: variantsWithQuantities
    };
  }, [variantData, userQuantities]);

  // Debounced batch refresh function
  const refreshVariantData = useCallback(async (cardIds: string[]) => {
    if (cardIds.length === 0) return;
    
    setRefreshingCards(prev => {
      const updated = new Set(prev);
      cardIds.forEach(id => updated.add(id));
      return updated;
    });

    try {
      // Refresh both variants and user quantities
      const [variantResponse, quantityResponse] = await Promise.all([
        // Refresh variants
        fetch('/api/variants/engine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'bulk',
            setId: setId,
            cards: cardIds.map(cardId => {
              const card = cards.find(c => c.id === cardId);
              return {
                set_id: cardId,
                set_name: card?.name || 'Unknown',
                number: card?.number || '0',
                rarity: card?.rarity || 'Unknown',
                sets: {
                  set_id: setId,
                  set_series: setName,
                  releaseDate: '2023/01/01'
                }
              };
            }),
            includeUserQuantities: false
          }),
        }),
        // Refresh user quantities
        fetch(`/api/variants/quantities?cardIds=${cardIds.join(',')}`)
      ]);

      // Update variant data
      if (variantResponse.ok) {
        const variantData = await variantResponse.json();
        if (variantData.success && variantData.data.results) {
          setVariantData(prev => {
            const updated = { ...prev };
            Object.entries(variantData.data.results).forEach(([cardId, variantOutput]) => {
              const typedOutput = variantOutput as any;
              updated[cardId] = {
                variants: typedOutput.variants,
                metadata: typedOutput.metadata
              };
            });
            return updated;
          });
        }
      }

      // Update user quantities
      if (quantityResponse.ok) {
        const quantityData = await quantityResponse.json();
        if (quantityData.success && quantityData.data) {
          setUserQuantities(prev => ({
            ...prev,
            ...quantityData.data
          }));
        }
      }
    } catch (error) {
      console.error('Failed to refresh data for cards:', cardIds, error);
    } finally {
      setRefreshingCards(prev => {
        const updated = new Set(prev);
        cardIds.forEach(id => updated.delete(id));
        return updated;
      });
    }
  }, [cards, setId, setName]);

  // Debounced refresh scheduler
  const scheduleRefresh = useCallback((cardId: string) => {
    pendingRefreshes.current.add(cardId);
    
    if (refreshTimeout.current) {
      clearTimeout(refreshTimeout.current);
    }
    
    refreshTimeout.current = setTimeout(() => {
      const cardsToRefresh = Array.from(pendingRefreshes.current);
      pendingRefreshes.current.clear();
      refreshVariantData(cardsToRefresh);
    }, 500); // 500ms debounce
  }, [refreshVariantData]);

  const handleCardClick = (cardId: string) => {
    setSelectedCardId(cardId);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCardId(null);
  };

  const handleCollectionChange = async (cardId: string, collectionData?: any) => {
    console.log('Collection updated:', { cardId, collectionData });
    
    // Wait a bit for the API call to complete, then fetch fresh data
    setTimeout(async () => {
      try {
        const response = await fetch(`/api/variants/quantities?cardIds=${cardId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setUserQuantities(prev => ({
              ...prev,
              [cardId]: data.data[cardId] || {}
            }));
            console.log('Updated quantities for', cardId, data.data[cardId] || {});
          }
        }
      } catch (error) {
        console.error('Failed to refresh quantities for', cardId, error);
      }
    }, 200); // Small delay to let the database update complete
    
    // Don't schedule debounced refresh to avoid conflicts
    // scheduleRefresh(cardId); // REMOVED to prevent race conditions
  };

  const handleWishlistChange = () => {
    console.log('Wishlist updated');
  };

  const handleMasterSetToggle = async (isMasterSet: boolean) => {
    try {
      await setCollection.updateMasterSet({ isMasterSet });
    } catch (error) {
      console.error('Failed to update master set preference:', error);
    }
  };

  const handleResetCollection = async () => {
    try {
      const result = await setCollection.resetCollection();
      console.log('Collection reset:', result);
      setShowResetDialog(false);
      // Success feedback could be added here
    } catch (error) {
      console.error('Failed to reset collection:', error);
      // Error feedback could be added here
    }
  };

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 text-muted opacity-50">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-text mb-2">No cards found</h3>
        <p className="text-muted">This set doesn't have any cards loaded yet.</p>
      </div>
    );
  }

  return (
    <>
      {/* Filter Controls */}
      <Panel className="mb-6">
        <div className="space-y-6">
          {/* Collection Mode Toggle and Actions - only show if not hidden */}
          {!hideCollectionToggle && (
            <>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <MasterSetToggle
                  isMasterSet={setCollection.isMasterSet}
                  onChange={handleMasterSetToggle}
                  loading={setCollection.isUpdatingPreferences}
                />
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowMasterSetInfo(!showMasterSetInfo)}
                    className="text-xs"
                  >
                    {showMasterSetInfo ? 'Hide' : 'Show'} Info
                  </Button>
                  
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowResetDialog(true)}
                    disabled={setCollection.isResetting || filterCounts.have === 0}
                    className="text-xs"
                  >
                    Reset Collection
                  </Button>
                </div>
              </div>

              {/* Master Set Info */}
              {showMasterSetInfo && (
                <MasterSetInfo isMasterSet={setCollection.isMasterSet} />
              )}
            </>
          )}

          {/* Filters */}
          <div className="space-y-4">
            <SetFilters
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              counts={filterCounts}
              disabled={setCollection.isLoadingCollection}
            />
            
            <SetSorting
              sortConfig={sortConfig}
              onSortChange={setSortConfig}
              disabled={setCollection.isLoadingCollection || pricesLoading || variantsLoading}
            />
          </div>
        </div>
      </Panel>

      {/* Cards Section Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-text">
          Cards ({filteredAndSortedCards.length})
        </h2>
      </div>

      {/* Cards Grid */}
      <div className="grid-cards">
        {filteredAndSortedCards.map((sortedCard) => {
          // Find the original card data from the cards array to ensure we have all properties
          const originalCard = cards.find(c => c.id === sortedCard.id);
          if (!originalCard) return null;
          
          const mergedVariantData = getMergedVariantData(originalCard.id);
          const completionStatus = getCardCompletionStatus(originalCard.id);
          
          return (
            <CardTileWithCollectionButtons
              key={originalCard.id}
              card={{
                id: originalCard.id,
                name: originalCard.name,
                number: originalCard.number,
                rarity: originalCard.rarity ?? undefined,
                types: originalCard.types ?? undefined,
                hp: originalCard.hp ? parseInt(originalCard.hp, 10) : undefined,
                supertype: originalCard.supertype ?? undefined,
                set_id: originalCard.set_id ?? undefined,
                images: originalCard.images || undefined,
                // Include price_data if available from the sorted card
                ...('price_data' in sortedCard ? { price_data: sortedCard.price_data } : {})
              }}
              priceSource={priceSource}
              userCurrency={userCurrency}
              disabled={pricesLoading || setCollection.isLoadingCollection || variantsLoading || quantitiesLoading || refreshingCards.has(originalCard.id)}
              onClick={handleCardClick}
              onRefresh={() => handleCollectionChange(originalCard.id)}
              variantData={mergedVariantData}
              variantsLoading={variantsLoading || quantitiesLoading}
              completionStatus={completionStatus}
            />
          );
        })}
      </div>

      {pricesLoading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-sm text-muted">
            <div className="w-4 h-4 border-2 border-brand2 border-t-transparent rounded-full animate-spin" />
            Loading prices...
          </div>
        </div>
      )}

      {variantsLoading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-sm text-muted">
            <div className="w-4 h-4 border-2 border-brand2 border-t-transparent rounded-full animate-spin" />
            Loading variant data...
          </div>
        </div>
      )}

      {refreshingCards.size > 0 && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-sm text-muted">
            <div className="w-4 h-4 border-2 border-brand2 border-t-transparent rounded-full animate-spin" />
            Updating {refreshingCards.size} card{refreshingCards.size > 1 ? 's' : ''}...
          </div>
        </div>
      )}

      {variantError && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                Variant Data Warning
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {variantError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State for Filtered Results */}
      {filteredAndSortedCards.length === 0 && activeFilter !== 'all' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 text-muted opacity-50">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-text mb-2">No cards match this filter</h3>
          <p className="text-muted mb-4">
            Try selecting a different filter or {setCollection.isMasterSet ? 'switch to normal set mode' : 'add some cards to your collection'}.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveFilter('all')}
          >
            Show All Cards
          </Button>
        </div>
      )}

      {/* Modals */}
      <CardDetailsModal
        cardId={selectedCardId}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onCollectionChange={handleCollectionChange}
        onWishlistChange={handleWishlistChange}
        variantData={selectedCardId ? getMergedVariantData(selectedCardId) : undefined}
        userQuantities={userQuantities}
      />

      <ResetCollectionDialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        onConfirm={handleResetCollection}
        setName={setName}
        isLoading={setCollection.isResetting}
        collectionStats={{
          collectedCards: setCollection.collectedCards,
          totalQuantity: filterCounts.have, // This could be improved with actual quantity data
        }}
      />
    </>
  );
}

export default SetCardsWithFilters;