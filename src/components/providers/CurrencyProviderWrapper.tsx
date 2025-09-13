'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CurrencyProvider } from '@/lib/currency/context';

export function CurrencyProviderWrapper({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id);
      setLoading(false);
    }

    getUser();

    // Listen for auth changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <>{children}</>;
  }

  return (
    <CurrencyProvider 
      userId={userId}
      defaultCurrency="EUR"
      defaultPriceSource="cardmarket"
    >
      {children}
    </CurrencyProvider>
  );
}