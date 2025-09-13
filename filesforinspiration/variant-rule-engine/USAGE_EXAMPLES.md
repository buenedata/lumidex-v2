# Variant Rule Engine - Usage Examples and Documentation

## Quick Start Guide

### Basic Usage

```typescript
import { inferVariants } from '@/lib/variant-rule-engine'

// Basic card analysis
const card = {
  id: "swsh4-082",
  name: "Clefable",
  number: "082",
  rarity: "Rare",
  set: {
    id: "swsh4",
    series: "Sword & Shield", 
    releaseDate: "2020/11/13"
  },
  tcgplayer: {
    prices: {
      normal: {},
      reverseHolofoil: {}
    }
  }
}

const result = inferVariants(card)
console.log(result)
// Output: Complete variant analysis with explanations
```

### With Product Sources

```typescript
// Card with multiple product sources
const result = inferVariants(card, ["Booster", "Theme Deck"])

// Theme Deck will add non-holo variants for holo cards
if (result.variants.normal.source === "override") {
  console.log("Normal variant added due to Theme Deck availability")
}
```

## Common Use Cases

### 1. UI Component Integration

#### Collection Button Display

```typescript
import { inferVariants, mapToCardVariants, hasVariant } from '@/lib/variant-rule-engine'

const CollectionButtons = ({ card }) => {
  // Get variant analysis
  const analysis = card.variantAnalysis || inferVariants(card)
  const availableVariants = mapToCardVariants(analysis)
  
  return (
    <div className="variant-buttons">
      {availableVariants.map(variant => (
        <VariantButton 
          key={variant}
          variant={variant}
          confidence={getVariantConfidence(analysis, variant)}
          isAvailable={hasCardVariant(analysis, variant)}
        />
      ))}
    </div>
  )
}
```

#### Card Details Modal

```typescript
const CardDetailsModal = ({ card }) => {
  const analysis = inferVariants(card)
  
  return (
    <div className="card-details">
      <h2>{card.name}</h2>
      
      {/* Variant Analysis Section */}
      <VariantAnalysisDisplay analysis={analysis} />
      
      {/* Pricing by Variant */}
      <VariantPricingDisplay card={card} analysis={analysis} />
    </div>
  )
}

const VariantAnalysisDisplay = ({ analysis }) => (
  <div className="variant-analysis">
    <h3>Available Variants ({analysis.era} Era)</h3>
    
    {Object.entries(analysis.variants).map(([finish, flag]) => (
      <div key={finish} className={`variant-row ${flag.exists ? 'available' : 'unavailable'}`}>
        <span className="variant-name">{formatVariantDisplayName(finish)}</span>
        <span className="status">{flag.exists ? '✓' : '✗'}</span>
        {flag.exists && (
          <span className="confidence badge-{flag.confidence}">
            {flag.source} ({flag.confidence})
          </span>
        )}
      </div>
    ))}
    
    <div className="explanations">
      <h4>Analysis:</h4>
      <ul>
        {analysis.explanations.map((explanation, index) => (
          <li key={index}>{explanation}</li>
        ))}
      </ul>
    </div>
  </div>
)
```

### 2. Pricing Integration

#### Variant-Specific Pricing

```typescript
import { getPricingVariant, getFallbackPricingVariant } from '@/lib/variant-rule-engine'

const getVariantPrice = (card, variant, source = 'CardMarket') => {
  const analysis = card.variantAnalysis || inferVariants(card)
  const pricingVariant = getPricingVariant(analysis, variant)
  
  if (!pricingVariant) {
    // Use fallback pricing
    const fallback = getFallbackPricingVariant(analysis, variant)
    return getPrice(card, fallback, source)
  }
  
  return getPrice(card, pricingVariant, source)
}

// Usage in PriceDisplay component
const PriceDisplay = ({ card, variant = 'holo' }) => {
  const price = getVariantPrice(card, variant)
  
  return (
    <span className="price">
      {price ? formatPrice(price) : 'N/A'}
    </span>
  )
}
```

#### Collection Value Calculation

```typescript
const calculateCollectionValue = (collectionItems, cardsData) => {
  let totalValue = 0
  
  collectionItems.forEach(item => {
    const card = cardsData.get(item.card_id)
    if (!card) return
    
    const analysis = card.variantAnalysis || inferVariants(card)
    
    // Calculate value for each owned variant
    if (item.normal > 0 && hasVariant(analysis, 'normal')) {
      totalValue += getVariantPrice(card, 'normal') * item.normal
    }
    
    if (item.holo > 0 && hasVariant(analysis, 'holo')) {
      totalValue += getVariantPrice(card, 'holo') * item.holo
    }
    
    if (item.reverseHolo > 0 && hasVariant(analysis, 'reverse')) {
      totalValue += getVariantPrice(card, 'reverse_holo') * item.reverseHolo
    }
    
    if (item.firstEdition > 0 && has1stEditionVariants(analysis)) {
      totalValue += getVariantPrice(card, '1st_edition') * item.firstEdition
    }
  })
  
  return totalValue
}
```

