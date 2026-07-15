export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      avaliacoes: {
        Row: {
          created_at: string;
          id: string;
          jogo_id: string;
          nota: number;
          texto: string | null;
          updated_at: string;
          usuario_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          jogo_id: string;
          nota: number;
          texto?: string | null;
          updated_at?: string;
          usuario_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          jogo_id?: string;
          nota?: number;
          texto?: string | null;
          updated_at?: string;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "avaliacoes_jogo_id_fkey";
            columns: ["jogo_id"];
            isOneToOne: false;
            referencedRelation: "jogos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "avaliacoes_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      biblioteca: {
        Row: {
          created_at: string;
          id: string;
          jogo_id: string;
          status: Database["public"]["Enums"]["library_status"];
          updated_at: string;
          usuario_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          jogo_id: string;
          status: Database["public"]["Enums"]["library_status"];
          updated_at?: string;
          usuario_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          jogo_id?: string;
          status?: Database["public"]["Enums"]["library_status"];
          updated_at?: string;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "biblioteca_jogo_id_fkey";
            columns: ["jogo_id"];
            isOneToOne: false;
            referencedRelation: "jogos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "biblioteca_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      follows: {
        Row: {
          created_at: string;
          follower_id: string;
          following_id: string;
        };
        Insert: {
          created_at?: string;
          follower_id: string;
          following_id: string;
        };
        Update: {
          created_at?: string;
          follower_id?: string;
          following_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_following_id_fkey";
            columns: ["following_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      jogos: {
        Row: {
          capa: string | null;
          created_at: string;
          data_lancamento: string | null;
          descricao: string | null;
          desenvolvedora: string | null;
          generos: string[];
          id: string;
          igdb_id: number | null;
          steam_appid: number | null;
          plataformas: string[];
          titulo: string;
          updated_at: string;
        };
        Insert: {
          capa?: string | null;
          created_at?: string;
          data_lancamento?: string | null;
          descricao?: string | null;
          desenvolvedora?: string | null;
          generos?: string[];
          id?: string;
          igdb_id?: number | null;
          steam_appid?: number | null;
          plataformas?: string[];
          titulo: string;
          updated_at?: string;
        };
        Update: {
          capa?: string | null;
          created_at?: string;
          data_lancamento?: string | null;
          descricao?: string | null;
          desenvolvedora?: string | null;
          generos?: string[];
          id?: string;
          igdb_id?: number | null;
          steam_appid?: number | null;
          plataformas?: string[];
          titulo?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          accent_color: string;
          bio: string | null;
          created_at: string;
          email: string;
          foto: string | null;
          id: string;
          nome: string;
          theme_mode: Database["public"]["Enums"]["theme_mode"];
          updated_at: string;
        };
        Insert: {
          accent_color?: string;
          bio?: string | null;
          created_at?: string;
          email?: string;
          foto?: string | null;
          id: string;
          nome?: string;
          theme_mode?: Database["public"]["Enums"]["theme_mode"];
          updated_at?: string;
        };
        Update: {
          accent_color?: string;
          bio?: string | null;
          created_at?: string;
          email?: string;
          foto?: string | null;
          id?: string;
          nome?: string;
          theme_mode?: Database["public"]["Enums"]["theme_mode"];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      library_status: "wishlist" | "playing" | "completed";
      theme_mode: "light" | "dark" | "system";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      library_status: ["wishlist", "playing", "completed"],
      theme_mode: ["light", "dark", "system"],
    },
  },
} as const;
