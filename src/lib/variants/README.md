# Variant System Implementation

This comprehensive variant system provides a complete solution for managing Pokémon TCG card variants with optimized caching, user interactions, and data persistence.

## Architecture Overview

### Core Components

1. **Variant Rule Engine** (`engine.ts`)
   - TCGplayer-driven variant discovery
   - Era-specific logic (Classic/Modern/Scarlet & Violet)
   - Set policy management
   - Bulk processing optimization

2. **Data Persistence** (`persistence.ts`)
   - User variant quantity management
   - Dual-write support for safe migrations
   - Bulk operations and collection statistics

3. **Policy Management** (`policies.ts`)
   - Set-specific variant rules
   - Rarity mappings
   - Card-level exceptions

4. **Client-Side Caching** (`/hooks/use-variant-queries.ts`)
   - TanStack Query integration
   - Optimistic updates
   - Smart cache invalidation

### UI Components

1. **VariantQuantityBox** - Interactive quantity management with Aurora Crimson theming
2. **VariantQuantityBoxGroup** - Grouped variant display
3. **CachedVariantQuantityBoxGroup** - Cached version with automatic data fetching

## Usage Examples

### Basic Variant Generation

```typescript
import { generateVariantsForCard } from '@/lib/variants/engine';

const variants = await generateVariantsForCard({
  card: {
    id: 'sv1-1',
    number: '1', 
    rarity: 'Common',
    setId: 'sv1',
    tcgplayer: {
      prices: {
        normal: { market: 1.50 },
        holofoil: { market: 5.00 }
      }
    }
  }
});
```

### Using Cached Components

```tsx
import { CachedVariantQuantityBoxGroup } from '@/components/variants/VariantQuantityBoxWithCache';

function CardTile({ card }) {
  return (
    <div>
      <img src={card.image} alt={card.name} />
      <CachedVariantQuantityBoxGroup
        cardInput={{ card }}
      />
    </div>
  );
}
```

### Custom Hooks for Data Fetching

```tsx
import { useCardWithVariants, useUpdateCardQuantity } from '@/hooks/use-variant-queries';

function CardDetails({ card }) {
  const { 
    variants, 
    quantities, 
    isLoading,
    variantsWithQuantities 
  } = useCardWithVariants({ card });
  
  const updateQuantity = useUpdateCardQuantity();
  
  const handleQuantityChange = (variantType, newQuantity) => {
    updateQuantity.mutate({
      cardId: card.id,
      variantType,
      quantity: newQuantity
    });
  };
  
  // Component implementation...
}
```

### Bulk Set Processing

```typescript
import { generateVariantsForSet } from '@/lib/variants/engine';

const setVariants = await generateVariantsForSet({
  setId: 'sv1',
  cards: setCards,
  userCollectionData: userQuantities
});
```

## Caching Strategy

### Cache Durations

- **Variant Data**: 10-15 minutes (stable across sessions)
- **User Quantities**: 2-5 minutes (frequently updated)
- **Set Policies**: 30 minutes (rarely change)

### Cache Keys

```typescript
// Variants
['variants', 'card', cardId]
['variants', 'set', setId]
['variants', 'engine', input]

// Quantities
['quantities', 'card', cardId]
['quantities', 'user', userId]

// Policies
['policies', 'set', setId]
['rarities', 'era', era]
```

### Optimistic Updates

The system implements optimistic updates for quantity changes:

1. Immediately update UI with expected value
2. Send mutation to server
3. Revert on error, confirm on success
4. Automatically refetch to ensure consistency

## Database Schema

### Core Tables

