import { createClient } from '@supabase/supabase-js';

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: ReturnType<typeof createClient<Database>> | null = null;
if (!supabaseUrl || !supabaseAnonKey) {
	console.error('Missing Supabase environment variables. Supabase client will not be initialized.');
} else {
	supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
}

export { supabase };
