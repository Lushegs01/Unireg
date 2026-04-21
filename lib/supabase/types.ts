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
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          student_id: string | null;
          department_id: string | null;
          role: "student" | "admin" | "super_admin";
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          student_id?: string | null;
          department_id?: string | null;
          role?: "student" | "admin" | "super_admin";
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          student_id?: string | null;
          department_id?: string | null;
          role?: "student" | "admin" | "super_admin";
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      departments: {
        Row: {
          id: string;
          name: string;
          code: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      form_templates: {
        Row: {
          id: string;
          department_id: string;
          name: string;
          description: string | null;
          semester: string;
          schema_json: Json;
          is_published: boolean;
          deadline: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          department_id: string;
          name: string;
          description?: string | null;
          semester: string;
          schema_json?: Json;
          is_published?: boolean;
          deadline?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          department_id?: string;
          name?: string;
          description?: string | null;
          semester?: string;
          schema_json?: Json;
          is_published?: boolean;
          deadline?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      applications: {
        Row: {
          id: string;
          student_id: string;
          template_id: string;
          status: "draft" | "pending" | "under_review" | "approved" | "changes_requested";
          response_data: Json;
          admin_feedback: string | null;
          submitted_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          template_id: string;
          status?: "draft" | "pending" | "under_review" | "approved" | "changes_requested";
          response_data?: Json;
          admin_feedback?: string | null;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          template_id?: string;
          status?: "draft" | "pending" | "under_review" | "approved" | "changes_requested";
          response_data?: Json;
          admin_feedback?: string | null;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Department = Database["public"]["Tables"]["departments"]["Row"];
export type FormTemplate = Database["public"]["Tables"]["form_templates"]["Row"];
export type Application = Database["public"]["Tables"]["applications"]["Row"];
export type ApplicationStatus = Application["status"];

export type FormFieldType =
  | "short_text"
  | "long_text"
  | "select"
  | "file_upload"
  | "checkbox_group";

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: FormFieldOption[];
  accept?: string;
  maxSize?: number;
}

export interface FormSchema {
  fields: FormField[];
}
