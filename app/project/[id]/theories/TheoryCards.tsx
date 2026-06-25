'use client'

import { useState } from 'react'
import StatusChip, { type VerificationStatus } from '@/components/ui/StatusChip'
import { saveTheorySelection } from './actions'

export interface TheoryCardData {
  id: string
  name: string
  author: string
  year: number | null
  summary: string
  concepts: string[]
  why_it_fits: string
  verification: VerificationStatus
  in_reading_list: boolean
}

interface Props {
  projectId: string
  topic: string
  cards: TheoryCardData[]
}

const MIN_SELECT = 2
const MAX_SELECT = 4

export default function TheoryCards({ projectId, topic, cards }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < MAX_SELECT) {
        next.add(id)
      }
      return next
    })
  }

  const count = selected.size
  const canSubmit = count >= MIN_SELECT && count <= MAX_SELECT

  let helperText = ''
  if (count === 0) helperText = 'Pick 2–4 theories to see how they relate.'
  else if (count === 1) helperText = 'Pick at least one more to see how they relate.'
  else if (count === MAX_SELECT) helperText = '4 is plenty to start — try narrowing it down if needed.'

  async function handleBuild() {
    if (!canSubmit) return
    setSubmitting(true)
    const formData = new FormData()
    formData.append('projectId', projectId)
    formData.append('selectedIds', JSON.stringify(Array.from(selected)))
    await saveTheorySelection(formData)
  }

  return (
    <div style={s.wrapper}>
      {/* AI confirmation banner — starts from what student brought */}
      <div style={s.banner}>
        <p style={s.bannerText}>
          Based on your question about <strong style={{ color: 'var(--ink)' }}>{topic}</strong>,
          {' '}these theories tend to fit well. Pick 2–4 to build on.
        </p>
      </div>

      {/* Card grid */}
      <div style={s.grid}>
        {cards.map(card => {
          const isSelected = selected.has(card.id)
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => toggle(card.id)}
              aria-pressed={isSelected}
              aria-label={`${card.name} — ${isSelected ? 'selected' : 'not selected'}`}
              style={{
                ...s.card,
                borderColor: isSelected ? 'var(--ink-blue)' : 'var(--stone-soft)',
              }}
            >
              {isSelected && <span style={s.checkmark} aria-hidden="true">✓</span>}

              <div style={s.cardHeader}>
                <p style={s.theoryName}>{card.name}</p>
                <p style={s.theoryMeta}>{card.author}{card.year ? `, ${card.year}` : ''}</p>
              </div>

              <p style={s.whyItFits}>{card.why_it_fits}</p>

              <div style={s.tags}>
                {card.concepts.slice(0, 4).map(c => (
                  <span key={c} style={s.tag}>{c}</span>
                ))}
              </div>

              <div style={s.chips}>
                <StatusChip status={card.verification} />
                {card.in_reading_list && (
                  <span style={s.readingListChip}>+ In your reading list</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Helper text + CTA */}
      <div style={s.footer}>
        {helperText && <p style={s.helperText}>{helperText}</p>}
        <button
          type="button"
          onClick={handleBuild}
          disabled={!canSubmit || submitting}
          style={{
            ...s.buildBtn,
            ...(!canSubmit || submitting ? s.buildBtnDisabled : {}),
          }}
        >
          {submitting ? 'Saving…' : 'Build my framework →'}
        </button>
      </div>

      <style>{`
        button[aria-pressed]:focus-visible {
          outline: 2px solid var(--ink-blue);
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          button { transition: none !important; }
        }
        @media (max-width: 600px) {
          .theory-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  wrapper:    { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  banner:     { padding: '1rem 1.25rem', background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)' },
  bannerText: { fontSize: '0.9375rem', color: 'var(--graphite)', lineHeight: 1.6 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem',
  },
  card: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    padding: '1.25rem',
    background: 'var(--sheet)',
    border: '1px solid var(--stone-soft)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.1s',
  },
  checkmark: {
    position: 'absolute',
    top: '0.75rem',
    right: '0.75rem',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'var(--ink-blue)',
    color: 'var(--sheet)',
    fontSize: '0.6875rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
  },
  cardHeader: { display: 'flex', flexDirection: 'column', gap: '0.125rem' },
  theoryName: { fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ink)', lineHeight: 1.3, paddingRight: '1.75rem' },
  theoryMeta: { fontSize: '0.8125rem', color: 'var(--pencil)' },
  whyItFits: {
    fontFamily: "'Source Serif 4', Georgia, serif",
    fontSize: '0.875rem',
    fontStyle: 'italic',
    color: 'var(--graphite)',
    lineHeight: 1.65,
  },
  tags:  { display: 'flex', flexWrap: 'wrap' as const, gap: '0.375rem' },
  tag:   { padding: '2px 8px', background: 'var(--paper-deep)', color: 'var(--graphite)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' },
  chips: { display: 'flex', flexWrap: 'wrap' as const, gap: '0.375rem', marginTop: 'auto' },
  readingListChip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    background: 'var(--sky)',
    color: 'var(--ink-blue)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  footer:          { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' },
  helperText:      { fontSize: '0.875rem', color: 'var(--pencil)', alignSelf: 'flex-start' },
  buildBtn:        { padding: '0.75rem 1.5rem', background: 'var(--ink-blue)', color: 'var(--sheet)', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.9375rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.1s' },
  buildBtnDisabled:{ background: 'var(--paper-deep)', color: 'var(--pencil)', cursor: 'default' },
}
