'use client'

import { useState } from 'react'
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx'
import GlossaryTooltip from '@/components/ui/GlossaryTooltip'
import { glossaryTerm } from '@/lib/glossary'
import { saveInterviewGuide } from './actions'
import type { InterviewQuestion, Theory } from '@/types/database'

interface Props {
  projectId: string
  questions: InterviewQuestion[]
  theories: Pick<Theory, 'id' | 'name'>[]
}

export default function InterviewGuideView({ projectId, questions, theories }: Props) {
  const [saving, setSaving]   = useState(false)
  const [copied, setCopied]   = useState(false)

  const theoryMap = Object.fromEntries(theories.map(t => [t.id, t.name]))

  // Group questions by theory
  const byTheory: Record<string, InterviewQuestion[]> = {}
  for (const q of questions) {
    if (!byTheory[q.theory_id]) byTheory[q.theory_id] = []
    byTheory[q.theory_id].push(q)
  }

  async function handleSave() {
    setSaving(true)
    const fd = new FormData()
    fd.append('projectId', projectId)
    fd.append('questions', JSON.stringify(questions))
    await saveInterviewGuide(fd)
  }

  async function handleCopy() {
    const lines: string[] = []
    questions.forEach((q, i) => {
      lines.push(`${i + 1}. ${q.question}`)
      lines.push(`   [${q.concept} · ${theoryMap[q.theory_id] ?? q.theory_id}]`)
      lines.push('')
    })
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleExportWord() {
    const children = [
      new Paragraph({ text: 'Interview Guide', heading: HeadingLevel.HEADING_1 }),
    ]
    questions.forEach((q, i) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}. `, bold: true, size: 24 }),
            new TextRun({ text: q.question, size: 24 }),
          ],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `[${q.concept} · ${theoryMap[q.theory_id] ?? q.theory_id}]`,
              italics: true,
              size: 20,
              color: '4A4A47',
            }),
          ],
          spacing: { after: 200 },
        })
      )
    })
    const doc = new Document({ sections: [{ children }] })
    const blob = await Packer.toBlob(doc)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'methea-interview-guide.docx'
    a.click()
  }

  return (
    <div style={s.wrapper}>
      {/* Context note */}
      <p style={s.contextNote}>
        These are semi-structured interview
        <GlossaryTooltip term={glossaryTerm('interview-structure')} /> questions.
        {' '}Each includes follow-up probes
        <GlossaryTooltip term={glossaryTerm('probe-questions')} /> to help you go deeper.
      </p>

      {/* Question list */}
      <div style={s.list}>
        {questions.map((q, i) => (
          <div key={q.id} style={s.card}>
            <div style={s.cardTop}>
              <span style={s.num}>{i + 1}</span>
              <p style={s.questionText}>{q.question}</p>
            </div>
            <div style={s.tags}>
              <span style={s.conceptTag}>{q.concept}</span>
              <span style={s.theoryTag}>{theoryMap[q.theory_id] ?? q.theory_id}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={s.actions}>
        <a href={`/project/${projectId}`} style={{ ...s.ghostBtn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>← Project</a>
        <button type="button" onClick={handleCopy} style={s.ghostBtn}>
          {copied ? '✓ Copied' : '⧉ Copy all'}
        </button>
        <button type="button" onClick={handleExportWord} style={s.ghostBtn}>
          Export Word
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{ ...s.primaryBtn, ...(saving ? s.primaryBtnDisabled : {}) }}
        >
          {saving ? 'Saving…' : 'Save guide →'}
        </button>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  wrapper:           { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  contextNote:       { fontSize: '0.875rem', color: 'var(--pencil)', lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' as const },
  list:              { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  card:              { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', padding: '1.125rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  cardTop:           { display: 'flex', gap: '0.875rem', alignItems: 'flex-start' },
  num:               { flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%', background: 'var(--paper-deep)', border: '1.5px solid var(--stone)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--pencil)' },
  questionText:      { fontSize: '0.9375rem', lineHeight: 1.55, color: '#1C1C1C', fontWeight: 500, flex: 1 },
  tags:              { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const, paddingLeft: '2rem' },
  conceptTag:        { padding: '2px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--mint)', color: 'var(--moss)', fontSize: '0.75rem', fontWeight: 600 },
  theoryTag:         { padding: '2px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--paper-deep)', color: 'var(--pencil)', fontSize: '0.75rem', fontWeight: 500, border: '1px solid var(--stone-soft)' },
  actions:           { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' },
  ghostBtn:          { padding: '0.625rem 1.25rem', border: '1px solid var(--stone)', borderRadius: 'var(--radius)', background: 'var(--sheet)', color: 'var(--graphite)', fontSize: '0.875rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' },
  primaryBtn:        { padding: '0.75rem 1.5rem', background: 'var(--ink-blue)', color: 'var(--sheet)', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.9375rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' },
  primaryBtnDisabled:{ background: 'var(--paper-deep)', color: 'var(--pencil)', cursor: 'default' },
}
