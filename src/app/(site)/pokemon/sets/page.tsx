import { getSetsByTCGType, getSeriesByTCGType } from '@/lib/db/queries';
import { SetGrid } from '@/components/sets/SetTile';
import { getTCGInfo } from '@/lib/tcg/constants';
import { Panel } from '@/components/ui/Panel';

interface PokemonSetsPageProps {
  searchParams: {
    series?: string;
    search?: string;
  };
}

export default async function PokemonSetsPage({ searchParams }: PokemonSetsPageProps) {
  const { series: selectedSeries, search } = searchParams;
  const tcgInfo = getTCGInfo('pokemon');
  
  // Get all series for filtering
  const seriesByTCG = await getSeriesByTCGType();
  const pokemonSeries = seriesByTCG.pokemon || [];
  
  // Get sets data
  const setsData = await getSetsByTCGType('pokemon', selectedSeries, 100);
  
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
          Explore the complete collection of Pokémon Trading Card Game sets with detailed card listings, 
          release information, and series organization.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* Series Filter */}
        <div className="flex flex-wrap gap-2">
          <FilterButton 
            active={!selectedSeries} 
            href="/pokemon/sets"
            label="All Series" 
          />
          {pokemonSeries.map((seriesName) => (
            <FilterButton
              key={seriesName}
              active={selectedSeries === seriesName}
              href={`/pokemon/sets?series=${encodeURIComponent(seriesName)}`}
              label={seriesName}
            />
          ))}
        </div>

        {/* Search */}
        <div className="w-full lg:w-auto">
          <SearchForm currentSearch={search} currentSeries={selectedSeries} />
        </div>
      </div>

      {/* Current Filter Display */}
      {(selectedSeries || search) && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">Showing:</span>
          {selectedSeries && (
            <span className="inline-flex items-center px-2 py-1 bg-aurora text-white rounded text-xs">
              {selectedSeries}
            </span>
          )}
          {search && (
            <span className="inline-flex items-center px-2 py-1 bg-panel2 text-text rounded text-xs">
              "{search}"
            </span>
          )}
          <a
            href="/pokemon/sets"
            className="text-aurora hover:text-aurora-hover text-xs ml-2"
          >
            Clear filters
          </a>
        </div>
      )}

      {/* Sets Grid */}
      {sets.length > 0 ? (
        <>
          <div className="text-sm text-muted">
            Showing {sets.length} set{sets.length !== 1 ? 's' : ''}
          </div>
          <SetGrid sets={sets} showSeries={!selectedSeries} />
        </>
      ) : (
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
          {(search || selectedSeries) && (
            <a
              href="/pokemon/sets"
              className="inline-flex items-center px-4 py-2 bg-aurora text-white rounded-lg hover:bg-aurora-hover transition-colors"
            >
              View All Sets
            </a>
          )}
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
          ? 'bg-aurora text-white'
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
        className="w-full lg:w-64 pl-10 pr-4 py-2 bg-panel2 border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-aurora focus:border-transparent"
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

// Enable ISR with revalidation every hour
export const revalidate = 3600;