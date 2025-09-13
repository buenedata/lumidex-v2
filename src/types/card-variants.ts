// New comprehensive variant system combining inspiration with current needs
// Based on filesforinspiration/variant-rule-engine/types.ts and CollectionButtons.tsx

// Core variant types - comprehensive list from inspiration
export type CardVariant = 
  | 'normal'
  | 'holo' 
  | 'reverse_holo'
  | 'pokeball_pattern'
  | 'masterball_pattern'
  | '1st_edition'
  | 'first_edition_normal'  // Legacy compatibility
  | 'first_edition_holo';   // Legacy compatibility

// Pokemon TCG Eras for sophisticated variant detection
export type Era =
  | 'WotC'
  | 'EX' 
  | 'DP'
  | 'HGSS'
  | 'Black & White'
  | 'XY'
  | 'Sun & Moon'
  | 'Sword & Shield'
  | 'Scarlet & Violet';

// Source of variant information
export type VariantSource = 'api' | 'rule' | 'override';

// Confidence level in the determination
export type VariantConfidence = 'high' | 'medium' | 'low';

// Individual variant flag indicating existence and metadata
export interface VariantFlag {
  exists: boolean;
  source?: VariantSource;      // Only present if exists = true
  confidence?: VariantConfidence;  // Only present if exists = true
}

// Main result interface from the variant rule engine
export interface VariantAnalysis {
  cardId: string;
  setId: string;
  era: Era;
  rarity: string;
  variants: {
    normal: VariantFlag;
    holo: VariantFlag;
    reverse_holo: VariantFlag;
    pokeball_pattern: VariantFlag;
    masterball_pattern: VariantFlag;
    '1st_edition': VariantFlag;
    first_edition_normal: VariantFlag;
    first_edition_holo: VariantFlag;
  };
  printSources: string[];  // ["Booster"] or provided productSources
  explanations: string[];  // Human-readable reasoning
}

// Simplified Pokemon TCG API card structure for input
export interface CardInput {
  id: string;
  name: string;
  number: string;
  rarity: string;
  set: {
    id: string;
    series: string;
    releaseDate: string;  // YYYY/MM/DD format
  };
  tcgplayer?: {
    prices?: {
      normal?: any;                // Presence indicates variant exists
      holofoil?: any;             // Presence indicates variant exists  
      reverseHolofoil?: any;      // Presence indicates variant exists
      "1stEditionNormal"?: any;   // Presence indicates variant exists
      "1stEditionHolofoil"?: any; // Presence indicates variant exists
      [key: string]: any;         // Other pricing keys
    };
  };
  cardmarket?: {
    prices?: {
      [key: string]: any;
    };
  };
}

// Collection data interface
export interface CollectionData {
  totalQuantity: number;
  normal?: number;
  holo?: number;
  reverseHolo?: number;
  pokeballPattern?: number;
  masterballPattern?: number;
  firstEdition?: number;
  firstEditionNormal?: number;
  firstEditionHolo?: number;
}

// Color system for variant buttons
export interface VariantColorScheme {
  bg: string;
  border: string;
  hover: string; 
  text: string;
  focus: string;
}

export const VARIANT_COLORS: Record<CardVariant, VariantColorScheme> = {
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
  reverse_holo: {
    bg: 'bg-blue-500',
    border: 'border-blue-400', 
    hover: 'hover:bg-blue-600',
    text: 'text-blue-50',
    focus: 'focus:ring-blue-500/50'
  },
  pokeball_pattern: {
    bg: 'bg-red-500',
    border: 'border-red-400',
    hover: 'hover:bg-red-600', 
    text: 'text-red-50',
    focus: 'focus:ring-red-500/50'
  },
  masterball_pattern: {
    bg: 'bg-pink-500',
    border: 'border-pink-400',
    hover: 'hover:bg-pink-600',
    text: 'text-pink-50',
    focus: 'focus:ring-pink-500/50'
  },
  '1st_edition': {
    bg: 'bg-green-500',
    border: 'border-green-400',
    hover: 'hover:bg-green-600',
    text: 'text-green-50',
    focus: 'focus:ring-green-500/50'
  },
  first_edition_normal: {
    bg: 'bg-green-600',
    border: 'border-green-500',
    hover: 'hover:bg-green-700',
    text: 'text-green-50',
    focus: 'focus:ring-green-500/50'
  },
  first_edition_holo: {
    bg: 'bg-emerald-500',
    border: 'border-emerald-400',
    hover: 'hover:bg-emerald-600',
    text: 'text-emerald-50',
    focus: 'focus:ring-emerald-500/50'
  }
} as const;

// Variant display names
export const VARIANT_DISPLAY_NAMES: Record<CardVariant, string> = {
  normal: 'Normal (Non-Holo)',
  holo: 'Holo',
  reverse_holo: 'Reverse Holo',
  pokeball_pattern: 'Pokeball Pattern',
  masterball_pattern: 'Masterball Pattern',
  '1st_edition': '1st Edition',
  first_edition_normal: '1st Edition Normal',
  first_edition_holo: '1st Edition Holo'
} as const;

// Variant ordering for consistent display
export const VARIANT_ORDER: CardVariant[] = [
  'normal',
  'holo',
  'reverse_holo',
  'pokeball_pattern',
  'masterball_pattern',
  '1st_edition',
  'first_edition_normal',
  'first_edition_holo'
] as const;

// Helper functions
export function getVariantTitle(variant: CardVariant): string {
  return VARIANT_DISPLAY_NAMES[variant];
}

export function getVariantClass(variant: CardVariant): string {
  const classMap: Record<CardVariant, string> = {
    normal: 'normal-btn',
    holo: 'holo-btn', 
    reverse_holo: 'reverse-holo-btn',
    pokeball_pattern: 'pokeball-btn',
    masterball_pattern: 'masterball-btn',
    '1st_edition': 'first-edition-btn',
    first_edition_normal: 'first-edition-normal-btn',
    first_edition_holo: 'first-edition-holo-btn'
  };
  return classMap[variant];
}

export function getVariantColorClasses(variant: CardVariant): VariantColorScheme {
  return VARIANT_COLORS[variant];
}

export function hasVariant(analysis: VariantAnalysis, variant: CardVariant): boolean {
  const variantKey = variant as keyof VariantAnalysis['variants'];
  return analysis.variants[variantKey]?.exists ?? false;
}

export function getExistingVariants(analysis: VariantAnalysis): CardVariant[] {
  return VARIANT_ORDER.filter(variant => hasVariant(analysis, variant));
}

// Map variant analysis to card variants (for legacy compatibility)
export function mapToCardVariants(analysis: VariantAnalysis): CardVariant[] {
  return getExistingVariants(analysis);
}