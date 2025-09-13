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

// CardMarket prices are simple key-value pairs: field name -> number
export type CardMarketPrices = Record<string, number>;

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
    prices: CardMarketPrices; // Pokemon TCG API v2 structure - simple key-value pairs
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

    console.log(`🔗 API Request: ${url.toString()}`);
    console.log(`📋 Headers: ${JSON.stringify(headers, null, 2)}`);

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(url.toString(), { headers });

        console.log(`📡 Response: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          // Get response body for debugging
          let errorBody = '';
          try {
            errorBody = await response.text();
            console.log(`❌ Error Response Body: ${errorBody}`);
          } catch (e) {
            console.log(`❌ Could not read error response body`);
          }

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

          // For 404 and other client errors, provide more context
          let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
          if (response.status === 404) {
            errorMessage += `\nURL: ${url.toString()}`;
            errorMessage += `\nThis might indicate:`;
            errorMessage += `\n- Invalid API endpoint`;
            errorMessage += `\n- Pokemon TCG API service issues`;
            errorMessage += `\n- Network connectivity problems`;
          }
          if (errorBody) {
            errorMessage += `\nResponse: ${errorBody}`;
          }

          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log(`✅ API request successful, received ${JSON.stringify(data).length} characters`);
        return data;
      } catch (error) {
        attempts++;
        console.log(`❌ Request attempt ${attempts} failed:`, error instanceof Error ? error.message : error);
        
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
    const params: Record<string, string> = {};
    
    // Only add parameters if they're different from defaults
    if (options.page && options.page !== 1) {
      params.page = options.page.toString();
    }
    
    if (options.pageSize && options.pageSize !== 250) {
      params.pageSize = options.pageSize.toString();
    }
    
    if (options.orderBy) {
      params.orderBy = options.orderBy;
    }

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
    select?: string; // Fields to select (e.g., "id,cardmarket,tcgplayer")
  } = {}): Promise<PokemonTCGApiResponse<PokemonTCGCard>> {
    const params: Record<string, string> = {};
    
    // Add page if specified and not 1
    if (options.page && options.page > 1) {
      params.page = options.page.toString();
    }
    
    // Add pageSize if specified and not default
    if (options.pageSize && options.pageSize !== 250) {
      params.pageSize = options.pageSize.toString();
    }
    
    // Add orderBy if specified
    if (options.orderBy) {
      params.orderBy = options.orderBy;
    }
    
    // Add query if specified
    if (options.q) {
      params.q = options.q;
    }
    
    // Add select if specified
    if (options.select) {
      params.select = options.select;
    }

    return this.makeRequest<PokemonTCGApiResponse<PokemonTCGCard>>('/cards', params);
  }

  /**
   * Fetch all cards using pagination
   * Supports incremental updates with since parameter and field selection
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
        // Don't specify pageSize - let API use its default to avoid 404s
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