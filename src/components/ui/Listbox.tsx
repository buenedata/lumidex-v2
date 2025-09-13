'use client';

import { Listbox as HeadlessListbox, Transition } from '@headlessui/react';
import { cn } from '@/lib/utils';

export interface ListboxOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
}

export interface ListboxProps {
  options: ListboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
  multiple?: boolean;
}

export function Listbox({
  options,
  value = '',
  onChange,
  placeholder = 'Select option...',
  label,
  error,
  className,
  disabled = false,
}: ListboxProps) {
  const selectedOption = options.find(option => option.value === value);

  return (
    <div className={cn('form-group', className)}>
      <HeadlessListbox
        value={value}
        onChange={onChange}
        disabled={disabled}
      >
        {label && (
          <HeadlessListbox.Label className="form-label">
            {label}
          </HeadlessListbox.Label>
        )}
        <div className="relative">
          <HeadlessListbox.Button
            className={cn(
              'field w-full text-left flex items-center justify-between',
              error && 'border-danger focus:border-danger',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span className={cn(
              'block truncate',
              !selectedOption && 'text-muted'
            )}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronUpDownIcon className="h-4 w-4 text-muted ml-2 flex-shrink-0" />
          </HeadlessListbox.Button>

          <Transition
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <HeadlessListbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto panel border border-border shadow-lg">
              {options.map((option) => (
                <HeadlessListbox.Option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={({ active, selected }) =>
                    cn(
                      'relative cursor-pointer select-none px-4 py-3 transition-colors',
                      active && 'bg-panel2 text-text',
                      selected && 'bg-purple-500/10 text-brand2',
                      option.disabled && 'opacity-50 cursor-not-allowed'
                    )
                  }
                >
                  {({ selected }) => (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <span className={cn('block', selected && 'font-medium')}>
                          {option.label}
                        </span>
                        {option.description && (
                          <span className="text-xs text-muted mt-1 block">
                            {option.description}
                          </span>
                        )}
                      </div>
                      {selected && (
                        <CheckIcon className="h-4 w-4 text-brand2 ml-2" />
                      )}
                    </div>
                  )}
                </HeadlessListbox.Option>
              ))}
            </HeadlessListbox.Options>
          </Transition>
        </div>
      </HeadlessListbox>

      {error && (
        <p className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}

export interface MultiListboxProps extends Omit<ListboxProps, 'value' | 'onChange'> {
  values: string[];
  onChange: (values: string[]) => void;
  maxDisplayed?: number;
}

export function MultiListbox({
  options,
  values = [],
  onChange,
  placeholder = 'Select options...',
  label,
  error,
  className,
  disabled = false,
  maxDisplayed = 3,
}: MultiListboxProps) {
  const selectedOptions = options.filter(option => values.includes(option.value));
  
  const displayText = () => {
    if (selectedOptions.length === 0) return placeholder;
    if (selectedOptions.length <= maxDisplayed) {
      return selectedOptions.map(option => option.label).join(', ');
    }
    return `${selectedOptions.slice(0, maxDisplayed).map(option => option.label).join(', ')} +${selectedOptions.length - maxDisplayed}`;
  };

  return (
    <div className={cn('form-group', className)}>
      <HeadlessListbox
        value={values}
        onChange={onChange}
        disabled={disabled}
        multiple
      >
        {label && (
          <HeadlessListbox.Label className="form-label">
            {label}
          </HeadlessListbox.Label>
        )}
        <div className="relative">
          <HeadlessListbox.Button
            className={cn(
              'field w-full text-left flex items-center justify-between',
              error && 'border-danger focus:border-danger',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span className={cn(
              'block truncate',
              selectedOptions.length === 0 && 'text-muted'
            )}>
              {displayText()}
            </span>
            <ChevronUpDownIcon className="h-4 w-4 text-muted ml-2 flex-shrink-0" />
          </HeadlessListbox.Button>

          <Transition
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <HeadlessListbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto panel border border-border shadow-lg">
              {options.map((option) => (
                <HeadlessListbox.Option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={({ active, selected }) =>
                    cn(
                      'relative cursor-pointer select-none px-4 py-3 transition-colors',
                      active && 'bg-panel2 text-text',
                      selected && 'bg-purple-500/10 text-brand2',
                      option.disabled && 'opacity-50 cursor-not-allowed'
                    )
                  }
                >
                  {({ selected }) => (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <span className={cn('block', selected && 'font-medium')}>
                          {option.label}
                        </span>
                        {option.description && (
                          <span className="text-xs text-muted mt-1 block">
                            {option.description}
                          </span>
                        )}
                      </div>
                      {selected && (
                        <CheckIcon className="h-4 w-4 text-brand2 ml-2" />
                      )}
                    </div>
                  )}
                </HeadlessListbox.Option>
              ))}
            </HeadlessListbox.Options>
          </Transition>
        </div>
      </HeadlessListbox>

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