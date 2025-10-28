export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      assets: {
        Row: {
          asset_code: string;
          assigned_to: string | null;
          category: Database['public']['Enums']['asset_category'];
          created_at: string | null;
          id: string;
          location: string | null;
          name: string;
          serial_number: string | null;
          status: Database['public']['Enums']['asset_status'];
          updated_at: string | null;
        };
        Insert: {
          asset_code: string;
          assigned_to?: string | null;
          category?: Database['public']['Enums']['asset_category'];
          created_at?: string | null;
          id?: string;
          location?: string | null;
          name: string;
          serial_number?: string | null;
          status?: Database['public']['Enums']['asset_status'];
          updated_at?: string | null;
        };
        Update: {
          asset_code?: string;
          assigned_to?: string | null;
          category?: Database['public']['Enums']['asset_category'];
          created_at?: string | null;
          id?: string;
          location?: string | null;
          name?: string;
          serial_number?: string | null;
          status?: Database['public']['Enums']['asset_status'];
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'assets_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      repairs: {
        Row: {
          asset_id: string;
          cost: number | null;
          created_at: string | null;
          description: string;
          id: string;
          repair_date: string | null;
          status: Database['public']['Enums']['repair_status'];
          updated_at: string | null;
        };
        Insert: {
          asset_id: string;
          cost?: number | null;
          created_at?: string | null;
          description: string;
          id?: string;
          repair_date?: string | null;
          status?: Database['public']['Enums']['repair_status'];
          updated_at?: string | null;
        };
        Update: {
          asset_id?: string;
          cost?: number | null;
          created_at?: string | null;
          description?: string;
          id?: string;
          repair_date?: string | null;
          status?: Database['public']['Enums']['repair_status'];
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'repairs_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
        ];
      };
      ticket_comments: {
        Row: {
          comment_text: string;
          created_at: string | null;
          id: string;
          ticket_id: string;
          user_id: string | null;
        };
        Insert: {
          comment_text: string;
          created_at?: string | null;
          id?: string;
          ticket_id: string;
          user_id?: string | null;
        };
        Update: {
          comment_text?: string;
          created_at?: string | null;
          id?: string;
          ticket_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ticket_comments_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ticket_comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      ticket_history: {
        Row: {
          change_type: string;
          created_at: string | null;
          id: string;
          new_value: string | null;
          old_value: string | null;
          ticket_id: string;
          user_id: string | null;
        };
        Insert: {
          change_type: string;
          created_at?: string | null;
          id?: string;
          new_value?: string | null;
          old_value?: string | null;
          ticket_id: string;
          user_id?: string | null;
        };
        Update: {
          change_type?: string;
          created_at?: string | null;
          id?: string;
          new_value?: string | null;
          old_value?: string | null;
          ticket_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ticket_history_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ticket_history_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      tickets: {
        Row: {
          assignee: string | null;
          category: Database['public']['Enums']['ticket_category'];
          created_at: string | null;
          description: string | null;
          id: string;
          priority: Database['public']['Enums']['ticket_priority'];
          status: Database['public']['Enums']['ticket_status'];
          subject: string;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          assignee?: string | null;
          category?: Database['public']['Enums']['ticket_category'];
          created_at?: string | null;
          description?: string | null;
          id?: string;
          priority?: Database['public']['Enums']['ticket_priority'];
          status?: Database['public']['Enums']['ticket_status'];
          subject: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          assignee?: string | null;
          category?: Database['public']['Enums']['ticket_category'];
          created_at?: string | null;
          description?: string | null;
          id?: string;
          priority?: Database['public']['Enums']['ticket_priority'];
          status?: Database['public']['Enums']['ticket_status'];
          subject?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'tickets_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          created_at: string | null;
          email: string;
          id: string;
          name: string;
          role: Database['public']['Enums']['user_role'];
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          id: string;
          name?: string;
          role?: Database['public']['Enums']['user_role'];
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          id?: string;
          name?: string;
          role?: Database['public']['Enums']['user_role'];
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'users_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_issue_categories_distribution: {
        Args: Record<PropertyKey, never>;
        Returns: {
          category: string;
          count: number;
        }[];
      };
      get_tickets_created_per_month: {
        Args: Record<PropertyKey, never>;
        Returns: {
          count: number;
          month: number;
        }[];
      };
      update_updated_at_column: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: {
      asset_category:
        | 'Laptop'
        | 'Desktop'
        | 'Monitor'
        | 'Printer'
        | 'Network Device'
        | 'Software License'
        | 'Other';
      asset_status: 'Available' | 'Assigned' | 'In Repair' | 'Retired' | 'Lost';
      repair_status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
      ticket_category:
        | 'Hardware'
        | 'Software'
        | 'Network'
        | 'Account'
        | 'General'
        | 'Other';
      ticket_priority: 'Low' | 'Medium' | 'High' | 'Critical';
      ticket_status: 'Open' | 'In Progress' | 'Closed' | 'Resolved' | 'Pending';
      user_role: 'Admin' | 'Editor' | 'Viewer';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'] & Database['public']['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database['public']['Tables'] &
        Database['public']['Views'])
    ? (Database['public']['Tables'] &
        Database['public']['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database['public']['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof Database['public']['Enums']
    ? Database['public']['Enums'][PublicEnumNameOrOptions]
    : never;
