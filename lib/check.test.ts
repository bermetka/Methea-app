import { describe, expect, it } from 'vitest'
import { projectTitleFromCheck, sanitizeCheck } from './check'

describe('sanitizeCheck', () => {
  it('accepts a well-formed carry, from an object or a (URL-encoded) JSON string', () => {
    const c = { q: 'How do remote teams build trust?', path: 'program', stage: 'lens' }
    expect(sanitizeCheck(c)).toEqual(c)
    expect(sanitizeCheck(JSON.stringify(c))).toEqual(c)
    expect(sanitizeCheck(encodeURIComponent(JSON.stringify(c)))).toEqual(c)
  })
  it('rejects unknown paths and stages, and junk', () => {
    expect(sanitizeCheck({ q: 'x', path: 'admin', stage: 'lens' })).toBeNull()
    expect(sanitizeCheck({ q: 'x', path: 'program', stage: 'paid' })).toBeNull()
    expect(sanitizeCheck('not json')).toBeNull()
    expect(sanitizeCheck(null)).toBeNull()
  })
  it('cleans and caps the question; a missing question is an empty one', () => {
    const long = 'a '.repeat(500)
    expect(sanitizeCheck({ q: long, path: 'applicant', stage: 'who' })!.q.length).toBeLessThanOrEqual(600)
    expect(sanitizeCheck({ q: '  two\n\nlines\u0000 ', path: 'program', stage: 'none' })!.q).toBe('two lines')
    expect(sanitizeCheck({ path: 'program', stage: 'none' })!.q).toBe('')
  })
})

describe('projectTitleFromCheck', () => {
  it('uses their words, without the question mark', () => {
    expect(projectTitleFromCheck('How do remote teams build trust?')).toBe('How do remote teams build trust')
  })
  it('falls back for an empty idea and cuts long ones at a word', () => {
    expect(projectTitleFromCheck('  ')).toBe('My research project')
    const t = projectTitleFromCheck('How do women entrepreneurs in Central Asia test new business ideas before they launch a product')
    expect(t.endsWith('…')).toBe(true)
    expect(t.length).toBeLessThanOrEqual(81)
    expect(t).not.toMatch(/\s…$/)
  })
})
