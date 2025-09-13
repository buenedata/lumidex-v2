'use client'

import { useState, useEffect } from 'react'
import { Star, TrendingUp, Crown, Copy } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { CurrencyCode, PriceSource } from '@/types'

interface PersonalStatisticsProps {
  userId: string
}

interface Stat {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
}

interface CollectionData {
  totalCards: number
  totalValue: number
  currency: string
  mostExpensiveCard: number
  totalDuplicates: number
}

export default function PersonalStatistics({ userId }: PersonalStatisticsProps) {
  const [collectionData, setCollectionData] = useState<CollectionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCollectionData() {
      try {
        setLoading(true)
        const supabase = createClient()
        
        // Get user preferences for currency and price source
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_currency, preferred_price_source')
          .eq('id', userId)
          .single()

        const preferredCurrency = profile?.preferred_currency || 'EUR'
        const preferredPriceSource = profile?.preferred_price_source || 'cardmarket'
        
        // Get collection items
        const { data: items, error: itemsError } = await supabase
          .from('collection_items')
          .select(`
            *,
            card:tcg_cards!inner (
              id,
              name,
              set_id
            )
          `)
          .eq('user_id', userId)

        if (itemsError) {
          console.error('Error fetching collection items:', itemsError)
          setCollectionData({
            totalCards: 0,
            totalValue: 0,
            currency: preferredCurrency,
            mostExpensiveCard: 0,
            totalDuplicates: 0
          })
          return
        }

        const totalCards = items?.length || 0
        
        // Calculate duplicates (items with quantity > 1)
        const totalDuplicates = items?.reduce((sum, item) => {
          return sum + Math.max(0, (item.quantity || 1) - 1)
        }, 0) || 0

        // Get prices for value and most expensive card calculation
        const cardIds = items?.map(item => item.card_id) || []
        let totalValue = 0
        let mostExpensiveCard = 0

        if (cardIds.length > 0) {
          // Try preferred price source first
          let { data: prices, error: pricesError } = await supabase
            .from('tcg_card_prices')
            .select('card_id, variant, market, mid, currency')
            .in('card_id', cardIds)
            .eq('source', preferredPriceSource)

          console.log('Fetched prices from', preferredPriceSource, ':', prices, 'Error:', pricesError)

          // If no prices found with preferred source, try alternative source
          if ((!prices || prices.length === 0) && !pricesError) {
            const alternativeSource = preferredPriceSource === 'cardmarket' ? 'tcgplayer' : 'cardmarket'
            const { data: altPrices, error: altError } = await supabase
              .from('tcg_card_prices')
              .select('card_id, variant, market, mid, currency')
              .in('card_id', cardIds)
              .eq('source', alternativeSource)

            console.log('Fetched prices from', alternativeSource, ':', altPrices, 'Error:', altError)
            if (!altError && altPrices) {
              prices = altPrices
            }
          }

          if (!pricesError && prices && prices.length > 0) {
            // Create price map and find most expensive card
            const priceMap = new Map<string, number>()
            
            prices.forEach(price => {
              const value = price.market || price.mid || 0
              if (value > 0) {
                const key = `${price.card_id}-${price.variant || 'normal'}`
                priceMap.set(key, value)
                mostExpensiveCard = Math.max(mostExpensiveCard, value)
                
                // Also set a fallback key without variant for better matching
                const fallbackKey = price.card_id
                if (!priceMap.has(fallbackKey) || priceMap.get(fallbackKey)! < value) {
                  priceMap.set(fallbackKey, value)
                }
              }
            })

            console.log('Price map:', priceMap, 'Most expensive:', mostExpensiveCard)

            // Calculate total value
            totalValue = items?.reduce((sum, item) => {
              const exactKey = `${item.card_id}-${item.variant || 'normal'}`
              const fallbackKey = item.card_id
              const price = priceMap.get(exactKey) || priceMap.get(fallbackKey) || 0
              const quantity = item.quantity || 1
              return sum + (price * quantity)
            }, 0) || 0
          } else {
            console.log('No prices found for any cards')
          }
        }

        setCollectionData({
          totalCards,
          totalValue,
          currency: preferredCurrency,
          mostExpensiveCard,
          totalDuplicates
        })
      } catch (error) {
        console.error('Error fetching collection data:', error)
        setCollectionData({
          totalCards: 0,
          totalValue: 0,
          currency: 'EUR',
          mostExpensiveCard: 0,
          totalDuplicates: 0
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCollectionData()
  }, [userId])

  if (loading) {
    return (
      <div className="panel p-6">
        <h3 className="text-lg font-medium text-text mb-4">Statistics</h3>
        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-panel2 border border-border rounded-lg animate-pulse" />
              <div className="flex-1">
                <div className="h-4 bg-panel2 rounded animate-pulse mb-2" />
                <div className="h-6 bg-panel2 rounded animate-pulse w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!collectionData) {
    return (
      <div className="panel p-6">
        <h3 className="text-lg font-medium text-text mb-4">Statistics</h3>
        <p className="text-muted">Unable to load statistics</p>
      </div>
    )
  }

  const stats: Stat[] = [
    {
      label: 'Total Cards',
      value: collectionData.totalCards.toLocaleString(),
      icon: <Star className="h-5 w-5" />,
      color: 'text-blue-600'
    },
    {
      label: 'Collection Value',
      value: formatCurrency(collectionData.totalValue, collectionData.currency),
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-green-600'
    },
    {
      label: 'Most Expensive Card',
      value: collectionData.totalCards === 0
        ? 'Start adding cards'
        : collectionData.mostExpensiveCard > 0
          ? formatCurrency(collectionData.mostExpensiveCard, collectionData.currency)
          : 'No price data',
      icon: <Crown className="h-5 w-5" />,
      color: 'text-yellow-600'
    },
    {
      label: 'Total Duplicates',
      value: collectionData.totalDuplicates.toLocaleString(),
      icon: <Copy className="h-5 w-5" />,
      color: 'text-purple-600'
    }
  ]

  return (
    <div className="panel p-6">
      <h3 className="text-lg font-medium text-text mb-4">Statistics</h3>
      
      <div className="space-y-4">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-panel2 border border-border">
                <div className="text-brand">
                  {stat.icon}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-text">{stat.label}</p>
                <p className="text-lg font-bold text-text">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}