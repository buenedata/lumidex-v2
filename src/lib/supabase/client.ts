import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a Supabase client for browser-side operations (Client Components)
 * Handles session management and real-time subscriptions
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Hook-like function to get auth state changes in client components
 * Use this in Client Components to listen for auth state changes
 */
export function useAuthStateChange(callback: (event: string, session: any) => void) {
  const supabase = createClient()
  
  return supabase.auth.onAuthStateChange(callback)
}

/**
 * Sign in with email (magic link)
 * Returns success/error status
 */
export async function signInWithEmail(email: string, redirectTo?: string) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo || `${window.location.origin}/auth/callback`,
      },
    })
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true, data }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = createClient()
  
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Get current user in client component
 * Note: This might be stale, prefer server-side user fetching when possible
 */
export async function getCurrentUser() {
  const supabase = createClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Error getting user:', error)
      return null
    }
    return user
  } catch (error) {
    console.error('Error in getCurrentUser:', error)
    return null
  }
}

/**
 * Get current session in client component
 */
export async function getCurrentSession() {
  const supabase = createClient()
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Error getting session:', error)
      return null
    }
    return session
  } catch (error) {
    console.error('Error in getCurrentSession:', error)
    return null
  }
}