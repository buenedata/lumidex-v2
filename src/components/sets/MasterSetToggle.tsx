'use client';

import React from 'react';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/utils';

interface MasterSetToggleProps {
  isMasterSet: boolean;
  onChange: (isMasterSet: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function MasterSetToggle({
  isMasterSet,
  onChange,
  disabled = false,
  loading = false,
  className,
}: MasterSetToggleProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-2">
        <Switch
          checked={isMasterSet}
          onChange={onChange}
          disabled={disabled || loading}
          size="md"
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-text">
            {isMasterSet ? 'Master Set Mode' : 'Normal Set Mode'}
          </span>
          <span className="text-xs text-muted">
            {isMasterSet
              ? 'Collecting all variants of each card'
              : 'Collecting any variant of each card'
            }
          </span>
        </div>
      </div>
      
      {loading && (
        <div className="flex items-center gap-1 text-xs text-muted">
          <div className="w-3 h-3 border border-brand2 border-t-transparent rounded-full animate-spin" />
          <span>Saving...</span>
        </div>
      )}
    </div>
  );
}

interface MasterSetInfoProps {
  isMasterSet: boolean;
  className?: string;
}

export function MasterSetInfo({ isMasterSet, className }: MasterSetInfoProps) {
  return (
    <div className={cn('p-3 rounded-lg bg-panel2 border border-border', className)}>
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
            {isMasterSet ? 'Master Set Mode' : 'Normal Set Mode'}
          </h4>
          
          <div className="text-xs text-muted space-y-1">
            {isMasterSet ? (
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
  );
}

export default MasterSetToggle;