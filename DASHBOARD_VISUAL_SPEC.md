# Lumidex v2 Dashboard Visual Specification

## Design System Integration

### Color Palette (Using Aurora Crimson Theme)
```css
/* Existing theme colors - DO NOT CHANGE */
--bg: #0f1220;            /* Background */
--panel: #171a2b;         /* Widget backgrounds */
--panel-2: #1e2236;       /* Hover states */
--text: #e6e7ee;          /* Primary text */
--muted: #a0a3b1;         /* Secondary text */
--border: #262a41;        /* Borders */
--brand: #ef4444;         /* Crimson accent */
--brand-2: #8b5cf6;       /* Purple accent */
--accent: #f97316;        /* Orange accent */

/* New dashboard-specific utilities */
--success-bg: rgba(34, 197, 94, 0.1);
--warning-bg: rgba(245, 158, 11, 0.1);
--info-bg: rgba(139, 92, 246, 0.1);
--crimson-bg: rgba(239, 68, 68, 0.1);
```

### Typography Scale
```css
/* Dashboard-specific text sizes */
.text-dashboard-title { font-size: 1.125rem; font-weight: 600; } /* 18px */
.text-dashboard-subtitle { font-size: 0.875rem; font-weight: 500; } /* 14px */
.text-dashboard-body { font-size: 0.8125rem; font-weight: 400; } /* 13px */
.text-dashboard-caption { font-size: 0.75rem; font-weight: 400; } /* 12px */
.text-dashboard-value { font-size: 1.5rem; font-weight: 700; } /* 24px */
```

## Component Visual Specifications

### 1. Enhanced Hero Section
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [32px padding top/bottom, container max-width]                             │
│                                                                             │
│   ┌─ Avatar ─┐  Welcome back, [Username]! 👋                              │
│   │ [48x48]  │  Your collection has grown by 12 cards this week           │
│   └──────────┘                                                             │
│                                                                             │
│   ┌─ Quick Action ─┐ ┌─ Quick Action ─┐ ┌─ Quick Action ─┐                │
│   │ 📋 Add Cards   │ │ 🔍 Search      │ │ 📊 Analytics   │                │
│   │ [120x40px]     │ │ [120x40px]     │ │ [120x40px]     │                │
│   └────────────────┘ └────────────────┘ └────────────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Specifications:
- Background: var(--bg)
- Text: Welcome message in var(--text), stats in var(--muted)
- Avatar: 48x48px with aurora gradient border
- Quick actions: btn-ghost style, 8px gap between
- Mobile: Stack vertically, full-width buttons
```

### 2. Enhanced Stats Row
```
┌─ Collection Value ─┐ ┌─ Total Cards ─┐ ┌─ Sets Progress ─┐ ┌─ This Week ─┐
│ €1,234.56         │ │ 142           │ │ 3/8            │ │ +12         │
│ [28px font-size]   │ │ [28px]        │ │ [28px]         │ │ [28px]      │
│                   │ │               │ │                │ │             │
│ ↗ +5.2% (+€64)    │ │ ▲ +12 cards   │ │ 🏆 37.5%       │ │ 🔥 3 streak │
│ [success color]    │ │ [muted]       │ │ [brand]        │ │ [accent]    │
│                   │ │               │ │ ████████░░     │ │             │
│ [Mini Chart SVG]   │ │ [Bar Chart]   │ │ [Progress Bar] │ │ [Trend Icon]│
│ [60px height]      │ │ [40px]        │ │ [8px height]   │ │ [24px]      │
└───────────────────┘ └───────────────┘ └────────────────┘ └─────────────┘

