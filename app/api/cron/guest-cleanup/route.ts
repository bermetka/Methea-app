import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { GUEST_TTL_DAYS, PENDING_GUEST_TTL_DAYS } from '@/lib/guest'

// Daily (vercel.json): delete guests (anonymous users who never confirmed an email)
// older than GUEST_TTL_DAYS, or PENDING_GUEST_TTL_DAYS if they gave one. Their projects go with them (FK on delete cascade);
// their funnel events stay, with user_id set to null.
// Runs only with Vercel's cron header: Authorization: Bearer $CRON_SECRET.
export const maxDuration = 60

const PER_PAGE = 1000
const MAX_PAGES = 100 // up to 100,000 users per run
const TIME_BUDGET_MS = 50_000

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

  // listUsers returns newest first, so stale guests sit at the end of the list:
  // read every page (a flood of new guests must not hide the old ones), then delete.
  // Stop deleting before the function's time limit; the next run picks up the rest.
  const started = Date.now()
  const staleIds: string[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE })
    if (error) {
      console.error('[guest-cleanup] listUsers failed:', error.message)
      break
    }
    for (const u of data.users) {
      if (u.is_anonymous && !u.email && Date.parse(u.created_at) < (u.new_email ? pendingCutoff : cutoff)) staleIds.push(u.id)
    }
    if (data.users.length < PER_PAGE) break
  }

  let skipped = 0
  for (const id of staleIds) {
    if (Date.now() - started > TIME_BUDGET_MS) { skipped = staleIds.length - deleted - failed; break }
    const { error: delError } = await admin.auth.admin.deleteUser(id)
    if (delError) {
      failed++
      console.error(`[guest-cleanup] delete ${id} failed:`, delError.message)
    } else deleted++
  }

  return NextResponse.json({ deleted, failed, skipped })
}
