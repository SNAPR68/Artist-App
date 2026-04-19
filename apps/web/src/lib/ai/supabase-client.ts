/**
 * Supabase admin client for AI infrastructure (cache + spend tracking).
 *
 * Uses SUPABASE_SERVICE_KEY (already in Render env — mirror to Vercel).
 * Service key bypasses RLS. This client is ONLY used server-side
 * inside /api/chat — never exposed to the browser.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getAdminSupabase(): SupabaseClient | null {
  // Lazy init — allow the module to load even when env vars are missing
  // (e.g. during build). Route handlers check for null and degrade gracefully.
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}
