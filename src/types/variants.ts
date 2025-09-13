// New variant system types
// These align with the database schema and UI requirements

export type UIVariantType = 
  | 'normal'
  | 'holo'
  | 'reverse_holo_standard'
  | 'reverse_holo_pokeball'
  | 'reverse_holo_masterball'
  | 'first_edition'
  | 'custom';

export type Era =
  | "WotC"
  | "EX"
  | "DP"
  | "HGSS"
  | "Black & White"
  | "XY"
  | "Sun & Moon"
  | "Sword & Shield"
  | "Scarlet & Violet";

export type RarePolicy = 'auto' | 'force_holo' | 'allow_normal';

export interface UIVariant {
  type: UIVariantType;
  price?: number;
  priceSource?: 'tcgplayer' | 'cardmarket';
  userQuantity?: number;
  // Custom variant data for admin-created variants
  customVariantData?: {
    id: number;
    display_name: string;
    description: string;
    source_product?: string;
    price_usd?: number;
    price_eur?: number;
  };
}

export interface SetPolicy {
  setId: string;
  hasStandardReverse: boolean;
  hasPokeballReverse: boolean;
  hasMasterballReverse: boolean;
  hasFirstEdition: boolean;
  rarePolicy: RarePolicy;
  era: Era;
  specialRules: Record<string, any>;
}

export interface RarityMapping {
  rarity: string;
  era: Era;
  allowedVariants: UIVariantType[];
  forceVariants: UIVariantType[];
  excludeVariants: UIVariantType[];
}

export interface CardVariantException {
  setId: string;
  cardNumber: string;
  exceptionType: 'force' | 'exclude' | 'override';
  variantChanges: Record<string, any>;
  reason?: string;
}

export interface VariantEngineInput {
  card: {
    set_id: string;      // Card ID from database (e.g., "swsh4-082")
    set_name: string;    // Card name
    number: string;
    rarity: string;
    sets: {
      set_id: string;    // Set ID from database (e.g., "swsh4")
      set_series: string;
      releaseDate: string;  // YYYY/MM/DD format
    };
    tcgplayer?: {
      cardmarket_prices?: Record<string, any>;
    };
  };
  setPolicy?: SetPolicy;
  userQuantities?: Record<UIVariantType, number>;
}

export interface VariantEngineOutput {
  variants: UIVariant[];
  metadata: {
    source: 'tcgplayer' | 'policy' | 'rarity' | 'exception';
    setPolicy?: SetPolicy;
    appliedExceptions: string[];
    rarityMapping?: RarityMapping;
    customVariantCount?: number; // Count of custom variants for "+X variant" indicator
  };
}

export interface BulkVariantRequest {
  setId: string;
  cards: VariantEngineInput['card'][];
  userCollectionData?: Map<string, Record<UIVariantType, number>>;
}

export interface BulkVariantResponse {
  results: Record<string, VariantEngineOutput>;  // Changed from Map to Record (object)
  setPolicy?: SetPolicy;
  errors: Array<{
    cardId: string;
    error: string;
  }>;
}

// Color system for UI components
export interface VariantColorScheme {
  bg: string;
  border: string;
  hover: string;
  text: string;
  focus: string;
}

export const VARIANT_COLORS: Record<UIVariantType, VariantColorScheme> = {
  normal: {
    bg: 'bg-yellow-500',
    border: 'border-yellow-400',
    hover: 'hover:bg-yellow-600',
    text: 'text-yellow-50',
    focus: 'focus:ring-yellow-500/50'
  },
  holo: {
    bg: 'bg-purple-500', 
    border: 'border-purple-400',
    hover: 'hover:bg-purple-600',
    text: 'text-purple-50',
    focus: 'focus:ring-purple-500/50'
  },
  reverse_holo_standard: {
    bg: 'bg-blue-500',
    border: 'border-blue-400', 
    hover: 'hover:bg-blue-600',
    text: 'text-blue-50',
    focus: 'focus:ring-blue-500/50'
  },
  reverse_holo_pokeball: {
    bg: 'bg-red-500',
    border: 'border-red-400',
    hover: 'hover:bg-red-600', 
    text: 'text-red-50',
    focus: 'focus:ring-red-500/50'
  },
  reverse_holo_masterball: {
    bg: 'bg-pink-500',
    border: 'border-pink-400',
    hover: 'hover:bg-pink-600',
    text: 'text-pink-50',
    focus: 'focus:ring-pink-500/50'
  },
  first_edition: {
    bg: 'bg-green-500',
    border: 'border-green-400',
    hover: 'hover:bg-green-600',
    text: 'text-green-50',
    focus: 'focus:ring-green-500/50'
  },
  custom: {
    bg: 'bg-gray-500',
    border: 'border-gray-400',
    hover: 'hover:bg-gray-600',
    text: 'text-gray-50',
    focus: 'focus:ring-gray-500/50'
  }
} as const;

// Variant display names
export const VARIANT_DISPLAY_NAMES: Record<UIVariantType, string> = {
  normal: 'Normal',
  holo: 'Holo',
  reverse_holo_standard: 'Reverse Holo',
  reverse_holo_pokeball: 'Reverse Holo (Poké Ball)',
  reverse_holo_masterball: 'Reverse Holo (Master Ball)',
  first_edition: '1st Edition',
  custom: 'Custom'
} as const;

// Variant ordering for consistent display
export const VARIANT_ORDER: UIVariantType[] = [
  'normal',
  'holo',
  'reverse_holo_standard',
  'reverse_holo_pokeball',
  'reverse_holo_masterball',
  'first_edition',
  'custom'
] as const;

// Helper function to sort variants by order preference
export function sortVariantsByOrder(variants: UIVariant[]): UIVariant[] {
  return variants.sort((a, b) => {
    const aIndex = VARIANT_ORDER.indexOf(a.type);
    const bIndex = VARIANT_ORDER.indexOf(b.type);
    return aIndex - bIndex;
  });
}

// Helper function to get variant color classes
export function getVariantColorClasses(variantType: UIVariantType): VariantColorScheme {
  return VARIANT_COLORS[variantType];
}

// Helper function to get variant display name
export function getVariantDisplayName(variantType: UIVariantType): string {
  return VARIANT_DISPLAY_NAMES[variantType];
}