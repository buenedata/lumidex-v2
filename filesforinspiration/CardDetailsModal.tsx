'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Dialog, Transition, Tab } from '@headlessui/react'
import { Fragment } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePreferredCurrency } from '@/contexts/UserPreferencesContext'
import { currencyService } from '@/lib/currency-service'
import { useI18n } from '@/contexts/I18nContext'
import { supabase } from '@/lib/supabase'
import { CollectionButtons, getAvailableVariants } from './CollectionButtons'
import { inferVariants } from '@/lib/variant-rule-engine'
import { PriceGraph } from './PriceGraph'
import { CardVariant, CardCollectionData } from '@/types/pokemon'
import { cardSocialService, FriendCardOwnership, WishlistItem } from '@/lib/card-social-service'
import { FriendsWithCardModal } from './FriendsWithCardModal'
import { WishlistSelectionModal } from './WishlistSelectionModal'
import { useToast } from '@/components/ui/ToastContainer'
import { achievementService } from '@/lib/achievement-service'
import { toastService } from '@/lib/toast-service'
import { wishlistService } from '@/lib/wishlist-service'
import { PriceDisplay } from '@/components/PriceDisplay'
import { FallbackImage } from '@/components/ui/FallbackImage'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { getCorrectCardMarketUrl } from '@/lib/card-url-corrections'
import { manualVariantsService, ManualVariant } from '@/lib/manual-variants-service'
import {
  X,
  ExternalLink,
  Calendar,
  Hash,
  Star,
  TrendingUp,
  DollarSign,
  Package,
  Loader2,
  BarChart3,
  Users,
  Heart,
  Bell,
  Share2,
  Eye,
  StickyNote,
  Edit3
} from 'lucide-react'

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null

  const debounced = ((...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait)
  }) as T & { cancel: () => void }

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  return debounced
}

// Types
interface CardData {
  id: string
  set_name: string
  number: string
  set_id: string
  rarity: string
  type: string[]
  image_small: string
  image_large: string
  cardmarket_url: string | null
  cardmarket_avg_sell_price: number | null
  cardmarket_low_price: number | null
  cardmarket_trend_price: number | null
  cardmarket_reverse_holo_sell: number | null
  cardmarket_reverse_holo_low: number | null
  cardmarket_reverse_holo_trend: number | null
  cardmarket_avg_7_days: number | null
  cardmarket_avg_30_days: number | null
  created_at: string
  sets?: {
    set_name: string
    symbol_url: string | null
    release_date: string
  }
}

interface CardDetailsModalProps {
  cardId: string | null
  isOpen: boolean
  onClose: () => void
  onCollectionChange?: (cardId: string, collectionData: CardCollectionData | null) => void
  onWishlistChange?: () => void
  supabaseClient?: any
}

// Loading states enum
enum LoadingState {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}

