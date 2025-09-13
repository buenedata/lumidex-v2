import { createClient } from '@/lib/supabase/client'

/**
 * Update user profile from client-side
 */
export async function updateProfileClient(userId: string, updates: {
  display_name?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatar_url?: string;
  banner_url?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
    
    if (error) {
      console.error('Error updating profile:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Unexpected error updating profile:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Get user profile from client-side
 */
export async function getUserProfileClient(userId: string): Promise<{
  success: boolean;
  data?: {
    id: string;
    username?: string;
    display_name?: string;
    bio?: string;
    location?: string;
    website?: string;
    avatar_url?: string;
    banner_url?: string;
    created_at: string;
    updated_at?: string;
  };
  error?: string;
}> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Error fetching profile:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data }
  } catch (error) {
    console.error('Unexpected error fetching profile:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Create or update user profile from client-side
 */
export async function upsertProfileClient(userId: string, profileData: {
  username?: string;
  display_name?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatar_url?: string;
  banner_url?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        ...profileData
      })
    
    if (error) {
      console.error('Error upserting profile:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Unexpected error upserting profile:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}