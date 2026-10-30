/**
 * /start block 4 (main visual): a loose chain that breaks between concepts and
 * method, next to an aligned chain. Two rows on wide screens; under 560px two
 * columns side by side with the links stacked.
 */

const LINKS = [['Question'], ['Theoretical', 'lens'], ['Concepts'], ['Method'], ['Interview Qs'], ['Analysis']]
const BREAK_AFTER = 2 // the gap between Concepts and Method

const LOOSE_TITLE = 'Loose chain: each part looks fine on its own'
const ALIGNED_TITLE = 'Aligned chain: each link follows from the one before'
const BREAK_LABEL = 'breaks here: why interviews?'
const LABEL =
  'Two chains of six links: question, theoretical lens, concepts, method, interview questions, analysis. In the loose chain the link between concepts and method is broken (why interviews?), so method, interview questions and analysis are off. In the aligned chain every link follows from the one before.'

const FONT = "'Schibsted Grotesk', 'Inter', system-ui, sans-serif"

type Tone = 'plain' | 'broken' | 'aligned'
const TONES: Record<Tone, { fill: string; stroke: string; text: string; arrow: string }> = {
  plain:   { fill: 'var(--sheet)',    stroke: 'var(--stone)', text: 'var(--ink)',   arrow: 'var(--pencil)' },
  broken:  { fill: 'var(--error-bg)', stroke: 'var(--error)', text: 'var(--error)', arrow: 'var(--error)' },
  aligned: { fill: 'var(--mint)',     stroke: 'var(--moss)',  text: 'var(--moss)',  arrow: 'var(--moss)' },
}

function Link({ x, y, w, h, lines, tone }: { x: number; y: number; w: number; h: number; lines: string[]; tone: Tone }) {
  const t = TONES[tone]
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={9} style={{ fill: t.fill, stroke: t.stroke, strokeWidth: 1.25 }} />
      <text textAnchor="middle" style={{ fill: t.text, fontSize: 13.5, fontWeight: 600 }}>
        {lines.map((line, i) => (
          <tspan key={line} x={x + w / 2} y={y + h / 2 + 5 + (i - (lines.length - 1) / 2) * 16}>{line}</tspan>
        ))}
      </text>
    </g>
  )
}

