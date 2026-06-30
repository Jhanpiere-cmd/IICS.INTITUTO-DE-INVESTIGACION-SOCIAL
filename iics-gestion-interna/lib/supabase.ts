/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Read directly from import.meta.env to allow Vite compiler static replacement in production
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-iics-db.supabase.co';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-iics-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
