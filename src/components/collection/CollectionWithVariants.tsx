'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Panel } from '@/components/ui/Panel';
import { Field, Select } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { CardDetailsModal } from '@/components/cards/CardDetailsModal';
import { CardTileWithCollectionButtons } from '@/components/cards/CardTileWithCollectionButtons';
import { getUserCollectionWithDetails } from '@/lib/db/queries';
import { mapDBVariantToUIVariant } from '@/lib/variants/mapper';
import type { UIVariant, UIVariantType } from '@/types/variants';
import type { PriceSource } from '@/components/ui/PriceSourceToggle';
import type { CurrencyCode } from '@/types';

interface UserVariantQuantity {
  cardId: string;
  variant: UIVariantType;
  quantity: number;
}

interface CollectionCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  types?: string[];
  hp?: number;
  supertype?: string;
  setId: string;
  setName: string;
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
  variants: UIVariant[];
  userQuantities: Partial<Record<UIVariantType, number>>;
  totalOwned: number;
  totalValue?: number;
}

interface CollectionWithVariantsProps {
  userId: string;
  priceSource: PriceSource;
  userCurrency?: CurrencyCode;
}

export function CollectionWithVariants({
  userId,
  priceSource,
  userCurrency
}: CollectionWithVariantsProps) {
  const [collectionCards, setCollectionCards] = useState<CollectionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    set: '',
    rarity: '',
    owned: 'all' // 'all', 'owned', 'missing'
  });


  // Fetch user's collection with variant data
  useEffect(() => {
    const fetchCollection = async () => {
      try {
        setLoading(true);

        // Get user's collection with full card details
        const collectionData = await getUserCollectionWithDetails(userId);
        
        if (collectionData.length === 0) {
          setCollectionCards([]);
          return;
        }

        // Group by card ID and aggregate quantities, filtering out zero quantities
        const cardGroups = new Map<string, any[]>();
        collectionData.forEach((item: any) => {
          // Additional safety check - only include items with quantity > 0
          if (item.quantity > 0) {
            const cardId = item.card_id;
            const existing = cardGroups.get(cardId) || [];
            existing.push(item);
            cardGroups.set(cardId, existing);
          }
        });

        // Process each card group and fetch all available variants
        const processedCards: CollectionCard[] = [];
        
        for (const [cardId, items] of Array.from(cardGroups.entries())) {
          try {
            const firstItem = items[0];
            const card = firstItem.card;
            const set = card.set;

            // Calculate user quantities for each variant
            const userQuantities: Partial<Record<UIVariantType, number>> = {};
            items.forEach((item: any) => {
              // Map database variant to UI variant type
              const uiVariantType = mapDBVariantToUIVariant(item.variant);
              if (uiVariantType && item.quantity > 0) {
                userQuantities[uiVariantType] = item.quantity;
              }
            });

            // Fetch all available variants for this card from the variant engine
            try {
              const variantResponse = await fetch('/api/variants/engine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  mode: 'single',
                  card: {
                    set_id: card.id,
                    set_name: card.name,
                    number: card.number,
                    rarity: card.rarity,
                    sets: {
                      set_id: set.id,
                      set_series: set.name || 'Unknown',
                      releaseDate: set.release_date || '2023/01/01'
                    }
                  },
                  includeUserQuantities: false
                })
              });

              let allVariants: UIVariant[] = [];
              
              if (variantResponse.ok) {
                const variantData = await variantResponse.json();
                
                // Create variants with user quantities applied
                allVariants = variantData.data.variants.map((variant: any) => ({
                  type: variant.type as UIVariantType,
                  userQuantity: userQuantities[variant.type as UIVariantType] || 0,
                  customVariantData: variant.customVariantData
                }));
              } else {
                // Fallback: create basic variants with user quantities
                const allUIVariantTypes: UIVariantType[] = ['normal', 'holo', 'reverse_holo_standard'];
                allVariants = allUIVariantTypes.map(type => ({
                  type,
                  userQuantity: userQuantities[type] || 0
                }));
              }

              const totalOwned = Object.values(userQuantities).reduce((sum, qty) => sum + qty, 0);

              // Include all cards that have any collection entries, regardless of current quantities
              const collectionCard: CollectionCard = {
                id: card.id,
                name: card.name,
                number: card.number,
                rarity: card.rarity,
                types: card.types,
                hp: card.hp ? parseInt(card.hp, 10) : undefined,
                supertype: card.supertype,
                setId: set.id,
                setName: set.name,
                variants: allVariants,
                userQuantities,
                totalOwned,
                images: card.images || {}
              };
  
              processedCards.push(collectionCard);
            } catch (variantError) {
              console.error(`Error fetching variants for card ${cardId}:`, variantError);
              
              // Fallback: create basic variants with user quantities
              const basicVariants: UIVariant[] = Object.entries(userQuantities)
                .map(([variantType, quantity]) => ({
                  type: variantType as UIVariantType,
                  userQuantity: quantity
                }));

              const totalOwned = Object.values(userQuantities).reduce((sum, qty) => sum + (qty || 0), 0);

              if (totalOwned > 0) {
                const collectionCard: CollectionCard = {
                  id: card.id,
                  name: card.name,
                  number: card.number,
                  rarity: card.rarity,
                  types: card.types,
                  hp: card.hp ? parseInt(card.hp, 10) : undefined,
                  supertype: card.supertype,
                  setId: set.id,
                  setName: set.name,
                  variants: basicVariants,
                  userQuantities,
                  totalOwned,
                  images: card.images || {}
                };
    
                processedCards.push(collectionCard);
              }
            }
          } catch (error) {
            console.error(`Error processing card ${cardId}:`, error);
          }
        }

        setCollectionCards(processedCards);
      } catch (error) {
        console.error('Error fetching collection:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollection();
  }, [userId]);

  // Simple refresh function to refetch collection data
  const refreshCollection = useCallback(async () => {
    try {
      const collectionData = await getUserCollectionWithDetails(userId);
      
      if (collectionData.length === 0) {
        setCollectionCards([]);
        return;
      }

      // Group by card ID and aggregate quantities
      const cardGroups = new Map<string, any[]>();
      collectionData.forEach((item: any) => {
        const cardId = item.card_id;
        const existing = cardGroups.get(cardId) || [];
        existing.push(item);
        cardGroups.set(cardId, existing);
      });

      // Process each card group and fetch all available variants
      const processedCards: CollectionCard[] = [];
      
      for (const [cardId, items] of Array.from(cardGroups.entries())) {
        try {
          const firstItem = items[0];
          const card = firstItem.card;
          const set = card.set;

          // Calculate user quantities for each variant
          const userQuantities: Partial<Record<UIVariantType, number>> = {};
          items.forEach((item: any) => {
            // Map database variant to UI variant type
            const uiVariantType = mapDBVariantToUIVariant(item.variant);
            if (uiVariantType && item.quantity > 0) {
              userQuantities[uiVariantType] = item.quantity;
            }
          });

          // Fetch all available variants for this card from the variant engine
          try {
            const variantResponse = await fetch('/api/variants/engine', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mode: 'single',
                card: {
                  set_id: card.id,
                  set_name: card.name,
                  number: card.number,
                  rarity: card.rarity,
                  sets: {
                    set_id: set.id,
                    set_series: set.name || 'Unknown',
                    releaseDate: set.release_date || '2023/01/01'
                  }
                },
                includeUserQuantities: false
              })
            });

            let allVariants: UIVariant[] = [];
            
            if (variantResponse.ok) {
              const variantData = await variantResponse.json();
              
              // Create variants with user quantities applied
              allVariants = variantData.data.variants.map((variant: any) => ({
                type: variant.type as UIVariantType,
                userQuantity: userQuantities[variant.type as UIVariantType] || 0,
                customVariantData: variant.customVariantData
              }));
            } else {
              // Fallback: create basic variants with user quantities
              const allUIVariantTypes: UIVariantType[] = ['normal', 'holo', 'reverse_holo_standard'];
              allVariants = allUIVariantTypes.map(type => ({
                type,
                userQuantity: userQuantities[type] || 0
              }));
            }

            const totalOwned = Object.values(userQuantities).reduce((sum, qty) => sum + (qty || 0), 0);

            // Include all cards that have any collection entries, regardless of current quantities
            const collectionCard: CollectionCard = {
              id: card.id,
              name: card.name,
              number: card.number,
              rarity: card.rarity,
              types: card.types,
              hp: card.hp ? parseInt(card.hp, 10) : undefined,
              supertype: card.supertype,
              setId: set.id,
              setName: set.name,
              variants: allVariants,
              userQuantities,
              totalOwned,
              images: card.images || {}
            };

            processedCards.push(collectionCard);
          } catch (variantError) {
            console.error(`Error fetching variants for card ${cardId}:`, variantError);
            
            // Fallback: create basic variants with user quantities
            const basicVariants: UIVariant[] = Object.entries(userQuantities)
              .map(([variantType, quantity]) => ({
                type: variantType as UIVariantType,
                userQuantity: quantity || 0
              }));

            const totalOwned = Object.values(userQuantities).reduce((sum, qty) => sum + (qty || 0), 0);

            if (totalOwned > 0) {
              const collectionCard: CollectionCard = {
                id: card.id,
                name: card.name,
                number: card.number,
                rarity: card.rarity,
                types: card.types,
                hp: card.hp ? parseInt(card.hp, 10) : undefined,
                supertype: card.supertype,
                setId: set.id,
                setName: set.name,
                variants: basicVariants,
                userQuantities,
                totalOwned,
                images: card.images || {}
              };
  
              processedCards.push(collectionCard);
            }
          }
        } catch (error) {
          console.error(`Error processing card ${cardId}:`, error);
        }
      }

      setCollectionCards(processedCards);
    } catch (error) {
      console.error('Error refreshing collection:', error);
    }
  }, [userId]);

  // Filter options
  const filterOptions = useMemo(() => {
    const sets = new Set<string>();
    const rarities = new Set<string>();

    collectionCards.forEach(card => {
      sets.add(card.setName);
      if (card.rarity) rarities.add(card.rarity);
    });

    return {
      sets: Array.from(sets).sort(),
      rarities: Array.from(rarities).sort()
    };
  }, [collectionCards]);

  // Filtered cards
  const filteredCards = useMemo(() => {
    return collectionCards.filter(card => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!card.name.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      if (filters.set && card.setName !== filters.set) {
        return false;
      }
      
      if (filters.rarity && card.rarity !== filters.rarity) {
        return false;
      }
      
      if (filters.owned === 'owned' && card.totalOwned === 0) {
        return false;
      }
      
      return true;
    });
  }, [collectionCards, filters]);

  // Collection statistics
  const stats = useMemo(() => {
    const totalCards = collectionCards.length;
    const totalQuantity = collectionCards.reduce((sum, card) => sum + card.totalOwned, 0);
    const totalValue = collectionCards.reduce((sum, card) => sum + (card.totalValue || 0), 0);
    
    return {
      totalCards,
      totalQuantity,
      totalValue,
      uniqueVariants: collectionCards.reduce((sum, card) => sum + card.variants.length, 0)
    };
  }, [collectionCards]);

  if (loading) {
    return <CollectionSkeleton />;
  }

  if (collectionCards.length === 0) {
    return <EmptyCollectionWithVariants />;
  }

  return (
    <div className="space-y-6">
      {/* Collection Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Panel className="p-4 text-center">
          <div className="text-2xl font-bold text-gradient">{stats.totalCards}</div>
          <div className="text-sm text-muted">Unique Cards</div>
        </Panel>
        <Panel className="p-4 text-center">
          <div className="text-2xl font-bold text-gradient">{stats.totalQuantity}</div>
          <div className="text-sm text-muted">Total Cards</div>
        </Panel>
        <Panel className="p-4 text-center">
          <div className="text-2xl font-bold text-gradient">
            {stats.totalCards > 0 && stats.totalValue > 0
              ? `$${(stats.totalValue / stats.totalCards).toFixed(2)}`
              : '—'
            }
          </div>
          <div className="text-sm text-muted">Average Value</div>
        </Panel>
        <Panel className="p-4 text-center">
          <div className="text-2xl font-bold text-gradient">
            {stats.totalValue > 0 ? `$${stats.totalValue.toFixed(2)}` : '—'}
          </div>
          <div className="text-sm text-muted">Est. Value</div>
        </Panel>
      </div>

      {/* Filters and View Controls */}
      <Panel className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <h2 className="text-xl font-semibold text-text">
            Your Collection ({filteredCards.length} cards)
          </h2>
          
          <div className="flex items-center gap-3 mt-6 lg:mt-0">
            <Button
              variant={view === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setView('grid')}
            >
              Grid
            </Button>
            <Button
              variant={view === 'list' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
            >
              List
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Field
            label="Search"
            type="text"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Card name..."
          />

          <Select
            label="Set"
            value={filters.set}
            onChange={(e) => setFilters(prev => ({ ...prev, set: e.target.value }))}
          >
            <option value="">All sets</option>
            {filterOptions.sets.map(set => (
              <option key={set} value={set}>{set}</option>
            ))}
          </Select>

          <Select
            label="Rarity"
            value={filters.rarity}
            onChange={(e) => setFilters(prev => ({ ...prev, rarity: e.target.value }))}
          >
            <option value="">All rarities</option>
            {filterOptions.rarities.map(rarity => (
              <option key={rarity} value={rarity}>{rarity}</option>
            ))}
          </Select>

          <Select
            label="Status"
            value={filters.owned}
            onChange={(e) => setFilters(prev => ({ ...prev, owned: e.target.value }))}
          >
            <option value="all">All cards</option>
            <option value="owned">Owned only</option>
          </Select>
        </div>
      </Panel>

      {/* Collection Grid/List */}
      {view === 'grid' ? (
        <div className="grid-cards">
          {filteredCards.map(card => (
            <CardTileWithCollectionButtons
              key={card.id}
              card={{
                id: card.id,
                name: card.name,
                number: card.number,
                rarity: card.rarity,
                types: card.types,
                hp: card.hp,
                supertype: card.supertype,
                setId: card.setId,
                setName: card.setName,
                images: card.images,
                variants: card.variants,
                userQuantities: card.userQuantities,
                totalOwned: card.totalOwned,
                totalValue: card.totalValue
              }}
              priceSource={priceSource}
              userCurrency={userCurrency}
              variant="default"
              onRefresh={refreshCollection}
              onClick={() => setSelectedCardId(card.id)}
              variantData={{
                variants: card.variants
              }}
              variantsLoading={false}
            />
          ))}
        </div>
      ) : (
        <Panel>
          <div className="divide-y divide-border">
            {filteredCards.map(card => (
              <CardTileWithCollectionButtons
                key={card.id}
                card={{
                  id: card.id,
                  name: card.name,
                  number: card.number,
                  rarity: card.rarity,
                  types: card.types,
                  hp: card.hp,
                  supertype: card.supertype,
                  setId: card.setId,
                  setName: card.setName,
                  images: card.images,
                  variants: card.variants,
                  userQuantities: card.userQuantities,
                  totalOwned: card.totalOwned,
                  totalValue: card.totalValue
                }}
                priceSource={priceSource}
                userCurrency={userCurrency}
                variant="list"
                onRefresh={refreshCollection}
                onClick={() => setSelectedCardId(card.id)}
                variantData={{
                  variants: card.variants
                }}
                variantsLoading={false}
              />
            ))}
          </div>
        </Panel>
      )}

      {/* Card Details Modal */}
      {selectedCardId && (
        <CardDetailsModal
          cardId={selectedCardId}
          isOpen={true}
          onClose={() => setSelectedCardId(null)}
          onCollectionChange={() => {
            // Refresh collection data when collection changes
            refreshCollection();
          }}
          onWishlistChange={() => {
            // Handle wishlist changes if needed
          }}
          // Pass pre-fetched variant data to avoid duplicate API calls
          variantData={(() => {
            const selectedCard = collectionCards.find(card => card.id === selectedCardId);
            return selectedCard ? {
              variants: selectedCard.variants,
              metadata: {
                source: 'collection',
                appliedExceptions: [],
                customVariantCount: 0
              }
            } : undefined;
          })()}
          userQuantities={(() => {
            const selectedCard = collectionCards.find(card => card.id === selectedCardId);
            if (!selectedCard) return undefined;
            
            // Convert the collection's userQuantities format to the modal's expected format
            // The modal expects userQuantities[cardId][variantType] = quantity
            const quantities: Record<string, Record<string, number>> = {};
            quantities[selectedCard.id] = selectedCard.userQuantities as Record<string, number>;
            return quantities;
          })()}
        />
      )}
    </div>
  );
}


function CollectionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Panel key={i} className="p-4">
            <div className="animate-pulse">
              <div className="h-8 skeleton rounded mb-2" />
              <div className="h-4 skeleton rounded" />
            </div>
          </Panel>
        ))}
      </div>
      
      <Panel>
        <div className="animate-pulse p-6">
          <div className="h-6 skeleton rounded w-1/4 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-10 skeleton rounded" />
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid-cards">
        {Array.from({ length: 12 }, (_, i) => (
          <Panel key={i} className="overflow-hidden">
            <div className="aspect-card skeleton" />
            <div className="p-3 space-y-2">
              <div className="h-4 skeleton rounded" />
              <div className="h-3 skeleton rounded w-2/3" />
              <div className="flex gap-1.5 pt-1">
                {Array.from({ length: 3 }, (_, j) => (
                  <div key={j} className="w-8 h-8 skeleton rounded-lg" />
                ))}
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function EmptyCollectionWithVariants() {
  return (
    <Panel className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 text-muted opacity-50">
        <CardIcon />
      </div>
      <h3 className="text-lg font-medium text-text mb-2">Your collection is empty</h3>
      <p className="text-muted mb-6">
        Start building your Pokemon card collection by browsing sets and adding cards you own.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/pokemon/sets">
          <Button variant="primary">
            Browse Sets
          </Button>
        </Link>
        <Link href="/cards">
          <Button variant="ghost">
            Search Cards
          </Button>
        </Link>
      </div>
    </Panel>
  );
}

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