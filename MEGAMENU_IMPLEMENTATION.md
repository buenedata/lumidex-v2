# Megamenu Implementation Guide

## Overview

The Lumidex megamenu provides easy navigation between different Trading Card Games (TCGs) and their sets. Built with Headless UI and designed to scale as new TCGs are added.

## Architecture

### Database Schema
- Added `tcg_type` enum with support for: pokemon, lorcana, magic, yugioh, digimon, onepiece
- Extended `tcg_sets` table with `tcg_type` column
- Indexed for efficient querying by TCG type and series

### Routing Structure
```
/browse                    - TCG overview landing page
/pokemon/sets             - Pokemon sets with filtering
/pokemon/sets/[id]        - Individual Pokemon set details
/lorcana/sets             - Lorcana sets (template ready)
/lorcana/sets/[id]        - Individual Lorcana set details
```

### Components
- **MegaMenu**: Main dropdown with tabbed TCG navigation
- **TCGMegaMenuPanel**: Individual TCG content within megamenu
- **Browse Page**: Overview of all available TCGs
- **TCG-specific pages**: Filtered views for each trading card game

## Setup Instructions

### 1. Apply Database Migration
```bash
# Apply only the new TCG types migration (0004)
npm run db:push

# Run the migration script to update existing data
npm run migrate:tcg-types
```

### 2. Enable Additional TCGs
Edit `src/lib/tcg/constants.ts` to enable new TCGs:
```typescript
lorcana: {
  // ...
  enabled: true, // Change from false to true
}
```

### 3. Add New TCG Routes
Create new directories following the pattern:
```
src/app/(site)/[tcg-name]/sets/page.tsx
src/app/(site)/[tcg-name]/sets/[id]/page.tsx
```

## Features

### Megamenu Features
- **Tabbed Navigation**: Switch between different TCGs
- **Search**: Real-time search across all sets
- **Series Organization**: Sets grouped by series within each TCG
- **Responsive Design**: Adapts to mobile and desktop
- **Loading States**: Skeleton loading while data fetches
- **Accessibility**: Full keyboard navigation and screen reader support

### Individual TCG Pages
- **Series Filtering**: Filter sets by series
- **Search Functionality**: Search within specific TCG
- **Coming Soon States**: For TCGs not yet implemented
- **Breadcrumb Navigation**: Clear navigation hierarchy

## Adding a New TCG

### 1. Update Constants
```typescript
// src/lib/tcg/constants.ts
newtcg: {
  id: 'newtcg',
  name: 'newtcg', 
  displayName: 'New TCG',
  description: 'Description of the new TCG',
  color: 'text-green-500',
  icon: '🎮',
  enabled: true,
}
```

### 2. Create Routes
```bash
mkdir -p src/app/(site)/newtcg/sets
# Copy and modify from pokemon or lorcana examples
```

### 3. Add Data
Insert sets with the new `tcg_type`:
```sql
INSERT INTO tcg_sets (id, name, series, tcg_type, ...) 
VALUES ('set-id', 'Set Name', 'Series Name', 'newtcg', ...);
```

## Styling

The megamenu uses your existing design system:
- **Colors**: aurora (primary), panel/panel2 (backgrounds), text/muted (typography)
- **Components**: Panel, Button, Field components
- **Transitions**: Consistent hover and focus states
- **Responsive**: Mobile-first design with lg: breakpoints

## Browser Support

- **Desktop**: Full megamenu with hover states
- **Mobile**: Simplified navigation in header
- **Keyboard**: Full keyboard navigation support
- **Screen Readers**: Proper ARIA labels and announcements

## Performance

- **ISR**: Pages revalidate every hour (3600 seconds)
- **Lazy Loading**: Megamenu data loads only when opened
- **Static Generation**: Set pages can be pre-generated
- **Efficient Queries**: Indexed database queries with limits

## Maintenance

### Regular Tasks
- Monitor megamenu performance
- Update TCG availability as new games are added
- Refresh set data through existing ingest scripts
- Update series organization as new series are released

### Troubleshooting
- Check database migration status if TCG types aren't working
- Verify TCG constants are properly configured
- Ensure routing follows the established pattern
- Test mobile experience regularly

## Future Enhancements

Potential improvements:
- [ ] Advanced filtering (rarity, type, etc.) in megamenu
- [ ] Recent/popular sets highlighting
- [ ] User preferences for default TCG
- [ ] Analytics on most-accessed TCGs/series
- [ ] Integration with collection status