'use client';

import { useState } from 'react';
import Image from 'next/image';
import { SetCardsWithFilters, type SetPriceStats } from '@/components/sets/SetCardsWithFilters';
import { MasterSetToggle } from '@/components/sets/MasterSetToggle';
import { ResetCollectionDialog } from '@/components/sets/ResetCollectionDialog';
import { SetProgressBar } from '@/components/sets/SetProgressBar';
import { Panel } from '@/components/ui/Panel';
import { formatDate } from '@/lib/utils';
import { useSetCollection } from '@/hooks/use-set-collection';
import type { TCGSet, TCGCard } from '@/lib/db/queries';
import type { UserPreferences } from '@/types';

interface SetPageClientWrapperProps {
  setId: string;
  set: TCGSet;
  cards: TCGCard[];
  tcgInfo: any;
  userPreferences: UserPreferences | null;
}

export function SetPageClientWrapper({
  setId,
  set,
  cards,
  tcgInfo,
  userPreferences
}: SetPageClientWrapperProps) {
  const [priceStats, setPriceStats] = useState<SetPriceStats | null>(null);
  const [showMasterSetInfo, setShowMasterSetInfo] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [filterCounts, setFilterCounts] = useState({ all: 0, have: 0, need: 0, duplicates: 0 });

  // Normalize cards for the set collection hook
  const normalizedCards = cards.map(card => ({
    id: card.id,
    name: card.name,
    number: card.number,
    rarity: card.rarity ?? undefined,
    images: card.images || undefined,
  }));
  
  const setCollection = useSetCollection({
    setId,
    cards: normalizedCards,
    userQuantities: {}, // We'll let SetCardsWithFilters handle the bulk loading
    variantData: undefined // No variant data needed here, SetCardsWithFilters will handle it
  });

  const handleMasterSetToggle = async (isMasterSet: boolean) => {
    try {
      await setCollection.updateMasterSet({ isMasterSet });
    } catch (error) {
      console.error('Failed to update master set preference:', error);
    }
  };

  const handleResetCollection = async () => {
    try {
      const result = await setCollection.resetCollection();
      console.log('Collection reset:', result);
      setShowResetDialog(false);
    } catch (error) {
      console.error('Failed to reset collection:', error);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted">
        <ol className="flex items-center space-x-2">
          <li>
            <a href="/browse" className="hover:text-text transition-colors">
              Browse
            </a>
          </li>
          <li className="flex items-center space-x-2">
            <span>/</span>
            <a href="/pokemon/sets" className="hover:text-text transition-colors flex items-center space-x-1">
              <span>{tcgInfo.icon}</span>
              <span>{tcgInfo.displayName}</span>
            </a>
          </li>
          <li className="flex items-center space-x-2">
            <span>/</span>
            <span className="text-text">{set.name}</span>
          </li>
        </ol>
      </nav>

      {/* Set Header */}
      <SetHeader
        set={set}
        cardsCount={cards.length}
        tcgInfo={tcgInfo}
        priceStats={priceStats}
        setCollection={setCollection}
        onMasterSetToggle={handleMasterSetToggle}
        formatPrice={formatPrice}
        showMasterSetInfo={showMasterSetInfo}
        setShowMasterSetInfo={setShowMasterSetInfo}
        setShowResetDialog={setShowResetDialog}
        filterCounts={filterCounts}
      />
      
      {/* Master Set Info */}
      {showMasterSetInfo && (
        <div className="p-3 rounded-lg bg-panel2 border border-border">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 w-5 h-5 mt-0.5">
              <svg
                className="w-full h-full text-brand2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-text mb-1">
                {setCollection.isMasterSet ? 'Master Set Mode' : 'Normal Set Mode'}
              </h4>
              
              <div className="text-xs text-muted space-y-1">
                {setCollection.isMasterSet ? (
                  <>
                    <p>
                      In <strong>Master Set</strong> mode, a card is only considered "Have" when you own
                      <strong> all available variants</strong> of that card.
                    </p>
                    <p>
                      Cards will appear in "Need" until you collect every variant (Normal, Holo, Reverse Holo, etc.).
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      In <strong>Normal Set</strong> mode, a card is considered "Have" when you own
                      <strong> any variant</strong> of that card.
                    </p>
                    <p>
                      Having just one variant (like Normal or Holo) marks the card as collected.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cards Section with Filters */}
      <SetCardsWithFilters
        setId={setId}
        setName={set.name}
        cards={cards}
        priceSource={userPreferences?.preferred_price_source}
        userCurrency={userPreferences?.preferred_currency}
        onPriceStatsChange={setPriceStats}
        onFilterCountsChange={setFilterCounts}
        hideCollectionToggle={true}
      />

      {/* Reset Collection Dialog */}
      <ResetCollectionDialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        onConfirm={handleResetCollection}
        setName={set.name}
        isLoading={setCollection.isResetting}
        collectionStats={{
          collectedCards: setCollection.collectedCards,
          totalQuantity: setCollection.totalCards,
        }}
      />
    </div>
  );
}

function SetHeader({
  set,
  cardsCount,
  tcgInfo,
  priceStats,
  setCollection,
  onMasterSetToggle,
  formatPrice,
  showMasterSetInfo,
  setShowMasterSetInfo,
  setShowResetDialog,
  filterCounts
}: {
  set: TCGSet;
  cardsCount: number;
  tcgInfo: any;
  priceStats: SetPriceStats | null;
  setCollection: any;
  onMasterSetToggle: (isMasterSet: boolean) => void;
  formatPrice: (price: number, currency: string) => string;
  showMasterSetInfo: boolean;
  setShowMasterSetInfo: (show: boolean) => void;
  setShowResetDialog: (show: boolean) => void;
  filterCounts: { all: number; have: number; need: number; duplicates: number };
}) {
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
              <div className="w-32 h-32 bg-panel2 rounded-2xl overflow-hidden shadow-soft mb-4">
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
              
              {/* Set Symbol underneath */}
              {set.images?.symbol && (
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-panel2 rounded-xl p-2 shadow-soft">
                    <Image
                      src={set.images.symbol}
                      alt={`${set.name} symbol`}
                      width={48}
                      height={48}
                      className="w-full h-full object-contain"
                      unoptimized
                    />
                  </div>
                </div>
              )}
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
                      
                      {set.total && set.printed_total && (
                        <div>
                          <span className="font-medium text-text">Secret Cards:</span>
                          <span className="ml-2 text-muted">{set.total - set.printed_total}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      {/* Empty column for layout balance */}
                    </div>
                  </div>
                  
                  {/* Progress Bar - placed in left column below set info */}
                  <div className="mt-6 max-w-sm">
                    <SetProgressBar
                      percentage={filterCounts.all > 0 ? Math.round((filterCounts.have / filterCounts.all) * 100) : 0}
                      collectedCards={filterCounts.have}
                      totalCards={filterCounts.all}
                      isMasterSet={setCollection.isMasterSet}
                      size="md"
                    />
                  </div>
                  
                </div>

                {/* Right Side Info Boxes */}
                <div className="mt-6 lg:mt-0 flex-shrink-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 min-w-[200px]">
                    {/* Most Expensive Card */}
                    <div className="bg-panel2 rounded-xl p-4 shadow-soft">
                      <div className="text-center">
                        <div className="text-xs text-muted uppercase tracking-wide mb-2">Most Expensive</div>
                        <div className="text-lg font-bold text-text mb-1">
                          {priceStats?.mostExpensive ?
                            formatPrice(priceStats.mostExpensive.price, priceStats.mostExpensive.currency) :
                            '€--'
                          }
                        </div>
                        <div className="text-xs text-muted truncate" title={priceStats?.mostExpensive?.cardName}>
                          {priceStats?.mostExpensive?.cardName || 'Card Name'}
                        </div>
                      </div>
                    </div>

                    {/* Collection Mode Toggle */}
                    <div className="bg-panel2 rounded-xl p-4 shadow-soft">
                      <div className="space-y-3">
                        <div className="flex items-center justify-center">
                          <MasterSetToggle
                            isMasterSet={setCollection.isMasterSet}
                            onChange={onMasterSetToggle}
                            loading={setCollection.isUpdatingPreferences}
                          />
                        </div>
                        
                        {/* Action buttons under the toggle */}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => setShowMasterSetInfo(!showMasterSetInfo)}
                            className="text-xs px-3 py-1 bg-panel rounded-md hover:bg-border transition-colors text-text"
                          >
                            {showMasterSetInfo ? 'Hide' : 'Show'} Info
                          </button>
                          
                          <button
                            onClick={() => setShowResetDialog(true)}
                            disabled={setCollection.isResetting}
                            className="text-xs px-3 py-1 bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            Reset Collection
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}