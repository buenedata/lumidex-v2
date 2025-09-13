import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserCardQuantities } from './use-variant-queries';
import type { UIVariantType } from '@/types/variants';

export type FilterType = 'all' | 'have' | 'need' | 'duplicates';

export interface SetCollectionHookProps {
  setId: string;
  cards: Array<{
    id: string;
    name: string;
    number: string;
    rarity?: string;
    images?: {
      small?: string;
      large?: string;
    };
  }>;
  // Optional pre-fetched quantities to avoid individual API calls
  userQuantities?: Record<string, Record<string, number>>;
  // Optional variant data to properly determine what variants exist for each card
  variantData?: Record<string, { variants: Array<{ type: UIVariantType }> }>;
}

export interface CardCollectionStatus {
  cardId: string;
  hasAnyVariant: boolean;
  hasAllVariants: boolean;
  duplicateVariants: UIVariantType[];
  totalQuantity: number;
  quantities: Record<UIVariantType, number>;
}

// Hook for managing set preferences
export function useSetPreferences(setId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['setPreferences', setId],
    queryFn: async () => {
      const response = await fetch(`/api/user/set-preferences?setId=${encodeURIComponent(setId)}`);
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, return default
          return { setId, isMasterSet: false, exists: false };
        }
        throw new Error('Failed to fetch set preferences');
      }
      const data = await response.json();
      return data.data;
    },
    enabled: !!setId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateMutation = useMutation({
    mutationFn: async ({ isMasterSet }: { isMasterSet: boolean }) => {
      const response = await fetch('/api/user/set-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId, isMasterSet }),
      });
      if (!response.ok) {
        throw new Error('Failed to update set preferences');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setPreferences', setId] });
    },
  });

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updatePreferences: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}

// Hook for resetting set collection
export function useResetSetCollection(setId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/user/collection/set/${encodeURIComponent(setId)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to reset collection');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all collection-related queries
      queryClient.invalidateQueries({ queryKey: ['quantities'] });
      queryClient.invalidateQueries({ queryKey: ['setCollection', setId] });
    },
  });
}

// Hook for calculating collection status for all cards in a set
export function useSetCollectionStatus({ setId, cards, userQuantities, variantData }: SetCollectionHookProps) {
  const cardIds = cards.map(card => card.id);
  
  // If userQuantities parameter is provided (even if empty), we're in bulk mode
  // This prevents individual queries from ever starting
  const isInBulkMode = userQuantities !== undefined;
  
  // Debug logging
  if (typeof window !== 'undefined') {
    console.log(`useSetCollectionStatus: isInBulkMode=${isInBulkMode}, userQuantities keys=${Object.keys(userQuantities || {}).length}`);
  }
  
  // Always call hooks (Rules of Hooks), but disable when in bulk mode
  const quantitiesQueries = cardIds.map((cardId, index) => {
    const enabled = !isInBulkMode;
    if (typeof window !== 'undefined' && index < 3) { // Only log first 3 to avoid spam
      console.log(`useUserCardQuantities[${index}]: cardId=${cardId}, enabled=${enabled}, isInBulkMode=${isInBulkMode}`);
    }
    return useUserCardQuantities(cardId, enabled);
  });

  const isLoading = isInBulkMode ? false : quantitiesQueries.some(q => q.isLoading);
  const isError = isInBulkMode ? false : quantitiesQueries.some(q => q.isError);

  // Calculate collection status for each card
  const cardStatuses: CardCollectionStatus[] = cards.map((card, index) => {
    let quantities: Record<UIVariantType, number>;
    
    if (isInBulkMode) {
      // Use pre-fetched quantities
      quantities = (userQuantities![card.id] || {}) as Record<UIVariantType, number>;
    } else {
      // Use individual query results
      quantities = quantitiesQueries[index]?.data || {} as Record<UIVariantType, number>;
    }
    
    // Debug logging for specific cards
    if (card.id.includes('petilil') || card.id.includes('sv3pt5-6')) {
      console.log(`[HOOK DEBUG] Card ${card.id}:`, {
        isInBulkMode,
        quantities,
        userQuantitiesForCard: userQuantities?.[card.id],
        rawUserQuantities: userQuantities
      });
    }
    
    // Check if card has any variant
    const hasAnyVariant = Object.values(quantities).some((qty: number) => qty > 0);
    
    // Check if card has all variants (for master set mode)
    let hasAllVariants = hasAnyVariant; // Fallback to hasAnyVariant if no variant data available
    
    if (variantData && variantData[card.id]) {
      // Get all available variant types for this card from the variant engine
      const availableVariantTypes = variantData[card.id].variants.map((v: any) => v.type as UIVariantType);
      
      // Check if ALL available variants have quantity > 0
      hasAllVariants = availableVariantTypes.length > 0 &&
        availableVariantTypes.every((variantType: UIVariantType) => (quantities[variantType] || 0) > 0);
    }
    
    // Find variants with duplicates (quantity > 1)
    const duplicateVariants = Object.entries(quantities)
      .filter(([_, qty]) => (qty as number) > 1)
      .map(([variant]) => variant as UIVariantType);
    
    const totalQuantity = Object.values(quantities).reduce((sum: number, qty: number) => sum + qty, 0);

    const result = {
      cardId: card.id,
      hasAnyVariant,
      hasAllVariants,
      duplicateVariants,
      totalQuantity,
      quantities,
    };
    
    if (card.id.includes('petilil') || card.id.includes('sv3pt5-6')) {
      console.log(`[HOOK DEBUG] Card ${card.id} result:`, result);
    }

    return result;
  });

  return {
    cardStatuses,
    isLoading,
    isError,
    // Summary stats
    totalCards: cards.length,
    cardsWithAnyVariant: cardStatuses.filter(s => s.hasAnyVariant).length,
    cardsWithAllVariants: cardStatuses.filter(s => s.hasAllVariants).length,
    cardsWithDuplicates: cardStatuses.filter(s => s.duplicateVariants.length > 0).length,
  };
}

