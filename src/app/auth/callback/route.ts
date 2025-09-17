import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createClient();
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Auth callback error:', error);
        return NextResponse.redirect(new URL('/auth/signin?error=auth_error', requestUrl.origin));
      }

      // If this is a new user, create a profile
      if (data.user && data.session) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            username: data.user.email?.split('@')[0] || null,
          }, {
            onConflict: 'id',
            ignoreDuplicates: true
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't fail the auth flow for profile errors
        }
      }

      // Redirect to dashboard page on successful auth
      return NextResponse.redirect(new URL('/', requestUrl.origin));
    } catch (error) {
      console.error('Unexpected auth error:', error);
      return NextResponse.redirect(new URL('/auth/signin?error=unexpected_error', requestUrl.origin));
    }
  }

  // No code provided, redirect to sign in
  return NextResponse.redirect(new URL('/auth/signin?error=no_code', requestUrl.origin));
}