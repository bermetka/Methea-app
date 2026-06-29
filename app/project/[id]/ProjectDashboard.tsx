'use client'

import { useState } from 'react'
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx'
import Logo from '@/components/ui/Logo'
import FrameworkDiagram, { type DiagramTheory } from '@/components/ui/FrameworkDiagram'
import type { ResearchContext, Theory } from '@/types/database'

// ── Accent palette per section ────────────────────────────────────────────────
const ACCENT = {
  question:    '#11425D',
  framework:   '#5C4E9A',
  methodology: '#B55C38',
  guide:       '#2E7D4F',
  analysis:    '#8C8A82',
}

// Spine dot width + gap from left edge of card
const SPINE_W = 32   // total left column width
const DOT_TOP = 36   // px from card top to dot center (aligns with title)

interface Props {
  projectId: string
  ctx: ResearchContext
  theories: Pick<Theory, 'id' | 'name' | 'author' | 'year'>[]
  isComplete: boolean
}

export default function ProjectDashboard({ projectId, ctx, theories, isComplete }: Props) {
  const [open, setOpen]               = useState<Record<string, boolean>>({})
  const [copiedSection, setCopiedSection] = useState<string | null>(null)
  const [tooltipId, setTooltipId]     = useState<string | null>(null)

  function toggle(id: string) { setOpen(prev => ({ ...prev, [id]: !prev[id] })) }
  function isOpen(id: string) { return !!open[id] }

  const theoryMap   = Object.fromEntries(theories.map(t => [t.id, t]))
  const brief       = ctx.brief!
  const framework   = ctx.framework
  const method      = ctx.methodology
  const questions   = ctx.interview_guide?.questions ?? []
  const selectedIds = ctx.theories?.selected_ids ?? []

  const frameworkDone   = !!framework?.edges?.length
  const methodologyDone = !!method?.narrative
  const interviewDone   = questions.length > 0
  const findings        = ctx.findings
  const findingsDone    = !!findings?.gate3_completed

  // ── Concept-per-theory map for Part 3 breadcrumb detail ─────────────────────
  const theoryConceptMap: Record<string, string[]> = {}
  for (const q of questions) {
    if (!theoryConceptMap[q.theory_id]) theoryConceptMap[q.theory_id] = []
    if (!theoryConceptMap[q.theory_id].includes(q.concept)) {
      theoryConceptMap[q.theory_id].push(q.concept)
    }
  }

  const methodBreadcrumb = selectedIds
    .map(id => {
      const t = theoryMap[id]
      const concepts = (theoryConceptMap[id] ?? []).slice(0, 2)
      return `${t?.name ?? id}${concepts.length ? ` (${concepts.join(', ')})` : ''}`
    })
    .join(' + ')

  // ── Banner next step ──────────────────────────────────────────────────────────
  const nextHref  = !frameworkDone   ? `/project/${projectId}/framework`
                  : !methodologyDone ? `/project/${projectId}/methodology`
                  : !interviewDone   ? `/project/${projectId}/interview-guide`
                  : null
  const nextLabel = !frameworkDone   ? 'Build your framework'
                  : !methodologyDone ? 'Derive your methodology'
                  : !interviewDone   ? 'Build your interview guide'
                  : null

  // ── Export helpers ────────────────────────────────────────────────────────────
  async function copy(key: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopiedSection(key)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  async function exportMethodologyWord() {
    if (!method) return
    const items = ['paradigm','methodology','data_collection','sample','analysis_method'] as const
    const children = [
      new Paragraph({ text: 'Methodology', heading: HeadingLevel.HEADING_1 }),
      ...items.map(k => new Paragraph({ children: [new TextRun({ text: `${k.replace(/_/g,' ')}: `, bold: true }), new TextRun((method as any)[k])], spacing: { after: 120 } })),
      new Paragraph({ text: '' }),
      new Paragraph({ text: method.narrative }),
    ]
    dl(await Packer.toBlob(new Document({ sections: [{ children }] })), 'methea-methodology.docx')
  }

  async function exportInterviewWord() {
    const children = [new Paragraph({ text: 'Interview Guide', heading: HeadingLevel.HEADING_1 })]
    questions.forEach((q, i) => {
      children.push(
        new Paragraph({ children: [new TextRun({ text: `${i + 1}. `, bold: true }), new TextRun(q.question)], spacing: { after: 80 } }),
        new Paragraph({ children: [new TextRun({ text: `[${q.concept} · ${theoryMap[q.theory_id]?.name ?? q.theory_id}]`, italics: true, size: 20, color: '4A4A47' })], spacing: { after: 200 } }),
      )
    })
    dl(await Packer.toBlob(new Document({ sections: [{ children }] })), 'methea-interview-guide.docx')
  }

  const diagramTheories: DiagramTheory[] = selectedIds.map(id => ({
    id, name: theoryMap[id]?.name ?? id, author: theoryMap[id]?.author ?? '', year: theoryMap[id]?.year ?? null,
  }))

  const allConcepts = Array.from(new Set(questions.map(q => q.concept)))

  // ── Card definitions (status drives spine dot color) ──────────────────────────
  type CardStatus = 'done' | 'outdated' | 'locked' | 'empty'
  const outdated = new Set(ctx.outdated_blocks ?? [])
  const qStatus:  CardStatus = 'done'
  const fwStatus: CardStatus = frameworkDone   ? (outdated.has('framework')   ? 'outdated' : 'done') : 'empty'
  const mStatus:  CardStatus = methodologyDone ? (outdated.has('methodology') ? 'outdated' : 'done') : frameworkDone   ? 'empty' : 'locked'
  const igStatus: CardStatus = interviewDone   ? (outdated.has('interview_guide') ? 'outdated' : 'done') : methodologyDone ? 'empty' : 'locked'
  const anStatus: CardStatus = findingsDone ? 'done' : interviewDone ? 'empty' : 'locked'

  const CONNECTORS = [
    { id: 'c1', label: 'shapes which theories fit' },
    { id: 'c2', label: 'determines paradigm + method' },
    { id: 'c3', label: 'generates questions per concept' },
    { id: 'c4', label: 'structures analysis coding' },
  ]

  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* Header */}
        <div style={s.header}>
          <Logo size="sm" />
          <div style={s.headerActions}>
            {isComplete && (
              <a href={`/project/${projectId}/export`} style={s.exportLink}>Export full proposal →</a>
            )}
            <a href="/projects" style={s.projectsLink}>← My projects</a>
          </div>
        </div>

        {/* Banner */}
        {nextHref && (
          <div style={s.banner}>
            <div>
              <p style={s.bannerEyebrow}>Next step</p>
              <p style={s.bannerText}>{nextLabel}</p>
            </div>
            <a href={nextHref} style={s.bannerBtn}>Continue →</a>
          </div>
        )}

        {/* ── Spine + card stack ── */}
        <div style={s.spineContainer}>

          {/* Spine: absolute vertical rail */}
          <SpineRail dots={[qStatus, fwStatus, mStatus, igStatus, anStatus]} />

          {/* Cards with left margin for spine */}
          <div style={s.cardStack}>

            {/* Research question */}
            <SpineRow status={qStatus}>
              <SectionCard
                id="question"
                accent={ACCENT.question}
                kicker="Research question"
                title={brief.research_question}
                titleIsQuestion
                status="done"
                expanded={isOpen('question')}
                onToggle={() => toggle('question')}
                primaryAction={{ label: copiedSection === 'rq' ? '✓ Copied' : 'Copy', onClick: () => copy('rq', brief.research_question) }}
                preview={
                  <div style={s.metaRow}>
                    <MetaField label="Topic"      value={brief.topic} />
                    <MetaField label="Degree"     value={brief.degree_level} />
                    <MetaField label="Discipline" value={brief.discipline} />
                  </div>
                }
              >
                <p style={s.narrative}>{brief.research_question}</p>
                <div style={s.metaRow}>
                  <MetaField label="Topic"      value={brief.topic} />
                  <MetaField label="Degree"     value={brief.degree_level} />
                  <MetaField label="Discipline" value={brief.discipline} />
                </div>
              </SectionCard>
            </SpineRow>

            <SpineConnector
              id="c1"
              label={CONNECTORS[0].label}
              shown={tooltipId === 'c1'}
              onHover={setTooltipId}
            />

            {/* Framework */}
            <SpineRow status={fwStatus}>
              {frameworkDone ? (
                <SectionCard
                  id="framework"
                  accent={ACCENT.framework}
                  kicker="Conceptual framework"
                  title={selectedIds.map(id => theoryMap[id]?.name ?? id).join(' × ')}
                  status={fwStatus === 'outdated' ? 'outdated' : 'done'}
                  expanded={isOpen('framework')}
                  onToggle={() => toggle('framework')}
                  derivedFrom={{ label: 'your research question', sourceCardId: 'question' }}
                  primaryAction={{ label: 'Open diagram', href: `/project/${projectId}/framework` }}
                  secondaryAction={{ label: 'Swap theory', href: `/project/${projectId}/theories` }}
                  preview={
                    <div style={s.previewStack}>
                      <div style={s.chipRow}>
                        {selectedIds.map(id => (
                          <span key={id} style={s.theoryChip}>{theoryMap[id]?.name ?? id}</span>
                        ))}
                      </div>
                      {framework.narrative && <p style={s.previewText}>{firstSentence(framework.narrative)}</p>}
                      {allConcepts.length > 0 && (
                        <div style={s.chipRow}>
                          {allConcepts.slice(0, 5).map(c => (
                            <span key={c} style={s.conceptChip}>{c}</span>
                          ))}
                          {allConcepts.length > 5 && <span style={s.moreTag}>+{allConcepts.length - 5} more</span>}
                        </div>
                      )}
                    </div>
                  }
                >
                  <FrameworkDiagram theories={diagramTheories} edges={framework.edges ?? []} layout="linear" />
                  {framework.narrative && <p style={s.narrative}>{framework.narrative}</p>}
                </SectionCard>
              ) : (
                <LockedCard
                  accent={ACCENT.framework}
                  kicker="Conceptual framework"
                  title="Framework"
                  status={fwStatus}
                  href={`/project/${projectId}/framework`}
                  ctaLabel="Build framework →"
                  derivedFrom={{ label: 'your research question', sourceCardId: 'question' }}
                />
              )}
            </SpineRow>

            <SpineConnector
              id="c2"
              label={CONNECTORS[1].label}
              shown={tooltipId === 'c2'}
              onHover={setTooltipId}
            />

            {/* Methodology */}
            <SpineRow status={mStatus}>
              {methodologyDone ? (
                <SectionCard
                  id="methodology"
                  accent={ACCENT.methodology}
                  kicker="Methodology"
                  title={`${method!.paradigm} · ${method!.methodology}`}
                  status={mStatus === 'outdated' ? 'outdated' : 'done'}
                  expanded={isOpen('methodology')}
                  onToggle={() => toggle('methodology')}
                  derivedFrom={{ label: methodBreadcrumb || selectedIds.map(id => theoryMap[id]?.name ?? id).join(' + '), sourceCardId: 'framework' }}
                  primaryAction={{ label: copiedSection === 'method' ? '✓ Copied' : 'Copy', onClick: () => copy('method', [
                    `Paradigm: ${method!.paradigm}`,
                    `Methodology: ${method!.methodology}`,
                    `Data collection: ${method!.data_collection}`,
                    `Sample: ${method!.sample}`,
                    `Analysis: ${method!.analysis_method}`,
                    '',
                    method!.narrative,
                  ].join('\n')) }}
                  secondaryAction={{ label: 'Export Word', onClick: exportMethodologyWord }}
                  preview={
                    <div style={s.previewStack}>
                      <p style={s.chainPreview}>
                        {[method!.paradigm, method!.methodology, method!.data_collection].join(' → ')}
                      </p>
                      {method!.narrative && <p style={s.previewText}>{firstSentence(method!.narrative)}</p>}
                    </div>
                  }
                >
                  <div style={s.chain}>
                    {[
                      { label: 'Paradigm',        value: method!.paradigm,        why: method!.paradigm_why },
                      { label: 'Methodology',     value: method!.methodology,     why: method!.methodology_why },
                      { label: 'Data collection', value: method!.data_collection, why: method!.data_collection_why },
                      { label: 'Sample',          value: method!.sample,          why: method!.sample_why },
                      { label: 'Analysis',        value: method!.analysis_method, why: method!.analysis_method_why },
                    ].map((item, i, arr) => (
                      <div key={i} style={s.chainRow}>
                        <div style={s.chainDotCol}>
                          <div style={{ ...s.chainDot, background: ACCENT.methodology }} />
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
                  <p style={s.narrative}>{method!.narrative}</p>
                </SectionCard>
              ) : (
                <LockedCard
                  accent={ACCENT.methodology}
                  kicker="Methodology"
                  title="Methodology chain"
                  status={mStatus}
                  href={frameworkDone ? `/project/${projectId}/methodology` : undefined}
                  ctaLabel={frameworkDone ? 'Start methodology →' : undefined}
                  lockedReason={!frameworkDone ? 'Complete framework first' : undefined}
                  derivedFrom={frameworkDone ? { label: selectedIds.map(id => theoryMap[id]?.name ?? id).join(' + '), sourceCardId: 'framework' } : undefined}
                />
              )}
            </SpineRow>

            <SpineConnector
              id="c3"
              label={CONNECTORS[2].label}
              shown={tooltipId === 'c3'}
              onHover={setTooltipId}
            />

            {/* Interview guide */}
            <SpineRow status={igStatus}>
              {interviewDone ? (
                <SectionCard
                  id="guide"
                  accent={ACCENT.guide}
                  kicker="Interview guide"
                  title={`${questions.length} questions across ${selectedIds.length} ${selectedIds.length === 1 ? 'theory' : 'theories'}`}
                  status={igStatus === 'outdated' ? 'outdated' : 'done'}
                  expanded={isOpen('guide')}
                  onToggle={() => toggle('guide')}
                  derivedFrom={{ label: 'your methodology', sourceCardId: 'methodology' }}
                  primaryAction={{ label: copiedSection === 'interview' ? '✓ Copied' : 'Copy all', onClick: () => copy('interview',
                    questions.map((q, i) => `${i + 1}. ${q.question}\n   [${q.concept}]`).join('\n\n')
                  )}}
                  secondaryAction={{ label: 'Export Word', onClick: exportInterviewWord }}
                  preview={
                    <div style={s.previewStack}>
                      <div style={s.questionPreviewRow}>
                        <span style={s.qNumSmall}>1</span>
                        <p style={s.previewText}>{questions[0].question}</p>
                      </div>
                      <p style={s.viewAllHint}>↓ expand to see all {questions.length} questions</p>
                    </div>
                  }
                >
                  {questions.map((q, i) => (
                    <div key={q.id} style={i < questions.length - 1 ? s.questionRow : { ...s.questionRow, borderBottom: 'none', paddingBottom: 0 }}>
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
                </SectionCard>
              ) : (
                <LockedCard
                  accent={ACCENT.guide}
                  kicker="Interview guide"
                  title="Interview guide"
                  status={igStatus}
                  href={methodologyDone ? `/project/${projectId}/interview-guide` : undefined}
                  ctaLabel={methodologyDone ? 'Build interview guide →' : undefined}
                  lockedReason={!methodologyDone ? 'Complete methodology first' : undefined}
                  derivedFrom={methodologyDone ? { label: 'your methodology', sourceCardId: 'methodology' } : undefined}
                />
              )}
            </SpineRow>

            <SpineConnector
              id="c4"
              label={CONNECTORS[3].label}
              shown={tooltipId === 'c4'}
              onHover={setTooltipId}
            />

            {/* Findings */}
            <SpineRow status={anStatus}>
              {findingsDone ? (
                <SectionCard
                  id="analysis"
                  accent={ACCENT.analysis}
                  kicker="Findings analysis"
                  title={`${findings!.themes.filter(t => t.confirmed).length} confirmed themes`}
                  status="done"
                  expanded={isOpen('analysis')}
                  onToggle={() => toggle('analysis')}
                  derivedFrom={{ label: 'your interview guide', sourceCardId: 'guide' }}
                  primaryAction={{ label: 'Open analysis', href: `/project/${projectId}/analysis` }}
                  preview={
                    <div style={s.previewStack}>
                      {findings!.themes.filter(t => t.confirmed).slice(0, 3).map(t => (
                        <p key={t.id} style={s.previewText}>◆ {t.label}</p>
                      ))}
                    </div>
                  }
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {findings!.themes.filter(t => t.confirmed).map(t => (
                      <div key={t.id} style={{ padding: '0.625rem 0.75rem', background: 'var(--paper)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--stone-soft)' }}>
                        <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ink)', marginBottom: '0.2rem' }}>{t.label}</p>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--graphite)', lineHeight: 1.55 }}>{t.summary}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--pencil)', marginTop: '0.25rem' }}>{t.frequency} segments · {t.concepts.join(', ')}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              ) : (
                <LockedCard
                  accent={ACCENT.analysis}
                  kicker="Findings analysis"
                  title={interviewDone ? 'Upload transcript' : 'Findings'}
                  status={anStatus}
                  href={interviewDone ? `/project/${projectId}/analysis` : undefined}
                  ctaLabel={interviewDone ? 'Upload transcript →' : undefined}
                  lockedReason={
                    interviewDone
                      ? 'Upload an interview transcript — Methea codes it against your framework and surfaces themes.'
                      : 'Complete your interview guide first, then upload transcripts here.'
                  }
                />
              )}
            </SpineRow>

          </div>
        </div>
      </div>
    </div>
  )
}

// ── SpineRail ─────────────────────────────────────────────────────────────────
// Renders the continuous vertical line + dots. Positioned absolutely over the
// left margin area. Heights are managed by the SpineRow/SpineConnector rows.

function SpineRail({ dots }: { dots: Array<'done' | 'outdated' | 'locked' | 'empty'> }) {
  // The rail is decorative only — dots are actually rendered inside SpineRow
  // This component renders nothing; dots live in SpineRow
  return null
}

// ── SpineRow ──────────────────────────────────────────────────────────────────

function SpineRow({ status, children }: {
  status: 'done' | 'outdated' | 'locked' | 'empty'
  children: React.ReactNode
}) {
  const dotCfg = {
    done:     { bg: 'var(--marker-green)',  border: 'none',                      glyph: '✓', glyphColor: 'var(--moss)' },
    outdated: { bg: 'var(--marker-yellow)', border: 'none',                      glyph: '⚠', glyphColor: 'var(--warn-text)' },
    locked:   { bg: 'transparent',          border: '2px solid var(--stone)',    glyph: '○', glyphColor: 'var(--pencil)' },
    empty:    { bg: 'transparent',          border: '2px dashed var(--stone)',   glyph: '',  glyphColor: 'var(--pencil)' },
  }[status]

  return (
    <div style={s.spineRow}>
      {/* Dot column */}
      <div style={s.spineDotCol}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%',
          background: dotCfg.bg,
          border: dotCfg.border,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '7px', color: dotCfg.glyphColor, fontWeight: 700,
          flexShrink: 0,
          marginTop: DOT_TOP - 6, // center dot on title row (subtract half dot height)
        }}>
          {dotCfg.glyph}
        </div>
      </div>
      {/* Card */}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

// ── SpineConnector ────────────────────────────────────────────────────────────

function SpineConnector({ id, label, shown, onHover }: {
  id: string
  label: string
  shown: boolean
  onHover: (id: string | null) => void
}) {
  return (
    <div style={s.spineConnectorRow}>
      {/* Line segment with hover tooltip */}
      <div
        style={s.spineDotCol}
        onMouseEnter={() => onHover(id)}
        onMouseLeave={() => onHover(null)}
      >
        <div style={s.connectorLineSegment} />
        {shown && (
          <div style={s.connectorTooltip}>{label}</div>
        )}
      </div>
      {/* Empty right side */}
      <div style={{ flex: 1 }} />
    </div>
  )
}

// ── SectionCard ───────────────────────────────────────────────────────────────

interface SectionCardProps {
  id: string
  accent: string
  kicker: string
  title: string
  titleIsQuestion?: boolean
  status: 'done' | 'outdated'
  expanded: boolean
  onToggle: () => void
  derivedFrom?: { label: string; sourceCardId: string }
  primaryAction: { label: string; onClick?: () => void; href?: string }
  secondaryAction?: { label: string; onClick?: () => void; href?: string }
  preview: React.ReactNode
  children: React.ReactNode
}

function SectionCard({
  accent, kicker, title, titleIsQuestion, status, expanded, onToggle,
  derivedFrom, primaryAction, secondaryAction, preview, children,
}: SectionCardProps) {
  return (
    <div style={{ ...s.card, borderLeftColor: accent }}>
      {/* Header row — always visible, click to expand */}
      <button type="button" onClick={onToggle} style={s.cardHeader} aria-expanded={expanded}>
        <div style={s.cardHeaderLeft}>
          <p style={{ ...s.kicker, color: accent }}>{kicker}</p>
          <p style={titleIsQuestion ? s.titleQuestion : s.title}>{title}</p>
        </div>
        <div style={s.cardHeaderRight}>
          <StatusBadge status={status} />
          <span style={s.chevron}>{expanded ? '▲' : '▾'}</span>
        </div>
      </button>

      {/* Collapsed preview */}
      {!expanded && <div style={s.previewWrap}>{preview}</div>}

      {/* Derived-from breadcrumb */}
      {derivedFrom && (
        <div style={s.derivedFrom}>
          <span style={s.derivedArrow}>↳</span>
          <span style={s.derivedLabel}> derived from: </span>
          <span style={s.derivedValue}>{derivedFrom.label}</span>
        </div>
      )}

      {/* Actions */}
      <div style={s.cardActions}>
        <ActionBtn action={primaryAction} accent={accent} primary />
        {secondaryAction && <ActionBtn action={secondaryAction} />}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={s.expandedWrap}>
          <div style={{ height: 1, background: accent + '22', margin: '0 1.25rem' }} />
          <div style={s.expandSection}>{children}</div>
        </div>
      )}
    </div>
  )
}

// ── LockedCard ────────────────────────────────────────────────────────────────

function LockedCard({ accent, kicker, title, status, href, ctaLabel, lockedReason, locked, derivedFrom }: {
  accent: string; kicker: string; title: string; status?: 'done' | 'outdated' | 'locked' | 'empty'
  href?: string; ctaLabel?: string; lockedReason?: string; locked?: boolean
  derivedFrom?: { label: string; sourceCardId: string }
}) {
  return (
    <div style={{ ...s.card, borderLeftColor: accent, opacity: locked ? 0.55 : 1 }}>
      <div style={{ ...s.cardHeader, cursor: 'default' }}>
        <div style={s.cardHeaderLeft}>
          <p style={{ ...s.kicker, color: accent }}>{kicker}</p>
          <p style={s.title}>{title}</p>
        </div>
        <div style={s.cardHeaderRight}>
          {locked
            ? <span style={s.lockBadge}>🔒 v2</span>
            : status === 'empty'
            ? <StatusBadge status="locked" label="Not started" />
            : <StatusBadge status="locked" />
          }
        </div>
      </div>
      {lockedReason && <p style={s.lockedReason}>{lockedReason}</p>}
      {derivedFrom && (
        <div style={s.derivedFrom}>
          <span style={s.derivedArrow}>↳</span>
          <span style={s.derivedLabel}> derived from: </span>
          <span style={s.derivedValue}>{derivedFrom.label}</span>
        </div>
      )}
      {href && ctaLabel && (
        <div style={s.cardActions}>
          <a href={href} style={{ ...s.actionBtnPrimary, background: accent, borderColor: accent }}>{ctaLabel}</a>
        </div>
      )}
    </div>
  )
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status, label }: { status: 'done' | 'outdated' | 'locked'; label?: string }) {
  const cfg = {
    done:     { bg: 'var(--mint)',          color: 'var(--moss)',      text: label ?? '✓ Done' },
    outdated: { bg: 'var(--marker-yellow)', color: 'var(--warn-text)', text: label ?? '⚠ Outdated' },
    locked:   { bg: 'var(--paper-deep)',    color: 'var(--pencil)',    text: label ?? '○ Locked' },
  }[status]
  return <span style={{ ...s.badge, background: cfg.bg, color: cfg.color }}>{cfg.text}</span>
}

// ── ActionBtn ─────────────────────────────────────────────────────────────────

function ActionBtn({ action, accent, primary }: {
  action: { label: string; onClick?: () => void; href?: string }
  accent?: string; primary?: boolean
}) {
  const style = primary
    ? { ...s.actionBtnPrimary, ...(accent ? { background: accent, borderColor: accent } : {}) }
    : s.actionBtnSecondary
  return action.href
    ? <a href={action.href} style={style}>{action.label}</a>
    : <button type="button" onClick={action.onClick} style={style}>{action.label}</button>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={s.metaLabel}>{label}</p>
      <p style={s.metaValue}>{value}</p>
    </div>
  )
}

