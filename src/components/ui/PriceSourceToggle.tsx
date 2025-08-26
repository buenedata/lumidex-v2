'use client';

import { RadioGroup } from '@headlessui/react';
import { cn } from '@/lib/utils';

export type PriceSource = 'cardmarket' | 'tcgplayer';

export interface PriceSourceToggleProps {
  value: PriceSource;
  onChange: (source: PriceSource) => void;
  className?: string;
  size?: 'sm' | 'md';
}

const sources: { value: PriceSource; label: string; description: string }[] = [
  {
    value: 'cardmarket',
    label: 'Cardmarket',
    description: 'European marketplace pricing',
  },
  {
    value: 'tcgplayer',
    label: 'TCGplayer',
    description: 'US marketplace pricing',
  },
];

export function PriceSourceToggle({ 
  value, 
  onChange, 
  className,
  size = 'md' 
}: PriceSourceToggleProps) {
  const containerClasses = {
    sm: 'p-1',
    md: 'p-1.5',
  };

  const optionClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  return (
    <RadioGroup
      value={value}
      onChange={onChange}
      className={cn('flex bg-panel2 rounded-lg', containerClasses[size], className)}
      aria-label="Select price source"
    >
      {sources.map((source) => (
        <RadioGroup.Option
          key={source.value}
          value={source.value}
          className={({ checked }) =>
            cn(
              'flex-1 rounded-md font-medium transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand2/50 focus:ring-offset-2 focus:ring-offset-panel2',
              optionClasses[size],
              checked
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-muted hover:text-text hover:bg-panel'
            )
          }
        >
          {({ checked }) => (
            <span className="text-center block">
              {source.label}
            </span>
          )}
        </RadioGroup.Option>
      ))}
    </RadioGroup>
  );
}

export interface PriceSourceToggleWithLabelProps extends PriceSourceToggleProps {
  label?: string;
  showDescriptions?: boolean;
}

export function PriceSourceToggleWithLabel({ 
  label = 'Price Source',
  showDescriptions = false,
  className,
  ...props 
}: PriceSourceToggleWithLabelProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <RadioGroup.Label className="text-sm font-medium text-muted">
        {label}
      </RadioGroup.Label>
      <RadioGroup
        value={props.value}
        onChange={props.onChange}
        className="grid grid-cols-2 gap-2"
        aria-label="Select price source"
      >
        {sources.map((source) => (
          <RadioGroup.Option
            key={source.value}
            value={source.value}
            className={({ checked, active }) =>
              cn(
                'panel cursor-pointer transition-all duration-150',
                'hover:bg-panel2 focus:outline-none',
                checked && 'ring-2 ring-brand2 bg-panel2',
                active && 'ring-2 ring-brand2/50'
              )
            }
          >
            {({ checked }) => (
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <RadioGroup.Label className="text-sm font-medium text-text">
                    {source.label}
                  </RadioGroup.Label>
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border-2 transition-colors',
                      checked
                        ? 'border-brand2 bg-brand2'
                        : 'border-border'
                    )}
                  >
                    {checked && (
                      <div className="w-full h-full rounded-full bg-white scale-50" />
                    )}
                  </div>
                </div>
                {showDescriptions && (
                  <RadioGroup.Description className="text-xs text-muted mt-1">
                    {source.description}
                  </RadioGroup.Description>
                )}
              </div>
            )}
          </RadioGroup.Option>
        ))}
      </RadioGroup>
    </div>
  );
}

export default PriceSourceToggle;