import { describe, expect, it } from 'vitest'
import { teaser } from './teaser'

const text = 'This study draws on Social Exchange Theory (Blau, 1964) to explain trust in remote teams. It proposes that remote work reduces informal exchanges. Cropanzano et al. (2005) show how reciprocity works at work. A fourth sentence that must stay locked. A fifth one too.'

describe('teaser', () => {
  it('keeps whole sentences only, up to the limit', () => {
    const t = teaser(text)
    expect(t).toBe('This study draws on Social Exchange Theory (Blau, 1964) to explain trust in remote teams. It proposes that remote work reduces informal exchanges. Cropanzano et al. (2005) show how reciprocity works at work.')
    expect(t).not.toContain('fourth')
  })
  it('stops early when the next sentence would run past maxChars', () => {
    expect(teaser(text, { maxChars: 120 })).toBe('This study draws on Social Exchange Theory (Blau, 1964) to explain trust in remote teams.')
  })
  it('cuts one very long first sentence at a word', () => {
    const t = teaser('word '.repeat(200), { maxChars: 50 })
    expect(t.length).toBeLessThanOrEqual(51)
    expect(t.endsWith('…')).toBe(true)
  })
  it('empty in, empty out', () => {
    expect(teaser('   ')).toBe('')
  })
})
