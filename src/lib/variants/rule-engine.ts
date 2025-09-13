/**
 * Variant Rule Engine - Core Implementation
 * Data-driven variant discovery using TCGplayer as source of truth
 * Based on filesforinspiration/variant-rule-engine/inferVariants.ts
 */

import type { 
  CardInput, 
  VariantAnalysis, 
  Era, 
  CardVariant, 
  VariantFlag,
  VariantSource,
  VariantConfidence 
} from '@/types/card-variants';
import { 
  detectEra, 
  hasReverseHoloDefault, 
  has1stEditionVariants,
  isScarletVioletSingleStarHolo,
  hasSpecialPatterns 
} from './era-detection';

/**
 * Main variant inference function
 */
export function inferVariants(card: CardInput, productSources?: string[]): VariantAnalysis {
  const era = detectEra(card);
  const explanations: string[] = [];
  
  // Extract TCGplayer pricing signals
  const tcgplayerVariants = extractTCGplayerVariants(card.tcgplayer?.prices);
  
  // Initialize variant flags
  const variants: VariantAnalysis['variants'] = {
    normal: { exists: false },
    holo: { exists: false },
    reverse_holo: { exists: false },
    pokeball_pattern: { exists: false },
    masterball_pattern: { exists: false },
    '1st_edition': { exists: false },
    first_edition_normal: { exists: false },
    first_edition_holo: { exists: false }
  };

  // Step 1: Apply Hard Rules (TCGplayer pricing signals)
  applyHardRules(variants, tcgplayerVariants, explanations);
  
  // Step 2: Apply Era Rules (fallback logic)
  applyEraRules(variants, card, era, explanations);
  
  // Step 3: Apply Override Rules (product source exceptions)
  if (productSources) {
    applyOverrideRules(variants, card, era, productSources, explanations);
  }

  return {
    cardId: card.id,
    setId: card.set.id,
    era,
    rarity: card.rarity,
    variants,
    printSources: productSources || ["Booster"],
    explanations
  };
}

/**
 * Extract variant types from TCGplayer pricing data
 */
function extractTCGplayerVariants(prices?: Record<string, any>): string[] {
  if (!prices) return [];
  
  return Object.keys(prices).filter(key => {
    const priceData = prices[key];
    // Only consider variants with actual market prices
    return priceData && (
      priceData.market > 0 || 
      priceData.mid > 0 || 
      priceData.low > 0 ||
      priceData.high > 0
    );
  });
}

/**
 * Apply Hard Rules - TCGplayer pricing signals
 * Highest precedence: API presence = variant exists
 */
function applyHardRules(
  variants: VariantAnalysis['variants'], 
  tcgplayerVariants: string[], 
  explanations: string[]
): void {
  if (tcgplayerVariants.length === 0) return;

  if (tcgplayerVariants.includes('normal')) {
    variants.normal = { 
      exists: true, 
      source: 'api', 
      confidence: 'high' 
    };
    explanations.push('Normal variant detected from TCGplayer pricing');
  }

  if (tcgplayerVariants.includes('holofoil')) {
    variants.holo = { 
      exists: true, 
      source: 'api', 
      confidence: 'high' 
    };
    explanations.push('Holo variant detected from TCGplayer pricing');
  }

  if (tcgplayerVariants.includes('reverseHolofoil')) {
    variants.reverse_holo = { 
      exists: true, 
      source: 'api', 
      confidence: 'high' 
    };
    explanations.push('Reverse holo variant detected from TCGplayer pricing');
  }

  if (tcgplayerVariants.includes('1stEditionNormal')) {
    variants.first_edition_normal = { 
      exists: true, 
      source: 'api', 
      confidence: 'high' 
    };
    explanations.push('1st Edition Normal variant detected from TCGplayer pricing');
  }

  if (tcgplayerVariants.includes('1stEditionHolofoil')) {
    variants.first_edition_holo = { 
      exists: true, 
      source: 'api', 
      confidence: 'high' 
    };
    explanations.push('1st Edition Holo variant detected from TCGplayer pricing');
  }
}

