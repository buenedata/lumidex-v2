import React from 'react';
import { StatPanel } from '@/components/ui/Panel';
import type { PriceSource } from '@/lib/variants/mapper';
import type { CurrencyCode } from '@/types';

export interface CollectionStatsData {
  totalCards: number;
  totalQuantity: number;
  totalValue: number;
  currency: string;
  originalValue?: number;
  originalCurrency?: string;
  conversionRate?: number;
}

export interface CollectionStatsProps {
  stats: CollectionStatsData;
  priceSource: PriceSource;
}

export function CollectionStats({ stats, priceSource }: CollectionStatsProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const sourceDisplayName = priceSource === 'cardmarket' ? 'Cardmarket' : 'TCGplayer';

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Unique Cards"
        value={formatNumber(stats.totalCards)}
        description="Different cards in collection"
        icon={
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
      />

      <StatCard
        title="Total Quantity"
        value={formatNumber(stats.totalQuantity)}
        description="Total cards owned"
        icon={
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        }
      />

      <StatCard
        title="Collection Value"
        value={stats.totalValue > 0 ? formatCurrency(stats.totalValue, stats.currency) : 'N/A'}
        description={
          stats.originalValue && stats.originalCurrency
            ? `Based on ${sourceDisplayName} prices (converted from ${stats.originalCurrency})`
            : `Based on ${sourceDisplayName} prices`
        }
        icon={
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        }
      />

      <StatCard
        title="Average Value"
        value={
          stats.totalCards > 0 && stats.totalValue > 0
            ? formatCurrency(stats.totalValue / stats.totalCards, stats.currency)
            : 'N/A'
        }
        description="Per unique card"
        icon={
          <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }
      />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, description, icon }: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  );
}