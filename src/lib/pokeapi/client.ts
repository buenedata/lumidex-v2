// Pokemon TCG API v2 client with pagination and error handling

export interface PokemonTCGApiResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

export interface PokemonTCGSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  legalities: Record<string, string>;
  ptcgoCode?: string;
  releaseDate: string;
  updatedAt: string;
  images: {
    symbol: string;
    logo: string;
  };
}

export interface PokemonTCGCard {
  id: string;
  name: string;
  supertype: string;
  subtypes: string[];
  hp?: string;
  types: string[];
  evolvesFrom?: string;
  rules?: string[];
  regulationMark?: string;
  artist?: string;
  rarity: string;
  flavorText?: string;
  nationalPokedexNumbers?: number[];
  legalities: Record<string, string>;
  images: {
    small: string;
    large: string;
  };
  set: {
    id: string;
    name: string;
    series: string;
    printedTotal: number;
    total: number;
    legalities: Record<string, string>;
    ptcgoCode?: string;
    releaseDate: string;
    updatedAt: string;
    images: {
      symbol: string;
      logo: string;
    };
  };
  number: string;
  updatedAt: string;
  cardmarket?: {
    url: string;
    updatedAt: string;
    prices: Record<string, number>;
  };
  tcgplayer?: {
    url: string;
    updatedAt: string;
    prices: Record<string, {
      low: number;
      mid: number;
      high: number;
      market: number;
      directLow?: number;
    }>;
  };
}

class PokemonTCGApiClient {
  private baseUrl = 'https://api.pokemontcg.io/v2';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.POKEMONTCG_API_KEY || '';
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.append(key, value);
      }
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-Api-Key'] = this.apiKey;
    }

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(url.toString(), { headers });

        if (!response.ok) {
          // Handle rate limiting
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
            console.log(`Rate limited. Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            attempts++;
            continue;
          }

          // Handle server errors with retry
          if (response.status >= 500) {
            attempts++;
            if (attempts < maxAttempts) {
              console.log(`Server error ${response.status}. Retrying... (${attempts}/${maxAttempts})`);
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
              continue;
            }
          }

          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }
        console.log(`Request failed. Retrying... (${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    throw new Error('Max retry attempts reached');
  }

  /**
   * Fetch Pokemon TCG sets with pagination
   */
  async fetchSets(options: {
    page?: number;
    pageSize?: number;
    orderBy?: string;
  } = {}): Promise<PokemonTCGApiResponse<PokemonTCGSet>> {
    const params = {
      page: options.page?.toString() || '1',
      pageSize: options.pageSize?.toString() || '250',
      orderBy: options.orderBy || 'releaseDate',
    };

    return this.makeRequest<PokemonTCGApiResponse<PokemonTCGSet>>('/sets', params);
  }

  /**
   * Fetch all sets using pagination
   */
  async fetchAllSets(): Promise<PokemonTCGSet[]> {
    const allSets: PokemonTCGSet[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`Fetching sets page ${page}...`);
      const response = await this.fetchSets({ page, pageSize: 250 });
      
      allSets.push(...response.data);
      
      hasMore = page * response.pageSize < response.totalCount;
      page++;
    }

    console.log(`Fetched ${allSets.length} total sets`);
    return allSets;
  }

  /**
   * Fetch Pokemon TCG cards with pagination
   */
  async fetchCards(options: {
    page?: number;
    pageSize?: number;
    orderBy?: string;
    q?: string; // Query for incremental updates
  } = {}): Promise<PokemonTCGApiResponse<PokemonTCGCard>> {
    const params: Record<string, string> = {
      page: options.page?.toString() || '1',
      pageSize: options.pageSize?.toString() || '250',
      orderBy: options.orderBy || 'set.releaseDate,number',
    };

    if (options.q) {
      params.q = options.q;
    }

    return this.makeRequest<PokemonTCGApiResponse<PokemonTCGCard>>('/cards', params);
  }

  /**
   * Fetch all cards using pagination
   * Supports incremental updates with since parameter
   */
  async fetchAllCards(since?: string): Promise<PokemonTCGCard[]> {
    const allCards: PokemonTCGCard[] = [];
    let page = 1;
    let hasMore = true;

    // Build query for incremental updates
    let query = '';
    if (since) {
      query = `updatedAt:[${since} TO *]`;
      console.log(`Fetching cards updated since ${since}...`);
    }

    while (hasMore) {
      console.log(`Fetching cards page ${page}...`);
      const response = await this.fetchCards({ 
        page, 
        pageSize: 250,
        q: query || undefined
      });
      
      allCards.push(...response.data);
      
      hasMore = page * response.pageSize < response.totalCount;
      page++;
    }

    console.log(`Fetched ${allCards.length} total cards`);
    return allCards;
  }

  /**
   * Fetch a specific set by ID
   */
  async fetchSetById(setId: string): Promise<PokemonTCGSet | null> {
    try {
      const response = await this.makeRequest<{ data: PokemonTCGSet }>(`/sets/${setId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching set ${setId}:`, error);
      return null;
    }
  }

  /**
   * Fetch cards for a specific set
   */
  async fetchCardsForSet(setId: string): Promise<PokemonTCGCard[]> {
    const allCards: PokemonTCGCard[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.fetchCards({ 
        page, 
        pageSize: 250,
        q: `set.id:${setId}`
      });
      
      allCards.push(...response.data);
      
      hasMore = page * response.pageSize < response.totalCount;
      page++;
    }

    return allCards;
  }
}

// Export singleton instance
export const pokemonTCGApi = new PokemonTCGApiClient();

// Export individual functions for convenience
export const fetchSets = (options?: Parameters<typeof pokemonTCGApi.fetchSets>[0]) => 
  pokemonTCGApi.fetchSets(options);

export const fetchCards = (options?: Parameters<typeof pokemonTCGApi.fetchCards>[0]) => 
  pokemonTCGApi.fetchCards(options);

export const fetchAllSets = () => pokemonTCGApi.fetchAllSets();

export const fetchAllCards = (since?: string) => pokemonTCGApi.fetchAllCards(since);

export const fetchSetById = (setId: string) => pokemonTCGApi.fetchSetById(setId);

export const fetchCardsForSet = (setId: string) => pokemonTCGApi.fetchCardsForSet(setId);