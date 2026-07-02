import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client for server-only contexts with no user session (e.g. Stripe webhooks).
 * NEVER import this from client components. Requires SUPABASE_SERVICE_ROLE_KEY.
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
