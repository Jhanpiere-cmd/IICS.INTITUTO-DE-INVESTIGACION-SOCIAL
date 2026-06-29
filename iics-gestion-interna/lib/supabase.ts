import { createClient } from '@supabase/supabase-js';

// No fallbacks to protect database isolation between projects
export const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://placeholder-iics-db.supabase.co';
export const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'placeholder-iics-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
