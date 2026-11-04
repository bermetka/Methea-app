import { describe, expect, it } from 'vitest'
import { inline, renderMarkdown, slugify } from './markdown'

describe('inline', () => {
  it('escapes HTML before markup', () => {
    expect(inline('<script>a & b</script>')).toBe('&lt;script&gt;a &amp; b&lt;/script&gt;')
  })
  it('bold, italic, code, links', () => {
    expect(inline('**a** and *b* and `c*d*`')).toBe('<strong>a</strong> and <em>b</em> and <code>c*d*</code>')
    expect(inline('[x](https://example.org)')).toBe('<a href="https://example.org" target="_blank" rel="noopener">x</a>')
    expect(inline('[x](/start?a=lens)')).toBe('<a href="/start?a=lens">x</a>')
    expect(inline('[x](https://www.methea.app/start)')).toBe('<a href="https://www.methea.app/start">x</a>')
  })
  it('does not treat a lone asterisk as italic', () => {
    expect(inline('2 * 3 = 6')).toBe('2 * 3 = 6')
  })
})

describe('renderMarkdown', () => {
  it('headings get ids and are collected', () => {
    const { html, headings } = renderMarkdown('## The lens\n\ntext\n\n### Sub part')
    expect(html).toContain('<h2 id="the-lens">The lens</h2>')
    expect(headings).toEqual([
      { id: 'the-lens', text: 'The lens', level: 2 },
      { id: 'sub-part', text: 'Sub part', level: 3 },
    ])
  })
  it('paragraph lines join; lists and tables render', () => {
    const md = 'one\ntwo\n\n- a\n- b\n\n1. x\n2. y\n\n| | A |\n|---|---|\n| row | v |'
    const { html } = renderMarkdown(md)
    expect(html).toContain('<p>one two</p>')
    expect(html).toContain('<ul><li>a</li><li>b</li></ul>')
    expect(html).toContain('<ol><li>x</li><li>y</li></ol>')
    expect(html).toContain('<th scope="row">row</th><td>v</td>')
  })
  it('blockquote and rule', () => {
    const { html } = renderMarkdown('> quoted\n> more\n\n---')
    expect(html).toBe('<blockquote><p>quoted more</p></blockquote>\n<hr />')
  })
  it('slugify', () => {
    expect(slugify('Do I need all four?')).toBe('do-i-need-all-four')
  })
})
