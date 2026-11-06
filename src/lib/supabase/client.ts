// Supabase Client Initialization
// Supports both browser and server contexts for Next.js

import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Browser client (client components) - automatically manages cookies for SSR and middleware
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

// Server client (server components / route handlers)
export const createServerSupabaseClient = () => {
  return createClient<Database>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key',
    {
      auth: {
        persistSession: false,
      },
    }
  );
};