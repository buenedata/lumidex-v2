/**
 * Variant Rule Engine - Complete Implementation
 * 
 * Based on the detailed inspiration variant rule engine.
 * Implements the full rule hierarchy: Hard Rules > Era Rules > Override Rules
 * Uses exact Era types from inspiration files
 */

import type {
  UIVariantType,
  UIVariant,
  VariantEngineInput,
  VariantEngineOutput,
  BulkVariantRequest,
  BulkVariantResponse,
  Era
} from '@/types/variants';
import { sortVariantsByOrder } from '@/types/variants';
import type { CustomCardVariant } from '@/types/custom-variants';
import { createClient } from '@/lib/supabase/server';

type Confidence = 'high' | 'medium' | 'low';
type Source = 'api' | 'rule' | 'override';

interface VariantFlag {
  exists: boolean;
  source?: Source;
  confidence?: Confidence;
}

/**
 * Map internal variant types to UI variant types
 */
const INTERNAL_TO_UI_VARIANT_MAP: Record<string, UIVariantType> = {
  'normal': 'normal',
  'holo': 'holo', 
  'reverse': 'reverse_holo_standard',
  'firstEdNormal': 'first_edition',
  'firstEdHolo': 'first_edition',
  'pokeballPattern': 'reverse_holo_pokeball',
  'masterballPattern': 'reverse_holo_masterball'
};

/**
 * Detect era from card data (exact implementation from inspiration files)
 */
function detectEra(card: VariantEngineInput['card']): Era {
  const setId = card.sets.set_id.toLowerCase();
  const setSeries = card.sets.set_series.toLowerCase();
  const releaseDate = new Date(card.sets.releaseDate);
  const year = releaseDate.getFullYear();
  
  // Scarlet & Violet era (2023-Present)
  if (year >= 2023 || setId.includes('sv') || setSeries.includes('scarlet') || setSeries.includes('violet')) {
    return "Scarlet & Violet";
  }
  
  // Sword & Shield era (2020-2022)
  if (year >= 2020 || setId.includes('swsh') || setSeries.includes('sword') || setSeries.includes('shield')) {
    return "Sword & Shield";
  }
  
  // Sun & Moon era (2017-2019)
  if (year >= 2017 || setId.includes('sm') || setSeries.includes('sun') || setSeries.includes('moon')) {
    return "Sun & Moon";
  }
  
  // XY era (2014-2016)
  if (year >= 2014 || setId.includes('xy') || setSeries.includes('xy')) {
    return "XY";
  }
  
  // Black & White era (2011-2013)
  if (year >= 2011 || setId.includes('bw') || setSeries.includes('black') || setSeries.includes('white')) {
    return "Black & White";
  }
  
  // HGSS era (2010-2011)
  if (year >= 2010 || setSeries.includes('heartgold') || setSeries.includes('soulsilver')) {
    return "HGSS";
  }
  
  // DP era (2007-2009)
  if (year >= 2007 || setSeries.includes('diamond') || setSeries.includes('pearl') || setSeries.includes('platinum')) {
    return "DP";
  }
  
  // EX era (2003-2007)
  if (year >= 2003 || setSeries.includes('ruby') || setSeries.includes('sapphire') || setSeries.includes('emerald')) {
    return "EX";
  }
  
  // WotC era (1998-2003)
  if (setSeries.includes('base') || setSeries.includes('jungle') || setSeries.includes('fossil') ||
      setSeries.includes('rocket') || setSeries.includes('gym') || setSeries.includes('neo') ||
      setSeries.includes('expedition') || setSeries.includes('aquapolis') || setSeries.includes('skyridge') ||
      year <= 2003) {
    return "WotC";
  }
  
  // Default fallback
  return "Sword & Shield";
}

/**
 * Apply hard rules based on pricing data (API signals)
 */
function applyHardRules(card: VariantEngineInput['card']): Partial<Record<string, VariantFlag>> {
  const variants: Partial<Record<string, VariantFlag>> = {};
  const prices = card.tcgplayer?.cardmarket_prices;
  
  if (!prices) return variants;
  
  // Check for normal variant signals
  if (prices.normal || prices.unlimited) {
    variants.normal = { exists: true, source: 'api', confidence: 'high' };
  }
  
  // Check for holo variant signals
  if (prices.holofoil || prices.unlimitedHolofoil) {
    variants.holo = { exists: true, source: 'api', confidence: 'high' };
  }
  
  // Check for reverse holo variant signals
  if (prices.reverseHolofoil) {
    variants.reverse = { exists: true, source: 'api', confidence: 'high' };
  }
  
  // Check for 1st Edition signals
  if (prices['1stEditionHolofoil']) {
    variants.firstEdHolo = { exists: true, source: 'api', confidence: 'high' };
  }
  
  if (prices['1stEditionNormal']) {
    variants.firstEdNormal = { exists: true, source: 'api', confidence: 'high' };
  }
  
  return variants;
}

/**
 * Check if card is Pokemon (not Trainer or Energy)
 */
function isPokemonCard(card: VariantEngineInput['card']): boolean {
  const pokemonRarities = ['Common', 'Uncommon', 'Rare', 'Rare Holo', 'Double Rare', 'Ultra Rare', 'Illustration Rare', 'Special Illustration Rare'];
  const trainerEnergyRarities = ['Trainer', 'Special Energy', 'Basic Energy'];
  
  if (trainerEnergyRarities.some(rarity => card.rarity.includes(rarity))) {
    return false;
  }
  
  return pokemonRarities.some(rarity => card.rarity.includes(rarity)) ||
         !trainerEnergyRarities.some(rarity => card.rarity.includes(rarity));
}

/**
 * Check if rarity indicates ultra rare cards
 */
function isUltraRare(rarity: string): boolean {
  const ultraRarePatterns = [
    "EX", "GX", "V", "VMAX", "VSTAR", "ex", 
    "Secret", "Gold", "Rainbow", "Special Illustration",
    "Illustration Rare", "Full Art", "Alt Art", "Ultra Rare",
    "Double Rare", "LEGEND", "Prime", "LV.X", "BREAK"
  ];
  
  return ultraRarePatterns.some(pattern => rarity.includes(pattern));
}

/**
 * Check if card is from a special pattern set
 */
function isSpecialPatternSet(setId: string): { isPrismaticEvolutions: boolean; isBlackBolt: boolean; isWhiteFlare: boolean } {
  const setIdLower = setId.toLowerCase();
  return {
    isPrismaticEvolutions: setIdLower === 'sv8pt5',
    isBlackBolt: setIdLower === 'zsv10pt5',
    isWhiteFlare: setIdLower === 'rsv10pt5'
  };
}

/**
 * Apply Scarlet & Violet era rules (complete implementation from inspiration files)
 */
