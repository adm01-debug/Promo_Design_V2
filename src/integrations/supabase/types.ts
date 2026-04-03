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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      catalog_products: {
        Row: {
          active: boolean
          category_id: string | null
          colors: string | null
          created_at: string
          id: string
          image_url: string | null
          material: string | null
          name: string
          sku: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          colors?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          material?: string | null
          name: string
          sku?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          colors?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          material?: string | null
          name?: string
          sku?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      magicup_history: {
        Row: {
          created_at: string
          favorite: boolean
          id: string
          image_url: string
          product_name: string | null
          product_sku: string | null
          prompt: string
          style: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          favorite?: boolean
          id?: string
          image_url: string
          product_name?: string | null
          product_sku?: string | null
          prompt: string
          style?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          favorite?: boolean
          id?: string
          image_url?: string
          product_name?: string | null
          product_sku?: string | null
          prompt?: string
          style?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mockup_drafts: {
        Row: {
          created_at: string
          editor_state: Json | null
          id: string
          name: string
          product_name: string | null
          product_sku: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          editor_state?: Json | null
          id?: string
          name: string
          product_name?: string | null
          product_sku?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          editor_state?: Json | null
          id?: string
          name?: string
          product_name?: string | null
          product_sku?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          event_type: string
          id: string
          new_status: string
          old_status: string | null
          os_id: string | null
          os_number: string
          product_name: string
          read: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          new_status: string
          old_status?: string | null
          os_id?: string | null
          os_number: string
          product_name?: string
          read?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          new_status?: string
          old_status?: string | null
          os_id?: string | null
          os_number?: string
          product_name?: string
          read?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      service_orders: {
        Row: {
          aprovar_primeira_peca: boolean | null
          area_height: string | null
          area_name: string | null
          area_shape: string | null
          area_width: string | null
          art_colors: string | null
          art_dpi: string | null
          art_file: string | null
          art_file_data_url: string | null
          client_company: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          date: string
          delivery_date: string | null
          faz_parte_kit: boolean | null
          gravacao_detalhe: string | null
          id: string
          identificacao_caixa: string | null
          material_evento: boolean | null
          mockup_image_url: string | null
          observations: string | null
          os_number: string
          product_colors: string | null
          product_material: string | null
          product_name: string
          product_sku: string | null
          qtd_compra: string | null
          qtd_liberada: string | null
          quantity: number
          status: string
          technique: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aprovar_primeira_peca?: boolean | null
          area_height?: string | null
          area_name?: string | null
          area_shape?: string | null
          area_width?: string | null
          art_colors?: string | null
          art_dpi?: string | null
          art_file?: string | null
          art_file_data_url?: string | null
          client_company?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          date?: string
          delivery_date?: string | null
          faz_parte_kit?: boolean | null
          gravacao_detalhe?: string | null
          id?: string
          identificacao_caixa?: string | null
          material_evento?: boolean | null
          mockup_image_url?: string | null
          observations?: string | null
          os_number: string
          product_colors?: string | null
          product_material?: string | null
          product_name: string
          product_sku?: string | null
          qtd_compra?: string | null
          qtd_liberada?: string | null
          quantity?: number
          status?: string
          technique: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aprovar_primeira_peca?: boolean | null
          area_height?: string | null
          area_name?: string | null
          area_shape?: string | null
          area_width?: string | null
          art_colors?: string | null
          art_dpi?: string | null
          art_file?: string | null
          art_file_data_url?: string | null
          client_company?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          date?: string
          delivery_date?: string | null
          faz_parte_kit?: boolean | null
          gravacao_detalhe?: string | null
          id?: string
          identificacao_caixa?: string | null
          material_evento?: boolean | null
          mockup_image_url?: string | null
          observations?: string | null
          os_number?: string
          product_colors?: string | null
          product_material?: string | null
          product_name?: string
          product_sku?: string | null
          qtd_compra?: string | null
          qtd_liberada?: string | null
          quantity?: number
          status?: string
          technique?: string
          updated_at?: string
          user_id?: string
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
