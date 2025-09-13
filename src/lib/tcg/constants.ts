import type { TCGType } from '@/types';

export const TCG_TYPES: Record<TCGType, {
  id: TCGType;
  name: string;
  displayName: string;
  description: string;
  color: string;
  icon: string;
  enabled: boolean;
}> = {
  pokemon: {
    id: 'pokemon',
    name: 'pokemon',
    displayName: 'Pokémon TCG',
    description: 'The original trading card game featuring pocket monsters',
    color: 'text-yellow-500',
    icon: '⚡',
    enabled: true,
  },
  lorcana: {
    id: 'lorcana',
    name: 'lorcana',
    displayName: 'Disney Lorcana',
    description: 'Disney characters in a magical trading card game',
    color: 'text-purple-500',
    icon: '✨',
    enabled: false, // Will be enabled when we add Lorcana support
  },
  magic: {
    id: 'magic',
    name: 'magic',
    displayName: 'Magic: The Gathering',
    description: 'The grandfather of trading card games',
    color: 'text-blue-500',
    icon: '🔮',
    enabled: false,
  },
  yugioh: {
    id: 'yugioh',
    name: 'yugioh',
    displayName: 'Yu-Gi-Oh!',
    description: 'Duel monsters trading card game',
    color: 'text-red-500',
    icon: '🐉',
    enabled: false,
  },
  digimon: {
    id: 'digimon',
    name: 'digimon',
    displayName: 'Digimon Card Game',
    description: 'Digital monsters trading card game',
    color: 'text-green-500',
    icon: '🦾',
    enabled: false,
  },
  onepiece: {
    id: 'onepiece',
    name: 'onepiece',
    displayName: 'One Piece Card Game',
    description: 'Pirate adventure trading card game',
    color: 'text-orange-500',
    icon: '🏴‍☠️',
    enabled: false,
  },
};

export const ENABLED_TCG_TYPES = Object.values(TCG_TYPES).filter(tcg => tcg.enabled);

export const DEFAULT_TCG_TYPE: TCGType = 'pokemon';

export function getTCGInfo(tcgType: TCGType) {
  return TCG_TYPES[tcgType];
}

export function getTCGDisplayName(tcgType: TCGType): string {
  return TCG_TYPES[tcgType]?.displayName || tcgType;
}

export function getTCGRoute(tcgType: TCGType): string {
  return `/${tcgType}/sets`;
}

export function isValidTCGType(value: string): value is TCGType {
  return value in TCG_TYPES;
}