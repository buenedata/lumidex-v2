import type { SortField, SortDirection } from '@/components/sets/SetSorting';
import type { CardWithPrices } from '@/types/pricing';

interface BaseCard {
  id: string;
  name: string;
  number: string;
  rarity?: string | null;
  types?: string[] | null;
  hp?: string | null;
  supertype?: string | null;
  set_id?: string | null;
  images?: {
    small?: string;
    large?: string;
  } | null;
}

// Union type to handle both SetCard and CardWithPrices
type SortableCard = BaseCard & {
  price_data?: any; // Using any for flexibility with different price data structures
};

/**
 * Extract numeric value from card number for proper sorting
 * Handles cases like "001", "132a", "SWSH100", etc.
 */
function extractCardNumber(cardNumber: string): number {
  // Remove common prefixes and extract the numeric part
  const cleaned = cardNumber.replace(/^(SWSH|SM|XY|BW|DP|EX|e-Card|Base|Neo|Gym|Team Rocket|Legendary|Southern Islands)/i, '');
  
  // Extract the first sequence of digits
  const match = cleaned.match(/(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  // If no number found, return a high number to sort at the end
  return 9999;
}

/**
 * Extract price value from card price data
 * Prioritizes different price sources and types
 */
function extractCardPrice(card: SortableCard): number {
  if (!card.price_data) return 0;

  // Try to get price from the standard price data structure
  if (card.price_data.preferred_source_prices) {
    const preferred = card.price_data.preferred_source_prices;
    return preferred.trendPrice ?? preferred.averageSellPrice ?? preferred.lowPrice ?? preferred.market ?? 0;
  }

  // Fallback to direct cardmarket/tcgplayer access
  if (card.price_data.cardmarket?.prices) {
    const cmPrices = card.price_data.cardmarket.prices;
    return cmPrices.trendPrice ?? cmPrices.averageSellPrice ?? cmPrices.lowPrice ?? 0;
  }

  if (card.price_data.tcgplayer?.prices) {
    const tcgPrices = card.price_data.tcgplayer.prices;
    return tcgPrices.holofoil?.market ??
           tcgPrices.reverseHolofoil?.market ??
           tcgPrices.normal?.market ?? 0;
  }

  // Try cheapest variant price as last resort
  if (card.price_data.cheapest_variant_price) {
    return card.price_data.cheapest_variant_price;
  }

  return 0;
}

/**
 * Sort cards based on the provided field and direction
 */
export function sortCards<T extends SortableCard>(
  cards: T[],
  field: SortField | null,
  direction: SortDirection
): T[] {
  if (!field) {
    return cards; // Return original order if no sorting
  }

  const sortedCards = [...cards].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case 'number':
        const numA = extractCardNumber(a.number);
        const numB = extractCardNumber(b.number);
        comparison = numA - numB;
        break;

      case 'price':
        const priceA = extractCardPrice(a);
        const priceB = extractCardPrice(b);
        comparison = priceA - priceB;
        break;

      case 'name':
        comparison = a.name.localeCompare(b.name, undefined, { 
          numeric: true, 
          sensitivity: 'base' 
        });
        break;

      default:
        return 0;
    }

    // Apply direction
    return direction === 'desc' ? -comparison : comparison;
  });

  return sortedCards;
}

/**
 * Helper function to get a human-readable description of the current sort
 */
export function getSortDescription(field: SortField | null, direction: SortDirection): string {
  if (!field) return 'Default order';
  
  const fieldNames = {
    number: 'Number',
    price: 'Price',
    name: 'Name'
  };
  
  const directionNames = {
    asc: 'ascending',
    desc: 'descending'
  };
  
  return `${fieldNames[field]} (${directionNames[direction]})`;
}