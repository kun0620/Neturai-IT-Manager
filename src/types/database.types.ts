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
      assets: {
        Row: {
          asset_code: string | null
          assigned_to: string | null
          category: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          last_service_date: string | null
          location: string | null
          name: string
          serial_number: string | null
          status: Database['public']['Enums']['asset_status']
          updated_at: string
        }
        Insert: {
          asset_code?: string | null
          assigned_to?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          last_service_date?: string | null
          location?: string | null
          name: string
          serial_number?: string | null
          status?: Database['public']['Enums']['asset_status']
          updated_at?: string
        }
        Update: {
          asset_code?: string | null
          assigned_to?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          last_service_date?: string | null
          location?: string | null
          name?: string
          serial_number?: string | null
          status?: Database['public']['Enums']['asset_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'assets_assigned_to_fkey'
            columns: ['assigned_to']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'assets_category_id_fkey'
            columns: ['category_id']
            referencedRelation: 'ticket_categories'
            referencedColumns: ['id']
          },
        ]
      }
      logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'logs_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      repairs: {
        Row: {
          asset_id: string
          cost: number | null
          created_at: string
          description: string | null
          id: string
          repair_date: string
          service_provider: string | null
          updated_at: string
        }
        Insert: {
          asset_id: string
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          repair_date?: string
          service_provider?: string | null
          updated_at?: string
        }
        Update: {
          asset_id?: string
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          repair_date?: string
          service_provider?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'repairs_asset_id_fkey'
            columns: ['asset_id']
            referencedRelation: 'assets'
            referencedColumns: ['id']
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      sla_policies: {
        Row: {
          created_at: string
          id: string
          priority: Database['public']['Enums']['ticket_priority']
          resolution_time_hours: number
          response_time_hours: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          priority: Database['public']['Enums']['ticket_priority']
          resolution_time_hours?: number
          response_time_hours?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          priority?: Database['public']['Enums']['ticket_priority']
          resolution_time_hours?: number
          response_time_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      ticket_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          comment_text: string
          created_at: string
          id: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          id?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          id?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ticket_comments_ticket_id_fkey'
            columns: ['ticket_id']
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_comments_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      ticket_history: {
        Row: {
          changed_by: string
          changed_field: string
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          ticket_id: string
        }
        Insert: {
          changed_by: string
          changed_field: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id: string
        }
        Update: {
          changed_by?: string
          changed_field?: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ticket_history_changed_by_fkey'
            columns: ['changed_by']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_history_ticket_id_fkey'
            columns: ['ticket_id']
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          category_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          priority: Database['public']['Enums']['ticket_priority']
          resolved_at: string | null
          status: Database['public']['Enums']['ticket_status']
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          priority?: Database['public']['Enums']['ticket_priority']
          resolved_at?: string | null
          status?: Database['public']['Enums']['ticket_status']
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          priority?: Database['public']['Enums']['ticket_priority']
          resolved_at?: string | null
          status?: Database['public']['Enums']['ticket_status']
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tickets_assigned_to_fkey'
            columns: ['assigned_to']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_category_id_fkey'
            columns: ['category_id']
            referencedRelation: 'ticket_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          role_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name?: string | null
          role_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          role_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'users_id_fkey'
            columns: ['id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'users_role_id_fkey'
            columns: ['role_id']
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_average_resolution_time: {
        Args: {
          start_date: string
          end_date: string
        }
        Returns: {
          average_resolution_hours: number
        }[]
      }
      get_issue_categories_distribution: {
        Args: {
          start_date: string
          end_date: string
        }
        Returns: {
          category_name: string
          ticket_count: number
        }[]
      }
      get_tickets_created_per_month: {
        Args: {
          start_date: string
          end_date: string
        }
        Returns: {
          month: string
          count: number
        }[]
      }
      get_top_repaired_assets: {
        Args: {
          start_date: string
          end_date: string
          top_n: number
        }
        Returns: {
          asset_name: string
          repair_count: number
          total_cost: number
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      asset_status: 'Available' | 'Assigned' | 'In Repair' | 'Retired' | 'Lost' | 'In Use'
      ticket_priority: 'Low' | 'Medium' | 'High' | 'Critical'
      ticket_status: 'Open' | 'In Progress' | 'Resolved' | 'Closed'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, 'public'>]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName]['Row']
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions]['Row']
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName]['Insert']
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions]['Insert']
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName]['Update']
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions]['Update']
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never
