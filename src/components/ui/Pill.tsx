'use client'

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { currencyConverter, formatConvertedPrice, type ConversionResult } from '@/lib/currency/conversion';
import type { CurrencyCode } from '@/types';

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
  userCurrency?: CurrencyCode;
  showOriginal?: boolean;
  enableConversion?: boolean;
}

export const PricePill = React.forwardRef<HTMLSpanElement, PricePillProps>(
  ({
    price,
    currency = 'EUR',
    source,
    userCurrency,
    showOriginal = false,
    enableConversion = true,
    className,
    ...props
  }, ref) => {
    const [conversion, setConversion] = useState<ConversionResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (!enableConversion || !userCurrency || currency === userCurrency) {
        setConversion(null);
        return;
      }

      const convertPrice = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
          const result = await currencyConverter.convert(
            price,
            currency as CurrencyCode,
            userCurrency
          );
          setConversion(result);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Conversion failed');
          setConversion(null);
        } finally {
          setIsLoading(false);
        }
      };

      convertPrice();
    }, [price, currency, userCurrency, enableConversion]);

    // Determine what to display
    const displayPrice = conversion?.convertedAmount ?? price;
    const displayCurrency = userCurrency ?? currency;
    
    // Format the price
    const formattedPrice = (() => {
      if (conversion && !conversion.error) {
        return formatConvertedPrice(conversion);
      }
      
      // Fallback formatting
      try {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: displayCurrency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(displayPrice);
      } catch {
        return `${displayPrice.toFixed(2)} ${displayCurrency}`;
      }
    })();

    // Build tooltip content
    const getTooltipContent = () => {
      const parts: string[] = [];
      
      if (source) {
        parts.push(`Price from ${source}`);
      }
      
      if (conversion && !conversion.error) {
        if (conversion.isApproximate) {
          parts.push('Approximate conversion');
        }
        if (conversion.fallbackUsed) {
          parts.push(`Using ${conversion.fallbackUsed.replace('_', ' ')}`);
        }
        if (showOriginal) {
          const originalFormatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: conversion.fromCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(conversion.originalAmount);
          parts.push(`Original: ${originalFormatted}`);
        }
      }
      
      if (error) {
        parts.push(`Conversion error: ${error}`);
      }
      
      return parts.length > 0 ? parts.join(' • ') : undefined;
    };

    return (
      <Pill
        ref={ref}
        className={cn(
          'tabular-nums',
          isLoading && 'opacity-70',
          conversion?.isApproximate && 'border-dashed',
          error && 'text-warning',
          className
        )}
        title={getTooltipContent()}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 bg-current rounded-full animate-pulse" />
            {formattedPrice}
          </span>
        ) : (
          formattedPrice
        )}
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