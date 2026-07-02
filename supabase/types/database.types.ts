export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_message_at: string | null
          matchmaking_answer_id: string
          participant_1_id: string
          participant_2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_message_at?: string | null
          matchmaking_answer_id: string
          participant_1_id: string
          participant_2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_message_at?: string | null
          matchmaking_answer_id?: string
          participant_1_id?: string
          participant_2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_matchmaking_answer_id_fkey"
            columns: ["matchmaking_answer_id"]
            isOneToOne: true
            referencedRelation: "matchmaking_answers"
            referencedColumns: ["id"]
          },
        ]
      }
      matchmaking_answers: {
        Row: {
          answer_text: string
          answered_at: string
          answerer_id: string
          conversation_id: string | null
          id: string
          question_owner_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["connection_status"]
        }
        Insert: {
          answer_text: string
          answered_at?: string
          answerer_id: string
          conversation_id?: string | null
          id?: string
          question_owner_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
        }
        Update: {
          answer_text?: string
          answered_at?: string
          answerer_id?: string
          conversation_id?: string | null
          id?: string
          question_owner_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
        }
        Relationships: [
          {
            foreignKeyName: "matchmaking_answers_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          id: string
          is_deleted_by_sender: boolean
          is_read: boolean
          media_url: string | null
          message_type: Database["public"]["Enums"]["message_type"]
          read_at: string | null
          sender_id: string
          sent_at: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          id?: string
          is_deleted_by_sender?: boolean
          is_read?: boolean
          media_url?: string | null
          message_type?: Database["public"]["Enums"]["message_type"]
          read_at?: string | null
          sender_id: string
          sent_at?: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          id?: string
          is_deleted_by_sender?: boolean
          is_read?: boolean
          media_url?: string | null
          message_type?: Database["public"]["Enums"]["message_type"]
          read_at?: string | null
          sender_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_photos: {
        Row: {
          display_order: number
          id: string
          is_primary: boolean
          photo_url: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          display_order: number
          id?: string
          is_primary?: boolean
          photo_url: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          display_order?: number
          id?: string
          is_primary?: boolean
          photo_url?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          is_profile_complete: boolean
          is_visible: boolean
          location_city: string | null
          location_lat: number | null
          location_lng: number | null
          location_point: unknown
          location_updated_at: string | null
          matchmaking_question: string | null
          max_distance_km: number
          onboarding_step: number
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_profile_complete?: boolean
          is_visible?: boolean
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_point?: unknown
          location_updated_at?: string | null
          matchmaking_question?: string | null
          max_distance_km?: number
          onboarding_step?: number
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_profile_complete?: boolean
          is_visible?: boolean
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_point?: unknown
          location_updated_at?: string | null
          matchmaking_question?: string | null
          max_distance_km?: number
          onboarding_step?: number
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          device_id: string | null
          id: string
          is_active: boolean
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          device_id?: string | null
          id?: string
          is_active?: boolean
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          device_id?: string | null
          id?: string
          is_active?: boolean
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_id: string | null
          reported_message_id: string | null
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_id?: string | null
          reported_message_id?: string | null
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_id?: string | null
          reported_message_id?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_message_id_fkey"
            columns: ["reported_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interests: {
        Row: {
          added_at: string
          id: string
          tag: string
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          tag: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          tag?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_nearby_users: {
        Args: {
          p_lat: number
          p_lng: number
          p_max_km: number
          p_requester_id: string
        }
        Returns: {
          age_years: number
          avatar_url: string
          city: string
          display_name: string
          distance_km: number
          interest_tags: string[]
          profile_id: string
        }[]
      }
      get_or_create_conversation: {
        Args: {
          p_matchmaking_answer_id: string
          p_user_a: string
          p_user_b: string
        }
        Returns: string
      }
    }
    Enums: {
      connection_status: "pending" | "accepted" | "declined"
      gender_type: "male" | "female" | "non_binary" | "prefer_not_to_say"
      message_type: "text" | "image" | "system"
      report_reason:
        | "harassment"
        | "fake_profile"
        | "inappropriate_content"
        | "spam"
        | "underage"
        | "other"
      report_status: "open" | "under_review" | "actioned" | "dismissed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      connection_status: ["pending", "accepted", "declined"],
      gender_type: ["male", "female", "non_binary", "prefer_not_to_say"],
      message_type: ["text", "image", "system"],
      report_reason: [
        "harassment",
        "fake_profile",
        "inappropriate_content",
        "spam",
        "underage",
        "other",
      ],
      report_status: ["open", "under_review", "actioned", "dismissed"],
    },
  },
} as const

