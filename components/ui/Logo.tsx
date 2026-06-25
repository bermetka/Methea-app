interface Props {
  size?: 'sm' | 'md'
}

const sizes = {
  sm: { fontSize: '1.25rem', swipeH: 13, swipeBottom: 8  },
  md: { fontSize: '2rem',    swipeH: 20, swipeBottom: 12 },
}

export default function Logo({ size = 'sm' }: Props) {
  const { fontSize, swipeH, swipeBottom } = sizes[size]
  return (
    <div style={{ position: 'relative', display: 'inline-block', lineHeight: 1 }}>
      <svg
        viewBox="0 0 500 58"
        width="107%"
        height={swipeH}
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-3.5%',
          bottom: swipeBottom,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        <path
          d="M8 44 Q4 40 10 36 L478 4 Q492 3 494 12 L498 30 Q499 40 486 42 L24 56 Q10 57 8 44 Z"
          fill="#DDFF55"
          opacity="0.92"
        />
        <path d="M30 40 L460 12 L462 24 L36 50 Z" fill="#DDFF55" opacity="0.5" />
      </svg>
      <span
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize,
          fontWeight: 400,
          letterSpacing: '-0.045em',
          color: 'var(--ink)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        Methea
      </span>
    </div>
  )
}
