/**
 * Variant Rule Engine - Main Export
 * 
 * Deterministic Pokemon TCG cards variant inference system.
 * Exports all public APIs for the variant rule engine.
 */

// Main inference function
export { default as inferVariants, inferVariantsBatch } from './inferVariants'
import inferVariantsImpl from './inferVariants'

// Core type
export type {
  CardInput,
  VariantResult,
  VariantFlag,
  Finish,
  Source,
  Confidence,
  Era,
  ProductSource,
  ContractTest,
  VariantRuleError
} from './types'

// Utility functions
export {
  hasVariant,
  getExistingVariants,
  hasAnyHoloVariant,
  hasAnyNormalVariant,
  has1stEditionVariants,
  getVariantsByConfidence,
  getVariantsBySource,
  getHighestConfidence,
  hasHighConfidenceAnalysis,
  mapToCardVariants,
  mapCardVariantToFinishes,
  hasCardVariant,
  getPricingVariant,
  requiresSpecialPricing,
  getFallbackPricingVariant,
  formatVariantDisplayName,
  getConfidenceClass,
  getSourceClass,
  formatExplanations,
  getVariantSummary,
  getTotalVariantsOwned,
  getVariantCompletionPercentage,
  hasCompleteVariantCollection,
  getMissingVariants,
  compareVariantResults,
  getVariantDifferences,
  getVariantConfidence,
  createLegacyVariantData
} from './utils'

// Era detection utilities
export {
  detectEra,
  hasReverseHoloDefault,
  has1stEditionVariants as eraHas1stEdition,
  isScarletVioletSingleStarHolo,
  hasSpecialPatterns,
  getEraTransitionDates
} from './era-mapping'

// Validation and debugging
export {
  validateVariantResult,
  sanitizeVariantResult,
  createAnalysisSummary,
  hasHighConfidenceAnalysis as analysisHasHighConfidence,
  getMostCommonConfidence
} from './inferVariants'

// Contract tests for validation
export const CONTRACT_TESTS = [
  {
    set_name: "Vivid Voltage Clefable",
    input: {
      cards: {
        set_id: "swsh4-082",
        set_name: "Clefable",
        number: "082",
        rarity: "Rare",
        sets: {
          set_id: "swsh4",
          set_series: "Sword & Shield",
          releaseDate: "2020/11/13"
        },
        tcgplayer: {
          cardmarket_prices: {
            normal: {},
            reverseHolofoil: {}
          }
        }
      }
    },
    expected: {
      era: "Sword & Shield",
      rarity: "Rare",
      variants: {
        normal: { exists: true, source: "api", confidence: "tcgplayer_prices_reverse_holofoil_high" },
        holo: { exists: false },
        reverse: { exists: true, source: "api", confidence: "tcgplayer_prices_reverse_holofoil_high" },
        firstEdNormal: { exists: false },
        firstEdHolo: { exists: false }
      }
    },
    description: "SWSH Rare with API signals should have normal + reverse, no holo"
  },
  {
    set_name: "Scarlet & Violet Base Rare",
    input: {
      cards: {
        set_id: "sv1-001",
        set_name: "Test Card",
        number: "001",
        rarity: "Rare",
        sets: {
          set_id: "sv1",
          set_series: "Scarlet & Violet",
          releaseDate: "2023/03/31"
        },
        tcgplayer: {
          cardmarket_prices: {}
        }
      }
    },
    expected: {
      era: "Scarlet & Violet",
      rarity: "Rare",
      variants: {
        normal: { exists: false },
        holo: { exists: true, source: "rule", confidence: "medium" },
        reverse: { exists: true, source: "rule", confidence: "medium" },
        firstEdNormal: { exists: false },
        firstEdHolo: { exists: false }
      }
    },
    description: "S&V single-star rares are holo by default, no normal in boosters"
  },
  {
    set_name: "WotC Theme Deck Override",
    input: {
      cards: {
        set_id: "base1-4",
        set_name: "Charizard",
        number: "4",
        rarity: "Rare Holo",
        sets: {
          set_id: "base1",
          set_series: "Base",
          releaseDate: "1999/01/09"
        },
        tcgplayer: {
          cardmarket_prices: {
            tcgplayer_prices_reverse_holofoil: {},
            "1stEditionHolofoil": {}
          }
        }
      },
      productSources: ["Booster", "Theme Deck"]
    },
    expected: {
      era: "WotC",
      rarity: "Rare Holo",
      variants: {
        normal: { exists: true, source: "override", confidence: "medium" },
        holo: { exists: true, source: "api", confidence: "tcgplayer_prices_reverse_holofoil_high" },
        reverse: { exists: false },
        firstEdNormal: { exists: false },
        firstEdHolo: { exists: true, source: "api", confidence: "tcgplayer_prices_reverse_holofoil_high" }
      }
    },
    description: "WotC holo with Theme Deck should add normal variant via override"
  }
] as const

/**
 * Run contract tests to validate rule engine behavior
 */
export function runContractTests(): {
  passed: number
  failed: number
  results: Array<{ set_name: string; passed: boolean; error?: string }>
} {
  const results = []
  let passed = 0
  let failed = 0
  
  for (const test of CONTRACT_TESTS) {
    try {
      const productSources = 'productSources' in test.input ? test.input.productSources : undefined
      const result = inferVariantsImpl(test.input.cards as any, productSources as any)
      
      // Validate key expectations
      let testPassed = true
      let error = ''
      
      if (test.expected.era && result.era !== test.expected.era) {
        testPassed = false
        error += `Era mismatch: expected ${test.expected.era}, got ${result.era}. `
      }
      
      if (test.expected.rarity && result.rarity !== test.expected.rarity) {
        testPassed = false
        error += `Rarity mismatch: expected ${test.expected.rarity}, got ${result.rarity}. `
      }
      
      // Check variant expectations
      if (test.expected.variants) {
        Object.keys(test.expected.variants).forEach(variant => {
          const expected = test.expected.variants![variant as keyof typeof test.expected.variants]
          const actual = result.variants[variant as keyof typeof result.variants]
          
          if (expected && expected.exists !== actual.exists) {
            testPassed = false
            error += `Variant ${variant} existence mismatch: expected ${expected.exists}, got ${actual.exists}. `
          }
          
          if (expected?.exists && expected.source && actual.source !== expected.source) {
            testPassed = false
            error += `Variant ${variant} source mismatch: expected ${expected.source}, got ${actual.source}. `
          }
          
          if (expected?.exists && expected.confidence && actual.confidence !== expected.confidence) {
            testPassed = false
            error += `Variant ${variant} confidence mismatch: expected ${expected.confidence}, got ${actual.confidence}. `
          }
        })
      }
      
      if (testPassed) {
        passed++
      } else {
        failed++
      }
      
      results.push({
        set_name: test.set_name,
        passed: testPassed,
        ...(error && { error })
      })
      
    } catch (err) {
      failed++
      results.push({
        set_name: test.set_name,
        passed: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    }
  }
  
  return { passed, failed, results }
}

/**
 * Quick test function for development
 */
export function quickTest() {
  console.log('🧪 Running Variant Rule Engine Contract Tests...')
  
  const testResults = runContractTests()
  
  console.log(`\n📊 Results: ${testResults.passed} passed, ${testResults.failed} failed`)
  
  testResults.results.forEach(result => {
    const status = result.passed ? '✅' : '❌'
    console.log(`${status} ${result.set_name}`)
    if (!result.passed && result.error) {
      console.log(`   Error: ${result.error}`)
    }
  })
  
  return testResults
}
