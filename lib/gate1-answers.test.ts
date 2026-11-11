import { describe, expect, it } from 'vitest'
import { answerText, answerValues, formatGate1Answers, isAnswered } from './gate1-answers'
import type { ClarificationQuestion } from '@/types/database'

const q1: ClarificationQuestion = {
  id: 'q1', prompt: 'Which women do you mean?',
  options: [
    { value: 'running', title: 'Already run a business', description: '' },
    { value: 'starting', title: 'Deciding to start one', description: '' },
  ],
}
const q3: ClarificationQuestion = {
  id: 'q3', prompt: 'How can you reach them?', multi: true,
  options: [
    { value: 'in_person', title: 'In person in Bishkek', description: '' },
    { value: 'informant', title: 'Someone who can introduce me', description: '' },
    { value: 'data', title: 'Existing data', description: '' },
  ],
}

describe('answerValues / isAnswered', () => {
  it('reads old single answers, new lists and missing ones', () => {
    expect(answerValues('running')).toEqual(['running'])
    expect(answerValues(['in_person', 'data'])).toEqual(['in_person', 'data'])
    expect(answerValues(undefined)).toEqual([])
    expect(answerValues('')).toEqual([])
    expect(answerValues([])).toEqual([])
    expect(isAnswered(['x'])).toBe(true)
    expect(isAnswered([])).toBe(false)
  })
})

describe('answerText', () => {
  it('shows option titles, joined for multi answers', () => {
    expect(answerText(q1, 'running')).toBe('Already run a business')
    expect(answerText(q3, ['in_person', 'informant'])).toBe('In person in Bishkek; Someone who can introduce me')
  })
  it('falls back to the raw value, and a dash when unanswered', () => {
    expect(answerText(q1, 'unknown_value')).toBe('unknown_value')
    expect(answerText(undefined, 'x')).toBe('x')
    expect(answerText(q3, [])).toBe('—')
  })
})

describe('formatGate1Answers', () => {
  it('writes one line per answered question, in question order', () => {
    const text = formatGate1Answers([q1, q3], { q3: ['data'], q1: 'starting' })
    expect(text).toBe('- Which women do you mean? — Deciding to start one\n- How can you reach them? — Existing data')
  })
  it('works for old projects without stored questions', () => {
    expect(formatGate1Answers(undefined, { q1: 'running' })).toBe('- q1 — running')
    expect(formatGate1Answers([q1], undefined)).toBe('')
  })
})
