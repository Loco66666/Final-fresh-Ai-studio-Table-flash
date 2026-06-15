export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      menu_categories: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          position: number;
          restaurant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          position?: number;
          restaurant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          position?: number;
          restaurant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_item_choices: {
        Row: {
          created_at: string;
          extra_price: number;
          id: string;
          menu_item_id: string;
          position: number;
          product_id: string;
        };
        Insert: {
          created_at?: string;
          extra_price?: number;
          id?: string;
          menu_item_id: string;
          position?: number;
          product_id: string;
        };
        Update: {
          created_at?: string;
          extra_price?: number;
          id?: string;
          menu_item_id?: string;
          position?: number;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_item_choices_menu_item_id_fkey";
            columns: ["menu_item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_item_choices_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_items: {
        Row: {
          course: Database["public"]["Enums"]["menu_course"];
          created_at: string;
          id: string;
          label: string;
          menu_id: string;
          position: number;
        };
        Insert: {
          course?: Database["public"]["Enums"]["menu_course"];
          created_at?: string;
          id?: string;
          label?: string;
          menu_id: string;
          position?: number;
        };
        Update: {
          course?: Database["public"]["Enums"]["menu_course"];
          created_at?: string;
          id?: string;
          label?: string;
          menu_id?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_menu_id_fkey";
            columns: ["menu_id"];
            isOneToOne: false;
            referencedRelation: "menus";
            referencedColumns: ["id"];
          },
        ];
      };
      menus: {
        Row: {
          available_days: string[];
          available_from: string | null;
          available_to: string | null;
          created_at: string;
          description: string;
          id: string;
          image_url: string | null;
          name: string;
          position: number;
          price: number;
          restaurant_id: string;
          status: Database["public"]["Enums"]["menu_status"];
          updated_at: string;
        };
        Insert: {
          available_days?: string[];
          available_from?: string | null;
          available_to?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string | null;
          name: string;
          position?: number;
          price?: number;
          restaurant_id: string;
          status?: Database["public"]["Enums"]["menu_status"];
          updated_at?: string;
        };
        Update: {
          available_days?: string[];
          available_from?: string | null;
          available_to?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string | null;
          name?: string;
          position?: number;
          price?: number;
          restaurant_id?: string;
          status?: Database["public"]["Enums"]["menu_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menus_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          order_id: string;
          product_id: string;
          product_name: string;
          qty: number;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          order_id: string;
          product_id: string;
          product_name: string;
          qty: number;
          unit_price: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          order_id?: string;
          product_id?: string;
          product_name?: string;
          qty?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          created_at: string;
          id: string;
          number: number;
          payment: Database["public"]["Enums"]["payment_status"];
          restaurant_id: string;
          status: Database["public"]["Enums"]["order_status"];
          table_id: string | null;
          total: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          number?: number;
          payment?: Database["public"]["Enums"]["payment_status"];
          restaurant_id: string;
          status?: Database["public"]["Enums"]["order_status"];
          table_id?: string | null;
          total?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          number?: number;
          payment?: Database["public"]["Enums"]["payment_status"];
          restaurant_id?: string;
          status?: Database["public"]["Enums"]["order_status"];
          table_id?: string | null;
          total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "tables";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          allergens: string[];
          badges: string[];
          category: string;
          created_at: string;
          description: string;
          id: string;
          image_url: string | null;
          name: string;
          position: number;
          price: number;
          restaurant_id: string;
          status: Database["public"]["Enums"]["product_status"];
          translations: Json;
          updated_at: string;
        };
        Insert: {
          allergens?: string[];
          badges?: string[];
          category: string;
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string | null;
          name: string;
          position?: number;
          price: number;
          restaurant_id: string;
          status?: Database["public"]["Enums"]["product_status"];
          translations?: Json;
          updated_at?: string;
        };
        Update: {
          allergens?: string[];
          badges?: string[];
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string | null;
          name?: string;
          position?: number;
          price?: number;
          restaurant_id?: string;
          status?: Database["public"]["Enums"]["product_status"];
          translations?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurants: {
        Row: {
          created_at: string;
          google_review_url: string | null;
          id: string;
          logo_url: string | null;
          name: string;
          owner_id: string;
          service_open: boolean;
          updated_at: string;
          welcome_en: string | null;
          welcome_es: string | null;
          welcome_fr: string | null;
        };
        Insert: {
          created_at?: string;
          google_review_url?: string | null;
          id?: string;
          logo_url?: string | null;
          name: string;
          owner_id: string;
          service_open?: boolean;
          updated_at?: string;
          welcome_en?: string | null;
          welcome_es?: string | null;
          welcome_fr?: string | null;
        };
        Update: {
          created_at?: string;
          google_review_url?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          owner_id?: string;
          service_open?: boolean;
          updated_at?: string;
          welcome_en?: string | null;
          welcome_es?: string | null;
          welcome_fr?: string | null;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          author: string | null;
          comment: string | null;
          created_at: string;
          id: string;
          rating: number;
          restaurant_id: string;
          table_id: string | null;
          treated: boolean;
        };
        Insert: {
          author?: string | null;
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating: number;
          restaurant_id: string;
          table_id?: string | null;
          treated?: boolean;
        };
        Update: {
          author?: string | null;
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating?: number;
          restaurant_id?: string;
          table_id?: string | null;
          treated?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "tables";
            referencedColumns: ["id"];
          },
        ];
      };
      tables: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          label: string;
          restaurant_id: string;
          zone: Database["public"]["Enums"]["table_zone"];
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          label: string;
          restaurant_id: string;
          zone?: Database["public"]["Enums"]["table_zone"];
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          label?: string;
          restaurant_id?: string;
          zone?: Database["public"]["Enums"]["table_zone"];
        };
        Relationships: [
          {
            foreignKeyName: "tables_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          restaurant_id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          restaurant_id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          restaurant_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _restaurant_id: string;
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      user_in_restaurant: {
        Args: { _restaurant_id: string; _user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "owner" | "staff" | "admin";
      menu_course: "entree" | "plat" | "dessert" | "boisson" | "fromage" | "autre";
      menu_status: "actif" | "inactif";
      order_status: "a_traiter" | "en_preparation" | "prete" | "terminee";
      payment_status: "a_payer" | "payee";
      product_status: "disponible" | "rupture";
      table_zone: "Salle" | "Terrasse" | "A emporter";
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["owner", "staff", "admin"],
      menu_course: ["entree", "plat", "dessert", "boisson", "fromage", "autre"],
      menu_status: ["actif", "inactif"],
      order_status: ["a_traiter", "en_preparation", "prete", "terminee"],
      payment_status: ["a_payer", "payee"],
      product_status: ["disponible", "rupture"],
      table_zone: ["Salle", "Terrasse", "A emporter"],
    },
  },
} as const;
