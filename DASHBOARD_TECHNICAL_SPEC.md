# Lumidex v2 Dashboard Technical Implementation Specification

## Component Architecture

### 1. Enhanced Dashboard Page Structure

```typescript
// src/app/(site)/page.tsx - New Structure
interface DashboardData {
  user: User | null;
  stats: CollectionStats;
  recentActivity: ActivityItem[];
  achievements: Achievement[];
  collectionHighlights: HighlightCard[];
  setProgress: SetProgress[];
  marketInsights: MarketTrend[];
  tradingData: TradingOverview;
}

// Layout Grid:
// [Hero Section - Full Width]
// [Stats Row - 4 columns]
// [Dashboard Widgets - 3x2 grid on desktop, responsive]
// [CTA Section - Full Width]
```

### 2. New Dashboard Components

#### QuickActionsPanel Component
```typescript
// src/components/dashboard/QuickActionsPanel.tsx
interface QuickAction {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  variant?: 'primary' | 'secondary';
}

interface QuickActionsPanelProps {
  actions: QuickAction[];
  className?: string;
}

// Features:
// - 6 compact action buttons in 2x3 grid
// - Icons with labels
// - Optional badges for notifications
// - Hover animations
```

#### ActivityFeed Component
```typescript
// src/components/dashboard/ActivityFeed.tsx
interface ActivityItem {
  id: string;
  type: 'card_added' | 'achievement' | 'price_alert' | 'trade' | 'set_completed';
  title: string;
  description?: string;
  timestamp: Date;
  icon: string;
  value?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  maxItems?: number;
  showViewAll?: boolean;
  className?: string;
}

// Features:
// - Chronological list with icons
// - Different styling per activity type
// - Relative timestamps
// - Expandable with "View All" link
```

#### AchievementProgress Component
```typescript
// src/components/dashboard/AchievementProgress.tsx
interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  currentProgress: number;
  targetProgress: number;
  category: 'collection' | 'trading' | 'social' | 'market';
  rewards?: string[];
}

interface AchievementProgressProps {
  achievements: Achievement[];
  showAll?: boolean;
  className?: string;
}

// Features:
// - Progress bars with percentages
// - Category-based grouping
// - Unlock animations
// - Reward previews
```

#### CollectionHighlights Component
```typescript
// src/components/dashboard/CollectionHighlights.tsx
interface HighlightCard {
  id: string;
  name: string;
  set: string;
  image: string;
  value: number;
  currency: string;
  type: 'most_valuable' | 'recent_addition' | 'price_gainer' | 'rare_find';
  rarity?: string;
  condition?: string;
}

interface CollectionHighlightsProps {
  highlights: HighlightCard[];
  showImages?: boolean;
  columns?: 2 | 3 | 4;
  className?: string;
}

// Features:
// - Card image thumbnails
// - Value and rarity display
// - Hover effects with details
// - Responsive grid layout
```

#### SetCompletionList Component
```typescript
// src/components/dashboard/SetCompletionList.tsx
interface SetProgress {
  id: string;
  name: string;
  slug: string;
  totalCards: number;
  ownedCards: number;
  completionPercentage: number;
  image?: string;
  priority: 'high' | 'medium' | 'low';
  estimatedCost?: number;
}

interface SetCompletionListProps {
  sets: SetProgress[];
  maxSets?: number;
  showRecommendations?: boolean;
  className?: string;
}

// Features:
// - Progress bars with exact counts
// - Priority indicators
// - Cost estimates for completion
// - Smart recommendations
```

#### TradingPanel Component
```typescript
// src/components/dashboard/TradingPanel.tsx
interface TradingOverview {
  activeTrades: number;
  newMessages: number;
  friendsOnline: number;
  marketplaceHighlights: MarketplaceListing[];
}

interface MarketplaceListing {
  id: string;
  cardName: string;
  price: number;
  currency: string;
  condition: string;
  type: 'buy' | 'sell';
}

interface TradingPanelProps {
  data: TradingOverview;
  isAuthenticated: boolean;
  className?: string;
}

// Features:
// - Live status indicators
// - Marketplace previews
// - Social activity summary
// - Call-to-action for features
```

#### MarketInsights Component
```typescript
// src/components/dashboard/MarketInsights.tsx
interface MarketTrend {
  cardName: string;
  changePercentage: number;
  changeDirection: 'up' | 'down' | 'stable';
  currentPrice: number;
  currency: string;
  category: 'trending_up' | 'price_drops' | 'rare_finds';
}

interface MarketInsightsProps {
  trends: MarketTrend[];
  showAlerts?: boolean;
  maxItems?: number;
  className?: string;
}

// Features:
// - Trend indicators with colors
// - Price change percentages
// - Category-based filtering
// - Integration with price alerts
```

#### UpcomingFeatures Component
```typescript
// src/components/dashboard/UpcomingFeatures.tsx
interface UpcomingFeature {
  title: string;
  description: string;
  status: 'coming_soon' | 'beta' | 'planned';
  estimatedDate?: string;
}

interface UpcomingFeaturesProps {
  features: UpcomingFeature[];
  showTips?: boolean;
  className?: string;
}

// Features:
// - Feature roadmap preview
// - Status indicators
// - Tips and onboarding hints
// - User feedback collection
```

