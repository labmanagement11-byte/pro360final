import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
          completed_by?: string | null;
          completed_at?: string | null;
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
          completed_by?: string | null;
          completed_at?: string | null;
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
          completed_by?: string | null;
          completed_at?: string | null;
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
	supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
		realtime: {
			params: {
				eventsPerSecond: 10
			}
		},
		global: {
			headers: {
				'x-application-name': '360pro'
			}
		}
	});
} else {
	console.error('Missing Supabase environment variables. Supabase client will not be initialized.');
}

export function getSupabaseClient(): SupabaseClient<Database> {
	if (!supabaseInstance) {
		throw new Error('Supabase client is not initialized. Check your environment variables.');
	}
	return supabaseInstance;
}

export function checklistTable() {
	return getSupabaseClient().from('checklist');
}

export const supabase = supabaseInstance;
