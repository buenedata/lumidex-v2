'use client'

import { useState, Fragment, useEffect } from 'react'
import { Search, Filter, Grid, List, Plus, Eye, Edit, Trash2 } from 'lucide-react'
import { Listbox, Transition } from '@headlessui/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CollectionItemWithCard, VariantName } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { mapDBVariantToUIVariant } from '@/lib/variants/mapper'
import type { PriceSource } from '@/components/ui/PriceSourceToggle'
import type { UIVariant, UIVariantType } from '@/types/variants'
import { CardTileWithCollectionButtons } from '@/components/cards/CardTileWithCollectionButtons'
import { CardDetailsModal } from '@/components/cards/CardDetailsModal'
import { Button } from '@/components/ui/Button'

interface CollectionManagerProps {
  userId: string
}

// Extended collection item with aggregated variant data
interface ExtendedCollectionItem extends CollectionItemWithCard {
  variants?: UIVariant[]
  userQuantities?: Partial<Record<UIVariantType, number>>
  totalOwned?: number
}

export default function CollectionManager({ userId }: CollectionManagerProps) {
  const searchParams = useSearchParams()
  const priceSource = (searchParams.get('source') as PriceSource) || 'cardmarket'
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [collectionItems, setCollectionItems] = useState<ExtendedCollectionItem[]>([])
  const [prices, setPrices] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  // Handle refresh after collection changes
  const handleCollectionRefresh = () => {
    // Trigger a re-fetch of collection data
    fetchCollectionWithPrices()
  }

  async function fetchCollectionWithPrices() {
    try {
      setLoading(true)
      const supabase = createClient()
      
      // Fetch collection items with card and set details
      const { data: items, error: itemsError } = await supabase
        .from('collection_items')
        .select(`
          *,
          card:tcg_cards!inner (
            *,
            set:tcg_sets!inner (*)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      console.log('Fetched collection items:', items, 'Error:', itemsError)
      
      if (itemsError) {
        console.error('Error fetching collection items:', itemsError)
      }
      
      // If no real data, use mock data for demonstration
      if (!items || items.length === 0) {
        console.log('No collection items found, using mock data')
        const mockItems: ExtendedCollectionItem[] = [
          {
            id: 1,
            user_id: userId,
            card_id: 'base1-4',
            variant: 'holofoil' as VariantName,
            quantity: 1,
            condition: 'Near Mint',
            acquired_at: '2024-01-15',
            notes: 'First edition purchase',
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
            totalOwned: 1,
            variants: [
              { type: 'normal', userQuantity: 0 },
              { type: 'holo', userQuantity: 1 },
              { type: 'reverse_holo_standard', userQuantity: 0 }
            ],
            userQuantities: { holo: 1 },
            card: {
              id: 'base1-4',
              set_id: 'base1',
              number: '4',
              name: 'Charizard',
              supertype: 'Pokémon',
              subtypes: ['Stage 2'],
              hp: '120',
              types: ['Fire'],
              evolves_from: 'Charmeleon',
              rules: [],
              regulation_mark: null,
              artist: 'Mitsuhiro Arita',
              rarity: 'Rare Holo',
              flavor_text: null,
              national_pokedex_numbers: [6],
              legalities: {},
              images: {
                small: 'https://images.pokemontcg.io/base1/4.png',
                large: 'https://images.pokemontcg.io/base1/4_hires.png'
              },
              updated_at: '2024-01-01T00:00:00Z',
              set: {
                id: 'base1',
                name: 'Base Set',
                series: 'Base',
                tcg_type: 'pokemon',
                ptcgo_code: 'BS',
                printed_total: 102,
                total: 102,
                release_date: '1999-01-09',
                updated_at: '2024-01-01T00:00:00Z',
                legalities: {},
                images: {}
              }
            }
          }
        ]
        setCollectionItems(mockItems)
        
        // Set mock prices
        const mockPrices = new Map<string, number>()
        mockPrices.set('base1-4-holofoil', 120.50)
        setPrices(mockPrices)
      } else {
        // Group collection items by card_id and aggregate variants
        const cardGroups = new Map<string, any[]>()
        items.forEach((item: any) => {
          const cardId = item.card_id
          const existing = cardGroups.get(cardId) || []
          existing.push(item)
          cardGroups.set(cardId, existing)
        })

        // Create aggregated collection items with variant data
        const aggregatedItems: ExtendedCollectionItem[] = []
        
        for (const [cardId, cardItems] of Array.from(cardGroups.entries())) {
          const firstItem = cardItems[0]
          
          // Calculate user quantities for each variant
          const userQuantities: Partial<Record<UIVariantType, number>> = {}
          let totalOwned = 0
          
          cardItems.forEach((item: any) => {
            if (item.quantity > 0) {
              const uiVariantType = mapDBVariantToUIVariant(item.variant)
              if (uiVariantType) {
                userQuantities[uiVariantType] = (userQuantities[uiVariantType] || 0) + item.quantity
                totalOwned += item.quantity
              }
            }
          })

          // Fetch ALL available variants for this card from the variant engine
          try {
            const variantResponse = await fetch('/api/variants/engine', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mode: 'single',
                card: {
                  set_id: firstItem.card.id,
                  set_name: firstItem.card.name,
                  number: firstItem.card.number,
                  rarity: firstItem.card.rarity,
                  sets: {
                    set_id: firstItem.card.set_id,
                    set_series: firstItem.card.set?.name || 'Unknown',
                    releaseDate: firstItem.card.set?.release_date || '2023/01/01'
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

            // Create aggregated collection item
            const aggregatedItem: ExtendedCollectionItem = {
              ...firstItem,
              // Add aggregated data
              variants: allVariants,
              userQuantities,
              totalOwned
            }
            
            aggregatedItems.push(aggregatedItem)
          } catch (variantError) {
            console.error(`Error fetching variants for card ${cardId}:`, variantError);
            
            // Fallback: create basic variants with user quantities
            const basicVariants: UIVariant[] = Object.entries(userQuantities)
              .map(([variantType, quantity]) => ({
                type: variantType as UIVariantType,
                userQuantity: quantity || 0
              }));

            const aggregatedItem: ExtendedCollectionItem = {
              ...firstItem,
              variants: basicVariants,
              userQuantities,
              totalOwned
            }

            aggregatedItems.push(aggregatedItem)
          }
        }
        
        setCollectionItems(aggregatedItems)
        
        // Fetch prices for all cards in the collection
        const cardIds = Array.from(cardGroups.keys())
        
        const { data: priceData, error } = await supabase
          .from('tcg_card_prices')
          .select('card_id, variant, market, mid, currency')
          .in('card_id', cardIds)
          .eq('source', priceSource)
        
        console.log('Fetched price data:', priceData, 'Error:', error)
        
        if (!error && priceData) {
          const priceMap = new Map<string, number>()
          priceData.forEach(price => {
            const key = `${price.card_id}-${price.variant}`
            // Use market price first, fallback to mid price
            const value = price.market || price.mid || 0
            priceMap.set(key, value)
          })
          setPrices(priceMap)
        }
      }
    } catch (error) {
      console.error('Error fetching collection:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCollectionWithPrices()
  }, [userId, priceSource])

  const filterOptions = [
    { value: 'all', label: 'All Cards', count: collectionItems.length },
    { value: 'holo', label: 'Holofoil', count: collectionItems.filter(item =>
      item.userQuantities?.holo && item.userQuantities.holo > 0
    ).length },
    { value: 'recent', label: 'Recently Added', count: collectionItems.filter(item => new Date(item.created_at) > new Date('2024-01-10')).length }
  ]

  const filteredItems = collectionItems.filter(item => {
    const matchesSearch = item.card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.card.set.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.card.number.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = selectedFilter === 'all' ||
                         (selectedFilter === 'holo' && item.userQuantities?.holo && item.userQuantities.holo > 0) ||
                         (selectedFilter === 'recent' && new Date(item.created_at) > new Date('2024-01-10'))
    
    return matchesSearch && matchesFilter
  })

  const getCurrentPrice = (item: CollectionItemWithCard): number => {
    const key = `${item.card_id}-${item.variant}`
    return prices.get(key) || 0
  }

  const getCardImageUrl = (images: any): string => {
    if (!images || typeof images !== 'object') {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDIwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjgwIiBmaWxsPSIjMzMzIiBvcGFjaXR5PSIwLjEiLz4KPHN2ZyB4PSI4MCIgeT0iMTIwIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzY2NiI+CjxwYXRoIGQ9Im0xOSAxMC40LTcuOS03LjktLjcuN0w5IDQuNnYyLjhsNS42IDUuNkgxMnYyaDVsMS41IDEuNSAuNS0uNVY3aDItMy42eiIvPgo8L3N2Zz4KPC9zdmc+'
    }
    
    // Pokemon TCG API images structure: { small: "url", large: "url" }
    return images.small || images.large || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDIwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjgwIiBmaWxsPSIjMzMzIiBvcGFjaXR5PSIwLjEiLz4KPHN2ZyB4PSI4MCIgeT0iMTIwIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzY2NiI+CjxwYXRoIGQ9Im0xOSAxMC40LTcuOS03LjktLjcuN0w5IDQuNnYyLjhsNS42IDUuNkgxMnYyaDVsMS41IDEuNSAuNS0uNVY3aDItMy42eiIvPgo8L3N2Zz4KPC9zdmc+'
  }


  return (
    <div className="panel">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-text">My Collection</h3>
          <Link href="/cards">
            <Button variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Cards
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search your collection..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="field w-full pl-10"
            />
          </div>

          {/* Filter Dropdown */}
          <Listbox value={selectedFilter} onChange={setSelectedFilter}>
            <div className="relative">
              <Listbox.Button className="field w-full sm:w-48 text-left flex items-center justify-between">
                <span>{filterOptions.find(opt => opt.value === selectedFilter)?.label} ({filterOptions.find(opt => opt.value === selectedFilter)?.count})</span>
                <Filter className="h-4 w-4 text-muted" />
              </Listbox.Button>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options className="absolute z-10 mt-1 w-full panel border border-border rounded-xl shadow-lg max-h-60 overflow-auto focus:outline-none">
                  {filterOptions.map((option) => (
                    <Listbox.Option
                      key={option.value}
                      value={option.value}
                      className={({ active }) =>
                        cn(
                          'relative cursor-default select-none py-2 px-3 transition-colors',
                          active ? 'bg-panel2 text-text' : 'text-muted'
                        )
                      }
                    >
                      {({ selected }) => (
                        <span className={cn('block truncate', selected ? 'font-medium text-text' : 'font-normal')}>
                          {option.label} ({option.count})
                        </span>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>

          {/* View Mode Toggle */}
          <div className="flex bg-panel2 rounded-xl p-1 border border-border">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'grid' ? 'bg-panel shadow-sm text-text border border-border' : 'text-muted hover:text-text'
              )}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'list' ? 'bg-panel shadow-sm text-text border border-border' : 'text-muted hover:text-text'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <div className="w-16 h-16 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
            </div>
            <h4 className="text-lg font-medium text-text mb-2">Loading collection...</h4>
            <p className="text-muted">Please wait while we fetch your cards.</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Search className="w-16 h-16" />
            </div>
            <h4 className="text-lg font-medium text-text mb-2">No cards found</h4>
            <p className="text-muted">Try adjusting your search or filter criteria.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid-cards">
            {filteredItems.map((item) => (
              <CardTileWithCollectionButtons
                key={item.id}
                card={{
                  id: item.card_id,
                  name: item.card.name,
                  number: item.card.number,
                  rarity: item.card.rarity || undefined,
                  types: item.card.types || undefined,
                  hp: item.card.hp ? parseInt(item.card.hp, 10) : undefined,
                  supertype: item.card.supertype || undefined,
                  set_id: item.card.set_id || undefined,
                  setName: item.card.set.name,
                  images: item.card.images || undefined,
                  // Include aggregated variant data
                  variants: item.variants,
                  userQuantities: item.userQuantities,
                  totalOwned: item.totalOwned,
                  // Use legacy prices structure for compatibility
                  prices: getCurrentPrice(item) > 0 ? {
                    cardmarket: priceSource === 'cardmarket' ? {
                      trendPrice: getCurrentPrice(item),
                      averageSellPrice: getCurrentPrice(item),
                      lowPrice: getCurrentPrice(item) * 0.8
                    } : undefined,
                    tcgplayer: priceSource === 'tcgplayer' ? {
                      market: getCurrentPrice(item),
                      mid: getCurrentPrice(item),
                      low: getCurrentPrice(item) * 0.8
                    } : undefined
                  } : undefined
                }}
                priceSource={priceSource}
                userCurrency="EUR"
                variant="default"
                onClick={(cardId) => setSelectedCardId(cardId)}
                onRefresh={handleCollectionRefresh}
                variantData={item.variants ? { variants: item.variants } : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <CardListItem key={item.id} item={item} currentPrice={getCurrentPrice(item)} getCardImageUrl={getCardImageUrl} />
            ))}
          </div>
        )}
      </div>

      {/* Card Details Modal */}
      {selectedCardId && (
        <CardDetailsModal
          cardId={selectedCardId}
          isOpen={true}
          onClose={() => setSelectedCardId(null)}
          onCollectionChange={handleCollectionRefresh}
          onWishlistChange={() => {
            // Handle wishlist changes if needed
          }}
          // Pass pre-fetched variant data to avoid duplicate API calls
          variantData={(() => {
            const selectedCard = collectionItems.find(card => card.card_id === selectedCardId);
            return selectedCard?.variants ? {
              variants: selectedCard.variants,
              metadata: {
                source: 'collection',
                appliedExceptions: [],
                customVariantCount: 0
              }
            } : undefined;
          })()}
          userQuantities={(() => {
            const selectedCard = collectionItems.find(card => card.card_id === selectedCardId);
            if (!selectedCard) return undefined;
            
            // Convert the collection's userQuantities format to the modal's expected format
            const quantities: Record<string, Record<string, number>> = {};
            quantities[selectedCard.card_id] = selectedCard.userQuantities as Record<string, number>;
            return quantities;
          })()}
        />
      )}
    </div>
  )
}


function CardListItem({ item, currentPrice, getCardImageUrl }: { item: CollectionItemWithCard; currentPrice: number; getCardImageUrl: (images: any) => string }) {
  return (
    <div className="flex items-center space-x-4 p-4 border border-border rounded-xl hover:bg-panel2 transition-colors">
      {/* Card Image */}
      <div className="flex-shrink-0">
        <img
          src={getCardImageUrl(item.card.images)}
          alt={item.card.name}
          className="w-12 h-16 object-contain rounded border border-border"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDIwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjgwIiBmaWxsPSIjMzMzIiBvcGFjaXR5PSIwLjEiLz4KPHN2ZyB4PSI4MCIgeT0iMTIwIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzY2NiI+CjxwYXRoIGQ9Im0xOSAxMC40LTcuOS03LjktLjcuN0w5IDQuNnYyLjhsNS42IDUuNkgxMnYyaDVsMS41IDEuNSAuNS0uNVY3aDItMy42eiIvPgo8L3N2Zz4KPC9zdmc+';
          }}
        />
      </div>

      {/* Card Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-text">{item.card.name}</h4>
            <p className="text-sm text-muted">#{item.card.number}</p>
            <p className="text-sm text-muted">{item.card.set.name}</p>
          </div>
          <div className="text-right">
            {currentPrice > 0 && (
              <p className="font-medium text-text">€{currentPrice.toFixed(2)}</p>
            )}
            <p className="text-sm text-muted">Qty: {item.quantity}</p>
            {item.acquired_at && (
              <p className="text-xs text-muted">
                Added: {new Date(item.acquired_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'numeric',
                  day: 'numeric'
                })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        <button className="p-2 text-muted hover:text-text">
          <Eye className="h-4 w-4" />
        </button>
        <button className="p-2 text-muted hover:text-text">
          <Edit className="h-4 w-4" />
        </button>
        <button className="p-2 text-muted hover:text-danger">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}