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
      categories: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          is_operational: boolean
          kind: string
          name: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          is_operational?: boolean
          kind: string
          name: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          is_operational?: boolean
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          archived_at: string | null
          avg_cost: number
          category_id: string | null
          created_at: string
          current_qty: number
          id: string
          min_qty: number
          name: string
          notes: string | null
          supplier_id: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          avg_cost?: number
          category_id?: string | null
          created_at?: string
          current_qty?: number
          id?: string
          min_qty?: number
          name: string
          notes?: string | null
          supplier_id?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          avg_cost?: number
          category_id?: string | null
          created_at?: string
          current_qty?: number
          id?: string
          min_qty?: number
          name?: string
          notes?: string | null
          supplier_id?: string | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      other_incomes: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string
          id: string
          income_date: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description: string
          id?: string
          income_date: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          income_date?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_extra_costs: {
        Row: {
          amount: number
          created_at: string
          id: string
          label: string
          product_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          label: string
          product_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          label?: string
          product_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_extra_costs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_materials: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          product_id: string
          quantity: number
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          product_id: string
          quantity: number
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_materials_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_materials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_materials_variant_id_product_id_fkey"
            columns: ["variant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "product_id"]
          },
          {
            foreignKeyName: "product_materials_variant_id_product_id_fkey"
            columns: ["variant_id", "product_id"]
            isOneToOne: false
            referencedRelation: "variant_costs"
            referencedColumns: ["variant_id", "product_id"]
          },
        ]
      }
      product_variant_values: {
        Row: {
          variant_id: string
          variation_type_id: string
          variation_value_id: string
        }
        Insert: {
          variant_id: string
          variation_type_id: string
          variation_value_id: string
        }
        Update: {
          variant_id?: string
          variation_type_id?: string
          variation_value_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_values_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_values_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variant_costs"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "product_variant_values_variation_value_id_variation_type_i_fkey"
            columns: ["variation_value_id", "variation_type_id"]
            isOneToOne: false
            referencedRelation: "variation_values"
            referencedColumns: ["id", "variation_type_id"]
          },
        ]
      }
      product_variants: {
        Row: {
          archived_at: string | null
          avg_cost: number
          cost_override: number | null
          created_at: string
          current_qty: number
          id: string
          is_active: boolean
          is_default: boolean
          min_stock: number
          price: number | null
          product_id: string
          sku: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          avg_cost?: number
          cost_override?: number | null
          created_at?: string
          current_qty?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          min_stock?: number
          price?: number | null
          product_id: string
          sku: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          avg_cost?: number
          cost_override?: number | null
          created_at?: string
          current_qty?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          min_stock?: number
          price?: number | null
          product_id?: string
          sku?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      productions: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          notes: string | null
          produced_at: string
          quantity: number
          unit_cost: number
          variant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          produced_at?: string
          quantity: number
          unit_cost?: number
          variant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          produced_at?: string
          quantity?: number
          unit_cost?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "productions_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productions_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variant_costs"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      products: {
        Row: {
          archived_at: string | null
          auto_deduct_materials: boolean
          category_id: string | null
          created_at: string
          default_price: number
          description: string | null
          estimated_cost: number
          id: string
          is_active: boolean
          is_customizable: boolean
          name: string
          sku: string
          stock_mode: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          auto_deduct_materials?: boolean
          category_id?: string | null
          created_at?: string
          default_price?: number
          description?: string | null
          estimated_cost?: number
          id?: string
          is_active?: boolean
          is_customizable?: boolean
          name: string
          sku: string
          stock_mode?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          auto_deduct_materials?: boolean
          category_id?: string | null
          created_at?: string
          default_price?: number
          description?: string | null
          estimated_cost?: number
          id?: string
          is_active?: boolean
          is_customizable?: boolean
          name?: string
          sku?: string
          stock_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          add_to_stock: boolean
          category_id: string | null
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          inventory_item_id: string | null
          purchase_id: string
          quantity: number
          stock_qty_per_unit: number
          total_amount: number
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          add_to_stock?: boolean
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description: string
          id?: string
          inventory_item_id?: string | null
          purchase_id: string
          quantity: number
          stock_qty_per_unit?: number
          total_amount: number
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          add_to_stock?: boolean
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          inventory_item_id?: string | null
          purchase_id?: string
          quantity?: number
          stock_qty_per_unit?: number
          total_amount?: number
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          notes: string | null
          purchase_date: string
          supplier_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          purchase_date: string
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          purchase_date?: string
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          customization_notes: string | null
          deleted_at: string | null
          fees: number
          gross_amount: number
          id: string
          is_customized: boolean
          product_name: string
          profit: number
          quantity: number
          received_amount: number
          sale_id: string
          sku: string
          total_cost: number
          unit_cost: number
          unit_price: number
          updated_at: string
          variant_id: string
          variant_label: string | null
        }
        Insert: {
          created_at?: string
          customization_notes?: string | null
          deleted_at?: string | null
          fees: number
          gross_amount: number
          id?: string
          is_customized?: boolean
          product_name: string
          profit: number
          quantity: number
          received_amount: number
          sale_id: string
          sku: string
          total_cost: number
          unit_cost: number
          unit_price: number
          updated_at?: string
          variant_id: string
          variant_label?: string | null
        }
        Update: {
          created_at?: string
          customization_notes?: string | null
          deleted_at?: string | null
          fees?: number
          gross_amount?: number
          id?: string
          is_customized?: boolean
          product_name?: string
          profit?: number
          quantity?: number
          received_amount?: number
          sale_id?: string
          sku?: string
          total_cost?: number
          unit_cost?: number
          unit_price?: number
          updated_at?: string
          variant_id?: string
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variant_costs"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      sales: {
        Row: {
          channel_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          fees: number
          gross_amount: number
          id: string
          notes: string | null
          profit: number
          received_amount: number
          sale_date: string
          source: string
          total_cost: number
          updated_at: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          fees?: number
          gross_amount?: number
          id?: string
          notes?: string | null
          profit?: number
          received_amount?: number
          sale_date: string
          source?: string
          total_cost?: number
          updated_at?: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          fees?: number
          gross_amount?: number
          id?: string
          notes?: string | null
          profit?: number
          received_amount?: number
          sale_date?: string
          source?: string
          total_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "sales_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_channels: {
        Row: {
          created_at: string
          fee_rules: Json | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee_rules?: Json | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee_rules?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          avg_cost_after: number
          balance_after: number
          created_at: string
          created_by: string | null
          id: string
          inventory_item_id: string | null
          movement_type: string
          notes: string | null
          occurred_at: string
          product_variant_id: string | null
          production_id: string | null
          purchase_item_id: string | null
          quantity: number
          reason: string
          reverses_movement_id: string | null
          sale_item_id: string | null
          unit_cost: number
        }
        Insert: {
          avg_cost_after?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string | null
          movement_type: string
          notes?: string | null
          occurred_at?: string
          product_variant_id?: string | null
          production_id?: string | null
          purchase_item_id?: string | null
          quantity: number
          reason: string
          reverses_movement_id?: string | null
          sale_item_id?: string | null
          unit_cost: number
        }
        Update: {
          avg_cost_after?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string | null
          movement_type?: string
          notes?: string | null
          occurred_at?: string
          product_variant_id?: string | null
          production_id?: string | null
          purchase_item_id?: string | null
          quantity?: number
          reason?: string
          reverses_movement_id?: string | null
          sale_item_id?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "variant_costs"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "stock_movements_production_id_fkey"
            columns: ["production_id"]
            isOneToOne: false
            referencedRelation: "productions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_purchase_item_fk"
            columns: ["purchase_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_reverses_movement_id_fkey"
            columns: ["reverses_movement_id"]
            isOneToOne: true
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_sale_item_fk"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_sale_item_fk"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          archived_at: string | null
          contact: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      variation_types: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      variation_values: {
        Row: {
          created_at: string
          id: string
          sort_order: number
          updated_at: string
          value: string
          variation_type_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sort_order?: number
          updated_at?: string
          value: string
          variation_type_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sort_order?: number
          updated_at?: string
          value?: string
          variation_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variation_values_variation_type_id_fkey"
            columns: ["variation_type_id"]
            isOneToOne: false
            referencedRelation: "variation_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      sale_lines: {
        Row: {
          category_id: string | null
          channel_id: string | null
          channel_name: string | null
          created_at: string | null
          customization_notes: string | null
          fees: number | null
          gross_amount: number | null
          id: string | null
          is_customized: boolean | null
          margin: number | null
          notes: string | null
          product_id: string | null
          product_name: string | null
          profit: number | null
          quantity: number | null
          received_amount: number | null
          sale_date: string | null
          sale_id: string | null
          sku: string | null
          source: string | null
          total_cost: number | null
          unit_cost: number | null
          unit_price: number | null
          variant_id: string | null
          variant_label: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variant_costs"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "sales_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "sales_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      variant_costs: {
        Row: {
          cost_source: string | null
          extra_cost: number | null
          material_cost: number | null
          product_id: string | null
          unit_cost: number | null
          variant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_sale: { Args: { p: Json }; Returns: string }
      delete_product: { Args: { p_product_id: string }; Returns: undefined }
      delete_production: {
        Args: { p_production_id: string }
        Returns: undefined
      }
      delete_purchase: { Args: { p_purchase_id: string }; Returns: undefined }
      delete_sale: { Args: { p_sale_id: string }; Returns: undefined }
      register_production: {
        Args: {
          p_notes?: string
          p_produced_at?: string
          p_quantity: number
          p_variant_id: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          notes: string | null
          produced_at: string
          quantity: number
          unit_cost: number
          variant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "productions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_purchase: { Args: { p: Json }; Returns: string }
      register_stock_movement: {
        Args: {
          p_inventory_item_id?: string
          p_movement_type: string
          p_notes?: string
          p_occurred_at?: string
          p_product_variant_id?: string
          p_quantity: number
          p_reason?: string
          p_unit_cost?: number
        }
        Returns: {
          avg_cost_after: number
          balance_after: number
          created_at: string
          created_by: string | null
          id: string
          inventory_item_id: string | null
          movement_type: string
          notes: string | null
          occurred_at: string
          product_variant_id: string | null
          production_id: string | null
          purchase_item_id: string | null
          quantity: number
          reason: string
          reverses_movement_id: string | null
          sale_item_id: string | null
          unit_cost: number
        }
        SetofOptions: {
          from: "*"
          to: "stock_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_product: { Args: { p: Json }; Returns: string }
      update_purchase: {
        Args: { p: Json; p_purchase_id: string }
        Returns: string
      }
      update_sale: { Args: { p: Json; p_sale_id: string }; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
