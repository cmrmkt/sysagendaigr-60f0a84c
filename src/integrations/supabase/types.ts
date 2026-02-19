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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          background_color: string
          content: string
          created_at: string | null
          created_by: string | null
          external_link: string | null
          id: string
          organization_id: string
          priority: string
          publish_date: string
          status: string
          text_color: string
          title: string
          unpublish_date: string | null
          updated_at: string | null
        }
        Insert: {
          background_color?: string
          content: string
          created_at?: string | null
          created_by?: string | null
          external_link?: string | null
          id?: string
          organization_id: string
          priority?: string
          publish_date?: string
          status?: string
          text_color?: string
          title: string
          unpublish_date?: string | null
          updated_at?: string | null
        }
        Update: {
          background_color?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          external_link?: string | null
          id?: string
          organization_id?: string
          priority?: string
          publish_date?: string
          status?: string
          text_color?: string
          title?: string
          unpublish_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_collaborator_ministries: {
        Row: {
          event_id: string
          ministry_id: string
        }
        Insert: {
          event_id: string
          ministry_id: string
        }
        Update: {
          event_id?: string
          ministry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_collaborator_ministries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_collaborator_ministries_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      event_collaborators: {
        Row: {
          event_id: string
          user_id: string
        }
        Insert: {
          event_id: string
          user_id: string
        }
        Update: {
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_collaborators_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tasks: {
        Row: {
          assignee_ids: string[] | null
          checklists: Json | null
          created_at: string | null
          description: string | null
          due_date: string | null
          event_id: string
          id: string
          is_archived: boolean | null
          label_ids: string[] | null
          ministry_id: string | null
          organization_id: string
          priority: string
          start_date: string | null
          status: string
          task_order: number
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee_ids?: string[] | null
          checklists?: Json | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          event_id: string
          id?: string
          is_archived?: boolean | null
          label_ids?: string[] | null
          ministry_id?: string | null
          organization_id: string
          priority?: string
          start_date?: string | null
          status?: string
          task_order?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee_ids?: string[] | null
          checklists?: Json | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          event_id?: string
          id?: string
          is_archived?: boolean | null
          label_ids?: string[] | null
          ministry_id?: string | null
          organization_id?: string
          priority?: string
          start_date?: string | null
          status?: string
          task_order?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tasks_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_templates: {
        Row: {
          collaborator_ministry_ids: string[] | null
          created_at: string | null
          default_end_time: string | null
          default_location: string | null
          default_start_time: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_all_day: boolean | null
          ministry_id: string | null
          observations: string | null
          organization_id: string
          title: string
          updated_at: string | null
          visibility: string | null
          volunteer_user_ids: string[] | null
        }
        Insert: {
          collaborator_ministry_ids?: string[] | null
          created_at?: string | null
          default_end_time?: string | null
          default_location?: string | null
          default_start_time?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_all_day?: boolean | null
          ministry_id?: string | null
          observations?: string | null
          organization_id: string
          title: string
          updated_at?: string | null
          visibility?: string | null
          volunteer_user_ids?: string[] | null
        }
        Update: {
          collaborator_ministry_ids?: string[] | null
          created_at?: string | null
          default_end_time?: string | null
          default_location?: string | null
          default_start_time?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_all_day?: boolean | null
          ministry_id?: string | null
          observations?: string | null
          organization_id?: string
          title?: string
          updated_at?: string | null
          visibility?: string | null
          volunteer_user_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "event_templates_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_volunteers: {
        Row: {
          event_id: string
          user_id: string
        }
        Insert: {
          event_id: string
          user_id: string
        }
        Update: {
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_volunteers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          custom_color: string | null
          custom_message_template: Json | null
          custom_reminder_templates: Json | null
          date: string
          end_date: string | null
          end_time: string
          id: string
          is_all_day: boolean | null
          location: string | null
          ministry_id: string | null
          observations: string | null
          organization_id: string
          parent_event_id: string | null
          recurrence: Json | null
          reminder: string | null
          responsible_id: string | null
          start_time: string
          title: string
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          created_at?: string | null
          custom_color?: string | null
          custom_message_template?: Json | null
          custom_reminder_templates?: Json | null
          date: string
          end_date?: string | null
          end_time: string
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          ministry_id?: string | null
          observations?: string | null
          organization_id: string
          parent_event_id?: string | null
          recurrence?: Json | null
          reminder?: string | null
          responsible_id?: string | null
          start_time: string
          title: string
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          created_at?: string | null
          custom_color?: string | null
          custom_message_template?: Json | null
          custom_reminder_templates?: Json | null
          date?: string
          end_date?: string | null
          end_time?: string
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          ministry_id?: string | null
          observations?: string | null
          organization_id?: string
          parent_event_id?: string | null
          recurrence?: Json | null
          reminder?: string | null
          responsible_id?: string | null
          start_time?: string
          title?: string
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          notes: string | null
          organization_id: string
          paid_at: string | null
          payment_method: string | null
          reference_month: string
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          payment_method?: string | null
          reference_month: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          payment_method?: string | null
          reference_month?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ministries: {
        Row: {
          color: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ministries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          error_message: string | null
          id: string
          recipient_id: string
          recipient_name: string | null
          sent_at: string | null
          status: string
          tag: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          error_message?: string | null
          id?: string
          recipient_id: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          tag?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          error_message?: string | null
          id?: string
          recipient_id?: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          tag?: string | null
          title?: string
        }
        Relationships: []
      }
      organization_credentials: {
        Row: {
          evolution_api_key: string | null
          evolution_api_url: string | null
          evolution_instance_name: string | null
          organization_id: string
        }
        Insert: {
          evolution_api_key?: string | null
          evolution_api_url?: string | null
          evolution_instance_name?: string | null
          organization_id: string
        }
        Update: {
          evolution_api_key?: string | null
          evolution_api_url?: string | null
          evolution_instance_name?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          billing_day: number | null
          city: string | null
          country_code: string
          created_at: string | null
          email: string | null
          id: string
          last_login_at: string | null
          logo_url: string | null
          name: string
          phone: string | null
          postal_code: string | null
          reminder_settings: Json | null
          slug: string
          state: string | null
          status: string
          subscription_amount: number | null
          subscription_status: string
          suspended_at: string | null
          suspended_reason: string | null
          tax_id: string | null
          trial_ends_at: string | null
          updated_at: string | null
          whatsapp_connected: boolean | null
          whatsapp_connected_at: string | null
          whatsapp_phone_number: string | null
        }
        Insert: {
          address?: string | null
          billing_day?: number | null
          city?: string | null
          country_code?: string
          created_at?: string | null
          email?: string | null
          id?: string
          last_login_at?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          postal_code?: string | null
          reminder_settings?: Json | null
          slug: string
          state?: string | null
          status?: string
          subscription_amount?: number | null
          subscription_status?: string
          suspended_at?: string | null
          suspended_reason?: string | null
          tax_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          whatsapp_connected?: boolean | null
          whatsapp_connected_at?: string | null
          whatsapp_phone_number?: string | null
        }
        Update: {
          address?: string | null
          billing_day?: number | null
          city?: string | null
          country_code?: string
          created_at?: string | null
          email?: string | null
          id?: string
          last_login_at?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          reminder_settings?: Json | null
          slug?: string
          state?: string | null
          status?: string
          subscription_amount?: number | null
          subscription_status?: string
          suspended_at?: string | null
          suspended_reason?: string | null
          tax_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          whatsapp_connected?: boolean | null
          whatsapp_connected_at?: string | null
          whatsapp_phone_number?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          can_create_events: boolean | null
          created_at: string | null
          email: string | null
          id: string
          is_volunteer: boolean | null
          name: string
          national_id: string | null
          organization_id: string
          personal_id: string | null
          phone: string
          phone_country: string
          updated_at: string | null
          whatsapp: string | null
          whatsapp_country: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          can_create_events?: boolean | null
          created_at?: string | null
          email?: string | null
          id: string
          is_volunteer?: boolean | null
          name: string
          national_id?: string | null
          organization_id: string
          personal_id?: string | null
          phone: string
          phone_country?: string
          updated_at?: string | null
          whatsapp?: string | null
          whatsapp_country?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          can_create_events?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_volunteer?: boolean | null
          name?: string
          national_id?: string | null
          organization_id?: string
          personal_id?: string | null
          phone?: string
          phone_country?: string
          updated_at?: string | null
          whatsapp?: string | null
          whatsapp_country?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys_auth: string
          keys_p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys_auth: string
          keys_p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys_auth?: string
          keys_p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scheduled_reminders: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          recipient_ids: string[]
          remind_at: string
          reminder_type: string
          resource_id: string
          resource_title: string
          resource_type: string
          sent_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          recipient_ids?: string[]
          remind_at: string
          reminder_type: string
          resource_id: string
          resource_title: string
          resource_type: string
          sent_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          recipient_ids?: string[]
          remind_at?: string
          reminder_type?: string
          resource_id?: string
          resource_title?: string
          resource_type?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reminders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          organization_id: string
          resource_id: string | null
          resource_name: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          organization_id: string
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          organization_id?: string
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ministries: {
        Row: {
          ministry_id: string
          role: Database["public"]["Enums"]["ministry_role"]
          user_id: string
        }
        Insert: {
          ministry_id: string
          role?: Database["public"]["Enums"]["ministry_role"]
          user_id: string
        }
        Update: {
          ministry_id?: string
          role?: Database["public"]["Enums"]["ministry_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ministries_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_admin: { Args: { _user_id: string }; Returns: boolean }
      log_action: {
        Args: {
          _action: string
          _metadata?: Json
          _resource_id?: string
          _resource_name?: string
          _resource_type?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "leader" | "viewer"
      ministry_role: "leader" | "member"
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
      app_role: ["super_admin", "admin", "leader", "viewer"],
      ministry_role: ["leader", "member"],
    },
  },
} as const
