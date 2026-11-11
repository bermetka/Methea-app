import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { GUEST_TTL_DAYS, PENDING_GUEST_TTL_DAYS } from '@/lib/guest'

// Daily (vercel.json): delete guests (anonymous users who never confirmed an email)
// older than GUEST_TTL_DAYS, or PENDING_GUEST_TTL_DAYS if they gave one. Their projects go with them (FK on delete cascade);
// their funnel events stay, with user_id set to null.
// Runs only with Vercel's cron header: Authorization: Bearer $CRON_SECRET.
export const maxDuration = 60

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createServiceRoleClient()
  const day = 24 * 60 * 60 * 1000
  const cutoff = Date.now() - GUEST_TTL_DAYS * day
  // Gave an email but never confirmed it: kept longer, they may still come back.
  const pendingCutoff = Date.now() - PENDING_GUEST_TTL_DAYS * day
  let deleted = 0
  let failed = 0

  // Newest users first; stop at the end of the list or after 20 pages (2,000 users) per run.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
    if (error) {
      console.error('[guest-cleanup] listUsers failed:', error.message)
      break
    }
    const stale = data.users.filter(u =>
      u.is_anonymous && !u.email && Date.parse(u.created_at) < (u.new_email ? pendingCutoff : cutoff))
    for (const u of stale) {
      const { error: delError } = await admin.auth.admin.deleteUser(u.id)
      if (delError) {
        failed++
        console.error(`[guest-cleanup] delete ${u.id} failed:`, delError.message)
      } else deleted++
    }
    if (data.users.length < 100) break
  }

  return NextResponse.json({ deleted, failed })
}