```sql
-- User variant quantities (new schema)
CREATE TABLE user_card_variants (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  card_id TEXT NOT NULL,
  variant_type variant_enum NOT NULL,
  quantity INTEGER DEFAULT 0,
  UNIQUE(user_id, card_id, variant_type)
);

-- Set policies
CREATE TABLE tcg_set_policies (
  set_id TEXT PRIMARY KEY,
  era era_enum NOT NULL,
  has_first_edition BOOLEAN DEFAULT false,
  has_standard_reverse BOOLEAN DEFAULT true,
  has_pokeball_reverse BOOLEAN DEFAULT false,
  has_masterball_reverse BOOLEAN DEFAULT false,
  rare_policy TEXT DEFAULT 'auto'
);

-- Rarity mappings
CREATE TABLE rarity_variant_mappings (
  set_id TEXT,
  rarity TEXT,
  variant_types TEXT[] NOT NULL,
  PRIMARY KEY (set_id, rarity)
);
```

### Migration Strategy

The system supports dual-write migration:

1. **Phase 1**: Add new schema alongside existing
2. **Phase 2**: Dual-write to both schemas
3. **Phase 3**: Migrate existing data
4. **Phase 4**: Switch reads to new schema
5. **Phase 5**: Remove old schema

## API Endpoints

### Variant Engine
- `POST /api/variants/engine` - Generate variants for cards/sets

### Quantity Management
- `GET /api/variants/quantities?cardId=X` - Get user quantities
- `POST /api/variants/quantities` - Create new quantity
- `PUT /api/variants/quantities` - Update existing quantity
- `DELETE /api/variants/quantities` - Remove quantity

### Admin Operations
- `GET /api/admin/set-policies` - List set policies
- `POST /api/admin/set-policies` - Create/update policies

## Performance Optimizations

### Engine Optimizations

1. **Bulk Processing**: Process entire sets in batches
2. **Caching**: Server-side caching of policies and mappings
3. **Lazy Loading**: Only generate variants when needed

### Client Optimizations

1. **Query Caching**: Aggressive caching with smart invalidation
2. **Optimistic Updates**: Immediate UI feedback
3. **Prefetching**: Preload variants on hover/focus
4. **Skeletal Loading**: Smooth loading states

### Database Optimizations

1. **Indexes**: Optimized queries on user_id, card_id, variant_type
2. **Batch Operations**: Bulk inserts/updates for large datasets
3. **Connection Pooling**: Efficient database connections

## Testing

Comprehensive test coverage includes:

- **Unit Tests**: Variant engine logic, utility functions
- **Integration Tests**: API endpoints, database operations  
- **Component Tests**: UI interactions, accessibility
- **E2E Tests**: Complete user workflows

Run tests with:
```bash
npm run test        # Watch mode
npm run test:run    # Single run
npm run test:ui     # UI mode with browser
```

## Error Handling

### Client-Side Errors

- Graceful fallbacks to default variants
- Toast notifications for user errors
- Retry mechanisms for network failures

### Server-Side Errors

- Comprehensive error logging
- Fallback to TCGplayer discovery
- Database constraint handling

## Security Considerations

1. **Authentication**: All mutation operations require valid user session
2. **Rate Limiting**: Protect against abuse of variant generation
3. **Input Validation**: Strict validation of all user inputs
4. **CORS**: Proper cross-origin request handling

## Future Enhancements

1. **Real-time Updates**: WebSocket support for live quantity changes
2. **Advanced Caching**: Redis/Memory cache for high-traffic scenarios
3. **Analytics**: Usage tracking and performance monitoring
4. **Mobile App**: React Native implementation with shared logic
5. **Offline Support**: PWA capabilities with local storage

## Troubleshooting

### Common Issues

1. **Cache Inconsistency**: Use query devtools to inspect cache state
2. **Slow Variant Generation**: Check bulk processing and database indexes
3. **Missing Variants**: Verify set policies and TCGplayer data
4. **Authentication Errors**: Ensure proper session handling

### Debug Tools

- React Query Devtools (development only)
- Server-side logging with structured output
- Database query analysis tools
- Performance monitoring dashboards

For additional support, check the test files for usage examples and edge case handling.