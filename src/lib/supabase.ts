import { createClient } from '@supabase/supabase-js';

// Use placeholder values if environment variables are not set to prevent crashing on load
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const isSupabaseConfigured =
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  supabaseAnonKey !== 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