function applyScarletVioletRules(card: VariantEngineInput['card']): Partial<Record<string, VariantFlag>> {
  const variants: Partial<Record<string, VariantFlag>> = {};
  const cardNumber = parseInt(card.number.split('/')[0]) || 0;
  const specialSets = isSpecialPatternSet(card.sets.set_id);
  const isAnySpecialSet = specialSets.isPrismaticEvolutions || specialSets.isBlackBolt || specialSets.isWhiteFlare;
  
  // Handle special pattern sets
  if (isAnySpecialSet) {
    const isPokemon = isPokemonCard(card);
    const isSecretRare = (specialSets.isPrismaticEvolutions && cardNumber > 131) ||
                        ((specialSets.isBlackBolt || specialSets.isWhiteFlare) && cardNumber > 86);
    
    if (isSecretRare) {
      // Secret rares: always holo only
      variants.holo = { exists: true, source: "rule", confidence: "high" };
      variants.normal = { exists: false, source: "rule", confidence: "high" };
      variants.reverse = { exists: false, source: "rule", confidence: "high" };
      variants.pokeballPattern = { exists: false, source: "rule", confidence: "high" };
      variants.masterballPattern = { exists: false, source: "rule", confidence: "high" };
    } else if (specialSets.isPrismaticEvolutions) {
      // Prismatic Evolutions rules
      if (isPokemon && !card.rarity.includes('ex') && !card.rarity.includes('ACE SPEC')) {
        // Pokemon (except ex and ACE SPEC): Normal, Reverse Holo, Poké Ball, Master Ball
        variants.normal = { exists: true, source: "rule", confidence: "high" };
        variants.reverse = { exists: true, source: "rule", confidence: "high" };
        variants.holo = { exists: false, source: "rule", confidence: "high" };
        variants.pokeballPattern = { exists: true, source: "rule", confidence: "high" };
        variants.masterballPattern = { exists: true, source: "rule", confidence: "high" };
      } else if (isPokemon && (card.rarity.includes('ex') || card.rarity.includes('ACE SPEC'))) {
        // ex and ACE SPEC cards: Normal, Reverse Holo, Poké Ball - NO Master Ball
        variants.normal = { exists: true, source: "rule", confidence: "high" };
        variants.reverse = { exists: true, source: "rule", confidence: "high" };
        variants.holo = { exists: false, source: "rule", confidence: "high" };
        variants.pokeballPattern = { exists: true, source: "rule", confidence: "high" };
        variants.masterballPattern = { exists: false, source: "rule", confidence: "high" };
      } else {
        // Trainer and Basic Energy: Normal, Reverse Holo, Poké Ball - NO Master Ball
        variants.normal = { exists: true, source: "rule", confidence: "high" };
        variants.reverse = { exists: true, source: "rule", confidence: "high" };
        variants.holo = { exists: false, source: "rule", confidence: "high" };
        variants.pokeballPattern = { exists: true, source: "rule", confidence: "high" };
        variants.masterballPattern = { exists: false, source: "rule", confidence: "high" };
      }
    } else if (specialSets.isBlackBolt || specialSets.isWhiteFlare) {
      // Black Bolt & White Flare rules
      if (isPokemon && ["Common", "Uncommon"].includes(card.rarity)) {
        // Pokemon (Common/Uncommon): Normal, Reverse Holo, Poké Ball, Master Ball
        variants.normal = { exists: true, source: "rule", confidence: "high" };
        variants.reverse = { exists: true, source: "rule", confidence: "high" };
        variants.holo = { exists: false, source: "rule", confidence: "high" };
        variants.pokeballPattern = { exists: true, source: "rule", confidence: "high" };
        variants.masterballPattern = { exists: true, source: "rule", confidence: "high" };
      } else if (isPokemon && ["Rare", "Rare Holo"].includes(card.rarity)) {
        // Pokemon (Rare/Rare Holo): Holo, Reverse Holo, Poké Ball, Master Ball - NO normal
        variants.normal = { exists: false, source: "rule", confidence: "high" };
        variants.reverse = { exists: true, source: "rule", confidence: "high" };
        variants.holo = { exists: true, source: "rule", confidence: "high" };
        variants.pokeballPattern = { exists: true, source: "rule", confidence: "high" };
        variants.masterballPattern = { exists: true, source: "rule", confidence: "high" };
      } else if (!isPokemon && !card.rarity.includes('Special Energy')) {
        // Trainer: Normal, Reverse Holo, Poké Ball - NO Master Ball
        variants.normal = { exists: true, source: "rule", confidence: "high" };
        variants.reverse = { exists: true, source: "rule", confidence: "high" };
        variants.holo = { exists: false, source: "rule", confidence: "high" };
        variants.pokeballPattern = { exists: true, source: "rule", confidence: "high" };
        variants.masterballPattern = { exists: false, source: "rule", confidence: "high" };
      } else if (!isPokemon && card.rarity.includes('Basic Energy')) {
        // Basic Energy: Normal, Reverse Holo - NO patterns
        variants.normal = { exists: true, source: "rule", confidence: "high" };
        variants.reverse = { exists: true, source: "rule", confidence: "high" };
        variants.holo = { exists: false, source: "rule", confidence: "high" };
        variants.pokeballPattern = { exists: false, source: "rule", confidence: "high" };
        variants.masterballPattern = { exists: false, source: "rule", confidence: "high" };
      } else if (isUltraRare(card.rarity)) {
        // Ultra rare cards: always holo only
        variants.holo = { exists: true, source: "rule", confidence: "high" };
        variants.normal = { exists: false, source: "rule", confidence: "high" };
        variants.reverse = { exists: false, source: "rule", confidence: "high" };
        variants.pokeballPattern = { exists: false, source: "rule", confidence: "high" };
        variants.masterballPattern = { exists: false, source: "rule", confidence: "high" };
      }
    }
  } else {
    // Regular Scarlet & Violet sets - no pattern variants
    variants.pokeballPattern = { exists: false, source: "rule", confidence: "high" };
    variants.masterballPattern = { exists: false, source: "rule", confidence: "high" };
    
    if (card.rarity === "Rare") {
      // Single-star rares are holo by default, no normal in boosters
      variants.holo = { exists: true, source: "rule", confidence: "medium" };
      variants.reverse = { exists: true, source: "rule", confidence: "medium" };
      variants.normal = { exists: false, source: "rule", confidence: "high" };
    } else if (card.rarity === "Rare Holo") {
      // Traditional holo rares
      variants.holo = { exists: true, source: "rule", confidence: "medium" };
      variants.reverse = { exists: true, source: "rule", confidence: "medium" };
      variants.normal = { exists: false, source: "rule", confidence: "high" };
    } else if (["Common", "Uncommon"].includes(card.rarity)) {
      // Commons/Uncommons follow traditional patterns
      variants.normal = { exists: true, source: "rule", confidence: "medium" };
      variants.reverse = { exists: true, source: "rule", confidence: "medium" };
      variants.holo = { exists: false, source: "rule", confidence: "high" };
    } else if (isUltraRare(card.rarity)) {
      // Ultra rares (ex, Special Illustration, etc.)
      variants.holo = { exists: true, source: "rule", confidence: "medium" };
      variants.normal = { exists: false, source: "rule", confidence: "high" };
      variants.reverse = { exists: false, source: "rule", confidence: "medium" };
    }
  }
  
  return variants;
}

