'use client'

import { useState } from 'react'
import RadioCard from '@/components/ui/RadioCard'
import GlossaryTooltip from '@/components/ui/GlossaryTooltip'
import { glossaryTerm } from '@/lib/glossary'
import { submitGate1 } from './actions'
import type { ClarificationQuestion, BriefExtraction } from '@/types/database'

interface Props {
  projectId: string
  questions: ClarificationQuestion[]
  brief: BriefExtraction
  initialAnswers?: Record<string, string>
  initialContextNote?: string
  completed?: boolean
}

export default function Gate1Form({
  projectId, questions, brief, initialAnswers, initialContextNote, completed,
}: Props) {
  // A completed gate opens in review mode; editing reveals the wizard.
  const [editing, setEditing]       = useState(!completed)
  const [step, setStep]             = useState(0)
  const [answers, setAnswers]       = useState<Record<string, string>>(initialAnswers ?? {})
  const [contextNote, setContextNote] = useState(initialContextNote ?? '')
  const [submitting, setSubmitting] = useState(false)

  const current  = questions[step]
  const selected = answers[current.id]
  const isLast   = step === questions.length - 1

  function selectOption(value: string) {
    setAnswers(prev => ({ ...prev, [current.id]: value }))
  }

  function goBack() {
    setStep(s => s - 1)
  }

  async function submit() {
    setSubmitting(true)
    const formData = new FormData()
    formData.append('projectId', projectId)
    formData.append('answers', JSON.stringify(answers))
    formData.append('contextNote', contextNote)
    await submitGate1(formData)
  }

  async function goForward() {
    if (!selected) return
    if (!isLast) {
      setStep(s => s + 1)
      return
    }
    await submit()
  }

  // ── Review mode (completed gate, not yet editing) ───────────────────────────
  if (!editing) {
    return (
      <div style={s.container}>
        <div style={s.reviewCard}>
          <p style={s.reviewHeading}>Research question refined</p>
          <p style={s.reviewSub}>Your answers to these questions shaped your final research question.</p>
          <div style={s.divider} />
          {questions.map(q => (
            <div key={q.id} style={s.qaRow}>
              <p style={s.qLabel}>{q.prompt}</p>
              <p style={s.aText}>
                {q.options.find(o => o.value === answers[q.id])?.title ?? answers[q.id] ?? '—'}
              </p>
            </div>
          ))}
          {contextNote.trim() && (
            <div style={s.qaRow}>
              <p style={s.qLabel}>Added context</p>
              <p style={s.aText}>{contextNote}</p>
            </div>
          )}
        </div>
        <div style={s.reviewActions}>
          <a href={`/project/${projectId}`} style={s.backLink}>← Back to project</a>
          <button type="button" onClick={() => { setEditing(true); setStep(0) }} style={s.editBtn}>
            Edit answers
          </button>
        </div>
      </div>
    )
  }

  // ── Edit / first-pass wizard ────────────────────────────────────────────────
  return (
    <div style={s.container}>
      {/* AI confirmation card — starts from what student brought */}
      <div style={s.banner}>
        <p style={s.bannerEyebrow}>Based on your brief</p>
        <p style={s.bannerText}>
          Your question seems to be about <strong style={{ color: 'var(--ink)' }}>{brief.topic}</strong>.
          {' '}It looks <strong style={{ color: 'var(--ink)' }}>{brief.research_type}</strong>
          <GlossaryTooltip term={glossaryTerm('exploratory-vs-explanatory')} />.
          {' '}Let&apos;s sharpen it together.
        </p>
      </div>

      {/* Progress indicator */}
      <div style={s.progressRow}>
        <div style={s.dots}>
          {questions.map((q, i) => (
            <div key={q.id} style={s.dotItem}>
              <div style={{
                ...s.dot,
                background:   i <= step ? 'var(--ink-blue)' : 'transparent',
                borderColor:  i <= step ? 'var(--ink-blue)' : 'var(--stone)',
              }} />
              {i < questions.length - 1 && (
                <div style={{
                  ...s.line,
                  background: i < step ? 'var(--marker-lime)' : 'var(--stone-soft)',
                }} />
              )}
            </div>
          ))}
        </div>
        <span style={s.progressLabel}>Question {step + 1} of {questions.length}</span>
      </div>

      {/* Question */}
      <h3 style={s.question}>{current.prompt}</h3>

      {/* Radio cards */}
      <div style={s.options}>
        {current.options.map(opt => (
          <RadioCard
            key={opt.value}
            option={opt}
            selected={selected === opt.value}
            onSelect={() => selectOption(opt.value)}
          />
        ))}
      </div>

      {/* Contextual note about research approach */}
      <p style={s.approachNote}>
        These questions help identify whether your approach is deductive, inductive, or abductive.
        <GlossaryTooltip term={glossaryTerm('deductive-vs-inductive')} />
      </p>

      {/* Optional free-text context — structured single-select above, one nuance field here.
          Shown on the final step so it reads as "anything else we should weigh." */}
      {isLast && (
        <div style={s.contextBlock}>
          <label htmlFor="ctx-note" style={s.contextLabel}>Add context (optional)</label>
          <p style={s.contextHint}>
            Anything specific about your case, sample, or constraints? We&apos;ll fold it into what we suggest next.
          </p>
          <textarea
            id="ctx-note"
            value={contextNote}
            onChange={e => setContextNote(e.target.value)}
            rows={3}
            maxLength={600}
            placeholder="e.g. My sample is SMEs in a post-conflict economy, so generalisable models may not transfer."
            style={s.contextTextarea}
          />
        </div>
      )}

      {/* Navigation */}
      <div style={s.nav}>
        {step === 0 ? (
          completed ? (
            <button type="button" onClick={() => setEditing(false)} style={s.backBtn}>← Cancel</button>
          ) : (
            <a href={`/project/${projectId}/brief`} style={s.backLink}>← Back</a>
          )
        ) : (
          <button type="button" onClick={goBack} style={s.backBtn}>← Back</button>
        )}
        <div style={s.navRight}>
          {/* Escape hatch — always available */}
          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            style={{ ...s.skipBtn, ...(submitting ? s.skipBtnDisabled : {}) }}
          >
            {completed ? 'Save changes →' : 'Keep my current answer →'}
          </button>
          <button
            type="button"
            onClick={goForward}
            disabled={!selected || submitting}
            style={{
              ...s.continueBtn,
              ...(!selected || submitting ? s.continueBtnDisabled : {}),
            }}
          >
            {submitting ? 'Saving...' : isLast ? 'Finish →' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  container:    { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  banner:       { padding: '1.25rem 1.5rem', background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  bannerEyebrow:{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--pencil)' },
  bannerText:   { fontSize: '1.0625rem', color: 'var(--graphite)', lineHeight: 1.5, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 400 },
  progressRow:  { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  dots:         { display: 'flex', alignItems: 'center' },
  dotItem:      { display: 'flex', alignItems: 'center' },
  dot:          { width: '12px', height: '12px', borderRadius: '50%', border: '2px solid var(--stone)', flexShrink: 0 },
  line:         { width: '32px', height: '2px' },
  progressLabel:{ fontSize: '0.8125rem', color: 'var(--pencil)' },
  question:     { fontSize: '1.125rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.4 },
  options:      { display: 'flex', flexDirection: 'column', gap: '0.625rem' },
  nav:          { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' },
  backLink:     { fontSize: '0.9375rem', color: 'var(--ink-blue)', textDecoration: 'none' },
  backBtn:      { background: 'none', border: 'none', padding: 0, fontSize: '0.9375rem', fontFamily: 'inherit', color: 'var(--ink-blue)', cursor: 'pointer' },
  navRight:     { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  skipBtn:      { background: 'none', border: 'none', padding: 0, fontSize: '0.875rem', fontFamily: 'inherit', color: 'var(--pencil)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' },
  skipBtnDisabled: { opacity: 0.4, cursor: 'default' },
  continueBtn:  { padding: '0.625rem 1.25rem', background: 'var(--ink-blue)', color: 'var(--sheet)', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.9375rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' },
  continueBtnDisabled: { background: 'var(--paper-deep)', color: 'var(--pencil)', cursor: 'default' },
  approachNote: { fontSize: '0.8125rem', color: 'var(--pencil)', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: '0.25rem' },

  // Optional context field
  contextBlock:   { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  contextLabel:   { fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)' },
  contextHint:    { fontSize: '0.8125rem', color: 'var(--pencil)', lineHeight: 1.5 },
  contextTextarea:{ width: '100%', padding: '0.75rem', background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)', fontSize: '0.9375rem', fontFamily: 'inherit', color: 'var(--ink)', lineHeight: 1.6, resize: 'vertical' as const },

  // Review mode
  reviewCard:    { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  reviewHeading: { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.125rem', fontWeight: 400, color: 'var(--ink)' },
  reviewSub:     { fontSize: '0.875rem', color: 'var(--pencil)', marginTop: '-0.5rem' },
  divider:       { borderTop: '1px solid var(--stone-soft)' },
  qaRow:         { display: 'flex', flexDirection: 'column' as const, gap: '0.25rem' },
  qLabel:        { fontSize: '0.8125rem', fontWeight: 600, color: 'var(--pencil)' },
  aText:         { fontSize: '0.9375rem', color: 'var(--ink)' },
  reviewActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  editBtn:       { padding: '0.5rem 1.125rem', background: 'var(--ink-blue)', color: 'var(--sheet)', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' },
}