/**
 * Apply Era Rules - fallback logic based on era + rarity patterns
 */
function applyEraRules(
  variants: VariantAnalysis['variants'],
  card: CardInput,
  era: Era,
  explanations: string[]
): void {
  const rarity = card.rarity;
  const setId = card.set.id;
  const cardNumber = parseInt(card.number.split('/')[0]) || 0;

  // Get card type information
  const isTrainer = !card.name || card.name.includes('Trainer'); // Simplified detection
  const isEnergy = card.name?.includes('Energy') || false;
  const isPokemon = !isTrainer && !isEnergy;

  // Categorize rarity
  const isCommon = rarity === 'Common';
  const isUncommon = rarity === 'Uncommon';
  const isRare = rarity === 'Rare';
  const isHoloRare = rarity === 'Rare Holo' || rarity === 'Holo Rare';
  const isUltraRare = rarity.includes('V') || rarity.includes('EX') || rarity.includes('GX') ||
                     rarity.includes('VMAX') || rarity.includes('VSTAR') || rarity.includes('ex') ||
                     rarity === 'Rare Ultra' || rarity === 'Ultra Rare' || rarity === 'Double Rare';
  const isSpecialIllustration = rarity.includes('Special Illustration') || rarity.includes('Illustration Rare');
  const isSecretRare = rarity.includes('Secret') || rarity.includes('Gold') || rarity.includes('Rainbow');
  const isAceSpec = rarity.includes('ACE SPEC');
  const isFullArt = rarity.includes('Full Art');
  const isSpecialEnergy = isEnergy && (isFullArt || rarity.includes('Special'));

  // Check for special pattern sets
  const isSpecialPatternSet = hasSpecialPatterns(era, setId);

  // WotC Era Rules
  if (era === 'WotC') {
    applyWotcRules(variants, rarity, isTrainer, isEnergy, isPokemon, explanations);
  }
  // Scarlet & Violet Era Rules
  else if (era === 'Scarlet & Violet') {
    applyScarletVioletRules(variants, rarity, isUltraRare, isSpecialIllustration, isSecretRare, explanations);
  }
  // Special Pattern Set Rules
  else if (isSpecialPatternSet) {
    applySpecialPatternRules(variants, card, cardNumber, isPokemon, isTrainer, isEnergy, rarity, explanations);
  }
  // Modern Era Rules (EX through Sword & Shield)
  else {
    applyModernRules(variants, rarity, isUltraRare, isSpecialIllustration, isSecretRare, isSpecialEnergy, explanations);
  }

  // Apply reverse holo default if era supports it
  if (hasReverseHoloDefault(era, card.set.releaseDate) && !variants.reverse_holo.exists) {
    if (isCommon || isUncommon || (isRare && era !== 'Scarlet & Violet')) {
      variants.reverse_holo = { 
        exists: true, 
        source: 'rule', 
        confidence: 'medium' 
      };
      explanations.push(`Reverse holo added by default for ${era} era ${rarity}`);
    }
  }
}

/**
 * Apply WotC Era specific rules
 */
function applyWotcRules(
  variants: VariantAnalysis['variants'],
  rarity: string,
  isTrainer: boolean,
  isEnergy: boolean,
  isPokemon: boolean,
  explanations: string[]
): void {
  const isCommon = rarity === 'Common';
  const isUncommon = rarity === 'Uncommon';
  const isRare = rarity === 'Rare';
  const isHoloRare = rarity === 'Rare Holo' || rarity === 'Holo Rare';

  // WotC era always has 1st Edition variants
  if (!variants.first_edition_normal.exists && !variants.first_edition_holo.exists) {
    if (isCommon || isUncommon || isRare) {
      variants['1st_edition'] = { 
        exists: true, 
        source: 'rule', 
        confidence: 'medium' 
      };
      explanations.push('1st Edition variant added for WotC era card');
    }
  }

  // Apply normal/holo variants based on rarity
  if (isCommon || isUncommon) {
    if (!variants.normal.exists) {
      variants.normal = { 
        exists: true, 
        source: 'rule', 
        confidence: 'medium' 
      };
      explanations.push(`Normal variant added for WotC ${rarity}`);
    }
  } else if (isRare || isHoloRare) {
    if (!variants.holo.exists) {
      variants.holo = { 
        exists: true, 
        source: 'rule', 
        confidence: 'medium' 
      };
      explanations.push(`Holo variant added for WotC ${rarity}`);
    }
  }
}

