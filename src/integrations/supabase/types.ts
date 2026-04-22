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
      answers: {
        Row: {
          answer_text: string
          clarity: number | null
          correctness: number | null
          created_at: string
          depth: number | null
          feedback: string | null
          id: string
          improvements: string[] | null
          input_method: string
          interview_id: string
          missing_concepts: string[] | null
          question_index: number
          question_text: string
          reasoning: number | null
          score: number | null
          user_id: string
        }
        Insert: {
          answer_text: string
          clarity?: number | null
          correctness?: number | null
          created_at?: string
          depth?: number | null
          feedback?: string | null
          id?: string
          improvements?: string[] | null
          input_method?: string
          interview_id: string
          missing_concepts?: string[] | null
          question_index: number
          question_text: string
          reasoning?: number | null
          score?: number | null
          user_id: string
        }
        Update: {
          answer_text?: string
          clarity?: number | null
          correctness?: number | null
          created_at?: string
          depth?: number | null
          feedback?: string | null
          id?: string
          improvements?: string[] | null
          input_method?: string
          interview_id?: string
          missing_concepts?: string[] | null
          question_index?: number
          question_text?: string
          reasoning?: number | null
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      hiring_decisions: {
        Row: {
          ai_summary: Json | null
          candidate_id: string
          created_at: string
          id: string
          interview_id: string
          rationale: string | null
          recommendation: string
          recruiter_id: string
          updated_at: string
        }
        Insert: {
          ai_summary?: Json | null
          candidate_id: string
          created_at?: string
          id?: string
          interview_id: string
          rationale?: string | null
          recommendation: string
          recruiter_id: string
          updated_at?: string
        }
        Update: {
          ai_summary?: Json | null
          candidate_id?: string
          created_at?: string
          id?: string
          interview_id?: string
          rationale?: string | null
          recommendation?: string
          recruiter_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      interviews: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          overall_score: number | null
          questions: Json
          role: Database["public"]["Enums"]["interview_role"]
          skill_scores: Json | null
          started_at: string
          status: Database["public"]["Enums"]["interview_status"]
          strengths: string[] | null
          user_id: string
          weaknesses: string[] | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          overall_score?: number | null
          questions?: Json
          role: Database["public"]["Enums"]["interview_role"]
          skill_scores?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["interview_status"]
          strengths?: string[] | null
          user_id: string
          weaknesses?: string[] | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          overall_score?: number | null
          questions?: Json
          role?: Database["public"]["Enums"]["interview_role"]
          skill_scores?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["interview_status"]
          strengths?: string[] | null
          user_id?: string
          weaknesses?: string[] | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      violations: {
        Row: {
          created_at: string
          details: string | null
          id: string
          interview_id: string
          type: Database["public"]["Enums"]["violation_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          interview_id: string
          type: Database["public"]["Enums"]["violation_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          interview_id?: string
          type?: Database["public"]["Enums"]["violation_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "violations_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "candidate" | "recruiter" | "admin"
      interview_role: "sde" | "data_analyst" | "ml_engineer"
      interview_status: "in_progress" | "completed" | "abandoned"
      violation_type:
        | "tab_switch"
        | "window_blur"
        | "multiple_faces"
        | "no_face"
        | "looking_away"
        | "suspicious"
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
      app_role: ["candidate", "recruiter", "admin"],
      interview_role: ["sde", "data_analyst", "ml_engineer"],
      interview_status: ["in_progress", "completed", "abandoned"],
      violation_type: [
        "tab_switch",
        "window_blur",
        "multiple_faces",
        "no_face",
        "looking_away",
        "suspicious",
      ],
    },
  },
} as const