function Markers({ prefix }: { prefix: string }) {
  return (
    <defs>
      {(['plain', 'broken', 'aligned'] as Tone[]).map(tone => (
        <marker key={tone} id={`${prefix}-${tone}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" style={{ fill: TONES[tone].arrow }} />
        </marker>
      ))}
    </defs>
  )
}

const looseTone = (i: number): Tone => (i > BREAK_AFTER ? 'broken' : 'plain')

function Rows() {
  const w = 96, h = 54, gap = 20, breakGap = 40, x0 = 10
  const xs = LINKS.map((_, i) => x0 + i * (w + gap) + (i > BREAK_AFTER ? breakGap - gap : 0))
  const row = (y: number, aligned: boolean) =>
    LINKS.map((lines, i) => {
      const tone: Tone = aligned ? 'aligned' : looseTone(i)
      const next = i + 1 < LINKS.length
      const broken = !aligned && i === BREAK_AFTER
      const arrowTone: Tone = aligned ? 'aligned' : looseTone(i + 1)
      return (
        <g key={i}>
          <Link x={xs[i]} y={y} w={w} h={h} lines={lines} tone={tone} />
          {next && (broken
            ? <line x1={xs[i] + w + 2} y1={y + h / 2} x2={xs[i + 1] - 2} y2={y + h / 2} strokeDasharray="3 4" style={{ stroke: 'var(--error)', strokeWidth: 2 }} />
            : <line x1={xs[i] + w + 3} y1={y + h / 2} x2={xs[i + 1] - 3} y2={y + h / 2} markerEnd={`url(#ch-${arrowTone})`} style={{ stroke: TONES[arrowTone].arrow, strokeWidth: 1.5 }} />)}
        </g>
      )
    })
  const gapX = xs[BREAK_AFTER] + w + breakGap / 2
  return (
    <svg viewBox="0 0 720 250" width="100%" role="img" aria-label={LABEL} style={{ fontFamily: FONT, display: 'block' }}>
      <Markers prefix="ch" />
      <text x={x0} y={18} style={{ fill: 'var(--ink)', fontSize: 15, fontWeight: 600 }}>{LOOSE_TITLE}</text>
      {row(32, false)}
      <text x={gapX} y={32 + h + 22} textAnchor="middle" style={{ fill: 'var(--error)', fontSize: 13.5, fontWeight: 600 }}>{BREAK_LABEL}</text>
      <text x={x0} y={150} style={{ fill: 'var(--moss)', fontSize: 15, fontWeight: 600 }}>{ALIGNED_TITLE}</text>
      {row(164, true)}
    </svg>
  )
}

function Columns() {
  const w = 148, h = 46, gap = 24, breakGap = 58, top = 72
  const cols = [10, 182]
  const ys: number[] = []
  LINKS.forEach((_, i) => ys.push(i === 0 ? top : ys[i - 1] + h + (i - 1 === BREAK_AFTER ? breakGap : gap)))
  const column = (x: number, aligned: boolean) =>
    LINKS.map((lines, i) => {
      const next = i + 1 < LINKS.length
      const broken = !aligned && i === BREAK_AFTER
      const arrowTone: Tone = aligned ? 'aligned' : looseTone(i + 1)
      const cx = x + w / 2
      return (
        <g key={i}>
          <Link x={x} y={ys[i]} w={w} h={h} lines={[lines.join(' ')]} tone={aligned ? 'aligned' : looseTone(i)} />
          {next && (broken
            ? <>
                <line x1={x + 14} y1={ys[i] + h + 2} x2={x + 14} y2={ys[i + 1] - 2} strokeDasharray="3 4" style={{ stroke: 'var(--error)', strokeWidth: 2 }} />
                <text style={{ fill: 'var(--error)', fontSize: 12.5, fontWeight: 600 }}>
                  <tspan x={x + 24} y={ys[i] + h + 25}>breaks here:</tspan>
                  <tspan x={x + 24} y={ys[i] + h + 41}>why interviews?</tspan>
                </text>
              </>
            : <line x1={cx} y1={ys[i] + h + 3} x2={cx} y2={ys[i + 1] - 3} markerEnd={`url(#chm-${arrowTone})`} style={{ stroke: TONES[arrowTone].arrow, strokeWidth: 1.5 }} />)}
        </g>
      )
    })
  const title = (x: number, lines: string[], color: string) => (
    <text style={{ fill: color, fontSize: 13, fontWeight: 600 }}>
      {lines.map((line, i) => <tspan key={line} x={x} y={16 + i * 16}>{line}</tspan>)}
    </text>
  )
  return (
    <svg viewBox={`0 0 340 ${ys[ys.length - 1] + h + 10}`} width="100%" role="img" aria-label={LABEL} style={{ fontFamily: FONT, display: 'block' }}>
      <Markers prefix="chm" />
      {title(cols[0], ['Loose chain:', 'each part looks', 'fine on its own'], 'var(--ink)')}
      {title(cols[1], ['Aligned chain:', 'each link follows', 'from the one before'], 'var(--moss)')}
      {column(cols[0], false)}
      {column(cols[1], true)}
    </svg>
  )
}

export default function ChainDiagram() {
  return (
    <div>
      <style>{`
        .ch-rows { display: block; }
        .ch-cols { display: none; max-width: 360px; margin: 0 auto; }
        @media (max-width: 560px) { .ch-rows { display: none; } .ch-cols { display: block; } }
      `}</style>
      <div className="ch-rows"><Rows /></div>
      <div className="ch-cols"><Columns /></div>
    </div>
  )
}
