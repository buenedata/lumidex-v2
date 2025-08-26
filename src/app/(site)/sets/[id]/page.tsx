import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getSetById, getCardsForSet, type TCGSet, type TCGCard } from '@/lib/db/queries';
import { SetDetailsClient } from '@/components/sets/SetDetailsClient';
import { Panel } from '@/components/ui/Panel';
import { Pill } from '@/components/ui/Pill';
import { formatDate } from '@/lib/utils';

interface SetDetailsPageProps {
  params: { id: string };
}

export default async function SetDetailsPage({ params }: SetDetailsPageProps) {
  const [set, cards] = await Promise.all([
    getSetById(params.id),
    getCardsForSet(params.id)
  ]);

  if (!set) {
    notFound();
  }

  return (
    <div className="space-y-8">
      {/* Set Header */}
      <SetHeader set={set} cardsCount={cards.length} />
      
      {/* Cards Section */}
      <SetDetailsClient cards={cards} />
    </div>
  );
}

function SetHeader({ set, cardsCount }: { set: TCGSet; cardsCount: number }) {
  const releaseDate = set.release_date
    ? formatDate(set.release_date)
    : 'Unknown';

  return (
    <Panel className="overflow-hidden">
      <div className="relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-aurora-radial opacity-30" />
        
        <div className="relative p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-8">
            {/* Set Logo */}
            <div className="flex-shrink-0 mb-6 lg:mb-0">
              <div className="w-32 h-32 bg-panel2 rounded-2xl overflow-hidden shadow-soft">
                {set.images?.logo ? (
                  <Image
                    src={set.images.logo}
                    alt={`${set.name} logo`}
                    width={128}
                    height={128}
                    className="w-full h-full object-contain p-3"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-16 h-16 bg-border rounded-full"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Set Details */}
            <div className="flex-1">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gradient mb-2">{set.name}</h1>
                  
                  {set.series && (
                    <p className="text-lg text-muted mb-6">{set.series}</p>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-text">Release Date:</span>
                        <span className="ml-2 text-muted">{releaseDate}</span>
                      </div>
                      
                      <div>
                        <span className="font-medium text-text">Cards Found:</span>
                        <span className="ml-2 text-muted">{cardsCount}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {set.total && (
                        <div>
                          <span className="font-medium text-text">Total Cards:</span>
                          <span className="ml-2 text-muted">{set.total}</span>
                        </div>
                      )}
                      
                      {set.printed_total && (
                        <div>
                          <span className="font-medium text-text">Printed Total:</span>
                          <span className="ml-2 text-muted">{set.printed_total}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {set.ptcgo_code && (
                    <div className="mt-6">
                      <Pill variant="brand" size="sm">
                        PTCGO: {set.ptcgo_code}
                      </Pill>
                    </div>
                  )}
                </div>

                {/* Set Symbol */}
                {set.images?.symbol && (
                  <div className="mt-6 lg:mt-0 flex-shrink-0">
                    <div className="w-20 h-20 bg-panel2 rounded-xl p-2 shadow-soft">
                      <Image
                        src={set.images.symbol}
                        alt={`${set.name} symbol`}
                        width={64}
                        height={64}
                        className="w-full h-full object-contain"
                        unoptimized
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: SetDetailsPageProps) {
  const set = await getSetById(params.id);
  
  if (!set) {
    return {
      title: 'Set Not Found - Lumidex v2'
    };
  }
  
  return {
    title: `${set.name} - Pokemon TCG Set | Lumidex v2`,
    description: `Browse cards from the ${set.name} Pokemon TCG set${set.series ? ` from the ${set.series} series` : ''}. View card details, prices, and manage your collection.`,
  };
}

// Enable ISR with revalidation every hour
export const revalidate = 3600;