/**
 * Apply Scarlet & Violet Era specific rules
 */
function applyScarletVioletRules(
  variants: VariantAnalysis['variants'],
  rarity: string,
  isUltraRare: boolean,
  isSpecialIllustration: boolean,
  isSecretRare: boolean,
  explanations: string[]
): void {
  // S&V single-star rares are holo by default, no normal in boosters
  if (rarity === 'Rare') {
    if (!variants.holo.exists) {
      variants.holo = { 
        exists: true, 
        source: 'rule', 
        confidence: 'medium' 
      };
      explanations.push('Holo variant added for S&V single-star rare');
    }
    // Remove normal variant if it exists (S&V rares don't come in normal)
    if (variants.normal.exists && variants.normal.source !== 'api') {
      variants.normal = { exists: false };
      explanations.push('Normal variant removed for S&V single-star rare');
    }
  } else if (isUltraRare || isSpecialIllustration || isSecretRare) {
    if (!variants.holo.exists) {
      variants.holo = { 
        exists: true, 
        source: 'rule', 
        confidence: 'medium' 
      };
      explanations.push(`Holo variant added for S&V ${rarity}`);
    }
  } else {
    // Common/Uncommon get normal + reverse
    if (!variants.normal.exists) {
      variants.normal = { 
        exists: true, 
        source: 'rule', 
        confidence: 'medium' 
      };
      explanations.push(`Normal variant added for S&V ${rarity}`);
    }
  }
}

/**
 * Apply special pattern set rules (Prismatic Evolutions, etc.)
 */
function applySpecialPatternRules(
  variants: VariantAnalysis['variants'],
  card: CardInput,
  cardNumber: number,
  isPokemon: boolean,
  isTrainer: boolean,
  isEnergy: boolean,
  rarity: string,
  explanations: string[]
): void {
  const setId = card.set.id.toLowerCase();
  
  // Prismatic Evolutions rules
  if (setId === 'sv8pt5') {
    // Cards over 131 are secret rares - always holo only
    if (cardNumber > 131) {
      if (!variants.holo.exists) {
        variants.holo = { 
          exists: true, 
          source: 'rule', 
          confidence: 'medium' 
        };
        explanations.push('Holo variant added for Prismatic Evolutions secret rare');
      }
    } else if (isPokemon) {
      // Pokémon (except ex and ACE SPEC): Normal, Reverse Holo, Poké Ball, Master Ball
      if (!rarity.includes('ex') && !rarity.includes('ACE SPEC')) {
        if (!variants.normal.exists) {
          variants.normal = { exists: true, source: 'rule', confidence: 'medium' };
        }
        if (!variants.reverse_holo.exists) {
          variants.reverse_holo = { exists: true, source: 'rule', confidence: 'medium' };
        }
        if (!variants.pokeball_pattern.exists) {
          variants.pokeball_pattern = { exists: true, source: 'rule', confidence: 'medium' };
        }
        if (!variants.masterball_pattern.exists) {
          variants.masterball_pattern = { exists: true, source: 'rule', confidence: 'medium' };
        }
        explanations.push('Pattern variants added for Prismatic Evolutions Pokémon');
      } else {
        // ex and ACE SPEC cards: Normal, Reverse Holo, Poké Ball - NO Master Ball
        if (!variants.normal.exists) {
          variants.normal = { exists: true, source: 'rule', confidence: 'medium' };
        }
        if (!variants.reverse_holo.exists) {
          variants.reverse_holo = { exists: true, source: 'rule', confidence: 'medium' };
        }
        if (!variants.pokeball_pattern.exists) {
          variants.pokeball_pattern = { exists: true, source: 'rule', confidence: 'medium' };
        }
        explanations.push('Limited pattern variants added for Prismatic Evolutions ex/ACE SPEC');
      }
    } else if (isTrainer || isEnergy) {
      // Trainer and Basic Energy: Normal, Reverse Holo, Poké Ball - NO Master Ball
      if (!variants.normal.exists) {
        variants.normal = { exists: true, source: 'rule', confidence: 'medium' };
      }
      if (!variants.reverse_holo.exists) {
        variants.reverse_holo = { exists: true, source: 'rule', confidence: 'medium' };
      }
      if (!variants.pokeball_pattern.exists) {
        variants.pokeball_pattern = { exists: true, source: 'rule', confidence: 'medium' };
      }
      explanations.push('Pattern variants added for Prismatic Evolutions Trainer/Energy');
    }
  }
}

