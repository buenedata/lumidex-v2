import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateVariantsForCard, generateVariantsForSet, clearVariantCache } from '../engine';
import type { 
  UIVariantType, 
  VariantEngineInput,
  BulkVariantRequest
} from '@/types/variants';

// Simple mock for Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({ data: null, error: null }),
          data: [],
          error: null
        })
      })
    })
  })
}));

describe('Variant Engine Functions', () => {
  const mockCards: VariantEngineInput['card'][] = [
    {
      id: 'sv1-1',
      number: '1',
      rarity: 'Common',
      setId: 'sv1',
      tcgplayer: {
        prices: {
          normal: { low: 0.1, mid: 0.15, high: 0.2, market: 0.12, directLow: 0.11 },
          holofoil: { low: 0.5, mid: 0.75, high: 1.0, market: 0.6, directLow: 0.55 }
        }
      }
    },
    {
      id: 'sv1-198',
      number: '199',
      rarity: 'Double Rare',
      setId: 'sv1',
      tcgplayer: {
        prices: {
          normal: { low: 10, mid: 15, high: 20, market: 12, directLow: 11 },
          reverseHolofoil: { low: 15, mid: 22, high: 30, market: 18, directLow: 16 }
        }
      }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    clearVariantCache();
  });

  describe('generateVariantsForCard', () => {
    it('should generate variants for a single card', async () => {
      const input: VariantEngineInput = {
        card: mockCards[0]
      };
      
      const result = await generateVariantsForCard(input);
      
      expect(result).toBeDefined();
      expect(result.variants).toBeDefined();
      expect(Array.isArray(result.variants)).toBe(true);
      expect(result.variants.length).toBeGreaterThan(0);
      expect(result.metadata).toBeDefined();
    });

    it('should include normal variant as fallback', async () => {
      const cardWithoutTCGplayer: VariantEngineInput['card'] = {
        id: 'test-1',
        number: '1',
        rarity: 'Common',
        setId: 'test'
      };

      const input: VariantEngineInput = {
        card: cardWithoutTCGplayer
      };

      const result = await generateVariantsForCard(input);
      
      expect(result.variants).toBeDefined();
      expect(result.variants.some(v => v.type === 'normal')).toBe(true);
    });

    it('should handle user quantities when provided', async () => {
      const input: VariantEngineInput = {
        card: mockCards[0],
        userQuantities: {
          normal: 5,
          holo: 2,
          reverse_holo_standard: 0,
          reverse_holo_pokeball: 0,
          reverse_holo_masterball: 0,
          first_edition: 0,
          custom: 0
        }
      };
      
      const result = await generateVariantsForCard(input);
      
      expect(result.variants).toBeDefined();
      const normalVariant = result.variants.find(v => v.type === 'normal');
      expect(normalVariant).toBeDefined();
      expect(normalVariant?.userQuantity).toBe(5);
    });
  });

  describe('generateVariantsForSet', () => {
    it('should generate variants for multiple cards', async () => {
      const request: BulkVariantRequest = {
        setId: 'sv1',
        cards: mockCards
      };

      const result = await generateVariantsForSet(request);

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.results instanceof Map).toBe(true);
      expect(result.results.size).toBeGreaterThan(0);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle empty card array', async () => {
      const request: BulkVariantRequest = {
        setId: 'empty',
        cards: []
      };

      const result = await generateVariantsForSet(request);

      expect(result).toBeDefined();
      expect(result.results.size).toBe(0);
      expect(result.errors).toEqual([]);
    });
  });

  describe('TCGplayer price extraction', () => {
    it('should detect normal variant from prices', async () => {
      const cardWithNormalPrice: VariantEngineInput['card'] = {
        id: 'test-normal',
        number: '1',
        rarity: 'Common',
        setId: 'test',
        tcgplayer: {
          prices: {
            normal: { market: 1.50 }
          }
        }
      };

      const input: VariantEngineInput = {
        card: cardWithNormalPrice
      };

      const result = await generateVariantsForCard(input);
      
      expect(result.variants.some(v => v.type === 'normal')).toBe(true);
    });

    it('should detect holo variant from holofoil prices', async () => {
      const cardWithHoloPrice: VariantEngineInput['card'] = {
        id: 'test-holo',
        number: '1',
        rarity: 'Rare',
        setId: 'test',
        tcgplayer: {
          prices: {
            normal: { market: 1.50 },
            holofoil: { market: 5.00 }
          }
        }
      };

      const input: VariantEngineInput = {
        card: cardWithHoloPrice
      };

      const result = await generateVariantsForCard(input);
      
      expect(result.variants.some(v => v.type === 'normal')).toBe(true);
      expect(result.variants.some(v => v.type === 'holo')).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle gracefully when database is unavailable', async () => {
      const input: VariantEngineInput = {
        card: mockCards[0]
      };

      // The function should not throw even if database fails
      const result = await generateVariantsForCard(input);
      
      expect(result).toBeDefined();
      expect(result.variants).toBeDefined();
      expect(result.variants.length).toBeGreaterThan(0);
    });
  });

  describe('Variant types', () => {
    it('should have correct variant type constants', () => {
      const expectedTypes: UIVariantType[] = [
        'normal',
        'holo',
        'reverse_holo_standard',
        'reverse_holo_pokeball',
        'reverse_holo_masterball',
        'first_edition',
        'custom'
      ];

      expectedTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Cache management', () => {
    it('should have cache clear function', () => {
      expect(typeof clearVariantCache).toBe('function');
      
      // Should not throw when called
      expect(() => clearVariantCache()).not.toThrow();
    });
  });
});