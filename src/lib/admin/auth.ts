import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Admin email - only this user can access admin variant management
const ADMIN_EMAIL = 'kbbuene@gmail.com';

/**
 * Check if the current user is an admin
 */
export async function isAdminUser(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    return user?.email === ADMIN_EMAIL;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Get current user if they are admin, otherwise return null
 */
export async function getAdminUser() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user?.email === ADMIN_EMAIL) {
      return user;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting admin user:', error);
    return null;
  }
}

/**
 * Require admin authentication - redirects if not admin
 */
export async function requireAdmin() {
  const isAdmin = await isAdminUser();
  
  if (!isAdmin) {
    redirect('/auth/signin?message=Admin access required');
  }
}

/**
 * Check admin access for API routes
 */
export async function checkAdminAccess(): Promise<{ isAdmin: boolean; user: any }> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const isAdmin = user?.email === ADMIN_EMAIL;
    
    return { isAdmin, user };
  } catch (error) {
    console.error('Error checking admin access:', error);
    return { isAdmin: false, user: null };
  }
}

/**
 * Admin-only database client with elevated permissions
 */
export async function createAdminClient() {
  const { isAdmin } = await checkAdminAccess();
  
  if (!isAdmin) {
    throw new Error('Admin access required');
  }
  
  return createClient();
}