/**
 * Apply Sword & Shield era rules
 */
function applySwordShieldRules(card: VariantEngineInput['card']): Partial<Record<string, VariantFlag>> {
  const variants: Partial<Record<string, VariantFlag>> = {};
  
  // No pattern variants in Sword & Shield era
  variants.pokeballPattern = { exists: false, source: "rule", confidence: "high" };
  variants.masterballPattern = { exists: false, source: "rule", confidence: "high" };
  
  if (card.rarity === "Rare") {
    // Non-holo rares: normal + reverse, no holo in boosters
    variants.normal = { exists: true, source: "rule", confidence: "medium" };
    variants.reverse = { exists: true, source: "rule", confidence: "medium" };
    variants.holo = { exists: false, source: "rule", confidence: "high" };
  } else if (card.rarity === "Rare Holo") {
    // Holo rares: holo + reverse, no normal in boosters
    variants.holo = { exists: true, source: "rule", confidence: "medium" };
    variants.reverse = { exists: true, source: "rule", confidence: "medium" };
    variants.normal = { exists: false, source: "rule", confidence: "high" };
  } else if (["Common", "Uncommon"].includes(card.rarity)) {
    variants.normal = { exists: true, source: "rule", confidence: "medium" };
    variants.reverse = { exists: true, source: "rule", confidence: "medium" };
    variants.holo = { exists: false, source: "rule", confidence: "high" };
  } else if (isUltraRare(card.rarity)) {
    variants.holo = { exists: true, source: "rule", confidence: "medium" };
    variants.normal = { exists: false, source: "rule", confidence: "high" };
    variants.reverse = { exists: false, source: "rule", confidence: "medium" };
  }
  
  return variants;
}

/**
 * Apply WotC era rules
 */
function applyWotCRules(card: VariantEngineInput['card']): Partial<Record<string, VariantFlag>> {
  const variants: Partial<Record<string, VariantFlag>> = {};
  
  // No pattern variants in WotC era
  variants.pokeballPattern = { exists: false, source: "rule", confidence: "high" };
  variants.masterballPattern = { exists: false, source: "rule", confidence: "high" };
  
  // 1st Edition availability for WotC sets
  variants.firstEdNormal = { exists: true, source: "rule", confidence: "medium" };
  variants.firstEdHolo = { exists: true, source: "rule", confidence: "medium" };
  
  if (card.rarity === "Rare") {
    variants.normal = { exists: true, source: "rule", confidence: "medium" };
    variants.holo = { exists: false, source: "rule", confidence: "medium" };
  } else if (card.rarity === "Rare Holo") {
    variants.holo = { exists: true, source: "rule", confidence: "medium" };
    variants.normal = { exists: false, source: "rule", confidence: "medium" };
  } else if (["Common", "Uncommon"].includes(card.rarity)) {
    variants.normal = { exists: true, source: "rule", confidence: "medium" };
    variants.holo = { exists: false, source: "rule", confidence: "high" };
  }
  
  // Reverse holo introduced with Legendary Collection (2002)
  const releaseDate = new Date(card.sets.releaseDate);
  if (releaseDate >= new Date('2002-05-24')) {
    variants.reverse = { exists: true, source: "rule", confidence: "medium" };
  } else {
    variants.reverse = { exists: false, source: "rule", confidence: "high" };
  }
  
  return variants;
}

