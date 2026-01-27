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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      asset_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      asset_field_values: {
        Row: {
          asset_id: string
          field_id: string
          id: string
          value_date: string | null
          value_json: Json | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          asset_id: string
          field_id: string
          id?: string
          value_date?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          asset_id?: string
          field_id?: string
          id?: string
          value_date?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_field_values_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "asset_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_fields: {
        Row: {
          asset_type_id: string
          created_at: string | null
          field_key: string
          field_label: string
          field_type: string
          id: string
          is_required: boolean | null
          options: Json | null
        }
        Insert: {
          asset_type_id: string
          created_at?: string | null
          field_key: string
          field_label: string
          field_type: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
        }
        Update: {
          asset_type_id?: string
          created_at?: string | null
          field_key?: string
          field_label?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_fields_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_histories: {
        Row: {
          action: string
          asset_id: string
          changed_by: string | null
          created_at: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          asset_id: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          asset_id?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_histories_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_logs: {
        Row: {
          action: Database["public"]["Enums"]["asset_log_action"]
          asset_id: string
          created_at: string
          field: string
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          performed_by: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["asset_log_action"]
          asset_id: string
          created_at?: string
          field: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["asset_log_action"]
          asset_id?: string
          created_at?: string
          field?: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_types: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          key: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          key: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          asset_code: string
          asset_type_id: string | null
          assigned_to: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          last_service_date: string | null
          location: string | null
          name: string
          serial_number: string | null
          status: Database["public"]["Enums"]["asset_status"]
          updated_at: string | null
        }
        Insert: {
          asset_code: string
          asset_type_id?: string | null
          assigned_to?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          last_service_date?: string | null
          location?: string | null
          name: string
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          updated_at?: string | null
        }
        Update: {
          asset_code?: string
          asset_type_id?: string | null
          assigned_to?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          last_service_date?: string | null
          location?: string | null
          name?: string
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          ticket_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          ticket_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          ticket_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          role?: string | null
        }
        Relationships: []
      }
      repairs: {
        Row: {
          asset_id: string
          cost: number | null
          created_at: string | null
          description: string
          id: string
          repair_date: string | null
          status: Database["public"]["Enums"]["repair_status"] | null
          updated_at: string | null
        }
        Insert: {
          asset_id: string
          cost?: number | null
          created_at?: string | null
          description: string
          id?: string
          repair_date?: string | null
          status?: Database["public"]["Enums"]["repair_status"] | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string
          cost?: number | null
          created_at?: string | null
          description?: string
          id?: string
          repair_date?: string | null
          status?: Database["public"]["Enums"]["repair_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string | null
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      sla_policies: {
        Row: {
          created_at: string | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority_enum"]
          resolution_time_hours: number
          response_time_hours: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          priority: Database["public"]["Enums"]["ticket_priority_enum"]
          resolution_time_hours?: number
          response_time_hours?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority_enum"]
          resolution_time_hours?: number
          response_time_hours?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      ticket_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          comment_text: string
          created_at: string | null
          id: string
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          comment_text: string
          created_at?: string | null
          id?: string
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          comment_text?: string
          created_at?: string | null
          id?: string
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_history: {
        Row: {
          change_type: string
          changes: Json | null
          created_at: string | null
          id: string
          new_value: string | null
          old_value: string | null
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          change_type: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          change_type?: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_priorities: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tickets: {
        Row: {
          assigned_to: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          priority: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          title?: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_priority_fk"
            columns: ["priority"]
            isOneToOne: false
            referencedRelation: "ticket_priorities"
            referencedColumns: ["name"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_role_to_jwt: { Args: { event: Json }; Returns: Json }
      current_user_role: { Args: never; Returns: string }
      get_average_resolution_time: {
        Args: { end_date: string; start_date: string }
        Returns: {
          avg_time_hours: number
        }[]
      }
      get_issue_categories_distribution:
        | {
            Args: never
            Returns: {
              category: string
              count: number
            }[]
          }
        | {
            Args: { end_date: string; start_date: string }
            Returns: {
              category_name: string
              count: number
            }[]
          }
      get_tickets_created_per_month:
        | {
            Args: never
            Returns: {
              count: number
              month: number
            }[]
          }
        | {
            Args: { end_date: string; start_date: string }
            Returns: {
              month: string
              tickets: number
            }[]
          }
      get_top_repaired_assets:
        | {
            Args: { end_date: string; start_date: string }
            Returns: {
              asset_code: string
              asset_name: string
              repairs_count: number
            }[]
          }
        | {
            Args: { end_date: string; start_date: string; top_n?: number }
            Returns: {
              asset_code: string
              asset_name: string
              repairs_count: number
            }[]
          }
      handle_custom_jwt_claims: { Args: never; Returns: Json }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { user_id: string }; Returns: boolean }
      is_technician: { Args: never; Returns: boolean }
      jwt_custom_claims: { Args: { event: Json }; Returns: Json }
      notify_ticket_updated: {
        Args: { p_body: string; p_ticket_ids: string[]; p_title: string }
        Returns: undefined
      }
    }
    Enums: {
      asset_category:
        | "Laptop"
        | "Desktop"
        | "Monitor"
        | "Printer"
        | "Network Device"
        | "Software License"
        | "Other"
      asset_log_action:
        | "create"
        | "update"
        | "assign"
        | "unassign"
        | "status_change"
        | "custom_field_update"
      asset_status:
        | "Available"
        | "Assigned"
        | "In Repair"
        | "Retired"
        | "Lost"
        | "In Use"
      repair_status: "Pending" | "In Progress" | "Completed" | "Cancelled"
      ticket_priority: "low" | "medium" | "high"
      ticket_priority_enum: "Low" | "Medium" | "High" | "Critical"
      ticket_status: "open" | "in_progress" | "closed"
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
      asset_category: [
        "Laptop",
        "Desktop",
        "Monitor",
        "Printer",
        "Network Device",
        "Software License",
        "Other",
      ],
      asset_log_action: [
        "create",
        "update",
        "assign",
        "unassign",
        "status_change",
        "custom_field_update",
      ],
      asset_status: [
        "Available",
        "Assigned",
        "In Repair",
        "Retired",
        "Lost",
        "In Use",
      ],
      repair_status: ["Pending", "In Progress", "Completed", "Cancelled"],
      ticket_priority: ["low", "medium", "high"],
      ticket_priority_enum: ["Low", "Medium", "High", "Critical"],
      ticket_status: ["open", "in_progress", "closed"],
    },
  },
} as const
