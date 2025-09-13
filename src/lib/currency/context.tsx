'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUserPreferencesClient } from '@/lib/profile/preferences';
import type { CurrencyCode, PriceSource, UserPreferences } from '@/types';

interface CurrencyContextValue {
  userCurrency: CurrencyCode;
  priceSource: PriceSource;
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export interface CurrencyProviderProps {
  children: React.ReactNode;
  userId?: string;
  defaultCurrency?: CurrencyCode;
  defaultPriceSource?: PriceSource;
}

export function CurrencyProvider({ 
  children, 
  userId,
  defaultCurrency = 'EUR',
  defaultPriceSource = 'cardmarket'
}: CurrencyProviderProps) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(!!userId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setPreferences({
        preferred_currency: defaultCurrency,
        preferred_price_source: defaultPriceSource
      });
      setIsLoading(false);
      return;
    }

    const loadPreferences = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getUserPreferencesClient(userId);
        
        if (result.success && result.data) {
          setPreferences(result.data);
        } else {
          setError(result.error || 'Failed to load preferences');
          // Fallback to defaults
          setPreferences({
            preferred_currency: defaultCurrency,
            preferred_price_source: defaultPriceSource
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setPreferences({
          preferred_currency: defaultCurrency,
          preferred_price_source: defaultPriceSource
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [userId, defaultCurrency, defaultPriceSource]);

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!userId) {
      // For non-authenticated users, just update local state
      setPreferences(prev => prev ? { ...prev, ...updates } : null);
      return;
    }

    try {
      const { updateUserPreferencesClient } = await import('@/lib/profile/preferences');
      const result = await updateUserPreferencesClient(userId, updates);
      
      if (result.success) {
        setPreferences(prev => prev ? { ...prev, ...updates } : null);
      } else {
        throw new Error(result.error || 'Failed to update preferences');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
      throw err;
    }
  };

  const value: CurrencyContextValue = {
    userCurrency: preferences?.preferred_currency || defaultCurrency,
    priceSource: preferences?.preferred_price_source || defaultPriceSource,
    preferences,
    isLoading,
    error,
    updatePreferences
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  
  return context;
}

export function useCurrencyOptional() {
  const context = useContext(CurrencyContext);
  return context;
}