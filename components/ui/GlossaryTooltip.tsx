'use client'

import { useState, useRef, useCallback } from 'react'
import type { GlossaryTerm } from '@/lib/glossary'

interface Props {
  term: GlossaryTerm
}

const POPOVER_WIDTH  = 280
const POPOVER_GAP    = 8   // px between trigger and popover edge
const EDGE_MARGIN    = 8   // min distance from viewport edges

interface Position {
  top?:    number
  bottom?: number  // distance from trigger bottom upward (for "above" placement)
  left:    number
}

export default function GlossaryTooltip({ term }: Props) {
  const [visible, setVisible]     = useState(false)
  const [pos, setPos]             = useState<Position>({ left: 0 })
  const [openAbove, setOpenAbove] = useState(false)
  const triggerRef  = useRef<HTMLButtonElement>(null)
  const hideTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const measure = useCallback(() => {
    const el = triggerRef.current
    if (!el) return

    const rect   = el.getBoundingClientRect()
    const vw     = window.innerWidth
    const vh     = window.innerHeight

    // ── Vertical: default below, flip above if no room ──────────────────────
    // Estimate popover height: title line (~20px) + gap + text (~120px) + padding (~24px)
    const estHeight = 180

    const spaceBelow = vh - rect.bottom - POPOVER_GAP
    const spaceAbove = rect.top - POPOVER_GAP

    // Open below unless it clips AND there's more room above
    const above = spaceBelow < estHeight && spaceAbove > spaceBelow

    // ── Horizontal: center on trigger, clamp to viewport ────────────────────
    const idealLeft = rect.left + rect.width / 2 - POPOVER_WIDTH / 2
    const clampedLeft = Math.min(
      Math.max(idealLeft, EDGE_MARGIN),
      vw - POPOVER_WIDTH - EDGE_MARGIN
    )

    setOpenAbove(above)
    setPos({ left: clampedLeft })
  }, [])

  function show() {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    measure()
    setVisible(true)
  }

  function hide() {
    hideTimer.current = setTimeout(() => setVisible(false), 120)
  }

  return (
    <span style={s.wrap}>
      <button
        ref={triggerRef}
        type="button"
        style={s.trigger}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={() => {
          if (visible) { setVisible(false) } else { show() }
        }}
        aria-label={`Explain: ${term.trigger}`}
        aria-expanded={visible}
      >
        ?
      </button>

      {visible && (
        <span
          role="tooltip"
          style={{
            ...s.popover,
            position: 'fixed',
            left: pos.left,
            ...(openAbove
              ? { bottom: window.innerHeight - (triggerRef.current?.getBoundingClientRect().top ?? 0) + POPOVER_GAP }
              : { top:    (triggerRef.current?.getBoundingClientRect().bottom ?? 0) + POPOVER_GAP }
            ),
          }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <span style={s.triggerLabel}>{term.trigger}</span>
          <span style={s.explain}>{term.shortExplain}</span>
        </span>
      )}
    </span>
  )
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    verticalAlign: 'middle',
    marginLeft: '3px',
  },
  trigger: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '15px',
    height: '15px',
    borderRadius: '50%',
    border: '1.5px solid var(--stone)',
    background: 'var(--paper-deep)',
    color: 'var(--pencil)',
    fontSize: '9px',
    fontWeight: 700,
    fontFamily: 'inherit',
    lineHeight: 1,
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
  },
  popover: {
    width: POPOVER_WIDTH,
    background: 'var(--sheet)',
    border: '1px solid var(--stone-soft)',
    borderRadius: 'var(--radius)',
    padding: '0.75rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
    zIndex: 9999,
  },
  triggerLabel: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    color: 'var(--pencil)',
    textTransform: 'uppercase' as const,
  },
  explain: {
    fontSize: '0.8125rem',
    lineHeight: 1.6,
    color: 'var(--graphite)',
  },
}
