'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import type { TCGCard } from '@/lib/db/queries';
import type { PriceSource } from '@/lib/variants/mapper';
import { CardGrid } from '@/components/cards/CardTile';
import { Panel } from '@/components/ui/Panel';
import { Field, Select } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';

interface SetDetailsClientProps {
  cards: TCGCard[];
}

export function SetDetailsClient({ cards }: SetDetailsClientProps) {
  const searchParams = useSearchParams();
  const priceSource = (searchParams.get('source') as PriceSource) || 'cardmarket';
  
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    rarity: '',
    supertype: ''
  });

  // Get unique filter options
  const filterOptions = useMemo(() => {
    const types = new Set<string>();
    const rarities = new Set<string>();
    const supertypes = new Set<string>();

    cards.forEach(card => {
      card.types?.forEach(type => types.add(type));
      if (card.rarity) rarities.add(card.rarity);
      if (card.supertype) supertypes.add(card.supertype);
    });

    return {
      types: Array.from(types).sort(),
      rarities: Array.from(rarities).sort(),
      supertypes: Array.from(supertypes).sort()
    };
  }, [cards]);

  // Filter cards based on current filters
  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!card.name.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      if (filters.type && !card.types?.includes(filters.type)) {
        return false;
      }
      
      if (filters.rarity && card.rarity !== filters.rarity) {
        return false;
      }
      
      if (filters.supertype && card.supertype !== filters.supertype) {
        return false;
      }
      
      return true;
    });
  }, [cards, filters]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <FiltersSection
        filters={filters}
        onFiltersChange={setFilters}
        filterOptions={filterOptions}
        totalCards={cards.length}
        filteredCount={filteredCards.length}
      />

      {/* Cards Grid */}
      <CardGrid
        cards={filteredCards.map(card => ({
          id: card.id,
          name: card.name,
          number: card.number,
          rarity: card.rarity ?? undefined,
          types: card.types ?? undefined,
          hp: card.hp ? parseInt(card.hp, 10) : undefined,
          supertype: card.supertype ?? undefined,
          set_id: card.set_id ?? undefined,
          images: card.images,
        }))}
        priceSource={priceSource}
      />
    </div>
  );
}

interface FiltersSectionProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  filterOptions: any;
  totalCards: number;
  filteredCount: number;
}

function FiltersSection({
  filters,
  onFiltersChange,
  filterOptions,
  totalCards,
  filteredCount
}: FiltersSectionProps) {
  const updateFilter = (key: string, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      type: '',
      rarity: '',
      supertype: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <Panel>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <h2 className="text-lg font-semibold text-text">
          Cards ({filteredCount}{totalCards !== filteredCount && ` of ${totalCards}`})
        </h2>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="mt-2 lg:mt-0"
          >
            Clear filters
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <Field
          label="Search"
          type="text"
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          placeholder="Card name..."
        />

        {/* Type */}
        <Select
          label="Type"
          value={filters.type}
          onChange={(e) => updateFilter('type', e.target.value)}
        >
          <option value="">All types</option>
          {filterOptions.types.map((type: string) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </Select>

        {/* Rarity */}
        <Select
          label="Rarity"
          value={filters.rarity}
          onChange={(e) => updateFilter('rarity', e.target.value)}
        >
          <option value="">All rarities</option>
          {filterOptions.rarities.map((rarity: string) => (
            <option key={rarity} value={rarity}>{rarity}</option>
          ))}
        </Select>

        {/* Supertype */}
        <Select
          label="Supertype"
          value={filters.supertype}
          onChange={(e) => updateFilter('supertype', e.target.value)}
        >
          <option value="">All supertypes</option>
          {filterOptions.supertypes.map((supertype: string) => (
            <option key={supertype} value={supertype}>{supertype}</option>
          ))}
        </Select>
      </div>
    </Panel>
  );
}