export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      episodes: {
        Row: {
          air_date: string | null
          created_at: string
          embed_provider: string | null
          embed_url: string | null
          episode_number: number
          id: string
          movie_id: string
          name: string | null
          overview: string | null
          rating: number | null
          runtime: number | null
          season_id: string
          season_number: number
          still_url: string | null
          subtitle_url: string | null
          tmdb_id: number | null
          updated_at: string
          video_type: string
          video_url: string | null
        }
        Insert: {
          air_date?: string | null
          created_at?: string
          embed_provider?: string | null
          embed_url?: string | null
          episode_number: number
          id?: string
          movie_id: string
          name?: string | null
          overview?: string | null
          rating?: number | null
          runtime?: number | null
          season_id: string
          season_number: number
          still_url?: string | null
          subtitle_url?: string | null
          tmdb_id?: number | null
          updated_at?: string
          video_type?: string
          video_url?: string | null
        }
        Update: {
          air_date?: string | null
          created_at?: string
          embed_provider?: string | null
          embed_url?: string | null
          episode_number?: number
          id?: string
          movie_id?: string
          name?: string | null
          overview?: string | null
          rating?: number | null
          runtime?: number | null
          season_id?: string
          season_number?: number
          still_url?: string | null
          subtitle_url?: string | null
          tmdb_id?: number | null
          updated_at?: string
          video_type?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "episodes_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episodes_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      movies: {
        Row: {
          backdrop_url: string | null
          cast: string[]
          created_at: string
          created_by: string | null
          description: string | null
          director: string | null
          embed_provider: string | null
          embed_url: string | null
          first_air_date: string | null
          genre: string | null
          id: string
          is_featured: boolean
          is_imported: boolean
          is_published: boolean
          is_trending: boolean
          last_synced_at: string | null
          media_type: string
          popularity: number | null
          poster_url: string | null
          quality: string | null
          rating: number | null
          release_year: number | null
          runtime: number | null
          slug: string
          subtitle_url: string | null
          title: string
          tmdb_id: number | null
          trailer_url: string | null
          updated_at: string
          video_type: string
          video_url: string | null
          where_to_watch: Json
        }
        Insert: {
          backdrop_url?: string | null
          cast?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          director?: string | null
          embed_provider?: string | null
          embed_url?: string | null
          first_air_date?: string | null
          genre?: string | null
          id?: string
          is_featured?: boolean
          is_imported?: boolean
          is_published?: boolean
          is_trending?: boolean
          last_synced_at?: string | null
          media_type?: string
          popularity?: number | null
          poster_url?: string | null
          quality?: string | null
          rating?: number | null
          release_year?: number | null
          runtime?: number | null
          slug: string
          subtitle_url?: string | null
          title: string
          tmdb_id?: number | null
          trailer_url?: string | null
          updated_at?: string
          video_type?: string
          video_url?: string | null
          where_to_watch?: Json
        }
        Update: {
          backdrop_url?: string | null
          cast?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          director?: string | null
          embed_provider?: string | null
          embed_url?: string | null
          first_air_date?: string | null
          genre?: string | null
          id?: string
          is_featured?: boolean
          is_imported?: boolean
          is_published?: boolean
          is_trending?: boolean
          last_synced_at?: string | null
          media_type?: string
          popularity?: number | null
          poster_url?: string | null
          quality?: string | null
          rating?: number | null
          release_year?: number | null
          runtime?: number | null
          slug?: string
          subtitle_url?: string | null
          title?: string
          tmdb_id?: number | null
          trailer_url?: string | null
          updated_at?: string
          video_type?: string
          video_url?: string | null
          where_to_watch?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          air_date: string | null
          created_at: string
          episode_count: number | null
          id: string
          movie_id: string
          name: string | null
          overview: string | null
          poster_url: string | null
          season_number: number
          tmdb_id: number | null
          updated_at: string
        }
        Insert: {
          air_date?: string | null
          created_at?: string
          episode_count?: number | null
          id?: string
          movie_id: string
          name?: string | null
          overview?: string | null
          poster_url?: string | null
          season_number: number
          tmdb_id?: number | null
          updated_at?: string
        }
        Update: {
          air_date?: string | null
          created_at?: string
          episode_count?: number | null
          id?: string
          movie_id?: string
          name?: string | null
          overview?: string | null
          poster_url?: string | null
          season_number?: number
          tmdb_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_runs: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          inserted_count: number
          source: string
          started_at: string
          status: string
          updated_at: string
          updated_count: number
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          inserted_count?: number
          source?: string
          started_at?: string
          status?: string
          updated_at?: string
          updated_count?: number
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          inserted_count?: number
          source?: string
          started_at?: string
          status?: string
          updated_at?: string
          updated_count?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      watch_history: {
        Row: {
          completed: boolean
          created_at: string
          duration_seconds: number | null
          id: string
          movie_id: string
          progress_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          duration_seconds?: number | null
          id?: string
          movie_id: string
          progress_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          duration_seconds?: number | null
          id?: string
          movie_id?: string
          progress_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlists: {
        Row: {
          created_at: string
          id: string
          movie_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          movie_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          movie_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlists_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_first_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
