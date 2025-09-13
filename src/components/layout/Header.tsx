'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Disclosure } from '@headlessui/react';
import { Button } from '@/components/ui/Button';
import { MegaMenu } from '@/components/navigation/MegaMenu';
import { cn } from '@/lib/utils';
import LumidexLogo from '@/images/lumidex_logo_card_allcaps_transparent.png';
import type { PriceSource } from '@/types';

const navigation = [
  { name: 'Dashboard', href: '/' },
  { name: 'Cards', href: '/cards' },
  { name: 'Collection', href: '/collection' },
];

export function Header() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Price source is now handled by user preferences, not URL params
  // We'll default to 'cardmarket' for anonymous users

  return (
    <>
      <Disclosure as="header" className="bg-bg border-b border-border sticky top-0 z-50">
        {({ open }) => (
          <>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                {/* Logo and Brand */}
                <div className="flex items-center">
                  <Link href="/" className="flex items-center group">
                    <div className="w-48 h-12 relative transform group-hover:scale-105 transition-transform duration-150">
                      <Image
                        src={LumidexLogo}
                        alt="Lumidex Logo"
                        fill
                        className="object-contain"
                        priority
                      />
                    </div>
                  </Link>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center space-x-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href as any}
                      className={cn(
                        'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                        'hover:bg-panel2 hover:text-text',
                        pathname === item.href
                          ? 'nav-active text-text bg-panel2'
                          : 'text-muted'
                      )}
                    >
                      {item.name}
                    </Link>
                  ))}
                  
                  {/* MegaMenu for Sets */}
                  <MegaMenu />
                </nav>

                {/* Desktop Tools */}
                <div className="hidden md:flex items-center space-x-4">
                  {/* Authentication */}
                  <AuthButton />
                </div>

                {/* Mobile menu button */}
                <div className="md:hidden">
                  <Disclosure.Button className="btn btn-ghost btn-sm">
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <XMarkIcon className="w-5 h-5" />
                    ) : (
                      <Bars3Icon className="w-5 h-5" />
                    )}
                  </Disclosure.Button>
                </div>
              </div>
            </div>

            {/* Mobile Navigation Panel */}
            <Disclosure.Panel className="md:hidden mobile-menu border-t border-border">
              <div className="px-4 pt-4 pb-3 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href as any}
                    className={cn(
                      'block px-3 py-2 rounded-xl text-base font-medium transition-colors duration-150',
                      pathname === item.href
                        ? 'bg-panel2 text-text'
                        : 'text-muted hover:text-text hover:bg-panel2'
                    )}
                  >
                    {item.name}
                  </Link>
                ))}
                
                {/* Mobile Browse Link */}
                <Link
                  href={"/browse" as any}
                  className={cn(
                    'block px-3 py-2 rounded-xl text-base font-medium transition-colors duration-150',
                    pathname === '/browse'
                      ? 'bg-panel2 text-text'
                      : 'text-muted hover:text-text hover:bg-panel2'
                  )}
                >
                  Browse Sets
                </Link>
              </div>
              
              <div className="border-t border-border px-4 pt-4 pb-3">
                {/* Mobile Auth */}
                <AuthButton />
              </div>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>
    </>
  );
}

function AuthButton() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { getCurrentUser } = await import('@/lib/supabase/client');
      const { getUserProfile } = await import('@/lib/db/queries');
      try {
        const { user: currentUser } = await getCurrentUser();
        setUser(currentUser);
        
        if (currentUser?.id) {
          const profile = await getUserProfile(currentUser.id);
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Error getting user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getUser();
  }, []);

  const handleSignOut = async () => {
    const { signOut } = await import('@/lib/supabase/client');
    try {
      await signOut();
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="w-20 h-9 skeleton"></div>
    );
  }

  if (user) {
    const avatarUrl = userProfile?.avatar_url;
    const displayName = userProfile?.display_name || user.email;
    const initials = displayName?.charAt(0).toUpperCase() || '?';

    return (
      <div className="flex items-center space-x-3">
        <Link
          href="/profile"
          className="flex items-center space-x-2 p-1 rounded-lg hover:bg-panel2 transition-colors"
        >
          {avatarUrl ? (
            <div className="w-8 h-8 rounded-full overflow-hidden">
              <Image
                src={avatarUrl}
                alt={`${displayName}'s avatar`}
                width={32}
                height={32}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-8 h-8 bg-aurora rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {initials}
              </span>
            </div>
          )}
          <span className="text-sm text-text font-medium hidden sm:block">Profile</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="text-sm text-muted hover:text-text transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <Link href="/auth/signin" className="btn btn-primary btn-sm">
      Sign in
    </Link>
  );
}

// Icons
function Bars3Icon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}