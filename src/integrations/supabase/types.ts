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
      categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          priority: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          priority?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          priority?: string
        }
        Relationships: []
      }
      google_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          habit_name: string
          id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date: string
          habit_name: string
          id?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          habit_name?: string
          id?: string
        }
        Relationships: []
      }
      mood_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          mood: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          mood: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          mood?: number
        }
        Relationships: []
      }
      productivity_logs: {
        Row: {
          created_at: string
          date: string
          deep_work_minutes: number | null
          id: string
          optional_minutes: number | null
          priority_10_minutes: number | null
          priority_20_minutes: number | null
          priority_70_minutes: number | null
          tasks_completed: number | null
          tasks_failed: number | null
          tasks_total: number | null
          total_planned_minutes: number | null
        }
        Insert: {
          created_at?: string
          date: string
          deep_work_minutes?: number | null
          id?: string
          optional_minutes?: number | null
          priority_10_minutes?: number | null
          priority_20_minutes?: number | null
          priority_70_minutes?: number | null
          tasks_completed?: number | null
          tasks_failed?: number | null
          tasks_total?: number | null
          total_planned_minutes?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          deep_work_minutes?: number | null
          id?: string
          optional_minutes?: number | null
          priority_10_minutes?: number | null
          priority_20_minutes?: number | null
          priority_70_minutes?: number | null
          tasks_completed?: number | null
          tasks_failed?: number | null
          tasks_total?: number | null
          total_planned_minutes?: number | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          block_id: string | null
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          duration_minutes: number
          id: string
          link: string | null
          name: string
          notion_source: boolean | null
          parent_task_id: string | null
          priority: string
          recurrence_config: Json | null
          recurrence_kind: string
          sort_order: number | null
          start_time: string
          status: string
        }
        Insert: {
          block_id?: string | null
          category_id?: string | null
          created_at?: string
          date: string
          description?: string | null
          duration_minutes?: number
          id?: string
          link?: string | null
          name: string
          notion_source?: boolean | null
          parent_task_id?: string | null
          priority?: string
          recurrence_config?: Json | null
          recurrence_kind?: string
          sort_order?: number | null
          start_time?: string
          status?: string
        }
        Update: {
          block_id?: string | null
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          link?: string | null
          name?: string
          notion_source?: boolean | null
          parent_task_id?: string | null
          priority?: string
          recurrence_config?: Json | null
          recurrence_kind?: string
          sort_order?: number | null
          start_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "time_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      time_blocks: {
        Row: {
          color: string | null
          created_at: string
          end_time: string
          id: string
          is_active: boolean
          name: string
          priority: string | null
          sort_order: number
          start_time: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          end_time: string
          id?: string
          is_active?: boolean
          name: string
          priority?: string | null
          sort_order?: number
          start_time: string
        }
        Update: {
          color?: string | null
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          name?: string
          priority?: string | null
          sort_order?: number
          start_time?: string
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
