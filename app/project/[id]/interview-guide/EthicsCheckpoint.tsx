'use client'

import { useState, useTransition } from 'react'
import { confirmEthics } from './actions'

export default function EthicsCheckpoint({ projectId }: { projectId: string }) {
  const [checked, setChecked]   = useState(false)
  const [tried, setTried]       = useState(false)
  const [pending, startTransition] = useTransition()

  function handleProceed() {
    if (!checked) { setTried(true); return }
    startTransition(async () => {
      const fd = new FormData()
      fd.append('projectId', projectId)
      await confirmEthics(fd)
      // Reload to show the interview guide
      window.location.reload()
    })
  }

  return (
    <div style={s.wrap}>
      <p style={s.eyebrow}>Before generating your interview guide</p>
      <h2 style={s.heading}>Ethics confirmation</h2>
      <p style={s.body}>
        Interview research involving human participants requires ethics approval
        from your institution before data collection begins.
      </p>

      <label style={s.checkRow}>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => { setChecked(e.target.checked); setTried(false) }}
          style={s.checkbox}
        />
        <span style={s.checkLabel}>
          I confirm that ethics approval (or equivalent institutional clearance) has been
          obtained or is not required for this research.
        </span>
      </label>

      {tried && !checked && (
        <p style={s.gentle}>
          Please confirm your ethics status before generating an interview guide.
        </p>
      )}

      <button
        type="button"
        onClick={handleProceed}
        disabled={pending}
        style={{ ...s.btn, ...(pending ? s.btnDisabled : {}) }}
      >
        {pending ? 'Confirming…' : 'Confirm and generate guide →'}
      </button>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  wrap:      { display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '560px' },
  eyebrow:   { fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--pencil)' },
  heading:   { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.5rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 },
  body:      { fontSize: '0.9375rem', color: 'var(--graphite)', lineHeight: 1.65 },
  checkRow:  { display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '1rem', background: 'var(--paper-deep)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)', cursor: 'pointer' },
  checkbox:  { flexShrink: 0, width: 18, height: 18, marginTop: '0.125rem', accentColor: 'var(--moss)', cursor: 'pointer' },
  checkLabel:{ fontSize: '0.9375rem', color: 'var(--ink)', lineHeight: 1.6 },
  gentle:    { fontSize: '0.875rem', color: 'var(--graphite)', fontStyle: 'italic', lineHeight: 1.5 },
  btn:       { padding: '0.625rem 1.25rem', background: 'var(--ink)', color: 'var(--sheet)', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.9375rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' },
  btnDisabled:{ opacity: 0.45, cursor: 'not-allowed' },
}
