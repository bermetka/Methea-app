'use client'

import { useEffect, useState } from 'react'
import { trackStartView } from '@/app/actions/funnel'
import { joinMonthlyWaitlist, requestPilot, type LeadResult } from './actions'

/** Fires start_view once the page has loaded (never blocks rendering). */
export function StartViewTracker({ props }: { props: Record<string, string> }) {
  useEffect(() => {
    void trackStartView(props)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

function useLeadForm(action: (fd: FormData) => Promise<LeadResult>) {
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('sending')
    setError(null)
    const result = await action(new FormData(e.currentTarget))
    if (result.ok) setState('done')
    else { setState('idle'); setError(result.error) }
  }
  return { state, error, onSubmit }
}

/** Fake door for a monthly plan — honest "coming soon", collects an email. */
export function MonthlyWaitlistForm() {
  const [open, setOpen] = useState(false)
  const { state, error, onSubmit } = useLeadForm(joinMonthlyWaitlist)

  if (state === 'done') return <p style={s.done}>You&apos;re on the list — we&apos;ll email you when monthly plans open.</p>

  return (
    <div style={s.block}>
      <p style={s.line}>
        Prefer monthly? $15/month — coming soon.{' '}
        {!open && <button type="button" onClick={() => setOpen(true)} style={s.linkBtn}>Join the waitlist</button>}
      </p>
      {open && (
        <form onSubmit={onSubmit} style={s.row}>
          <label htmlFor="monthly-email" style={s.srOnly}>Email</label>
          <input id="monthly-email" name="email" type="email" required placeholder="you@university.edu" autoComplete="email" style={s.input} />
          <button type="submit" disabled={state === 'sending'} style={s.smallBtn}>
            {state === 'sending' ? 'Joining…' : 'Join'}
          </button>
        </form>
      )}
      {error && <p style={s.error}>{error}</p>}
    </div>
  )
}

/** Departments and research groups: a short pilot request. */
export function PilotForm() {
  const [open, setOpen] = useState(false)
  const { state, error, onSubmit } = useLeadForm(requestPilot)

  if (state === 'done') return <p style={s.done}>Thanks — I&apos;ll be in touch about a pilot within a few days.</p>

  return (
    <div style={s.block}>
      <p style={s.line}>
        For departments and research groups —{' '}
        {!open
          ? <button type="button" onClick={() => setOpen(true)} style={s.linkBtn}>request a pilot</button>
          : 'request a pilot'}
      </p>
      {open && (
        <form onSubmit={onSubmit} style={s.stack}>
          <Field id="pilot-name" name="name" label="Name" required autoComplete="name" />
          <Field id="pilot-email" name="email" label="Email" type="email" required autoComplete="email" />
          <Field id="pilot-university" name="university" label="University" required autoComplete="organization" />
          <Field id="pilot-role" name="role" label="Role" placeholder="e.g. Programme director, supervisor" />
          <Field id="pilot-students" name="students" label="Number of students" type="number" min={1} max={100000} inputMode="numeric" />
          <button type="submit" disabled={state === 'sending'} style={{ ...s.smallBtn, alignSelf: 'flex-start' }}>
            {state === 'sending' ? 'Sending…' : 'Request a pilot'}
          </button>
        </form>
      )}
      {error && <p style={s.error}>{error}</p>}
    </div>
  )
}

function Field({ id, label, ...input }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div style={s.field}>
      <label htmlFor={id} style={s.label}>{label}</label>
      <input id={id} {...input} style={s.input} />
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  block:   { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  line:    { fontSize: '0.9375rem', color: 'var(--graphite)', lineHeight: 1.6 },
  linkBtn: { background: 'none', border: 'none', padding: 0, font: 'inherit', fontWeight: 600, color: 'var(--ink-blue)', textDecoration: 'underline', textUnderlineOffset: '2px', cursor: 'pointer' },
  row:     { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const },
  stack:   { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  field:   { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  label:   { fontSize: '0.8125rem', fontWeight: 600, color: 'var(--graphite)' },
  input:   { flex: 1, minWidth: '200px', padding: '0.625rem 0.75rem', fontSize: '1rem', fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--sheet)', border: '1px solid var(--stone)', borderRadius: 'var(--radius)' },
  smallBtn:{ padding: '0.625rem 1.125rem', fontSize: '0.9375rem', fontFamily: 'inherit', fontWeight: 600, color: 'var(--sheet)', background: 'var(--ink)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' },
  done:    { fontSize: '0.9375rem', color: 'var(--moss)', background: 'var(--mint)', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius)' },
  error:   { fontSize: '0.875rem', color: 'var(--warn-text)' },
  srOnly:  { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' as const },
}
