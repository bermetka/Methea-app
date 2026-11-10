import { createServiceRoleClient } from '@/lib/supabase/service-role'

/**
 * Accounts excluded from analytics, same rule as the funnel summary: the comp
 * flag (profiles.unlimited) or a signup from a utm_source=test visit. Service
 * role: the new session cookie isn't readable within the auth-callback request.
 * Never throws; on error the account counts as not excluded.
 */
export async function isExcludedFromAnalytics(userId: string): Promise<boolean> {
  try {
    const { data } = await createServiceRoleClient()
      .from('profiles')
      .select('unlimited, signup_source')
      .eq('id', userId)
      .maybeSingle()
    const source = (data?.signup_source as { utm_source?: unknown } | null)?.utm_source
    return data?.unlimited === true || (typeof source === 'string' && source.toLowerCase() === 'test')
  } catch {
    return false
  }
}
