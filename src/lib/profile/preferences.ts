'use client'

import { createClient } from '@/lib/supabase/client'
import type { CurrencyCode, PriceSource, UserPreferences } from '@/types'

export interface PreferencesResult {
  success: boolean
  error?: string
}

/**
 * Update user preferences (client-side)
 */
export async function updateUserPreferencesClient(
  userId: string, 
  preferences: Partial<UserPreferences>
): Promise<PreferencesResult> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('profiles')
      .update(preferences)
      .eq('id', userId)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}

/**
 * Get user preferences (client-side)
 */
export async function getUserPreferencesClient(userId: string): Promise<{
  success: boolean
  data?: UserPreferences
  error?: string
}> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('preferred_currency, preferred_price_source')
      .eq('id', userId)
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true, data }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}

/**
 * Delete all collection items for a user (client-side dangerous operation)
 */
export async function deleteUserCollectionClient(userId: string): Promise<PreferencesResult> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('user_id', userId)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}

/**
 * Get collection item count for user (client-side)
 */
export async function getUserCollectionCountClient(userId: string): Promise<{
  success: boolean
  count?: number
  error?: string
}> {
  try {
    const supabase = createClient()
    
    const { count, error } = await supabase
      .from('collection_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true, count: count || 0 }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}

/**
 * Delete user account and all associated data (client-side dangerous operation)
 */
export async function deleteUserAccountClient(userId: string): Promise<PreferencesResult> {
  try {
    const supabase = createClient()
    
    // Delete collection items first (cascade should handle this, but explicit is better)
    const { error: collectionError } = await supabase
      .from('collection_items')
      .delete()
      .eq('user_id', userId)
    
    if (collectionError) {
      return { success: false, error: `Failed to delete collection: ${collectionError.message}` }
    }
    
    // Delete profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)
    
    if (profileError) {
      return { success: false, error: `Failed to delete profile: ${profileError.message}` }
    }
    
    // Sign out user
    const { error: signOutError } = await supabase.auth.signOut()
    
    if (signOutError) {
      return { success: false, error: `Failed to sign out: ${signOutError.message}` }
    }
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}