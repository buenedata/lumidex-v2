import { getSetsByTCGType, getSeriesByTCGType } from '@/lib/db/queries';
import { SetGrid } from '@/components/sets/SetTile';
import { getTCGInfo } from '@/lib/tcg/constants';
import { Panel } from '@/components/ui/Panel';

interface LorcanaSetsPageProps {
  searchParams: {
    series?: string;
    search?: string;
  };
}

export default async function LorcanaSetsPage({ searchParams }: LorcanaSetsPageProps) {
  const { series: selectedSeries, search } = searchParams;
  const tcgInfo = getTCGInfo('lorcana');
  
  // Get all series for filtering
  const seriesByTCG = await getSeriesByTCGType();
  const lorcanaSeries = seriesByTCG.lorcana || [];
  
  // Get sets data
  const setsData = await getSetsByTCGType('lorcana', selectedSeries, 100);
  
  // Filter by search if provided
  const filteredSets = search 
    ? setsData.filter(set => 
        set.name.toLowerCase().includes(search.toLowerCase()) ||
        set.series?.toLowerCase().includes(search.toLowerCase())
      )
    : setsData;
  
  // Transform the data to match SetGrid interface
  const sets = filteredSets.map(set => ({
    id: set.id,
    name: set.name,
    releaseDate: set.release_date || '',
    printedTotal: set.printed_total ?? undefined,
    total: set.total ?? undefined,
    images: set.images,
    series: set.series ?? undefined,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-4 mb-4">
          <span className="text-4xl">{tcgInfo.icon}</span>
          <h1 className="text-3xl font-bold text-gradient">{tcgInfo.displayName} Sets</h1>
        </div>
        <p className="text-muted max-w-2xl mx-auto">
          Discover the magical world of Disney Lorcana trading card game sets featuring beloved Disney characters 
          and enchanting stories.
        </p>
      </div>

      {/* Coming Soon Message */}
      {sets.length === 0 && !search && !selectedSeries && (
        <Panel className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 text-muted opacity-50">
            <ComingSoonIcon />
          </div>
          <h2 className="text-2xl font-bold text-text mb-4">Disney Lorcana Coming Soon!</h2>
          <p className="text-muted max-w-md mx-auto mb-8">
            We're working hard to bring you Disney Lorcana sets and cards. Stay tuned for magical adventures 
            featuring your favorite Disney characters.
          </p>
          
          <div className="space-y-4">
            <div className="inline-flex items-center px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium">
              🚧 In Development
            </div>
            
            <div className="text-sm text-muted">
              <p>Expected features:</p>
              <ul className="mt-2 space-y-1">
                <li>• Complete set collections</li>
                <li>• Card tracking and pricing</li>
                <li>• Series organization</li>
                <li>• Collection management</li>
              </ul>
            </div>
          </div>
        </Panel>
      )}

      {/* Filters (when sets are available) */}
      {sets.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Series Filter */}
          <div className="flex flex-wrap gap-2">
            <FilterButton 
              active={!selectedSeries} 
              href="/lorcana/sets"
              label="All Series" 
            />
            {lorcanaSeries.map((seriesName) => (
              <FilterButton
                key={seriesName}
                active={selectedSeries === seriesName}
                href={`/lorcana/sets?series=${encodeURIComponent(seriesName)}`}
                label={seriesName}
              />
            ))}
          </div>

          {/* Search */}
          <div className="w-full lg:w-auto">
            <SearchForm currentSearch={search} currentSeries={selectedSeries} />
          </div>
        </div>
      )}

      {/* Sets Grid (when available) */}
      {sets.length > 0 && (
        <>
          <div className="text-sm text-muted">
            Showing {sets.length} set{sets.length !== 1 ? 's' : ''}
          </div>
          <SetGrid sets={sets} showSeries={!selectedSeries} />
        </>
      )}

      {/* No results for search */}
      {sets.length === 0 && (search || selectedSeries) && (
        <Panel className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 text-muted opacity-50">
            <SearchIcon />
          </div>
          <h3 className="text-lg font-medium text-text mb-2">No sets found</h3>
          <p className="text-muted mb-6">
            {search 
              ? `No sets match "${search}"${selectedSeries ? ` in the ${selectedSeries} series` : ''}.`
              : selectedSeries 
              ? `No sets found in the ${selectedSeries} series.`
              : 'No sets available.'
            }
          </p>
          <a
            href="/lorcana/sets"
            className="inline-flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            View All Sets
          </a>
        </Panel>
      )}
    </div>
  );
}

interface FilterButtonProps {
  active: boolean;
  href: string;
  label: string;
}

function FilterButton({ active, href, label }: FilterButtonProps) {
  return (
    <a
      href={href}
      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-purple-500 text-white'
          : 'bg-panel2 text-muted hover:bg-panel hover:text-text border border-border'
      }`}
    >
      {label}
    </a>
  );
}

interface SearchFormProps {
  currentSearch?: string;
  currentSeries?: string;
}

function SearchForm({ currentSearch, currentSeries }: SearchFormProps) {
  return (
    <form method="GET" className="relative">
      {currentSeries && (
        <input type="hidden" name="series" value={currentSeries} />
      )}
      <input
        type="search"
        name="search"
        placeholder="Search sets..."
        defaultValue={currentSearch}
        className="w-full lg:w-64 pl-10 pr-4 py-2 bg-panel2 border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
      />
      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
    </form>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
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