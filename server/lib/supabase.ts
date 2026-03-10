import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Accept both NEXT_PUBLIC_ (legacy) and VITE_ (current .env.example) prefixes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL (or VITE_SUPABASE_URL)');
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
