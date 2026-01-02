import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Definir tipos de base de datos
export interface Database {
  public: {
    Tables: {
      checklist: {
        Row: {
          id: number;
          house: string;
          item: string;
          complete: boolean;
          room?: string;
          assigned_to?: string | null;
          due_date?: string | null;
          created_at?: string;
        };
        Insert: {
          id?: number;
          house: string;
          item: string;
          complete?: boolean;
          room?: string;
          assigned_to?: string | null;
          due_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          house?: string;
          item?: string;
          complete?: boolean;
          room?: string;
          assigned_to?: string | null;
          due_date?: string | null;
          created_at?: string;
        };
      };
      [key: string]: any;
    };
  };
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient<Database> | null = null;

if (supabaseUrl && supabaseAnonKey) {
	supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey);
} else {
	console.error('Missing Supabase environment variables. Supabase client will not be initialized.');
}

// Helper function to ensure supabase is defined
export function getSupabaseClient(): SupabaseClient<Database> {
	if (!supabaseInstance) {
		throw new Error('Supabase client is not initialized. Check your environment variables.');
	}
	return supabaseInstance;
}

export const supabase = supabaseInstance;
