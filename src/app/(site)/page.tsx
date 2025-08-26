import Link from 'next/link';
import { DashboardStats } from '@/components/dashboard/StatTiles';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';

export default function HomePage() {
  // Mock data - in real app this would come from API/database
  const mockStats = {
    totalValue: 1234.56,
    totalCards: 142,
    totalSets: 8,
    completedSets: 3,
    currency: 'EUR' as const,
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold text-gradient">
            Lumidex v2
          </h1>
          <p className="text-xl md:text-2xl text-muted max-w-3xl mx-auto">
            The ultimate Pokemon TCG collection manager with real-time pricing data from Cardmarket and TCGplayer
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/sets" className="btn btn-primary btn-lg">
            <CollectionIcon className="w-5 h-5 mr-2" />
            Browse Sets
          </Link>
          <Link href="/cards" className="btn btn-ghost btn-lg">
            <SearchIcon className="w-5 h-5 mr-2" />
            Search Cards
          </Link>
        </div>
      </section>

      {/* Dashboard Stats */}
      <section>
        <DashboardStats
          totalValue={mockStats.totalValue}
          totalCards={mockStats.totalCards}
          totalSets={mockStats.totalSets}
          completedSets={mockStats.completedSets}
          currency={mockStats.currency}
        />
      </section>

      {/* Feature Cards */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text mb-4">
            Everything you need to manage your collection
          </h2>
          <p className="text-muted">
            Professional tools with a touch of playful energy
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Browse Sets */}
          <Link href="/sets" className="group">
            <Panel variant="interactive" className="h-full">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-aurora-radial rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <CollectionIcon className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text group-hover:text-gradient transition-colors duration-200 mb-2">
                    Browse Sets
                  </h3>
                  <p className="text-muted">
                    Explore complete Pokemon TCG sets with detailed card listings, release information, and completion tracking.
                  </p>
                </div>
                <div className="flex items-center text-sm text-brand2 group-hover:translate-x-1 transition-transform duration-200">
                  <span>Explore sets</span>
                  <ArrowRightIcon className="w-4 h-4 ml-1" />
                </div>
              </div>
            </Panel>
          </Link>

          {/* Search Cards */}
          <Link href="/cards" className="group">
            <Panel variant="interactive" className="h-full">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-aurora-radial rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <SearchIcon className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text group-hover:text-gradient transition-colors duration-200 mb-2">
                    Search Cards
                  </h3>
                  <p className="text-muted">
                    Find specific cards with advanced filtering, real-time pricing data, and detailed card information.
                  </p>
                </div>
                <div className="flex items-center text-sm text-brand2 group-hover:translate-x-1 transition-transform duration-200">
                  <span>Search cards</span>
                  <ArrowRightIcon className="w-4 h-4 ml-1" />
                </div>
              </div>
            </Panel>
          </Link>

          {/* My Collection */}
          <Link href="/collection" className="group">
            <Panel variant="interactive" className="h-full">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-aurora-radial rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <HeartIcon className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text group-hover:text-gradient transition-colors duration-200 mb-2">
                    My Collection
                  </h3>
                  <p className="text-muted">
                    Manage your personal collection with value tracking, condition notes, and completion goals.
                  </p>
                </div>
                <div className="flex items-center text-sm text-brand2 group-hover:translate-x-1 transition-transform duration-200">
                  <span>View collection</span>
                  <ArrowRightIcon className="w-4 h-4 ml-1" />
                </div>
              </div>
            </Panel>
          </Link>
        </div>
      </section>

      {/* Getting Started */}
      <section className="panel p-8 bg-aurora-radial">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-text">
              Ready to start collecting?
            </h2>
            <p className="text-muted">
              Begin your Pokemon TCG journey with professional collection management tools.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signin" className="btn btn-primary btn-lg">
              Get Started
            </Link>
            <Link href="/sets" className="btn btn-ghost btn-lg">
              Explore Sets
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// Icons
function CollectionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}