function firstSentence(text: string) {
  const m = text.match(/^[^.!?]+[.!?]/)
  return m ? m[0] : text.slice(0, 120) + (text.length > 120 ? '…' : '')
}

function dl(blob: Blob, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

// ── Styles ────────────────────────────────────────────────────────────────────

const SPINE_LINE_LEFT = SPINE_W / 2 - 1   // center of spine column

const s: Record<string, React.CSSProperties> = {
  // Page
  page:       { minHeight: '100vh', background: 'var(--paper)', padding: '2rem 1rem 5rem' },
  container:  { maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0' },

  header:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' },
  headerActions:{ display: 'flex', alignItems: 'center', gap: '1rem' },
  projectsLink: { fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink-blue)', textDecoration: 'none' },
  exportLink:   { fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink-blue)', textDecoration: 'none' },

  banner:     { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', background: 'var(--ink)', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', flexWrap: 'wrap' as const },
  bannerEyebrow:{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'rgba(251,249,243,0.5)', marginBottom: '0.15rem' },
  bannerText: { fontSize: '0.9375rem', color: 'var(--sheet)', lineHeight: 1.4 },
  bannerBtn:  { flexShrink: 0, padding: '0.5rem 1rem', background: 'var(--marker-lime)', color: 'var(--ink)', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none' },

  // Spine container
  spineContainer: { display: 'flex', flexDirection: 'column' },

  // Spine row (dot col + card)
  spineRow:   { display: 'flex', gap: '0', alignItems: 'stretch' },
  spineDotCol:{ width: SPINE_W, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' as const },

  // Connector row
  spineConnectorRow:{ display: 'flex', gap: '0', height: '44px' },
  connectorLineSegment:{
    width: 2, flex: 1, background: 'var(--stone)',
    cursor: 'pointer',
  },
  connectorTooltip:{
    position: 'absolute' as const,
    left: SPINE_W + 4,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'var(--ink)',
    color: 'var(--sheet)',
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '0.6875rem',
    whiteSpace: 'nowrap' as const,
    zIndex: 20,
    pointerEvents: 'none' as const,
  },

  // Card
  card: {
    flex: 1,
    background: 'var(--sheet)',
    border: '1px solid var(--stone-soft)',
    borderLeft: '4px solid var(--stone)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    marginBottom: 0,
  },
  cardHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', padding: '1.125rem 1.25rem 0', background: 'none', border: 'none', width: '100%', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' as const },
  cardHeaderLeft: { flex: 1, minWidth: 0 },
  cardHeaderRight:{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0, paddingTop: '0.2rem' },

  kicker:     { fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '0.3rem' },
  title:      { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.0625rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35, letterSpacing: '-0.01em' },
  titleQuestion:{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.0625rem', fontWeight: 400, color: 'var(--ink)', lineHeight: 1.45, letterSpacing: '-0.01em', fontStyle: 'italic' },

  badge:      { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.6875rem', fontWeight: 600, whiteSpace: 'nowrap' as const },
  lockBadge:  { fontSize: '0.75rem', color: 'var(--pencil)' },
  chevron:    { fontSize: '0.625rem', color: 'var(--pencil)', marginLeft: '0.25rem' },

  previewWrap:  { padding: '0.625rem 1.25rem 0' },
  previewStack: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  previewText:  { fontSize: '0.875rem', color: 'var(--graphite)', lineHeight: 1.55 },
  chainPreview: { fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' },
  viewAllHint:  { fontSize: '0.8125rem', color: 'var(--pencil)', fontStyle: 'italic' },

  // Derived-from breadcrumb
  derivedFrom:  { padding: '0.5rem 1.25rem 0', display: 'flex', alignItems: 'baseline', gap: '0.2rem', flexWrap: 'wrap' as const },
  derivedArrow: { fontSize: '0.75rem', color: 'var(--pencil)' },
  derivedLabel: { fontSize: '0.75rem', color: 'var(--pencil)', fontStyle: 'italic' },
  derivedValue: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--graphite)' },

  cardActions:  { display: 'flex', gap: '0.5rem', padding: '0.75rem 1.25rem 1.125rem', flexWrap: 'wrap' as const },
  actionBtnPrimary:{ padding: '0.3125rem 0.875rem', background: 'var(--ink-blue)', color: '#fff', border: '1px solid var(--ink-blue)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' },
  actionBtnSecondary:{ padding: '0.3125rem 0.875rem', background: 'var(--paper)', color: 'var(--graphite)', border: '1px solid var(--stone)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' },

  lockedReason: { fontSize: '0.8125rem', color: 'var(--pencil)', padding: '0.375rem 1.25rem 0', lineHeight: 1.5 },

  expandedWrap: { },
  expandSection:{ padding: '1.125rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' },

  // Chips
  chipRow:    { display: 'flex', gap: '0.375rem', flexWrap: 'wrap' as const },
  theoryChip: { padding: '2px 10px', border: '1px solid var(--stone)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)', background: 'var(--paper)' },
  conceptChip:{ padding: '1px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--mint)', color: 'var(--moss)', fontSize: '0.75rem', fontWeight: 600 },
  moreTag:    { padding: '1px 8px', fontSize: '0.75rem', color: 'var(--pencil)' },

  // Meta
  metaRow:    { display: 'flex', gap: '1.25rem 2rem', flexWrap: 'wrap' as const },
  metaLabel:  { fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--pencil)', marginBottom: '0.15rem' },
  metaValue:  { fontSize: '0.875rem', color: 'var(--graphite)', fontWeight: 500 },

  narrative:  { fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '0.9375rem', lineHeight: 1.75, color: 'var(--graphite)' },

  // Methodology chain
  chain:      { display: 'flex', flexDirection: 'column' },
  chainRow:   { display: 'flex', gap: '0.875rem' },
  chainDotCol:{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '0.3rem', flexShrink: 0, width: '16px' },
  chainDot:   { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  chainLine:  { width: '1px', flex: 1, background: 'var(--stone)', minHeight: '12px', margin: '3px 0' },
  chainContent:{ flex: 1, paddingBottom: '0.875rem' },
  chainLabel: { fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--pencil)', marginBottom: '0.15rem' },
  chainValue: { fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.2rem' },
  chainWhy:   { fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--graphite)' },

  // Questions
  questionPreviewRow:{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' },
  qNumSmall:  { flexShrink: 0, width: '18px', height: '18px', borderRadius: '50%', background: 'var(--paper-deep)', border: '1px solid var(--stone)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700, color: 'var(--pencil)', marginTop: '0.125rem' },
  questionRow:{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start', paddingBottom: '0.875rem', borderBottom: '1px solid var(--stone-soft)' },
  qNum:       { flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%', background: 'var(--paper)', border: '1px solid var(--stone)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--pencil)', marginTop: '0.15rem' },
  qBody:      { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  qText:      { fontSize: '0.9375rem', lineHeight: 1.55, color: 'var(--ink)' },
  qTags:      { display: 'flex', gap: '0.375rem', flexWrap: 'wrap' as const },
  conceptTag: { padding: '1px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--mint)', color: 'var(--moss)', fontSize: '0.75rem', fontWeight: 600 },
  theoryTag:  { padding: '1px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--paper-deep)', color: 'var(--pencil)', fontSize: '0.75rem', fontWeight: 500, border: '1px solid var(--stone-soft)' },
}
