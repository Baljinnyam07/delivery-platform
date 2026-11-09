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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      deliveries: {
        Row: {
          address: string
          address_note: string | null
          amount_due: number
          assigned_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          code: string
          courier_id: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          delivery_fee: number
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          package_description: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          scheduled_date: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
        }
        Insert: {
          address: string
          address_note?: string | null
          amount_due?: number
          assigned_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          code?: string
          courier_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          customer_phone: string
          delivered_at?: string | null
          delivery_fee?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          package_description?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          scheduled_date?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
        }
        Update: {
          address?: string
          address_note?: string | null
          amount_due?: number
          assigned_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          code?: string
          courier_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          customer_phone?: string
          delivered_at?: string | null
          delivery_fee?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          package_description?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          scheduled_date?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_assignments: {
        Row: {
          courier_id: string
          delivery_id: string
          end_note: string | null
          end_reason: Database["public"]["Enums"]["assignment_end"] | null
          ended_at: string | null
          ended_by: string | null
          id: string
          previous_courier_id: string | null
          start_action: Database["public"]["Enums"]["assignment_start"]
          start_note: string | null
          started_at: string
          started_by: string | null
        }
        Insert: {
          courier_id: string
          delivery_id: string
          end_note?: string | null
          end_reason?: Database["public"]["Enums"]["assignment_end"] | null
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          previous_courier_id?: string | null
          start_action: Database["public"]["Enums"]["assignment_start"]
          start_note?: string | null
          started_at?: string
          started_by?: string | null
        }
        Update: {
          courier_id?: string
          delivery_id?: string
          end_note?: string | null
          end_reason?: Database["public"]["Enums"]["assignment_end"] | null
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          previous_courier_id?: string | null
          start_action?: Database["public"]["Enums"]["assignment_start"]
          start_note?: string | null
          started_at?: string
          started_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_assignments_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_ended_by_fkey"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_previous_courier_id_fkey"
            columns: ["previous_courier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_items: {
        Row: {
          created_at: string
          delivery_id: string
          factory_id: string
          id: string
          line_total: number | null
          product_id: string
          product_name: string
          quantity: number
          unit: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          delivery_id: string
          factory_id: string
          id?: string
          line_total?: number | null
          product_id: string
          product_name: string
          quantity: number
          unit: string
          unit_price: number
        }
        Update: {
          created_at?: string
          delivery_id?: string
          factory_id?: string
          id?: string
          line_total?: number | null
          product_id?: string
          product_name?: string
          quantity?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_items_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_items_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          delivery_id: string
          from_status: Database["public"]["Enums"]["delivery_status"] | null
          id: number
          note: string | null
          to_status: Database["public"]["Enums"]["delivery_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          delivery_id: string
          from_status?: Database["public"]["Enums"]["delivery_status"] | null
          id?: never
          note?: string | null
          to_status: Database["public"]["Enums"]["delivery_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          delivery_id?: string
          from_status?: Database["public"]["Enums"]["delivery_status"] | null
          id?: never
          note?: string | null
          to_status?: Database["public"]["Enums"]["delivery_status"]
        }
        Relationships: [
          {
            foreignKeyName: "delivery_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_status_history_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      factories: {
        Row: {
          code_letter: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code_letter?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code_letter?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          delivery_id: string | null
          id: string
          push_error: string | null
          push_sent_at: string | null
          read_at: string | null
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          body: string
          created_at?: string
          delivery_id?: string | null
          id?: string
          push_error?: string | null
          push_sent_at?: string | null
          read_at?: string | null
          recipient_id: string
          title: string
          type: string
        }
        Update: {
          body?: string
          created_at?: string
          delivery_id?: string | null
          id?: string
          push_error?: string | null
          push_sent_at?: string | null
          read_at?: string | null
          recipient_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_records: {
        Row: {
          amount: number
          delivery_id: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          receipt_path: string | null
          recorded_at: string
          recorded_by: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount: number
          delivery_id: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          receipt_path?: string | null
          recorded_at?: string
          recorded_by: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount?: number
          delivery_id?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          receipt_path?: string | null
          recorded_at?: string
          recorded_by?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          factory_id: string
          id: string
          is_active: boolean
          low_stock_threshold: number
          name: string
          stock: number
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          factory_id: string
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          name: string
          stock?: number
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          factory_id?: string
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          name?: string
          stock?: number
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          expo_push_token: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          expo_push_token?: string | null
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          expo_push_token?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          delivery_id: string | null
          id: string
          note: string | null
          product_id: string
          quantity_change: number
          reason: Database["public"]["Enums"]["stock_movement_reason"]
          stock_after: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delivery_id?: string | null
          id?: string
          note?: string | null
          product_id: string
          quantity_change: number
          reason: Database["public"]["Enums"]["stock_movement_reason"]
          stock_after: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delivery_id?: string | null
          id?: string
          note?: string | null
          product_id?: string
          quantity_change?: number
          reason?: Database["public"]["Enums"]["stock_movement_reason"]
          stock_after?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_stock: {
        Args: {
          p_change: number
          p_note?: string
          p_product_id: string
          p_reason?: Database["public"]["Enums"]["stock_movement_reason"]
        }
        Returns: number
      }
      assign_delivery: {
        Args: { p_courier_id: string; p_delivery_id: string }
        Returns: {
          address: string
          address_note: string | null
          amount_due: number
          assigned_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          code: string
          courier_id: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          package_description: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          scheduled_date: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_delivery: {
        Args: { p_delivery_id: string; p_reason: string }
        Returns: {
          address: string
          address_note: string | null
          amount_due: number
          assigned_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          code: string
          courier_id: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          package_description: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          scheduled_date: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_delivery: {
        Args: { p_delivery_id: string }
        Returns: {
          address: string
          address_note: string | null
          amount_due: number
          assigned_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          code: string
          courier_id: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          package_description: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          scheduled_date: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_delivery: {
        Args: { p_delivery_id: string; p_note?: string }
        Returns: {
          address: string
          address_note: string | null
          amount_due: number
          assigned_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          code: string
          courier_id: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          package_description: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          scheduled_date: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_delivery: {
        Args: {
          p_amount?: number
          p_delivery: Json
          p_items?: Json
          p_payment_method?: Database["public"]["Enums"]["payment_method"]
        }
        Returns: string
      }
      get_courier_stats: {
        Args: { p_from: string; p_to: string }
        Returns: {
          assigned_now: number
          avg_delivery_minutes: number
          cash_collected: number
          courier_id: string
          delivered_count: number
          full_name: string
          in_progress_now: number
          is_active: boolean
          phone: string
          transfer_collected: number
        }[]
      }
      get_daily_report: {
        Args: { p_from: string; p_to: string }
        Returns: {
          cancelled: number
          cash: number
          created: number
          day: string
          delivered: number
          transfer: number
        }[]
      }
      get_dashboard_stats: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      get_factory_report: {
        Args: { p_from: string; p_to: string }
        Returns: {
          cancelled_qty: number
          delivered_amount: number
          delivered_qty: number
          factory_id: string
          factory_name: string
          in_transit_qty: number
          product_id: string
          product_name: string
          stock: number
          unit: string
          unit_price: number
        }[]
      }
      list_available_deliveries: {
        Args: never
        Returns: {
          address: string
          address_note: string
          amount_due: number
          code: string
          created_at: string
          id: string
          latitude: number
          longitude: number
          package_description: string
          scheduled_date: string
        }[]
      }
      reassign_delivery: {
        Args: { p_courier_id: string; p_delivery_id: string; p_reason: string }
        Returns: {
          address: string
          address_note: string | null
          amount_due: number
          assigned_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          code: string
          courier_id: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          package_description: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          scheduled_date: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_payment: {
        Args: {
          p_amount: number
          p_delivery_id: string
          p_method: Database["public"]["Enums"]["payment_method"]
          p_note?: string
          p_receipt_path?: string
        }
        Returns: {
          amount: number
          delivery_id: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          receipt_path: string | null
          recorded_at: string
          recorded_by: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "payment_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      return_delivery: {
        Args: { p_delivery_id: string; p_reason: string }
        Returns: {
          address: string
          address_note: string | null
          amount_due: number
          assigned_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          code: string
          courier_id: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          package_description: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          scheduled_date: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_courier_active: {
        Args: { p_active: boolean; p_courier_id: string }
        Returns: {
          created_at: string
          expo_push_token: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_delivery: {
        Args: { p_delivery_id: string }
        Returns: {
          address: string
          address_note: string | null
          amount_due: number
          assigned_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          code: string
          courier_id: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          package_description: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          scheduled_date: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unassign_delivery: {
        Args: { p_delivery_id: string; p_reason: string }
        Returns: {
          address: string
          address_note: string | null
          amount_due: number
          assigned_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          code: string
          courier_id: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          package_description: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          scheduled_date: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      void_payment: {
        Args: { p_payment_id: string; p_reason: string }
        Returns: {
          amount: number
          delivery_id: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          receipt_path: string | null
          recorded_at: string
          recorded_by: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "payment_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      assignment_end:
        | "REASSIGNED"
        | "UNASSIGNED"
        | "RETURNED"
        | "CANCELLED"
        | "COMPLETED"
      assignment_start: "ASSIGNED" | "CLAIMED" | "REASSIGNED"
      delivery_status:
        | "UNASSIGNED"
        | "ASSIGNED"
        | "IN_PROGRESS"
        | "DELIVERED"
        | "CANCELLED"
      payment_method: "CASH" | "BANK_TRANSFER"
      payment_status: "PAID" | "UNPAID"
      stock_movement_reason: "RESTOCK" | "ADJUSTMENT" | "DELIVERY" | "CANCELLED"
      user_role: "ADMIN" | "COURIER"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      assignment_end: [
        "REASSIGNED",
        "UNASSIGNED",
        "RETURNED",
        "CANCELLED",
        "COMPLETED",
      ],
      assignment_start: ["ASSIGNED", "CLAIMED", "REASSIGNED"],
      delivery_status: [
        "UNASSIGNED",
        "ASSIGNED",
        "IN_PROGRESS",
        "DELIVERED",
        "CANCELLED",
      ],
      payment_method: ["CASH", "BANK_TRANSFER"],
      payment_status: ["PAID", "UNPAID"],
      stock_movement_reason: ["RESTOCK", "ADJUSTMENT", "DELIVERY", "CANCELLED"],
      user_role: ["ADMIN", "COURIER"],
    },
  },
} as const
