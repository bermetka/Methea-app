import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client — bypasses RLS and grants entirely. Allowed uses:
 * the Paddle webhook (payment fields on projects) and lib/checkout.ts (creating
 * and reading profiles.price_variant, which users have no write grant on).
 * Never expose this client or the underlying key to any client-rendered code.
 */
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
