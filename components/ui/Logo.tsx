import { LOGO_ASPECT, LOGO_STROKE_TRANSFORM, LOGO_VIEWBOX, LOGO_WORD_PATH } from './logo-paths'

// The approved Methea logo (16.11.2026) as one inline SVG: the word is drawn as
// outlines, so it never depends on a web font loading and never shifts. The lime
// marker stroke keeps its colour on every background; only the word changes tone.
interface Props {
  size?: 'xs' | 'sm' | 'md'
  /** 'ink' on paper backgrounds, 'paper' on dark ones (footers) */
  tone?: 'ink' | 'paper'
}

const heights = { xs: 18, sm: 24, md: 38 }

export default function Logo({ size = 'sm', tone = 'ink' }: Props) {
  const h = heights[size]
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      height={h}
      width={Math.round(h * LOGO_ASPECT)}
      role="img"
      aria-label="Methea"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <g transform={LOGO_STROKE_TRANSFORM}>
        <path d="M8 44 Q4 40 10 36 L478 4 Q492 3 494 12 L498 30 Q499 40 486 42 L24 56 Q10 57 8 44 Z" fill="#DDFF55" fillOpacity="0.92" />
        <path d="M30 40 L460 12 L462 24 L36 50 Z" fill="#DDFF55" fillOpacity="0.5" />
      </g>
      <path d={LOGO_WORD_PATH} fill={tone === 'paper' ? '#F6F2E8' : '#1C1C1C'} />
    </svg>
  )
}
