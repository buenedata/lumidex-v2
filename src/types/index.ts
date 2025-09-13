// Database type definitions based on Supabase schema

export type VariantName =
  | 'normal'
  | 'holofoil'
  | 'reverse_holofoil'
  | 'first_edition_normal'
  | 'first_edition_holofoil'
  | 'unlimited'

export type PriceSource = 'cardmarket' | 'tcgplayer'

export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'NOK'

export type TCGType =
  | 'pokemon'
  | 'lorcana'
  | 'magic'
  | 'yugioh'
  | 'digimon'
  | 'onepiece'

export type TCGSet = {
  id: string
  name: string
  series: string | null
  tcg_type: TCGType
  ptcgo_code: string | null
  printed_total: number | null
  total: number | null
  release_date: string | null
  updated_at: string
  legalities: Record<string, any>
  images: Record<string, any>
}

export type TCGCard = {
  id: string
  set_id: string
  number: string
  name: string
  supertype: string | null
  subtypes: string[]
  hp: string | null
  types: string[]
  evolves_from: string | null
  rules: string[]
  regulation_mark: string | null
  artist: string | null
  rarity: string | null
  flavor_text: string | null
  national_pokedex_numbers: number[]
  legalities: Record<string, any>
  images: Record<string, any>
  updated_at: string
}

export type TCGCardPrice = {
  card_id: string
  source: PriceSource
  variant: VariantName
  last_updated: string
  currency: string
  low: number | null
  mid: number | null
  high: number | null
  market: number | null
  direct_low: number | null
  url: string | null
}

export type Profile = {
  id: string
  username: string | null
  display_name: string | null
  bio: string | null
  location: string | null
  website: string | null
  avatar_url: string | null
  banner_url: string | null
  preferred_currency: CurrencyCode
  preferred_price_source: PriceSource
  created_at: string
  updated_at: string | null
}

export type UserPreferences = {
  preferred_currency: CurrencyCode
  preferred_price_source: PriceSource
}

export type CollectionItem = {
  id: number
  user_id: string
  card_id: string
  variant: VariantName
  quantity: number
  condition: string | null
  acquired_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Extended types with joined data for UI components
export type CollectionItemWithCard = CollectionItem & {
  card: TCGCard & {
    set: TCGSet
    prices?: TCGCardPrice[]
  }
}

export type CardWithPrice = TCGCard & {
  set: TCGSet
  current_price?: number
  price_source?: PriceSource
  price_variant?: VariantName
}