// Hook for filtering cards based on collection status and filter type
export function useFilteredCards({
  cards,
  cardStatuses,
  filterType,
  isMasterSet = false,
}: {
  cards: SetCollectionHookProps['cards'];
  cardStatuses: CardCollectionStatus[];
  filterType: FilterType;
  isMasterSet?: boolean;
}) {
  const filteredCards = cards.filter((card, index) => {
    const status = cardStatuses[index];
    if (!status) return false;

    switch (filterType) {
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

  return {
    filteredCards,
    filteredCount: filteredCards.length,
    totalCount: cards.length,
  };
}

// Combined hook that provides all collection functionality for a set
export function useSetCollection({ setId, cards, userQuantities, variantData }: SetCollectionHookProps) {
  const preferences = useSetPreferences(setId);
  const collectionStatus = useSetCollectionStatus({ setId, cards, userQuantities, variantData });
  const resetMutation = useResetSetCollection(setId);

  const isMasterSet = preferences.preferences?.isMasterSet || false;

  return {
    // Preferences
    isMasterSet,
    updateMasterSet: preferences.updatePreferences,
    isUpdatingPreferences: preferences.isUpdating,

    // Collection status
    cardStatuses: collectionStatus.cardStatuses,
    isLoadingCollection: collectionStatus.isLoading,
    isErrorCollection: collectionStatus.isError,

    // Summary stats
    totalCards: collectionStatus.totalCards,
    collectedCards: isMasterSet 
      ? collectionStatus.cardsWithAllVariants 
      : collectionStatus.cardsWithAnyVariant,
    cardsWithDuplicates: collectionStatus.cardsWithDuplicates,
    completionPercentage: collectionStatus.totalCards > 0 
      ? Math.round(((isMasterSet ? collectionStatus.cardsWithAllVariants : collectionStatus.cardsWithAnyVariant) / collectionStatus.totalCards) * 100)
      : 0,

    // Reset functionality
    resetCollection: resetMutation.mutateAsync,
    isResetting: resetMutation.isPending,

    // Filtering helper
    getFilteredCards: (filterType: FilterType) => 
      useFilteredCards({
        cards,
        cardStatuses: collectionStatus.cardStatuses,
        filterType,
        isMasterSet,
      }),
  };
}