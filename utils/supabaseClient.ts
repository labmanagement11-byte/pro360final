import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: ReturnType<typeof createClient> | null = null;
if (!supabaseUrl || !supabaseAnonKey) {
	console.error('Missing Supabase environment variables. Supabase client will not be initialized.');
} else {
	supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };
