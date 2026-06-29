'use client'

import { useState } from 'react'
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx'
import Logo from '@/components/ui/Logo'
import FrameworkDiagram, { type DiagramTheory } from '@/components/ui/FrameworkDiagram'
import type { ResearchContext, Theory } from '@/types/database'

interface Props {
  projectId: string
  ctx: ResearchContext
  theories: Pick<Theory, 'id' | 'name' | 'author' | 'year'>[]
}

export default function ExportView({ projectId, ctx, theories }: Props) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  const theoryMap   = Object.fromEntries(theories.map(t => [t.id, t]))
  const brief       = ctx.brief!
  const framework   = ctx.framework
  const method      = ctx.methodology
  const questions   = ctx.interview_guide?.questions ?? []
  const selectedIds = ctx.theories?.selected_ids ?? []

  const diagramTheories: DiagramTheory[] = selectedIds.map(id => ({
    id,
    name:   theoryMap[id]?.name   ?? id,
    author: theoryMap[id]?.author ?? '',
    year:   theoryMap[id]?.year   ?? null,
  }))

  async function copy(key: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopiedSection(key)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  async function exportFull() {
    const children: Paragraph[] = [
      new Paragraph({ text: 'Research Proposal', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: '' }),
      new Paragraph({ text: 'Research Question', heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: brief.research_question, spacing: { after: 200 } }),
      new Paragraph({ children: [new TextRun({ text: 'Topic: ', bold: true }), new TextRun(brief.topic)] }),
      new Paragraph({ children: [new TextRun({ text: 'Degree: ', bold: true }), new TextRun(brief.degree_level)] }),
      new Paragraph({ children: [new TextRun({ text: 'Discipline: ', bold: true }), new TextRun(brief.discipline)], spacing: { after: 300 } }),
    ]

    if (framework?.narrative) {
      children.push(
        new Paragraph({ text: 'Conceptual Framework', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: framework.narrative, spacing: { after: 300 } }),
      )
    }

    if (method?.narrative) {
      children.push(
        new Paragraph({ text: 'Methodology', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ children: [new TextRun({ text: 'Paradigm: ', bold: true }), new TextRun(method.paradigm)] }),
        new Paragraph({ children: [new TextRun({ text: 'Methodology: ', bold: true }), new TextRun(method.methodology)] }),
        new Paragraph({ children: [new TextRun({ text: 'Data collection: ', bold: true }), new TextRun(method.data_collection)] }),
        new Paragraph({ children: [new TextRun({ text: 'Sample: ', bold: true }), new TextRun(method.sample)] }),
        new Paragraph({ children: [new TextRun({ text: 'Analysis: ', bold: true }), new TextRun(method.analysis_method)], spacing: { after: 160 } }),
        new Paragraph({ text: method.narrative, spacing: { after: 300 } }),
      )
    }

    if (questions.length) {
      children.push(new Paragraph({ text: 'Interview Guide', heading: HeadingLevel.HEADING_2 }))
      questions.forEach((q, i) => {
        children.push(
          new Paragraph({ children: [new TextRun({ text: `${i + 1}. `, bold: true }), new TextRun(q.question)], spacing: { after: 80 } }),
          new Paragraph({ children: [new TextRun({ text: `[${q.concept} · ${theoryMap[q.theory_id]?.name ?? q.theory_id}]`, italics: true, size: 20, color: '4A4A47' })], spacing: { after: 180 } }),
        )
      })
    }

    const doc  = new Document({ sections: [{ children }] })
    const blob = await Packer.toBlob(doc)
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = 'methea-full-proposal.docx'
    a.click()
  }

  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* Header */}
        <div style={s.header}>
          <Logo size="sm" />
          <div style={s.headerActions}>
            <a href={`/project/${projectId}`} style={s.backLink}>← Back to project</a>
            <button type="button" onClick={exportFull} style={s.exportBtn}>
              Export full proposal (Word)
            </button>
          </div>
        </div>

        <h1 style={s.pageTitle}>Research Proposal</h1>
        <p style={s.pageSubtitle}>Full export — all sections expanded</p>

        <div style={s.doc}>

          {/* Research question */}
          <Section label="Research question" actions={
            <Btn onClick={() => copy('rq', brief.research_question)}>
              {copiedSection === 'rq' ? '✓ Copied' : 'Copy'}
            </Btn>
          }>
            <p style={s.researchQuestion}>{brief.research_question}</p>
            <div style={s.metaRow}>
              <MetaField label="Topic"      value={brief.topic} />
              <MetaField label="Degree"     value={brief.degree_level} />
              <MetaField label="Discipline" value={brief.discipline} />
            </div>
          </Section>

          <HR />

          {/* Theories */}
          <Section label="Theories">
            <div style={s.theoryGrid}>
              {selectedIds.map(id => {
                const t = theoryMap[id]
                if (!t) return null
                return (
                  <div key={id} style={s.theoryCard}>
                    <p style={s.theoryName}>{t.name}</p>
                    <p style={s.theoryMeta}>{t.author}, {t.year}</p>
                  </div>
                )
              })}
            </div>
          </Section>

          {/* Framework */}
          {framework?.narrative && (
            <>
              <HR />
              <Section label="Conceptual framework">
                {framework.edges?.length > 0 && (
                  <FrameworkDiagram
                    theories={diagramTheories}
                    edges={framework.edges}
                    layout="linear"
                  />
                )}
                <p style={s.narrative}>{framework.narrative}</p>
              </Section>
            </>
          )}

          {/* Methodology */}
          {method?.narrative && (
            <>
              <HR />
              <Section label="Methodology" actions={
                <>
                  <Btn onClick={() => copy('method', [
                    `Paradigm: ${method.paradigm}`,
                    `Methodology: ${method.methodology}`,
                    `Data collection: ${method.data_collection}`,
                    `Sample: ${method.sample}`,
                    `Analysis: ${method.analysis_method}`,
                    '',
                    method.narrative,
                  ].join('\n'))}>
                    {copiedSection === 'method' ? '✓ Copied' : 'Copy'}
                  </Btn>
                </>
              }>
                <div style={s.chain}>
                  {[
                    { label: 'Paradigm',        value: method.paradigm,        why: method.paradigm_why },
                    { label: 'Methodology',     value: method.methodology,     why: method.methodology_why },
                    { label: 'Data collection', value: method.data_collection, why: method.data_collection_why },
                    { label: 'Sample',          value: method.sample,          why: method.sample_why },
                    { label: 'Analysis',        value: method.analysis_method, why: method.analysis_method_why },
                  ].map((item, i, arr) => (
                    <div key={i} style={s.chainRow}>
                      <div style={s.chainDotCol}>
                        <div style={s.chainDot} />
                        {i < arr.length - 1 && <div style={s.chainLine} />}
                      </div>
                      <div style={s.chainContent}>
                        <p style={s.chainLabel}>{item.label}</p>
                        <p style={s.chainValue}>{item.value}</p>
                        {item.why && <p style={s.chainWhy}>{item.why}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                <p style={s.narrative}>{method.narrative}</p>
              </Section>
            </>
          )}

          {/* Interview guide */}
          {questions.length > 0 && (
            <>
              <HR />
              <Section label={`Interview guide · ${questions.length} questions`} actions={
                <Btn onClick={() => copy('interview',
                  questions.map((q, i) => `${i + 1}. ${q.question}\n   [${q.concept}]`).join('\n\n')
                )}>
                  {copiedSection === 'interview' ? '✓ Copied' : 'Copy all'}
                </Btn>
              }>
                <div style={s.questionList}>
                  {questions.map((q, i) => (
                    <div key={q.id} style={s.questionRow}>
                      <span style={s.qNum}>{i + 1}</span>
                      <div style={s.qBody}>
                        <p style={s.qText}>{q.question}</p>
                        <div style={s.qTags}>
                          <span style={s.conceptTag}>{q.concept}</span>
                          <span style={s.theoryTag}>{theoryMap[q.theory_id]?.name ?? q.theory_id}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Primitives ────────────────────────────────────────────────────────────────

function Section({ label, actions, children }: {
  label: string; actions?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div style={s.section}>
      <div style={s.sectionHead}>
        <p style={s.sectionLabel}>{label}</p>
        {actions && <div style={s.sectionActions}>{actions}</div>}
      </div>
      <div style={s.sectionBody}>{children}</div>
    </div>
  )
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={s.metaLabel}>{label}</p>
      <p style={s.metaValue}>{value}</p>
    </div>
  )
}

function HR() { return <div style={s.hr} /> }

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} style={s.ghostBtn}>{children}</button>
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page:        { minHeight: '100vh', background: 'var(--paper)', padding: '2rem 1rem 5rem' },
  container:   { maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  header:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headerActions:{ display: 'flex', alignItems: 'center', gap: '1rem' },
  backLink:    { fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink-blue)', textDecoration: 'none' },
  exportBtn:   { padding: '0.5rem 1rem', background: 'var(--ink-blue)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' },

  pageTitle:   { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.75rem', fontWeight: 400, color: 'var(--ink)', letterSpacing: '-0.02em', margin: 0 },
  pageSubtitle:{ fontSize: '0.875rem', color: 'var(--pencil)', marginTop: '0.25rem' },

  doc:         { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  hr:          { height: '1px', background: 'var(--stone-soft)' },
  section:     { padding: '1.375rem 1.75rem' },
  sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' },
  sectionLabel:{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' as const, color: 'var(--pencil)' },
  sectionActions:{ display: 'flex', gap: '0.5rem', flexShrink: 0 },
  sectionBody: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },

  ghostBtn:    { padding: '0.3125rem 0.75rem', border: '1px solid var(--stone)', borderRadius: 'var(--radius-sm)', background: 'var(--paper)', color: 'var(--graphite)', fontSize: '0.8125rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' },

  researchQuestion:{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.125rem', fontWeight: 400, lineHeight: 1.6, color: 'var(--ink)', letterSpacing: '-0.01em', fontStyle: 'italic' },
  metaRow:     { display: 'flex', gap: '1.25rem 2rem', flexWrap: 'wrap' as const },
  metaLabel:   { fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--pencil)', marginBottom: '0.15rem' },
  metaValue:   { fontSize: '0.875rem', color: 'var(--graphite)', fontWeight: 500 },

  theoryGrid:  { display: 'flex', gap: '0.625rem', flexWrap: 'wrap' as const },
  theoryCard:  { padding: '0.5rem 0.875rem', background: 'var(--paper)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)' },
  theoryName:  { fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' },
  theoryMeta:  { fontSize: '0.75rem', color: 'var(--pencil)', marginTop: '0.1rem' },

  narrative:   { fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '0.9375rem', lineHeight: 1.75, color: 'var(--graphite)' },

  chain:       { display: 'flex', flexDirection: 'column' },
  chainRow:    { display: 'flex', gap: '0.875rem' },
  chainDotCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '0.3rem', flexShrink: 0, width: '16px' },
  chainDot:    { width: '8px', height: '8px', borderRadius: '50%', background: 'var(--ink-blue)', flexShrink: 0 },
  chainLine:   { width: '1px', flex: 1, background: 'var(--stone)', minHeight: '12px', margin: '3px 0' },
  chainContent:{ flex: 1, paddingBottom: '0.875rem' },
  chainLabel:  { fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--pencil)', marginBottom: '0.15rem' },
  chainValue:  { fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.2rem' },
  chainWhy:    { fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--graphite)' },

  questionList:{ display: 'flex', flexDirection: 'column', gap: '1rem' },
  questionRow: { display: 'flex', gap: '0.875rem', alignItems: 'flex-start', paddingBottom: '0.875rem', borderBottom: '1px solid var(--stone-soft)' },
  qNum:        { flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%', background: 'var(--paper)', border: '1px solid var(--stone)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--pencil)', marginTop: '0.15rem' },
  qBody:       { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  qText:       { fontSize: '0.9375rem', lineHeight: 1.55, color: 'var(--ink)' },
  qTags:       { display: 'flex', gap: '0.375rem', flexWrap: 'wrap' as const },
  conceptTag:  { padding: '1px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--mint)', color: 'var(--moss)', fontSize: '0.75rem', fontWeight: 600 },
  theoryTag:   { padding: '1px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--paper-deep)', color: 'var(--pencil)', fontSize: '0.75rem', fontWeight: 500, border: '1px solid var(--stone-soft)' },
}