Specifications:
- Panel: 280px width, auto height, 24px padding
- Value text: var(--text), 28px font-size, font-weight 700
- Trend indicators: success/danger colors, 14px font-size
- Charts: Simple SVG or CSS-based, var(--brand) color
- Progress bars: 8px height, rounded, aurora gradient
- Mobile: 2x2 grid, then 1x4 on small screens
```

### 3. Dashboard Widget Grid
```
┌─ Quick Actions ──────────────┐ ┌─ Recent Activity ─────────────────────────┐
│ [280px min-width]            │ │ [420px min-width]                         │
│                              │ │                                           │
│ ┌────┐ ┌────┐ ┌────┐        │ │ 🎴 Added Charizard ex              €45.50 │
│ │📋  │ │🔍  │ │📊  │        │ │ 2 minutes ago                             │
│ │Add │ │Sea │ │Ana │        │ │                                           │
│ └────┘ └────┘ └────┘        │ │ 🏆 Completed Base Set Booster            │
│                              │ │ 1 hour ago                                │
│ ┌────┐ ┌────┐ ┌────┐        │ │                                           │
│ │🎯  │ │📈  │ │🤝  │        │ │ 📈 Price alert: Pikachu +15%             │
│ │Goa │ │Tre │ │Tra │        │ │ 3 hours ago                               │
│ └────┘ └────┘ └────┘        │ │                                           │
│                              │ │ 💬 Trade request from @user123           │
│ [60px button height]         │ │ 5 hours ago                               │
│ [8px gap between]            │ │                                           │
│                              │ │ [View All Activity →]                     │
└──────────────────────────────┘ └───────────────────────────────────────────┘

┌─ Achievement Progress ───────┐ ┌─ Collection Highlights ───────────────────┐
│ 🏆 Collection Master         │ │ ┌─ Most Valuable ─┐ ┌─ Recent Addition ─┐│
│ ████████░░ 8/10 (80%)       │ │ │ [Card Image]     │ │ [Card Image]     ││
│ [24px progress bar height]   │ │ │ [120x168px]      │ │ [120x168px]      ││
│                              │ │ │ Charizard        │ │ Pikachu Promo    ││
│ 💎 High Roller               │ │ │ Base Set         │ │ XY Series        ││
│ ██████░░░░ 6/10 (60%)       │ │ │ €234.50          │ │ €12.30          ││
│                              │ │ └──────────────────┘ └──────────────────┘│
│ 📈 Market Watcher           │ │                                          │
│ ███░░░░░░░ 3/10 (30%)       │ │ [View Collection →]                      │
│                              │ │                                          │
│ [View All →]                 │ │ [Hover: scale(1.02), shadow-lg]         │
└──────────────────────────────┘ └──────────────────────────────────────────┘

Widget Specifications:
- Minimum width: 280px
- Padding: 24px
- Border radius: 16px (panel class)
- Gap between widgets: 24px
- Background: var(--panel)
- Border: 1px solid var(--border)
```

### 4. Component Interaction States

#### Quick Actions Buttons
```css
/* Base state */
.quick-action-btn {
  width: 80px;
  height: 60px;
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: all 0.2s ease;
}

/* Hover state */
.quick-action-btn:hover {
  background: var(--brand-2);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(139, 92, 246, 0.25);
}

/* Icon styling */
.quick-action-icon {
  font-size: 20px;
  margin-bottom: 4px;
}

/* Label styling */
.quick-action-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
}
```

#### Activity Feed Items
```css
.activity-item {
  padding: 12px 16px;
  border-radius: 8px;
  transition: background-color 0.15s ease;
}

.activity-item:hover {
  background: var(--panel-2);
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.activity-card { background: var(--crimson-bg); }
.activity-achievement { background: var(--warning-bg); }
.activity-price { background: var(--success-bg); }
.activity-trade { background: var(--info-bg); }
```

#### Progress Bars
```css
.progress-container {
  width: 100%;
  height: 8px;
  background: var(--panel-2);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--brand) 0%, var(--brand-2) 100%);
  border-radius: 4px;
  transition: width 0.8s ease-out;
  animation: progressGlow 2s ease-in-out infinite alternate;
}

@keyframes progressGlow {
  0% { box-shadow: 0 0 5px rgba(239, 68, 68, 0.3); }
  100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.6); }
}
```

## Responsive Breakpoints

### Desktop (1200px+)
```
┌─ Hero Section ──────────────────────────────────────────────────────────────┐
├─ Stats Row (4 columns) ─────────────────────────────────────────────────────┤
├─ Dashboard Grid ────────────────────────────────────────────────────────────┤
│ [Quick Actions] [Recent Activity ────] [Achievement Progress]               │
│ [Set Progress ] [Collection Highlights] [Trading Panel ──]                 │
│ [Market Insights] [Upcoming Features──] [               ]                   │
└─ CTA Section ──────────────────────────────────────────────────────────────┘

