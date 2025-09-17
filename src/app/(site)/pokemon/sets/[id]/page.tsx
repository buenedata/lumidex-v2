import { notFound } from 'next/navigation';
import { getSetById, getCardsForSet, getUserPreferences, type TCGSet, type TCGCard } from '@/lib/db/queries';
import { createClient } from '@/lib/supabase/server';
import { getTCGInfo } from '@/lib/tcg/constants';
import type { UserPreferences } from '@/types';
import { SetPageClientWrapper } from './SetPageClientWrapper';

export const dynamic = 'force-dynamic';

interface PokemonSetPageProps {
  params: { id: string };
}

export default async function PokemonSetPage({ params }: PokemonSetPageProps) {
  const { id } = params;
  const tcgInfo = getTCGInfo('pokemon');
  
  // Create server-side supabase client
  const supabase = createClient();
  
  const [set, cards] = await Promise.all([
    getSetByIdSSR(id, supabase),
    getCardsForSetSSR(id, supabase)
  ]);

  if (!set || set.tcg_type !== 'pokemon') {
    notFound();
  }

  // Get user preferences for pricing
  let userPreferences: UserPreferences | null = null;
  try {
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

// Server-side versions of the queries that use server supabase client
async function getSetByIdSSR(setId: string, supabase: any): Promise<TCGSet | null> {
  const { data, error } = await supabase
    .from('tcg_sets')
    .select('*')
    .eq('id', setId)
    .single();
  
  if (error) {
    console.error('Error fetching set:', error);
    return null;
  }
  
  return data;
}

async function getCardsForSetSSR(setId: string, supabase: any): Promise<TCGCard[]> {
  const { data, error } = await supabase
    .from('tcg_cards')
    .select('*')
    .eq('set_id', setId);
  
  if (error) {
    console.error('Error fetching cards for set:', error);
    return [];
  }
  
  // Sort cards numerically by number (handle formats like "001", "001/100", etc.)
  const sortedData = (data || []).sort((a: any, b: any) => {
    // Extract the numeric part before any slash or non-digit character
    const getNumericValue = (number: string) => {
      const match = number.match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    };
    
    const aNum = getNumericValue(a.number);
    const bNum = getNumericValue(b.number);
    
    return aNum - bNum;
  });
  
  return sortedData;
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