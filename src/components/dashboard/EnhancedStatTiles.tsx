import React from 'react';
import { StatPanel } from '@/components/ui/Panel';
import { cn, formatCurrency } from '@/lib/utils';

export interface EnhancedStatTileData {
  id: string;
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  currency?: string;
  chartData?: number[];
  chartType?: 'line' | 'bar' | 'progress' | 'donut';
  target?: number;
  comparison?: {
    period: string;
    value: number;
    trend: 'up' | 'down' | 'stable';
  };
  color?: 'brand' | 'brand2' | 'success' | 'warning' | 'danger';
}

export interface EnhancedStatTilesProps {
  stats: EnhancedStatTileData[];
  className?: string;
  loading?: boolean;
  showCharts?: boolean;
}

export function EnhancedStatTiles({ 
  stats, 
  className, 
  loading = false,
  showCharts = true 
}: EnhancedStatTilesProps) {
  if (loading) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6', className)}>
        {Array.from({ length: 4 }, (_, i) => (
          <EnhancedStatTileSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6', className)}>
      {stats.map((stat) => (
        <EnhancedStatTile
          key={stat.id}
          stat={stat}
          showChart={showCharts}
        />
      ))}
    </div>
  );
}

interface EnhancedStatTileProps {
  stat: EnhancedStatTileData;
  showChart?: boolean;
}

function EnhancedStatTile({ stat, showChart = true }: EnhancedStatTileProps) {
  const formattedValue = typeof stat.value === 'number' && stat.currency
    ? formatCurrency(stat.value, stat.currency)
    : stat.value;

  const trendColors = {
    up: 'text-success',
    down: 'text-danger',
    neutral: 'text-muted',
    stable: 'text-muted'
  };

  const colorClasses = {
    brand: 'from-brand/20 to-brand/5',
    brand2: 'from-brand2/20 to-brand2/5',
    success: 'from-success/20 to-success/5',
    warning: 'from-warning/20 to-warning/5',
    danger: 'from-danger/20 to-danger/5'
  };

  const gradientClass = stat.color ? colorClasses[stat.color] : colorClasses.brand;

  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border border-border transition-all duration-200',
      'hover:transform hover:-translate-y-1 hover:shadow-lg hover:border-brand2/50',
      'bg-gradient-to-br', gradientClass
    )}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-panel/80 backdrop-blur-sm" />
      
      <div className="relative p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted">{stat.label}</p>
            <p className="text-2xl font-bold text-text mt-1">{formattedValue}</p>
            {stat.subtitle && (
              <p className="text-sm text-muted mt-1">{stat.subtitle}</p>
            )}
          </div>
          
          {/* Icon */}
          {stat.icon && (
            <div className="text-brand opacity-30 w-8 h-8">
              {stat.icon}
            </div>
          )}
        </div>

        {/* Chart */}
        {showChart && stat.chartData && stat.chartType && (
          <div className="h-12">
            {stat.chartType === 'line' && (
              <SparklineChart data={stat.chartData} color={stat.color || 'brand'} />
            )}
            {stat.chartType === 'bar' && (
              <BarChart data={stat.chartData} color={stat.color || 'brand'} />
            )}
            {stat.chartType === 'progress' && typeof stat.value === 'number' && stat.target && (
              <ProgressChart current={stat.value} target={stat.target} color={stat.color || 'brand'} />
            )}
            {stat.chartType === 'donut' && typeof stat.value === 'number' && stat.target && (
              <DonutChart current={stat.value} target={stat.target} color={stat.color || 'brand'} />
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Trend */}
          {stat.trend && stat.trendValue && (
            <div className={cn('flex items-center text-sm font-medium', trendColors[stat.trend])}>
              <span className="mr-1">
                {stat.trend === 'up' && '↗'}
                {stat.trend === 'down' && '↘'}
                {stat.trend === 'neutral' && '→'}
              </span>
              {stat.trendValue}
            </div>
          )}
          
          {/* Comparison */}
          {stat.comparison && (
            <div className="text-right">
              <div className={cn('text-xs font-medium', trendColors[stat.comparison.trend])}>
                {stat.comparison.trend === 'up' ? '+' : stat.comparison.trend === 'down' ? '-' : ''}
                {Math.abs(stat.comparison.value)}%
              </div>
              <div className="text-xs text-muted">{stat.comparison.period}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EnhancedStatTileSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-panel p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-4 w-24 skeleton rounded mb-2" />
          <div className="h-8 w-32 skeleton rounded mb-2" />
          <div className="h-3 w-20 skeleton rounded" />
        </div>
        <div className="w-8 h-8 skeleton rounded" />
      </div>
      <div className="h-12 skeleton rounded mb-4" />
      <div className="flex items-center justify-between">
        <div className="h-4 w-16 skeleton rounded" />
        <div className="h-4 w-12 skeleton rounded" />
      </div>
    </div>
  );
}

// Chart Components
interface ChartProps {
  data?: number[];
  current?: number;
  target?: number;
  color?: 'brand' | 'brand2' | 'success' | 'warning' | 'danger';
}

function SparklineChart({ data = [], color = 'brand' }: ChartProps) {
  if (data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  const colorMap = {
    brand: 'stroke-brand',
    brand2: 'stroke-brand2', 
    success: 'stroke-success',
    warning: 'stroke-warning',
    danger: 'stroke-danger'
  };

  return (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={colorMap[color]}
        opacity={0.8}
      />
    </svg>
  );
}

function BarChart({ data = [], color = 'brand' }: ChartProps) {
  if (data.length === 0) return null;

  const max = Math.max(...data);
  const barWidth = 100 / data.length;

  const colorMap = {
    brand: 'fill-brand',
    brand2: 'fill-brand2',
    success: 'fill-success', 
    warning: 'fill-warning',
    danger: 'fill-danger'
  };

  return (
    <svg className="w-full h-full" viewBox="0 0 100 100">
      {data.map((value, index) => {
        const height = (value / max) * 100;
        const x = index * barWidth;
        const y = 100 - height;
        
        return (
          <rect
            key={index}
            x={x}
            y={y}
            width={barWidth * 0.8}
            height={height}
            className={colorMap[color]}
            opacity={0.7}
            rx={1}
          />
        );
      })}
    </svg>
  );
}

function ProgressChart({ current, target, color = 'brand' }: ChartProps) {
  const percentage = Math.min((current! / target!) * 100, 100);
  
  const colorMap = {
    brand: 'bg-brand',
    brand2: 'bg-brand2',
    success: 'bg-success',
    warning: 'bg-warning', 
    danger: 'bg-danger'
  };

  return (
    <div className="w-full h-full flex items-center">
      <div className="w-full h-2 bg-panel2 rounded-full overflow-hidden">
        <div 
          className={cn('h-full transition-all duration-700 ease-out rounded-full', colorMap[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function DonutChart({ current, target, color = 'brand' }: ChartProps) {
  const percentage = Math.min((current! / target!) * 100, 100);
  const circumference = 2 * Math.PI * 16; // radius of 16
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorMap = {
    brand: 'stroke-brand',
    brand2: 'stroke-brand2',
    success: 'stroke-success',
    warning: 'stroke-warning',
    danger: 'stroke-danger'
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
        {/* Background circle */}
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-panel2"
        />
        {/* Progress circle */}
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={colorMap[color]}
        />
        {/* Center text */}
        <text
          x="18"
          y="18"
          textAnchor="middle"
          dy="0.3em"
          className="text-xs font-bold fill-text transform rotate-90"
        >
          {Math.round(percentage)}%
        </text>
      </svg>
    </div>
  );
}

// Enhanced Dashboard Stats with charts
export interface EnhancedDashboardStatsProps {
  totalValue?: number;
  totalCards?: number;
  totalSets?: number;
  completedSets?: number;
  currency?: string;
  loading?: boolean;
  className?: string;
  valueHistory?: number[];
  cardsHistory?: number[];
  weeklyGoal?: number;
  monthlyGrowth?: number;
}

export function EnhancedDashboardStats({
  totalValue = 0,
  totalCards = 0,
  totalSets = 0,
  completedSets = 0,
  currency = 'EUR',
  loading = false,
  className,
  valueHistory = [],
  cardsHistory = [],
  weeklyGoal = 0,
  monthlyGrowth = 0,
}: EnhancedDashboardStatsProps) {
  const completionRate = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  const weeklyProgress = weeklyGoal > 0 ? Math.min((totalCards / weeklyGoal) * 100, 100) : 0;

  const stats: EnhancedStatTileData[] = [
    {
      id: 'total-value',
      label: 'Collection Value',
      value: totalValue,
      currency,
      subtitle: 'Current market value',
      icon: <TreasureIcon />,
      trend: totalValue > 0 ? 'up' : 'neutral',
      trendValue: totalValue > 0 ? '+5.2%' : undefined,
      chartData: valueHistory.length > 0 ? valueHistory : [100, 120, 110, 140, 130, 150, 165],
      chartType: 'line',
      color: 'success',
      comparison: {
        period: 'vs last month',
        value: 5.2,
        trend: 'up'
      }
    },
    {
      id: 'total-cards',
      label: 'Cards Owned',
      value: totalCards.toLocaleString(),
      subtitle: 'Unique cards in collection',
      icon: <CardStackIcon />,
      trend: totalCards > 0 ? 'up' : 'neutral',
      trendValue: totalCards > 0 ? '+12 this week' : undefined,
      chartData: cardsHistory.length > 0 ? cardsHistory : [80, 85, 90, 88, 95, 102, 115],
      chartType: 'bar',
      color: 'brand',
      comparison: {
        period: 'this week',
        value: 12,
        trend: 'up'
      }
    },
    {
      id: 'sets-progress',
      label: 'Sets Progress',
      value: completionRate,
      subtitle: `${completedSets}/${totalSets} sets complete`,
      icon: <CollectionIcon />,
      trend: completionRate > 50 ? 'up' : completionRate > 25 ? 'neutral' : 'down',
      trendValue: completionRate > 0 ? `${completionRate}% complete` : undefined,
      chartType: 'donut',
      target: 100,
      color: 'brand2'
    },
    {
      id: 'weekly-goal',
      label: 'Weekly Goal',
      value: weeklyProgress,
      subtitle: `${totalCards}/${weeklyGoal} cards target`,
      icon: <GoalIcon />,
      trend: weeklyProgress >= 100 ? 'up' : weeklyProgress > 50 ? 'neutral' : 'down',
      trendValue: weeklyProgress >= 100 ? 'Goal reached!' : `${Math.round(weeklyProgress)}% progress`,
      chartType: 'progress',
      target: 100,
      color: weeklyProgress >= 100 ? 'success' : 'warning'
    }
  ];

  return (
    <div className={className}>
      <EnhancedStatTiles stats={stats} loading={loading} />
    </div>
  );
}

// Icons (reusing from original)
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

function GoalIcon() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5} 
        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" 
      />
    </svg>
  );
}