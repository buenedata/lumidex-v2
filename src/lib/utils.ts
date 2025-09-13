import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes safely
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency values
 */
export function formatCurrency(value: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
}

/**
 * Format card number with leading zeros
 */
export function formatCardNumber(number: string, totalInSet?: number): string {
  if (!totalInSet) return number;
  
  const totalDigits = totalInSet.toString().length;
  return number.padStart(totalDigits, '0');
}

/**
 * Get rarity color based on rarity type
 */
export function getRarityColor(rarity: string): string {
  const rarityColors: Record<string, string> = {
    'common': 'text-muted',
    'uncommon': 'text-success',
    'rare': 'text-brand',
    'rare holo': 'text-brand2',
    'rare ultra': 'text-accent',
    'legendary': 'text-warning',
    'promo': 'text-accent',
  };
  
  return rarityColors[rarity.toLowerCase()] || 'text-muted';
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

/**
 * Generate initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format date for display
 * Uses consistent formatting to avoid hydration mismatches
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Ensure we use UTC to avoid timezone differences between server/client
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(dateObj);
}

/**
 * Client-safe date formatting for components that might hydrate
 */
export function formatDateSafe(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Manual formatting to ensure consistency across server/client
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return `${months[dateObj.getUTCMonth()]} ${dateObj.getUTCDate()}, ${dateObj.getUTCFullYear()}`;
}

/**
 * Sleep utility for testing/development
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}