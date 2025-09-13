import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/supabase/server';
import { getUserCollection, getCollectionValue } from '@/lib/db/queries';
import { CollectionWithVariants } from '@/components/collection/CollectionWithVariants';
import { CollectionStats } from '@/components/collection/CollectionStats';

interface CollectionPageProps {
  searchParams: {
    source?: 'cardmarket' | 'tcgplayer';
  };
}

export default async function CollectionPage({ searchParams }: CollectionPageProps) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/signin');
  }

  const priceSource = searchParams.source || 'cardmarket';
  
  // Fetch collection value summary
  const collectionValue = await getCollectionValue(user.id, priceSource);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-6 mb-8">
        <h1 className="text-4xl font-bold text-gradient">My Collection</h1>
        <p className="text-muted max-w-2xl mx-auto text-lg leading-relaxed">
          Manage your Pokemon card collection and track its value with real-time pricing data.
        </p>
      </div>


      {/* Collection Items */}
      <Suspense fallback={<CollectionSkeleton />}>
        <CollectionWithVariants
          userId={user.id}
          priceSource={priceSource}
        />
      </Suspense>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="stat-tile p-6">
          <div className="animate-pulse">
            <div className="h-4 skeleton rounded mb-2"></div>
            <div className="h-8 skeleton rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CollectionSkeleton() {
  return (
    <div className="panel">
      <div className="p-6 border-b border-border">
        <div className="animate-pulse">
          <div className="h-6 skeleton rounded w-1/4"></div>
        </div>
      </div>
      <div className="divide-y divide-border">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-6">
            <div className="animate-pulse flex space-x-4">
              <div className="w-16 h-24 skeleton rounded"></div>
              <div className="flex-1">
                <div className="h-4 skeleton rounded mb-2"></div>
                <div className="h-3 skeleton rounded w-2/3 mb-2"></div>
                <div className="h-3 skeleton rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Generate metadata for SEO
export function generateMetadata() {
  return {
    title: 'My Collection - Pokemon TCG | Lumidex v2',
    description: 'Manage your Pokemon Trading Card Game collection. Track cards, quantities, conditions, and monitor your collection value in real-time.',
  };
}

// This page requires authentication, so disable static generation
export const dynamic = 'force-dynamic';