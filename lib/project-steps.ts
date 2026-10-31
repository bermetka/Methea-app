import type { ResearchContext } from '@/types/database'

export type StepKey =
  | 'brief'
  | 'gate1'
  | 'theories'
  | 'framework'
  | 'methodology'
  | 'interview-guide'
  | 'analysis'

export interface ProjectStep {
  key: StepKey
  label: string
  href: string
  done: boolean
}

type Ctx = ResearchContext | null | undefined

// The wizard order. Each step builds on the one before it, so a step is
// reachable only once every earlier step is done (the "current" step is the
// first one not done yet).
const STEPS: { key: StepKey; label: string; done: (c: Ctx) => boolean }[] = [
  { key: 'brief',           label: 'Brief',           done: c => !!c?.brief },
  { key: 'gate1',           label: 'Question',        done: c => !!c?.socratic_gate_1?.completed },
  { key: 'theories',        label: 'Theories',        done: c => !!c?.theories?.selected_ids?.length },
  { key: 'framework',       label: 'Framework',       done: c => !!c?.framework?.edges?.length },
  { key: 'methodology',     label: 'Methodology',     done: c => !!c?.methodology?.narrative },
  { key: 'interview-guide', label: 'Interview guide', done: c => !!c?.interview_guide?.questions?.length },
  { key: 'analysis',        label: 'Analysis',        done: c => !!c?.findings?.gate3_completed },
]

export function projectSteps(ctx: Ctx, projectId: string): ProjectStep[] {
  return STEPS.map(s => ({
    key: s.key,
    label: s.label,
    href: `/project/${projectId}/${s.key}`,
    done: s.done(ctx),
  }))
}

/** Index of the first step not done yet; steps.length when all are done. */
export function currentStepIndex(steps: ProjectStep[]): number {
  const i = steps.findIndex(s => !s.done)
  return i === -1 ? steps.length : i
}

/** Done steps and the current one can be opened; later ones cannot. */
export function isStepReachable(steps: ProjectStep[], index: number): boolean {
  return index >= 0 && index <= currentStepIndex(steps)
}

/** Which step a pathname belongs to: a step key, 'workspace' for /project/:id, or null. */
export function stepFromPath(pathname: string, projectId: string): StepKey | 'workspace' | null {
  const base = `/project/${projectId}`
  if (pathname === base || pathname === `${base}/`) return 'workspace'
  if (!pathname.startsWith(`${base}/`)) return null
  const segment = pathname.slice(base.length + 1).split('/')[0]
  return (STEPS.find(s => s.key === segment)?.key) ?? null
}
