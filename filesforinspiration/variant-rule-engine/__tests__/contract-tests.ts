import { inferVariants } from '../inferVariants';
import { CardInput } from '../type';

describe('Variant Rule Engine Contract Tests', () => {
  test('Contract Test 1: Vivid Voltage Clefable - SWSH Rare with API signals', () => {
    const clefableCard: CardInput = {
      set_id: 'swsh4-120',
      set_name: 'Clefable',
      number: '120',
      rarity: 'Rare',
      sets: {
        set_id: 'swsh4',
        set_series: 'Sword & Shield',
        releaseDate: '2020/11/13'
      },
      tcgplayer: {
        cardmarket_prices: {
          normal: { cardmarket_prices_reverse_holo_low: 0.25, tcgplayer_prices_reverse_holofoil_mid: 0.50, tcgplayer_prices_reverse_holofoil_high: 1.00, tcgplayer_prices_reverse_holofoil_market: 0.45, directLow: null },
          reverseHolofoil: { cardmarket_prices_reverse_holo_low: 0.75, tcgplayer_prices_reverse_holofoil_mid: 1.25, tcgplayer_prices_reverse_holofoil_high: 2.00, tcgplayer_prices_reverse_holofoil_market: 1.10, directLow: null }
        }
      }
    };

    const result = inferVariants(clefableCard, ["Booster"]);

    // Validate core requirements
    expect(result.variants.normal.exists).toBe(true);
    expect(result.variants.reverse.exists).toBe(true);
    expect(result.variants.holo.exists).toBe(false);
    expect(result.variants.firstEdNormal.exists).toBe(false);
    expect(result.variants.firstEdHolo.exists).toBe(false);

    // Validate confidence levels
    expect(result.variants.normal.confidence).toBe('High');
    expect(result.variants.reverse.confidence).toBe('High');

    // Validate explanations include API signal detection
    expect(result.explanations).toContain('TCGPlayer pricing signals detected: normal, reverseHolofoil');
    expect(result.era).toBe('Sword & Shield');
  });

  test('Contract Test 2: Scarlet & Violet Base Rare - No API signals, era inference', () => {
    const svRareCard: CardInput = {
      set_id: 'sv1-100',
      set_name: 'Example Rare',
      number: '100',
      rarity: 'Rare',
      sets: {
        set_id: 'sv1',
        set_series: 'Scarlet & Violet',
        releaseDate: '2023/03/31'
      }
      // No tcgplayer pricing data
    };

    const result = inferVariants(svRareCard, ["Booster"]);

    // Validate S&V era rules: single-star rares are holo by default
    expect(result.variants.holo.exists).toBe(true);
    expect(result.variants.reverse.exists).toBe(true);
    expect(result.variants.normal.exists).toBe(false);
    expect(result.variants.firstEdNormal.exists).toBe(false);
    expect(result.variants.firstEdHolo.exists).toBe(false);

    // Validate confidence levels (Medium for era inference)
    expect(result.variants.holo.confidence).toBe('Medium');
    expect(result.variants.reverse.confidence).toBe('Medium');

    // Validate explanations include era-based inference
    expect(result.explanations).toContain('Scarlet & Violet era: single-star rares are holo by default');
    expect(result.era).toBe('Scarlet & Violet');
  });

  test('Contract Test 3: WotC Theme Deck Override - Product source affects variants', () => {
    const wotcCard: CardInput = {
      set_id: 'base1-15',
      set_name: 'Alakazam',
      number: '15',
      rarity: 'Rare',
      sets: {
        set_id: 'base1',
        set_series: 'Base',
        releaseDate: '1999/01/09'
      },
      tcgplayer: {
        cardmarket_prices: {
          tcgplayer_prices_reverse_holofoil: { cardmarket_prices_reverse_holo_low: 15.00, tcgplayer_prices_reverse_holofoil_mid: 25.00, tcgplayer_prices_reverse_holofoil_high: 40.00, tcgplayer_prices_reverse_holofoil_market: 22.50, directLow: null }
        }
      }
    };

    // Test with Theme Deck source
    const themeDeckResult = inferVariants(wotcCard, ["Theme Deck"]);
    
    // Theme Deck override should add normal variant
    expect(themeDeckResult.variants.normal.exists).toBe(true);
    expect(themeDeckResult.variants.holo.exists).toBe(true);
    expect(themeDeckResult.variants.reverse.exists).toBe(false); // WotC era has no reverse
    expect(themeDeckResult.variants.firstEdNormal.exists).toBe(false);
    expect(themeDeckResult.variants.firstEdHolo.exists).toBe(false);

    // Validate explanations include override rule
    expect(themeDeckResult.explanations).toContain('Theme Deck override: added non-holo variant');

    // Test with Booster source (no override)
    const boosterResult = inferVariants(wotcCard, ["Booster"]);
    
    // Should only have holo variant from API signal
    expect(boosterResult.variants.normal.exists).toBe(false);
    expect(boosterResult.variants.holo.exists).toBe(true);
    expect(boosterResult.variants.reverse.exists).toBe(false);
  });

  test('Additional Test: First Edition WotC cards with API signals', () => {
    const firstEdCard: CardInput = {
      set_id: 'base1-4',
      set_name: 'Charizard',
      number: '4',
      rarity: 'Rare Holo',
      sets: {
        set_id: 'base1',
        set_series: 'Base',
        releaseDate: '1999/01/09'
      },
      tcgplayer: {
        cardmarket_prices: {
          tcgplayer_prices_reverse_holofoil: { cardmarket_prices_reverse_holo_low: 100.00, tcgplayer_prices_reverse_holofoil_mid: 200.00, tcgplayer_prices_reverse_holofoil_high: 400.00, tcgplayer_prices_reverse_holofoil_market: 180.00, directLow: null },
          '1stEditionHolofoil': { cardmarket_prices_reverse_holo_low: 1000.00, tcgplayer_prices_reverse_holofoil_mid: 2000.00, tcgplayer_prices_reverse_holofoil_high: 5000.00, tcgplayer_prices_reverse_holofoil_market: 1800.00, directLow: null }
        }
      }
    };

    const result = inferVariants(firstEdCard, ["Booster"]);

    // Should detect both regular holo and first edition holo
    expect(result.variants.holo.exists).toBe(true);
    expect(result.variants.firstEdHolo.exists).toBe(true);
    expect(result.variants.normal.exists).toBe(false);
    expect(result.variants.reverse.exists).toBe(false);
    expect(result.variants.firstEdNormal.exists).toBe(false);

    // Both should have tcgplayer_prices_reverse_holofoil_high confidence from API signals
    expect(result.variants.holo.confidence).toBe('High');
    expect(result.variants.firstEdHolo.confidence).toBe('High');

    expect(result.explanations).toContain('TCGPlayer pricing signals detected: tcgplayer_prices_reverse_holofoil, 1stEditionHolofoil');
  });

  test('Era Detection Test: Comprehensive era mapping', () => {
    const testCases = [
      { set_series: 'Base', expected: 'WotC' },
      { set_series: 'EX Ruby & Sapphire', expected: 'EX' },
      { set_series: 'Diamond & Pearl', expected: 'Diamond & Pearl' },
      { set_series: 'HeartGold & SoulSilver', expected: 'HeartGold & SoulSilver' },
      { set_series: 'Black & White', expected: 'Black & White' },
      { set_series: 'XY', expected: 'XY' },
      { set_series: 'Sun & Moon', expected: 'Sun & Moon' },
      { set_series: 'Sword & Shield', expected: 'Sword & Shield' },
      { set_series: 'Scarlet & Violet', expected: 'Scarlet & Violet' }
    ];

    testCases.forEach(({ set_series, expected }) => {
      const testCard: CardInput = {
        set_id: 'test-1',
        set_name: 'Test Card',
        number: '1',
        rarity: 'Common',
        sets: {
          set_id: 'test',
          set_series,
          releaseDate: '2023/01/01'
        }
      };

      const result = inferVariants(testCard);
      expect(result.era).toBe(expected);
    });
  });

  test('Rule Precedence Test: Hard Rules override Era Rules', () => {
    // S&V Rare with explicit normal pricing (should override era holo-by-default)
    const svRareWithNormalPricing: CardInput = {
      set_id: 'sv1-050',
      set_name: 'Test Rare',
      number: '050',
      rarity: 'Rare',
      sets: {
        set_id: 'sv1',
        set_series: 'Scarlet & Violet',
        releaseDate: '2023/03/31'
      },
      tcgplayer: {
        cardmarket_prices: {
          normal: { cardmarket_prices_reverse_holo_low: 0.25, tcgplayer_prices_reverse_holofoil_mid: 0.50, tcgplayer_prices_reverse_holofoil_high: 1.00, tcgplayer_prices_reverse_holofoil_market: 0.45, directLow: null }
        }
      }
    };

    const result = inferVariants(svRareWithNormalPricing);

    // Hard rule (API signal) should override era rule
    expect(result.variants.normal.exists).toBe(true);
    expect(result.variants.normal.confidence).toBe('High');
    expect(result.variants.holo.exists).toBe(false); // Era rule overridden
    expect(result.variants.reverse.exists).toBe(true); // Still applies from era rules

    expect(result.explanations).toContain('TCGPlayer pricing signals detected: normal');
  });
});
