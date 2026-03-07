import { createClient } from '@supabase/supabase-js';

// Helper to safely access process.env
const getProcessEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || getProcessEnv('NEXT_PUBLIC_SUPABASE_URL') || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || getProcessEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || 'placeholder-key';

export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder-key';
};

if (!isSupabaseConfigured()) {
  console.warn('Supabase URL ou Anon Key não configurados. Verifique suas variáveis de ambiente.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
