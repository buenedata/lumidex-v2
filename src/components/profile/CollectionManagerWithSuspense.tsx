'use client';

import { Suspense } from 'react';
import CollectionManager from './CollectionManager';

interface CollectionManagerWithSuspenseProps {
  userId: string;
}

function CollectionManagerSkeleton() {
  return (
    <div className="panel">
      <div className="p-6 border-b border-border">
        <div className="animate-pulse">
          <div className="h-6 skeleton rounded w-1/4 mb-4" />
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="h-10 skeleton rounded flex-1" />
            <div className="h-10 skeleton rounded w-48" />
            <div className="h-10 skeleton rounded w-20" />
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[5/7] skeleton rounded-lg mb-3" />
              <div className="space-y-1">
                <div className="h-4 skeleton rounded" />
                <div className="h-3 skeleton rounded w-2/3" />
                <div className="h-3 skeleton rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CollectionManagerWithSuspense({ userId }: CollectionManagerWithSuspenseProps) {
  return (
    <Suspense fallback={<CollectionManagerSkeleton />}>
      <CollectionManager userId={userId} />
    </Suspense>
  );
}