export function CardDetailsModal({ cardId, isOpen, onClose, onCollectionChange, onWishlistChange, supabaseClient }: CardDetailsModalProps) {
  const { user } = useAuth()
  const router = useRouter()
  const preferredCurrency = usePreferredCurrency()
  const { locale } = useI18n()
  
  // Use provided client or fall back to default
  const activeSupabase = supabaseClient || supabase
  
  // Consolidated state
  const [cardState, setCardState] = useState<{
    data: CardData | null
    loadingState: LoadingState
    error: string | null
  }>({
    data: null,
    loadingState: LoadingState.IDLE,
    error: null
  })

  const [collectionState, setCollectionState] = useState<{
    data: CardCollectionData | null
    loading: boolean
  }>({
    data: null,
    loading: false
  })

  // Social features state
  const [socialState, setSocialState] = useState<{
    friendsWithCard: FriendCardOwnership[]
    wishlistItem: WishlistItem | null
    loadingFriends: boolean
    loadingWishlist: boolean
  }>({
    friendsWithCard: [],
    wishlistItem: null,
    loadingFriends: false,
    loadingWishlist: false
  })

  // Modal states
  const [showFriendsModal, setShowFriendsModal] = useState(false)
  const [showWishlistModal, setShowWishlistModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showQuantityModal, setShowQuantityModal] = useState(false)
  
  // Manual variants state
  const [manualVariants, setManualVariants] = useState<ManualVariant[]>([])
  const [manualVariantCollection, setManualVariantCollection] = useState<{ [variantId: string]: number }>({})
  const [loadingManualVariants, setLoadingManualVariants] = useState(false)
  const [quantityInputs, setQuantityInputs] = useState<Record<CardVariant, number>>({
    normal: 0,
    holo: 0,
    reverse_holo: 0,
    pokeball_pattern: 0,
    masterball_pattern: 0,
    '1st_edition': 0
  })
  const [manualQuantityInputs, setManualQuantityInputs] = useState<Record<string, number>>({})
  const [confirmAction, setConfirmAction] = useState<{
    type: 'remove' | 'add'
    cardName: string
    onConfirm: () => void
  } | null>(null)
  
  // Toast hook
  const { showToast } = useToast()

  // Debounced fetch function
  const fetchCard = useCallback(async (set_id: string, retryCount = 0) => {
    setCardState(prev => ({
      ...prev,
      loadingState: LoadingState.LOADING,
      error: null,
      data: null
    }))

    try {
      // Add a images_small delay to ensure Supabase connection is ready after tab switching
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
      }

      // Test connection first with a timeout to detect staleness quickly
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout - possible stale connection')), 2000)
      )

      const queryPromise = activeSupabase
        .from('tcg_cards')
        .select(`
          *,
          tcg_sets!inner(set_name, symbol_url, release_date)
        `)
        .eq('set_id', set_id)
        .single()

      const result = await Promise.race([queryPromise, timeoutPromise])
      const { data, error } = result

      if (error) {
        console.error('CardDetailsModal: Supabase error:', error)
        throw error
      }

      if (!data) {
        throw new Error('No data returned from query')
      }

      setCardState({
        data,
        loadingState: LoadingState.SUCCESS,
        error: null
      })
    } catch (error: any) {
      console.error('CardDetailsModal: Error fetching cards:', error, 'Retry count:', retryCount)
      
      // Check if this looks like a connection staleness issue
const isConnectionIssue = error.message?.includes('timeout') ||
                      error.message?.includes('Connection') ||
                      error.code === 'PGRST301' ||
                      error.code === 'PGRST116'
      
      if (isConnectionIssue && retryCount === 0) {
        setCardState({
          data: null,
          loadingState: LoadingState.ERROR,
          error: 'Connection issue detected. Please refresh the page to restore functionality.'
        })
        return
      }
      
      // Retry up to 2 times with increasing delays for other errors
      if (retryCount < 2 && !isConnectionIssue) {
        setTimeout(() => {
          fetchCard(set_id, retryCount + 1)
        }, (retryCount + 1) * 1000)
      } else {
        setCardState({
          data: null,
          loadingState: LoadingState.ERROR,
          error: `Failed to load cards details: ${error.message || 'Unknown error'}`
        })
      }
    }
  }, [])

  // Memoized debounced fetch
  const debouncedFetchCard = useMemo(
    () => debounce(fetchCard, 300),
    [fetchCard]
  )

  // Fetch user collection data
  const fetchUserCollection = useCallback(async (set_id: string) => {
    if (!user) return

    setCollectionState(prev => ({ ...prev, loading: true }))

    try {
      const { data, error } = await activeSupabase
        .from('user_collections')
        .select('*')
        .eq('user_id', user.id)
        .eq('card_id', set_id)

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data && data.length > 0) {
        // Aggregate variants
        const variants = {
          normal: 0,
          holo: 0,
          reverseHolo: 0,
          pokeballPattern: 0,
          masterballPattern: 0,
          firstEdition: 0
        }

        let totalQuantity = 0
        let earliestDate = data[0].created_at
        let latestUpdate = data[0].updated_at

        data.forEach((item: any) => {
          totalQuantity += item.quantity
          if (item.created_at < earliestDate) earliestDate = item.created_at
          if (item.updated_at > latestUpdate) latestUpdate = item.updated_at

          switch (item.variant) {
            case 'normal':
              variants.normal += item.quantity
              break
            case 'holo':
              variants.holo += item.quantity
              break
            case 'reverse_holo':
              variants.reverseHolo += item.quantity
              break
            case 'pokeball_pattern':
              variants.pokeballPattern += item.quantity
              break
            case 'masterball_pattern':
              variants.masterballPattern += item.quantity
              break
            case '1st_edition':
              variants.firstEdition += item.quantity
              break
            case 'manual':
              // Manual variants are counted in totalQuantity but not in specific variant counts
              // The manual variant buttons handle their own quantities separately
              break
          }
        })

        setCollectionState({
          data: {
            cardId: set_id,
            userId: user.id,
            ...variants,
            totalQuantity,
            dateAdded: earliestDate,
            lastUpdated: latestUpdate
          },
          loading: false
        })
      } else {
        setCollectionState({
          data: null,
          loading: false
        })
      }
    } catch (error) {
      console.error('Error fetching user collection:', error)
      setCollectionState({
        data: null,
        loading: false
      })
    }
  }, [user])

  // Fetch social data (friends with cards, wishlist status)
  const fetchSocialData = useCallback(async (cardId: string) => {
    if (!user) return

    setSocialState(prev => ({ ...prev, loadingFriends: true, loadingWishlist: true }))

    try {
      // Check friends who have this card
      const friendsResult = await cardSocialService.getFriendsWithCard(user.id, cardId)
      
      // Check if card is in user's wishlist
      const wishlistResult = await cardSocialService.isInWishlist(user.id, cardId)

      setSocialState({
        friendsWithCard: friendsResult.success ? friendsResult.data || [] : [],
        wishlistItem: wishlistResult.success && wishlistResult.inWishlist ? wishlistResult.data || null : null,
        loadingFriends: false,
        loadingWishlist: false
      })
    } catch (error) {
      console.error('Error fetching social data:', error)
      setSocialState(prev => ({
        ...prev,
        loadingFriends: false,
        loadingWishlist: false
      }))
    }
  }, [user])

  // Fetch manual variants for the cards
  const fetchManualVariants = useCallback(async (cardId: string) => {
    setLoadingManualVariants(true)
    try {
      const variants = await manualVariantsService.getManualVariantsForCard(cardId)
      setManualVariants(variants)
      
      // If user is provided, fetch their collection data for manual variants
      if (user) {
        const collection = await manualVariantsService.getUserManualVariantCollection(user.id, cardId)
        setManualVariantCollection(collection)
      }
    } catch (error) {
      console.error('Error fetching manual variants:', error)
      setManualVariants([])
      setManualVariantCollection({})
    } finally {
      setLoadingManualVariants(false)
    }
  }, [user])

  // Social action handlers
  const handleCheckFriendsWithCard = async (cardId: string) => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    setSocialState(prev => ({ ...prev, loadingFriends: true }))
    
    try {
      const result = await cardSocialService.getFriendsWithCard(user.id, cardId)
      
      if (result.success) {
        const friendsWithCard = result.data?.filter(f => f.owns_card) || []
        
        setSocialState(prev => ({
          ...prev,
          friendsWithCard: friendsWithCard,
          loadingFriends: false
        }))
        
        if (friendsWithCard.length > 0) {
          // Show professional modal with trade options
          setShowFriendsModal(true)
        } else {
          // Show toast notification
          showToast('No friends have this cards', 'None of your friends have this cards in their collection yet.', 'info')
        }
      } else {
        console.error('Service error:', result.error)
        showToast('Error checking friends', result.error || 'Failed to check friends', 'error')
        setSocialState(prev => ({ ...prev, loadingFriends: false }))
      }
    } catch (error) {
      console.error('Exception caught:', error)
      showToast('Error checking friends', 'Failed to check friends', 'error')
      setSocialState(prev => ({ ...prev, loadingFriends: false }))
    }
  }

  const handleToggleWishlist = async (cardId: string) => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    const isCurrentlyInWishlist = socialState.wishlistItem !== null
    const cardName = cardState.data?.set_name || 'this cards'
    
    if (isCurrentlyInWishlist) {
      // Show confirmation modal for removal
      setConfirmAction({
        type: 'remove',
        cardName,
        onConfirm: () => performWishlistRemoval(cardId)
      })
      setShowConfirmModal(true)
    } else {
      // Open wishlist selection modal for adding
      setShowWishlistModal(true)
    }
  }

  const performWishlistRemoval = async (cardId: string) => {
    if (!user) return
    
    setSocialState(prev => ({ ...prev, loadingWishlist: true }))
    
    try {
      const result = await cardSocialService.removeFromWishlist(user.id, cardId)
      
      if (result.success) {
        setSocialState(prev => ({
          ...prev,
          wishlistItem: null,
          loadingWishlist: false
        }))
        showToast('Removed from wishlist!', 'Card has been removed from your wishlist', 'success')
        // Notify parent component about wishlist change
        onWishlistChange?.()
      } else {
        showToast('Error removing from wishlist', result.error || 'Please try again later', 'error')
        setSocialState(prev => ({ ...prev, loadingWishlist: false }))
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error)
      showToast('Failed to update wishlist', 'An unexpected error occurred', 'error')
      setSocialState(prev => ({ ...prev, loadingWishlist: false }))
    } finally {
      setShowConfirmModal(false)
      setConfirmAction(null)
    }
  }

  const handleWishlistModalClose = () => {
    setShowWishlistModal(false)
    // Refresh social data to check if cards was added to wishlist
    if (cardState.data) {
      fetchSocialData(cardState.data.set_id)
    }
    // Notify parent component about potential wishlist change
    onWishlistChange?.()
  }

  const handleShareCard = async (cardId: string, cardName: string) => {
    try {
      const result = await cardSocialService.shareCard(cardId, 'link')
      
      if (result.success && result.shareData) {
        // Try to use Web Share API if available
        if (navigator.share) {
          await navigator.share({
            title: result.shareData.title,
            text: result.shareData.description,
            url: result.shareData.cardmarket_url
          })
        } else {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(result.shareData.cardmarket_url)
          alert('Card link copied to clipboard!')
        }
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error sharing cards:', error)
      alert('Failed to share cards')
    }
  }

  const handleSetPriceAlert = async (cardId: string) => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    // Simple prompt for now - could be enhanced with a proper modal
    const targetPrice = prompt('Enter target cardmarket_prices_suggested_price in EUR (you\'ll be notified when the cardmarket_prices_suggested_price drops below this):')
    
    if (targetPrice && !isNaN(Number(targetPrice))) {
      try {
        const result = await cardSocialService.setPriceAlert(user.id, cardId, Number(targetPrice))
        
        if (result.success) {
          alert('Price alert sets successfully!')
        } else {
          alert(`Error: ${result.error}`)
        }
      } catch (error) {
        console.error('Error setting cardmarket_prices_suggested_price alert:', error)
        alert('Failed to sets cardmarket_prices_suggested_price alert')
      }
    }
  }


  // Effects
  useEffect(() => {
    if (isOpen && cardId) {
      // Always fetch if cardId is different from current data, or if we don't have data
      const needsFetch = !cardState.data || cardState.data.set_id !== cardId
      
      if (needsFetch) {
        setCardState({
          data: null,
          loadingState: LoadingState.LOADING, // Set to LOADING immediately
          error: null
        })
        setCollectionState({
          data: null,
          loading: false
        })

        // Fetch cards data immediately (no debounce for initial load)
        fetchCard(cardId)
        
        // Fetch collection data if user is logged in
        if (user) {
          fetchUserCollection(cardId)
          fetchSocialData(cardId)
        }
        
        // Fetch manual variants (for all users)
        fetchManualVariants(cardId)
      } else {
        // If we already have the correct cards data, just ensure we're in success state
        if (cardState.loadingState !== LoadingState.SUCCESS) {
          setCardState(prev => ({
            ...prev,
            loadingState: LoadingState.SUCCESS
          }))
        }
      }
    }

    // Cleanup on close
    if (!isOpen) {
      debouncedFetchCard.cancel()
      // Clear the cards state when modal is closed to ensure fresh fetch next time
      setCardState({
        data: null,
        loadingState: LoadingState.IDLE,
        error: null
      })
    }

    return () => {
      debouncedFetchCard.cancel()
    }
  }, [isOpen, cardId, user, fetchCard, fetchUserCollection, debouncedFetchCard])

  // Additional effect to handle tab switching restoration and stuck loading states
  useEffect(() => {
    if (isOpen && cardId && cardState.loadingState === LoadingState.LOADING) {
      // Set a timeout to detect if we're stuck in loading state
      const timeoutId = setTimeout(() => {
        // Instead of retrying, suggest page refresh for connection staleness
        setCardState({
          data: null,
          loadingState: LoadingState.ERROR,
          error: 'Loading timeout. The connection may be stale after tab switching. Please refresh the page.'
        })
      }, 3000) // 3 second timeout

      return () => clearTimeout(timeoutId)
    }
  }, [isOpen, cardId, cardState.loadingState])

  // Effect to handle when modal opens with different cards while previous cards data exists
  useEffect(() => {
    if (isOpen && cardId && cardState.data && cardState.data.set_id !== cardId) {
      setCardState({
        data: null,
        loadingState: LoadingState.LOADING,
        error: null
      })
      fetchCard(cardId)
    }
  }, [isOpen, cardId, cardState.data, fetchCard])

  // Collection management functions
  const handleToggleCollection = async (cardId: string) => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    setCollectionState(prev => ({ ...prev, loading: true }))
    
    try {
      const isInCollection = (collectionState.data?.totalQuantity ?? 0) > 0
      
      if (isInCollection) {
        // Remove from collection
        const { error } = await activeSupabase
          .from('user_collections')
          .delete()
          .eq('user_id', user.id)
          .eq('card_id', cardId)

        if (!error) {
          setCollectionState({ data: null, loading: false })
          onCollectionChange?.(cardId, null)
          
          // Check for achievement revocations after removing from collection
          try {
            const achievementResult = await achievementService.checkAchievements(user.id)
            if (achievementResult.success) {
              // Show toasts for revoked achievements
              if (achievementResult.revokedAchievements && achievementResult.revokedAchievements.length > 0) {
                achievementResult.revokedAchievements.forEach(achievementType => {
                  const definition = achievementService.getAchievementDefinition(achievementType)
                  if (definition) {
                    toastService.warning(`Achievement Revoked: ${definition.set_name}`, 'Collection no longer meets requirements')
                  }
                })
              }
            }
          } catch (achievementError) {
            console.warn('Failed to check achievements:', achievementError)
          }
        }
      } else {
        // Add to collection
        const { error } = await activeSupabase
          .from('user_collections')
          .insert({
            user_id: user.id,
            card_id: cardId,
            variant: 'normal',
            quantity: 1,
            condition: 'near_mint',
            is_foil: false
          })

        if (!error) {
          const newCollectionData: CardCollectionData = {
            cardId,
            userId: user.id,
            normal: 1,
            holo: 0,
            reverseHolo: 0,
            pokeballPattern: 0,
            masterballPattern: 0,
            firstEdition: 0,
            totalQuantity: 1,
            dateAdded: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          }
          setCollectionState({ data: newCollectionData, loading: false })
          onCollectionChange?.(cardId, newCollectionData)
          
          // Remove cards from wishlist if it exists there
          try {
            const wishlistRemovalResult = await wishlistService.removeFromWishlistByCardId(user.id, cardId)
          } catch (wishlistError) {
            console.warn('Failed to remove cards from wishlist:', wishlistError)
            // Don't fail the collection operation if wishlist removal fails
          }
          
          // Check for achievements after adding to collection
          try {
            const achievementResult = await achievementService.checkAchievements(user.id)
            if (achievementResult.success) {
              // Show toasts for new achievements
              if (achievementResult.newAchievements && achievementResult.newAchievements.length > 0) {
                achievementResult.newAchievements.forEach(achievement => {
                  const definition = achievementService.getAchievementDefinition(achievement.achievement_type)
                  if (definition) {
                    toastService.achievement(`Achievement Unlocked: ${definition.set_name}`, definition.description, definition.icon)
                  }
                })
              }
            }
          } catch (achievementError) {
            console.warn('Failed to check achievements:', achievementError)
          }
        }
      }
    } catch (error) {
      console.error('Error toggling collection:', error)
      setCollectionState(prev => ({ ...prev, loading: false }))
    }
  }

  const handleAddVariant = async (cardId: string, variant: CardVariant) => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    setCollectionState(prev => ({ ...prev, loading: true }))
    
    try {
      // Check if variant exists
      const { data: existingVariant, error: checkError } = await activeSupabase
        .from('user_collections')
        .select('*')
        .eq('user_id', user.id)
        .eq('card_id', cardId)
        .eq('variant', variant as any)
        .eq('condition', 'near_mint')
        .eq('is_foil', false)
        .single()

      if (checkError && checkError.set_ptcgo_code !== 'PGRST116') {
        throw checkError
      }

      if (existingVariant) {
        // Update quantity
        const { error } = await activeSupabase
          .from('user_collections')
          .update({
            quantity: existingVariant.quantity + 1,
            updated_at: new Date().toISOString()
          })
          .eq('set_id', existingVariant.set_id)

        if (error) throw error
      } else {
        // Insert new variant
        const { error } = await activeSupabase
          .from('user_collections')
          .insert({
            user_id: user.id,
            card_id: cardId,
            variant: variant as any,
            quantity: 1,
            condition: 'near_mint',
            is_foil: false
          })

        if (error) throw error
      }

      // Update local state
      const current = collectionState.data || {
        cardId,
        userId: user.id,
        normal: 0,
        holo: 0,
        reverseHolo: 0,
        pokeballPattern: 0,
        masterballPattern: 0,
        firstEdition: 0,
        totalQuantity: 0,
        dateAdded: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }
      
      const variantKey = variant === 'reverse_holo' ? 'reverseHolo' :
                        variant === 'pokeball_pattern' ? 'pokeballPattern' :
                        variant === 'masterball_pattern' ? 'masterballPattern' :
                        variant === '1st_edition' ? 'firstEdition' : variant
      
      const updatedData = {
        ...current,
        [variantKey]: (current[variantKey] || 0) + 1,
        totalQuantity: (current.totalQuantity || 0) + 1,
        lastUpdated: new Date().toISOString()
      }
      
      setCollectionState({ data: updatedData, loading: false })
      onCollectionChange?.(cardId, updatedData)

      // Remove cards from wishlist if it exists there
      try {
        const wishlistRemovalResult = await wishlistService.removeFromWishlistByCardId(user.id, cardId)
      } catch (wishlistError) {
        console.warn('Failed to remove cards from wishlist:', wishlistError)
        // Don't fail the collection operation if wishlist removal fails
      }

      // Check for achievements after adding variant
      try {
        const achievementResult = await achievementService.checkAchievements(user.id)
        if (achievementResult.success) {
          // Show toasts for new achievements
          if (achievementResult.newAchievements && achievementResult.newAchievements.length > 0) {
            achievementResult.newAchievements.forEach(achievement => {
              const definition = achievementService.getAchievementDefinition(achievement.achievement_type)
              if (definition) {
                toastService.achievement(`Achievement Unlocked: ${definition.set_name}`, definition.description, definition.icon)
              }
            })
          }
        }
      } catch (achievementError) {
        console.warn('Failed to check achievements:', achievementError)
      }
    } catch (error) {
      console.error('Error adding variant:', error)
      setCollectionState(prev => ({ ...prev, loading: false }))
    }
  }

  // Smart quantity input handlers
  const handleOpenQuantityModal = () => {
    // Initialize quantity inputs with current value (or zeros if not in collection)
    const currentQuantities: Record<CardVariant, number> = {
      normal: collectionState.data?.normal || 0,
      holo: collectionState.data?.holo || 0,
      reverse_holo: collectionState.data?.reverseHolo || 0,
      pokeball_pattern: collectionState.data?.pokeballPattern || 0,
      masterball_pattern: collectionState.data?.masterballPattern || 0,
      '1st_edition': collectionState.data?.firstEdition || 0
    }
    
    // Initialize manual variant quantities
    const currentManualQuantities: Record<string, number> = {}
    manualVariants.forEach(variant => {
      currentManualQuantities[variant.set_id] = manualVariantCollection[variant.set_id] || 0
    })
    
    setQuantityInputs(currentQuantities)
    setManualQuantityInputs(currentManualQuantities)
    setShowQuantityModal(true)
  }

  const handleQuantityChange = (variant: CardVariant, newQuantity: number) => {
    setQuantityInputs(prev => ({
      ...prev,
      [variant]: Math.max(0, newQuantity)
    }))
  }

  const handleManualQuantityChange = (variantId: string, newQuantity: number) => {
    setManualQuantityInputs(prev => ({
      ...prev,
      [variantId]: Math.max(0, newQuantity)
    }))
  }

  const handleSaveQuantities = async () => {
    if (!user || !cardState.data) return
    
    setCollectionState(prev => ({ ...prev, loading: true }))
    
    try {
      // First, delete all existing entries for this cards (both standard and manual variants)
      const { error: deleteError } = await activeSupabase
        .from('user_collections')
        .delete()
        .eq('user_id', user.id)
        .eq('card_id', cardState.data.set_id)

      if (deleteError) {
        throw deleteError
      }

      // Prepare new entries for standard variants with quantity > 0
      const newEntries = []
      const variants = [
        { variant: 'normal', quantity: quantityInputs.normal },
        { variant: 'holo', quantity: quantityInputs.holo },
        { variant: 'reverse_holo', quantity: quantityInputs.reverse_holo },
        { variant: 'pokeball_pattern', quantity: quantityInputs.pokeball_pattern },
        { variant: 'masterball_pattern', quantity: quantityInputs.masterball_pattern },
        { variant: '1st_edition', quantity: quantityInputs['1st_edition'] }
      ]

      // Create entries for standard variants with quantity > 0
      for (const { variant, quantity } of variants) {
        if (quantity > 0) {
          newEntries.push({
            user_id: user.id,
            card_id: cardState.data.set_id,
            variant: variant,
            quantity: quantity,
            condition: 'near_mint',
            is_foil: false
          })
        }
      }

      // Create entries for manual variants with quantity > 0
      for (const [variantId, quantity] of Object.entries(manualQuantityInputs)) {
        if (quantity > 0) {
          newEntries.push({
            user_id: user.id,
            card_id: cardState.data.set_id,
            variant: 'manual',
            quantity: quantity,
            condition: 'near_mint',
            is_foil: false,
            manual_variant_id: variantId
          })
        }
      }

      // Insert new entries if any
      if (newEntries.length > 0) {
        const { error: insertError } = await activeSupabase
          .from('user_collections')
          .insert(newEntries)

        if (insertError) {
          throw insertError
        }
      }

      // Update local state immediately
      const standardTotal = Object.values(quantityInputs).reduce((sum, qty) => sum + qty, 0)
      const manualTotal = Object.values(manualQuantityInputs).reduce((sum, qty) => sum + qty, 0)
      const totalQuantity = standardTotal + manualTotal
      
      if (totalQuantity > 0) {
        const newCollectionData: CardCollectionData = {
          cardId: cardState.data.set_id,
          userId: user.id,
          normal: quantityInputs.normal,
          holo: quantityInputs.holo,
          reverseHolo: quantityInputs.reverse_holo,
          pokeballPattern: quantityInputs.pokeball_pattern,
          masterballPattern: quantityInputs.masterball_pattern,
          firstEdition: quantityInputs['1st_edition'],
          totalQuantity,
          dateAdded: collectionState.data?.dateAdded || new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }
        setCollectionState({ data: newCollectionData, loading: false })
        onCollectionChange?.(cardState.data.set_id, newCollectionData)
      } else {
        setCollectionState({ data: null, loading: false })
        onCollectionChange?.(cardState.data.set_id, null)
      }

      // Update manual variant collection state
      setManualVariantCollection(manualQuantityInputs)

      setShowQuantityModal(false)
      showToast('Collection Updated', 'Card quantities have been updated instantly', 'success')
      
      // Remove cards from wishlist if it was added to collection
      if (totalQuantity > 0) {
        try {
          await wishlistService.removeFromWishlistByCardId(user.id, cardState.data.set_id)
        } catch (wishlistError) {
          console.warn('Failed to remove cards from wishlist:', wishlistError)
        }
      }

      // Refresh data to ensure consistency
      if (cardState.data) {
        fetchUserCollection(cardState.data.set_id)
        fetchManualVariants(cardState.data.set_id)
      }

      // Check for achievements
      try {
        const achievementResult = await achievementService.checkAchievements(user.id)
        if (achievementResult.success) {
          if (achievementResult.newAchievements && achievementResult.newAchievements.length > 0) {
            achievementResult.newAchievements.forEach(achievement => {
              const definition = achievementService.getAchievementDefinition(achievement.achievement_type)
              if (definition) {
                toastService.achievement(`Achievement Unlocked: ${definition.set_name}`, definition.description, definition.icon)
              }
            })
          }
          if (achievementResult.revokedAchievements && achievementResult.revokedAchievements.length > 0) {
            achievementResult.revokedAchievements.forEach(achievementType => {
              const definition = achievementService.getAchievementDefinition(achievementType)
              if (definition) {
                toastService.warning(`Achievement Revoked: ${definition.set_name}`, 'Collection no longer meets requirements')
              }
            })
          }
        }
      } catch (achievementError) {
        console.warn('Failed to check achievements:', achievementError)
      }
      
    } catch (error) {
      console.error('Error updating quantities:', error)
      showToast('Update Failed', 'Failed to update cards quantities', 'error')
      setCollectionState(prev => ({ ...prev, loading: false }))
    }
  }

  const handleRemoveVariant = async (cardId: string, variant: CardVariant) => {
    if (!user) return

    setCollectionState(prev => ({ ...prev, loading: true }))
    
    try {
      const { data: variantEntry, error: findError } = await activeSupabase
        .from('user_collections')
        .select('*')
        .eq('user_id', user.id)
        .eq('card_id', cardId)
        .eq('variant', variant as any)
        .single()

      if (findError) {
        console.error('Error finding variant:', findError)
        setCollectionState(prev => ({ ...prev, loading: false }))
        return
      }

      if (variantEntry.quantity > 1) {
        // Decrease quantity
        const { error } = await activeSupabase
          .from('user_collections')
          .update({
            quantity: variantEntry.quantity - 1,
            updated_at: new Date().toISOString()
          })
          .eq('set_id', variantEntry.set_id)

        if (error) throw error
      } else {
        // Remove variant completely
        const { error } = await activeSupabase
          .from('user_collections')
          .delete()
          .eq('set_id', variantEntry.set_id)

        if (error) throw error
      }

      // Update local state
      const current = collectionState.data
      if (!current) {
        setCollectionState({ data: null, loading: false })
        return
      }
      
      const variantKey = variant === 'reverse_holo' ? 'reverseHolo' :
                        variant === 'pokeball_pattern' ? 'pokeballPattern' :
                        variant === 'masterball_pattern' ? 'masterballPattern' :
                        variant === '1st_edition' ? 'firstEdition' : variant
      
      const newQuantity = Math.max(0, (current[variantKey] || 0) - 1)
      const newTotal = Math.max(0, (current.totalQuantity || 0) - 1)
      
      if (newTotal === 0) {
        setCollectionState({ data: null, loading: false })
        onCollectionChange?.(cardId, null)
      } else {
        const updatedData = {
          ...current,
          [variantKey]: newQuantity,
          totalQuantity: newTotal,
          lastUpdated: new Date().toISOString()
        }
        setCollectionState({ data: updatedData, loading: false })
        onCollectionChange?.(cardId, updatedData)
      // Check for achievement revocations after removing variant
      try {
        const achievementResult = await achievementService.checkAchievements(user.id)
        if (achievementResult.success) {
          // Show toasts for revoked achievements
          if (achievementResult.revokedAchievements && achievementResult.revokedAchievements.length > 0) {
            achievementResult.revokedAchievements.forEach(achievementType => {
              const definition = achievementService.getAchievementDefinition(achievementType)
              if (definition) {
                toastService.warning(`Achievement Revoked: ${definition.set_name}`, 'Collection no longer meets requirements')
              }
            })
          }
        }
      } catch (achievementError) {
        console.warn('Failed to check achievements:', achievementError)
      }
      }
    } catch (error) {
      console.error('Error removing variant:', error)
      setCollectionState(prev => ({ ...prev, loading: false }))
    }
  }

  // Utility functions - keeping simple for non-cardmarket_prices_suggested_price formatting
  const formatPrice = (cardmarket_prices_suggested_price: number | null | undefined, currency?: string): string => {
    if (!cardmarket_prices_suggested_price) return 'N/A'
    const targetCurrency = currency || preferredCurrency
    return currencyService.formatCurrency(cardmarket_prices_suggested_price, targetCurrency as any, locale)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getCardMarketUrl = (cards: CardData): string => {
    // First check if we have a corrected URL for this cards
    const correctedUrl = getCorrectCardMarketUrl(
      cards.set_id,
      cards.set_id,
      cards.number,
      cards.set_name,
      cards.cardmarket_url || undefined
    )
    
    if (correctedUrl) {
      return correctedUrl
    }
    
    // Use the original URL if available and no correction needed
    if (cards.cardmarket_url) {
      return cards.cardmarket_url
    }
    
    // Fallback to search
    if (cards.set_name) {
      return `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${encodeURIComponent(cards.set_name)}`
    }
    
    return `https://www.cardmarket.com/en/Pokemon/Products/Singles`
  }

  // Render loading state
  const renderLoading = () => (
    <div className="flex items-center justify-center py-20">
      <div className="flavor_text-center">
        <Loader2 className="w-8 h-8 animate-spin flavor_text-pokemon-gold mx-auto mb-4" />
        <p className="flavor_text-gray-400">Loading cards details...</p>
      </div>
    </div>
  )

  // Render error state
  const renderError = () => (
    <div className="flex items-center justify-center py-20">
      <div className="flavor_text-center max-w-md mx-auto">
        <div className="flavor_text-6xl mb-4 opacity-50">🃏</div>
        <h1 className="flavor_text-2xl font-bold flavor_text-white mb-2">Unable to Load Card</h1>
        <p className="flavor_text-gray-400 mb-4">{cardState.error || 'The requested cards could not be found.'}</p>
        {cardState.error?.includes('refresh') && (
          <button
            onClick={() => window.location.reload()}
            className="btn-gaming"
          >
            Refresh Page
          </button>
        )}
      </div>
    </div>
  )

  // Render cards content
  const renderCardContent = () => {
    const { data: cards } = cardState
    if (!cards) return null

    return (
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card Image */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-md">
              <div className="aspect-[2.5/3.5] relative">
                <FallbackImage
                  src={cards.image_large}
                  alt={cards.set_name}
                  fill
                  className="object-contain rounded-lg shadow-2xl transition-opacity duration-300"
                  sizes="(max-width: 768px) 90vw, (max-width: 1024px) 45vw, 35vw"
                  priority
                  fallbackSrc="/placeholder-cards.png"
                />
              </div>
            </div>
          </div>

          {/* Card Details */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h2 className="flavor_text-3xl font-bold flavor_text-white mb-4">{cards.set_name}</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center space-x-2">
                  <Hash className="w-5 h-5 flavor_text-pokemon-gold" />
                  <span className="flavor_text-gray-400">Number:</span>
                  <span className="flavor_text-white font-medium">#{cards.number}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 flavor_text-pokemon-gold" />
                  <span className="flavor_text-gray-400">Rarity:</span>
                  <span className="flavor_text-white font-medium">{cards.rarity}</span>
                </div>
                
                {cards.sets && (
                  <>
                    <div className="flex items-center space-x-2">
                      <Package className="w-5 h-5 flavor_text-pokemon-gold" />
                      <span className="flavor_text-gray-400">Set:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/sets/${cards.set_id}`)
                        }}
                        className="flavor_text-white font-medium hover:flavor_text-yellow-400 transition-colors underline decoration-dotted underline-offset-2"
                        title={`View ${cards.sets.set_name} sets`}
                      >
                        {cards.sets.set_name}
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5 flavor_text-pokemon-gold" />
                      <span className="flavor_text-gray-400">Released:</span>
                      <span className="flavor_text-white font-medium">
                        {formatDate(cards.sets.release_date)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Collection Management */}
              <div className="mb-6">
                <div className="bg-pkmn-surface rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="flavor_text-lg font-semibold flavor_text-white">Add to Your Collection</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenQuantityModal()
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 flavor_text-white rounded-md flavor_text-sm font-medium transition-colors"
                      title="Quick quantity input"
                    >
                      <Edit3 className="w-4 h-4" />
                      Set Quantities
                    </button>
                  </div>
                  
                  <div onClick={(e) => e.stopPropagation()}>
                    <h4 className="flavor_text-sm font-medium flavor_text-gray-300 mb-3">Standard Variants</h4>
                    <CollectionButtons
                      cards={(() => {
                        // Create cards input for variant rule engine
                        const cardInput = {
                          set_id: cards.set_id,
                          set_name: cards.set_name,
                          number: cards.number,
                          rarity: cards.rarity,
                          sets: {
                            set_id: cards.set_id,
                            set_name: cards.sets?.set_name || '',
                            set_series: 'Unknown', // We don't have this data, but it's required
                            releaseDate: cards.sets?.release_date || ''
                          },
                          type: cards.type || []
                        };
                        
                        // Run variant analysis
                        let variantAnalysis;
                        try {
                          variantAnalysis = inferVariants(cardInput);
                        } catch (error) {
                          console.warn('Variant analysis failed, falling back to legacy:', error);
                          variantAnalysis = null;
                        }
                        
                        return {
                          set_id: cards.set_id,
                          set_name: cards.set_name,
                          number: cards.number,
                          sets: {
                            set_id: cards.set_id,
                            set_name: cards.sets?.set_name || '',
                            release_date: cards.sets?.release_date || ''
                          },
                          rarity: cards.rarity as any,
                          type: (cards.type || []) as any,
                          set_images: {
                            images_small: cards.image_small || '',
                            images_large: cards.image_large || ''
                          },
                          cardmarket: {
                            averageSellPrice: cards.cardmarket_avg_sell_price || 0,
                            lowPrice: cards.cardmarket_low_price || 0,
                            trendPrice: cards.cardmarket_trend_price || 0
                          } as any,
                          availableVariants: getAvailableVariants(cards),
                          variantAnalysis: variantAnalysis
                        } as any;
                      })()}
                      collectionData={collectionState.data || undefined}
                      onToggleCollection={handleToggleCollection}
                      onAddVariant={handleAddVariant}
                      onRemoveVariant={handleRemoveVariant}
                      onManualVariantCountChange={() => {}} // No-op for modal
                      loading={collectionState.loading}
                      userId={user?.id}
                      showManualVariants={false} // Don't show manual variants in standard section
                    />
                    
                    {/* Manual Variants Section - Show separately */}
                    {manualVariants.length > 0 && (
                      <div className="mt-6">
                        <h4 className="flavor_text-sm font-medium flavor_text-gray-300 mb-3">Other Variants</h4>
                        <div className="space-y-3">
                          {manualVariants.map((variant) => {
                            const quantity = manualVariantCollection[variant.set_id] || 0;
                            const isActive = quantity > 0;
                            
                            // Check if this is a pokeball pattern variant
                            const isPokeball = variant.display_name ? (
                              variant.display_name.toLowerCase().includes('pokeball') ||
                              variant.display_name.toLowerCase().includes('poké ball') ||
                              variant.display_name.toLowerCase().includes('victini illustration')
                            ) : false
                            
                            // Check if this is a normal variant (should be yellow like standard normal)
                            const isNormalVariant = variant.display_name ? (
                              variant.display_name.toLowerCase().includes('non-holo') ||
                              variant.display_name.toLowerCase().includes('normal') ||
                              variant.display_name.toLowerCase().includes('non holo')
                            ) : false
                            
                            // Use appropriate button styling
                            const buttonClass = isPokeball
                              ? `variant-btn pokeball-btn ${isActive ? 'active' : ''} ${loadingManualVariants ? 'loading' : ''}`
                              : isNormalVariant
                              ? `variant-btn normal-btn ${isActive ? 'active' : ''} ${loadingManualVariants ? 'loading' : ''}`
                              : `variant-btn manual-variant-btn ${isActive ? 'active' : ''} ${loadingManualVariants ? 'loading' : ''}`
                            
                            // Use appropriate display set_name
                            const displayName = isPokeball ? 'Pokeball Pattern' : (variant.display_name || 'Unknown Variant')
                            const displaySubtext = isPokeball ? 'Found in Victini Illustration Collection' : null
                            const fullDisplayName = isPokeball ? 'Pokeball Pattern Found in Victini Illustration Collection' : (variant.display_name || 'Unknown Variant')
                            
                            return (
                              <div key={`manual-${variant.set_id}`} className="flex items-center gap-3">
                                <button
                                  className={buttonClass}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!user) return;
                                    
                                    try {
                                      const result = await manualVariantsService.addManualVariantToCollection(user.id, cards.set_id, variant.set_id);
                                      if (result.success) {
                                        // Update local state
                                        setManualVariantCollection(prev => ({
                                          ...prev,
                                          [variant.set_id]: (prev[variant.set_id] || 0) + 1
                                        }));
                                        // Refresh collection data
                                        fetchUserCollection(cards.set_id);
                                        // Also refresh manual variants to get latest state
                                        fetchManualVariants(cards.set_id);
                                      }
                                    } catch (error) {
                                      console.error('Error adding manual variant:', error);
                                    }
                                  }}
                                  onContextMenu={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!user || quantity === 0) return;
                                    
                                    try {
                                      const result = await manualVariantsService.removeManualVariantFromCollection(user.id, cards.set_id, variant.set_id);
                                      if (result.success) {
                                        // Update local state
                                        setManualVariantCollection(prev => ({
                                          ...prev,
                                          [variant.set_id]: Math.max(0, (prev[variant.set_id] || 0) - 1)
                                        }));
                                        // Refresh collection data
                                        fetchUserCollection(cards.set_id);
                                      }
                                    } catch (error) {
                                      console.error('Error removing manual variant:', error);
                                    }
                                  }}
                                  disabled={loadingManualVariants || !user}
                                  title={`${fullDisplayName} (${quantity})`}
                                >
                                  {quantity > 0 ? quantity : null}
                                </button>
                                
                                <div className="flex-1">
                                  <div className="flavor_text-sm font-medium flavor_text-white">
                                    {displayName}
                                  </div>
                                  {displaySubtext && (
                                    <div className="flavor_text-xs flavor_text-gray-400 mt-0.5">
                                      {displaySubtext}
                                    </div>
                                  )}
                                  {variant.notes && (
                                    <div className="flavor_text-xs flavor_text-gray-400 mt-1">
                                      {variant.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {collectionState.data && (
                    <div className="mt-4 p-3 bg-pkmn-cards rounded-lg">
                      <div className="flavor_text-sm flavor_text-gray-400 mb-2">In your collection:</div>
                      <div className="flavor_text-lg font-semibold flavor_text-white">
                        {collectionState.data.totalQuantity} cards{collectionState.data.totalQuantity !== 1 ? 's' : ''}
                      </div>
                      <div className="flavor_text-xs flavor_text-gray-500 mt-1">
                        Added: {formatDate(collectionState.data.dateAdded)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mb-6">
                <h3 className="flavor_text-lg font-semibold flavor_text-white mb-4">Quick Actions</h3>
                
                <div className="space-y-3">
                  
                  {/* Social Actions */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCheckFriendsWithCard(cards.set_id)
                    }}
                    disabled={socialState.loadingFriends}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 flavor_text-white rounded-lg flavor_text-sm font-medium transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    {socialState.loadingFriends ? 'Checking...' : 'Check Friends'}
                  </button>

                  {/* Wishlist & Tracking */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleWishlist(cards.set_id)
                      }}
                      disabled={socialState.loadingWishlist}
                      className={`flex items-center justify-center gap-2 px-3 py-2 flavor_text-white rounded-lg flavor_text-sm font-medium transition-colors ${
                        socialState.wishlistItem
                          ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                          : 'bg-pink-600 hover:bg-pink-700 disabled:bg-pink-400'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${socialState.wishlistItem ? 'fill-current' : ''}`} />
                      {socialState.loadingWishlist
                        ? 'Loading...'
                        : socialState.wishlistItem
                          ? 'Remove from Wishlist'
                          : 'Add to Wishlist'
                      }
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSetPriceAlert(cards.set_id)
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 flavor_text-white rounded-lg flavor_text-sm font-medium transition-colors"
                    >
                      <Bell className="w-4 h-4" />
                      Price Alert
                    </button>
                  </div>

                  {/* Utility Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleShareCard(cards.set_id, cards.set_name)
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 flavor_text-white rounded-lg flavor_text-sm font-medium transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        alert('Notes functionality coming soon! This will let you add personal notes about cards.')
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 flavor_text-white rounded-lg flavor_text-sm font-medium transition-colors"
                    >
                      <StickyNote className="w-4 h-4" />
                      Notes
                    </button>
                  </div>

                  {/* Market Analysis */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      alert('Market analysis coming soon! This will show detailed cardmarket_prices_suggested_price trends and tcgplayer_prices_reverse_holofoil_market insights.')
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 flavor_text-white rounded-lg flavor_text-sm font-medium transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Market Analysis
                  </button>
                </div>
              </div>
            </div>

            {/* Pricing with Tabs */}
            <div className="bg-pkmn-surface rounded-lg p-4">
              <Tab.Group>
                <Tab.List className="flex space-x-1 rounded-xl bg-pkmn-cards p-1 mb-4">
                  <Tab
                    className={({ selected }) =>
                      `w-full rounded-lg py-2.5 flavor_text-sm font-medium leading-5 transition-all
                       ${selected
                         ? 'bg-pokemon-gold flavor_text-white shadow'
                         : 'flavor_text-gray-300 hover:bg-gray-600 hover:flavor_text-white'
                       }`
                    }
                  >
                    <div className="flex items-center justify-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Current Prices
                    </div>
                  </Tab>
                  <Tab
                    className={({ selected }) =>
                      `w-full rounded-lg py-2.5 flavor_text-sm font-medium leading-5 transition-all
                       ${selected
                         ? 'bg-pokemon-gold flavor_text-white shadow'
                         : 'flavor_text-gray-300 hover:bg-gray-600 hover:flavor_text-white'
                       }`
                    }
                  >
                    <div className="flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Price History
                    </div>
                  </Tab>
                </Tab.List>
                
                <Tab.Panels>
                  <Tab.Panel>
                    {/* Get available variants for this cards */}
                    {(() => {
                      // Create cards input for variant rule engine
                      const cardInput = {
                        set_id: cards.set_id,
                        set_name: cards.set_name,
                        number: cards.number,
                        rarity: cards.rarity,
                        sets: {
                          set_id: cards.set_id,
                          set_name: cards.sets?.set_name || '',
                          set_series: 'Unknown', // We don't have this data, but it's required
                          releaseDate: cards.sets?.release_date || ''
                        },
                        type: cards.type || []
                      };
                      
                      // Run variant analysis
                      let availableVariants;
                      try {
                        const variantAnalysis = inferVariants(cardInput);
                        // Convert variant analysis to legacy format for now
                        const { mapToCardVariants } = require('@/lib/variant-rule-engine');
                        availableVariants = mapToCardVariants(variantAnalysis);
                      } catch (error) {
                        console.warn('Variant analysis failed in pricing, falling back to legacy:', error);
                        availableVariants = getAvailableVariants(cards);
                      }
                      const variantPricing: Array<{
                        set_name: string
                        subtext?: string
                        color: string
                        gradient: boolean
                        average: number | null
                        cardmarket_prices_reverse_holo_low: number | null
                        cardmarket_prices_reverse_holo_trend: number | null
                        note?: string
                        currency: 'EUR' | 'USD'
                        isNormalVariant?: boolean
                      }> = []

                      // Show ALL available variants, not just those with pricing
                      availableVariants.forEach((variant: any) => {
                        switch (variant) {
                          case 'normal':
                            if (cards.cardmarket_avg_sell_price || cards.cardmarket_low_price || cards.cardmarket_trend_price) {
                              variantPricing.push({
                                set_name: 'Normal',
                                color: 'bg-yellow-500',
                                gradient: false,
                                average: cards.cardmarket_avg_sell_price,
                                cardmarket_prices_reverse_holo_low: cards.cardmarket_low_price,
                                cardmarket_prices_reverse_holo_trend: cards.cardmarket_trend_price,
                                currency: 'EUR'
                              })
                            }
                            break

                          case 'holo':
                            if (cards.cardmarket_avg_sell_price || cards.cardmarket_low_price || cards.cardmarket_trend_price) {
                              variantPricing.push({
                                set_name: 'Holo',
                                color: 'bg-purple-500',
                                gradient: false,
                                average: cards.cardmarket_avg_sell_price,
                                cardmarket_prices_reverse_holo_low: cards.cardmarket_low_price,
                                cardmarket_prices_reverse_holo_trend: cards.cardmarket_trend_price,
                                currency: 'EUR'
                              })
                            }
                            break

                          case 'reverse_holo':
                            // Try CardMarket reverse holo first
                            if (cards.cardmarket_reverse_holo_sell || cards.cardmarket_reverse_holo_low || cards.cardmarket_reverse_holo_trend) {
                              variantPricing.push({
                                set_name: 'Reverse Holo',
                                color: 'bg-blue-500',
                                gradient: false,
                                average: cards.cardmarket_reverse_holo_sell,
                                cardmarket_prices_reverse_holo_low: cards.cardmarket_reverse_holo_low,
                                cardmarket_prices_reverse_holo_trend: cards.cardmarket_reverse_holo_trend,
                                currency: 'EUR'
                              })
                            }
                            // Fallback to TCGPlayer if CardMarket not available
                            else if ((cards as any).tcgplayer_reverse_foil_market || (cards as any).tcgplayer_reverse_foil_low) {
                              variantPricing.push({
                                set_name: 'Reverse Holo',
                                color: 'bg-blue-500',
                                gradient: false,
                                average: (cards as any).tcgplayer_reverse_foil_market,
                                cardmarket_prices_reverse_holo_low: (cards as any).tcgplayer_reverse_foil_low,
                                cardmarket_prices_reverse_holo_trend: (cards as any).tcgplayer_reverse_foil_mid,
                                note: 'TCGPlayer USD pricing',
                                currency: 'USD'
                              })
                            }
                            // Show variant even without pricing data
                            else {
                              variantPricing.push({
                                set_name: 'Reverse Holo',
                                color: 'bg-blue-500',
                                gradient: false,
                                average: null,
                                cardmarket_prices_reverse_holo_low: null,
                                cardmarket_prices_reverse_holo_trend: null,
                                note: 'No pricing data available',
                                currency: 'EUR'
                              })
                            }
                            break

                          case '1st_edition':
                            // Try CardMarket 1st Edition pricing first (if exists)
                            if ((cards as any).cardmarket_1st_edition_avg || (cards as any).cardmarket_1st_edition_low) {
                              variantPricing.push({
                                set_name: '1st Edition',
                                color: 'bg-green-500',
                                gradient: false,
                                average: (cards as any).cardmarket_1st_edition_avg,
                                cardmarket_prices_reverse_holo_low: (cards as any).cardmarket_1st_edition_low,
                                cardmarket_prices_reverse_holo_trend: (cards as any).cardmarket_1st_edition_trend,
                                currency: 'EUR'
                              })
                            }
                            // Then try TCGPlayer data
                            else if ((cards as any).tcgplayer_1st_edition_normal_market || (cards as any).tcgplayer_1st_edition_holofoil_market || (cards as any).tcgplayer_1st_edition_normal_low || (cards as any).tcgplayer_1st_edition_holofoil_low) {
                              // Add 1st Edition Holo if available (prefer holo over normal)
                              if ((cards as any).tcgplayer_1st_edition_holofoil_market || (cards as any).tcgplayer_1st_edition_holofoil_low) {
                                variantPricing.push({
                                  set_name: '1st Edition Holo',
                                  color: 'bg-gradient-to-r from-green-500 to-purple-500',
                                  gradient: true,
                                  average: (cards as any).tcgplayer_1st_edition_holofoil_market,
                                  cardmarket_prices_reverse_holo_low: (cards as any).tcgplayer_1st_edition_holofoil_low,
                                  cardmarket_prices_reverse_holo_trend: (cards as any).tcgplayer_1st_edition_holofoil_mid,
                                  note: 'TCGPlayer USD pricing',
                                  currency: 'USD'
                                })
                              }
                              
                              // Add 1st Edition Normal if available and different from holo
                              if ((cards as any).tcgplayer_1st_edition_normal_market || (cards as any).tcgplayer_1st_edition_normal_low) {
                                variantPricing.push({
                                  set_name: '1st Edition Normal',
                                  color: 'bg-green-500',
                                  gradient: false,
                                  average: (cards as any).tcgplayer_1st_edition_normal_market,
                                  cardmarket_prices_reverse_holo_low: (cards as any).tcgplayer_1st_edition_normal_low,
                                  cardmarket_prices_reverse_holo_trend: (cards as any).tcgplayer_1st_edition_normal_mid,
                                  note: 'TCGPlayer USD pricing',
                                  currency: 'USD'
                                })
                              }
                            }
                            // Only show if no actual pricing data available
                            else {
                              variantPricing.push({
                                set_name: '1st Edition',
                                color: 'bg-green-500',
                                gradient: false,
                                average: null,
                                cardmarket_prices_reverse_holo_low: null,
                                cardmarket_prices_reverse_holo_trend: null,
                                note: 'No pricing data available',
                                currency: 'EUR'
                              })
                            }
                            break

                          case 'pokeball_pattern':
                            // Only show if actual TCGPlayer pricing data exists for this pattern
                            // Currently no specific pricing fields exist, so show no pricing
                            variantPricing.push({
                              set_name: 'Poké Ball Pattern',
                              color: 'bg-gradient-to-r from-red-500 to-white',
                              gradient: true,
                              average: null,
                              cardmarket_prices_reverse_holo_low: null,
                              cardmarket_prices_reverse_holo_trend: null,
                              note: 'No pricing data available',
                              currency: 'EUR'
                            })
                            break

                          case 'masterball_pattern':
                            // Only show if actual TCGPlayer pricing data exists for this pattern
                            // Currently no specific pricing fields exist, so show no pricing
                            variantPricing.push({
                              set_name: 'Master Ball Pattern',
                              color: 'bg-gradient-to-r from-purple-600 to-blue-600',
                              gradient: true,
                              average: null,
                              cardmarket_prices_reverse_holo_low: null,
                              cardmarket_prices_reverse_holo_trend: null,
                              note: 'No pricing data available',
                              currency: 'EUR'
                            })
                            break
                        }
                      })

                      // Add manual variants to pricing
                      manualVariants.forEach(variant => {
                        const bestPrice = manualVariantsService.getBestPrice(variant)
                        
                        // Check if this is a pokeball pattern variant based on display set_name
                        const isPokeball = variant.display_name ? (
                          variant.display_name.toLowerCase().includes('pokeball') ||
                          variant.display_name.toLowerCase().includes('poké ball') ||
                          variant.display_name.toLowerCase().includes('victini illustration')
                        ) : false
                        
                        // Check if this is a normal variant (should be yellow like standard normal)
                        const isNormalVariant = variant.display_name ? (
                          variant.display_name.toLowerCase().includes('non-holo') ||
                          variant.display_name.toLowerCase().includes('normal') ||
                          variant.display_name.toLowerCase().includes('non holo')
                        ) : false
                        
                        // Use appropriate styling and set_name based on variant type
                        const variantName = isPokeball ? 'Pokeball Pattern' : (variant.display_name || 'Unknown Variant')
                        const variantSubtext = isPokeball ? 'Found in Victini Illustration Collection' : undefined
                        const variantColor = isPokeball ? 'bg-gradient-to-r from-red-500 to-white' :
                                           isNormalVariant ? 'bg-yellow-500' : 'bg-gray-500'
                        
                        const pricingVariant: any = {
                          set_name: variantName,
                          color: variantColor,
                          gradient: isPokeball && !isNormalVariant,
                          average: bestPrice?.cardmarket_prices_suggested_price || null,
                          cardmarket_prices_reverse_holo_low: bestPrice?.cardmarket_prices_suggested_price || null,
                          cardmarket_prices_reverse_holo_trend: bestPrice?.cardmarket_prices_suggested_price || null,
                          note: bestPrice ? undefined : 'No pricing data',
                          currency: 'EUR',
                          isNormalVariant: isNormalVariant // Add flag to identify normal variants
                        }
                        
                        if (variantSubtext) {
                          pricingVariant.subtext = variantSubtext
                        }
                        
                        variantPricing.push(pricingVariant)
                      })

                      if (variantPricing.length === 0) {
                        return (
                          <div className="flavor_text-center py-6 flavor_text-gray-400">
                            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="flavor_text-sm">No pricing data available</p>
                          </div>
                        )
                      }

                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            {/* Table Header */}
                            <thead>
                              <tr className="border-b border-gray-600">
                                <th className="flavor_text-left py-3 px-2 flavor_text-sm font-medium flavor_text-gray-300">Variant</th>
                                <th className="flavor_text-center py-3 px-2 flavor_text-sm font-medium flavor_text-gray-300">Average</th>
                                <th className="flavor_text-center py-3 px-2 flavor_text-sm font-medium flavor_text-gray-300">Low Price</th>
                                <th className="flavor_text-center py-3 px-2 flavor_text-sm font-medium flavor_text-gray-300 flex items-center justify-center">
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                  Trend
                                </th>
                              </tr>
                            </thead>
                            {/* Table Body */}
                            <tbody>
                              {variantPricing.map((variant, index) => (
                                <tr key={variant.set_name} className="border-b border-gray-700/50 hover:bg-pkmn-cards/30 transition-colors">
                                  {/* Variant Name */}
                                  <td className="py-3 px-2">
                                    <div className="flex items-center">
                                      <span className={`w-3 h-3 rounded-full mr-3 ${variant.color}`}></span>
                                      <div>
                                        <div className={`flavor_text-sm font-medium ${
                                          variant.set_name === 'Normal' ? 'flavor_text-yellow-400' :
                                          variant.set_name === 'Holo' ? 'flavor_text-purple-400' :
                                          variant.set_name === 'Reverse Holo' ? 'flavor_text-blue-400' :
                                          variant.set_name.includes('1st Edition') ? 'flavor_text-green-400' :
                                          variant.set_name.includes('Pokeball Pattern') || variant.set_name.includes('Poké Ball Pattern') ? 'flavor_text-red-400' :
                                          variant.set_name.includes('Master Ball Pattern') ? 'flavor_text-purple-400' :
                                          variant.isNormalVariant ? 'flavor_text-yellow-400' : // Manual normal variants should be yellow
                                          'flavor_text-gray-400' // All other manual variants should be grey
                                        }`}>
                                          {variant.set_name}
                                        </div>
                                        {variant.subtext && (
                                          <div className="flavor_text-xs flavor_text-gray-400 mt-0.5">
                                            {variant.subtext}
                                          </div>
                                        )}
                                        {variant.note && !variant.note.includes('pricing') && (
                                          <div className="flavor_text-xs flavor_text-gray-500 italic mt-0.5">
                                            {variant.note}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  
                                  {/* Average Price */}
                                  <td className="py-3 px-2 flavor_text-center">
                                    <div className={`flavor_text-sm font-semibold ${
                                      variant.set_name === 'Normal' ? 'flavor_text-yellow-400' :
                                      variant.set_name === 'Holo' ? 'flavor_text-purple-400' :
                                      variant.set_name === 'Reverse Holo' ? 'flavor_text-blue-400' :
                                      variant.set_name.includes('1st Edition') ? 'flavor_text-green-400' :
                                      variant.set_name.includes('Pokeball Pattern') || variant.set_name.includes('Poké Ball Pattern') ? 'flavor_text-red-400' :
                                      variant.set_name.includes('Master Ball Pattern') ? 'flavor_text-purple-400' :
                                      variant.isNormalVariant ? 'flavor_text-yellow-400' : // Manual normal variants should be yellow
                                      'flavor_text-gray-400' // All other manual variants should be grey
                                    }`}>
                                      {variant.average ? (
                                        <PriceDisplay
                                          amount={variant.average}
                                          currency={variant.currency as any || 'EUR'}
                                          showConversion={true}
                                          showOriginal={false}
                                          size="sm"
                                          className="!flavor_text-current"
                                        />
                                      ) : (
                                        <span className="flavor_text-gray-500">N/A</span>
                                      )}
                                    </div>
                                  </td>
                                  
                                  {/* Low Price */}
                                  <td className="py-3 px-2 flavor_text-center">
                                    <div className="flavor_text-sm font-semibold flavor_text-green-400">
                                      {variant.cardmarket_prices_reverse_holo_low ? (
                                        <PriceDisplay
                                          amount={variant.cardmarket_prices_reverse_holo_low}
                                          currency={variant.currency as any || 'EUR'}
                                          showConversion={true}
                                          showOriginal={false}
                                          size="sm"
                                          className="!flavor_text-current"
                                        />
                                      ) : (
                                        <span className="flavor_text-gray-500">N/A</span>
                                      )}
                                    </div>
                                  </td>
                                  
                                  {/* Trend Price */}
                                  <td className="py-3 px-2 flavor_text-center">
                                    <div className="flavor_text-sm font-semibold flavor_text-blue-400">
                                      {variant.cardmarket_prices_reverse_holo_trend ? (
                                        <PriceDisplay
                                          amount={variant.cardmarket_prices_reverse_holo_trend}
                                          currency={variant.currency as any || 'EUR'}
                                          showConversion={true}
                                          showOriginal={false}
                                          size="sm"
                                          className="!flavor_text-current"
                                        />
                                      ) : (
                                        <span className="flavor_text-gray-500">N/A</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    })()}

                    {/* Fallback if no pricing data */}
                    {(() => {
                      const availableVariants = getAvailableVariants(cards)
                      const hasAnyPricing = cards.cardmarket_avg_sell_price || cards.cardmarket_low_price ||
                                          cards.cardmarket_trend_price || cards.cardmarket_reverse_holo_sell ||
                                          cards.cardmarket_reverse_holo_low || cards.cardmarket_reverse_holo_trend

                      if (!hasAnyPricing) {
                        return (
                          <div className="flavor_text-center py-6 flavor_text-gray-400">
                            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="flavor_text-sm">No pricing data available</p>
                            <p className="flavor_text-xs mt-1">Available variants: {availableVariants.join(', ')}</p>
                          </div>
                        )
                      }
                      return null
                    })()}
                  </Tab.Panel>
                  
                  <Tab.Panel>
                    <PriceGraph
                      cardId={cards.set_id}
                      currentPrice={cards.cardmarket_avg_sell_price}
                      reverseHoloPrice={cards.cardmarket_reverse_holo_sell}
                      avg7Days={cards.cardmarket_avg_7_days}
                      avg30Days={cards.cardmarket_avg_30_days}
                      cardName={cards.set_name}
                      availableVariants={(() => {
                        // Create cards input for variant rule engine
                        const cardInput = {
                          set_id: cards.set_id,
                          set_name: cards.set_name,
                          number: cards.number,
                          rarity: cards.rarity,
                          sets: {
                            set_id: cards.set_id,
                            set_name: cards.sets?.set_name || '',
                            set_series: 'Unknown',
                            releaseDate: cards.sets?.release_date || ''
                          },
                          type: cards.type || []
                        };
                        
                        try {
                          const variantAnalysis = inferVariants(cardInput);
                          const { mapToCardVariants } = require('@/lib/variant-rule-engine');
                          return mapToCardVariants(variantAnalysis);
                        } catch (error) {
                          console.warn('Variant analysis failed in PriceGraph, falling back to legacy:', error);
                          return getAvailableVariants(cards);
                        }
                      })()}
                    />
                  </Tab.Panel>
                </Tab.Panels>
              </Tab.Group>
            </div>


            {/* External Links */}
            <div className="bg-pkmn-surface rounded-lg p-4">
              <h3 className="flavor_text-lg font-semibold flavor_text-white mb-4">External Links</h3>
              
              <a
                href={getCardMarketUrl(cards)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-pkmn-cards border border-gray-600 rounded-lg hover:bg-gray-600 hover:border-gray-500 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="flavor_text-white">View on Cardmarket</span>
                <ExternalLink className="w-4 h-4 flavor_text-gray-400" />
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 flavor_text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="pokemon-cards-modal w-full max-w-7xl transform overflow-hidden rounded-2xl bg-pkmn-cards p-6 flavor_text-left align-middle shadow-xl transition-all">
                  {/* Close Button */}
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-pkmn-surface rounded-full flavor_text-gray-400 hover:flavor_text-white hover:bg-gray-600 transition-colors focus-visible"
                    aria-label="Close modal"
                  >
                    <X className="w-6 h-6" />
                  </button>

                  {/* Content */}
                  {cardState.loadingState === LoadingState.LOADING && renderLoading()}
                  {cardState.loadingState === LoadingState.ERROR && renderError()}
                  {cardState.loadingState === LoadingState.SUCCESS && renderCardContent()}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Friends Modal */}
      {cardState.data && (
        <FriendsWithCardModal
          isOpen={showFriendsModal}
          onClose={() => setShowFriendsModal(false)}
          friends={socialState.friendsWithCard}
          cardName={cardState.data.set_name}
          cardImage={cardState.data.image_small}
        />
      )}

      {/* Wishlist Selection Modal */}
      {cardState.data && (
        <WishlistSelectionModal
          isOpen={showWishlistModal}
          onClose={handleWishlistModalClose}
          cardId={cardState.data.set_id}
          cardName={cardState.data.set_name}
          cardImage={cardState.data.image_small || cardState.data.image_large}
        />
      )}

      {/* Quantity Input Modal */}
      {cardState.data && (
        <Transition appear show={showQuantityModal} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setShowQuantityModal(false)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-75" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 flavor_text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-pkmn-cards p-6 flavor_text-left align-middle shadow-xl transition-all">
                    <Dialog.Title as="h3" className="flavor_text-lg font-medium leading-6 flavor_text-white mb-4">
                      Set Card Quantities
                    </Dialog.Title>
                    
                    <div className="space-y-4">
                      <p className="flavor_text-sm flavor_text-gray-400">
                        Enter the set_total quantity for each variant. Start from 0 to add to collection, or sets to 0 to remove.
                      </p>
                      
                      {/* Standard Variants Section */}
                      <div className="space-y-3">
                        <h4 className="flavor_text-sm font-medium flavor_text-gray-300 border-b border-gray-600 pb-1">Standard Variants</h4>
                        {(() => {
                          // Use the same variant analysis logic as CollectionButtons
                          const cardInput = {
                            set_id: cardState.data.set_id,
                            set_name: cardState.data.set_name,
                            number: cardState.data.number,
                            rarity: cardState.data.rarity,
                            sets: {
                              set_id: cardState.data.set_id,
                              set_name: cardState.data.sets?.set_name || '',
                              set_series: 'Unknown',
                              releaseDate: cardState.data.sets?.release_date || ''
                            },
                            type: cardState.data.type || []
                          };
                          
                          let availableVariants;
                          try {
                            const variantAnalysis = inferVariants(cardInput);
                            const { mapToCardVariants } = require('@/lib/variant-rule-engine');
                            availableVariants = mapToCardVariants(variantAnalysis);
                          } catch (error) {
                            console.warn('Variant analysis failed in Set Quantities modal, falling back to legacy:', error);
                            availableVariants = getAvailableVariants(cardState.data);
                          }
                          
                          return availableVariants;
                        })().map((variant: CardVariant) => {
                          const variantTitle = (() => {
                            switch (variant) {
                              case 'normal': return 'Normal (Non-Holo)'
                              case 'holo': return 'Holo'
                              case 'reverse_holo': return 'Reverse Holo'
                              case 'pokeball_pattern': return 'Poké Ball Pattern'
                              case 'masterball_pattern': return 'Master Ball Pattern'
                              case '1st_edition': return '1st Edition'
                              default: return variant
                            }
                          })()
                          
                          return (
                            <div key={variant} className="flex items-center justify-between">
                              <label className="flavor_text-sm font-medium flavor_text-white">
                                {variantTitle}
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="999"
                                value={quantityInputs[variant as CardVariant]}
                                onChange={(e) => handleQuantityChange(variant as CardVariant, parseInt(e.target.value) || 0)}
                                className="w-20 px-3 py-2 bg-pkmn-surface border border-gray-600 rounded-md flavor_text-white flavor_text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                onFocus={(e) => e.target.select()}
                              />
                            </div>
                          )
                        })}
                      </div>

                      {/* Manual Variants Section */}
                      {manualVariants.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="flavor_text-sm font-medium flavor_text-gray-300 border-b border-gray-600 pb-1">Other Variants</h4>
                          {manualVariants.map(variant => {
                            // Check if this is a pokeball pattern variant based on display set_name
                            const isPokeball = variant.display_name ? (
                              variant.display_name.toLowerCase().includes('pokeball') ||
                              variant.display_name.toLowerCase().includes('poké ball') ||
                              variant.display_name.toLowerCase().includes('victini illustration')
                            ) : false
                            
                            // Use appropriate display set_name
                            const displayName = isPokeball ? 'Pokeball Pattern' : (variant.display_name || 'Unknown Variant')
                            const displaySubtext = isPokeball ? 'Found in Victini Illustration Collection' : variant.notes
                            
                            return (
                              <div key={variant.set_id} className="flex items-center justify-between">
                                <div className="flex-1">
                                  <label className="flavor_text-sm font-medium flavor_text-white">
                                    {displayName}
                                  </label>
                                  {displaySubtext && (
                                    <div className="flavor_text-xs flavor_text-gray-400 mt-0.5">
                                      {displaySubtext}
                                    </div>
                                  )}
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  max="999"
                                  value={manualQuantityInputs[variant.set_id] || 0}
                                  onChange={(e) => handleManualQuantityChange(variant.set_id, parseInt(e.target.value) || 0)}
                                  className="w-20 px-3 py-2 bg-pkmn-surface border border-gray-600 rounded-md flavor_text-white flavor_text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  onFocus={(e) => e.target.select()}
                                />
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex gap-3">
                      <button
                        type="button"
                        className="flex-1 inline-flex justify-center rounded-md border border-gray-600 bg-pkmn-surface px-4 py-2 flavor_text-sm font-medium flavor_text-white hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        onClick={() => setShowQuantityModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="flex-1 inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 flavor_text-sm font-medium flavor_text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleSaveQuantities}
                        disabled={collectionState.loading}
                      >
                        {collectionState.loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false)
          setConfirmAction(null)
        }}
        onConfirm={confirmAction?.onConfirm || (() => {})}
        title={confirmAction?.type === 'remove' ? 'Remove from Wishlist' : 'Add to Wishlist'}
        message={
          confirmAction?.type === 'remove'
            ? `Are you sure you want to remove "${confirmAction.cardName}" from your wishlist?`
            : `Add "${confirmAction?.cardName}" to your wishlist?`
        }
        confirmText={confirmAction?.type === 'remove' ? 'Remove' : 'Add'}
        cancelText="Cancel"
        type={confirmAction?.type === 'remove' ? 'warning' : 'info'}
        isLoading={socialState.loadingWishlist}
      />
    </>
  )
}
