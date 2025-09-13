'use client';

import { Suspense } from 'react';
import { Header } from './Header';

function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-panel/80 backdrop-blur supports-[backdrop-filter]:bg-panel/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 skeleton rounded-lg" />
            <div className="flex items-center space-x-2">
              <div className="h-6 w-20 skeleton rounded" />
              <div className="h-4 w-6 skeleton rounded" />
            </div>
          </div>

          {/* Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-4 w-16 skeleton rounded" />
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 skeleton rounded-full" />
            <div className="h-8 w-20 skeleton rounded md:block hidden" />
          </div>
        </div>
      </div>
    </header>
  );
}

export function HeaderWithSuspense() {
  return (
    <Suspense fallback={<HeaderSkeleton />}>
      <Header />
    </Suspense>
  );
}