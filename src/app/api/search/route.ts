import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { TCGSet, TCGCard } from '@/types';

export interface SearchResult {
  type: 'set' | 'card';
  item: TCGSet | (TCGCard & { set: TCGSet });
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type'); // 'sets', 'cards', or undefined for both

    if (!query || query.trim().length < 1) {
      return NextResponse.json({ results: [], total: 0 });
    }

    const supabase = createClient();
    const results: SearchResult[] = [];

    // Search sets if type is 'sets' or undefined
    if (!type || type === 'sets') {
      const { data: sets, error: setsError } = await supabase
        .from('tcg_sets')
        .select('*')
        .or(`name.ilike.%${query}%, series.ilike.%${query}%, id.ilike.%${query}%`)
        .order('release_date', { ascending: false })
        .limit(Math.min(limit, 50));

      if (!setsError && sets) {
        sets.forEach(set => {
          results.push({
            type: 'set',
            item: set as TCGSet
          });
        });
      }
    }

    // Search cards if type is 'cards' or undefined
    if (!type || type === 'cards') {
      // First, try to parse the query for card number searches like "charmander 4"
      const cardNumberMatch = query.match(/^(.+?)\s+(\d+)$/i);
      let cardQuery = supabase
        .from('tcg_cards')
        .select(`
          *,
          set:tcg_sets!inner (*)
        `);

      if (cardNumberMatch) {
        // If query matches "name number" pattern, search for that specific combination
        const [, cardName, cardNumber] = cardNumberMatch;
        cardQuery = cardQuery
          .ilike('name', `%${cardName.trim()}%`)
          .eq('number', cardNumber);
      } else {
        // Otherwise, search by name, number, or artist
        cardQuery = cardQuery
          .or(`name.ilike.%${query}%, number.ilike.%${query}%, artist.ilike.%${query}%`);
      }

      const { data: cards, error: cardsError } = await cardQuery
        .order('updated_at', { ascending: false })
        .limit(Math.min(limit, 50));

      if (!cardsError && cards) {
        cards.forEach(card => {
          results.push({
            type: 'card',
            item: card as TCGCard & { set: TCGSet }
          });
        });
      }
    }

    // Sort results to prioritize exact matches and recent items
    const sortedResults = results.sort((a, b) => {
      const aItem = a.item;
      const bItem = b.item;
      
      // Prioritize exact name matches
      const aNameMatch = aItem.name.toLowerCase() === query.toLowerCase();
      const bNameMatch = bItem.name.toLowerCase() === query.toLowerCase();
      
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      
      // Then prioritize sets over cards for general searches
      if (a.type === 'set' && b.type === 'card') return -1;
      if (a.type === 'card' && b.type === 'set') return 1;
      
      // Finally sort by update time
      return new Date(bItem.updated_at).getTime() - new Date(aItem.updated_at).getTime();
    });

    return NextResponse.json({
      results: sortedResults.slice(0, limit),
      total: sortedResults.length
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}