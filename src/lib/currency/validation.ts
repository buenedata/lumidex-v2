/**
 * Currency and User Preference Validation
 * 
 * Provides validation functions for currency codes, price sources,
 * and user preferences to ensure data integrity.
 */

import type { CurrencyCode, PriceSource, UserPreferences } from '@/types';

// Supported currencies in the system
export const SUPPORTED_CURRENCIES: CurrencyCode[] = ['EUR', 'USD', 'GBP', 'NOK'];

// Supported price sources
export const SUPPORTED_PRICE_SOURCES: PriceSource[] = ['cardmarket', 'tcgplayer'];

// Default values for fallback
export const DEFAULT_CURRENCY: CurrencyCode = 'EUR';
export const DEFAULT_PRICE_SOURCE: PriceSource = 'cardmarket';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SanitizedPreferences {
  preferred_currency: CurrencyCode;
  preferred_price_source: PriceSource;
  hadErrors: boolean;
  appliedDefaults: string[];
}

/**
 * Validate if a currency code is supported
 */
export function isValidCurrency(currency: string): currency is CurrencyCode {
  return SUPPORTED_CURRENCIES.includes(currency as CurrencyCode);
}

/**
 * Validate if a price source is supported
 */
export function isValidPriceSource(source: string): source is PriceSource {
  return SUPPORTED_PRICE_SOURCES.includes(source as PriceSource);
}

/**
 * Validate currency code with detailed feedback
 */
export function validateCurrency(currency: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof currency !== 'string') {
    errors.push('Currency must be a string');
    return { isValid: false, errors, warnings };
  }

  if (!currency || currency.trim().length === 0) {
    errors.push('Currency cannot be empty');
    return { isValid: false, errors, warnings };
  }

  const upperCurrency = currency.toUpperCase();
  
  if (!isValidCurrency(upperCurrency)) {
    errors.push(`Currency '${currency}' is not supported. Supported currencies: ${SUPPORTED_CURRENCIES.join(', ')}`);
    return { isValid: false, errors, warnings };
  }

  if (currency !== upperCurrency) {
    warnings.push(`Currency was converted to uppercase: ${currency} → ${upperCurrency}`);
  }

  return { isValid: true, errors, warnings };
}

/**
 * Validate price source with detailed feedback
 */
export function validatePriceSource(source: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof source !== 'string') {
    errors.push('Price source must be a string');
    return { isValid: false, errors, warnings };
  }

  if (!source || source.trim().length === 0) {
    errors.push('Price source cannot be empty');
    return { isValid: false, errors, warnings };
  }

  const lowerSource = source.toLowerCase();
  
  if (!isValidPriceSource(lowerSource)) {
    errors.push(`Price source '${source}' is not supported. Supported sources: ${SUPPORTED_PRICE_SOURCES.join(', ')}`);
    return { isValid: false, errors, warnings };
  }

  if (source !== lowerSource) {
    warnings.push(`Price source was converted to lowercase: ${source} → ${lowerSource}`);
  }

  return { isValid: true, errors, warnings };
}

/**
 * Validate complete user preferences object
 */
