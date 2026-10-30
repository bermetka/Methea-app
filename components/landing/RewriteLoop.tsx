/**
 * /start block 2: the research-question rewrite loop. A ring of six steps on
 * wide screens; under 560px a vertical list with a return arrow.
 */

const STEPS: { lines: string[]; feedback: boolean }[] = [
  { lines: ['Write a research', 'question'], feedback: false },
  { lines: ['“Too broad”'], feedback: true },
  { lines: ['Narrow it down'], feedback: false },
  { lines: ['“Not researchable”'], feedback: true },
  { lines: ['Add a theory'], feedback: false },
  { lines: ['“How does it shape', 'this?”'], feedback: true },
]

const NOTE = ['up to 8–9 rewrites,', '4–5 weeks']
const LABEL =
  'A loop: write a research question, hear “too broad”, narrow it down, hear “not researchable”, add a theory, hear “how does it shape this?”, and start again. Up to 8–9 rewrites, 4–5 weeks.'

const FONT = "'Schibsted Grotesk', 'Inter', system-ui, sans-serif"
const BOX_W = 164
const BOX_H = 52

function Step({ x, y, lines, feedback }: { x: number; y: number; lines: string[]; feedback: boolean }) {
  return (
    <g>
      <rect
        x={x - BOX_W / 2} y={y - BOX_H / 2} width={BOX_W} height={BOX_H} rx={10}
        style={{ fill: feedback ? 'var(--error-bg)' : 'var(--sheet)', stroke: feedback ? 'var(--error)' : 'var(--stone)', strokeWidth: 1.25 }}
      />
      <text textAnchor="middle" style={{ fill: feedback ? 'var(--error)' : 'var(--ink)', fontSize: 14, fontWeight: feedback ? 600 : 500 }}>
        {lines.map((line, i) => (
          <tspan key={line} x={x} y={y + 5 + (i - (lines.length - 1) / 2) * 17}>{line}</tspan>
        ))}
      </text>
    </g>
  )
}

function ArrowHead({ id }: { id: string }) {
  return (
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style={{ fill: 'var(--pencil)' }} />
    </marker>
  )
}

/** Where the line from box centre a towards b leaves box a, plus a small gap. */
function edge(a: [number, number], b: [number, number], gap = 8): [number, number] {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const t = Math.min(BOX_W / 2 / Math.abs(dx || 1e-9), BOX_H / 2 / Math.abs(dy || 1e-9))
  const len = Math.hypot(dx, dy)
  return [a[0] + dx * t + (dx / len) * gap, a[1] + dy * t + (dy / len) * gap]
}

function Ring() {
  const cx = 340, cy = 200
  const pts = STEPS.map((_, k): [number, number] => {
    const th = ((-90 + 60 * k) * Math.PI) / 180
    return [cx + 250 * Math.cos(th), cy + 150 * Math.sin(th)]
  })
  return (
    <svg viewBox="0 0 680 400" width="100%" role="img" aria-label={LABEL} style={{ fontFamily: FONT, display: 'block' }}>
      <defs><ArrowHead id="loop-arrow" /></defs>
      {pts.map((p, k) => {
        const q = pts[(k + 1) % pts.length]
        const [x1, y1] = edge(p, q)
        const [x2, y2] = edge(q, p)
        return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} markerEnd="url(#loop-arrow)" style={{ stroke: 'var(--pencil)', strokeWidth: 1.5 }} />
      })}
      {STEPS.map((step, k) => <Step key={k} x={pts[k][0]} y={pts[k][1]} {...step} />)}
      <text textAnchor="middle" style={{ fill: 'var(--ink-blue)', fontSize: 17, fontWeight: 600 }}>
        {NOTE.map((line, i) => <tspan key={line} x={cx} y={cy - 4 + i * 22}>{line}</tspan>)}
      </text>
    </svg>
  )
}

function List() {
  const x = 150, top = 36, step = 76
  const ys = STEPS.map((_, i) => top + i * step)
  const last = ys[ys.length - 1]
  const right = x + BOX_W / 2
  return (
    <svg viewBox="0 0 340 520" width="100%" role="img" aria-label={LABEL} style={{ fontFamily: FONT, display: 'block' }}>
      <defs><ArrowHead id="loop-arrow-m" /></defs>
      {ys.slice(0, -1).map((y, i) => (
        <line key={i} x1={x} y1={y + BOX_H / 2 + 4} x2={x} y2={ys[i + 1] - BOX_H / 2 - 4} markerEnd="url(#loop-arrow-m)" style={{ stroke: 'var(--pencil)', strokeWidth: 1.5 }} />
      ))}
      {/* Back to the start */}
      <path
        d={`M${right + 4},${last} H${right + 50} V${ys[0]} H${right + 6}`}
        fill="none" markerEnd="url(#loop-arrow-m)"
        style={{ stroke: 'var(--pencil)', strokeWidth: 1.5, strokeLinejoin: 'round' }}
      />
      {STEPS.map((s, i) => <Step key={i} x={x} y={ys[i]} {...s} />)}
      <text textAnchor="middle" style={{ fill: 'var(--ink-blue)', fontSize: 17, fontWeight: 600 }}>
        <tspan x={170} y={last + 70}>{NOTE.join(' ')}</tspan>
      </text>
    </svg>
  )
}

export default function RewriteLoop() {
  return (
    <div>
      <style>{`
        .rw-ring { display: block; max-width: 640px; }
        .rw-list { display: none; max-width: 340px; margin: 0 auto; }
        @media (max-width: 560px) { .rw-ring { display: none; } .rw-list { display: block; } }
      `}</style>
      <div className="rw-ring"><Ring /></div>
      <div className="rw-list"><List /></div>
    </div>
  )
}
