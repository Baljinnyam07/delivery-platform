
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "deliveries": {
                  Row: {
                    "address": string,"address_note": string | null,"amount_due": number,"assigned_at": string | null,"cancel_reason": string | null,"cancelled_at": string | null,"code": string,"courier_id": string | null,"created_at": string,"created_by": string | null,"customer_name": string,"customer_phone": string,"delivered_at": string | null,"id": string,"latitude": number | null,"longitude": number | null,"notes": string | null,"package_description": string | null,"payment_method": Database["public"]['Enums']["payment_method"] | null,"payment_status": Database["public"]['Enums']["payment_status"],"scheduled_date": string | null,"started_at": string | null,"status": Database["public"]['Enums']["delivery_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address": string,"address_note"?: string | null,"amount_due"?: number,"assigned_at"?: string | null,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"code"?: string,"courier_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_name": string,"customer_phone": string,"delivered_at"?: string | null,"id"?: string,"latitude"?: number | null,"longitude"?: number | null,"notes"?: string | null,"package_description"?: string | null,"payment_method"?: Database["public"]['Enums']["payment_method"] | null,"payment_status"?: Database["public"]['Enums']["payment_status"],"scheduled_date"?: string | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["delivery_status"],"updated_at"?: string
                  }
                  Update: {
                    "address"?: string,"address_note"?: string | null,"amount_due"?: number,"assigned_at"?: string | null,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"code"?: string,"courier_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_name"?: string,"customer_phone"?: string,"delivered_at"?: string | null,"id"?: string,"latitude"?: number | null,"longitude"?: number | null,"notes"?: string | null,"package_description"?: string | null,"payment_method"?: Database["public"]['Enums']["payment_method"] | null,"payment_status"?: Database["public"]['Enums']["payment_status"],"scheduled_date"?: string | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["delivery_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "deliveries_courier_id_fkey"
      columns: ["courier_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliveries_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"delivery_assignments": {
                  Row: {
                    "courier_id": string,"delivery_id": string,"end_note": string | null,"end_reason": Database["public"]['Enums']["assignment_end"] | null,"ended_at": string | null,"ended_by": string | null,"id": string,"previous_courier_id": string | null,"start_action": Database["public"]['Enums']["assignment_start"],"start_note": string | null,"started_at": string,"started_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "courier_id": string,"delivery_id": string,"end_note"?: string | null,"end_reason"?: Database["public"]['Enums']["assignment_end"] | null,"ended_at"?: string | null,"ended_by"?: string | null,"id"?: string,"previous_courier_id"?: string | null,"start_action": Database["public"]['Enums']["assignment_start"],"start_note"?: string | null,"started_at"?: string,"started_by"?: string | null
                  }
                  Update: {
                    "courier_id"?: string,"delivery_id"?: string,"end_note"?: string | null,"end_reason"?: Database["public"]['Enums']["assignment_end"] | null,"ended_at"?: string | null,"ended_by"?: string | null,"id"?: string,"previous_courier_id"?: string | null,"start_action"?: Database["public"]['Enums']["assignment_start"],"start_note"?: string | null,"started_at"?: string,"started_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "delivery_assignments_courier_id_fkey"
      columns: ["courier_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "delivery_assignments_delivery_id_fkey"
      columns: ["delivery_id"]
isOneToOne: false
      referencedRelation: "deliveries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "delivery_assignments_ended_by_fkey"
      columns: ["ended_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "delivery_assignments_previous_courier_id_fkey"
      columns: ["previous_courier_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "delivery_assignments_started_by_fkey"
      columns: ["started_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"delivery_status_history": {
                  Row: {
                    "changed_by": string | null,"created_at": string,"delivery_id": string,"from_status": Database["public"]['Enums']["delivery_status"] | null,"id": number,"note": string | null,"to_status": Database["public"]['Enums']["delivery_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_by"?: string | null,"created_at"?: string,"delivery_id": string,"from_status"?: Database["public"]['Enums']["delivery_status"] | null,"id"?: never,"note"?: string | null,"to_status": Database["public"]['Enums']["delivery_status"]
                  }
                  Update: {
                    "changed_by"?: string | null,"created_at"?: string,"delivery_id"?: string,"from_status"?: Database["public"]['Enums']["delivery_status"] | null,"id"?: never,"note"?: string | null,"to_status"?: Database["public"]['Enums']["delivery_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "delivery_status_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "delivery_status_history_delivery_id_fkey"
      columns: ["delivery_id"]
isOneToOne: false
      referencedRelation: "deliveries"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string,"created_at": string,"delivery_id": string | null,"id": string,"push_error": string | null,"push_sent_at": string | null,"read_at": string | null,"recipient_id": string,"title": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"delivery_id"?: string | null,"id"?: string,"push_error"?: string | null,"push_sent_at"?: string | null,"read_at"?: string | null,"recipient_id": string,"title": string,"type": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"delivery_id"?: string | null,"id"?: string,"push_error"?: string | null,"push_sent_at"?: string | null,"read_at"?: string | null,"recipient_id"?: string,"title"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_delivery_id_fkey"
      columns: ["delivery_id"]
isOneToOne: false
      referencedRelation: "deliveries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_records": {
                  Row: {
                    "amount": number,"delivery_id": string,"id": string,"method": Database["public"]['Enums']["payment_method"],"note": string | null,"receipt_path": string | null,"recorded_at": string,"recorded_by": string,"void_reason": string | null,"voided_at": string | null,"voided_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"delivery_id": string,"id"?: string,"method": Database["public"]['Enums']["payment_method"],"note"?: string | null,"receipt_path"?: string | null,"recorded_at"?: string,"recorded_by": string,"void_reason"?: string | null,"voided_at"?: string | null,"voided_by"?: string | null
                  }
                  Update: {
                    "amount"?: number,"delivery_id"?: string,"id"?: string,"method"?: Database["public"]['Enums']["payment_method"],"note"?: string | null,"receipt_path"?: string | null,"recorded_at"?: string,"recorded_by"?: string,"void_reason"?: string | null,"voided_at"?: string | null,"voided_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_records_delivery_id_fkey"
      columns: ["delivery_id"]
isOneToOne: false
      referencedRelation: "deliveries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_records_recorded_by_fkey"
      columns: ["recorded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_records_voided_by_fkey"
      columns: ["voided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"expo_push_token": string | null,"full_name": string,"id": string,"is_active": boolean,"phone": string | null,"role": Database["public"]['Enums']["user_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expo_push_token"?: string | null,"full_name": string,"id": string,"is_active"?: boolean,"phone"?: string | null,"role": Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"expo_push_token"?: string | null,"full_name"?: string,"id"?: string,"is_active"?: boolean,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "assign_delivery":
{ Args: { "p_courier_id": string,"p_delivery_id": string }; Returns: {
              "address": string,
"address_note": string | null,
"amount_due": number,
"assigned_at": string | null,
"cancel_reason": string | null,
"cancelled_at": string | null,
"code": string,
"courier_id": string | null,
"created_at": string,
"created_by": string | null,
"customer_name": string,
"customer_phone": string,
"delivered_at": string | null,
"id": string,
"latitude": number | null,
"longitude": number | null,
"notes": string | null,
"package_description": string | null,
"payment_method": Database["public"]['Enums']["payment_method"] | null,
"payment_status": Database["public"]['Enums']["payment_status"],
"scheduled_date": string | null,
"started_at": string | null,
"status": Database["public"]['Enums']["delivery_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "deliveries"
        isOneToOne: true
        isSetofReturn: false
      } },
"cancel_delivery":
{ Args: { "p_delivery_id": string,"p_reason": string }; Returns: {
              "address": string,
"address_note": string | null,
"amount_due": number,
"assigned_at": string | null,
"cancel_reason": string | null,
"cancelled_at": string | null,
"code": string,
"courier_id": string | null,
"created_at": string,
"created_by": string | null,
"customer_name": string,
"customer_phone": string,
"delivered_at": string | null,
"id": string,
"latitude": number | null,
"longitude": number | null,
"notes": string | null,
"package_description": string | null,
"payment_method": Database["public"]['Enums']["payment_method"] | null,
"payment_status": Database["public"]['Enums']["payment_status"],
"scheduled_date": string | null,
"started_at": string | null,
"status": Database["public"]['Enums']["delivery_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "deliveries"
        isOneToOne: true
        isSetofReturn: false
      } },
"claim_delivery":
{ Args: { "p_delivery_id": string }; Returns: {
              "address": string,
"address_note": string | null,
"amount_due": number,
"assigned_at": string | null,
"cancel_reason": string | null,
"cancelled_at": string | null,
"code": string,
"courier_id": string | null,
"created_at": string,
"created_by": string | null,
"customer_name": string,
"customer_phone": string,
"delivered_at": string | null,
"id": string,
"latitude": number | null,
"longitude": number | null,
"notes": string | null,
"package_description": string | null,
"payment_method": Database["public"]['Enums']["payment_method"] | null,
"payment_status": Database["public"]['Enums']["payment_status"],
"scheduled_date": string | null,
"started_at": string | null,
"status": Database["public"]['Enums']["delivery_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "deliveries"
        isOneToOne: true
        isSetofReturn: false
      } },
"complete_delivery":
{ Args: { "p_delivery_id": string,"p_note"?: string }; Returns: {
              "address": string,
"address_note": string | null,
"amount_due": number,
"assigned_at": string | null,
"cancel_reason": string | null,
"cancelled_at": string | null,
"code": string,
"courier_id": string | null,
"created_at": string,
"created_by": string | null,
"customer_name": string,
"customer_phone": string,
"delivered_at": string | null,
"id": string,
"latitude": number | null,
"longitude": number | null,
"notes": string | null,
"package_description": string | null,
"payment_method": Database["public"]['Enums']["payment_method"] | null,
"payment_status": Database["public"]['Enums']["payment_status"],
"scheduled_date": string | null,
"started_at": string | null,
"status": Database["public"]['Enums']["delivery_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "deliveries"
        isOneToOne: true
        isSetofReturn: false
      } },
"list_available_deliveries":
{ Args: Record<PropertyKey, never>; Returns: {
              "address": string,"address_note": string,"amount_due": number,"code": string,"created_at": string,"id": string,"latitude": number,"longitude": number,"package_description": string,"scheduled_date": string
            }[]
                           },
"reassign_delivery":
{ Args: { "p_courier_id": string,"p_delivery_id": string,"p_reason": string }; Returns: {
              "address": string,
"address_note": string | null,
"amount_due": number,
"assigned_at": string | null,
"cancel_reason": string | null,
"cancelled_at": string | null,
"code": string,
"courier_id": string | null,
"created_at": string,
"created_by": string | null,
"customer_name": string,
"customer_phone": string,
"delivered_at": string | null,
"id": string,
"latitude": number | null,
"longitude": number | null,
"notes": string | null,
"package_description": string | null,
"payment_method": Database["public"]['Enums']["payment_method"] | null,
"payment_status": Database["public"]['Enums']["payment_status"],
"scheduled_date": string | null,
"started_at": string | null,
"status": Database["public"]['Enums']["delivery_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "deliveries"
        isOneToOne: true
        isSetofReturn: false
      } },
"record_payment":
{ Args: { "p_amount": number,"p_delivery_id": string,"p_method": Database["public"]['Enums']["payment_method"],"p_note"?: string,"p_receipt_path"?: string }; Returns: {
              "amount": number,
"delivery_id": string,
"id": string,
"method": Database["public"]['Enums']["payment_method"],
"note": string | null,
"receipt_path": string | null,
"recorded_at": string,
"recorded_by": string,
"void_reason": string | null,
"voided_at": string | null,
"voided_by": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "payment_records"
        isOneToOne: true
        isSetofReturn: false
      } },
"return_delivery":
{ Args: { "p_delivery_id": string,"p_reason": string }; Returns: {
              "address": string,
"address_note": string | null,
"amount_due": number,
"assigned_at": string | null,
"cancel_reason": string | null,
"cancelled_at": string | null,
"code": string,
"courier_id": string | null,
"created_at": string,
"created_by": string | null,
"customer_name": string,
"customer_phone": string,
"delivered_at": string | null,
"id": string,
"latitude": number | null,
"longitude": number | null,
"notes": string | null,
"package_description": string | null,
"payment_method": Database["public"]['Enums']["payment_method"] | null,
"payment_status": Database["public"]['Enums']["payment_status"],
"scheduled_date": string | null,
"started_at": string | null,
"status": Database["public"]['Enums']["delivery_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "deliveries"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_courier_active":
{ Args: { "p_active": boolean,"p_courier_id": string }; Returns: {
              "created_at": string,
"expo_push_token": string | null,
"full_name": string,
"id": string,
"is_active": boolean,
"phone": string | null,
"role": Database["public"]['Enums']["user_role"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"start_delivery":
{ Args: { "p_delivery_id": string }; Returns: {
              "address": string,
"address_note": string | null,
"amount_due": number,
"assigned_at": string | null,
"cancel_reason": string | null,
"cancelled_at": string | null,
"code": string,
"courier_id": string | null,
"created_at": string,
"created_by": string | null,
"customer_name": string,
"customer_phone": string,
"delivered_at": string | null,
"id": string,
"latitude": number | null,
"longitude": number | null,
"notes": string | null,
"package_description": string | null,
"payment_method": Database["public"]['Enums']["payment_method"] | null,
"payment_status": Database["public"]['Enums']["payment_status"],
"scheduled_date": string | null,
"started_at": string | null,
"status": Database["public"]['Enums']["delivery_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "deliveries"
        isOneToOne: true
        isSetofReturn: false
      } },
"unassign_delivery":
{ Args: { "p_delivery_id": string,"p_reason": string }; Returns: {
              "address": string,
"address_note": string | null,
"amount_due": number,
"assigned_at": string | null,
"cancel_reason": string | null,
"cancelled_at": string | null,
"code": string,
"courier_id": string | null,
"created_at": string,
"created_by": string | null,
"customer_name": string,
"customer_phone": string,
"delivered_at": string | null,
"id": string,
"latitude": number | null,
"longitude": number | null,
"notes": string | null,
"package_description": string | null,
"payment_method": Database["public"]['Enums']["payment_method"] | null,
"payment_status": Database["public"]['Enums']["payment_status"],
"scheduled_date": string | null,
"started_at": string | null,
"status": Database["public"]['Enums']["delivery_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "deliveries"
        isOneToOne: true
        isSetofReturn: false
      } },
"void_payment":
{ Args: { "p_payment_id": string,"p_reason": string }; Returns: {
              "amount": number,
"delivery_id": string,
"id": string,
"method": Database["public"]['Enums']["payment_method"],
"note": string | null,
"receipt_path": string | null,
"recorded_at": string,
"recorded_by": string,
"void_reason": string | null,
"voided_at": string | null,
"voided_by": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "payment_records"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "assignment_end": "REASSIGNED"|"UNASSIGNED"|"RETURNED"|"CANCELLED"|"COMPLETED","assignment_start": "ASSIGNED"|"CLAIMED"|"REASSIGNED","delivery_status": "UNASSIGNED"|"ASSIGNED"|"IN_PROGRESS"|"DELIVERED"|"CANCELLED","payment_method": "CASH"|"BANK_TRANSFER","payment_status": "PAID"|"UNPAID","user_role": "ADMIN"|"COURIER"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "assignment_end": ["REASSIGNED", "UNASSIGNED", "RETURNED", "CANCELLED", "COMPLETED"],"assignment_start": ["ASSIGNED", "CLAIMED", "REASSIGNED"],"delivery_status": ["UNASSIGNED", "ASSIGNED", "IN_PROGRESS", "DELIVERED", "CANCELLED"],"payment_method": ["CASH", "BANK_TRANSFER"],"payment_status": ["PAID", "UNPAID"],"user_role": ["ADMIN", "COURIER"]
          }
        }
} as const
