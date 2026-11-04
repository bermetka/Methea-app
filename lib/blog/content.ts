import { readFileSync } from 'node:fs'
import path from 'node:path'
import { renderMarkdown } from './markdown'

// Read at build time (pages are statically generated). Everything from
// "## References" on is returned separately so the page can put the FAQ and
// call to action before it and keep the reference list last.
export function postBody(slug: string) {
  const md = readFileSync(path.join(process.cwd(), 'content', 'blog', `${slug}.md`), 'utf8')
  const [main, refs] = md.split(/^## References\s*$/m)
  const words = md.split(/\s+/).filter(Boolean).length
  return {
    html: renderMarkdown(main).html,
    referencesHtml: refs ? renderMarkdown(refs).html : null,
    readingMinutes: Math.max(1, Math.round(words / 230)),
  }
}
