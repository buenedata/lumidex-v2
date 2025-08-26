// Variant normalization system for Pokemon TCG price data
// Maps external variant names from TCGplayer and Cardmarket to internal normalized names

export type VariantName = 
  | 'normal' 
  | 'holofoil' 
  | 'reverse_holofoil' 
  | 'first_edition_normal' 
  | 'first_edition_holofoil' 
  | 'unlimited';

export type PriceSource = 'cardmarket' | 'tcgplayer';

// TCGplayer external variant mapping to internal variants
const tcgplayerVariantMap: Record<string, VariantName> = {
  'normal': 'normal',
  'holofoil': 'holofoil',
  'reverseholofoil': 'reverse_holofoil',
  'reverse holofoil': 'reverse_holofoil',
  '1stedition': 'first_edition_normal',
  '1steditionholofoil': 'first_edition_holofoil',
  '1st edition': 'first_edition_normal',
  '1st edition holofoil': 'first_edition_holofoil',
  'firstedition': 'first_edition_normal',
  'firsteditionholofoil': 'first_edition_holofoil',
  'unlimited': 'unlimited',
  'unlimitedholofoil': 'holofoil',
  'unlimited holofoil': 'holofoil'
};

// Cardmarket external variant mapping to internal variants
const cardmarketVariantMap: Record<string, VariantName> = {
  'normal': 'normal',
  'holofoil': 'holofoil',
  'holo': 'holofoil',
  'reverseholofoil': 'reverse_holofoil',
  'reverse holofoil': 'reverse_holofoil',
  'reverse': 'reverse_holofoil',
  'unlimited': 'unlimited',
  'unlimitedholofoil': 'holofoil',
  'unlimited holofoil': 'holofoil',
  // Cardmarket rarely splits 1st edition in v2 API
  // Treat any detected 1st edition notion as normal/holofoil respectively
  '1stedition': 'normal',
  '1st edition': 'normal',
  'firstedition': 'normal',
  '1steditionholo': 'holofoil',
  '1st edition holo': 'holofoil',
  'firsteditionholo': 'holofoil'
};

/**
 * Maps external variant keys from price sources to internal normalized variant names
 * @param source - The price source ('tcgplayer' or 'cardmarket')
 * @param externalKey - The external variant key from the API
 * @returns Internal VariantName or null if mapping not found
 */
export function mapVariantFromSource(
  source: PriceSource, 
  externalKey: string
): VariantName | null {
  if (!externalKey || typeof externalKey !== 'string') {
    return null;
  }

  // Normalize the external key: lowercase, remove spaces and special characters
  const normalizedKey = externalKey
    .toLowerCase()
    .replace(/[\s\-_]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');

  if (source === 'tcgplayer') {
    return tcgplayerVariantMap[normalizedKey] || null;
  }

  if (source === 'cardmarket') {
    return cardmarketVariantMap[normalizedKey] || null;
  }

  return null;
}

/**
 * Gets all supported variant mappings for a given source
 * @param source - The price source
 * @returns Array of [externalKey, internalVariant] pairs
 */
export function getVariantMappingsForSource(source: PriceSource): Array<[string, VariantName]> {
  const sourceMap = source === 'tcgplayer' ? tcgplayerVariantMap : cardmarketVariantMap;
  return Object.entries(sourceMap);
}

/**
 * Validates if a variant name is a valid internal variant
 * @param variant - The variant name to validate
 * @returns Boolean indicating if variant is valid
 */
export function isValidVariant(variant: string): variant is VariantName {
  const validVariants: VariantName[] = [
    'normal',
    'holofoil', 
    'reverse_holofoil',
    'first_edition_normal',
    'first_edition_holofoil',
    'unlimited'
  ];
  return validVariants.includes(variant as VariantName);
}

/**
 * Gets a human-readable display name for a variant
 * @param variant - The internal variant name
 * @returns Human-readable display name
 */
export function getVariantDisplayName(variant: VariantName): string {
  const displayNames: Record<VariantName, string> = {
    'normal': 'Normal',
    'holofoil': 'Holofoil',
    'reverse_holofoil': 'Reverse Holofoil',
    'first_edition_normal': '1st Edition Normal',
    'first_edition_holofoil': '1st Edition Holofoil',
    'unlimited': 'Unlimited'
  };
  return displayNames[variant];
}

/**
 * Maps multiple external variants from a price data object
 * @param source - The price source
 * @param priceData - Object with external variant keys as properties
 * @returns Array of successfully mapped [internalVariant, priceValue] pairs
 */
export function mapVariantsFromPriceData(
  source: PriceSource,
  priceData: Record<string, any>
): Array<[VariantName, any]> {
  const mappedVariants: Array<[VariantName, any]> = [];

  for (const [externalKey, priceValue] of Object.entries(priceData)) {
    const internalVariant = mapVariantFromSource(source, externalKey);
    if (internalVariant && priceValue != null) {
      mappedVariants.push([internalVariant, priceValue]);
    }
  }

  return mappedVariants;
}