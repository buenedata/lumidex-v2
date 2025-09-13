# CardDetailsModal Component

A comprehensive modal component for displaying detailed card information, collection management, pricing data, and social features.

## Features

- 📱 **Responsive Design**: Optimized for mobile and desktop using Aurora Crimson design system
- 🎨 **Tab Navigation**: Details, Pricing, and Social tabs for organized content
- 🔄 **Collection Management**: Integrated with existing variant system
- 💰 **Pricing Display**: Shows current market prices from multiple sources
- ⚡ **Performance**: Debounced loading with error handling and retry logic
- ♿ **Accessibility**: Keyboard navigation and ARIA labels
- 🎯 **Type Safe**: Full TypeScript support with proper type definitions

## Usage

### Basic Usage

```tsx
import { useState } from 'react';
import { CardDetailsModal } from '@/components/cards';

function CardGrid() {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = (cardId: string) => {
    setSelectedCardId(cardId);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCardId(null);
  };

  return (
    <div>
      {/* Your card grid here */}
      <button onClick={() => handleCardClick('card-id-123')}>
        Open Card Details
      </button>

      <CardDetailsModal
        cardId={selectedCardId}
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />
    </div>
  );
}
```

### With Collection Management

```tsx
import { CardDetailsModal } from '@/components/cards';
import type { CardCollectionData } from '@/types/card-modal';

function CardWithCollection() {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCollectionChange = (cardId: string, collectionData: CardCollectionData | null) => {
    console.log('Collection updated:', { cardId, collectionData });
    
    // Update your local state or refresh data
    // This is called whenever the user adds/removes cards from their collection
  };

  const handleWishlistChange = () => {
    console.log('Wishlist updated');
    
    // Handle wishlist changes
    // This is called when the user adds/removes cards from wishlist
  };

  return (
    <CardDetailsModal
      cardId={selectedCardId}
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      onCollectionChange={handleCollectionChange}
      onWishlistChange={handleWishlistChange}
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `cardId` | `string \| null` | Yes | The ID of the card to display |
| `isOpen` | `boolean` | Yes | Whether the modal is open |
| `onClose` | `() => void` | Yes | Callback when the modal is closed |
| `onCollectionChange` | `(cardId: string, data: CardCollectionData \| null) => void` | No | Callback when collection is updated |
| `onWishlistChange` | `() => void` | No | Callback when wishlist is updated |

## Tabs

### Details Tab
- Basic card information (name, number, rarity, set)
- Artist and flavor text
- Collection management with variant buttons
- Card type and HP information

### Pricing Tab
- Current market prices (CardMarket)
- Historical pricing data
- External marketplace links
- Price trends and analysis

### Social Tab
- Friends who own the card
- Wishlist management
- Card sharing functionality
- Social interactions

## Database Integration

The modal automatically adapts data from your current database schema:

### Required Tables
- `tcg_cards` - Card data with jsonb images field
- `tcg_sets` - Set information
- `tcg_card_prices` - Pricing data from various sources
- `collection_items` - User collection data
- `profiles` - User profiles

### Supported Variants
- Normal
- Holo
- Reverse Holo (Standard)
- Reverse Holo (Pokeball Pattern)
- Reverse Holo (Masterball Pattern)
- First Edition
- Custom variants from `custom_card_variants` table

## Styling

The modal uses the Aurora Crimson design system with these CSS classes:

```css
/* Core classes used */
.panel          /* Panel backgrounds */
.btn-primary    /* Primary buttons */
.btn-secondary  /* Secondary buttons */
.text-gradient  /* Gradient text effects */
.variant-btn    /* Collection variant buttons */
.nav-active     /* Active tab indicator */
```

## Data Flow

```
CardDetailsModal
├── CardModalClientService (data fetching)
├── Database Adapter (schema bridging)
├── Variant System Integration
└── Aurora Crimson Design System
```

## Performance

- **Debounced Loading**: 300ms debounce on card fetching
- **Retry Logic**: Automatic retry on network errors
- **Client-side Caching**: Reduces redundant API calls
- **Optimistic Updates**: Immediate UI feedback for collection changes

## Error Handling

The modal includes comprehensive error handling:

- Network timeout detection
- Connection staleness recovery
- User-friendly error messages
- Automatic retry with exponential backoff
- Graceful fallbacks for missing data

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: ARIA labels and descriptions
- **Focus Management**: Proper focus trapping
- **High Contrast**: Works with system preferences
- **Reduced Motion**: Respects user motion preferences

## Future Enhancements

Planned features for future versions:

- [ ] Advanced social features (friends, trading)
- [ ] Price alerts and notifications
- [ ] Achievement system integration
- [ ] Card comparison mode
- [ ] Advanced filtering and search
- [ ] Print-friendly layouts
- [ ] Offline mode support

## Troubleshooting

### Common Issues

1. **Modal not opening**: Ensure `cardId` is not null and `isOpen` is true
2. **No pricing data**: Check `tcg_card_prices` table has data for the card
3. **Collection buttons not working**: Verify user is authenticated
4. **Images not loading**: Check `images` jsonb field in `tcg_cards` table

### Debug Mode

Enable debug logging:

```tsx
// Add to your component
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    console.log('CardDetailsModal Debug:', {
      cardId,
      isOpen,
      cardState,
      collectionState
    });
  }
}, [cardId, isOpen, cardState, collectionState]);