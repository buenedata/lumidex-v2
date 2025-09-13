-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.card_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pokemon_tcg_id text NOT NULL UNIQUE,
  price_tracker_id text NOT NULL,
  set_id text NOT NULL,
  card_number text NOT NULL,
  card_name text NOT NULL,
  confidence text NOT NULL CHECK (confidence = ANY (ARRAY['exact'::text, 'high'::text, 'medium'::text, 'low'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT card_mappings_pkey PRIMARY KEY (id),
  CONSTRAINT fk_card_mappings_set_id FOREIGN KEY (set_id) REFERENCES public.tcg_sets(id)
);
CREATE TABLE public.card_variant_exceptions (
  id bigint NOT NULL DEFAULT nextval('card_variant_exceptions_id_seq'::regclass),
  set_id text NOT NULL,
  card_number text NOT NULL,
  exception_type text NOT NULL,
  variant_changes jsonb NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT card_variant_exceptions_pkey PRIMARY KEY (id),
  CONSTRAINT card_variant_exceptions_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.tcg_sets(id)
);
CREATE TABLE public.collection_items (
  id bigint NOT NULL DEFAULT nextval('collection_items_id_seq'::regclass),
  user_id uuid NOT NULL,
  card_id text NOT NULL,
  variant USER-DEFINED NOT NULL DEFAULT 'normal'::variant_name,
  quantity integer NOT NULL DEFAULT 1,
  condition text,
  acquired_at date,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  variant_v2 USER-DEFINED,
  CONSTRAINT collection_items_pkey PRIMARY KEY (id),
  CONSTRAINT collection_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT collection_items_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.tcg_cards(id)
);
CREATE TABLE public.custom_card_variants (
  id bigint NOT NULL DEFAULT nextval('custom_card_variants_id_seq'::regclass),
  card_id text NOT NULL,
  variant_name text NOT NULL,
  variant_type USER-DEFINED NOT NULL,
  display_name text NOT NULL,
  description text NOT NULL,
  source_product text,
  price_usd numeric,
  price_eur numeric,
  is_active boolean NOT NULL DEFAULT true,
  replaces_standard_variant text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT custom_card_variants_pkey PRIMARY KEY (id),
  CONSTRAINT custom_card_variants_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.tcg_cards(id),
  CONSTRAINT custom_card_variants_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.disabled_standard_variants (
  id bigint NOT NULL DEFAULT nextval('disabled_standard_variants_id_seq'::regclass),
  card_id text NOT NULL,
  variant_type text NOT NULL,
  disabled_by uuid,
  disabled_at timestamp with time zone DEFAULT now(),
  reason text,
  CONSTRAINT disabled_standard_variants_pkey PRIMARY KEY (id),
  CONSTRAINT disabled_standard_variants_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.tcg_cards(id),
  CONSTRAINT disabled_standard_variants_disabled_by_fkey FOREIGN KEY (disabled_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.exchange_rates (
  id integer NOT NULL DEFAULT nextval('exchange_rates_id_seq'::regclass),
  from_currency USER-DEFINED NOT NULL,
  to_currency USER-DEFINED NOT NULL,
  rate numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT exchange_rates_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT auth.uid(),
  username text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  display_name text,
  bio text,
  location text,
  website text,
  avatar_url text,
  banner_url text,
  updated_at timestamp with time zone DEFAULT now(),
  preferred_currency USER-DEFINED DEFAULT 'EUR'::currency_code,
  preferred_price_source USER-DEFINED DEFAULT 'cardmarket'::price_source,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.rarity_variant_mappings (
  id bigint NOT NULL DEFAULT nextval('rarity_variant_mappings_id_seq'::regclass),
  rarity text NOT NULL,
  era text NOT NULL,
  allowed_variants ARRAY NOT NULL,
  force_variants ARRAY DEFAULT '{}'::text[],
  exclude_variants ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rarity_variant_mappings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tcg_card_prices (
  card_id text NOT NULL,
  source USER-DEFINED NOT NULL,
  variant USER-DEFINED NOT NULL,
  last_updated timestamp with time zone DEFAULT now(),
  currency text DEFAULT 'EUR'::text,
  low numeric,
  mid numeric,
  high numeric,
  market numeric,
  direct_low numeric,
  url text,
  average_sell_price numeric,
  german_pro_low numeric,
  suggested_price numeric,
  reverse_holo_sell numeric,
  reverse_holo_low numeric,
  reverse_holo_trend numeric,
  low_price_ex_plus numeric,
  trend numeric,
  trend_price numeric,
  avg_1_day numeric,
  avg_7_day numeric,
  avg_30_day numeric,
  CONSTRAINT tcg_card_prices_pkey PRIMARY KEY (card_id, source, variant),
  CONSTRAINT tcg_card_prices_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.tcg_cards(id)
);
CREATE TABLE public.tcg_cards (
  id text NOT NULL,
  set_id text NOT NULL,
  number text NOT NULL,
  name text NOT NULL,
  supertype text,
  subtypes ARRAY DEFAULT '{}'::text[],
  hp text,
  types ARRAY DEFAULT '{}'::text[],
  evolves_from text,
  rules ARRAY DEFAULT '{}'::text[],
  regulation_mark text,
  artist text,
  rarity text,
  flavor_text text,
  national_pokedex_numbers ARRAY DEFAULT '{}'::integer[],
  legalities jsonb DEFAULT '{}'::jsonb,
  images jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tcg_cards_pkey PRIMARY KEY (id),
  CONSTRAINT tcg_cards_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.tcg_sets(id)
);
CREATE TABLE public.tcg_set_policies (
  set_id text NOT NULL,
  has_standard_reverse boolean DEFAULT true,
  has_pokeball_reverse boolean DEFAULT false,
  has_masterball_reverse boolean DEFAULT false,
  has_first_edition boolean DEFAULT false,
  rare_policy text DEFAULT 'auto'::text,
  era text DEFAULT 'modern'::text,
  special_rules jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tcg_set_policies_pkey PRIMARY KEY (set_id),
  CONSTRAINT tcg_set_policies_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.tcg_sets(id)
);
CREATE TABLE public.tcg_sets (
  id text NOT NULL,
  name text NOT NULL,
  series text,
  ptcgo_code text,
  printed_total integer,
  total integer,
  release_date date,
  updated_at timestamp with time zone DEFAULT now(),
  legalities jsonb DEFAULT '{}'::jsonb,
  images jsonb DEFAULT '{}'::jsonb,
  tcg_type USER-DEFINED NOT NULL DEFAULT 'pokemon'::tcg_type,
  CONSTRAINT tcg_sets_pkey PRIMARY KEY (id)
);