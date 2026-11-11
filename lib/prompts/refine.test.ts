import { describe, expect, it, vi } from 'vitest'

// refine.ts imports the Claude client; parsing needs none of it.
vi.mock('@/lib/claude', () => ({ generateJSON: vi.fn() }))

import { parseRefined, refineSource } from './refine'

describe('parseRefined', () => {
  it('keeps the question and up to 3 changes', () => {
    const r = parseRefined(
      { refined_question: '  How do women who run small businesses in Bishkek decide? ', changes: ['a', 'b', 'c', 'd', 5, ''] },
      'src'
    )
    expect(r).toEqual({ question: 'How do women who run small businesses in Bishkek decide?', changes: ['a', 'b', 'c'], source: 'src' })
  })
  it('throws without a question, tolerates missing changes', () => {
    expect(() => parseRefined({ changes: ['a'] }, 's')).toThrow()
    expect(() => parseRefined(null, 's')).toThrow()
    expect(parseRefined({ refined_question: 'Q?' }, 's').changes).toEqual([])
  })
})

describe('refineSource', () => {
  it('ignores key order and note whitespace, changes with answers', () => {
    const a = refineSource({ q1: 'x', q3: ['a', 'b'] }, ' note ')
    expect(refineSource({ q3: ['a', 'b'], q1: 'x' }, 'note')).toBe(a)
    expect(refineSource({ q1: 'y', q3: ['a', 'b'] }, 'note')).not.toBe(a)
    expect(refineSource({ q1: 'x', q3: ['a'] }, 'note')).not.toBe(a)
  })
})
