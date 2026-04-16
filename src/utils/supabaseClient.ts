/**
 * Frontend-only Supabase client — used exclusively for Realtime WebSocket
 * subscriptions (postgres_changes). All database queries go through the
 * Express backend via src/utils/api.ts.
 *
 * The anon key is intentionally bundled into the frontend (VITE_ prefix).
 * It only allows what Supabase RLS policies permit — no elevated access.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[supabaseClient] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
    'Realtime notifications will be disabled.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  // Disable auth auto-refresh — this client is not used for auth.
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
