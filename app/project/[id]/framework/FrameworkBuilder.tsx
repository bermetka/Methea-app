'use client'

import { useRef, useState } from 'react'
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx'
import FrameworkDiagram, { type DiagramTheory } from '@/components/ui/FrameworkDiagram'
import { saveFramework } from './actions'
import type { FrameworkEdge, FrameworkCitation } from '@/types/database'

type Layout = 'hierarchy' | 'hub-and-spoke' | 'linear'
type CitStatus = 'doi_verified' | 'classic_verified' | 'unverified'

interface Props {
  projectId: string
  theories: DiagramTheory[]
  edges: FrameworkEdge[]
  narrative: string
  citations: FrameworkCitation[]
  citationStatuses: Record<string, CitStatus>
  defaultLayout: Layout
}

const LAYOUT_LABELS: Record<Layout, string> = {
  'hub-and-spoke': 'Hub & spoke',
  hierarchy: 'Hierarchy',
  linear: 'Linear',
}

export default function FrameworkBuilder({
  projectId, theories, edges, narrative, citations, citationStatuses, defaultLayout,
}: Props) {
  const [layout, setLayout] = useState<Layout>(defaultLayout)
  const [saving, setSaving] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  async function handleSave() {
    setSaving(true)
    const fd = new FormData()
    fd.append('projectId', projectId)
    fd.append('layout', layout)
    fd.append('edges', JSON.stringify(edges))
    fd.append('narrative', narrative)
    fd.append('citations', JSON.stringify(citations))
    fd.append('citationStatuses', JSON.stringify(citationStatuses))
    await saveFramework(fd)
  }

  async function handleExportWord() {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: 'Theoretical Framework', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            children: [new TextRun({ text: narrative, size: 24 })],
            spacing: { after: 200 },
          }),
          new Paragraph({ text: 'References', heading: HeadingLevel.HEADING_2 }),
          ...citations.map(c =>
            new Paragraph({
              children: [
                new TextRun({
                  text: `${c.author} (${c.year}). ${c.title}.${c.doi ? ` https://doi.org/${c.doi}` : ''}`,
                  size: 22,
                }),
              ],
              spacing: { after: 120 },
            })
          ),
        ],
      }],
    })
    const blob = await Packer.toBlob(doc)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'methea-framework.docx'
    a.click()
  }

  function handleExportPNG() {
    const svg = svgRef.current
    if (!svg) return
    const xml = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([xml], { type: 'image/svg+xml' })
    const url  = URL.createObjectURL(blob)
    const img  = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = 1400
      canvas.height = 760
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#F6F2E8'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, 1400, 760)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob2 => {
        if (!blob2) return
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob2)
        a.download = 'methea-framework.png'
        a.click()
      }, 'image/png')
    }
    img.src = url
  }

  return (
    <div style={s.wrapper}>
      {/* Layout switcher */}
      <div style={s.layoutRow}>
        <span style={s.layoutLabel}>Layout</span>
        <div style={s.layoutBtns}>
          {(Object.keys(LAYOUT_LABELS) as Layout[]).map(l => (
            <button
              key={l}
              type="button"
              onClick={() => setLayout(l)}
              style={{ ...s.layoutBtn, ...(layout === l ? s.layoutBtnActive : {}) }}
            >
              {LAYOUT_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      {/* Diagram */}
      <div style={s.diagramWrap}>
        <FrameworkDiagram
          theories={theories}
          edges={edges}
          layout={layout}
          svgRef={svgRef}
        />
      </div>

      {/* Narrative */}
      <div style={s.narrativeCard}>
        <p style={s.narrativeLabel}>Framework narrative</p>
        <p style={s.narrativeText}>{narrative}</p>
        <div style={s.citationChips}>
          {citations.map((c, i) => {
            const key    = `${c.author}, ${c.year}`
            const status = citationStatuses[key] ?? 'unverified'
            const verified = status !== 'unverified'
            return (
              <span
                key={i}
                title={c.doi ? `DOI: ${c.doi}` : 'No DOI found'}
                style={{
                  ...s.citationChip,
                  background: verified ? 'var(--mint)'       : 'var(--paper-deep)',
                  color:      verified ? 'var(--moss)'       : 'var(--pencil)',
                  border:     `1px solid ${verified ? 'var(--marker-green)' : 'var(--stone)'}`,
                }}
              >
                {verified ? '✓' : '?'} {c.author}, {c.year}
              </span>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div style={s.actions}>
        <button type="button" onClick={handleExportPNG} style={s.secondaryBtn}>
          Export PNG
        </button>
        <button type="button" onClick={handleExportWord} style={s.secondaryBtn}>
          Export Word
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{ ...s.primaryBtn, ...(saving ? s.primaryBtnDisabled : {}) }}
        >
          {saving ? 'Saving…' : 'Save framework →'}
        </button>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  wrapper:            { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  layoutRow:          { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' as const },
  layoutLabel:        { fontSize: '0.8125rem', fontWeight: 600, color: 'var(--pencil)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  layoutBtns:         { display: 'flex', gap: '0.375rem' },
  layoutBtn:          { padding: '4px 12px', border: '1px solid var(--stone)', borderRadius: 'var(--radius-sm)', background: 'var(--sheet)', color: 'var(--graphite)', fontSize: '0.8125rem', fontFamily: 'inherit', cursor: 'pointer' },
  layoutBtnActive:    { background: 'var(--ink-blue)', color: 'var(--sheet)', borderColor: 'var(--ink-blue)' },
  diagramWrap:        { background: 'var(--paper)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', padding: '1rem', overflow: 'hidden' },
  narrativeCard:      { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  narrativeLabel:     { fontSize: '0.75rem', fontWeight: 600, color: 'var(--pencil)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  narrativeText:      { fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--graphite)' },
  citationChips:      { display: 'flex', flexWrap: 'wrap' as const, gap: '0.375rem' },
  citationChip:       { padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 500 },
  actions:            { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' },
  secondaryBtn:       { padding: '0.625rem 1.25rem', border: '1px solid var(--stone)', borderRadius: 'var(--radius)', background: 'var(--sheet)', color: 'var(--graphite)', fontSize: '0.875rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' },
  primaryBtn:         { padding: '0.75rem 1.5rem', background: 'var(--ink-blue)', color: 'var(--sheet)', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.9375rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' },
  primaryBtnDisabled: { background: 'var(--paper-deep)', color: 'var(--pencil)', cursor: 'default' },
}
