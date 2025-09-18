'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SetProgressBarProps {
  percentage: number;
  collectedCards: number;
  totalCards: number;
  isMasterSet: boolean;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function SetProgressBar({
  percentage,
  collectedCards,
  totalCards,
  isMasterSet,
  className,
  showLabel = true,
  size = 'md'
}: SetProgressBarProps) {
  const isComplete = percentage === 100;
  
  // Size variants
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };
  
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <div className={cn('font-medium text-text', textSizeClasses[size])}>
            Set Completion
            <span className="ml-2 text-xs text-muted">
              ({isMasterSet ? 'Master Set' : 'Normal Set'})
            </span>
          </div>
          <div className={cn('font-bold', textSizeClasses[size], isComplete ? 'text-green-400' : 'text-text')}>
            {percentage}%
          </div>
        </div>
      )}
      
      <div className="space-y-1">
        {/* Progress bar */}
        <div className={cn(
          'w-full bg-panel2 rounded-full overflow-hidden border border-border',
          sizeClasses[size]
        )}>
          <div
            className={cn(
              'h-full transition-all duration-500 ease-out',
              isComplete 
                ? 'bg-gradient-to-r from-green-500 to-green-400' 
                : 'bg-gradient-to-r from-brand2 to-brand'
            )}
            style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
          />
        </div>
        
        {/* Progress text */}
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            {collectedCards} of {totalCards} cards
          </span>
          {isComplete && (
            <span className="flex items-center gap-1 text-green-400 font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Complete!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface CompactSetProgressBarProps {
  percentage: number;
  collectedCards: number;
  totalCards: number;
  isMasterSet: boolean;
  className?: string;
}

export function CompactSetProgressBar({
  percentage,
  collectedCards,
  totalCards,
  isMasterSet,
  className
}: CompactSetProgressBarProps) {
  const isComplete = percentage === 100;
  
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-text">Progress</span>
        <span className={cn('font-bold text-sm', isComplete ? 'text-green-400' : 'text-text')}>
          {percentage}%
        </span>
      </div>
      
      <div className="w-full h-2 bg-panel2 rounded-full overflow-hidden border border-border">
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out',
            isComplete 
              ? 'bg-gradient-to-r from-green-500 to-green-400' 
              : 'bg-gradient-to-r from-brand2 to-brand'
          )}
          style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
        />
      </div>
      
      <div className="text-xs text-muted text-center">
        {collectedCards}/{totalCards} cards
        <span className="ml-1 opacity-75">
          ({isMasterSet ? 'Master' : 'Normal'})
        </span>
      </div>
    </div>
  );
}