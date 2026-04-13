export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      trainers: {
        Row: {
          id: string
          display_name: string
          phone: string | null
          created_at: string
        }
        Insert: {
          id?: string
          display_name: string
          phone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          phone?: string | null
          created_at?: string
        }
      }
      availability_rules: {
        Row: {
          id: string
          trainer_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          trainer_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          trainer_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          is_active?: boolean
          created_at?: string
        }
      }
      blocks: {
        Row: {
          id: string
          trainer_id: string
          start_at: string
          end_at: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          trainer_id: string
          start_at: string
          end_at: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          trainer_id?: string
          start_at?: string
          end_at?: string
          reason?: string | null
          created_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          phone: string
          name: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          phone: string
          name?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          phone?: string
          name?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          trainer_id: string
          client_id: string | null
          start_at: string
          end_at: string
          status: 'confirmed' | 'cancelled'
          source: string | null
          created_at: string
        }
        Insert: {
          id?: string
          trainer_id: string
          client_id?: string | null
          start_at: string
          end_at: string
          status?: 'confirmed' | 'cancelled'
          source?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          trainer_id?: string
          client_id?: string | null
          start_at?: string
          end_at?: string
          status?: 'confirmed' | 'cancelled'
          source?: string | null
          created_at?: string
        }
      }
      conversations: {
        Row: {
          phone: string
          state: string
          context: Json | null
          last_message_at: string | null
        }
        Insert: {
          phone: string
          state?: string
          context?: Json | null
          last_message_at?: string | null
        }
        Update: {
          phone?: string
          state?: string
          context?: Json | null
          last_message_at?: string | null
        }
      }
      ai_settings: {
        Row: {
          key: string
          value: Json
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json
          updated_at?: string
        }
      }
      class_records: {
        Row: {
          id: string
          client_id: string
          appointment_id: string | null
          trainer_id: string
          notes: string | null
          exercises: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          appointment_id?: string | null
          trainer_id: string
          notes?: string | null
          exercises?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          appointment_id?: string | null
          trainer_id?: string
          notes?: string | null
          exercises?: Json | null
          created_at?: string
        }
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
  }
}
