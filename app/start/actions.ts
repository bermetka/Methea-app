'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ANON_ID_COOKIE, sanitizeAnonId } from '@/lib/funnel-shared'
import { trackMonthlyWaitlist, trackPilotRequest } from '@/app/actions/funnel'

export type LeadResult = { ok: true } | { ok: false; error: string }

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function text(formData: FormData, key: string, max: number): string | null {
  const v = (formData.get(key) as string | null)?.trim() ?? ''
  return v ? v.slice(0, max) : null
}

// Stores the person's details in lead_signups (insert-only for visitors); the
// funnel event carries no personal data. A repeat signup counts as success.
async function saveLead(row: Record<string, unknown>): Promise<LeadResult> {
  const supabase = createClient()
  const { error } = await supabase.from('lead_signups').insert({
    ...row,
    anon_id: sanitizeAnonId(cookies().get(ANON_ID_COOKIE)?.value),
  })
  if (error && error.code !== '23505') {
    console.error('[start] lead signup failed:', error.message)
    return { ok: false, error: 'Something went wrong — please try again.' }
  }
  return { ok: true }
}

export async function joinMonthlyWaitlist(formData: FormData): Promise<LeadResult> {
  const email = text(formData, 'email', 254)
  if (!email || !EMAIL.test(email)) return { ok: false, error: 'Please enter a valid email.' }
  const result = await saveLead({ kind: 'monthly', email })
  if (result.ok) await trackMonthlyWaitlist()
  return result
}

export async function requestPilot(formData: FormData): Promise<LeadResult> {
  const email = text(formData, 'email', 254)
  const name = text(formData, 'name', 120)
  const university = text(formData, 'university', 200)
  if (!name || !university) return { ok: false, error: 'Please add your name and university.' }
  if (!email || !EMAIL.test(email)) return { ok: false, error: 'Please enter a valid email.' }
  const studentsRaw = Number.parseInt(text(formData, 'students', 6) ?? '', 10)
  const students = Number.isFinite(studentsRaw) && studentsRaw >= 1 && studentsRaw <= 100000 ? studentsRaw : null

  const result = await saveLead({ kind: 'pilot', email, name, university, role: text(formData, 'role', 120), students })
  if (result.ok) await trackPilotRequest()
  return result
}
