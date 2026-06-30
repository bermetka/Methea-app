'use client'

import { useState } from 'react'
import { confirmThemes } from './actions'
import type { AnalysisTheme } from '@/types/database'

const ACCENT = '#8C8A82'

interface Props {
  projectId: string
  themes: AnalysisTheme[]
  gate3Completed: boolean
}

export default function FindingsView({ projectId, themes, gate3Completed }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(themes.filter(t => t.confirmed || !gate3Completed).map(t => t.id))
  )
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)

  function toggle(id: string) { setOpen(p => ({ ...p, [id]: !p[id] })) }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function submit() {
    setSubmitting(true)
    const fd = new FormData()
    fd.append('projectId', projectId)
    fd.append('confirmedIds', JSON.stringify(Array.from(selected)))
    await confirmThemes(fd)
  }

  return (
    <div style={s.wrap}>
      {!gate3Completed && (
        <div style={s.gate3Banner}>
          <p style={s.gate3Eyebrow}>Socratic gate 3</p>
          <p style={s.gate3Text}>
            Review the themes Methea identified. Tick the ones that ring true — you know your data better than any model.
            Untick themes that feel off before confirming.
          </p>
        </div>
      )}

      <div style={s.themeList}>
        {themes.map(theme => (
          <div key={theme.id} style={{ ...s.themeCard, ...(selected.has(theme.id) ? s.themeSelected : s.themeDeselected) }}>
            {/* Header */}
            <div style={s.themeHeader}>
              {!gate3Completed && (
                <button
                  type="button"
                  onClick={() => toggleSelect(theme.id)}
                  style={{ ...s.checkbox, ...(selected.has(theme.id) ? s.checkboxOn : {}) }}
                  aria-label={selected.has(theme.id) ? 'Deselect theme' : 'Select theme'}
                >
                  {selected.has(theme.id) ? '✓' : ''}
                </button>
              )}
              {gate3Completed && (
                <span style={theme.confirmed ? s.confirmedDot : s.rejectedDot}>
                  {theme.confirmed ? '✓' : '✕'}
                </span>
              )}
              <button type="button" onClick={() => toggle(theme.id)} style={s.themeToggle}>
                <div style={s.themeTitleRow}>
                  <p style={s.themeLabel}>{theme.label}</p>
                  <div style={s.themeMeta}>
                    <span style={s.freqBadge}>{theme.frequency} segments</span>
                    {theme.concepts.map(c => (
                      <span key={c} style={s.conceptTag}>{c}</span>
                    ))}
                  </div>
                </div>
                <span style={s.chevron}>{open[theme.id] ? '▲' : '▾'}</span>
              </button>
            </div>

            <p style={s.themeSummary}>{theme.summary}</p>

            {/* Expanded quotes */}
            {open[theme.id] && (
              <div style={s.quoteList}>
                {theme.quotes.map((q, i) => (
                  <div key={i} style={s.quoteRow}>
                    <span style={s.quoteMark}>"</span>
                    <div style={s.quoteBody}>
                      <p style={s.quoteText}>{q.quote}</p>
                      <div style={s.quoteTags}>
                        <span style={s.conceptTagSm}>{q.concept}</span>
                        {q.code_type === 'inductive' && q.inductive_label && (
                          <span style={s.inductiveTag}>↗ {q.inductive_label}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {!gate3Completed && (
        <div style={s.confirmRow}>
          <p style={s.confirmNote}>
            {selected.size} of {themes.length} themes selected
          </p>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || selected.size === 0}
            style={{ ...s.confirmBtn, ...(submitting || selected.size === 0 ? s.btnDisabled : {}) }}
          >
            {submitting ? 'Saving…' : 'Confirm themes →'}
          </button>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  wrap:         { display: 'flex', flexDirection: 'column', gap: '1.25rem' },

  gate3Banner:  { padding: '1rem 1.25rem', background: 'var(--paper-deep)', borderRadius: 'var(--radius)', border: '1px solid var(--stone-soft)' },
  gate3Eyebrow: { fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: ACCENT, marginBottom: '0.4rem' },
  gate3Text:    { fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--graphite)' },

  themeList:    { display: 'flex', flexDirection: 'column', gap: '0.75rem' },

  themeCard:    { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'opacity 0.15s' },
  themeSelected:{ opacity: 1 },
  themeDeselected:{ opacity: 0.5 },

  themeHeader:  { display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem 1.25rem 0' },
  checkbox:     {
    flexShrink: 0, width: 20, height: 20, borderRadius: 4, border: '2px solid var(--stone)',
    background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '11px', fontWeight: 700, color: 'var(--moss)', cursor: 'pointer',
    marginTop: '0.25rem',
  },
  checkboxOn:   { background: 'var(--mint)', borderColor: 'var(--marker-green)' },
  confirmedDot: { flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: 'var(--mint)', color: 'var(--moss)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, marginTop: '0.25rem' },
  rejectedDot:  { flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: 'var(--paper-deep)', color: 'var(--pencil)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, marginTop: '0.25rem' },

  themeToggle:  { flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' as const, padding: 0 },
  themeTitleRow:{ flex: 1 },
  themeLabel:   { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35 },
  themeMeta:    { display: 'flex', gap: '0.375rem', flexWrap: 'wrap' as const, marginTop: '0.375rem' },
  freqBadge:    { padding: '1px 8px', background: 'var(--paper-deep)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--pencil)', fontWeight: 500 },
  conceptTag:   { padding: '1px 8px', background: 'var(--mint)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--moss)', fontWeight: 600 },
  chevron:      { fontSize: '0.625rem', color: 'var(--pencil)', flexShrink: 0, paddingTop: '0.35rem' },

  themeSummary: { fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--graphite)', padding: '0.625rem 1.25rem 1rem' },

  quoteList:    { borderTop: '1px solid var(--stone-soft)', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' },
  quoteRow:     { display: 'flex', gap: '0.75rem', alignItems: 'flex-start' },
  quoteMark:    { fontFamily: 'Georgia, serif', fontSize: '1.75rem', color: 'var(--stone)', lineHeight: 1, flexShrink: 0, marginTop: '-0.25rem' },
  quoteBody:    { flex: 1 },
  quoteText:    { fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--ink)', fontStyle: 'italic' },
  quoteTags:    { display: 'flex', gap: '0.375rem', marginTop: '0.375rem', flexWrap: 'wrap' as const },
  conceptTagSm: { padding: '1px 6px', background: 'var(--mint)', borderRadius: 'var(--radius-sm)', fontSize: '0.6875rem', color: 'var(--moss)', fontWeight: 600 },
  inductiveTag: { padding: '1px 6px', background: '#FFF3CD', borderRadius: 'var(--radius-sm)', fontSize: '0.6875rem', color: '#92620A', fontWeight: 600 },

  confirmRow:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' as const },
  confirmNote:  { fontSize: '0.875rem', color: 'var(--pencil)' },
  confirmBtn:   { padding: '0.625rem 1.25rem', background: 'var(--ink)', color: 'var(--sheet)', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.9375rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' },
  btnDisabled:  { opacity: 0.45, cursor: 'not-allowed' },
}
