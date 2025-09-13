import Link from 'next/link';
import { Panel } from '@/components/ui/Panel';
import { ENABLED_TCG_TYPES, getTCGRoute } from '@/lib/tcg/constants';
import { getRecentSetsByTCGType } from '@/lib/db/queries';
import { SetGrid } from '@/components/sets/SetTile';

export default async function BrowsePage() {
  // Get recent sets for each enabled TCG type
  const recentSetsByTCG = await getRecentSetsByTCGType(6);

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-gradient">Browse Trading Card Games</h1>
        <p className="text-muted max-w-3xl mx-auto text-lg">
          Explore and discover cards, sets, and collections across multiple trading card games. 
          Build your collection, track values, and connect with the TCG community.
        </p>
      </div>

      {/* TCG Grid */}
      <div className="grid gap-8 md:gap-12">
        {ENABLED_TCG_TYPES.map((tcg) => {
          const recentSets = recentSetsByTCG[tcg.id] || [];
          
          return (
            <section key={tcg.id} className="space-y-6">
              {/* TCG Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">{tcg.icon}</div>
                  <div>
                    <h2 className="text-2xl font-bold text-text">{tcg.displayName}</h2>
                    <p className="text-muted">{tcg.description}</p>
                  </div>
                </div>
                <Link
                  href={getTCGRoute(tcg.id) as any}
                  className="inline-flex items-center px-4 py-2 bg-aurora text-white rounded-lg hover:bg-aurora-hover transition-colors"
                >
                  View All Sets →
                </Link>
              </div>

              {/* Recent Sets Preview */}
              {recentSets.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold text-text mb-4">Recent Sets</h3>
                  <SetGrid 
                    sets={recentSets.map(set => ({
                      id: set.id,
                      name: set.name,
                      releaseDate: set.release_date || '',
                      printedTotal: set.printed_total ?? undefined,
                      total: set.total ?? undefined,
                      images: set.images,
                      series: set.series ?? undefined,
                    }))}
                    showSeries
                    className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
                  />
                </div>
              ) : (
                <Panel className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 text-muted opacity-50">
                    <ComingSoonIcon />
                  </div>
                  <h3 className="text-lg font-medium text-text mb-2">Coming Soon</h3>
                  <p className="text-muted mb-4">
                    {tcg.displayName} sets will be available here soon.
                  </p>
                  <div className="inline-flex items-center px-3 py-1.5 bg-panel2 rounded-lg text-sm text-muted">
                    🚧 In Development
                  </div>
                </Panel>
              )}
            </section>
          );
        })}
      </div>

      {/* Call to Action */}
      <div className="text-center space-y-6 py-12">
        <h2 className="text-3xl font-bold text-text">Start Building Your Collection</h2>
        <p className="text-muted max-w-2xl mx-auto">
          Track your cards, monitor values, and discover new sets across all your favorite trading card games.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={"/collection" as any}
            className="inline-flex items-center px-6 py-3 bg-aurora text-white rounded-lg hover:bg-aurora-hover transition-colors font-medium"
          >
            View My Collection
          </Link>
          <Link
            href={"/cards" as any}
            className="inline-flex items-center px-6 py-3 bg-panel2 text-text rounded-lg hover:bg-panel transition-colors font-medium border border-border"
          >
            Browse Cards
          </Link>
        </div>
      </div>
    </div>
  );
}

function ComingSoonIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5} 
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
      />
    </svg>
  );
}

// Enable ISR with revalidation every hour
export const revalidate = 3600;