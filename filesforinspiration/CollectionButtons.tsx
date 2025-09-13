'use client';

import React, { memo, useMemo, useState, useEffect } from 'react';
import { Plus, Check } from 'lucide-react';
import { CardVariant } from '@/types/domains/card';
import type { PokemonCard } from '@/types/domains/card';
import { mapToCardVariants } from '@/lib/variant-rule-engine';
import { manualVariantsService, ManualVariant } from '@/lib/manual-variants-service';

// Legacy interface for backward compatibility
interface CollectionButtonProps {
  cards: PokemonCard;
  collectionData?: any;
  onToggleCollection: (cardId: string) => void;
  onAddVariant: (cardId: string, variant: CardVariant) => void;
  onRemoveVariant: (cardId: string, variant: CardVariant) => void;
  onAddManualVariant?: (cardId: string, variantId: string) => void;
  onRemoveManualVariant?: (cardId: string, variantId: string) => void;
  onManualVariantCountChange?: (count: number) => void;
  loading?: boolean;
  userId?: string;
  showManualVariants?: boolean; // New prop to control manual variant display
}

export const CollectionButtons: React.FC<CollectionButtonProps> = memo(({
  cards,
  collectionData,
  onToggleCollection,
  onAddVariant,
  onRemoveVariant,
  onAddManualVariant,
  onRemoveManualVariant,
  onManualVariantCountChange,
  loading = false,
  userId,
  showManualVariants = false, // Default to false - manual variants hidden by default
}) => {
  
  // State for manual variants
  const [manualVariants, setManualVariants] = useState<ManualVariant[]>([]);
  const [manualVariantCollection, setManualVariantCollection] = useState<{ [variantId: string]: number }>({});
  const [loadingManualVariants, setLoadingManualVariants] = useState(false);

  // Fetch manual variants for this cards - only if showManualVariants is true
  useEffect(() => {
    if (!showManualVariants) {
      // Still notify parent about manual variant count for the +X indicator
      const fetchManualVariantCount = async () => {
        try {
          const variants = await manualVariantsService.getManualVariantsForCard(cards.set_id);
          onManualVariantCountChange?.(variants.length);
        } catch (error) {
          console.error('Error fetching manual variant count:', error);
        }
      };
      fetchManualVariantCount();
      return;
    }

    const fetchManualVariants = async () => {
      setLoadingManualVariants(true);
      try {
        const variants = await manualVariantsService.getManualVariantsForCard(cards.set_id);
        setManualVariants(variants);

        // Notify parent about manual variant count
        onManualVariantCountChange?.(variants.length);

        // If user is provided, fetch their collection data for manual variants
        if (userId) {
          const collection = await manualVariantsService.getUserManualVariantCollection(userId, cards.set_id);
          setManualVariantCollection(collection);
        }
      } catch (error) {
        console.error('Error fetching manual variants:', error);
      } finally {
        setLoadingManualVariants(false);
      }
    };

    fetchManualVariants();
  }, [cards.set_id, userId, onManualVariantCountChange, showManualVariants]);

  const inCollection = collectionData && collectionData.totalQuantity > 0;
  const hasManualVariants = manualVariants.length > 0;
  const manualVariantCount = manualVariants.length;

  // Pre-define icon components to avoid temporal dead zone issues
  const PlusIcon = Plus;
  const CheckIcon = Check;

  const handleVariantClick = (e: React.MouseEvent, variant: CardVariant) => {
    e.stopPropagation();
    if (loading) {
      return;
    }
    onAddVariant(cards.set_id, variant);
  };

  const handleVariantRightClick = (e: React.MouseEvent, variant: CardVariant) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) {
      return;
    }
    
    const currentQuantity = getVariantQuantity(variant);
    if (currentQuantity > 0) {
      onRemoveVariant(cards.set_id, variant);
    }
  };

  const handleManualVariantClick = async (e: React.MouseEvent, variantId: string) => {
    e.stopPropagation();
    if (loading || loadingManualVariants || !userId) {
      return;
    }

    try {
      const result = await manualVariantsService.addManualVariantToCollection(userId, cards.set_id, variantId);
      if (result.success) {
        // Update local state
        setManualVariantCollection(prev => ({
          ...prev,
          [variantId]: (prev[variantId] || 0) + 1
        }));
        
        // Call parent callback if provided
        onAddManualVariant?.(cards.set_id, variantId);
      }
    } catch (error) {
      console.error('Error adding manual variant:', error);
    }
  };

  const handleManualVariantRightClick = async (e: React.MouseEvent, variantId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading || loadingManualVariants || !userId) {
      return;
    }

    const currentQuantity = manualVariantCollection[variantId] || 0;
    if (currentQuantity === 0) return;

    try {
      const result = await manualVariantsService.removeManualVariantFromCollection(userId, cards.set_id, variantId);
      if (result.success) {
        // Update local state
        setManualVariantCollection(prev => ({
          ...prev,
          [variantId]: Math.max(0, (prev[variantId] || 0) - 1)
        }));
        
        // Call parent callback if provided
        onRemoveManualVariant?.(cards.set_id, variantId);
      }
    } catch (error) {
      console.error('Error removing manual variant:', error);
    }
  };

  // Remove the toggle click handler - yellow button is now just a visual indicator

  const getVariantQuantity = (variant: CardVariant): number => {
    if (!collectionData) {
      return 0;
    }
    
    const quantity = (() => {
      switch (variant) {
        case 'normal': return collectionData.normal || 0;
        case 'holo': return collectionData.holo || 0;
        case 'reverse_holo': return collectionData.reverseHolo || 0;
        case 'pokeball_pattern': return collectionData.pokeballPattern || 0;
        case 'masterball_pattern': return collectionData.masterballPattern || 0;
        case '1st_edition': return collectionData.firstEdition || 0;
        default: return 0;
      }
    })()

    return quantity;
  };

  const getVariantTitle = (variant: CardVariant): string => {
    switch (variant) {
      case 'normal': return 'Normal (Non-Holo)';
      case 'holo': return 'Holo';
      case 'reverse_holo': return 'Reverse Holo';
      case 'pokeball_pattern': return 'Pokeball Pattern';
      case 'masterball_pattern': return 'Masterball Pattern';
      case '1st_edition': return '1st Edition';
      default: return variant;
    }
  };

  const getVariantClass = (variant: CardVariant): string => {
    switch (variant) {
      case 'normal': return 'normal-btn';
      case 'holo': return 'holo-btn';
      case 'reverse_holo': return 'reverse-holo-btn';
      case 'pokeball_pattern': return 'pokeball-btn';
      case 'masterball_pattern': return 'masterball-btn';
      case '1st_edition': return 'first-edition-btn';
      default: return 'normal-btn';
    }
  };

  // Use variant analysis if available, otherwise fall back to legacy logic
  const availableVariants: CardVariant[] = (cards as any).variantAnalysis
    ? mapToCardVariants((cards as any).variantAnalysis)
    : getAvailableVariants(cards);
  

  return (
    <div className="collection-buttons-row">
      {/* Main collection status indicator (non-clickable) */}
      <div
        className={`collection-btn ${inCollection ? 'active' : ''} ${loading ? 'loading' : ''}`}
        title={inCollection ? 'Card is in collection' : 'Card not in collection'}
      >
        {inCollection ? (
          <CheckIcon className="w-3 h-3" />
        ) : (
          <PlusIcon className="w-3 h-3" />
        )}
      </div>

      {/* Variant buttons */}
      <div className="variant-buttons">
        {availableVariants.map((variant) => {
          const quantity = getVariantQuantity(variant);
          const isActive = quantity > 0;
          
          return (
            <button
              key={variant}
              className={`variant-btn ${getVariantClass(variant)} ${isActive ? 'active' : ''} ${loading ? 'loading' : ''}`}
              onClick={(e) => handleVariantClick(e, variant)}
              onContextMenu={(e) => handleVariantRightClick(e, variant)}
              disabled={loading}
              title={`${getVariantTitle(variant)} (${quantity})`}
            >
              {quantity > 0 ? quantity : null}
            </button>
          );
        })}

        {/* Manual Variant buttons - only show if showManualVariants is true */}
        {showManualVariants && manualVariants.map((variant) => {
          const quantity = manualVariantCollection[variant.set_id] || 0;
          const isActive = quantity > 0;
          
          return (
            <button
              key={`manual-${variant.set_id}`}
              className={`variant-btn manual-variant-btn ${isActive ? 'active' : ''} ${loading || loadingManualVariants ? 'loading' : ''}`}
              onClick={(e) => handleManualVariantClick(e, variant.set_id)}
              onContextMenu={(e) => handleManualVariantRightClick(e, variant.set_id)}
              disabled={loading || loadingManualVariants || !userId}
              title={`${variant.display_name || 'Unknown Variant'} (${quantity})`}
            >
              {quantity > 0 ? quantity : null}
            </button>
          );
        })}
      </div>
    </div>
  );
});

