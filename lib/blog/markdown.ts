// Minimal Markdown → HTML for blog posts in content/blog/*.md.
// Deliberately small (no dependency): ## / ### headings, paragraphs, - and 1. lists,
// GFM pipe tables, > blockquotes, --- rules; inline **bold**, *italic*, `code`, [links](url).
// Input is our own repo content, but text is still HTML-escaped before inline markup.

export type Heading = { id: string; text: string; level: 2 | 3 }

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function inline(raw: string): string {
  const codes: string[] = []
  let s = escapeHtml(raw).replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) => {
    const external = /^https?:\/\//.test(href) && !/^https:\/\/(www\.)?methea\.app/.test(href)
    const attrs = external ? ' target="_blank" rel="noopener"' : ''
    return `<a href="${href}"${attrs}>${text}</a>`
  })
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>')
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`)
}

function cells(row: string): string[] {
  return row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
}

export function renderMarkdown(md: string): { html: string; headings: Heading[] } {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  const headings: Heading[] = []
  let i = 0

  const isBlank = (l: string | undefined) => l === undefined || l.trim() === ''
  const startsBlock = (l: string) =>
    /^#{2,3}\s/.test(l) || /^\|/.test(l) || /^(-|\d+\.)\s/.test(l) || /^>\s?/.test(l) || /^---\s*$/.test(l)

  while (i < lines.length) {
    const line = lines[i]
    if (isBlank(line)) { i++; continue }

    const h = /^(#{2,3})\s+(.*)$/.exec(line)
    if (h) {
      const level = h[1].length as 2 | 3
      const text = h[2].trim()
      const id = slugify(text)
      headings.push({ id, text, level })
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`)
      i++; continue
    }

    if (/^---\s*$/.test(line)) { out.push('<hr />'); i++; continue }

    if (/^\|/.test(line) && /^\|?\s*:?-{2,}/.test(lines[i + 1] ?? '')) {
      const head = cells(line)
      i += 2
      const body: string[][] = []
      while (i < lines.length && /^\|/.test(lines[i])) body.push(cells(lines[i++]))
      out.push(
        '<div class="table-wrap"><table><thead><tr>' +
          head.map(c => `<th>${inline(c)}</th>`).join('') +
          '</tr></thead><tbody>' +
          body.map(r => '<tr>' + r.map((c, j) => (j === 0 && head[0] === '' ? `<th scope="row">${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join('') + '</tr>').join('') +
          '</tbody></table></div>'
      )
      continue
    }

    const list = /^(-|\d+\.)\s/.exec(line)
    if (list) {
      const ordered = list[1] !== '-'
      const items: string[] = []
      while (i < lines.length && /^(-|\d+\.)\s/.test(lines[i])) {
        let item = lines[i].replace(/^(-|\d+\.)\s+/, '')
        i++
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) item += ' ' + lines[i++].trim()
        items.push(`<li>${inline(item)}</li>`)
      }
      const tag = ordered ? 'ol' : 'ul'
      out.push(`<${tag}>${items.join('')}</${tag}>`)
      continue
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ''))
      out.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`)
      continue
    }

    const para: string[] = []
    while (i < lines.length && !isBlank(lines[i]) && !(para.length && startsBlock(lines[i]))) para.push(lines[i++].trim())
    out.push(`<p>${inline(para.join(' '))}</p>`)
  }

  return { html: out.join('\n'), headings }
}
