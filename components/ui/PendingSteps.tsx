'use client'

import { useEffect, useState } from 'react'

/**
 * Button text while waiting on Claude: steps through what's happening, one
 * every `intervalMs`, and stays on the last one. Mount it only while pending,
 * so every wait starts again from the first step.
 */
export default function PendingSteps({ steps, intervalMs = 4000 }: { steps: string[]; intervalMs?: number }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (i >= steps.length - 1) return
    const t = setTimeout(() => setI(i + 1), intervalMs)
    return () => clearTimeout(t)
  }, [i, steps.length, intervalMs])
  return <span aria-live="polite">{steps[Math.min(i, steps.length - 1)]}</span>
}