### 3. Enhanced Existing Components

#### DashboardStats Enhancements
```typescript
// src/components/dashboard/StatTiles.tsx - Enhanced
interface EnhancedStatTileData extends StatTileData {
  chartData?: number[];
  chartType?: 'line' | 'bar' | 'progress';
  target?: number;
  comparison?: {
    period: string;
    value: number;
    trend: 'up' | 'down' | 'stable';
  };
}

// New Features:
// - Mini charts using CSS or simple SVG
// - Comparison with previous periods
// - Target progress indicators
// - Interactive hover states
```

#### Hero Section Enhancements
```typescript
// Enhanced hero with personalization
interface DashboardHeroProps {
  user: User | null;
  welcomeMessage: string;
  quickStats: {
    recentAdditions: number;
    streak: number;
    nextGoal: string;
  };
  quickActions: QuickAction[];
}

// Features:
// - Personalized greeting
// - Dynamic quick stats
// - Contextual quick actions
// - Progress streaks
```

## Data Integration

### 1. Dashboard Data Hook
```typescript
// src/hooks/useDashboardData.ts
export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data with caching
  // Handle loading states
  // Provide refresh mechanism
  
  return { data, loading, error, refresh };
}
```

### 2. Mock Data for Development
```typescript
// src/lib/mock/dashboardData.ts
export const mockDashboardData: DashboardData = {
  // Complete mock data structure
  // Different states for signed in/out users
  // Realistic test data
};
```

### 3. Database Queries
```typescript
// src/lib/db/dashboard.ts
export async function getUserDashboardData(userId: string): Promise<DashboardData> {
  // Collection statistics
  // Recent activity aggregation
  // Achievement progress calculation
  // Market insights compilation
}
```

## Responsive Design Implementation

### 1. CSS Grid Layout
```css
/* Dashboard grid system */
.dashboard-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

/* Large screens: 3 columns */
@media (min-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Medium screens: 2 columns */
@media (min-width: 768px) and (max-width: 1199px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Small screens: 1 column */
@media (max-width: 767px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
```

### 2. Component Sizing Strategy
- **Panel Heights**: Consistent min-height with auto overflow
- **Content Density**: More compact on mobile, expanded on desktop  
- **Image Handling**: Responsive card thumbnails with lazy loading
- **Text Scaling**: Responsive typography using clamp()

## Performance Optimizations

### 1. Loading Strategy
```typescript
// Progressive loading of dashboard sections
const [coreLoaded, setCoreLoaded] = useState(false);
const [enhancementsLoaded, setEnhancementsLoaded] = useState(false);

// Load order:
// 1. Hero + Stats (critical)
// 2. Quick Actions + Activity (important)
// 3. Other widgets (progressive enhancement)
```

### 2. Caching Strategy
- Dashboard data cached for 5 minutes
- User stats cached for 1 hour
- Market data refreshed every 15 minutes
- Activity feed real-time with fallback

### 3. Code Splitting
```typescript
// Lazy load dashboard widgets
const QuickActionsPanel = lazy(() => import('./QuickActionsPanel'));
const ActivityFeed = lazy(() => import('./ActivityFeed'));
// etc.
```

## Animation and Interaction Design

### 1. Micro-interactions
```css
/* Hover effects for dashboard panels */
.dashboard-panel {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.dashboard-panel:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* Progress bar animations */
.progress-bar {
  animation: progressFill 1s ease-out;
}

@keyframes progressFill {
  from { width: 0; }
  to { width: var(--progress-percentage); }
}
```

### 2. Loading States
- Skeleton screens for each widget type
- Staggered loading animations
- Smooth transitions between states

## Implementation Priority

### Phase 1: Core Dashboard (Week 1)
1. ✅ Update main page layout structure
2. ✅ Create QuickActionsPanel component
3. ✅ Enhance DashboardStats with charts
4. ✅ Build ActivityFeed component
5. ✅ Implement responsive grid system

### Phase 2: Advanced Features (Week 2)
1. AchievementProgress component
2. CollectionHighlights component  
3. SetCompletionList component
4. Enhanced hero section

### Phase 3: Community & Market (Week 3)
1. TradingPanel component
2. MarketInsights component
3. UpcomingFeatures component
4. Real data integration

### Phase 4: Polish & Performance (Week 4)
1. Animation and micro-interactions
2. Performance optimizations
3. Accessibility improvements
4. User testing and refinements

## Integration Points

### 1. Authentication States
```typescript
// Different dashboard configurations
if (!user) {
  // Demo mode with sample data
  // Strong CTAs for sign up
} else if (user.isNewUser) {
  // Onboarding hints
  // Setup wizard
} else {
  // Full dashboard with real data
}
```

### 2. Feature Flags
```typescript
// Gradual rollout of new features
const features = {
  achievements: useFeatureFlag('achievements'),
  trading: useFeatureFlag('trading'),
  marketInsights: useFeatureFlag('market-insights'),
};
```

### 3. Analytics Integration
```typescript
// Track dashboard engagement
trackEvent('dashboard_widget_click', {
  widget: 'quick_actions',
  action: 'add_cards'
});
```

This technical specification provides a complete blueprint for transforming the Lumidex dashboard into a professional, feature-rich collection management interface.