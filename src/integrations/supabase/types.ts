export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      ai_coach_conversations: {
        Row: {
          ai_response: string
          coach_type: string
          context_data: Json | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
          user_message: string
        }
        Insert: {
          ai_response: string
          coach_type: string
          context_data?: Json | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          user_message: string
        }
        Update: {
          ai_response?: string
          coach_type?: string
          context_data?: Json | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          user_message?: string
        }
        Relationships: []
      }
      assessments: {
        Row: {
          api_results: Json | null
          conditions: Json | null
          created_at: string
          id: string
          interview_responses: Json | null
          next_steps: string | null
          profile_id: string | null
          symptom_description: string
          triage_level: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_results?: Json | null
          conditions?: Json | null
          created_at?: string
          id?: string
          interview_responses?: Json | null
          next_steps?: string | null
          profile_id?: string | null
          symptom_description: string
          triage_level?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_results?: Json | null
          conditions?: Json | null
          created_at?: string
          id?: string
          interview_responses?: Json | null
          next_steps?: string | null
          profile_id?: string | null
          symptom_description?: string
          triage_level?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      description_templates: {
        Row: {
          category: string
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          sections: Json | null
          template: string
          updated_at: string
          user_id: string
          variables: string[] | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          sections?: Json | null
          template: string
          updated_at?: string
          user_id: string
          variables?: string[] | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          sections?: Json | null
          template?: string
          updated_at?: string
          user_id?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      ebay_auth: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_insights: {
        Row: {
          created_at: string
          description: string
          id: string
          insight_type: string
          is_active: boolean | null
          priority: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          insight_type: string
          is_active?: boolean | null
          priority?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          insight_type?: string
          is_active?: boolean | null
          priority?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      listing_drafts: {
        Row: {
          ai_generated_data: Json | null
          brand: string | null
          category: string | null
          color: string | null
          condition_grade: string | null
          confidence_scores: Json | null
          created_at: string
          description: string | null
          id: string
          item_specifics: Json | null
          material: string | null
          measurements: Json | null
          photos: string[] | null
          processed_photos: string[] | null
          size_info: string | null
          status: string | null
          style_number: string | null
          title: string | null
          updated_at: string
          user_edits: Json | null
          user_id: string
        }
        Insert: {
          ai_generated_data?: Json | null
          brand?: string | null
          category?: string | null
          color?: string | null
          condition_grade?: string | null
          confidence_scores?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          item_specifics?: Json | null
          material?: string | null
          measurements?: Json | null
          photos?: string[] | null
          processed_photos?: string[] | null
          size_info?: string | null
          status?: string | null
          style_number?: string | null
          title?: string | null
          updated_at?: string
          user_edits?: Json | null
          user_id: string
        }
        Update: {
          ai_generated_data?: Json | null
          brand?: string | null
          category?: string | null
          color?: string | null
          condition_grade?: string | null
          confidence_scores?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          item_specifics?: Json | null
          material?: string | null
          measurements?: Json | null
          photos?: string[] | null
          processed_photos?: string[] | null
          size_info?: string | null
          status?: string | null
          style_number?: string | null
          title?: string | null
          updated_at?: string
          user_edits?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          allergies: string[] | null
          bmi: number | null
          business_name: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          emergency_contact: string | null
          full_name: string | null
          health_goals: string[] | null
          health_questionnaire_completed: boolean | null
          height_cm: number | null
          id: string
          medical_conditions: string[] | null
          medications: string[] | null
          onboarding_completed: boolean | null
          preferred_units: string | null
          relationship: string | null
          sex: string | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          allergies?: string[] | null
          bmi?: number | null
          business_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string | null
          health_goals?: string[] | null
          health_questionnaire_completed?: boolean | null
          height_cm?: number | null
          id?: string
          medical_conditions?: string[] | null
          medications?: string[] | null
          onboarding_completed?: boolean | null
          preferred_units?: string | null
          relationship?: string | null
          sex?: string | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          allergies?: string[] | null
          bmi?: number | null
          business_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string | null
          health_goals?: string[] | null
          health_questionnaire_completed?: boolean | null
          height_cm?: number | null
          id?: string
          medical_conditions?: string[] | null
          medications?: string[] | null
          onboarding_completed?: boolean | null
          preferred_units?: string | null
          relationship?: string | null
          sex?: string | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          assessment_limit_reset_date: string
          created_at: string
          email: string
          id: string
          monthly_assessments_limit: number
          monthly_assessments_used: number
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assessment_limit_reset_date?: string
          created_at?: string
          email: string
          id?: string
          monthly_assessments_limit?: number
          monthly_assessments_used?: number
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assessment_limit_reset_date?: string
          created_at?: string
          email?: string
          id?: string
          monthly_assessments_limit?: number
          monthly_assessments_used?: number
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      symptom_checks: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          results: Json | null
          symptoms: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          results?: Json | null
          symptoms?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          results?: Json | null
          symptoms?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      title_templates: {
        Row: {
          category: string
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          template: string
          updated_at: string
          user_id: string
          variables: string[] | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          template: string
          updated_at?: string
          user_id: string
          variables?: string[] | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          template?: string
          updated_at?: string
          user_id?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      tracked_factors: {
        Row: {
          created_at: string
          factor_name: string
          factor_value: string
          id: string
          logged_at: string
          notes: string | null
          profile_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          factor_name: string
          factor_value: string
          id?: string
          logged_at?: string
          notes?: string | null
          profile_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          factor_name?: string
          factor_value?: string
          id?: string
          logged_at?: string
          notes?: string | null
          profile_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracked_factors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_symptoms: {
        Row: {
          created_at: string
          id: string
          logged_at: string
          notes: string | null
          profile_id: string | null
          severity: number
          symptom_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          logged_at?: string
          notes?: string | null
          profile_id?: string | null
          severity: number
          symptom_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          logged_at?: string
          notes?: string | null
          profile_id?: string | null
          severity?: number
          symptom_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracked_symptoms_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          assessments_completed: number
          badges_earned: string[]
          created_at: string
          current_streak: number
          id: string
          last_activity_date: string | null
          level: number
          longest_streak: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assessments_completed?: number
          badges_earned?: string[]
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          assessments_completed?: number
          badges_earned?: string[]
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_interactions: {
        Row: {
          audio_duration: number | null
          created_at: string | null
          id: string
          response_audio_url: string | null
          response_text: string | null
          session_type: string
          transcript: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audio_duration?: number | null
          created_at?: string | null
          id?: string
          response_audio_url?: string | null
          response_text?: string | null
          session_type: string
          transcript?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audio_duration?: number | null
          created_at?: string | null
          id?: string
          response_audio_url?: string | null
          response_text?: string | null
          session_type?: string
          transcript?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_bmi: {
        Args: { height_cm: number; weight_kg: number }
        Returns: number
      }
      reset_monthly_assessments: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_user_streak: {
        Args: { user_id_param: string }
        Returns: undefined
      }
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