CollectionButtons.displayName = 'CollectionButtons';

// Legacy helper function for backward compatibility
// This will be used when variantAnalysis is not available
export const getAvailableVariants = (cards: any): CardVariant[] => {
  const variants: CardVariant[] = [];
  
  // Get cards information
  const rarity = cards.rarity || '';
  const setName = cards.sets?.set_name?.toLowerCase() || cards.sets?.set_name?.toLowerCase() || '';
  const setId = cards.sets?.set_id?.toLowerCase() || cards.set_id?.toLowerCase() || '';
  const cardNumber = cards.number ? parseInt(cards.number.split('/')[0]) : 0;
  
  
  // Determine cards type
  const isTrainer = cards.type?.length === 0;
  const isEnergy = cards.type?.includes('Energy');
  const isPokemon = !isTrainer && !isEnergy;
  
  // Categorize rarity
  const isCommon = rarity === 'Common';
  const isUncommon = rarity === 'Uncommon';
  const isRare = rarity === 'Rare';
  const isHoloRare = rarity === 'Rare Holo' || rarity === 'Holo Rare';
  
  // Ultra Rare and special categories
  const isUltraRare = rarity.includes('V') || rarity.includes('EX') || rarity.includes('GX') ||
                     rarity.includes('VMAX') || rarity.includes('VSTAR') || rarity.includes('ex') ||
                     rarity === 'Rare Ultra' || rarity === 'Ultra Rare' || rarity === 'Double Rare' ||
                     (cards.set_name && cards.set_name.includes(' ex'));
  const isSpecialIllustration = rarity.includes('Special Illustration') || rarity.includes('Illustration Rare');
  const isSecretRare = rarity.includes('Secret') || rarity.includes('Gold') || rarity.includes('Rainbow');
  const isAceSpec = rarity.includes('ACE SPEC');
  const isFullArt = rarity.includes('Full Art');
  const isSpecialEnergy = isEnergy && (isFullArt || rarity.includes('Special'));

  
  // Identify specific sets that have special pattern variants
  const isPrismaticEvolutions = setName.includes('prismatic evolutions') || setId === 'sv8pt5';
  const isBlackBolt = setName.includes('black bolt') || setId === 'zsv10pt5';
  const isWhiteFlare = setName.includes('white flare') || setId === 'rsv10pt5';
  const isCelebrations = setName.includes('celebrations') || setId === 'cel25';
  const isSpecialSet = isPrismaticEvolutions || isBlackBolt || isWhiteFlare || isCelebrations;
  
  // 1st Edition sets - WotC era and E-Card era (using actual database IDs)
  const wotcSets = [
    'base1', 'base2', 'base3', 'base4', 'base5', // Base set_series
    'gym1', 'gym2', // Gym set_series
    'neo1', 'neo2', 'neo3', 'neo4' // Neo set_series
  ];
  const eCardSets = [
    'ecard1', 'ecard2', 'ecard3' // E-Card set_series
  ];
  
  // Check if this is a 1st Edition eligible sets
  const is1stEditionSet = wotcSets.includes(setId.toLowerCase()) ||
                          eCardSets.includes(setId.toLowerCase()) ||
                          // Also check by set_name for safety
                          setName.toLowerCase().includes('base') ||
                          setName.toLowerCase().includes('jungle') ||
                          setName.toLowerCase().includes('fossil') ||
                          setName.toLowerCase().includes('team rocket') ||
                          setName.toLowerCase().includes('gym heroes') ||
                          setName.toLowerCase().includes('gym challenge') ||
                          setName.toLowerCase().includes('neo genesis') ||
                          setName.toLowerCase().includes('neo discovery') ||
                          setName.toLowerCase().includes('neo revelation') ||
                          setName.toLowerCase().includes('neo destiny') ||
                          setName.toLowerCase().includes('expedition') ||
                          setName.toLowerCase().includes('aquapolis') ||
                          setName.toLowerCase().includes('skyridge');
  
  
  // Check if this is a 1st Edition sets first
  if (is1stEditionSet) {
    // 1ST EDITION SETS - All cards get 1st Edition variant
    if (isCommon) {
      // Common: Normal, Reverse Holo, 1st Edition
      variants.push('normal', 'reverse_holo', '1st_edition');
    } else if (isUncommon) {
      // Uncommon: Normal, Reverse Holo, 1st Edition
      variants.push('normal', 'reverse_holo', '1st_edition');
    } else if (isRare) {
      // Rare: Reverse Holo, Holo, 1st Edition
      variants.push('reverse_holo', 'holo', '1st_edition');
    } else if (isHoloRare) {
      // Holo Rare: Reverse Holo, Holo, 1st Edition
      variants.push('reverse_holo', 'holo', '1st_edition');
    } else if (isUltraRare || isSpecialIllustration || isSecretRare || isAceSpec) {
      // Ultra Rare: Holo, 1st Edition
      variants.push('holo', '1st_edition');
    } else if (isTrainer) {
      if (isCommon || isUncommon) {
        // Trainer (Common/Uncommon): Normal, Reverse Holo, 1st Edition
        variants.push('normal', 'reverse_holo', '1st_edition');
      } else if (isRare || isHoloRare) {
        // Trainer (Rare/Holo Rare): Reverse Holo, Holo, 1st Edition
        variants.push('reverse_holo', 'holo', '1st_edition');
      }
    } else if (isEnergy) {
      if (isSpecialEnergy || isFullArt) {
        // Special/Full Art Energy: Holo, 1st Edition
        variants.push('holo', '1st_edition');
      } else {
        // Basic Energy: Normal, Reverse Holo, 1st Edition
        variants.push('normal', 'reverse_holo', '1st_edition');
      }
    }
  }
  // Check if this is NOT a special sets (regular English sets)
  else if (!isSpecialSet) {
    // ALL REGULAR ENGLISH SETS - NO SPECIAL PATTERNS
    if (isCommon) {
      // Common: Normal, Reverse Holo only
      variants.push('normal', 'reverse_holo');
    } else if (isUncommon) {
      // Uncommon: Normal, Reverse Holo only
      variants.push('normal', 'reverse_holo');
    } else if (isRare) {
      // Rare: Normal, Reverse Holo only (modern sets don't have holo variants for basic rares)
      variants.push('normal', 'reverse_holo');
    } else if (isHoloRare) {
      // Holo Rare: Reverse Holo, Holo only
      variants.push('reverse_holo', 'holo');
    } else if (isUltraRare || isSpecialIllustration || isSecretRare || isAceSpec) {
      // Ultra Rare: Always Holo only
      variants.push('holo');
    } else if (isTrainer) {
      if (isCommon || isUncommon) {
        // Trainer (Common/Uncommon): Normal, Reverse Holo only
        variants.push('normal', 'reverse_holo');
      } else if (isRare || isHoloRare) {
        // Trainer (Rare/Holo Rare): Reverse Holo, Holo only
        variants.push('reverse_holo', 'holo');
      }
    } else if (isEnergy) {
      if (isSpecialEnergy || isFullArt) {
        // Special/Full Art Energy: Always Holo
        variants.push('holo');
      } else {
        // Basic Energy: Normal, Reverse Holo only
        variants.push('normal', 'reverse_holo');
      }
    }
  }
  // PRISMATIC EVOLUTIONS RULES
  else if (isPrismaticEvolutions) {
    // Cards over 131 are secret rares - always holo only
    if (cardNumber > 131) {
      variants.push('holo');
    } else if (isPokemon) {
      // Pokémon (except ex and ACE SPEC): Normal, Reverse Holo, Poké Ball, Master Ball
      if (!rarity.includes('ex') && !isAceSpec) {
        variants.push('normal', 'reverse_holo', 'pokeball_pattern', 'masterball_pattern');
      } else {
        // ex and ACE SPEC cards: Normal, Reverse Holo, Poké Ball - NO Master Ball
        variants.push('normal', 'reverse_holo', 'pokeball_pattern');
      }
    } else if (isTrainer || isEnergy) {
      // Trainer and Basic Energy: Normal, Reverse Holo, Poké Ball - NO Master Ball
      variants.push('normal', 'reverse_holo', 'pokeball_pattern');
    }
  }
  // BLACK BOLT & WHITE FLARE RULES
  else if (isBlackBolt || isWhiteFlare) {
    // Cards over 86 are secret rares - always holo only
    if (cardNumber > 86) {
      variants.push('holo');
    } else if (isPokemon && (isCommon || isUncommon || isRare || isHoloRare)) {
      // Pokémon (Rare and lower): Normal, Reverse Holo, Poké Ball, Master Ball
      variants.push('normal', 'reverse_holo', 'pokeball_pattern', 'masterball_pattern');
    } else if (isTrainer) {
      // Trainer: Normal, Reverse Holo, Poké Ball - NO Master Ball
      variants.push('normal', 'reverse_holo', 'pokeball_pattern');
    } else if (isEnergy && !isSpecialEnergy) {
      // Basic Energy: Normal, Reverse Holo - NO patterns
      variants.push('normal', 'reverse_holo');
    } else if (isUltraRare || isSpecialIllustration || isSecretRare || isSpecialEnergy) {
      // Ultra rare cards: always holo only
      variants.push('holo');
    }
  }
  // CELEBRATIONS RULES
  else if (isCelebrations) {
    // Celebrations is a special reprint sets - cards were NOT printed with reverse holo variants
    // All cards in Celebrations should only have their original variant (typically holo for most reprints)
    if (isUltraRare || isSpecialIllustration || isSecretRare || isAceSpec ||
        rarity.includes('ex') || rarity.includes('EX') ||
        isHoloRare || (isPokemon && isRare)) {
      // Most Celebrations cards are special reprints that only come in holo
      variants.push('holo');
    } else if (isTrainer && (isCommon || isUncommon)) {
      // Basic trainers might have normal variant
      variants.push('normal');
    } else if (isEnergy && !isSpecialEnergy) {
      // Basic energy cards
      variants.push('normal');
    } else {
      // Default for any other Celebrations cards
      variants.push('holo');
    }
  }
  
  // Fallback: if no variants determined, provide default
  if (variants.length === 0) {
    if (isUltraRare || isSpecialIllustration || isSecretRare || isAceSpec || isSpecialEnergy) {
      variants.push('holo');
    } else {
      variants.push('normal');
    }
  }
  
  return variants;
};
