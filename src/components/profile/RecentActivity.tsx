'use client'

import { useState, useEffect } from 'react'
import { Clock, Plus, Edit, Trash2, Trophy, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface RecentActivityProps {
  userId: string
}

interface CardImages {
  small?: string
  large?: string
  normal?: string
}

interface Activity {
  id: string
  type: 'card_added' | 'card_updated' | 'card_removed' | 'achievement_unlocked' | 'goal_completed'
  timestamp: string
  description: string
  details?: {
    cardName?: string
    cardImage?: string | null
    setName?: string
    achievementName?: string
    goalName?: string
    quantity?: number
    previousQuantity?: number
  }
}

interface CollectionItem {
  id: number
  card_id: string
  quantity: number
  created_at: string
  updated_at: string
  card?: {
    id: string
    name: string
    set_id: string
    images: CardImages
  }
}

export default function RecentActivity({ userId }: RecentActivityProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRecentActivity() {
      try {
        setLoading(true)
        const supabase = createClient()

        // Get recent collection items (additions)
        const { data: recentAdditions, error: additionsError } = await supabase
          .from('collection_items')
          .select(`
            *,
            card:tcg_cards!inner (
              id,
              name,
              images,
              set_id
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(15)

        if (additionsError) {
          console.error('Error fetching recent additions:', additionsError)
          return
        }

        // Get recently updated items (quantity changes)
        const { data: recentUpdates, error: updatesError } = await supabase
          .from('collection_items')
          .select(`
            *,
            card:tcg_cards!inner (
              id,
              name,
              images,
              set_id
            )
          `)
          .eq('user_id', userId)
          .neq('created_at', 'updated_at') // Only items where updated_at != created_at
          .order('updated_at', { ascending: false })
          .limit(10)

        const additions = (recentAdditions as CollectionItem[]) || []
        const updates = (recentUpdates as CollectionItem[]) || []

        // Get unique set IDs from collection items
        const setIds = Array.from(new Set(
          [...additions, ...updates]
            .map(item => item.card?.set_id)
            .filter(Boolean)
        ))
        
        // Get set information
        const { data: sets, error: setsError } = await supabase
          .from('tcg_sets')
          .select('id, name, series')
          .in('id', setIds)

        if (setsError) {
          console.error('Error fetching sets:', setsError)
        }

        // Create a map for quick set lookups
        const setsMap = new Map(sets?.map(set => [set.id, set]) || [])
        
        // Convert collection additions to activities
        const additionActivities: Activity[] = additions.map(item => {
          const cardImage = item.card?.images?.small || item.card?.images?.normal || null
          const cardName = item.card?.name || 'Unknown Card'
          const setData = setsMap.get(item.card?.set_id)
          const setName = setData?.name || 'Unknown Set'
          
          return {
            id: `add-${item.id}`,
            type: 'card_added' as const,
            timestamp: item.created_at,
            description: `Added ${cardName} to collection`,
            details: {
              cardName,
              cardImage,
              setName,
              quantity: item.quantity || 1
            }
          }
        })

        // Convert quantity updates to activities
        const updateActivities: Activity[] = updates
          .filter(item => {
            // Only include if there's a meaningful time difference between created and updated
            const createdAt = new Date(item.created_at)
            const updatedAt = new Date(item.updated_at)
            return updatedAt.getTime() - createdAt.getTime() > 5000 // More than 5 seconds difference
          })
          .map(item => {
            const cardImage = item.card?.images?.small || item.card?.images?.normal || null
            const cardName = item.card?.name || 'Unknown Card'
            const setData = setsMap.get(item.card?.set_id)
            const setName = setData?.name || 'Unknown Set'
            
            return {
              id: `update-${item.id}`,
              type: 'card_updated' as const,
              timestamp: item.updated_at,
              description: `Updated ${cardName} quantity`,
              details: {
                cardName,
                cardImage,
                setName,
                quantity: item.quantity || 1
              }
            }
          })

        // Generate achievement activities based on collection milestones
        const achievementActivities: Activity[] = []
        
        // Check for collection milestones
        const totalCards = additions.length
        if (totalCards === 1) {
          achievementActivities.push({
            id: 'achievement-first-card',
            type: 'achievement_unlocked',
            timestamp: additions[0]?.created_at || new Date().toISOString(),
            description: 'Unlocked "First Steps" achievement',
            details: {
              achievementName: 'First Steps'
            }
          })
        }

        // Check for set completion achievements
        const setProgress = new Map<string, number>()
        additions.forEach(item => {
          const setId = item.card?.set_id
          if (setId) {
            setProgress.set(setId, (setProgress.get(setId) || 0) + 1)
          }
        })

        // Combine all activities and sort by timestamp
        const allActivities = [...additionActivities, ...updateActivities, ...achievementActivities]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10) // Show most recent 10 activities

        setActivities(allActivities)

      } catch (error) {
        console.error('Error fetching recent activity:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentActivity()
  }, [userId])

  if (loading) {
    return (
      <div className="panel p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 bg-panel2 rounded animate-pulse w-32" />
          <div className="h-5 bg-panel2 rounded animate-pulse w-20" />
        </div>

        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="group p-3 rounded-xl border border-border">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-panel2 rounded-full animate-pulse mt-0.5" />
                <div className="flex-1">
                  <div className="h-4 bg-panel2 rounded animate-pulse mb-2 w-48" />
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-8 bg-panel2 rounded animate-pulse" />
                    <div className="h-3 bg-panel2 rounded animate-pulse w-20" />
                  </div>
                </div>
                <div className="h-3 bg-panel2 rounded animate-pulse w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'card_added':
        return <Plus className="h-4 w-4" />
      case 'card_updated':
        return <Edit className="h-4 w-4" />
      case 'card_removed':
        return <Trash2 className="h-4 w-4" />
      case 'achievement_unlocked':
        return <Trophy className="h-4 w-4" />
      case 'goal_completed':
        return <Target className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d ago`
    }
  }

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-text">Recent Activity</h3>
        <button className="text-sm text-brand hover:text-brand2 font-medium transition-colors">
          View All →
        </button>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="group p-3 rounded-xl transition-colors duration-150 hover:bg-panel2 cursor-pointer border border-border"
          >
            {/* Activity Icon */}
            <div className="flex items-start space-x-3">
              <div className={cn(
                'activity-icon flex-shrink-0 mt-0.5',
                activity.type === 'card_added' && 'activity-card',
                activity.type === 'card_updated' && 'activity-trade',
                activity.type === 'card_removed' && 'activity-danger',
                activity.type === 'achievement_unlocked' && 'activity-achievement',
                activity.type === 'goal_completed' && 'activity-trade'
              )}>
                {getActivityIcon(activity.type)}
              </div>

              {/* Activity Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text">
                      {activity.description}
                    </p>
                    
                    {/* Activity Details */}
                    {activity.details && (
                      <div className="mt-1 flex items-center space-x-2">
                        {activity.details.cardImage && (
                          <img
                            src={activity.details.cardImage}
                            alt={activity.details.cardName || 'Card'}
                            className="w-6 h-8 object-cover rounded border border-border"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA2MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMzMzIiBvcGFjaXR5PSIwLjEiLz4KPHN2ZyB4PSIyMCIgeT0iMzAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjNjY2Ij4KPHBhdGggZD0ibTE5IDEwLjQtNy45LTcuOS0uNy43TDkgNC42djIuOGw1LjYgNS42SDEydjJoNWwxLjUgMS41IC41LS41VjdoMi0zLjZ6Ii8+Cjwvc3ZnPgo8L3N2Zz4=';
                            }}
                          />
                        )}
                        <div className="text-xs text-muted">
                          {activity.details.setName && (
                            <span>{activity.details.setName}</span>
                          )}
                          {activity.details.quantity && activity.details.previousQuantity && (
                            <span className="ml-2 text-brand2">
                              {activity.details.previousQuantity} → {activity.details.quantity}
                            </span>
                          )}
                          {activity.details.quantity && !activity.details.previousQuantity && (
                            <span className="ml-2 text-success">
                              +{activity.details.quantity}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="text-xs text-muted ml-2 flex-shrink-0">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {activities.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Clock className="w-12 h-12" />
          </div>
          <h4 className="text-sm font-medium text-text mb-1">No recent activity</h4>
          <p className="text-sm text-muted">
            Start building your collection to see activity here.
          </p>
        </div>
      )}
    </div>
  )
}