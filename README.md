# Lumidex v2 - Pokemon TCG Collection Manager

A modern, full-stack Pokemon Trading Card Game collection management application built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## 🎯 Features

- **Browse Sets & Cards**: Explore Pokemon TCG sets and search through thousands of cards
- **Real-time Pricing**: View current market prices from Cardmarket and TCGplayer
- **Collection Management**: Track your personal card collection with quantities and conditions
- **Price Source Toggle**: Switch between Cardmarket and TCGplayer pricing seamlessly
- **Advanced Search**: Filter cards by type, rarity, regulation mark, and more
- **Responsive Design**: Optimized for desktop and mobile devices
- **Authentication**: Secure user accounts with magic link sign-in

## 🏗️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth (Email Magic Links)
- **Data Source**: Pokemon TCG API v2
- **Deployment**: Vercel (Frontend) + Supabase (Backend)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Pokemon TCG API v2 key
- Vercel account (for deployment)

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/lumidex-v2.git
cd lumidex-v2
npm install
```

### 2. Environment Setup

Copy the environment template:

```bash
cp .env.example .env.local
```

Fill in your credentials in `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_PROJECT_REF=your_supabase_project_ref

# Pokemon TCG API
POKEMONTCG_API_KEY=your_pokemontcg_api_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Database Setup

Link your Supabase project:

```bash
npx supabase link --project-ref your_project_ref
```

Run database migrations:

```bash
npm run db:push
```

Generate TypeScript types:

```bash
npm run types:gen
```

### 4. Data Ingestion (Optional)

Populate your database with Pokemon TCG data:

```bash
# Import sets (required first)
npm run ingest:sets

# Import cards and pricing data
npm run ingest:cards
```

For incremental updates:

```bash
npm run ingest:cards -- --since 2024-01-01
```

### 5. Start Development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

## 📁 Project Structure

```
lumidex-v2/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (site)/            # Main site routes
│   │   │   ├── layout.tsx     # Root layout
│   │   │   ├── page.tsx       # Homepage
│   │   │   ├── sets/          # Sets browsing
│   │   │   ├── cards/         # Cards search
│   │   │   └── collection/    # User collection
│   │   ├── sets/[id]/         # Set details
│   │   ├── auth/              # Authentication routes
│   │   └── globals.css        # Global styles
│   ├── components/            # Reusable UI components
│   │   ├── layout/            # Layout components
│   │   ├── sets/              # Set-related components
│   │   ├── cards/             # Card-related components
│   │   ├── collection/        # Collection components
│   │   ├── auth/              # Authentication components
│   │   └── ui/                # Generic UI components
│   ├── lib/                   # Core utilities
│   │   ├── supabase/          # Database clients
│   │   ├── pokeapi/           # Pokemon TCG API integration
│   │   ├── variants/          # Price variant normalization
│   │   └── db/                # Database queries
│   └── types/                 # TypeScript definitions
├── scripts/
│   └── ingest/                # Data ingestion scripts
├── supabase/
│   ├── migrations/            # Database migrations
│   └── backups/               # Database backups
└── docs/                      # Documentation
```

## 🗄️ Database Schema

The application uses a PostgreSQL database with the following key tables:

- **`tcg_sets`**: Pokemon TCG set information
- **`tcg_cards`**: Individual card data with metadata
- **`tcg_card_prices`**: Price data from multiple sources with variant mapping
- **`profiles`**: User profiles linked to Supabase Auth
- **`collection_items`**: User collection data with RLS protection

See [`MIGRATION_NOTES.md`](MIGRATION_NOTES.md) for detailed schema documentation.

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Apply Supabase migrations |
| `npm run types:gen` | Generate TypeScript types from database |
| `npm run db:dump:schema` | Export database schema |
| `npm run db:dump:data` | Export database data |
| `npm run ingest:sets` | Import TCG sets from API |
| `npm run ingest:cards` | Import cards and pricing data |

## 🔒 Authentication

The application uses Supabase Auth with email magic links:

1. Users enter their email address
2. Supabase sends a magic link via email
3. Clicking the link authenticates the user
4. User profiles are automatically created on first sign-in

## 💰 Price Data & Variants

The application normalizes card variant names from different price sources:

- **Cardmarket**: EUR pricing with variants like "normal", "holofoil", "reverse_holofoil"
- **TCGplayer**: USD pricing with variants like "1stEditionHolofoil", "unlimited"

Our variant mapper ensures consistent internal representation regardless of the source.

## 🚀 Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_PROJECT_REF`
   - `POKEMONTCG_API_KEY`
   - `NEXT_PUBLIC_APP_URL` (your Vercel domain)

3. Deploy!

**Important**: Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. It's only used in server-side ingestion scripts.

## 🔧 Configuration

### Supabase Configuration

1. Create a new Supabase project
2. Enable Email Auth in Authentication settings
3. Configure email templates (optional)
4. Set up custom SMTP (optional, but recommended for production)

### Pokemon TCG API

1. Sign up at [pokemontcg.io](https://pokemontcg.io/)
2. Generate an API key
3. Add it to your environment variables

## 📈 Performance Features

- **Strategic Database Indexing**: Optimized queries for sets, cards, and prices
- **Row Level Security**: Secure user data isolation
- **Server Components**: Default to server-side rendering
- **ISR (Incremental Static Regeneration)**: Cache static content with revalidation
- **Image Optimization**: Next.js automatic image optimization
- **Batch Processing**: Efficient data ingestion with chunked operations

## 🛠️ Development Tips

### Local Development

- Use `npm run dev` for hot reloading
- Database changes require `npm run db:push` and `npm run types:gen`
- Test ingestion scripts with small datasets first

### Data Management

- Run ingestion scripts during low-traffic periods
- Use incremental ingestion for regular updates
- Monitor database storage and optimize as needed

### Authentication Testing

- Test magic link flow in incognito mode
- Verify RLS policies work correctly
- Test sign-out and re-authentication flows

## 📚 API Endpoints

The application uses Pokemon TCG API v2 endpoints:

- `GET /v2/sets` - Fetch TCG sets
- `GET /v2/cards` - Fetch cards with filtering and pagination
- `GET /v2/sets/{id}` - Fetch specific set details
- `GET /v2/cards?q=set.id:{setId}` - Fetch cards for a specific set

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Pokemon TCG API](https://pokemontcg.io/) for providing comprehensive card data
- [Supabase](https://supabase.com/) for the excellent backend-as-a-service platform
- [Next.js](https://nextjs.org/) for the amazing React framework
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/lumidex-v2/issues) page
2. Review the [`MIGRATION_NOTES.md`](MIGRATION_NOTES.md) for detailed technical documentation
3. Create a new issue with detailed reproduction steps

---

**Happy collecting!** 🎴✨