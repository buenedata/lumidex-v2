import React from 'react';
import { StatPanel } from '@/components/ui/Panel';
import { cn, formatCurrency } from '@/lib/utils';

export interface StatTileData {
  id: string;
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  currency?: string;
}

export interface StatTilesProps {
  stats: StatTileData[];
  className?: string;
  loading?: boolean;
}

export function StatTiles({ stats, className, loading }: StatTilesProps) {
  if (loading) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
        {Array.from({ length: 3 }, (_, i) => (
          <StatTileSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
      {stats.map((stat) => (
        <StatPanel
          key={stat.id}
          label={stat.label}
          value={typeof stat.value === 'number' && stat.currency
            ? formatCurrency(stat.value, stat.currency)
            : stat.value
          }
          subtitle={stat.subtitle}
          icon={stat.icon}
          trend={stat.trend}
          trendValue={stat.trendValue}
          className="transform transition-all duration-200 hover:scale-105"
        >
        </StatPanel>
      ))}
    </div>
  );
}

export function StatTileSkeleton() {
  return (
    <div className="stat-tile p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 w-24 skeleton rounded mb-2" />
          <div className="h-8 w-32 skeleton rounded mb-2" />
          <div className="h-3 w-20 skeleton rounded" />
        </div>
        <div className="w-12 h-12 skeleton rounded" />
      </div>
      <div className="mt-4">
        <div className="h-4 w-16 skeleton rounded" />
      </div>
    </div>
  );
}

export interface DashboardStatsProps {
  totalValue?: number;
  totalCards?: number;
  totalSets?: number;
  completedSets?: number;
  currency?: string;
  loading?: boolean;
  className?: string;
}

export function DashboardStats({
  totalValue = 0,
  totalCards = 0,
  totalSets = 0,
  completedSets = 0,
  currency = 'EUR',
  loading = false,
  className,
}: DashboardStatsProps) {
  const completionRate = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  const stats: StatTileData[] = [
    {
      id: 'total-value',
      label: 'Total Collection Value',
      value: totalValue,
      currency,
      subtitle: 'Current market value',
      icon: <TreasureIcon />,
      trend: totalValue > 0 ? 'up' : 'neutral',
      trendValue: totalValue > 0 ? '+5.2%' : undefined,
    },
    {
      id: 'total-cards',
      label: 'Cards Owned',
      value: totalCards.toLocaleString(),
      subtitle: 'Unique cards in collection',
      icon: <CardStackIcon />,
      trend: totalCards > 0 ? 'up' : 'neutral',
      trendValue: totalCards > 0 ? '+12 this week' : undefined,
    },
    {
      id: 'sets-completed',
      label: 'Sets Progress',
      value: `${completedSets}/${totalSets}`,
      subtitle: `${completionRate}% completion rate`,
      icon: <CollectionIcon />,
      trend: completionRate > 50 ? 'up' : completionRate > 25 ? 'neutral' : 'down',
      trendValue: completionRate > 0 ? `${completionRate}% complete` : undefined,
    },
  ];

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text mb-2">Collection Overview</h2>
        <p className="text-muted">
          Track your Pokemon TCG collection progress and value
        </p>
      </div>
      
      <StatTiles stats={stats} loading={loading} />
    </div>
  );
}

export interface MiniStatTileProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'compact';
}

export function MiniStatTile({ 
  label, 
  value, 
  icon, 
  className,
  variant = 'default' 
}: MiniStatTileProps) {
  return (
    <div className={cn(
      'panel p-4 bg-aurora-radial',
      variant === 'compact' && 'p-3',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={cn(
            'font-medium text-muted mb-1',
            variant === 'compact' ? 'text-xs' : 'text-sm'
          )}>
            {label}
          </p>
          <p className={cn(
            'font-bold text-text',
            variant === 'compact' ? 'text-lg' : 'text-xl'
          )}>
            {value}
          </p>
        </div>
        {icon && (
          <div className={cn(
            'text-brand opacity-20',
            variant === 'compact' ? 'w-6 h-6' : 'w-8 h-8'
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export interface StatsGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

export function StatsGrid({ children, className, columns = 3 }: StatsGridProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-6', gridClasses[columns], className)}>
      {children}
    </div>
  );
}

// Icons
function TreasureIcon() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5} 
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
      />
    </svg>
  );
}

function CardStackIcon() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5} 
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
      />
    </svg>
  );
}

function CollectionIcon() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5} 
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
      />
    </svg>
  );
}