/**
 * Apply era-specific rules
 */
function applyEraRules(card: VariantEngineInput['card'], era: Era): Partial<Record<string, VariantFlag>> {
  switch (era) {
    case "Scarlet & Violet":
      return applyScarletVioletRules(card);
    case "WotC":
      return applyWotCRules(card);
    case "Sword & Shield":
    case "Sun & Moon":
    case "XY":
    case "Black & White":
    case "HGSS":
    case "DP":
    case "EX":
    default:
      return applySwordShieldRules(card);
  }
}

/**
 * Apply rule precedence: Hard Rules > Era Rules
 */
function applyRulePrecedence(
  hardRules: Partial<Record<string, VariantFlag>>,
  eraRules: Partial<Record<string, VariantFlag>>
): Record<string, VariantFlag> {
  const variants: Record<string, VariantFlag> = {
    normal: { exists: false },
    holo: { exists: false },
    reverse: { exists: false },
    firstEdNormal: { exists: false },
    firstEdHolo: { exists: false },
    pokeballPattern: { exists: false },
    masterballPattern: { exists: false }
  };
  
  // Apply era rules first
  Object.keys(variants).forEach(variantKey => {
    if (eraRules[variantKey]) {
      variants[variantKey] = eraRules[variantKey]!;
    }
  });
  
  // Hard rules override era rules
  Object.keys(variants).forEach(variantKey => {
    if (hardRules[variantKey]) {
      variants[variantKey] = hardRules[variantKey]!;
    }
  });
  
  return variants;
}

/**
 * Fetch custom variants for a card from the database
 */
async function getCustomVariants(cardId: string): Promise<CustomCardVariant[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('custom_card_variants')
      .select('*')
      .eq('card_id', cardId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching custom variants:', error);
      return [];
    }

    return data as CustomCardVariant[];
  } catch (error) {
    console.error('Error fetching custom variants:', error);
    return [];
  }
}

/**
 * Fetch disabled standard variants for a card from the database
 */
async function getDisabledStandardVariants(cardId: string): Promise<string[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('disabled_standard_variants')
      .select('variant_type')
      .eq('card_id', cardId);

    if (error) {
      console.error('Error fetching disabled variants:', error);
      return [];
    }

    return data.map(row => row.variant_type);
  } catch (error) {
    console.error('Error fetching disabled variants:', error);
    return [];
  }
}

/**
 * Apply custom variant rules - replace/exclude standard variants
 */
function applyCustomVariantRules(
  standardVariants: Record<string, VariantFlag>,
  customVariants: CustomCardVariant[]
): {
  finalStandardVariants: Record<string, VariantFlag>;
  appliedCustomVariants: CustomCardVariant[];
  appliedExceptions: string[];
} {
  const finalStandardVariants = { ...standardVariants };
  const appliedExceptions: string[] = [];

  // Process each custom variant
  customVariants.forEach(customVariant => {
    if (customVariant.replaces_standard_variant) {
      // Find the internal variant key that maps to the UI variant being replaced
      const internalKey = Object.entries(INTERNAL_TO_UI_VARIANT_MAP)
        .find(([_, uiType]) => uiType === customVariant.replaces_standard_variant)?.[0];
      
      if (internalKey && finalStandardVariants[internalKey]?.exists) {
        // Mark the standard variant as not existing
        finalStandardVariants[internalKey] = {
          exists: false,
          source: 'override',
          confidence: 'high'
        };
        appliedExceptions.push(`Replaced ${customVariant.replaces_standard_variant} with custom variant: ${customVariant.display_name}`);
      }
    }
  });

  return {
    finalStandardVariants,
    appliedCustomVariants: customVariants,
    appliedExceptions
  };
}

/**
 * Convert internal variants and custom variants to UI variants
 */
