import { Suspense } from 'react';
import { searchCards } from '@/lib/db/queries';
import { CardsSearchClient } from '@/components/cards/CardsSearchClient';
import { CardsGrid } from '@/components/cards/CardsGrid';
import { Pagination } from '@/components/ui/Pagination';

interface CardsPageProps {
  searchParams: {
    q?: string;
    setId?: string;
    types?: string;
    rarity?: string;
    regulationMark?: string;
    page?: string;
    source?: 'cardmarket' | 'tcgplayer';
  };
}

export default async function CardsPage({ searchParams }: CardsPageProps) {
  const page = parseInt(searchParams.page || '1');
  const pageSize = 24;
  
  // Parse types filter (comma-separated)
  const types = searchParams.types ? searchParams.types.split(',') : undefined;
  
  const { cards, totalCount } = await searchCards({
    query: searchParams.q,
    setId: searchParams.setId,
    types,
    rarity: searchParams.rarity,
    regulationMark: searchParams.regulationMark,
    page,
    pageSize
  });

  const totalPages = Math.ceil(totalCount / pageSize);
  const priceSource = searchParams.source || 'cardmarket';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gradient">Search Pokemon Cards</h1>
        <p className="text-muted max-w-2xl mx-auto">
          Browse and search through thousands of Pokemon Trading Card Game cards with real-time pricing from Cardmarket and TCGplayer.
        </p>
      </div>

      {/* Search and Filters */}
      <Suspense fallback={<SearchSkeleton />}>
        <CardsSearchClient initialFilters={searchParams} />
      </Suspense>

      {/* Results */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text">
              Search Results
            </h2>
            <p className="text-sm text-muted">
              {totalCount > 0 ? (
                <>
                  Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount} cards
                </>
              ) : (
                'No cards found'
              )}
            </p>
          </div>

          {searchParams.q && (
            <div className="text-sm text-muted">
              Search: <span className="text-text font-medium">"{searchParams.q}"</span>
            </div>
          )}
        </div>

        <Suspense fallback={<CardsSkeleton />}>
          <CardsGrid cards={cards} priceSource={priceSource} />
        </Suspense>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            baseUrl="/cards"
            searchParams={searchParams}
          />
        )}
      </div>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="panel p-6">
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="h-4 skeleton rounded mb-2"></div>
              <div className="h-10 skeleton rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid-cards">
      {[...Array(24)].map((_, i) => (
        <div key={i} className="panel overflow-hidden p-0">
          <div className="aspect-card skeleton"></div>
          <div className="p-3">
            <div className="h-4 skeleton rounded mb-2"></div>
            <div className="h-3 skeleton rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Generate metadata for SEO
export function generateMetadata({ searchParams }: CardsPageProps) {
  const query = searchParams.q;
  const title = query 
    ? `Search results for "${query}" - Pokemon Cards | Lumidex v2`
    : 'Pokemon Cards Search | Lumidex v2';
    
  const description = query
    ? `Search results for "${query}" among thousands of Pokemon Trading Card Game cards. View prices, details, and manage your collection.`
    : 'Search and browse thousands of Pokemon Trading Card Game cards. View current prices from Cardmarket and TCGplayer, and manage your collection.';

  return {
    title,
    description,
  };
}

// Enable ISR with revalidation every hour
export const revalidate = 3600;