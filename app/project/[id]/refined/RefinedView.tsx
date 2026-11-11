'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveGuestEmail } from './actions'

interface Props {
  projectId: string
  before: string
  after: string | null
  changes: string[]
  guest: boolean
  nextHref: string
  openSave: boolean
}

const SAVE_ERRORS: Record<string, string> = {
  INVALID_EMAIL: 'That email doesn’t look right. Check it and try again.',
  NOT_GUEST: 'This project is already saved. Reload the page.',
  FAILED: 'We couldn’t send the link just now. Nothing was lost — try again in a minute.',
}

export default function RefinedView({ projectId, before, after, changes, guest, nextHref, openSave }: Props) {
  const [sheetOpen, setSheetOpen] = useState(openSave)

  return (
    <>
      <div style={s.head}>
        <p style={s.eyebrow}>Question refined</p>
        <h1 style={s.heading}>{after ? 'Your research question, sharpened' : 'Your answers are saved'}</h1>
      </div>

      <section style={s.before} aria-label="Before">
        <p style={s.beforeLabel}>Before · too broad to research</p>
        <p style={s.beforeText}>{before}</p>
      </section>

      {after ? (
        <>
          <div style={s.arrow} aria-hidden="true">↓</div>
          <section style={s.after} aria-label="After">
            <p style={s.afterLabel}>After · ready for theories</p>
            <p style={s.afterText}>{after}</p>
          </section>

          {changes.length > 0 && (
            <div style={s.changes}>
              <p style={s.changesTitle}>What changed</p>
              {changes.map(c => (
                <div key={c} style={s.changeRow}>
                  <span style={s.plus} aria-hidden="true">+</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p style={s.fallback}>
          We couldn&apos;t write the sharpened question just now. Your answers are kept and will shape the theories we suggest.
        </p>
      )}

      <div style={s.ctaBlock}>
        {guest ? (
          <button type="button" style={s.cta} onClick={() => setSheetOpen(true)}>
            Save it and see theories that fit →
          </button>
        ) : (
          <a href={nextHref} style={s.cta}>See theories that fit →</a>
        )}
        <p style={s.ctaNote}>Free. Next we suggest 3–5 theories for this question.</p>
        <a href={`/project/${projectId}/gate1`} style={s.editLink}>← Change my answers</a>
      </div>

      {guest && sheetOpen && (
        <SaveSheet projectId={projectId} question={after ?? before} nextHref={nextHref} onClose={() => setSheetOpen(false)} />
      )}
    </>
  )
}

function SaveSheet({ projectId, question, nextHref, onClose }: { projectId: string; question: string; nextHref: string; onClose: () => void }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [existing, setExisting] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    const res = await saveGuestEmail(projectId, email)
    if (res.ok && !res.existing) {
      // Saved: straight on to theories. The confirmation link can wait until they pay.
      setStatus('sent')
      router.push(nextHref)
    } else if (res.ok) {
      // The email already has an account: they have to sign in with the link.
      setExisting(true)
      setStatus('sent')
    } else {
      setError(SAVE_ERRORS[res.error] ?? SAVE_ERRORS.FAILED)
      setStatus('error')
    }
  }

  return (
    <div style={s.overlay} role="dialog" aria-modal="true" aria-labelledby="save-title" onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={s.handle} aria-hidden="true" />
        {status === 'sent' && !existing ? (
          <>
            <h2 id="save-title" style={s.sheetTitle}>Saved</h2>
            <p style={s.sheetText}>Taking you to the theories that fit your question…</p>
          </>
        ) : status === 'sent' ? (
          <>
            <h2 id="save-title" style={s.sheetTitle}>Check your email</h2>
            <p style={s.sheetText}>
              {existing
                ? <>You already have a Methea account with <strong>{email}</strong>. We sent a sign-in link: open it on this device and this project moves into your account.</>
                : <>We sent a link to <strong>{email}</strong>. Open it and your project is saved — you&apos;ll go straight to the theories that fit your question.</>}
            </p>
            <button type="button" style={s.ghostBtn} onClick={onClose}>Close</button>
          </>
        ) : (
          <form onSubmit={submit} style={s.form}>
            <h2 id="save-title" style={s.sheetTitle}>Keep your question</h2>
            <p style={s.sheetQuestion}>{question}</p>
            <p style={s.sheetText}>Add your email to save this project. You go straight on to theories; we also send a link so you can come back from any device.</p>
            <div style={s.ticks}>
              {['Your brief and refined question are saved', 'Next: 3–5 theories for your question, free', 'Come back from any device'].map(t => (
                <div key={t} style={s.tick}><span style={s.tickMark} aria-hidden="true">✓</span><span>{t}</span></div>
              ))}
            </div>
            <label style={s.label}>
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={s.input}
                placeholder="you@university.edu"
              />
            </label>
            {status === 'error' && <p style={s.error} role="alert">{error}</p>}
            <button type="submit" disabled={status === 'sending'} style={s.cta} aria-busy={status === 'sending'}>
              {status === 'sending' ? 'Saving…' : 'Save and see theories →'}
            </button>
            <p style={s.notNow}>
              No password. Confirm your email from the link any time before you pay.{' '}
              <button type="button" onClick={onClose} style={s.linkBtn}>Not now</button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  head:         { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  eyebrow:      { fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--pencil)' },
  heading:      { margin: 0, fontFamily: "'Schibsted Grotesk', system-ui, sans-serif", fontSize: 'clamp(1.6rem, 5.5vw, 2.1rem)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1.15 },
  before:       { background: 'var(--error-bg)', border: '1px solid #EDBBA8', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  beforeLabel:  { fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--error)' },
  beforeText:   { fontSize: '0.9375rem', lineHeight: 1.5, color: 'var(--graphite)', textDecoration: 'line-through', textDecorationColor: '#C8705A' },
  arrow:        { alignSelf: 'center', fontSize: '1.25rem', color: 'var(--pencil)', lineHeight: 1, margin: '-0.75rem 0' },
  after:        { background: 'var(--mint)', border: '2px solid var(--moss)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  afterLabel:   { fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--moss)' },
  afterText:    { fontSize: '1.125rem', lineHeight: 1.4, fontWeight: 600, color: 'var(--ink)' },
  changes:      { display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9375rem', lineHeight: 1.45, color: 'var(--ink)' },
  changesTitle: { fontWeight: 600 },
  changeRow:    { display: 'flex', gap: '0.5rem' },
  plus:         { color: 'var(--moss)', fontWeight: 700 },
  fallback:     { fontSize: '0.9375rem', lineHeight: 1.5, color: 'var(--graphite)' },
  ctaBlock:     { display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '0.5rem' },
  cta:          { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 52, width: '100%', background: 'var(--ink)', color: 'var(--paper)', border: 'none', borderRadius: 'var(--radius)', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', fontFamily: 'inherit' },
  ctaNote:      { textAlign: 'center', fontSize: '0.8125rem', color: 'var(--pencil)' },
  editLink:     { alignSelf: 'center', fontSize: '0.875rem', color: 'var(--ink-blue)', textDecoration: 'none', fontWeight: 500 },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 },
  sheet:        { width: '100%', maxWidth: 560, background: 'var(--paper)', borderRadius: '20px 20px 0 0', padding: '0.75rem 1.25rem 1.75rem', maxHeight: '92vh', overflowY: 'auto' },
  handle:       { width: 40, height: 4, borderRadius: 2, background: 'var(--stone)', margin: '0 auto 1rem' },
  form:         { display: 'flex', flexDirection: 'column', gap: '0.875rem' },
  sheetTitle:   { fontFamily: "'Schibsted Grotesk', system-ui, sans-serif", fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', margin: 0 },
  sheetQuestion:{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.45, background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)', padding: '0.75rem 0.875rem' },
  sheetText:    { fontSize: '0.9375rem', lineHeight: 1.5, color: 'var(--graphite)' },
  ticks:        { display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem', lineHeight: 1.4, color: 'var(--ink)' },
  tick:         { display: 'flex', gap: '0.5rem' },
  tickMark:     { color: 'var(--moss)', fontWeight: 700 },
  label:        { display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)' },
  input:        { font: 'inherit', fontSize: '1rem', fontWeight: 400, padding: '0.8rem 0.75rem', border: '1px solid var(--ink)', borderRadius: 'var(--radius)', background: 'var(--sheet)', color: 'var(--ink)' },
  error:        { fontSize: '0.8125rem', color: 'var(--error)', lineHeight: 1.4 },
  notNow:       { textAlign: 'center', fontSize: '0.75rem', color: 'var(--pencil)', lineHeight: 1.4 },
  linkBtn:      { background: 'none', border: 'none', padding: 0, color: 'var(--ink-blue)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' },
  ghostBtn:     { minHeight: 44, background: 'transparent', border: '1px solid var(--stone)', borderRadius: 'var(--radius)', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
}
