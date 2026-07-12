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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_usage_log: {
        Row: {
          cost_estimate: number | null
          created_at: string
          feature_name: string
          id: string
          metadata: Json | null
          model_name: string
          organization_id: string | null
          tokens_in: number | null
          tokens_out: number | null
          user_id: string | null
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string
          feature_name: string
          id?: string
          metadata?: Json | null
          model_name: string
          organization_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string
          feature_name?: string
          id?: string
          metadata?: Json | null
          model_name?: string
          organization_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_type: Database["public"]["Enums"]["asset_type"]
          client_id: string | null
          created_at: string
          created_by: string
          description: string | null
          dominant_colors: string[] | null
          file_path: string
          file_size: number | null
          height: number | null
          id: string
          is_archived: boolean
          last_modified_by: string | null
          lock_version: number
          metadata: Json | null
          mime_type: string | null
          name: string
          ocr_status: string
          ocr_text: string | null
          organization_id: string
          parent_asset_id: string | null
          tags: string[] | null
          thumbnail_path: string | null
          updated_at: string
          version: number
          width: number | null
        }
        Insert: {
          asset_type?: Database["public"]["Enums"]["asset_type"]
          client_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          dominant_colors?: string[] | null
          file_path: string
          file_size?: number | null
          height?: number | null
          id?: string
          is_archived?: boolean
          last_modified_by?: string | null
          lock_version?: number
          metadata?: Json | null
          mime_type?: string | null
          name: string
          ocr_status?: string
          ocr_text?: string | null
          organization_id: string
          parent_asset_id?: string | null
          tags?: string[] | null
          thumbnail_path?: string | null
          updated_at?: string
          version?: number
          width?: number | null
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["asset_type"]
          client_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          dominant_colors?: string[] | null
          file_path?: string
          file_size?: number | null
          height?: number | null
          id?: string
          is_archived?: boolean
          last_modified_by?: string | null
          lock_version?: number
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          ocr_status?: string
          ocr_text?: string | null
          organization_id?: string
          parent_asset_id?: string | null
          tags?: string[] | null
          thumbnail_path?: string | null
          updated_at?: string
          version?: number
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_parent_asset_id_fkey"
            columns: ["parent_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_alert_rules: {
        Row: {
          actions: string[]
          advanced_conditions: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          recipient_user_ids: string[]
          recipients_mode: string
          table_names: string[]
          target_user_id: string | null
          updated_at: string
          user_id: string
          value_key: string | null
          value_query: string | null
        }
        Insert: {
          actions?: string[]
          advanced_conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          recipient_user_ids?: string[]
          recipients_mode?: string
          table_names?: string[]
          target_user_id?: string | null
          updated_at?: string
          user_id: string
          value_key?: string | null
          value_query?: string | null
        }
        Update: {
          actions?: string[]
          advanced_conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          recipient_user_ids?: string[]
          recipients_mode?: string
          table_names?: string[]
          target_user_id?: string | null
          updated_at?: string
          user_id?: string
          value_key?: string | null
          value_query?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_alert_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changed_fields: Json | null
          created_at: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          organization_id: string | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          changed_fields?: Json | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          changed_fields?: Json | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_saved_views: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_saved_views_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_guidelines: {
        Row: {
          client_id: string
          created_at: string
          do_rules: string[] | null
          dont_rules: string[] | null
          fonts: Json
          id: string
          logo_asset_id: string | null
          notes: string | null
          organization_id: string
          primary_colors: Json
          secondary_colors: Json
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          do_rules?: string[] | null
          dont_rules?: string[] | null
          fonts?: Json
          id?: string
          logo_asset_id?: string | null
          notes?: string | null
          organization_id: string
          primary_colors?: Json
          secondary_colors?: Json
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          do_rules?: string[] | null
          dont_rules?: string[] | null
          fonts?: Json
          id?: string
          logo_asset_id?: string | null
          notes?: string | null
          organization_id?: string
          primary_colors?: Json
          secondary_colors?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_guidelines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_guidelines_logo_asset_id_fkey"
            columns: ["logo_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_guidelines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
          {
            foreignKeyName: "catalog_products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          organization_id: string
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          organization_id: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          organization_id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          created_at: string
          created_by: string
          document: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          state: string | null
          tags: string[] | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          created_by: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          state?: string | null
          tags?: string[] | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          created_by?: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          state?: string | null
          tags?: string[] | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dam_saved_searches: {
        Row: {
          created_at: string
          filters: Json
          id: string
          is_pinned: boolean
          name: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          is_pinned?: boolean
          name: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          is_pinned?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      magicup_history: {
        Row: {
          created_at: string
          favorite: boolean
          id: string
          image_url: string
          lock_version: number | null
          organization_id: string | null
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
          lock_version?: number | null
          organization_id?: string | null
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
          lock_version?: number | null
          organization_id?: string | null
          product_name?: string | null
          product_sku?: string | null
          prompt?: string
          style?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "magicup_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_runs: {
        Row: {
          audit_deleted: number
          created_at: string
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          notifications_deleted: number
          source: string
          started_at: string
          status: string
          status_audit_deleted: number
          triggered_by: string | null
        }
        Insert: {
          audit_deleted?: number
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          notifications_deleted?: number
          source: string
          started_at?: string
          status: string
          status_audit_deleted?: number
          triggered_by?: string | null
        }
        Update: {
          audit_deleted?: number
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          notifications_deleted?: number
          source?: string
          started_at?: string
          status?: string
          status_audit_deleted?: number
          triggered_by?: string | null
        }
        Relationships: []
      }
      mockup_drafts: {
        Row: {
          created_at: string
          editor_state: Json | null
          id: string
          last_modified_by: string | null
          lock_version: number | null
          name: string
          organization_id: string | null
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
          last_modified_by?: string | null
          lock_version?: number | null
          name: string
          organization_id?: string | null
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
          last_modified_by?: string | null
          lock_version?: number | null
          name?: string
          organization_id?: string | null
          product_name?: string | null
          product_sku?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mockup_drafts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      organization_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          ai_monthly_quota: number | null
          created_at: string
          created_by: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          ai_monthly_quota?: number | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          ai_monthly_quota?: number | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          aprovar_primeira_peca: boolean | null
          area_height: string | null
          area_name: string | null
          area_shape: string | null
          area_width: string | null
          art_asset_id: string | null
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
          deleted_at: string | null
          delivery_date: string | null
          faz_parte_kit: boolean | null
          gravacao_detalhe: string | null
          id: string
          identificacao_caixa: string | null
          last_modified_by: string | null
          lock_version: number
          material_evento: boolean | null
          mockup_image_url: string | null
          observations: string | null
          organization_id: string | null
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
          art_asset_id?: string | null
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
          deleted_at?: string | null
          delivery_date?: string | null
          faz_parte_kit?: boolean | null
          gravacao_detalhe?: string | null
          id?: string
          identificacao_caixa?: string | null
          last_modified_by?: string | null
          lock_version?: number
          material_evento?: boolean | null
          mockup_image_url?: string | null
          observations?: string | null
          organization_id?: string | null
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
          art_asset_id?: string | null
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
          deleted_at?: string | null
          delivery_date?: string | null
          faz_parte_kit?: boolean | null
          gravacao_detalhe?: string | null
          id?: string
          identificacao_caixa?: string | null
          last_modified_by?: string | null
          lock_version?: number
          material_evento?: boolean | null
          mockup_image_url?: string | null
          observations?: string | null
          organization_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "service_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      status_audit_log: {
        Row: {
          changed_at: string
          id: string
          new_status: string
          old_status: string | null
          service_order_id: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          new_status: string
          old_status?: string | null
          service_order_id: string
          user_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          new_status?: string
          old_status?: string | null
          service_order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_audit_log_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          aspect_ratio: string
          client_id: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          duration: number
          id: string
          metadata: Json | null
          name: string
          organization_id: string
          product_name: string | null
          product_sku: string | null
          style: string | null
          thumbnail_url: string | null
          updated_at: string
          video_url: string
        }
        Insert: {
          aspect_ratio: string
          client_id?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          duration: number
          id?: string
          metadata?: Json | null
          name: string
          organization_id: string
          product_name?: string | null
          product_sku?: string | null
          style?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          video_url: string
        }
        Update: {
          aspect_ratio?: string
          client_id?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          duration?: number
          id?: string
          metadata?: Json | null
          name?: string
          organization_id?: string
          product_name?: string | null
          product_sku?: string | null
          style?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_organization_invite: { Args: { _token: string }; Returns: Json }
      check_ai_quota:
        | { Args: { _org_id: string }; Returns: boolean }
        | {
            Args: { _org_id: string; _required_cost?: number }
            Returns: boolean
          }
      cleanup_expired_data:
        | {
            Args: {
              _audit_retention_days?: number
              _notifications_read_retention_days?: number
              _status_audit_retention_days?: number
            }
            Returns: Json
          }
        | {
            Args: {
              _audit_retention_days?: number
              _notifications_read_retention_days?: number
              _source?: string
              _status_audit_retention_days?: number
              _triggered_by?: string
            }
            Returns: Json
          }
      current_user_orgs: { Args: never; Returns: string[] }
      explain_search_assets_ranked: {
        Args: { _org_id: string; _query?: string }
        Returns: Json
      }
      get_maintenance_stats: { Args: never; Returns: Json }
      get_table_sizes: { Args: never; Returns: Json }
      has_any_role: {
        Args: {
          _org_id: string
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_any_org_admin: { Args: { _user_id: string }; Returns: boolean }
      is_member_of: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_mfa_authenticated: { Args: never; Returns: boolean }
      run_scheduled_cleanup: { Args: never; Returns: Json }
      search_assets_ranked:
        | {
            Args: {
              _asset_types?: Database["public"]["Enums"]["asset_type"][]
              _client_id?: string
              _include_archived?: boolean
              _limit?: number
              _offset?: number
              _org_id: string
              _query: string
              _tags?: string[]
              _tags_mode?: string
            }
            Returns: {
              asset_type: Database["public"]["Enums"]["asset_type"]
              client_id: string
              created_at: string
              created_by: string
              description: string
              dominant_colors: string[]
              file_path: string
              file_size: number
              height: number
              id: string
              is_archived: boolean
              metadata: Json
              mime_type: string
              name: string
              ocr_match: boolean
              ocr_status: string
              ocr_text: string
              organization_id: string
              parent_asset_id: string
              rank: number
              tags: string[]
              thumbnail_path: string
              total_count: number
              updated_at: string
              version: number
              width: number
            }[]
          }
        | {
            Args: {
              _asset_types?: Database["public"]["Enums"]["asset_type"][]
              _client_id?: string
              _include_archived?: boolean
              _limit?: number
              _max_size?: number
              _min_size?: number
              _offset?: number
              _org_id: string
              _query: string
              _tags?: string[]
              _tags_mode?: string
            }
            Returns: {
              asset_type: Database["public"]["Enums"]["asset_type"]
              client_id: string
              created_at: string
              created_by: string
              description: string
              dominant_colors: string[]
              file_path: string
              file_size: number
              height: number
              id: string
              is_archived: boolean
              metadata: Json
              mime_type: string
              name: string
              ocr_match: boolean
              ocr_status: string
              ocr_text: string
              organization_id: string
              parent_asset_id: string
              rank: number
              tags: string[]
              thumbnail_path: string
              total_count: number
              updated_at: string
              version: number
              width: number
            }[]
          }
    }
    Enums: {
      app_role: "owner" | "admin" | "designer" | "approver" | "viewer"
      asset_type: "logo" | "art" | "photo" | "mockup" | "document" | "other"
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
      app_role: ["owner", "admin", "designer", "approver", "viewer"],
      asset_type: ["logo", "art", "photo", "mockup", "document", "other"],
    },
  },
} as const
