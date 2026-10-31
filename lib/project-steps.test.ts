import { describe, it, expect } from 'vitest'
import { projectSteps, currentStepIndex, isStepReachable, stepFromPath } from './project-steps'
import type { ResearchContext } from '@/types/database'

const ctx = (c: Partial<ResearchContext>) => c as ResearchContext

describe('projectSteps', () => {
  it('marks nothing done for an empty project', () => {
    const steps = projectSteps(null, 'p1')
    expect(steps.map(s => s.done)).toEqual([false, false, false, false, false, false, false, false])
    expect(steps[0].href).toBe('/project/p1/brief')
    expect(currentStepIndex(steps)).toBe(0)
  })

  it('finds the first unfinished step', () => {
    const steps = projectSteps(ctx({
      brief: {} as ResearchContext['brief'],
      socratic_gate_1: { completed: true } as ResearchContext['socratic_gate_1'],
    }), 'p1')
    expect(currentStepIndex(steps)).toBe(2)
    expect(steps[2].key).toBe('theories')
  })

  it('reaches done steps and the current one, never later ones', () => {
    const steps = projectSteps(ctx({ brief: {} as ResearchContext['brief'] }), 'p1')
    expect(isStepReachable(steps, 0)).toBe(true)
    expect(isStepReachable(steps, 1)).toBe(true)
    expect(isStepReachable(steps, 2)).toBe(false)
    expect(isStepReachable(steps, -1)).toBe(false)
  })
})

describe('stepFromPath', () => {
  it('recognises steps, the workspace and other pages', () => {
    expect(stepFromPath('/project/p1', 'p1')).toBe('workspace')
    expect(stepFromPath('/project/p1/theories', 'p1')).toBe('theories')
    expect(stepFromPath('/project/p1/interview-guide/edit', 'p1')).toBe('interview-guide')
    expect(stepFromPath('/project/p1/export', 'p1')).toBeNull()
    expect(stepFromPath('/projects', 'p1')).toBeNull()
  })
})
