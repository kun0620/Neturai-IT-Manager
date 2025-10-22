import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

let supabaseAdmin: any;

if (!supabaseServiceRoleKey || supabaseServiceRoleKey === 'YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE_REPLACE_THIS_WITH_YOUR_ACTUAL_KEY') {
  console.error('[ERROR] VITE_SUPABASE_SERVICE_ROLE_KEY is missing or empty. supabaseAdmin client will not be available or will fail.');
  supabaseAdmin = {
    auth: {
      admin: {
        listUsers: async () => {
          console.error('[supabaseAdmin] listUsers called but Service Role Key is not configured.');
          return { data: { users: [] }, error: new Error('Service Role Key is not configured.') };
        },
        createUser: async () => {
          console.error('[supabaseAdmin] createUser called but Service Role Key is not configured.');
          return { data: null, error: new Error('Service Role Key is not configured.') };
        },
        deleteUser: async () => {
          console.error('[supabaseAdmin] deleteUser called but Service Role Key is not configured.');
          return { data: null, error: new Error('Service Role Key is not configured.') };
        },
      },
    },
    from: () => ({
      insert: async () => {
        console.error('[supabaseAdmin] from().insert() called but Service Role Key is not configured.');
        return { data: null, error: new Error('Service Role Key is not configured.') };
      },
    }),
  };
} else {
  console.log('[DEBUG] Supabase Service Role Key loaded:', supabaseServiceRoleKey.substring(0, 5) + '...' + supabaseServiceRoleKey.substring(supabaseServiceRoleKey.length - 5));
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  console.log('[DEBUG] supabaseAdmin client initialized successfully.');
}

export { supabaseAdmin };
