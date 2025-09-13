'use client';

import { Fragment, useState, useEffect } from 'react';
import { Menu, Tab, Transition } from '@headlessui/react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ENABLED_TCG_TYPES, getTCGRoute, DEFAULT_TCG_TYPE } from '@/lib/tcg/constants';
import type { TCGSet, TCGType, TCGCard } from '@/types';

interface MegaMenuData {
  recentSets: Record<TCGType, TCGSet[]>;
  seriesByTCG: Record<TCGType, string[]>;
}

interface SearchResult {
  type: 'set' | 'card';
  item: TCGSet | (TCGCard & { set: TCGSet });
}

interface MegaMenuProps {
  className?: string;
}

export function MegaMenu({ className }: MegaMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [megaMenuData, setMegaMenuData] = useState<MegaMenuData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load megamenu data when opened
  useEffect(() => {
    if (isOpen && !megaMenuData) {
      loadMegaMenuData();
    }
  }, [isOpen, megaMenuData]);

  // Search API call
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.results || []);
        }
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const loadMegaMenuData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/megamenu');
      if (!response.ok) {
        throw new Error('Failed to fetch megamenu data');
      }
      const data: MegaMenuData = await response.json();
      setMegaMenuData(data);
    } catch (error) {
      console.error('Failed to load megamenu data:', error);
      // Set empty data on error
      setMegaMenuData({
        recentSets: {
          pokemon: [],
          lorcana: [],
          magic: [],
          yugioh: [],
          digimon: [],
          onepiece: [],
        },
        seriesByTCG: {
          pokemon: [],
          lorcana: [],
          magic: [],
          yugioh: [],
          digimon: [],
          onepiece: [],
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Menu as="div" className={cn('relative inline-block text-left', className)}>
      {({ open }) => {
        // Update isOpen state when menu opens/closes
        if (open !== isOpen) {
          setIsOpen(open);
        }
        
        return (
          <>
            <Menu.Button className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150',
              'hover:bg-panel2 hover:text-text flex items-center space-x-2',
              open
                ? 'nav-active text-text bg-panel2'
                : 'text-muted'
            )}>
              <span>Browse</span>
              <ChevronDownIcon className={cn(
                'w-4 h-4 transition-transform duration-200',
                open ? 'rotate-180' : ''
              )} />
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute left-0 top-full mt-2 w-screen max-w-4xl origin-top-left bg-bg border border-border rounded-2xl shadow-2xl z-50 p-6">
                <div className="space-y-6">
                  {/* Search Section */}
                  <div className="border-b border-border pb-4">
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
                      <input
                        type="text"
                        placeholder="Search sets across all TCGs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-panel2 border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-aurora focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* TCG Tabs */}
                  <Tab.Group defaultIndex={0}>
                    <Tab.List className="flex space-x-1 rounded-xl bg-panel2 p-1">
                      {ENABLED_TCG_TYPES.map((tcg) => (
                        <Tab
                          key={tcg.id}
                          className={({ selected }) =>
                            cn(
                              'w-full rounded-lg py-2.5 px-4 text-sm font-medium leading-5 transition-all duration-150',
                              'focus:outline-none focus:ring-2 focus:ring-aurora focus:ring-opacity-75',
                              selected
                                ? 'bg-bg text-text shadow'
                                : 'text-muted hover:bg-panel hover:text-text'
                            )
                          }
                        >
                          <div className="flex items-center justify-center space-x-2">
                            <span>{tcg.icon}</span>
                            <span>{tcg.displayName}</span>
                          </div>
                        </Tab>
                      ))}
                    </Tab.List>

                    <Tab.Panels className="mt-4">
                      {ENABLED_TCG_TYPES.map((tcg) => (
                        <Tab.Panel key={tcg.id}>
                          <TCGMegaMenuPanel
                            tcgType={tcg.id}
                            data={megaMenuData}
                            isLoading={isLoading}
                            searchQuery={searchQuery}
                            searchResults={searchResults}
                            isSearching={isSearching}
                          />
                        </Tab.Panel>
                      ))}
                    </Tab.Panels>
                  </Tab.Group>
                </div>
              </Menu.Items>
            </Transition>
          </>
        );
      }}
    </Menu>
  );
}

