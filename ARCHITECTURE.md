# Lumidex v2 - System Architecture

## Overview

Lumidex v2 is a full-stack Pokemon TCG collection management application built with modern web technologies. It provides users with the ability to browse Pokemon cards, track their collection, and view real-time pricing data from multiple sources.

## Technology Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Server Components
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth (Email Magic Links)
- **External API**: Pokemon TCG API v2
- **Deployment**: Vercel (Frontend) + Supabase (Backend Services)
- **Package Manager**: npm

## System Architecture

```mermaid
graph TB
    User[User Browser] --> NextJS[Next.js Frontend]
    NextJS --> SupabaseClient[Supabase Client]
    NextJS --> PTCGAPI[Pokemon TCG API v2]
    
    SupabaseClient --> SupabaseDB[(Supabase Database)]
    SupabaseClient --> SupabaseAuth[Supabase Auth]
    
    IngestScripts[Ingestion Scripts] --> PTCGAPI
    IngestScripts --> SupabaseService[Supabase Service Role]
    SupabaseService --> SupabaseDB
    
    subgraph "Next.js App"
        ServerComponents[Server Components]
        ClientComponents[Client Components]
        APIRoutes[API Routes]
    end
    
    subgraph "Supabase Backend"
        SupabaseDB
        SupabaseAuth
        RLS[Row Level Security]
    end
```

## Database Schema

### Core Entities

```mermaid
erDiagram
    tcg_sets ||--o{ tcg_cards : contains
    tcg_cards ||--o{ tcg_card_prices : has_prices
    tcg_cards ||--o{ collection_items : collected_as
    profiles ||--o{ collection_items : owns
    
    tcg_sets {
        text id PK
        text name
        text series
        text ptcgo_code
        int printed_total
        int total
        date release_date
        timestamptz updated_at
        jsonb legalities
        jsonb images
    }
    
    tcg_cards {
        text id PK
        text set_id FK
        text number
        text name
        text supertype
        text_array subtypes
        text hp
        text_array types
        text evolves_from
        text_array rules
        text regulation_mark
        text artist
        text rarity
        text flavor_text
        int_array national_pokedex_numbers
        jsonb legalities
        jsonb images
        timestamptz updated_at
    }
    
    tcg_card_prices {
        text card_id FK
        price_source source
        variant_name variant
        timestamptz last_updated
        text currency
        numeric low
        numeric mid
        numeric high
        numeric market
        numeric direct_low
        text url
    }
    
    profiles {
        uuid id PK
        text username
        timestamptz created_at
    }
    
    collection_items {
        bigserial id PK
        uuid user_id FK
        text card_id FK
        variant_name variant
        int quantity
        text condition
        date acquired_at
        text notes
    }
```

### Enums

- **variant_name**: `normal`, `holofoil`, `reverse_holofoil`, `first_edition_normal`, `first_edition_holofoil`, `unlimited`
- **price_source**: `cardmarket`, `tcgplayer`

### Access Control

- **Public Tables** (no RLS): `tcg_sets`, `tcg_cards`, `tcg_card_prices`
- **User Tables** (RLS enabled): `profiles`, `collection_items`

## Data Flow Architecture

### Ingestion Pipeline

```mermaid
flowchart LR
    PTCGAPI[Pokemon TCG API v2] --> IngestSets[Sets Ingestion]
    PTCGAPI --> IngestCards[Cards Ingestion]
    
    IngestSets --> DB_Sets[(tcg_sets)]
    IngestCards --> DB_Cards[(tcg_cards)]
    IngestCards --> PriceMapping[Variant Price Mapping]
    PriceMapping --> DB_Prices[(tcg_card_prices)]
    
    subgraph "Price Processing"
        TCGPlayer[TCGPlayer Prices] --> VariantMapper[Variant Mapper]
        Cardmarket[Cardmarket Prices] --> VariantMapper
        VariantMapper --> NormalizedPrices[Normalized Price Data]
    end
    
    NormalizedPrices --> DB_Prices
```

### User Data Flow

```mermaid
flowchart TB
    User --> Auth[Supabase Auth]
    Auth --> Profile[User Profile]
    
    User --> Browse[Browse Cards/Sets]
    Browse --> PublicData[Public TCG Data]
    
    User --> Collection[Manage Collection]
    Collection --> RLS[Row Level Security]
    RLS --> UserData[User Collection Data]
    
    subgraph "Price Source Toggle"
        CardmarketPrices[Cardmarket Prices]
        TCGPlayerPrices[TCGPlayer Prices]
        PriceToggle[Price Source Selection]
    end
    
    Browse --> PriceToggle
    Collection --> PriceToggle
```

## Component Architecture

### App Router Structure

