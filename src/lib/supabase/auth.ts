'use client'

import { createClient } from '@/lib/supabase/client'

export interface AuthResult {
  success: boolean
  error?: string
}

/**
 * Update user email
 */
export async function updateUserEmail(newEmail: string): Promise<AuthResult> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase.auth.updateUser({
      email: newEmail
    })
    
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
 * Update user password
 */
export async function updateUserPassword(newPassword: string): Promise<AuthResult> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    
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
 * Delete current user (requires admin privileges or proper setup)
 * This is a dangerous operation and should be used carefully
 */
export async function deleteCurrentUser(): Promise<AuthResult> {
  try {
    const supabase = createClient()
    
    // First, get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { success: false, error: 'User not found' }
    }
    
    // Note: This requires admin privileges or a server-side function
    // For now, we'll handle the auth deletion via a server action
    // The profile and collection deletion is handled in queries.ts
    
    const { error } = await supabase.auth.signOut()
    
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
 * Re-authenticate user (for sensitive operations)
 */
export async function reauthenticateUser(password: string): Promise<AuthResult> {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user || !user.email) {
      return { success: false, error: 'User not found' }
    }
    
    // Sign in with current credentials to verify password
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password
    })
    
    if (error) {
      return { success: false, error: 'Invalid password' }
    }
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}