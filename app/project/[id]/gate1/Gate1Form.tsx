'use client'

import { useState } from 'react'
import RadioCard from '@/components/ui/RadioCard'
import { submitGate1 } from './actions'
import type { ClarificationQuestion, BriefExtraction } from '@/types/database'

interface Props {
  projectId: string
  questions: ClarificationQuestion[]
  brief: BriefExtraction
}

export default function Gate1Form({ projectId, questions, brief }: Props) {
  const [step, setStep]           = useState(0)
  const [answers, setAnswers]     = useState<Record<string, string>>({})
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

  async function goForward() {
    if (!selected) return
    if (!isLast) {
      setStep(s => s + 1)
      return
    }
    setSubmitting(true)
    const formData = new FormData()
    formData.append('projectId', projectId)
    formData.append('answers', JSON.stringify(answers))
    await submitGate1(formData)
  }

  return (
    <div style={s.container}>
      {/* AI confirmation banner */}
      <div style={s.banner}>
        <p style={s.bannerText}>
          Based on your brief, your question seems to be about{' '}
          <strong>{brief.topic}</strong>. Let&apos;s sharpen it together.
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

      {/* Navigation */}
      <div style={s.nav}>
        {step === 0 ? (
          <a href={`/project/${projectId}/brief`} style={s.backLink}>← Back</a>
        ) : (
          <button type="button" onClick={goBack} style={s.backBtn}>← Back</button>
        )}
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
  )
}

const s: Record<string, React.CSSProperties> = {
  container:    { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  banner:       { padding: '1rem 1.25rem', background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)' },
  bannerText:   { fontSize: '0.9375rem', color: 'var(--graphite)', lineHeight: 1.6 },
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
  continueBtn:  { padding: '0.625rem 1.25rem', background: 'var(--ink-blue)', color: 'var(--sheet)', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.9375rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' },
  continueBtnDisabled: { background: 'var(--paper-deep)', color: 'var(--pencil)', cursor: 'default' },
}
