'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { FilterType } from '@/hooks/use-set-collection';

interface SetFiltersProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts: {
    all: number;
    have: number;
    need: number;
    duplicates: number;
  };
  disabled?: boolean;
  className?: string;
}

export function SetFilters({
  activeFilter,
  onFilterChange,
  counts,
  disabled = false,
  className,
}: SetFiltersProps) {
  const filters = [
    {
      key: 'all' as FilterType,
      label: 'All',
      count: counts.all,
      description: 'All cards in set',
    },
    {
      key: 'have' as FilterType,
      label: 'Have',
      count: counts.have,
      description: 'Cards in your collection',
    },
    {
      key: 'need' as FilterType,
      label: 'Need',
      count: counts.need,
      description: 'Cards missing from collection',
    },
    {
      key: 'duplicates' as FilterType,
      label: 'Duplicates',
      count: counts.duplicates,
      description: 'Cards with multiple copies',
    },
  ];

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {filters.map((filter) => (
        <FilterButton
          key={filter.key}
          filter={filter}
          isActive={activeFilter === filter.key}
          onClick={() => onFilterChange(filter.key)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

interface FilterButtonProps {
  filter: {
    key: FilterType;
    label: string;
    count: number;
    description: string;
  };
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function FilterButton({ filter, isActive, onClick, disabled }: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={filter.description}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-brand2/50 focus:ring-offset-2 focus:ring-offset-bg',
        {
          // Active state
          'bg-brand2 text-white shadow-md': isActive,
          // Inactive state
          'bg-panel text-text hover:bg-panel2 border border-border': !isActive,
          // Disabled state
          'opacity-50 cursor-not-allowed': disabled,
          // Hover effects (only when not disabled)
          'hover:shadow-lg hover:scale-105': !disabled && !isActive,
        }
      )}
    >
      <span>{filter.label}</span>
      <span
        className={cn(
          'inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full text-xs font-bold',
          {
            'bg-white/20 text-white': isActive,
            'bg-muted/20 text-muted': !isActive,
          }
        )}
      >
        {filter.count}
      </span>
    </button>
  );
}

export default SetFilters;