'use client';

import { useState, useMemo } from 'react';
import { Combobox as HeadlessCombobox, Transition } from '@headlessui/react';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}

export function Combobox({
  options,
  value = '',
  onChange,
  placeholder = 'Select option...',
  label,
  error,
  className,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found',
  disabled = false,
}: ComboboxProps) {
  const [query, setQuery] = useState('');

  const selectedOption = options.find(option => option.value === value);

  const filteredOptions = useMemo(() => {
    if (query === '') return options;
    
    return options.filter((option) =>
      option.label.toLowerCase().includes(query.toLowerCase())
    );
  }, [options, query]);

  return (
    <div className={cn('form-group', className)}>
      {label && (
        <HeadlessCombobox.Label className="form-label">
          {label}
        </HeadlessCombobox.Label>
      )}
      
      <HeadlessCombobox 
        value={value} 
        onChange={onChange}
        disabled={disabled}
      >
        <div className="relative">
          <HeadlessCombobox.Input
            className={cn(
              'field w-full pr-10',
              error && 'border-danger focus:border-danger',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            displayValue={(value: string) => selectedOption?.label || ''}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={selectedOption ? selectedOption.label : placeholder}
          />
          
          <HeadlessCombobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3">
            <ChevronUpDownIcon className="h-4 w-4 text-muted" />
          </HeadlessCombobox.Button>
        </div>

        <Transition
          enter="transition duration-100 ease-out"
          enterFrom="transform scale-95 opacity-0"
          enterTo="transform scale-100 opacity-100"
          leave="transition duration-75 ease-out"
          leaveFrom="transform scale-100 opacity-100"
          leaveTo="transform scale-95 opacity-0"
        >
          <HeadlessCombobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto panel border border-border shadow-lg">
            {filteredOptions.length === 0 && query !== '' ? (
              <div className="relative cursor-default select-none px-4 py-2 text-muted">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <HeadlessCombobox.Option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={({ active, selected }) =>
                    cn(
                      'relative cursor-pointer select-none px-4 py-2 transition-colors',
                      active && 'bg-panel2 text-text',
                      selected && 'bg-purple-500/10 text-brand2',
                      option.disabled && 'opacity-50 cursor-not-allowed'
                    )
                  }
                >
                  {({ selected }) => (
                    <div className="flex items-center justify-between">
                      <span className={cn('block truncate', selected && 'font-medium')}>
                        {option.label}
                      </span>
                      {selected && (
                        <CheckIcon className="h-4 w-4 text-brand2" />
                      )}
                    </div>
                  )}
                </HeadlessCombobox.Option>
              ))
            )}
          </HeadlessCombobox.Options>
        </Transition>
      </HeadlessCombobox>

      {error && (
        <p className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}

// Icons
function ChevronUpDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}