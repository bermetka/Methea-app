import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppHeader from '@/components/nav/AppHeader'
import { accessOptions } from '@/lib/access'
import { accessUntil, hasFullAccess, isAccessExpired, isPaywallActive, isProjectPaid, FREE_PROJECT_CAP, ACCESS_MONTHS } from '@/lib/entitlement'
import { formatAccessDate, getUserPriceVariant } from '@/lib/checkout'
import { priceForVariant, FREE_FEATURES, PAID_FEATURES } from '@/lib/pricing'
import type { Project } from '@/types/database'

export const metadata = { title: 'Plan & billing — Methea' }

type Row = Pick<Project, 'id' | 'title' | 'paid_at'>

export default async function AccountPage({ searchParams }: { searchParams: { preview?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('projects')
    .select('id, title, paid_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  // Preview/dev only: `?preview=free` shows the page as a user without full access
  // (comp flag and payments ignored), so the founder can see what students see.
  const previewFree = searchParams.preview === 'free' && process.env.VERCEL_ENV !== 'production'
  const projects = ((data ?? []) as Row[]).map(p => (previewFree ? { ...p, paid_at: null } : p))
  const realOptions = await accessOptions(supabase, user.id)
  const options = previewFree ? { unlimited: false, paywallTester: true } : realOptions
  const price = priceForVariant(await getUserPriceVariant(user.id)).label
  const paywallOn = options.paywallTester || isPaywallActive()
  const unpaid = projects.filter(p => !hasFullAccess(p, options)).length
  const firstLocked = projects.find(p => status(p).unlock)

  function status(p: Row): { label: string; tone: 'ok' | 'muted' | 'warn'; unlock: boolean } {
    if (options.unlimited) return { label: 'Full access', tone: 'ok', unlock: false }
    if (isProjectPaid(p)) {
      const until = accessUntil(p)
      return { label: `Paid · full access until ${until ? formatAccessDate(until) : '—'}`, tone: 'ok', unlock: false }
    }
    if (isAccessExpired(p)) return { label: 'Access ended · view only', tone: 'warn', unlock: true }
    if (!paywallOn) return { label: 'Free · everything open during the pilot', tone: 'ok', unlock: false }
    return { label: 'Free · view only for paid steps', tone: 'muted', unlock: true }
  }

  return (
    <>
      <AppHeader email={user.email ?? ''} upgrade={!!firstLocked} />
      <main style={s.page}>
        <div style={s.container}>
          <h1 style={s.heading}>Plan &amp; billing</h1>
          {previewFree && <p style={s.previewNote}>Preview: this is how the page looks for a student without full access. Payments and your comp access are ignored here.</p>}

          <section style={s.card}>
            <p style={s.label}>Your plan</p>
            <p style={s.plan}>
              {options.unlimited ? 'Full access' : 'Pay per project'}
            </p>
            {!options.unlimited && (
              <p style={s.text}>
                Free projects include {FREE_FEATURES.join(', ').toLowerCase()}. Unlock a project for{' '}
                <b>{price}</b>, one time, for {ACCESS_MONTHS} months of full access: {PAID_FEATURES.join(', ').toLowerCase()}.
              </p>
            )}
            {!options.unlimited && paywallOn && (
              <p style={s.meta}>{unpaid} of {FREE_PROJECT_CAP} free projects used.</p>
            )}
            {firstLocked && (
              <a href={`/project/${firstLocked.id}`} style={s.cta}>Upgrade a project · {price}</a>
            )}
          </section>

          <section style={s.list}>
            <p style={s.label}>Projects</p>
            {projects.length === 0 && <p style={s.text}>No projects yet. <a href="/projects">Start one →</a></p>}
            {projects.map(p => {
              const st = status(p)
              return (
                <div key={p.id} style={s.row}>
                  <div style={s.rowMain}>
                    <a href={`/project/${p.id}`} style={s.title}>{p.title || 'Untitled project'}</a>
                    <span style={{ ...s.badge, ...s[st.tone] }}>{st.label}</span>
                  </div>
                  {st.unlock && (
                    <a href={`/project/${p.id}`} style={s.unlock}>Unlock for {price} →</a>
                  )}
                </div>
              )
            })}
          </section>

          <p style={s.meta}>
            Payments, receipts and refunds are handled by Paddle, our merchant of record. Questions about a payment? Reply to your Paddle receipt email.
          </p>
        </div>
      </main>
    </>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:      { minHeight: '100vh', background: 'var(--paper)', padding: '2rem 1rem 4rem' },
  container: { maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  heading:   { margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.5rem', fontWeight: 400, color: 'var(--ink)', letterSpacing: '-0.015em' },
  card:      { background: 'var(--sheet)', border: '1px solid var(--stone)', borderRadius: 10, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 8 },
  label:     { margin: 0, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-blue)' },
  plan:      { margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--ink)' },
  text:      { margin: 0, fontSize: '0.9375rem', color: 'var(--graphite)', lineHeight: 1.5 },
  meta:      { margin: 0, fontSize: '0.8125rem', color: 'var(--pencil)' },
  list:      { display: 'flex', flexDirection: 'column', gap: 10 },
  row:       { background: 'var(--sheet)', border: '1px solid var(--stone)', borderRadius: 10, padding: '0.875rem 1rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  rowMain:   { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  title:     { color: 'var(--ink)', fontWeight: 600 },
  badge:     { alignSelf: 'flex-start', fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6 },
  ok:        { background: 'var(--mint)', color: 'var(--moss)' },
  muted:     { background: 'var(--paper-deep)', color: 'var(--graphite)' },
  warn:      { background: 'var(--marker-yellow)', color: 'var(--ink)' },
  cta:       { alignSelf: 'flex-start', marginTop: 6, padding: '0.625rem 1.125rem', background: 'var(--ink-blue)', color: 'var(--sheet)', borderRadius: 8, fontWeight: 600, fontSize: '0.9375rem', textDecoration: 'none' },
  previewNote: { margin: 0, fontSize: '0.8125rem', color: 'var(--warn-text)', background: 'var(--marker-yellow)', padding: '0.375rem 0.625rem', borderRadius: 6 },
  unlock:    { fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-blue)', whiteSpace: 'nowrap' },
}