interface TCGMegaMenuPanelProps {
  tcgType: TCGType;
  data: MegaMenuData | null;
  isLoading: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
}

function TCGMegaMenuPanel({ tcgType, data, isLoading, searchQuery, searchResults, isSearching }: TCGMegaMenuPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-24 bg-panel2 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted">Failed to load sets. Please try again.</p>
      </div>
    );
  }

  const recentSets = data.recentSets[tcgType] || [];
  const series = data.seriesByTCG[tcgType] || [];

  // Use search results if searching, otherwise use recent sets
  const filteredSearchResults = searchQuery
    ? searchResults.filter(result => {
        if (result.type === 'set') {
          return (result.item as TCGSet).tcg_type === tcgType;
        } else {
          return (result.item as TCGCard & { set: TCGSet }).set.tcg_type === tcgType;
        }
      })
    : [];

  const displaySets = searchQuery ? [] : recentSets;

  if (isSearching) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aurora"></div>
          <span className="ml-3 text-muted">Searching...</span>
        </div>
      </div>
    );
  }

  if (filteredSearchResults.length === 0 && searchQuery) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-16 h-16 mx-auto text-muted opacity-50">
          <SearchIcon />
        </div>
        <div>
          <h3 className="text-lg font-medium text-text mb-2">No results found</h3>
          <p className="text-muted mb-4">
            No {ENABLED_TCG_TYPES.find(t => t.id === tcgType)?.displayName} sets or cards found for "{searchQuery}".
          </p>
          <Link
            href={`/cards?q=${encodeURIComponent(searchQuery)}` as any}
            className="inline-flex items-center px-4 py-2 bg-aurora text-white rounded-lg hover:bg-aurora-hover transition-colors"
          >
            Search All Cards →
          </Link>
        </div>
      </div>
    );
  }

  if (displaySets.length === 0 && !searchQuery) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-16 h-16 mx-auto text-muted opacity-50">
          <SetIcon />
        </div>
        <div>
          <h3 className="text-lg font-medium text-text mb-2">No sets available</h3>
          <p className="text-muted mb-4">
            Sets for this TCG will appear here when available.
          </p>
          <Link
            href={"/browse" as any}
            className="inline-flex items-center px-4 py-2 bg-aurora text-white rounded-lg hover:bg-aurora-hover transition-colors"
          >
            Browse All TCGs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Results or Recent Sets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text">
            {searchQuery ? 'Search Results' : 'Recent Sets'}
          </h3>
          {!searchQuery && (
            <Link
              href={getTCGRoute(tcgType) as any}
              className="text-sm text-aurora hover:text-aurora-hover font-medium transition-colors"
            >
              View All Sets →
            </Link>
          )}
        </div>
        
        <div className="space-y-4">
          {/* Display search results */}
          {searchQuery ? (
            <div className="space-y-3">
              {filteredSearchResults.map((result, index) => (
                <Menu.Item key={`${result.type}-${result.item.id}-${index}`}>
                  {({ active }) => {
                    if (result.type === 'set') {
                      const set = result.item as TCGSet;
                      return (
                        <Link
                          href={`${getTCGRoute(tcgType)}/${set.id}` as any}
                          className={cn(
                            'block p-4 rounded-lg border transition-all duration-150',
                            active
                              ? 'bg-panel2 border-aurora'
                              : 'bg-panel border-border hover:bg-panel2 hover:border-border'
                          )}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 flex-shrink-0">
                              {set.images?.symbol ? (
                                <Image
                                  src={set.images.symbol}
                                  alt={`${set.name} symbol`}
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-contain"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-full h-full bg-panel2 rounded-lg flex items-center justify-center text-muted">
                                  <span className="text-xs font-bold">📦</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs bg-aurora/20 text-aurora rounded px-1.5 py-0.5 font-medium">SET</span>
                                <h4 className="font-medium text-text text-sm truncate">
                                  {set.name}
                                </h4>
                              </div>
                              {set.series && (
                                <p className="text-xs text-muted truncate mt-1">
                                  {set.series}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    } else {
                      const card = result.item as TCGCard & { set: TCGSet };
                      return (
                        <Link
                          href={`/cards?q=${encodeURIComponent(card.name)}&setId=${card.set.id}` as any}
                          className={cn(
                            'block p-4 rounded-lg border transition-all duration-150',
                            active
                              ? 'bg-panel2 border-aurora'
                              : 'bg-panel border-border hover:bg-panel2 hover:border-border'
                          )}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 flex-shrink-0">
                              {card.images?.small ? (
                                <Image
                                  src={card.images.small}
                                  alt={card.name}
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover rounded"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-full h-full bg-panel2 rounded-lg flex items-center justify-center text-muted">
                                  <span className="text-xs font-bold">🃏</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs bg-emerald-500/20 text-emerald-400 rounded px-1.5 py-0.5 font-medium">CARD</span>
                                <h4 className="font-medium text-text text-sm truncate">
                                  {card.name}
                                </h4>
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs text-muted">#{card.number}</span>
                                <span className="text-xs text-muted">•</span>
                                <span className="text-xs text-muted truncate">{card.set.name}</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    }
                  }}
                </Menu.Item>
              ))}
            </div>
          ) : (
            /* Recent Sets Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displaySets.map((set) => (
                <Menu.Item key={set.id}>
                  {({ active }) => (
                    <Link
                      href={`${getTCGRoute(tcgType)}/${set.id}` as any}
                      className={cn(
                        'block p-4 rounded-lg border transition-all duration-150',
                        active
                          ? 'bg-panel2 border-aurora'
                          : 'bg-panel border-border hover:bg-panel2 hover:border-border'
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 flex-shrink-0">
                          {set.images?.symbol ? (
                            <Image
                              src={set.images.symbol}
                              alt={`${set.name} symbol`}
                              width={40}
                              height={40}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                // Fallback to TCG icon if image fails to load
                                e.currentTarget.style.display = 'none';
                              }}
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full bg-panel2 rounded-lg flex items-center justify-center text-muted">
                              <span className="text-xs font-bold">
                                {set.tcg_type === 'pokemon' ? '⚡' :
                                 set.tcg_type === 'lorcana' ? '✨' :
                                 set.tcg_type === 'magic' ? '🔮' :
                                 set.tcg_type === 'yugioh' ? '🌟' :
                                 set.tcg_type === 'digimon' ? '🔥' :
                                 set.tcg_type === 'onepiece' ? '🏴‍☠️' : '🎴'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-text text-sm truncate">
                            {set.name}
                          </h4>
                          {set.series && (
                            <p className="text-xs text-muted truncate">
                              {set.series}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs bg-panel2 rounded px-1.5 py-0.5 text-muted">
                              {set.total || set.printed_total || 0} cards
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )}
                </Menu.Item>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Series Quick Links */}
      {!searchQuery && series.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-4">Browse by Series</h3>
          <div className="flex flex-wrap gap-2">
            {series.map((seriesName) => (
              <Link
                key={seriesName}
                href={`${getTCGRoute(tcgType)}?series=${encodeURIComponent(seriesName)}` as any}
                className="inline-flex items-center px-3 py-1.5 bg-panel2 hover:bg-panel border border-border rounded-lg text-sm text-muted hover:text-text transition-colors"
              >
                {seriesName}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function SetIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5} 
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
      />
    </svg>
  );
}