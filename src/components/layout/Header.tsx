'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Disclosure } from '@headlessui/react';
import { PriceSourceToggle, type PriceSource } from '@/components/ui/PriceSourceToggle';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Sets', href: '/sets' },
  { name: 'Cards', href: '/cards' },
  { name: 'Collection', href: '/collection' },
];

export function Header() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const currentSource = (searchParams.get('source') as PriceSource) || 'cardmarket';
  
  const handlePriceSourceChange = (newSource: PriceSource) => {
    const params = new URLSearchParams(searchParams);
    params.set('source', newSource);
    router.push(`${pathname}?${params.toString()}` as any);
  };

  return (
    <Disclosure as="header" className="bg-bg border-b border-border sticky top-0 z-50">
      {({ open }) => (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo and Brand */}
              <div className="flex items-center">
                <Link href="/" className="flex items-center space-x-3 group">
                  <div className="w-8 h-8 bg-aurora rounded-lg flex items-center justify-center transform group-hover:scale-105 transition-transform duration-150">
                    <span className="text-white font-bold text-sm">L</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl font-bold text-gradient">Lumidex</span>
                    <span className="text-sm text-muted font-medium">v2</span>
                  </div>
                </Link>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex space-x-1">
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
              </nav>

              {/* Desktop Tools */}
              <div className="hidden md:flex items-center space-x-4">
                {/* Search Button */}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    // TODO: Implement search modal
                    console.log('Search triggered');
                  }}
                >
                  <SearchIcon className="w-4 h-4 mr-2" />
                  Search
                  <kbd className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-panel2 border border-border">
                    ⌘K
                  </kbd>
                </button>

                {/* Price Source Toggle */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted">Prices:</span>
                  <PriceSourceToggle
                    value={currentSource}
                    onChange={handlePriceSourceChange}
                    size="sm"
                  />
                </div>

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
            </div>
            
            <div className="border-t border-border px-4 pt-4 pb-3">
              {/* Mobile Price Source */}
              <div className="mb-4">
                <PriceSourceToggle
                  value={currentSource}
                  onChange={handlePriceSourceChange}
                />
              </div>
              
              {/* Mobile Auth */}
              <AuthButton />
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}

function AuthButton() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { getCurrentUser } = await import('@/lib/supabase/client');
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
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
    return (
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-aurora rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {user.email?.charAt(0).toUpperCase()}
          </span>
        </div>
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
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

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