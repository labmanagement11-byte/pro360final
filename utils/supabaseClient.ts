import { createClient } from '@supabase/supabase-js';
import type { User } from '../components/Dashboard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;


type Database = {
	users: User;
};

let supabase: ReturnType<typeof createClient<Database>> | null = null;
if (!supabaseUrl || !supabaseAnonKey) {
	console.error('Missing Supabase environment variables. Supabase client will not be initialized.');
} else {
	supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
}

export { supabase };
