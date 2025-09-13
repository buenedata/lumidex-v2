import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateVariants, invalidateQuantities } from '@/lib/query-client';
import type {
  VariantEngineInput,
  VariantEngineOutput,
  UIVariantType
} from '@/types/variants';

// Simple API client functions - no batching, just direct calls
async function fetchVariantsForCard(input: VariantEngineInput): Promise<VariantEngineOutput> {
  const response = await fetch('/api/variants/engine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'single',
      card: input.card,
      includeUserQuantities: false
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch variants for card: ${response.status}`);
  }
  
  const data = await response.json();
  return data.data;
}

async function fetchUserCardQuantities(cardId: string): Promise<Record<UIVariantType, number>> {
  // Add global check to prevent individual calls during bulk operations
  if (typeof window !== 'undefined' && (window as any).__LUMIDEX_BULK_MODE) {
    console.log(`🚫 BLOCKED individual API call for cardId=${cardId} - bulk mode active`);
    return {} as Record<UIVariantType, number>;
  }
  
  console.log(`🔥 INDIVIDUAL API CALL: /api/variants/quantities?cardId=${cardId}`);
  const response = await fetch(`/api/variants/quantities?cardId=${encodeURIComponent(cardId)}`);
  
  if (!response.ok) {
    if (response.status === 401) {
      // User not authenticated, return empty quantities silently
      return {} as Record<UIVariantType, number>;
    }
    throw new Error(`Failed to fetch quantities: ${response.status}`);
  }
  
  const data = await response.json();
  return data.quantities || {};
}

async function updateUserCardQuantity(
  cardId: string,
  variantType: UIVariantType,
  quantity: number
): Promise<void> {
  const response = await fetch('/api/variants/quantities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardId, variant: variantType, quantity }),
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Please sign in to manage your collection');
    }
    throw new Error('Failed to update quantity');
  }
}

// Hook for fetching variants for a single card
export function useCardVariants(input: VariantEngineInput, enabled = true) {
  return useQuery({
    queryKey: queryKeys.variants.engine(input),
    queryFn: () => fetchVariantsForCard(input),
    enabled: enabled && !!input.card?.set_id,
    staleTime: 15 * 60 * 1000, // 15 minutes - variants rarely change
    gcTime: 60 * 60 * 1000, // 60 minutes - keep in cache much longer
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 60000),
  });
}

// Hook for fetching user quantities for a card
export function useUserCardQuantities(cardId: string, enabled = true) {
  // Debug logging
  if (typeof window !== 'undefined' && !enabled) {
    console.log(`useUserCardQuantities: DISABLED for cardId=${cardId}`);
  }
  
  return useQuery({
    queryKey: queryKeys.quantities.card(cardId),
    queryFn: () => {
      console.log(`🚫 SHOULD NOT HAPPEN: fetchUserCardQuantities called for cardId=${cardId}`);
      return fetchUserCardQuantities(cardId);
    },
    enabled: enabled && !!cardId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Hook for updating user card quantity with optimistic updates
export function useUpdateCardQuantity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ cardId, variantType, quantity }: {
      cardId: string;
      variantType: UIVariantType;
      quantity: number;
    }) => updateUserCardQuantity(cardId, variantType, quantity),
    
    // Optimistic update
    onMutate: async ({ cardId, variantType, quantity }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.quantities.card(cardId) });
      
      // Snapshot the previous value
      const previousQuantities = queryClient.getQueryData<Record<UIVariantType, number>>(
        queryKeys.quantities.card(cardId)
      );
      
      // Optimistically update the cache
      queryClient.setQueryData<Record<UIVariantType, number>>(
        queryKeys.quantities.card(cardId),
        (old) => ({
          ...old,
          [variantType]: quantity,
        } as Record<UIVariantType, number>)
      );
      
      return { previousQuantities };
    },
    
    // Revert on error
    onError: (err, { cardId }, context) => {
      if (context?.previousQuantities) {
        queryClient.setQueryData(
          queryKeys.quantities.card(cardId),
          context.previousQuantities
        );
      }
    },
    
    // Always refetch to ensure consistency
    onSettled: (data, error, { cardId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quantities.card(cardId) });
    },
  });
}

// Hook for combined card variants + user quantities
export function useCardWithVariants(input: VariantEngineInput, enabled = true) {
  const variantsQuery = useCardVariants(input, enabled);
  const quantitiesQuery = useUserCardQuantities(input.card.set_id, enabled);
  
  return {
    // Combined loading state
    isLoading: variantsQuery.isLoading || quantitiesQuery.isLoading,
    isError: variantsQuery.isError || quantitiesQuery.isError,
    error: variantsQuery.error || quantitiesQuery.error,
    
    // Individual query states
    variantsQuery,
    quantitiesQuery,
    
    // Combined data
    variants: variantsQuery.data?.variants || [],
    quantities: quantitiesQuery.data || {},
    metadata: variantsQuery.data?.metadata,
    
    // Helper to get variant with user quantity
    variantsWithQuantities: variantsQuery.data?.variants.map(variant => ({
      ...variant,
      userQuantity: quantitiesQuery.data?.[variant.type] || 0,
    })) || [],
  };
}

// Hook for prefetching variants (useful for hover states)
export function usePrefetchCardVariants() {
  const queryClient = useQueryClient();
  
  return (input: VariantEngineInput) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.variants.engine(input),
      queryFn: () => fetchVariantsForCard(input),
      staleTime: 10 * 60 * 1000,
    });
  };
}

// Hook for invalidating caches (useful for admin operations)
export function useInvalidateVariantCaches() {
  return {
    invalidateAllVariants: invalidateVariants.all,
    invalidateCardVariants: invalidateVariants.card,
    invalidateSetVariants: invalidateVariants.set,
    invalidateAllQuantities: invalidateQuantities.all,
    invalidateCardQuantities: invalidateQuantities.card,
    invalidateUserQuantities: invalidateQuantities.user,
  };
}

// Legacy export for compatibility - no longer needed but kept to avoid breaking changes
export function useBulkUserCardQuantities(cardIds: string[], enabled = true) {
  // This was used by the batch system, but now we just return empty data since we use individual queries
  return useQuery({
    queryKey: [...queryKeys.quantities.all, 'bulk', cardIds.sort().join(',')],
    queryFn: () => {
      // Return empty object - components should use individual queries instead
      const result: Record<string, Record<UIVariantType, number>> = {};
      for (const cardId of cardIds) {
        result[cardId] = {} as Record<UIVariantType, number>;
      }
      return result;
    },
    enabled: false, // Disabled - components should migrate to individual queries
    staleTime: 0,
    gcTime: 0,
  });
}