### 3. Collection Management

#### Progress Tracking

```typescript
import { getVariantCompletionPercentage, getMissingVariants } from '@/lib/variant-rule-engine'

const CollectionProgress = ({ card, collectionData }) => {
  const analysis = inferVariants(card)
  const completion = getVariantCompletionPercentage(analysis, collectionData)
  const missing = getMissingVariants(analysis, collectionData)
  
  return (
    <div className="collection-progress">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${completion}%` }}
        />
        <span className="progress-text">{completion}% Complete</span>
      </div>
      
      {missing.length > 0 && (
        <div className="missing-variants">
          <span>Missing: </span>
          {missing.map(variant => (
            <span key={variant} className="missing-variant">
              {formatVariantDisplayName(variant)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
```

#### Wishlist Integration

```typescript
const WishlistRecommendations = ({ card }) => {
  const analysis = inferVariants(card)
  const existingVariants = getExistingVariants(analysis)
  const highValueVariants = getVariantsByConfidence(analysis, 'high')
  
  // Recommend high-confidence variants for wishlist
  return (
    <div className="wishlist-recommendations">
      <h4>Recommended Variants:</h4>
      {highValueVariants.map(variant => (
        <div key={variant} className="recommendation">
          <span>{formatVariantDisplayName(variant)}</span>
          <span className="confidence">High Confidence</span>
          <button onClick={() => addToWishlist(card.id, variant)}>
            Add to Wishlist
          </button>
        </div>
      ))}
    </div>
  )
}
```

### 4. Admin and Debug Tools

#### Variant Analysis Debugger

```typescript
const VariantDebugger = ({ card }) => {
  const [analysis, setAnalysis] = useState(null)
  const [productSources, setProductSources] = useState(['Booster'])
  
  const runAnalysis = () => {
    const result = inferVariants(card, productSources)
    setAnalysis(result)
  }
  
  return (
    <div className="variant-debugger">
      <h3>Variant Rule Engine Debugger</h3>
      
      <div className="inputs">
        <label>
          Product Sources:
          <select 
            multiple 
            value={productSources}
            onChange={(e) => setProductSources([...e.target.selectedOptions].map(o => o.value))}
          >
            <option value="Booster">Booster</option>
            <option value="Theme Deck">Theme Deck</option>
            <option value="Promo">Promo</option>
            <option value="Tin">Tin</option>
          </select>
        </label>
        
        <button onClick={runAnalysis}>Run Analysis</button>
      </div>
      
      {analysis && (
        <div className="results">
          <h4>Results:</h4>
          <pre>{JSON.stringify(analysis, null, 2)}</pre>
          
          <h4>Rule Application Order:</h4>
          <ol>
            <li>Era Detection: {analysis.era}</li>
            <li>Hard Rules (API): {getVariantsBySource(analysis, 'api').length} variants</li>
            <li>Era Rules: {getVariantsBySource(analysis, 'rule').length} variants</li>
            <li>Overrides: {getVariantsBySource(analysis, 'override').length} variants</li>
          </ol>
          
          <h4>Confidence Breakdown:</h4>
          <ul>
            <li>High: {getVariantsByConfidence(analysis, 'high').length}</li>
            <li>Medium: {getVariantsByConfidence(analysis, 'medium').length}</li>
            <li>Low: {getVariantsByConfidence(analysis, 'low').length}</li>
          </ul>
        </div>
      )}
    </div>
  )
}
```

### 5. Batch Processing

#### Set Analysis

```typescript
const analyzeEntireSet = async (setId) => {
  // Get all cards in set
  const { data: cards } = await supabase
    .from('cards')
    .select('*')
    .eq('set_id', setId)
  
  const analyses = []
  const issues = []
  
  for (const card of cards) {
    try {
      const apiCard = transformToApiFormat(card)
      const analysis = inferVariants(apiCard)
      
      analyses.push({
        cardId: card.id,
        cardName: card.name,
        analysis
      })
      
      // Check for low confidence results
      if (!hasHighConfidenceAnalysis(analysis)) {
        issues.push({
          cardId: card.id,
          issue: 'Low confidence analysis',
          confidence: getHighestConfidence(analysis)
        })
      }
      
    } catch (error) {
      issues.push({
        cardId: card.id,
        issue: error.message
      })
    }
  }
  
  return { analyses, issues }
}
```

#### Migration Tool

```typescript
const migrateCardVariants = async (batchSize = 100) => {
  let offset = 0
  let processedCount = 0
  
  while (true) {
    const { data: cards } = await supabase
      .from('cards')
      .select('*')
      .is('variant_analysis', null)
      .range(offset, offset + batchSize - 1)
    
    if (!cards || cards.length === 0) break
    
    const updates = []
    
    for (const card of cards) {
      try {
        const apiCard = transformToApiFormat(card)
        const analysis = inferVariants(apiCard)
        
        updates.push({
          id: card.id,
          variant_analysis: analysis,
          available_variants: mapToCardVariants(analysis)
        })
        
      } catch (error) {
        console.error(`Failed to analyze card ${card.id}:`, error)
      }
    }
    
    // Batch update
    if (updates.length > 0) {
      await Promise.all(
        updates.map(update => 
          supabase
            .from('cards')
            .update(update)
            .eq('id', update.id)
        )
      )
    }
    
    processedCount += cards.length
    console.log(`Processed ${processedCount} cards...`)
    
    offset += batchSize
  }
  
  console.log(`Migration complete. Processed ${processedCount} total cards.`)
}
```

## Error Handling Patterns

### Graceful Degradation

```typescript
const SafeVariantAnalysis = ({ card, children }) => {
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    try {
      const result = inferVariants(card)
      setAnalysis(result)
    } catch (err) {
      console.error('Variant analysis failed:', err)
      setError(err)
      
      // Fall back to legacy logic
      const fallbackVariants = getAvailableVariantsLegacy(card)
      setAnalysis({
        variants: fallbackVariants,
        confidence: 'low',
        source: 'fallback'
      })
    }
  }, [card])
  
  if (error) {
    return (
      <div className="variant-analysis-error">
        ⚠️ Using fallback variant detection
      </div>
    )
  }
  
  return children({ analysis })
}
```

### Validation Wrapper

```typescript
const withVariantValidation = (Component) => {
  return (props) => {
    const { card, ...otherProps } = props
    
    // Validate card has required fields
    if (!validateCardInput(card)) {
      console.warn('Invalid card data for variant analysis:', card)
      return <Component {...otherProps} variants={[]} />
    }
    
    const analysis = inferVariants(card)
    const sanitizedAnalysis = sanitizeVariantResult(analysis)
    
    if (!sanitizedAnalysis) {
      return <Component {...otherProps} variants={[]} />
    }
    
    return (
      <Component 
        {...otherProps} 
        analysis={sanitizedAnalysis}
        variants={mapToCardVariants(sanitizedAnalysis)}
      />
    )
  }
}

// Usage
const SafeCollectionButtons = withVariantValidation(CollectionButtons)
```

## Performance Optimization

### Memoization Patterns

```typescript
// Memoize variant analysis for expensive operations
const useMemoizedVariantAnalysis = (card, productSources) => {
  return useMemo(() => {
    if (!card) return null
    
    try {
      return inferVariants(card, productSources)
    } catch (error) {
      console.error('Variant analysis error:', error)
      return null
    }
  }, [card?.id, card?.rarity, card?.set?.series, productSources])
}

// Usage in components
const CardComponent = ({ card, productSources }) => {
  const analysis = useMemoizedVariantAnalysis(card, productSources)
  
  if (!analysis) {
    return <div>Loading...</div>
  }
  
  return <VariantDisplay analysis={analysis} />
}
```

### Batch API Usage

```typescript
// Process multiple cards efficiently
const useVariantAnalysisBatch = (cards) => {
  const [analyses, setAnalyses] = useState(new Map())
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    if (!cards?.length) return
    
    setLoading(true)
    
    // Process in chunks to avoid blocking
    const processChunk = async (chunk) => {
      const chunkAnalyses = new Map()
      
      chunk.forEach(card => {
        try {
          const analysis = inferVariants(card)
          chunkAnalyses.set(card.id, analysis)
        } catch (error) {
          console.error(`Analysis failed for ${card.id}:`, error)
        }
      })
      
      setAnalyses(prev => new Map([...prev, ...chunkAnalyses]))
    }
    
    // Process 50 cards at a time
    const chunks = chunksOf(cards, 50)
    
    Promise.all(chunks.map(processChunk)).finally(() => {
      setLoading(false)
    })
    
  }, [cards])
  
  return { analyses, loading }
}
```

## Testing Utilities

### Test Helpers

```typescript
// Create test cards for different scenarios
export const createTestCard = (overrides = {}) => ({
  id: 'test-001',
  name: 'Test Card',
  number: '001',
  rarity: 'Common',
  set: {
    id: 'test1',
    series: 'Test Series',
    releaseDate: '2020/01/01'
  },
  ...overrides
})

// Test variant analysis
export const testVariantAnalysis = (card, expectedVariants) => {
  const analysis = inferVariants(card)
  const actualVariants = getExistingVariants(analysis)
  
  expect(actualVariants.sort()).toEqual(expectedVariants.sort())
  return analysis
}

// Contract test runner
export const runContractTests = () => {
  describe('Variant Rule Engine Contract Tests', () => {
    test('Vivid Voltage Clefable', () => {
      const card = createTestCard({
        id: 'swsh4-082',
        rarity: 'Rare',
        set: { series: 'Sword & Shield' },
        tcgplayer: { prices: { normal: {}, reverseHolofoil: {} } }
      })
      
      const analysis = inferVariants(card)
      
      expect(analysis.variants.normal.exists).toBe(true)
      expect(analysis.variants.holo.exists).toBe(false)
      expect(analysis.variants.reverse.exists).toBe(true)
    })
  })
}
```

This comprehensive guide provides practical examples for integrating and using the variant rule engine throughout your Pokemon TCG application.