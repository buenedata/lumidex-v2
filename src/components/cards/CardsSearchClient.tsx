'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

interface CardsSearchClientProps {
  initialFilters: {
    q?: string;
    setId?: string;
    types?: string;
    rarity?: string;
    regulationMark?: string;
    page?: string;
    source?: 'cardmarket' | 'tcgplayer';
  };
}

export function CardsSearchClient({ initialFilters }: CardsSearchClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [filters, setFilters] = useState({
    q: initialFilters.q || '',
    setId: initialFilters.setId || '',
    types: initialFilters.types || '',
    rarity: initialFilters.rarity || '',
    regulationMark: initialFilters.regulationMark || ''
  });

  const [isSearching, setIsSearching] = useState(false);

  // Update URL when filters change
  const updateURL = (newFilters: typeof filters) => {
    setIsSearching(true);
    
    const params = new URLSearchParams(searchParams);
    
    // Update or remove filter parameters
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    
    // Reset to page 1 when filters change
    params.delete('page');
    
    // Preserve source parameter
    const source = searchParams.get('source');
    if (source) {
      params.set('source', source);
    }
    
    const queryString = params.toString();
    const newURL = queryString ? `/cards?${queryString}` : '/cards';
    
    router.push(newURL as any);
    
    // Reset searching state after a short delay
    setTimeout(() => setIsSearching(false), 500);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateURL(filters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      q: '',
      setId: '',
      types: '',
      rarity: '',
      regulationMark: ''
    };
    setFilters(clearedFilters);
    updateURL(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <Panel>
      <form onSubmit={handleSearch} className="space-y-4">
        {/* Search Input */}
        <div>
          <label htmlFor="search" className="form-label">
            Search Cards
          </label>
          <div className="flex space-x-2">
            <Field
              id="search"
              type="text"
              value={filters.q}
              onChange={(e) => handleFilterChange('q', e.target.value)}
              placeholder="Enter card name..."
              className="flex-1"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={isSearching}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-border">
          {/* Set ID */}
          <div>
            <label htmlFor="setId" className="form-label">
              Set ID
            </label>
            <Field
              id="setId"
              type="text"
              value={filters.setId}
              onChange={(e) => handleFilterChange('setId', e.target.value)}
              placeholder="e.g. sv4, base1"
            />
          </div>

          {/* Types */}
          <div>
            <label htmlFor="types" className="form-label">
              Types
            </label>
            <Field
              id="types"
              type="text"
              value={filters.types}
              onChange={(e) => handleFilterChange('types', e.target.value)}
              placeholder="e.g. Fire,Water"
            />
            <p className="text-xs text-muted mt-1">Comma-separated</p>
          </div>

          {/* Rarity */}
          <div>
            <label htmlFor="rarity" className="form-label">
              Rarity
            </label>
            <select
              id="rarity"
              value={filters.rarity}
              onChange={(e) => handleFilterChange('rarity', e.target.value)}
              className="field w-full"
            >
              <option value="">All rarities</option>
              <option value="Common">Common</option>
              <option value="Uncommon">Uncommon</option>
              <option value="Rare">Rare</option>
              <option value="Rare Holo">Rare Holo</option>
              <option value="Rare Ultra">Rare Ultra</option>
              <option value="Rare Secret">Rare Secret</option>
              <option value="Rare Rainbow">Rare Rainbow</option>
              <option value="Amazing Rare">Amazing Rare</option>
              <option value="Radiant Rare">Radiant Rare</option>
              <option value="Classic Collection">Classic Collection</option>
            </select>
          </div>

          {/* Regulation Mark */}
          <div>
            <label htmlFor="regulationMark" className="form-label">
              Regulation Mark
            </label>
            <select
              id="regulationMark"
              value={filters.regulationMark}
              onChange={(e) => handleFilterChange('regulationMark', e.target.value)}
              className="field w-full"
            >
              <option value="">All regulation marks</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
              <option value="E">E</option>
              <option value="F">F</option>
              <option value="G">G</option>
              <option value="H">H</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        {hasActiveFilters && (
          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={clearFilters}
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </form>
    </Panel>
  );
}