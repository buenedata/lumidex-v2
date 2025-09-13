# User Profile Page Architecture Specification

## Design Philosophy
**Personal Collection Sanctuary**: The profile page is where users dive deep into their personal collection management, analytics, and detailed progress tracking with full customization options.

## Profile Page Layout (Personal Focus)

### 1. Enhanced Profile Header with Custom Visuals
```
┌─ Custom Profile Header ─────────────────────────────────────────────────────┐
│ [Custom Banner Image - 1200x300px]                                         │
│ ┌─ Pokemon TCG Collection Background ──────────────────────────┐ [Edit]    │
│ │ [User's uploaded banner - trading cards, collection photos] │            │
│ │                                                              │            │
│ │ [Custom Avatar]  CardMaster92                               │            │
│ │ [120x120px]      Level 12 Collector • 1,240 XP            │            │
│ │ [Upload/Edit]    Member since March 2023 • 847 cards       │            │
│ │                  🏆 #3 on Most Cards Leaderboard           │            │
│ └──────────────────────────────────────────────────────────────┘            │
│                                                                             │
│ [📸 Change Banner] [👤 Change Avatar] [✏️ Edit Profile] [⚙️ Settings]      │
│                                                                             │
│ [Collection] [Analytics] [Achievements] [Trading] [Goals] [Settings]        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Features**:
- **Custom Banner Upload**: 1200x300px hero image (collection photos, favorite cards, etc.)
- **Custom Avatar Upload**: 120x120px profile picture with crop/resize tools
- **Edit Controls**: Prominent buttons to change visuals anytime
- **User Info Overlay**: Stats and achievements displayed over custom background
- **Responsive Design**: Banner scales on mobile, avatar remains prominent

### 2. Avatar & Banner Management System
```
┌─ Profile Customization Hub ─────────────────────────────────────────────────┐
│                                                                             │
│ 👤 Avatar Options:                      🖼️ Banner Options:                 │
│ ┌─ Current ─┐ ┌─ Upload ─┐ ┌─ Gallery ┐ ┌─ Current ─────────────────────────┐ │
│ │ [Avatar]  │ │ [Upload] │ │ [Browse] │ │ [Banner Preview]                  │ │
│ │ 120x120   │ │ New      │ │ Library  │ │ 1200x300                          │ │
│ └───────────┘ └──────────┘ └──────────┘ └───────────────────────────────────┘ │
│                                                                             │
│ 🎨 Templates & Presets:                 📁 Your Uploads:                    │
│ • Pokemon TCG Card Backgrounds          • 5 custom avatars saved            │
│ • Achievement Badge Frames              • 3 collection banners saved        │
│ • Collection Theme Presets              • 2 card showcase banners           │
│                                                                             │
│ 🔧 Edit Tools:                          💾 Save Options:                   │
│ [Crop & Resize] [Filters] [Text Overlay] [Save to Library] [Set as Default] │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Features**:
- **Upload System**: Drag & drop or file browser for images
- **Crop Tools**: Built-in editor for perfect sizing
- **Template Gallery**: Pre-made Pokemon TCG themed options
- **Personal Library**: Save multiple options to switch between
- **Edit Tools**: Filters, text overlay, and customization options

### 3. Collection Analytics Dashboard
```
┌─ Personal Collection Analytics ─────────────────────────────────────────────┐
│                                                                             │
│ ┌─ Total Value ────┐ ┌─ Total Cards ────┐ ┌─ Sets Completed ┐ ┌─ This Month ┐
│ │ €1,847.32       │ │ 847 cards        │ │ 3/8 sets        │ │ +47 cards   │
│ │ [Value Chart]   │ │ [Growth Chart]   │ │ [Progress Ring] │ │ [Goal Bar]  │
│ │ ↗ +12% (€197)   │ │ +47 this month   │ │ 37.5% complete  │ │ 157% of goal│
│ └─────────────────┘ └──────────────────┘ └─────────────────┘ └─────────────┘
│                                                                             │
│ 📊 Collection Breakdown:                                                    │
│ • Vintage (1998-2003): 234 cards (€1,234) ██████████████░░░░░░░░░░        │
│ • Modern (2017+): 456 cards (€456) ████████░░░░░░░░░░░░░░░░░░░░░░░        │
│ • Promos & Special: 157 cards (€157) ███░░░░░░░░░░░░░░░░░░░░░░░░░░░       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4. Achievement Progress Hub
```
┌─ Personal Achievements ─────────────────────────────────────────────────────┐
│                                                                             │
│ 🏆 Completed (12):                    🎯 In Progress (5):                  │
│ ✅ First 100 Cards                    🔄 Collection Master (847/1000)      │
│ ✅ Base Set Complete                  ████████░░ 84%                        │
│ ✅ €1000 Collection                   🔄 High Roller (€1,847/€5,000)       │
│ ✅ First Trade                        ███░░░░░░░ 37%                        │
│                                                                             │
│ 🔮 Upcoming Rewards:                  🎁 Claim Rewards:                     │
│ • 1000 Cards Badge                    • Collection Master Badge             │
│ • Trading Expert                      • Custom Avatar Frame                │
│ • Set Completionist                   • Banner Template Unlock             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Achievement Rewards Include**:
- Custom avatar frames and borders
- Exclusive banner templates
- Special badges and titles
- Profile customization unlocks

