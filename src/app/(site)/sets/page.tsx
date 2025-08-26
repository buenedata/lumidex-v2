import { getRecentSets, type TCGSet } from '@/lib/db/queries';
import { SetGrid } from '@/components/sets/SetTile';

export default async function SetsPage() {
  const setsData = await getRecentSets(50);
  
  // Transform the data to match SetGrid interface
  const sets = setsData.map(set => ({
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
        <h1 className="text-3xl font-bold text-gradient">Pokemon TCG Sets</h1>
        <p className="text-muted max-w-2xl mx-auto">
          Browse and explore the complete collection of Pokemon Trading Card Game sets with detailed card listings and release information.
        </p>
      </div>

      {/* Sets Grid */}
      <SetGrid sets={sets} showSeries />
    </div>
  );
}

// Enable ISR with revalidation every hour
export const revalidate = 3600;