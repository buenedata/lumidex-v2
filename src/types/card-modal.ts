// Types for CardDetailsModal aligned with current database schema

export interface DatabaseCard {
  id: string;
  set_id: string;
  number: string;
  name: string;
  supertype: string;
  subtypes: string[];
  hp: string;
  types: string[];
  evolves_from: string | null;
  rules: string[];
  regulation_mark: string | null;
  artist: string | null;
  rarity: string;
  flavor_text: string | null;
  national_pokedex_numbers: number[];
  legalities: Record<string, any>;
  images: {
    small?: string;
    large?: string;
  };
  updated_at: string;
  // Joined from tcg_sets
  set_name?: string;
  set_series?: string;
  set_release_date?: string;
  set_images?: {
    symbol?: string;
    logo?: string;
  };
}

export interface DatabaseCardPrice {
  card_id: string;
  source: 'tcgplayer' | 'cardmarket';
  variant: string;
  last_updated: string;
  currency: string;
  low: number | null;
  mid: number | null;
  high: number | null;
  market: number | null;
  direct_low: number | null;
  url: string | null;
}

export interface DatabaseCollectionItem {
  id: number;
  user_id: string;
  card_id: string;
  variant: string;
  quantity: number;
  condition: string | null;
  acquired_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  variant_v2: string | null;
}

export interface DatabaseCustomVariant {
  id: number;
  card_id: string;
  variant_name: string;
  variant_type: string;
  display_name: string;
  description: string;
  source_product: string | null;
  price_usd: number | null;
  price_eur: number | null;
  is_active: boolean;
  replaces_standard_variant: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Adapted types for the modal (bridging old and new)
export interface CardModalData {
  // Core card info
  id: string;
  set_id: string;
  number: string;
  name: string;
  rarity: string;
  types: string[];
  artist: string | null;
  flavor_text: string | null;
  hp: string | null;
  regulation_mark: string | null;
  
  // Images
  image_small: string | null;
  image_large: string | null;
  
  // Set info
  set_name: string | null;
  set_series: string | null;
  set_release_date: string | null;
  set_symbol_url: string | null;
  
  // Aggregated pricing (for compatibility)
  cardmarket_avg_sell_price: number | null;
  cardmarket_low_price: number | null;
  cardmarket_trend_price: number | null;
  cardmarket_reverse_holo_sell: number | null;
  cardmarket_reverse_holo_low: number | null;
  cardmarket_reverse_holo_trend: number | null;
  cardmarket_avg_7_days: number | null;
  cardmarket_avg_30_days: number | null;
  cardmarket_url: string | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface CardCollectionData {
  cardId: string;
  userId: string;
  normal: number;
  holo: number;
  reverseHolo: number;
  pokeballPattern: number;
  masterballPattern: number;
  firstEdition: number;
  totalQuantity: number;
  dateAdded: string;
  lastUpdated: string;
}

export interface CardModalProps {
  cardId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCollectionChange?: (cardId: string, collectionData: CardCollectionData | null) => void;
  onWishlistChange?: () => void;
}

// Social features (for future implementation)
export interface FriendCardOwnership {
  friend_id: string;
  friend_name: string;
  friend_avatar?: string;
  owns_card: boolean;
  quantity: number;
  variants: string[];
}

export interface WishlistItem {
  id: string;
  user_id: string;
  card_id: string;
  priority: number;
  notes?: string;
  created_at: string;
}

// Loading states
export enum LoadingState {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}