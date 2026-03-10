import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Accept both NEXT_PUBLIC_ (legacy) and VITE_ (current .env.example) prefixes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Lazy initialization: only create client when first used, not at module import time
// This allows the server to start even if env vars are missing, so we can provide
// Better error messages to the user instead of just crashing the container
let _supabaseAdminClient: any = null;
let _initError: Error | null = null;

export function getSupabaseAdmin() {
  // Return cached client if already initialized
  if (_supabaseAdminClient) return _supabaseAdminClient;
  
  // Throw cached init error if initialization previously failed
  if (_initError) throw _initError;

  // Validate required env vars on first use
  if (!supabaseUrl || !supabaseServiceKey) {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL (or VITE_SUPABASE_URL)');
    if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    _initError = new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      `Configure them in Vercel Project Settings > Environment Variables.`
    );
    throw _initError;
  }

  // Initialize and cache the client
  _supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _supabaseAdminClient;
}

// Backward compatibility: export as default export
export const supabaseAdmin = new Proxy(
  {},
  {
    get: (_, prop) => {
      const client = getSupabaseAdmin();
      return (client as any)[prop];
    },
  }
) as any;
