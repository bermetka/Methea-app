import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { FREE_PROJECT_CAP, countUnpaidProjects } from '@/lib/entitlement'
import { isUnlimitedUser } from '@/lib/access'

export const FREE_CAP_ERROR = 'free-cap'
export const FREE_CAP_MESSAGE =
  `You have ${FREE_PROJECT_CAP} free projects. Unlock one or archive one to start another.`

/**
 * Server-side free project cap: max FREE_PROJECT_CAP unpaid, non-archived
 * projects per user. Expired projects count as unpaid; before PAYWALL_START
 * nothing counts; unlimited users are exempt. Redirects back to /projects with the error when full.
 */
export async function enforceFreeProjectCap(supabase: SupabaseClient, userId: string) {
  // Unlimited (comp) users have no cap — the DB trigger skips them too.
  if (await isUnlimitedUser(supabase, userId)) return

  const { data: active } = await supabase
    .from('projects')
    .select('paid_at')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (countUnpaidProjects(active ?? []) >= FREE_PROJECT_CAP) {
    redirect(`/projects?error=${FREE_CAP_ERROR}`)
  }
}
