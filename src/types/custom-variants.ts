// Types for custom variant management system

export type CustomVariantType = 
  | 'reverse_holo_pokeball'
  | 'reverse_holo_masterball'
  | 'special_edition'
  | 'promo'
  | 'custom';

export interface CustomCardVariant {
  id: number;
  card_id: string;
  variant_name: string;
  variant_type: CustomVariantType;
  display_name: string;
  description: string;
  source_product?: string;
  price_usd?: number;
  price_eur?: number;
  is_active: boolean;
  replaces_standard_variant?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomVariantInput {
  card_id: string;
  variant_name: string;
  variant_type: CustomVariantType;
  display_name: string;
  description: string;
  source_product?: string;
  price_usd?: number;
  price_eur?: number;
  replaces_standard_variant?: string;
}

export interface UpdateCustomVariantInput extends Partial<CreateCustomVariantInput> {
  is_active?: boolean;
}

// Extended card info for admin search
export interface AdminCardSearchResult {
  id: string;
  name: string;
  number: string;
  set_id: string;
  set_name: string;
  rarity: string;
  images?: {
    small?: string;
    large?: string;
  };
  custom_variants?: CustomCardVariant[];
  standard_variants?: string[]; // From variant engine
}

// Search filters for admin
export interface AdminCardSearchFilters {
  query?: string; // Search by name or number
  set_id?: string;
  rarity?: string;
  has_custom_variants?: boolean;
}

// Variant preview for admin UI
export interface VariantPreview {
  standard_variants: string[];
  custom_variants: CustomCardVariant[];
  display_variants: string[]; // What will actually be shown to users
  hidden_variants: string[]; // Standard variants hidden by custom replacements
}

// Display names for custom variant types
export const CUSTOM_VARIANT_TYPE_NAMES: Record<CustomVariantType, string> = {
  reverse_holo_pokeball: 'Reverse Holo (Poké Ball)',
  reverse_holo_masterball: 'Reverse Holo (Master Ball)',
  special_edition: 'Special Edition',
  promo: 'Promotional',
  custom: 'Custom'
} as const;

// Standard variant names that can be replaced
export const STANDARD_VARIANT_NAMES = [
  'normal',
  'holo',
  'reverse_holo_standard',
  'reverse_holo_pokeball',
  'reverse_holo_masterball',
  'first_edition'
] as const;

export type StandardVariantName = typeof STANDARD_VARIANT_NAMES[number];

// Helper function to get display name for variant type
export function getCustomVariantTypeName(type: CustomVariantType): string {
  return CUSTOM_VARIANT_TYPE_NAMES[type];
}