/**
 * Apply modern era rules (EX through Sword & Shield)
 */
function applyModernRules(
  variants: VariantAnalysis['variants'],
  rarity: string,
  isUltraRare: boolean,
  isSpecialIllustration: boolean,
  isSecretRare: boolean,
  isSpecialEnergy: boolean,
  explanations: string[]
): void {
  const isCommon = rarity === 'Common';
  const isUncommon = rarity === 'Uncommon';
  const isRare = rarity === 'Rare';
  const isHoloRare = rarity === 'Rare Holo' || rarity === 'Holo Rare';

  if (isCommon || isUncommon) {
    // Common/Uncommon: Normal + Reverse Holo
    if (!variants.normal.exists) {
      variants.normal = { 
        exists: true, 
        source: 'rule', 
        confidence: 'medium' 
      };
      explanations.push(`Normal variant added for modern ${rarity}`);
    }
  } else if (isRare) {
    // Basic Rare: Normal + Reverse Holo (modern sets don't have holo variants for basic rares)
    if (!variants.normal.exists) {
      variants.normal = { 
        exists: true, 
        source: 'rule', 
        confidence: 'medium' 
      };
      explanations.push('Normal variant added for modern Rare');
    }
  } else if (isHoloRare) {
    // Holo Rare: Reverse Holo + Holo
    if (!variants.holo.exists) {
      variants.holo = { 
        exists: true, 
        source: 'rule', 
        confidence: 'medium' 
      };
      explanations.push('Holo variant added for modern Holo Rare');
    }
  } else if (isUltraRare || isSpecialIllustration || isSecretRare || isSpecialEnergy) {
    // Ultra Rare: Always Holo only
    if (!variants.holo.exists) {
      variants.holo = { 
        exists: true, 
        source: 'rule', 
        confidence: 'medium' 
      };
      explanations.push(`Holo variant added for modern ${rarity}`);
    }
  }
}

/**
 * Apply Override Rules - product source exceptions
 */
function applyOverrideRules(
  variants: VariantAnalysis['variants'],
  card: CardInput,
  era: Era,
  productSources: string[],
  explanations: string[]
): void {
  // Theme Deck override: Non-holo variants of holo cards
  if (productSources.includes('Theme Deck') && era === 'WotC') {
    if (variants.holo.exists && !variants.normal.exists) {
      variants.normal = { 
        exists: true, 
        source: 'override', 
        confidence: 'medium' 
      };
      explanations.push('Normal variant added due to Theme Deck source override');
    }
  }

  // Add other product source overrides as needed
}

/**
 * Utility function to map to legacy CardVariant array
 */
export function mapToCardVariants(analysis: VariantAnalysis): CardVariant[] {
  const variants: CardVariant[] = [];
  
  if (analysis.variants.normal.exists) variants.push('normal');
  if (analysis.variants.holo.exists) variants.push('holo');
  if (analysis.variants.reverse_holo.exists) variants.push('reverse_holo');
  if (analysis.variants.pokeball_pattern.exists) variants.push('pokeball_pattern');
  if (analysis.variants.masterball_pattern.exists) variants.push('masterball_pattern');
  if (analysis.variants['1st_edition'].exists) variants.push('1st_edition');
  if (analysis.variants.first_edition_normal.exists) variants.push('first_edition_normal');
  if (analysis.variants.first_edition_holo.exists) variants.push('first_edition_holo');
  
  return variants;
}