function convertToUIVariants(
  internalVariants: Record<string, VariantFlag>,
  customVariants: CustomCardVariant[] = [],
  userQuantities?: Record<UIVariantType, number>
): UIVariant[] {
  const uiVariants: UIVariant[] = [];
  
  // Add standard variants
  Object.entries(internalVariants).forEach(([key, variant]) => {
    if (variant.exists) {
      const uiType = INTERNAL_TO_UI_VARIANT_MAP[key];
      if (uiType) {
        uiVariants.push({
          type: uiType,
          userQuantity: userQuantities?.[uiType] || 0
        });
      }
    }
  });
  
  // Custom variants are NOT added as buttons to the UI
  // They are only used for replacement logic and counted in metadata
  // The card tiles will show "+X variant" indicator based on metadata.customVariantCount
  
  return uiVariants;
}

/**
 * Main engine function - generates variants for a single card
 */
export async function generateVariantsForCard(
  input: VariantEngineInput
): Promise<VariantEngineOutput> {
  const { card } = input;
  
  try {
    // Step 1: Detect era
    const era = detectEra(card);
    
    // Step 2: Apply hard rules (pricing data)
    const hardRuleVariants = applyHardRules(card);
    
    // Step 3: Apply era rules
    const eraRuleVariants = applyEraRules(card, era);
    
    // Step 4: Merge variants (hard rules take precedence)
    const standardVariants = applyRulePrecedence(hardRuleVariants, eraRuleVariants);
    
    // Step 5: Get custom variants from database
    const customVariants = await getCustomVariants(card.set_id);
    
    
    // Step 6: Apply custom variant rules (replace/exclude standard variants)
    const { finalStandardVariants, appliedCustomVariants, appliedExceptions } =
      applyCustomVariantRules(standardVariants, customVariants);
    
    // Step 7: Convert to UIVariants and add user quantities
    const uiVariants = convertToUIVariants(
      finalStandardVariants,
      appliedCustomVariants,
      input.userQuantities
    );
    
    // Step 8: Sort variants by order preference
    const sortedVariants = sortVariantsByOrder(uiVariants);
    
    
    return {
      variants: sortedVariants,
      metadata: {
        source: Object.keys(hardRuleVariants).length > 0 ? 'tcgplayer' : 'policy',
        appliedExceptions,
        customVariantCount: appliedCustomVariants.length
      }
    };
    
  } catch (error) {
    console.error(`Error generating variants for card ${card.set_id}:`, error);
    
    // Fallback: return normal variant only
    return {
      variants: [{
        type: 'normal',
        userQuantity: input.userQuantities?.normal || 0
      }],
      metadata: {
        source: 'policy',
        appliedExceptions: []
      }
    };
  }
}

/**
 * Bulk processing for set-level optimization
 */
export async function generateVariantsForSet(
  request: BulkVariantRequest
): Promise<BulkVariantResponse> {
  const { cards, userCollectionData } = request;
  const results = new Map<string, VariantEngineOutput>();
  const errors: Array<{ cardId: string; error: string }> = [];
  
  try {
    // Process cards in parallel
    const promises = cards.map(async (card) => {
      try {
        const userQuantities = userCollectionData?.get(card.set_id);
        const result = await generateVariantsForCard({ card, userQuantities });
        results.set(card.set_id, result);
      } catch (error) {
        errors.push({
          cardId: card.set_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
    
    await Promise.all(promises);
    
    // Convert Map to Record for JSON response
    const resultsRecord: Record<string, VariantEngineOutput> = {};
    results.forEach((variantData, cardId) => {
      resultsRecord[cardId] = variantData;
    });
    
    return {
      results: resultsRecord,
      errors
    };
    
  } catch (error) {
    console.error(`Error generating variants for set:`, error);
    // Convert Map to Record for JSON response
    const resultsRecord: Record<string, VariantEngineOutput> = {};
    results.forEach((variantData, cardId) => {
      resultsRecord[cardId] = variantData;
    });
    
    return {
      results: resultsRecord,
      errors: [{
        cardId: 'SET_ERROR',
        error: error instanceof Error ? error.message : 'Unknown set error'
      }]
    };
  }
}

// Cache management functions (kept for compatibility)
export function clearVariantCache(): void {
  // No-op for rule-based engine
}

export function clearSetPolicyCache(setId: string): void {
  // No-op for rule-based engine
}