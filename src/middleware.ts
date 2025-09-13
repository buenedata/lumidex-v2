import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const ADMIN_EMAIL = 'kbbuene@gmail.com';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Refresh session to ensure cookies are up to date
    await supabase.auth.getUser();

    // Apply admin-specific checks only to admin routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check if user is authenticated and is admin
      if (!user) {
        const loginUrl = new URL('/auth/signin', request.url);
        loginUrl.searchParams.set('message', 'Admin access required');
        return NextResponse.redirect(loginUrl);
      }
      
      // Check if user is admin
      if (user.email !== ADMIN_EMAIL) {
        // Redirect non-admin users to home page
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
    
    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    
    // On error for admin pages, redirect to login
    if (request.nextUrl.pathname.startsWith('/admin')) {
      const loginUrl = new URL('/auth/signin', request.url);
      loginUrl.searchParams.set('message', 'Authentication error');
      return NextResponse.redirect(loginUrl);
    }
    
    return response;
  }
}

export const config = {
  matcher: [
    // Apply to all routes except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ]
};