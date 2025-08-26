import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Panel } from '@/components/ui/Panel';
import { cn, formatDate } from '@/lib/utils';

export interface SetTileProps {
  set: {
    id: string;
    name: string;
    releaseDate: string;
    printedTotal?: number;
    total?: number;
    images?: {
      symbol?: string;
      logo?: string;
    };
    series?: string;
  };
  className?: string;
  showSeries?: boolean;
}

export function SetTile({ set, className, showSeries = false }: SetTileProps) {
  const printedCount = set.printedTotal || set.total || 0;
  const totalCount = set.total || set.printedTotal || 0;

  return (
    <Link
      href={`/sets/${set.id}`}
      className={cn('block group', className)}
    >
      <Panel 
        variant="interactive"
        className="card-interactive h-full"
      >
        <div className="flex flex-col items-center text-center space-y-4 p-6">
          {/* Set Logo/Symbol */}
          <div className="relative w-16 h-16 flex items-center justify-center">
            {set.images?.symbol ? (
              <Image
                src={set.images.symbol}
                alt={`${set.name} symbol`}
                width={64}
                height={64}
                className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-200"
                unoptimized
              />
            ) : set.images?.logo ? (
              <Image
                src={set.images.logo}
                alt={`${set.name} logo`}
                width={120}
                height={64}
                className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-200"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-panel2 rounded-lg flex items-center justify-center group-hover:bg-panel transition-colors duration-200">
                <span className="text-xs text-muted font-medium">
                  {set.name.split(' ').map(word => word.charAt(0)).join('').slice(0, 3)}
                </span>
              </div>
            )}
          </div>

          {/* Set Name */}
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-text group-hover:text-gradient transition-colors duration-200 line-clamp-2">
              {set.name}
            </h3>
            {showSeries && set.series && (
              <p className="text-xs text-muted">
                {set.series}
              </p>
            )}
          </div>

          {/* Release Date */}
          <p className="text-xs text-muted">
            {formatDate(set.releaseDate)}
          </p>

          {/* Card Count */}
          <div className="flex items-center justify-center space-x-2">
            <div className="text-xs bg-panel2 rounded-full px-2 py-1 group-hover:bg-aurora-radial transition-colors duration-200">
              <span className="font-medium text-text">
                {printedCount}
              </span>
              {totalCount !== printedCount && (
                <span className="text-muted">
                  /{totalCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Hover Gradient Overlay */}
        <div className="absolute inset-0 bg-aurora-radial opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-2xl" />
      </Panel>
    </Link>
  );
}

export interface SetTileSkeletonProps {
  className?: string;
}

export function SetTileSkeleton({ className }: SetTileSkeletonProps) {
  return (
    <div className={cn('animate-fade-in', className)}>
      <Panel className="h-full">
        <div className="flex flex-col items-center text-center space-y-4 p-6">
          {/* Logo Skeleton */}
          <div className="w-16 h-16 skeleton rounded-lg" />
          
          {/* Name Skeleton */}
          <div className="space-y-2">
            <div className="h-4 w-24 skeleton rounded" />
            <div className="h-3 w-16 skeleton rounded" />
          </div>
          
          {/* Date Skeleton */}
          <div className="h-3 w-20 skeleton rounded" />
          
          {/* Count Skeleton */}
          <div className="h-5 w-12 skeleton rounded-full" />
        </div>
      </Panel>
    </div>
  );
}

export interface SetGridProps {
  sets: SetTileProps['set'][];
  loading?: boolean;
  className?: string;
  showSeries?: boolean;
}

export function SetGrid({ sets, loading, className, showSeries }: SetGridProps) {
  if (loading) {
    return (
      <div className={cn('grid-sets', className)}>
        {Array.from({ length: 10 }, (_, i) => (
          <SetTileSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (sets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 text-muted opacity-50">
          <SetIcon />
        </div>
        <h3 className="text-lg font-medium text-text mb-2">No sets found</h3>
        <p className="text-muted mb-6">
          Try adjusting your search criteria or check back later
        </p>
        <div className="space-y-2 text-sm text-muted">
          <p>To load sets data, run the ingestion script:</p>
          <code className="bg-panel2 px-2 py-1 rounded font-mono">
            npm run ingest:sets
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('grid-sets', className)}>
      {sets.map((set) => (
        <SetTile
          key={set.id}
          set={set}
          showSeries={showSeries}
        />
      ))}
    </div>
  );
}

function SetIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5} 
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
      />
    </svg>
  );
}