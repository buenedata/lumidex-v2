import { notFound } from 'next/navigation';
import { getSetById, getCardsForSet, getUserPreferences, type TCGSet, type TCGCard } from '@/lib/db/queries';
import { createClient } from '@/lib/supabase/server';
import { getTCGInfo } from '@/lib/tcg/constants';
import type { UserPreferences } from '@/types';
import { SetPageClientWrapper } from './SetPageClientWrapper';

interface PokemonSetPageProps {
  params: { id: string };
}

export default async function PokemonSetPage({ params }: PokemonSetPageProps) {
  const { id } = params;
  const tcgInfo = getTCGInfo('pokemon');
  
  const [set, cards] = await Promise.all([
    getSetById(id),
    getCardsForSet(id)
  ]);

  if (!set || set.tcg_type !== 'pokemon') {
    notFound();
  }

  // Get user preferences for pricing
  let userPreferences: UserPreferences | null = null;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      userPreferences = await getUserPreferences(user.id, supabase);
    }
  } catch (error) {
    console.warn('Failed to fetch user preferences:', error);
  }

  return (
    <SetPageClientWrapper
      setId={params.id}
      set={set}
      cards={cards}
      tcgInfo={tcgInfo}
      userPreferences={userPreferences}
    />
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PokemonSetPageProps) {
  const set = await getSetById(params.id);
  
  if (!set) {
    return {
      title: 'Set Not Found - Lumidex v2'
    };
  }
  
  return {
    title: `${set.name} - Pokemon TCG Set | Lumidex v2`,
    description: `Browse cards from the ${set.name} Pokemon TCG set${set.series ? ` from the ${set.series} series` : ''}. View card details, prices, and manage your collection.`,
  };
}

// Generate static params for better performance
export async function generateStaticParams() {
  // In a real implementation, you would fetch a list of Pokemon set IDs
  // For now, return empty array to use ISR
  return [];
}

// Enable ISR with revalidation every hour
export const revalidate = 3600;