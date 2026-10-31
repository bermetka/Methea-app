import type { FrameworkEdge } from '@/types/database'
import type { DiagramTheory } from './FrameworkDiagram'

/**
 * The framework diagram for narrow screens: same theories and labelled
 * relationships as the SVG, as a vertical stack readable at phone width
 * (the 700px SVG scaled to ~350px makes labels ~5px and overlaps them).
 * Each theory is shown once, then each relationship as a sentence-like row.
 */
export default function FrameworkDiagramStack({ theories, edges, className }: {
  theories: DiagramTheory[]
  edges: FrameworkEdge[]
  className?: string
}) {
  const byId = new Map(theories.map(t => [t.id, t]))
  const links = edges.filter(e => byId.has(e.from) && byId.has(e.to))

  // Each theory appears once; relationships follow as readable rows
  // ("A — label → B"), so three theories don't turn into six boxes.
  return (
    <div className={className} style={s.wrap} role="img" aria-label="Research framework diagram">
      <div style={s.nodes}>
        {theories.map(t => <TheoryNode key={t.id} theory={t} />)}
      </div>
      {links.length > 0 && (
        <div style={s.rels}>
          <span style={s.relsHead}>How they connect</span>
          {links.map((edge, i) => (
            <div key={i} style={s.rel}>
              <span style={s.relName}>{byId.get(edge.from)!.name}</span>
              <span style={s.relLabel}>{edge.label ? `${edge.label} →` : '→'}</span>
              <span style={s.relName}>{byId.get(edge.to)!.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TheoryNode({ theory }: { theory: DiagramTheory }) {
  const meta = `${theory.author.split(/[,&]/)[0].trim()}${theory.year ? `, ${theory.year}` : ''}`
  return (
    <div style={s.node}>
      <span style={s.name}>{theory.name}</span>
      <span style={s.meta}>{meta}</span>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  wrap:  { flexDirection: 'column', gap: '1.25rem' },
  nodes: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  rels:  { display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--stone)', paddingTop: '0.75rem' },
  relsHead: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--pencil)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  rel:   { fontSize: '0.9375rem', lineHeight: 1.5, color: 'var(--ink)' },
  relName: { fontWeight: 600 },
  relLabel: { fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: 'italic', color: 'var(--graphite)', margin: '0 0.375rem' },
  node:  { display: 'flex', flexDirection: 'column', gap: '2px', padding: '0.625rem 0.875rem', background: '#FBF9F3', border: '1.5px solid #11425D', borderRadius: '8px', textAlign: 'center' },
  name:  { fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 },
  meta:  { fontSize: '0.8125rem', color: 'var(--graphite)' },
}
