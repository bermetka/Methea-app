'use client'

import { useState, useEffect, useRef } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import StatusChip, { type VerificationStatus } from '@/components/ui/StatusChip'
import GlossaryTooltip from '@/components/ui/GlossaryTooltip'
import { glossaryTerm } from '@/lib/glossary'
import { saveTheorySelection, addCustomTheory, removeCustomTheory, type AddCustomState } from './actions'
import type { TheorySuggestion } from '@/types/database'

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
  isCustom?: boolean
}

// Submit button for the add-your-own form — reads the form's pending state so the user
// sees "Verifying…" and can't double-submit.
function AddSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} style={{ ...s.addBtn, ...(pending ? s.addBtnDisabled : {}) }}>
      {pending ? 'Verifying…' : 'Verify & add'}
    </button>
  )
}

interface Props {
  projectId: string
  topic: string
  cards: TheoryCardData[]
  libraryCards?: TheoryCardData[]
  initialSelected?: string[]
  suggestions?: TheorySuggestion[]
  readOnly?: boolean
}

const MIN_SELECT = 2
const MAX_SELECT = 4

type View = 'suggested' | 'browse'

export default function TheoryCards({ projectId, topic, cards, libraryCards, initialSelected, suggestions, readOnly }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected ?? []))
  const [submitting, setSubmitting] = useState(false)
  const [view, setView] = useState<View>('suggested')
  const [showAdd, setShowAdd] = useState(false)
  const [addState, addAction] = useFormState<AddCustomState, FormData>(addCustomTheory, null)
  const [note, setNote] = useState<{ text: string; tone: 'ok' | 'warn' | 'muted' } | null>(null)

  const hasLibrary = !!libraryCards?.length
  const visibleCards = view === 'browse' && libraryCards ? libraryCards : cards

  // Read latest `selected` inside the add-effect without making it a dep (which would re-run
  // the effect on every toggle).
  const selectedRef = useRef(selected)
  selectedRef.current = selected

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

  // After a custom theory is added (or matched a duplicate), auto-select it so it's checked and
  // flows into "Build my framework", and confirm the outcome. Runs once per server response.
  useEffect(() => {
    if (!addState) return
    const id = addState.theoryId
    if (!id) {
      setNote({ text: addState.message, tone: addState.outcome === 'unverified' ? 'warn' : 'muted' })
      return
    }
    const cur = selectedRef.current
    const alreadyIn = cur.has(id)
    const hasRoom = alreadyIn || cur.size < MAX_SELECT
    if (hasRoom && !alreadyIn) {
      setSelected(prev => {
        const next = new Set(prev)
        next.add(id)
        return next
      })
    }
    if (addState.outcome === 'duplicate') {
      setNote({ text: `${addState.message} It's selected and shown at the top.`, tone: 'muted' })
    } else if (!hasRoom) {
      setNote({ text: `${addState.message} You already have ${MAX_SELECT} theories selected — deselect one to include it.`, tone: 'warn' })
    } else {
      const tone = addState.outcome === 'unverified' ? 'warn' : 'ok'
      setNote({ text: `${addState.message} Added and selected — it's in your framework.`, tone })
    }
  }, [addState])

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
    if (suggestions?.length) formData.append('suggestions', JSON.stringify(suggestions))
    await saveTheorySelection(formData)
  }

  return (
    <div style={s.wrapper}>
      {/* AI confirmation banner — starts from what student brought */}
      <div style={s.banner}>
        <p style={s.bannerText}>
          Based on your question about <strong style={{ color: 'var(--ink)' }}>{topic}</strong>,
          {' '}these theories tend to fit well. Pick 2–4 to build your theoretical framework
          <GlossaryTooltip term={glossaryTerm('theoretical-vs-conceptual')} /> on.
        </p>
      </div>

      {/* View toggle — segmented control, suggested-first / browse-second */}
      {hasLibrary && (
        <div style={s.viewRow}>
          <div style={s.segmented} role="tablist" aria-label="Theory view">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'suggested'}
              onClick={() => setView('suggested')}
              style={{ ...s.segBtn, ...(view === 'suggested' ? s.segBtnActive : {}) }}
            >
              Suggested for you
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'browse'}
              onClick={() => setView('browse')}
              style={{ ...s.segBtn, borderLeft: '1px solid var(--stone)', ...(view === 'browse' ? s.segBtnActive : {}) }}
            >
              Browse full library
            </button>
          </div>
          {view === 'browse' && (
            <span style={s.viewHint}>Pick any theory from the curated library.</span>
          )}
        </div>
      )}

      {/* Card grid */}
      <div style={s.grid}>
        {visibleCards.map(card => {
          const isSelected = selected.has(card.id)
          return (
            <div key={card.id} style={s.cardWrap}>
              <button
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

                {card.why_it_fits
                  ? <p style={s.whyItFits}>{card.why_it_fits}</p>
                  : card.summary
                    ? <p style={s.summary}>{card.summary}</p>
                    : null}

                {card.concepts.length > 0 && (
                  <div style={s.tags}>
                    {card.concepts.slice(0, 4).map(c => (
                      <span key={c} style={s.tag}>{c}</span>
                    ))}
                  </div>
                )}

                <div style={s.chips}>
                  <StatusChip status={card.verification} />
                  {card.verification.kind === 'unverified' && (
                    <span style={s.unverifiedLabel}>Unverified — verify manually</span>
                  )}
                  {card.isCustom && <span style={s.yourTheoryTag}>Your theory</span>}
                  {card.in_reading_list && (
                    <span style={s.readingListChip}>+ In your reading list</span>
                  )}
                </div>
              </button>

              {card.isCustom && (
                <form action={removeCustomTheory} style={s.removeRow}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="customId" value={card.id} />
                  <button type="submit" style={s.removeBtn} aria-label={`Remove ${card.name}`}>
                    Remove
                  </button>
                </form>
              )}
            </div>
          )
        })}
      </div>

      {/* Add your own theory — verified via OpenAlex, stored per-project */}
      {!showAdd ? (
        <button type="button" onClick={() => setShowAdd(true)} style={s.addToggleBtn}>
          + Add your own theory
        </button>
      ) : (
        <div style={s.addPanel}>
          <div style={s.addPanelHead}>
            <p style={s.addPanelTitle}>Add your own theory</p>
            <button type="button" onClick={() => setShowAdd(false)} style={s.addCloseBtn}>Cancel</button>
          </div>
          <form action={addAction} style={s.addForm}>
            <input type="hidden" name="projectId" value={projectId} />
            <p style={s.addHint}>
              Paste a DOI or a citation. We&apos;ll check it against OpenAlex — verified sources get a
              ✓; anything we can&apos;t find is kept with a ? so you can verify it yourself. We never
              present an unverified source as fact.
            </p>
            <label style={s.addLabel} htmlFor="byo-doi">DOI (best match)</label>
            <input id="byo-doi" name="doi" placeholder="10.2307/2095101" style={s.addInput} />
            <label style={s.addLabel} htmlFor="byo-citation">or citation / title</label>
            <input id="byo-citation" name="citation" placeholder="Author (Year). Title of the work." style={s.addInput} />
            <label style={s.addLabel} htmlFor="byo-name">Display name (optional)</label>
            <input id="byo-name" name="name" placeholder="e.g. Institutional Logics" style={s.addInput} />
            <AddSubmitButton />
          </form>
          {note && (
            <p style={{
              ...s.addOutcome,
              ...(note.tone === 'ok' ? s.addOutcomeOk
                : note.tone === 'warn' ? s.addOutcomeWarn
                : s.addOutcomeMuted),
            }}>
              {note.text}
            </p>
          )}
        </div>
      )}

      {/* Helper text + CTA */}
      <div style={s.footer}>
        {readOnly ? (
          <a href={`/project/${projectId}`} style={{ fontSize: '0.875rem', color: 'var(--ink-blue)', textDecoration: 'none', fontWeight: 500 }}>← Back to project</a>
        ) : (
          <>
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
          </>
        )}
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
  viewRow:    { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' as const },
  segmented:  { display: 'inline-flex', border: '1px solid var(--stone)', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--sheet)' },
  segBtn:     { padding: '0.5rem 1rem', border: 'none', background: 'transparent', color: 'var(--graphite)', fontSize: '0.875rem', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' },
  segBtnActive: { background: 'var(--ink-blue)', color: 'var(--sheet)' },
  viewHint:   { fontSize: '0.8125rem', color: 'var(--pencil)' },
  banner:     { padding: '1rem 1.25rem', background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)' },
  bannerText: { fontSize: '0.9375rem', color: 'var(--graphite)', lineHeight: 1.6 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem',
  },
  cardWrap: { display: 'flex', flexDirection: 'column' },
  card: {
    position: 'relative',
    display: 'flex',
    flex: 1,
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
  removeRow: { display: 'flex', justifyContent: 'flex-end', marginTop: '0.375rem' },
  removeBtn: { background: 'none', border: 'none', padding: '0.125rem 0.25rem', fontSize: '0.75rem', fontFamily: 'inherit', color: 'var(--pencil)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px' },
  yourTheoryTag: { padding: '2px 8px', background: 'var(--paper-deep)', color: 'var(--graphite)', borderRadius: 'var(--radius-sm)', fontSize: '0.6875rem', fontWeight: 600 },
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
  summary: {
    fontFamily: "'Source Serif 4', Georgia, serif",
    fontSize: '0.875rem',
    color: 'var(--graphite)',
    lineHeight: 1.6,
  },
  tags:  { display: 'flex', flexWrap: 'wrap' as const, gap: '0.375rem' },
  tag:   { padding: '2px 8px', background: 'var(--paper-deep)', color: 'var(--graphite)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' },
  chips: { display: 'flex', flexWrap: 'wrap' as const, gap: '0.375rem', marginTop: 'auto', alignItems: 'center' },
  unverifiedLabel: { fontSize: '0.6875rem', color: 'var(--pencil)', fontStyle: 'italic' as const },
  addToggleBtn: { alignSelf: 'flex-start', padding: '0.625rem 1.25rem', background: 'var(--sheet)', color: 'var(--ink-blue)', border: '1.5px solid var(--ink-blue)', borderRadius: 'var(--radius)', fontSize: '0.9375rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' },
  addPanel:   { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)', padding: '1.125rem 1.25rem' },
  addPanelHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' },
  addPanelTitle: { fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)' },
  addCloseBtn: { background: 'none', border: 'none', padding: 0, fontSize: '0.8125rem', fontFamily: 'inherit', color: 'var(--pencil)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px' },
  addForm:    { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  addHint:    { fontSize: '0.8125rem', color: 'var(--pencil)', lineHeight: 1.55 },
  addLabel:   { fontSize: '0.75rem', fontWeight: 600, color: 'var(--pencil)', marginTop: '0.25rem' },
  addInput:   { width: '100%', padding: '0.5rem 0.625rem', background: 'var(--paper)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontFamily: 'inherit', color: 'var(--ink)' },
  addBtn:     { alignSelf: 'flex-start', marginTop: '0.5rem', padding: '0.5rem 1.125rem', background: 'var(--ink-blue)', color: 'var(--sheet)', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' },
  addBtnDisabled: { background: 'var(--paper-deep)', color: 'var(--pencil)', cursor: 'default' },
  addOutcome:     { marginTop: '0.75rem', fontSize: '0.8125rem', lineHeight: 1.5, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' },
  addOutcomeOk:   { background: 'var(--mint)', color: 'var(--moss)' },
  addOutcomeWarn: { background: 'var(--marker-yellow)', color: 'var(--warn-text)' },
  addOutcomeMuted:{ background: 'var(--paper-deep)', color: 'var(--pencil)' },
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
