'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type SortField = 'number' | 'price' | 'name';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField | null;
  direction: SortDirection;
}

interface SetSortingProps {
  sortConfig: SortConfig;
  onSortChange: (config: SortConfig) => void;
  disabled?: boolean;
  className?: string;
}

export function SetSorting({
  sortConfig,
  onSortChange,
  disabled = false,
  className,
}: SetSortingProps) {
  const handleSortClick = (field: SortField) => {
    if (disabled) return;

    let newDirection: SortDirection = 'asc';
    
    // If clicking the same field, toggle direction
    if (sortConfig.field === field) {
      newDirection = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    
    onSortChange({
      field,
      direction: newDirection,
    });
  };

  const sortOptions = [
    {
      field: 'number' as SortField,
      label: 'Number',
      description: 'Sort by card number',
    },
    {
      field: 'price' as SortField,
      label: 'Price',
      description: 'Sort by card price',
    },
    {
      field: 'name' as SortField,
      label: 'Name',
      description: 'Sort by card name',
    },
  ];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm font-medium text-muted">Sort by:</span>
      <div className="flex gap-1">
        {sortOptions.map((option) => (
          <SortButton
            key={option.field}
            option={option}
            isActive={sortConfig.field === option.field}
            direction={sortConfig.field === option.field ? sortConfig.direction : 'asc'}
            onClick={() => handleSortClick(option.field)}
            disabled={disabled}
          />
        ))}
        
        {/* Clear sorting button */}
        {sortConfig.field && (
          <button
            type="button"
            onClick={() => onSortChange({ field: null, direction: 'asc' })}
            disabled={disabled}
            title="Clear sorting"
            className={cn(
              'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-brand2/50 focus:ring-offset-2 focus:ring-offset-bg',
              'bg-panel text-muted hover:bg-panel2 border border-border',
              'hover:text-text',
              {
                'opacity-50 cursor-not-allowed': disabled,
                'hover:scale-105': !disabled,
              }
            )}
          >
            <XIcon className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

interface SortButtonProps {
  option: {
    field: SortField;
    label: string;
    description: string;
  };
  isActive: boolean;
  direction: SortDirection;
  onClick: () => void;
  disabled?: boolean;
}

function SortButton({ option, isActive, direction, onClick, disabled }: SortButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={`${option.description} (${direction === 'asc' ? 'ascending' : 'descending'})`}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
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
      <span>{option.label}</span>
      <SortIcon direction={direction} isActive={isActive} />
    </button>
  );
}

interface SortIconProps {
  direction: SortDirection;
  isActive: boolean;
}

function SortIcon({ direction, isActive }: SortIconProps) {
  return (
    <div className={cn('w-3 h-3 transition-opacity', {
      'opacity-100': isActive,
      'opacity-40': !isActive,
    })}>
      {direction === 'asc' ? (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m-6 4h3m4-4v12m0 0l3-3m-3 3l-3-3" />
        </svg>
      ) : (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-3-3m3 3l3-3" />
        </svg>
      )}
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default SetSorting;