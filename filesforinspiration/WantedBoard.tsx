'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTabVisibility } from '@/hooks/useTabVisibility'
import { wantedBoardService, WantedBoardPost } from '@/lib/wanted-board-service'
import { usePreferredCurrency } from '@/contexts/UserPreferencesContext'
import { currencyService } from '@/lib/currency-service'
import { useI18n } from '@/contexts/I18nContext'
import { useConfirmation } from '@/contexts/ConfirmationContext'
import { useToast } from '@/components/ui/ToastContainer'
import { supabase } from '@/lib/supabase'
import CardSelectionModal from '@/components/trading/CardSelectionModal'
import WantedBoardTradeModal from '@/components/trading/WantedBoardTradeModal'
import { CardDetailsModal } from '@/components/pokemon/CardDetailsModal'
import Image from 'next/image'
import Link from 'next/link'
import {
  Star,
  Users,
  Clock,
  AlertCircle,
  MessageCircle,
  ArrowLeftRight,
  Eye,
  TrendingUp,
  X
} from 'lucide-react'

interface WantedBoardProps {
  className?: string
}

export function WantedBoard({ className = '' }: WantedBoardProps) {
  const { user } = useAuth()
  const { isVisible } = useTabVisibility()
  const preferredCurrency = usePreferredCurrency()
  const { locale } = useI18n()
  const { confirm } = useConfirmation()
  const { showSuccess, showError, showInfo } = useToast()
  // Remove the trade modal hook since we're using dedicated wanted board trading
  const [posts, setPosts] = useState<WantedBoardPost[]>([])
  const [userOwnedCards, setUserOwnedCards] = useState<string[]>([])
  const [userCardDetails, setUserCardDetails] = useState<Map<string, Array<{
    set_id: string
    quantity: number
    condition: string
    cards: {
      set_id: string
      set_name: string
      image_small: string
      cardmarket_avg_sell_price?: number
      sets: { set_name: string }
    }
  }>>>(new Map())
  const [loading, setLoading] = useState(true)
  const [hasInitialData, setHasInitialData] = useState(false)
  const [stats, setStats] = useState({ totalPosts: 0, totalUsers: 0 })
  const [removingPost, setRemovingPost] = useState<string | null>(null)
  const [showCardSelection, setShowCardSelection] = useState(false)
  const [cardSelectionData, setCardSelectionData] = useState<{
    post: WantedBoardPost
    availableCards: Array<{
      set_id: string
      set_name: string
      image_small: string
      cardmarket_prices_suggested_price?: number
    }>
  } | null>(null)
  const [showWantedBoardTradeModal, setShowWantedBoardTradeModal] = useState(false)
  const [selectedCardsForTrade, setSelectedCardsForTrade] = useState<Array<{
    set_id: string
    set_name: string
    image_small: string
    cardmarket_prices_suggested_price?: number
  }>>([])
  const [currentTradePost, setCurrentTradePost] = useState<WantedBoardPost | null>(null)
  const [showCardModal, setShowCardModal] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  useEffect(() => {
    loadWantedBoardData()
  }, [user])

  // Refresh data when tab becomes visible again, but don't show loading state
  useEffect(() => {
    if (isVisible && hasInitialData && user) {
      // Refresh data in background without showing loading state
      loadWantedBoardData(false)
    }
  }, [isVisible, hasInitialData, user])

  const loadWantedBoardData = async (forceRefresh = false) => {
    // Only show loading if we don't have initial data yet or force refresh
    if (!hasInitialData || forceRefresh) {
      setLoading(true)
    }
    
    try {
      const [postsResult, statsResult] = await Promise.all([
        wantedBoardService.getWantedBoardPosts(user?.id, 20),
        wantedBoardService.getWantedBoardStats()
      ])

      if (postsResult.success && postsResult.data) {
        setPosts(postsResult.data)

        // Check which cards the current user owns
        if (user) {
          const ownedResult = await wantedBoardService.checkUserHasWantedCards(
            user.id,
            postsResult.data
          )
          if (ownedResult.success && ownedResult.data) {
            setUserOwnedCards(ownedResult.data)
            
            // Fetch detailed cards information for owned cards
            await loadUserCardDetails(ownedResult.data)
          }
        }
      }

      if (statsResult.success && statsResult.data) {
        setStats({
          totalPosts: statsResult.data.totalPosts,
          totalUsers: statsResult.data.totalUsers
        })
      }
      
      // Mark that we have initial data
      setHasInitialData(true)
    } catch (error) {
      console.error('Error loading wanted board:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserCardDetails = async (ownedCardIds: string[]) => {
    if (!user || ownedCardIds.length === 0) return

    try {
      const { data, error } = await supabase
        .from('user_collections')
        .select(`
          set_id,
          card_id,
          quantity,
          condition,
          cards:cards (
            set_id,
            set_name,
            image_small,
            cardmarket_avg_sell_price,
            sets:sets (
              set_name
            )
          )
        `)
        .eq('user_id', user.id)
        .in('card_id', ownedCardIds)
        .gt('quantity', 0)

      if (error) throw error

      // Group cards by card_id
      const cardDetailsMap = new Map()
      data?.forEach((item: any) => {
        const cardId = item.card_id
        if (!cardDetailsMap.has(cardId)) {
          cardDetailsMap.set(cardId, [])
        }
        cardDetailsMap.get(cardId).push(item)
      })

      setUserCardDetails(cardDetailsMap)
    } catch (error) {
      console.error('Error loading user cards details:', error)
    }
  }

  const formatPrice = (cardmarket_prices_suggested_price: number | null | undefined) => {
    if (!cardmarket_prices_suggested_price) return 'N/A'
    return currencyService.formatCurrency(cardmarket_prices_suggested_price, preferredCurrency, locale)
  }

  const handleInitiateTrade = async (post: WantedBoardPost) => {
    if (!post.cards || !post.user) return
    
    console.log('handleInitiateTrade called for cards:', post.cards.set_name)
    
    // Get ALL cards that this user wants (all posts from this user)
    const userWantedPosts = posts.filter(p => p.user_id === post.user_id)
    const wantedCardIds = userWantedPosts.map(p => p.card_id)
    
    console.log('User wants these cards:', wantedCardIds)
    
    // Get all cards that the current user owns that match what this user wants
    const allAvailableCards: Array<{
      set_id: string
      set_name: string
      image_small: string
      cardmarket_prices_suggested_price: number
    }> = []
    
    wantedCardIds.forEach(cardId => {
      const userCards = userCardDetails.get(cardId) || []
      userCards.forEach(userCard => {
        allAvailableCards.push({
          set_id: userCard.cards.set_id,
          set_name: userCard.cards.set_name,
          image_small: userCard.cards.image_small || '',
          cardmarket_prices_suggested_price: userCard.cards.cardmarket_avg_sell_price || 0
        })
      })
    })
    
    console.log('All available cards to offer:', allAvailableCards)
    
    // Always show cards selection modal when user owns cards that the recipient wants
    if (allAvailableCards.length > 0) {
      console.log('Showing cards selection modal with', allAvailableCards.length, 'cards')
      
      setCardSelectionData({
        post,
        availableCards: allAvailableCards
      })
      setShowCardSelection(true)
    } else {
      console.log('No user cards found, opening trade modal with fallback cards')
      // Fallback: open trade modal with the wanted cards
      if (!user) return
      
      setSelectedCardsForTrade([{
        set_id: post.cards.set_id,
        set_name: post.cards.set_name,
        image_small: post.cards.image_small || post.cards.image_large || '',
        cardmarket_prices_suggested_price: post.cards.cardmarket_avg_sell_price || 0
      }])
      setCurrentTradePost(post)
      setShowWantedBoardTradeModal(true)
    }
  }

  const handleContactUser = (post: WantedBoardPost) => {
    // TODO: Implement messaging
    showInfo(
      'Messaging Feature Coming Soon',
      `Messaging with ${post.user?.display_name || post.user?.username} will be available soon! This will open a chat interface.`
    )
  }

  const handleRemovePost = async (post: WantedBoardPost) => {
    if (!user || post.user_id !== user.id) return
    
    const confirmed = await confirm({
      title: 'Remove Wanted Post',
      message: `Are you sure you want to remove "${post.cards?.set_name}" from the wanted board?`,
      type: 'warning',
      confirmText: 'Remove Post'
    })

    if (!confirmed) return

    setRemovingPost(post.set_id)
    try {
      const result = await wantedBoardService.removeWantedBoardPost(user.id, post.set_id)
      if (result.success) {
        // Remove from local state
        setPosts(prev => prev.filter(p => p.set_id !== post.set_id))
        // Update stats
        setStats(prev => ({ ...prev, totalPosts: prev.totalPosts - 1 }))
        showSuccess('Post Removed', `"${post.cards?.set_name}" has been removed from the wanted board.`)
      } else {
        showError('Failed to Remove Post', result.error || 'An error occurred while removing the post.')
      }
    } catch (error) {
      console.error('Error removing post:', error)
      showError('Failed to Remove Post', 'An error occurred while removing the post. Please try again.')
    } finally {
      setRemovingPost(null)
    }
  }

  const handleCardSelection = (selectedCards: Array<{
    set_id: string
    set_name: string
    image_small: string
    cardmarket_prices_suggested_price?: number
  }>) => {
    if (!cardSelectionData || !user) return

    const { post } = cardSelectionData

    console.log('Selected cards for wanted board trade:', selectedCards)

    // Store selected cards and open the wanted board trade modal
    setSelectedCardsForTrade(selectedCards)
    setCurrentTradePost(post)
    setShowCardSelection(false)
    setCardSelectionData(null)
    setShowWantedBoardTradeModal(true)
  }

  const closeCardSelection = () => {
    setShowCardSelection(false)
    setCardSelectionData(null)
  }

  const closeWantedBoardTradeModal = () => {
    setShowWantedBoardTradeModal(false)
    setSelectedCardsForTrade([])
    setCurrentTradePost(null)
  }

  const handleTradeCreated = () => {
    // Refresh the wanted board data after a trade is created
    loadWantedBoardData()
  }

  const handleCardClick = (cardId: string) => {
    setSelectedCardId(cardId)
    setShowCardModal(true)
  }

  const handleCloseCardModal = () => {
    setShowCardModal(false)
    setSelectedCardId(null)
  }

  // Only show loading skeleton if loading is true AND we don't have initial data yet
  const showLoadingSkeleton = loading && !hasInitialData

  if (showLoadingSkeleton) {
    return (
      <div className={`bg-pkmn-cards rounded-xl p-6 border border-gray-700/50 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-pkmn-cards rounded-xl border border-gray-700/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Star className="w-5 h-5 flavor_text-orange-400" />
            </div>
            <div>
              <h3 className="flavor_text-xl font-bold flavor_text-white">Wanted Board</h3>
              <p className="flavor_text-gray-400 flavor_text-sm">Community marketplace for wanted cards</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-pkmn-surface rounded-lg p-3">
            <div className="flavor_text-2xl font-bold flavor_text-white">{stats.totalPosts}</div>
            <div className="flavor_text-xs flavor_text-gray-400">Total Posts</div>
          </div>
          <div className="bg-pkmn-surface rounded-lg p-3">
            <div className="flavor_text-2xl font-bold flavor_text-white">{stats.totalUsers}</div>
            <div className="flavor_text-xs flavor_text-gray-400">Active Users</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {posts.length === 0 ? (
          <div className="flavor_text-center py-8">
            <Star className="w-16 h-16 mx-auto mb-4 flavor_text-gray-400 opacity-50" />
            <h3 className="flavor_text-xl font-semibold flavor_text-gray-400 mb-2">No Wanted Posts</h3>
            <p className="flavor_text-gray-500 mb-4">Be the first to post cards you want!</p>
            <Link href="/wishlist" className="btn-gaming">
              Post Your Wishlist
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.slice(0, 5).map((post) => {
              const userOwnsCard = userOwnedCards.includes(post.card_id)
              const isOwnPost = user?.id === post.user_id

              return (
                <div
                  key={post.set_id}
                  className={`bg-pkmn-surface rounded-lg p-4 border ${
                    userOwnsCard ? 'border-green-500/50 bg-green-500/5' : 'border-gray-600'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    {/* Card Image */}
                    <div
                      className="w-16 h-24 relative flex-shrink-0 cursor-pointer hover:scale-105 transition-transform duration-200"
                      onClick={() => handleCardClick(post.card_id)}
                      title="Click to view cards details"
                    >
                      {post.cards?.image_small || post.cards?.image_large ? (
                        <Image
                          src={(post.cards.image_small || post.cards.image_large) as string}
                          alt={post.cards?.set_name || 'Card'}
                          fill
                          className="rounded object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-700 rounded flex items-center justify-center">
                          <span className="flavor_text-xs flavor_text-gray-400">No Image</span>
                        </div>
                      )}
                      {userOwnsCard && (
                        <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
                          <AlertCircle className="w-4 h-4 flavor_text-white" />
                        </div>
                      )}
                    </div>

                    {/* Card Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold flavor_text-white truncate">
                            {post.cards?.set_name}
                          </h4>
                          <p className="flavor_text-sm flavor_text-gray-400">
                            {post.cards?.sets?.set_name} • {post.cards?.rarity}
                          </p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="flavor_text-xs flavor_text-gray-500">
                              Max: {formatPrice(post.max_price_eur)}
                            </span>
                            <span className="flavor_text-xs flavor_text-gray-500 capitalize">
                              {post.condition_preference.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        {/* User Info */}
                        <div className="flavor_text-right">
                          <div className="flex items-center space-x-2">
                            {post.user?.avatar_url ? (
                              <Image
                                src={post.user.avatar_url}
                                alt={post.user.display_name || post.user.username || 'User'}
                                width={24}
                                height={24}
                                className="rounded-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                                <span className="flavor_text-xs flavor_text-gray-300 font-medium">
                                  {(post.user?.display_name || post.user?.username || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <Link
                              href={`/profile/${post.user?.set_id}`}
                              className="flavor_text-sm flavor_text-white hover:flavor_text-blue-400 transition-colors cursor-pointer"
                            >
                              {post.user?.display_name || post.user?.username}
                            </Link>
                          </div>
                          <p className="flavor_text-xs flavor_text-gray-500 mt-1">
                            {new Date(post.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Notes */}
                      {post.notes && (
                        <div className="mt-2 p-2 bg-gray-700/50 rounded flavor_text-xs flavor_text-gray-300">
                          {post.notes}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="mt-3">
                        {!isOwnPost && userOwnsCard && (
                          <div className="flex items-center space-x-2 mb-2">
                            <button
                              onClick={() => handleInitiateTrade(post)}
                              className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 flavor_text-white px-3 py-1 rounded flavor_text-xs font-medium transition-colors"
                            >
                              <ArrowLeftRight className="w-3 h-3" />
                              <span>Offer Trade</span>
                            </button>
                            <button
                              onClick={() => handleContactUser(post)}
                              className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 flavor_text-white px-3 py-1 rounded flavor_text-xs font-medium transition-colors"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>Message</span>
                            </button>
                          </div>
                        )}

                        {isOwnPost && (
                          <div className="flex items-center space-x-2 mb-2">
                            <button
                              onClick={() => handleRemovePost(post)}
                              disabled={removingPost === post.set_id}
                              className="flex items-center space-x-1 bg-red-600 hover:bg-red-700 flavor_text-white px-3 py-1 rounded flavor_text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              <X className="w-3 h-3" />
                              <span>{removingPost === post.set_id ? 'Removing...' : 'Remove'}</span>
                            </button>
                          </div>
                        )}

                        {userOwnsCard && (
                          <div className="flex items-center space-x-1 flavor_text-green-400 flavor_text-xs">
                            <AlertCircle className="w-3 h-3" />
                            <span>You have this cards!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Card Selection Modal */}
      {cardSelectionData && (
        <CardSelectionModal
          isOpen={showCardSelection}
          onClose={closeCardSelection}
          cards={cardSelectionData.availableCards}
          recipientName={cardSelectionData.post.user?.display_name || cardSelectionData.post.user?.username || 'User'}
          onSelectCards={handleCardSelection}
        />
      )}

      {/* Wanted Board Trade Modal */}
      {currentTradePost && (
        <WantedBoardTradeModal
          isOpen={showWantedBoardTradeModal}
          onClose={closeWantedBoardTradeModal}
          post={currentTradePost}
          selectedCards={selectedCardsForTrade}
          onTradeCreated={handleTradeCreated}
        />
      )}

      {/* Card Details Modal */}
      <CardDetailsModal
        cardId={selectedCardId}
        isOpen={showCardModal}
        onClose={handleCloseCardModal}
      />
    </div>
  )
}
