'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { currentStepIndex, isStepReachable, stepFromPath, type ProjectStep } from '@/lib/project-steps'

interface Props {
  projectId: string
  steps: ProjectStep[]
}

/**
 * The plan's steps. Done steps and the current one open; a later step shows
 * why it is not ready yet instead of jumping ahead (the wizard stays linear:
 * each step is built from the ones before it).
 */
export default function StepNav({ projectId, steps }: Props) {
  const pathname = usePathname() ?? ''
  const here = stepFromPath(pathname, projectId)
  const current = currentStepIndex(steps)
  const [blocked, setBlocked] = useState<number | null>(null)
  const next = steps[current]

  return (
    <div style={s.wrap}>
      <nav aria-label="Plan steps" style={s.row}>
        {steps.map((step, i) => {
          const reachable = isStepReachable(steps, i)
          const isHere = here === step.key
          const label = `${step.done ? '✓ ' : ''}${step.label}`
          if (!reachable) {
            return (
              <button
                key={step.key}
                type="button"
                aria-disabled="true"
                onClick={() => setBlocked(blocked === i ? null : i)}
                style={{ ...s.chip, ...s.locked }}
              >
                {label}
              </button>
            )
          }
          return (
            <a
              key={step.key}
              href={step.href}
              aria-current={isHere ? 'step' : undefined}
              style={{ ...s.chip, ...(isHere ? s.here : step.done ? s.done : s.current) }}
            >
              {label}
            </a>
          )
        })}
      </nav>
      {blocked !== null && next && (
        <p role="status" style={s.notice}>
          <b>{steps[blocked].label}</b> isn&apos;t ready yet: Methea builds it from the steps before it.{' '}
          <a href={next.href} style={s.noticeLink}>Continue with {next.label} →</a>
        </p>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  wrap:       { display: 'flex', flexDirection: 'column', gap: 8 },
  row:        { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip:       { fontSize: '0.8125rem', padding: '4px 10px', borderRadius: 999, border: '1px solid transparent', background: 'transparent', font: 'inherit', lineHeight: 1.5, cursor: 'pointer', textDecoration: 'none' },
  done:       { color: 'var(--graphite)' },
  current:    { color: 'var(--ink)', borderColor: 'var(--ink)', fontWeight: 600 },
  here:       { background: 'var(--ink)', color: 'var(--paper)', fontWeight: 600 },
  locked:     { color: 'var(--pencil)', cursor: 'not-allowed' },
  notice:     { margin: 0, fontSize: '0.8125rem', color: 'var(--graphite)', background: 'var(--paper-deep)', borderRadius: 8, padding: '8px 12px' },
  noticeLink: { fontWeight: 600 },
}