```
src/app/
├── (site)/
│   ├── layout.tsx           # Main layout with nav & price toggle
│   ├── page.tsx            # Landing page
│   ├── sets/
│   │   ├── page.tsx        # Sets listing
│   │   └── [id]/
│   │       └── page.tsx    # Set details with cards
│   ├── cards/
│   │   └── page.tsx        # Cards search & browse
│   └── collection/
│       └── page.tsx        # User collection (auth required)
└── api/                    # API routes (if needed)
```

### Key Components

- **Server Components** (default): Page layouts, data fetching, static content
- **Client Components**: Interactive forms, toggles, real-time updates, search filters

## Authentication & Authorization

### Supabase Auth Integration

```mermaid
sequenceDiagram
    participant User
    participant NextJS
    participant SupabaseAuth
    participant Database
    
    User->>NextJS: Access protected route
    NextJS->>SupabaseAuth: Check auth status
    SupabaseAuth-->>NextJS: User session/null
    
    alt Authenticated
        NextJS->>Database: Query with RLS
        Database-->>NextJS: User-specific data
        NextJS-->>User: Render protected content
    else Not Authenticated
        NextJS-->>User: Redirect to sign-in
        User->>SupabaseAuth: Email sign-in
        SupabaseAuth-->>User: Magic link email
        User->>SupabaseAuth: Click magic link
        SupabaseAuth->>Database: Create/update profile
        SupabaseAuth-->>NextJS: Authenticated session
    end
```

### RLS Policies

- **profiles**: Users can only access their own profile data
- **collection_items**: Users can only CRUD their own collection items

## Variant Normalization System

### External to Internal Mapping

```typescript
// TCGPlayer → Internal
const tcgplayerVariants = {
  'normal': 'normal',
  'holofoil': 'holofoil', 
  'reverseHolofoil': 'reverse_holofoil',
  '1stEditionNormal': 'first_edition_normal',
  '1stEditionHolofoil': 'first_edition_holofoil',
  'unlimited': 'unlimited'
}

// Cardmarket → Internal  
const cardmarketVariants = {
  'normal': 'normal',
  'holofoil': 'holofoil',
  'reverseHolofoil': 'reverse_holofoil', 
  'unlimited': 'unlimited'
  // Note: Cardmarket 1st edition mapped to normal/holofoil
}
```

## Performance Strategy

### Database Optimizations

- **Indexes**: 
  - `tcg_sets.release_date` for chronological queries
  - `tcg_cards.set_id` for set-based filtering
  - `tcg_cards.updated_at` for incremental ingestion
  - GIN index on `tcg_cards.types` for array searches
  - Composite index on `tcg_card_prices(source, variant)`

### Caching Strategy

- **Static Generation**: Sets and cards pages with ISR
- **Server Components**: Default for data fetching
- **Client Components**: Minimal, only for interactivity

## Deployment Architecture

```mermaid
graph TB
    GitHub[GitHub Repository] --> Vercel[Vercel Deployment]
    Vercel --> NextJSApp[Next.js Application]
    
    NextJSApp --> SupabaseProd[Supabase Production]
    
    subgraph "Environment Variables"
        ProdEnv[Production Env Vars]
        DevEnv[Development Env Vars]
    end
    
    subgraph "Supabase Services"
        Database[(PostgreSQL)]
        Auth[Authentication]
        Storage[File Storage]
    end
    
    SupabaseProd --> Database
    SupabaseProd --> Auth
    SupabaseProd --> Storage
    
    IngestCron[Scheduled Ingestion] --> PTCGAPI[Pokemon TCG API]
    IngestCron --> Database
```

### Environment Configuration

**Required Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- `SUPABASE_PROJECT_REF`
- `POKEMONTCG_API_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NODE_ENV`

## Implementation Phases

### Phase 1: Foundation
- Project setup and repository creation
- Database schema and migrations
- Supabase integration
- Basic project structure

### Phase 2: Data Layer
- Variant normalization system
- Ingestion scripts for sets and cards
- Price data processing
- Data validation and error handling

### Phase 3: Core Features
- Main layout and navigation
- Sets browsing and details
- Cards search and filtering
- Price source toggle implementation

### Phase 4: User Features  
- Authentication integration
- User profiles and collection management
- CRUD operations for collection items
- Collection value calculations

### Phase 5: Polish & Deploy
- Performance optimizations
- Documentation and README
- Vercel deployment configuration
- Acceptance testing and validation

## Success Criteria

1. **Data Integrity**: All Pokemon TCG data properly ingested without constraint errors
2. **Authentication**: Secure user authentication with proper RLS enforcement
3. **Price Accuracy**: Correct variant mapping and price display from both sources
4. **Performance**: Fast page loads and responsive user interactions
5. **Deployment**: Successful production deployment with proper environment configuration

This architecture provides a solid foundation for building a scalable, maintainable Pokemon TCG collection management application with modern web development best practices.