import type { FrameworkEdge } from '@/types/database'
import type { DiagramTheory } from './FrameworkDiagram'

/**
 * The framework diagram for narrow screens: same theories and labelled
 * relationships as the SVG, as a vertical stack readable at phone width
 * (the 700px SVG scaled to ~350px makes labels ~5px and overlaps them).
 * Each relationship reads top to bottom: theory → label → theory. Theories
 * with no relationship are listed on their own.
 */
export default function FrameworkDiagramStack({ theories, edges, className }: {
  theories: DiagramTheory[]
  edges: FrameworkEdge[]
  className?: string
}) {
  const byId = new Map(theories.map(t => [t.id, t]))
  const links = edges.filter(e => byId.has(e.from) && byId.has(e.to))
  const linked = new Set(links.flatMap(e => [e.from, e.to]))
  const unlinked = theories.filter(t => !linked.has(t.id))

  return (
    <div className={className} style={s.wrap} role="img" aria-label="Research framework diagram">
      {links.map((edge, i) => (
        <div key={i} style={s.chain}>
          <TheoryNode theory={byId.get(edge.from)!} />
          <div style={s.link}>
            <span style={s.arrow} aria-hidden>↓</span>
            {edge.label && <span style={s.label}>{edge.label}</span>}
          </div>
          <TheoryNode theory={byId.get(edge.to)!} />
        </div>
      ))}
      {unlinked.map(t => <TheoryNode key={t.id} theory={t} />)}
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
  chain: { display: 'flex', flexDirection: 'column', alignItems: 'stretch' },
  node:  { display: 'flex', flexDirection: 'column', gap: '2px', padding: '0.625rem 0.875rem', background: '#FBF9F3', border: '1.5px solid #11425D', borderRadius: '8px', textAlign: 'center' },
  name:  { fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 },
  meta:  { fontSize: '0.8125rem', color: 'var(--graphite)' },
  link:  { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.25rem 0.5rem' },
  arrow: { fontSize: '1.125rem', lineHeight: 1, color: 'var(--stone)' },
  label: { fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: 'italic', fontSize: '0.9375rem', lineHeight: 1.4, color: 'var(--graphite)', textAlign: 'center' },
}