### 5. Collection Highlights Gallery
```
┌─ Collection Highlights ─────────────────────────────────────────────────────┐
│                                                                             │
│ 💎 Most Valuable:                     🆕 Recent Additions:                 │
│ ┌─ Charizard Base ─┐ ┌─ Blastoise ──┐ ┌─ Pikachu Promo ─┐ ┌─ Venusaur ───┐ │
│ │ [Card Image]     │ │ [Card Image] │ │ [Card Image]    │ │ [Card Image] │ │
│ │ €234.50         │ │ €89.99       │ │ €12.30         │ │ €67.89       │ │
│ │ PSA 9           │ │ Near Mint    │ │ Mint           │ │ Played       │ │
│ └─────────────────┘ └──────────────┘ └─────────────────┘ └──────────────┘ │
│                                                                             │
│ 📸 Feature in Banner: [Select cards to showcase in profile banner]         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Banner Integration**: Users can select favorite cards to automatically create collection showcase banners

### 6. Profile Customization Settings
```
┌─ Profile Settings & Customization ──────────────────────────────────────────┐
│                                                                             │
│ 🎨 Visual Customization:             🔒 Privacy Settings:                  │
│ • Avatar: [Change] [Upload New]      • Profile Visibility: Public          │
│ • Banner: [Change] [Upload New]      • Collection Values: Hidden           │
│ • Display Name: CardMaster92         • Trading Status: Available           │
│ • Bio: "Vintage collector since..."  • Contact: Friends Only               │
│                                                                             │
│ 📱 Profile Theme:                    🔔 Notifications:                     │
│ • Color Scheme: Aurora Crimson       • Achievement Unlocks: ✅             │
│ • Layout Style: Compact              • Trade Requests: ✅                  │
│ • Badge Display: Show All            • Price Alerts: ✅                    │
│                                                                             │
│ 💾 Media Management:                 🌐 Social Sharing:                    │
│ • Uploaded Images: 8/20 slots        • Share Profile: [Generate Link]      │
│ • Storage Used: 12.4MB / 50MB        • Export Collection: [PDF] [CSV]      │
│ • Auto-Backup: Enabled              • Social Media: [Connect Accounts]    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Avatar & Banner Technical Specifications

### Upload Requirements:
- **Avatar**: 
  - Format: JPG, PNG, WebP
  - Max size: 5MB
  - Recommended: 400x400px (displays at 120x120px)
  - Auto-crop to square aspect ratio
  
- **Banner**: 
  - Format: JPG, PNG, WebP
  - Max size: 10MB
  - Dimensions: 1200x300px (4:1 aspect ratio)
  - Auto-resize with crop options

### Storage & Management:
- **Personal Library**: 20 image slots per user
- **Cloud Storage**: Secure CDN hosting
- **Backup**: Automatic backup with profile data
- **Templates**: 50+ pre-made options
- **Moderation**: Automated content filtering

### Customization Features:
- **Crop Tools**: Drag-to-crop with preview
- **Filters**: Color correction, brightness, contrast
- **Frames**: Achievement-based avatar frames
- **Text Overlay**: Add custom text to banners
- **Collection Integration**: Auto-generate banners from favorite cards

## User Flow for Profile Customization

### First-Time Setup:
1. **Welcome Wizard**: Guide new users through profile setup
2. **Avatar Selection**: Choose from templates or upload custom
3. **Banner Creation**: Select theme or upload collection photo
4. **Preview & Save**: See profile before publishing

### Updating Profile:
1. **Quick Edit**: Hover over avatar/banner → "Change" button
2. **Edit Modal**: Upload, crop, preview in one interface
3. **Save Options**: Replace current or save to library
4. **Instant Update**: Changes reflect immediately

This enhanced profile system gives users full creative control over their presence while maintaining the professional collector community atmosphere.