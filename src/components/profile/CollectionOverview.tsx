'use client'

import { useState, useEffect } from 'react'
import { PieChart, BarChart3, Package, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface CollectionOverviewProps {
  userId: string
}

interface SetImages {
  small?: string
  large?: string
  logo?: string
  symbol?: string
}

interface SetProgress {
  id: string
  name: string
  series: string
  totalCards: number
  ownedCards: number
  completionPercentage: number
  images: SetImages
}

interface CollectionStats {
  totalCards: number
  totalQuantity: number
  completedSets: number
  rarityBreakdown: Array<{ label: string; count: number; percentage: number }>
  recentSets: SetProgress[]
}

export default function CollectionOverview({ userId }: CollectionOverviewProps) {
  const [collectionStats, setCollectionStats] = useState<CollectionStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCollectionStats() {
      try {
        setLoading(true)
        const supabase = createClient()

        // Get collection items with card information
        const { data: collectionItems, error: itemsError } = await supabase
          .from('collection_items')
          .select(`
            *,
            card:tcg_cards!inner (
              id,
              name,
              rarity,
              set_id
            )
          `)
          .eq('user_id', userId)

        if (itemsError) {
          console.error('Error fetching collection items:', itemsError)
          setCollectionStats({
            totalCards: 0,
            totalQuantity: 0,
            completedSets: 0,
            rarityBreakdown: [],
            recentSets: []
          })
          return
        }

        const items = collectionItems || []
        
        // Calculate basic stats
        const totalCards = items.length
        const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0)

        // Calculate rarity breakdown
        const rarityCount = new Map<string, number>()
        items.forEach(item => {
          const rarity = item.card?.rarity || 'Unknown'
          rarityCount.set(rarity, (rarityCount.get(rarity) || 0) + (item.quantity || 1))
        })

        const rarityBreakdown = Array.from(rarityCount.entries())
          .map(([rarity, count]) => ({
            label: rarity,
            count,
            percentage: totalQuantity > 0 ? Math.round((count / totalQuantity) * 100) : 0
          }))
          .sort((a, b) => b.count - a.count)

        // Get unique set IDs from collection items
        const setIds = Array.from(new Set(items.map(item => item.card?.set_id).filter(Boolean)))
        
        // Get set information
        const { data: sets, error: setsError } = await supabase
          .from('tcg_sets')
          .select('id, name, series, total, images')
          .in('id', setIds)

        if (setsError) {
          console.error('Error fetching sets:', setsError)
        }

        // Calculate set progress
        const setProgress = new Map<string, { set: any, owned: number, cards: Set<string> }>()
        const setsMap = new Map(sets?.map(set => [set.id, set]) || [])
        
        items.forEach(item => {
          const setId = item.card?.set_id
          const setData = setsMap.get(setId)
          if (setId && setData) {
            if (!setProgress.has(setId)) {
              setProgress.set(setId, {
                set: setData,
                owned: 0,
                cards: new Set()
              })
            }
            const progress = setProgress.get(setId)!
            progress.cards.add(item.card_id)
            progress.owned += (item.quantity || 1)
          }
        })

        // Convert to SetProgress array and calculate completion percentage
        const recentSets: SetProgress[] = Array.from(setProgress.entries())
          .map(([setId, data]) => ({
            id: setId,
            name: data.set.name || 'Unknown Set',
            series: data.set.series || 'Unknown Series',
            totalCards: data.set.total || 0,
            ownedCards: data.cards.size,
            completionPercentage: data.set.total > 0
              ? Math.round((data.cards.size / data.set.total) * 100)
              : 0,
            images: data.set.images || {}
          }))
          .sort((a, b) => b.completionPercentage - a.completionPercentage)
          .slice(0, 5) // Show top 5 sets by completion

        // Calculate completed sets (100% completion)
        const completedSets = recentSets.filter(set => set.completionPercentage === 100).length

        setCollectionStats({
          totalCards,
          totalQuantity,
          completedSets,
          rarityBreakdown,
          recentSets
        })

      } catch (error) {
        console.error('Error fetching collection stats:', error)
        setCollectionStats({
          totalCards: 0,
          totalQuantity: 0,
          completedSets: 0,
          rarityBreakdown: [],
          recentSets: []
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCollectionStats()
  }, [userId])

  const getSetImageUrl = (images: SetImages): string => {
    if (!images || typeof images !== 'object') {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA2MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMzMzIiBvcGFjaXR5PSIwLjEiLz4KPHN2ZyB4PSIyMCIgeT0iMzAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjNjY2Ij4KPHBhdGggZD0ibTE5IDEwLjQtNy45LTcuOS0uNy43TDkgNC42djIuOGw1LjYgNS42SDEydjJoNWwxLjUgMS41IC41LS41VjdoMi0zLjZ6Ci8+Cjwvc3ZnPgo8L3N2Zz4='
    }
    
    // Pokemon TCG API images structure: { small: "url", large: "url", logo: "url", symbol: "url" }
    return images.small || images.logo || images.symbol || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA2MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMzMzIiBvcGFjaXR5PSIwLjEiLz4KPHN2ZyB4PSIyMCIgeT0iMzAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjNjY2Ij4KPHBhdGggZD0ibTE5IDEwLjQtNy45LTcuOS0uNy43TDkgNC42djIuOGw1LjYgNS42SDEydjJoNWwxLjUgMS41IC41LS41VjdoMi0zLjZ6Ci8+Cjwvc3ZnPgo8L3N2Zz4='
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton for Rarity Breakdown */}
        <div className="panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 bg-panel2 rounded animate-pulse w-32" />
            <div className="h-5 w-5 bg-panel2 rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-1">
                  <div className="h-4 bg-panel2 rounded animate-pulse w-20" />
                  <div className="h-4 bg-panel2 rounded animate-pulse w-8" />
                </div>
                <div className="progress-container">
                  <div className="h-2 bg-panel2 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Loading skeleton for Set Progress */}
        <div className="panel p-6">
          <div className="h-5 bg-panel2 rounded animate-pulse w-24 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-12 h-16 bg-panel2 rounded border animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 bg-panel2 rounded animate-pulse mb-2 w-32" />
                  <div className="h-3 bg-panel2 rounded animate-pulse mb-2 w-20" />
                  <div className="h-2 bg-panel2 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!collectionStats) {
    return (
      <div className="space-y-6">
        <div className="panel p-6">
          <p className="text-muted">Unable to load collection overview</p>
        </div>
      </div>
    )
  }

  const recentSets = collectionStats.recentSets
  const collectionBreakdown = collectionStats.rarityBreakdown

  return (
    <div className="space-y-6">
      {/* Rarity Breakdown */}
      <div className="panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-text">Rarity Breakdown</h4>
          <BarChart3 className="h-5 w-5 text-muted" />
        </div>
        
        <div className="space-y-3">
          {collectionBreakdown.map((item, index) => (
            <div key={index}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-text">{item.label}</span>
                <span className="text-sm text-muted">{item.count}</span>
              </div>
              <div className="progress-container">
                <div
                  className="progress-fill"
                  style={{ width: `${item.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sets Progress */}
      <div className="panel p-6">
        <h4 className="text-md font-medium text-text mb-4">Set Progress</h4>
        
        <div className="space-y-4">
          {recentSets.map((set) => (
            <div key={set.id} className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <img
                  src={getSetImageUrl(set.images)}
                  alt={set.name}
                  className="w-12 h-16 object-cover rounded border border-border"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA2MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMzMzIiBvcGFjaXR5PSIwLjEiLz4KPHN2ZyB4PSIyMCIgeT0iMzAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjNjY2Ij4KPHBhdGggZD0ibTE5IDEwLjQtNy45LTcuOS0uNy43TDkgNC42djIuOGw1LjYgNS42SDEydjJoNWwxLjUgMS41IC41LS41VjdoMi0zLjZ6Ii8+Cjwvc3ZnPgo8L3N2Zz4=';
                  }}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">{set.name}</p>
                <p className="text-xs text-muted">{set.series}</p>
                
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted">{set.ownedCards}/{set.totalCards}</span>
                    <span className="text-xs font-medium text-text">{set.completionPercentage}%</span>
                  </div>
                  <div className="progress-container">
                    <div
                      className="progress-fill"
                      style={{ width: `${set.completionPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <button className="w-full mt-4 text-sm text-brand hover:text-brand2 font-medium transition-colors">
          View All Sets →
        </button>
      </div>
    </div>
  )
}