export function validateUserPreferences(preferences: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!preferences || typeof preferences !== 'object') {
    errors.push('Preferences must be an object');
    return { isValid: false, errors, warnings };
  }

  const prefs = preferences as Record<string, unknown>;

  // Validate currency
  if ('preferred_currency' in prefs) {
    const currencyResult = validateCurrency(prefs.preferred_currency);
    errors.push(...currencyResult.errors);
    warnings.push(...currencyResult.warnings);
  } else {
    warnings.push('Missing preferred_currency, will use default');
  }

  // Validate price source
  if ('preferred_price_source' in prefs) {
    const sourceResult = validatePriceSource(prefs.preferred_price_source);
    errors.push(...sourceResult.errors);
    warnings.push(...sourceResult.warnings);
  } else {
    warnings.push('Missing preferred_price_source, will use default');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Sanitize user preferences with fallbacks
 * Always returns valid preferences, applying defaults where needed
 */
export function sanitizeUserPreferences(
  preferences: unknown,
  options: {
    strictMode?: boolean;
    logWarnings?: boolean;
  } = {}
): SanitizedPreferences {
  const { strictMode = false, logWarnings = true } = options;
  const appliedDefaults: string[] = [];
  let hadErrors = false;

  // Initialize with defaults
  let currency: CurrencyCode = DEFAULT_CURRENCY;
  let priceSource: PriceSource = DEFAULT_PRICE_SOURCE;

  // Validate input
  const validationResult = validateUserPreferences(preferences);
  
  if (validationResult.errors.length > 0) {
    hadErrors = true;
    
    if (logWarnings) {
      console.warn('User preferences validation errors:', validationResult.errors);
    }
    
    if (strictMode) {
      throw new Error(`Invalid user preferences: ${validationResult.errors.join(', ')}`);
    }
  }

  if (logWarnings && validationResult.warnings.length > 0) {
    console.warn('User preferences validation warnings:', validationResult.warnings);
  }

  // Extract valid values or apply defaults
  if (preferences && typeof preferences === 'object') {
    const prefs = preferences as Record<string, unknown>;

    // Handle currency
    if ('preferred_currency' in prefs) {
      const currencyResult = validateCurrency(prefs.preferred_currency);
      if (currencyResult.isValid) {
        currency = (prefs.preferred_currency as string).toUpperCase() as CurrencyCode;
      } else {
        appliedDefaults.push(`currency (${DEFAULT_CURRENCY})`);
      }
    } else {
      appliedDefaults.push(`currency (${DEFAULT_CURRENCY})`);
    }

    // Handle price source
    if ('preferred_price_source' in prefs) {
      const sourceResult = validatePriceSource(prefs.preferred_price_source);
      if (sourceResult.isValid) {
        priceSource = (prefs.preferred_price_source as string).toLowerCase() as PriceSource;
      } else {
        appliedDefaults.push(`price source (${DEFAULT_PRICE_SOURCE})`);
      }
    } else {
      appliedDefaults.push(`price source (${DEFAULT_PRICE_SOURCE})`);
    }
  } else {
    appliedDefaults.push(`currency (${DEFAULT_CURRENCY})`, `price source (${DEFAULT_PRICE_SOURCE})`);
  }

  if (logWarnings && appliedDefaults.length > 0) {
    console.info('Applied default preferences for:', appliedDefaults.join(', '));
  }

  return {
    preferred_currency: currency,
    preferred_price_source: priceSource,
    hadErrors,
    appliedDefaults
  };
}

/**
 * Validate currency conversion parameters
 */
export function validateConversionParams(
  amount: unknown,
  fromCurrency: unknown,
  toCurrency: unknown
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate amount
  if (typeof amount !== 'number') {
    errors.push('Amount must be a number');
  } else if (amount < 0) {
    errors.push('Amount cannot be negative');
  } else if (!isFinite(amount)) {
    errors.push('Amount must be a finite number');
  }

  // Validate currencies
  const fromResult = validateCurrency(fromCurrency);
  const toResult = validateCurrency(toCurrency);
  
  errors.push(...fromResult.errors, ...toResult.errors);
  warnings.push(...fromResult.warnings, ...toResult.warnings);

  // Check for same currency
  if (fromResult.isValid && toResult.isValid && fromCurrency === toCurrency) {
    warnings.push('Converting between the same currencies (no conversion needed)');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Get safe currency with fallback
 */
export function getSafeCurrency(currency: unknown): CurrencyCode {
  const result = validateCurrency(currency);
  if (result.isValid) {
    return (currency as string).toUpperCase() as CurrencyCode;
  }
  return DEFAULT_CURRENCY;
}

/**
 * Get safe price source with fallback
 */
export function getSafePriceSource(source: unknown): PriceSource {
  const result = validatePriceSource(source);
  if (result.isValid) {
    return (source as string).toLowerCase() as PriceSource;
  }
  return DEFAULT_PRICE_SOURCE;
}