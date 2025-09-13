import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache variant data for 5 minutes by default
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Keep variant data in cache for 10 minutes when unused
      gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
      // Retry failed requests up to 2 times
      retry: 2,
      // Refetch on window focus for critical data
      refetchOnWindowFocus: false,
      // Enable background refetching
      refetchOnMount: true,
    },
    mutations: {
      // Retry mutations once on network errors
      retry: 1,
    },
  },
});

// Query keys factory for consistent cache management
export const queryKeys = {
  // Variant engine queries
  variants: {
    all: ['variants'] as const,
    card: (cardId: string) => [...queryKeys.variants.all, 'card', cardId] as const,
    set: (setId: string) => [...queryKeys.variants.all, 'set', setId] as const,
    engine: (input: any) => [...queryKeys.variants.all, 'engine', input] as const,
  },
  
  // Variant quantities queries
  quantities: {
    all: ['quantities'] as const,
    card: (cardId: string) => [...queryKeys.quantities.all, 'card', cardId] as const,
    user: (userId: string) => [...queryKeys.quantities.all, 'user', userId] as const,
    userCard: (userId: string, cardId: string) => 
      [...queryKeys.quantities.user(userId), 'card', cardId] as const,
  },
  
  // Set policies queries
  policies: {
    all: ['policies'] as const,
    set: (setId: string) => [...queryKeys.policies.all, 'set', setId] as const,
    era: (era: string) => [...queryKeys.policies.all, 'era', era] as const,
  },
  
  // Rarity mappings queries
  rarities: {
    all: ['rarities'] as const,
    era: (era: string) => [...queryKeys.rarities.all, 'era', era] as const,
    mapping: (rarity: string, era: string) => 
      [...queryKeys.rarities.era(era), 'mapping', rarity] as const,
  },
} as const;

// Cache invalidation helpers
export const invalidateVariants = {
  all: () => queryClient.invalidateQueries({ queryKey: queryKeys.variants.all }),
  card: (cardId: string) => queryClient.invalidateQueries({ queryKey: queryKeys.variants.card(cardId) }),
  set: (setId: string) => queryClient.invalidateQueries({ queryKey: queryKeys.variants.set(setId) }),
};

export const invalidateQuantities = {
  all: () => queryClient.invalidateQueries({ queryKey: queryKeys.quantities.all }),
  card: (cardId: string) => queryClient.invalidateQueries({ queryKey: queryKeys.quantities.card(cardId) }),
  user: (userId: string) => queryClient.invalidateQueries({ queryKey: queryKeys.quantities.user(userId) }),
  userCard: (userId: string, cardId: string) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.quantities.userCard(userId, cardId) }),
};

export const invalidatePolicies = {
  all: () => queryClient.invalidateQueries({ queryKey: queryKeys.policies.all }),
  set: (setId: string) => queryClient.invalidateQueries({ queryKey: queryKeys.policies.set(setId) }),
  era: (era: string) => queryClient.invalidateQueries({ queryKey: queryKeys.policies.era(era) }),
};