Grid: 3 columns, 1fr 1.5fr 1fr (280px 420px 280px minimum)
```

### Tablet (768px - 1199px)
```
┌─ Hero Section ──────────────────────────────────────────┐
├─ Stats Row (2x2 grid) ──────────────────────────────────┤
├─ Dashboard Grid ────────────────────────────────────────┤
│ [Quick Actions ──────] [Recent Activity ───────────────]│
│ [Achievement Progress] [Collection Highlights ─────────]│
│ [Set Progress ───────] [Trading Panel ─────────────────]│
│ [Market Insights ────] [Upcoming Features ─────────────]│
└─ CTA Section ──────────────────────────────────────────┘

Grid: 2 columns, 1fr 1.5fr
```

### Mobile (< 768px)
```
┌─ Hero Section ──────────────────┐
├─ Stats Row (1x4 stack) ─────────┤
├─ Dashboard Widgets (stacked) ───┤
│ [Quick Actions ────────────────]│
│ [Recent Activity ──────────────]│
│ [Achievement Progress ─────────]│
│ [Collection Highlights ────────]│
│ [Set Progress ─────────────────]│
│ [Trading Panel ────────────────]│
│ [Market Insights ──────────────]│
│ [Upcoming Features ────────────]│
└─ CTA Section ──────────────────┘

Grid: 1 column, full width
```

## Animation Specifications

### Page Load Sequence
```css
/* Staggered fade-in animation */
.dashboard-hero { animation: fadeInUp 0.5s ease-out 0.1s both; }
.dashboard-stats { animation: fadeInUp 0.5s ease-out 0.2s both; }
.dashboard-widget:nth-child(1) { animation: fadeInUp 0.5s ease-out 0.3s both; }
.dashboard-widget:nth-child(2) { animation: fadeInUp 0.5s ease-out 0.4s both; }
.dashboard-widget:nth-child(3) { animation: fadeInUp 0.5s ease-out 0.5s both; }

@keyframes fadeInUp {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Interactive Feedback
```css
/* Hover animations */
.dashboard-widget {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.dashboard-widget:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

/* Click feedback */
.dashboard-widget:active {
  transform: translateY(-2px);
  transition: transform 0.1s ease;
}

/* Progress bar animation */
.progress-fill {
  animation: fillProgress 1.5s ease-out;
}

@keyframes fillProgress {
  0% { width: 0; }
  100% { width: var(--progress-value); }
}
```

## Accessibility Considerations

### Color Contrast
- All text maintains WCAG AA compliance (4.5:1 ratio)
- Interactive elements have 3:1 contrast minimum
- Focus indicators use high-contrast aurora gradient outline

### Screen Reader Support
```html
<!-- Example: Progress bar with proper ARIA -->
<div role="progressbar" 
     aria-valuenow="8" 
     aria-valuemin="0" 
     aria-valuemax="10"
     aria-label="Collection Master achievement: 8 out of 10 completed">
  <div class="progress-fill" style="width: 80%"></div>
</div>

<!-- Example: Activity feed with semantic markup -->
<section aria-label="Recent Activity">
  <ul role="list">
    <li role="listitem">
      <time datetime="2024-01-15T14:30:00Z">2 minutes ago</time>
      <span>Added Charizard ex for €45.50</span>
    </li>
  </ul>
</section>
```

### Keyboard Navigation
- Tab order follows logical reading sequence
- All interactive elements focusable with keyboard
- Skip links for dashboard sections
- Arrow key navigation within widget grids

## Performance Specifications

### Image Optimization
```typescript
// Card image specifications
interface CardImageProps {
  src: string;
  alt: string;
  width: 120;
  height: 168;
  loading: 'lazy';
  sizes: '(max-width: 768px) 50vw, 120px';
}

// Responsive image handling
const cardImageSizes = {
  mobile: { width: 80, height: 112 },
  tablet: { width: 100, height: 140 },
  desktop: { width: 120, height: 168 }
};
```

### Loading States
```html
<!-- Skeleton for dashboard widgets -->
<div class="dashboard-widget">
  <div class="skeleton-header">
    <div class="skeleton-line w-24 h-4"></div>
  </div>
  <div class="skeleton-content">
    <div class="skeleton-line w-full h-3 mb-2"></div>
    <div class="skeleton-line w-3/4 h-3 mb-2"></div>
    <div class="skeleton-line w-1/2 h-3"></div>
  </div>
</div>
```

This visual specification provides pixel-perfect guidance for implementing the professional dashboard redesign while maintaining the beautiful Aurora Crimson theme and ensuring excellent user experience across all devices.