// Generated types for Supabase database
// This is a placeholder file - run `npm run types:gen` after linking your Supabase project

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      collection_items: {
        Row: {
          id: number
          user_id: string
          card_id: string
          variant: Database["public"]["Enums"]["variant_name"]
          quantity: number
          condition: string | null
          acquired_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          card_id: string
          variant?: Database["public"]["Enums"]["variant_name"]
          quantity?: number
          condition?: string | null
          acquired_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          card_id?: string
          variant?: Database["public"]["Enums"]["variant_name"]
          quantity?: number
          condition?: string | null
          acquired_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "tcg_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          created_at: string
        }
        Insert: {
          id?: string
          username?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tcg_card_prices: {
        Row: {
          card_id: string
          source: Database["public"]["Enums"]["price_source"]
          variant: Database["public"]["Enums"]["variant_name"]
          last_updated: string
          currency: string
          low: number | null
          mid: number | null
          high: number | null
          market: number | null
          direct_low: number | null
          url: string | null
        }
        Insert: {
          card_id: string
          source: Database["public"]["Enums"]["price_source"]
          variant: Database["public"]["Enums"]["variant_name"]
          last_updated?: string
          currency?: string
          low?: number | null
          mid?: number | null
          high?: number | null
          market?: number | null
          direct_low?: number | null
          url?: string | null
        }
        Update: {
          card_id?: string
          source?: Database["public"]["Enums"]["price_source"]
          variant?: Database["public"]["Enums"]["variant_name"]
          last_updated?: string
          currency?: string
          low?: number | null
          mid?: number | null
          high?: number | null
          market?: number | null
          direct_low?: number | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tcg_card_prices_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "tcg_cards"
            referencedColumns: ["id"]
          }
        ]
      }
      tcg_cards: {
        Row: {
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
          legalities: Json
          images: Json
          updated_at: string
        }
        Insert: {
          id: string
          set_id: string
          number: string
          name: string
          supertype?: string | null
          subtypes?: string[]
          hp?: string | null
          types?: string[]
          evolves_from?: string | null
          rules?: string[]
          regulation_mark?: string | null
          artist?: string | null
          rarity?: string | null
          flavor_text?: string | null
          national_pokedex_numbers?: number[]
          legalities?: Json
          images?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          set_id?: string
          number?: string
          name?: string
          supertype?: string | null
          subtypes?: string[]
          hp?: string | null
          types?: string[]
          evolves_from?: string | null
          rules?: string[]
          regulation_mark?: string | null
          artist?: string | null
          rarity?: string | null
          flavor_text?: string | null
          national_pokedex_numbers?: number[]
          legalities?: Json
          images?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tcg_cards_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "tcg_sets"
            referencedColumns: ["id"]
          }
        ]
      }
      tcg_sets: {
        Row: {
          id: string
          name: string
          series: string | null
          ptcgo_code: string | null
          printed_total: number | null
          total: number | null
          release_date: string | null
          updated_at: string
          legalities: Json
          images: Json
        }
        Insert: {
          id: string
          name: string
          series?: string | null
          ptcgo_code?: string | null
          printed_total?: number | null
          total?: number | null
          release_date?: string | null
          updated_at?: string
          legalities?: Json
          images?: Json
        }
        Update: {
          id?: string
          name?: string
          series?: string | null
          ptcgo_code?: string | null
          printed_total?: number | null
          total?: number | null
          release_date?: string | null
          updated_at?: string
          legalities?: Json
          images?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      price_source: "cardmarket" | "tcgplayer"
      variant_name:
        | "normal"
        | "holofoil"
        | "reverse_holofoil"
        | "first_edition_normal"
        | "first_edition_holofoil"
        | "unlimited"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never