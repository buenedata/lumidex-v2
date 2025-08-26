import React from 'react';
import { cn } from '@/lib/utils';

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'brand' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export const Pill = React.forwardRef<HTMLSpanElement, PillProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    const baseClasses = 'pill inline-flex items-center gap-1 font-medium';
    
    const variantClasses = {
      default: '',
      brand: 'pill-brand',
      success: 'pill-success',
      warning: 'pill-warning',
      danger: 'pill-danger',
    };
    
    const sizeClasses = {
      sm: 'text-xs px-2 py-0.5',
      md: 'text-sm px-3 py-1',
    };

    return (
      <span
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Pill.displayName = 'Pill';

export interface PricePillProps extends Omit<PillProps, 'children'> {
  price: number;
  currency?: string;
  source?: string;
}

export const PricePill = React.forwardRef<HTMLSpanElement, PricePillProps>(
  ({ price, currency = 'EUR', source, className, ...props }, ref) => {
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);

    return (
      <Pill
        ref={ref}
        className={cn('tabular-nums', className)}
        title={source ? `Price from ${source}` : undefined}
        {...props}
      >
        {formattedPrice}
      </Pill>
    );
  }
);

PricePill.displayName = 'PricePill';

export interface RarityPillProps extends Omit<PillProps, 'children' | 'variant'> {
  rarity: string;
}

export const RarityPill = React.forwardRef<HTMLSpanElement, RarityPillProps>(
  ({ rarity, className, ...props }, ref) => {
    const getRarityVariant = (rarity: string): PillProps['variant'] => {
      const lowerRarity = rarity.toLowerCase();
      
      if (lowerRarity.includes('rare') || lowerRarity.includes('ultra') || lowerRarity.includes('secret')) {
        return 'brand';
      }
      if (lowerRarity.includes('uncommon')) {
        return 'success';
      }
      if (lowerRarity.includes('promo') || lowerRarity.includes('legendary')) {
        return 'warning';
      }
      
      return 'default';
    };

    return (
      <Pill
        ref={ref}
        variant={getRarityVariant(rarity)}
        className={cn('capitalize', className)}
        {...props}
      >
        {rarity}
      </Pill>
    );
  }
);

RarityPill.displayName = 'RarityPill';