'use client';

import { Switch as HeadlessSwitch } from '@headlessui/react';
import { cn } from '@/lib/utils';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
  size = 'md',
}: SwitchProps) {
  const switchClasses = {
    sm: 'h-4 w-7',
    md: 'h-5 w-9',
  };

  const thumbClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
  };

  const translateClasses = {
    sm: checked ? 'translate-x-3' : 'translate-x-0',
    md: checked ? 'translate-x-4' : 'translate-x-0',
  };

  if (label || description) {
    return (
      <HeadlessSwitch.Group as="div" className={cn('flex items-start space-x-3', className)}>
        <HeadlessSwitch
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            'relative inline-flex flex-shrink-0 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-brand2/50 focus:ring-offset-2 focus:ring-offset-bg',
            switchClasses[size],
            checked ? 'bg-brand2' : 'bg-panel2',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200',
              thumbClasses[size],
              translateClasses[size]
            )}
          />
        </HeadlessSwitch>
        
        <div className="flex-1 min-w-0">
          {label && (
            <HeadlessSwitch.Label className="text-sm font-medium text-text cursor-pointer">
              {label}
            </HeadlessSwitch.Label>
          )}
          {description && (
            <HeadlessSwitch.Description className="text-sm text-muted">
              {description}
            </HeadlessSwitch.Description>
          )}
        </div>
      </HeadlessSwitch.Group>
    );
  }

  return (
    <HeadlessSwitch
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex flex-shrink-0 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-brand2/50 focus:ring-offset-2 focus:ring-offset-bg',
        switchClasses[size],
        checked ? 'bg-brand2' : 'bg-panel2',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200',
          thumbClasses[size],
          translateClasses[size]
        )}
      />
    </HeadlessSwitch>
  );
}

export interface SwitchGroupProps {
  switches: Array<{
    id: string;
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
  }>;
  title?: string;
  className?: string;
  orientation?: 'vertical' | 'horizontal';
  size?: SwitchProps['size'];
}

export function SwitchGroup({
  switches,
  title,
  className,
  orientation = 'vertical',
  size = 'md',
}: SwitchGroupProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <h3 className="text-sm font-medium text-text">{title}</h3>
      )}
      
      <div className={cn(
        orientation === 'vertical' ? 'space-y-3' : 'flex flex-wrap gap-4'
      )}>
        {switches.map((switchItem) => (
          <Switch
            key={switchItem.id}
            checked={switchItem.checked}
            onChange={switchItem.onChange}
            label={switchItem.label}
            description={switchItem.description}
            disabled={switchItem.disabled}
            size={size}
          />
        ))}
      </div>
    </div>
  );
}

export default Switch;