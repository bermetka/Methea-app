import { AUTHOR, POSTS, SITE_URL } from '@/lib/blog/posts'

// llms.txt (llmstxt.org): a plain-text map of the site for AI answer engines.
export const dynamic = 'force-static'

export function GET() {
  const body = [
    '# Methea',
    '',
    '> Methea guides Master’s and PhD students from assignment brief to structured research findings: research question refinement, theory selection from a curated library with verified citations, framework diagram, methodology, interview guide and transcript analysis. It is a process tool, not a writing tool — students write their own discussion, conclusion and report.',
    '',
    `Founder: ${AUTHOR.name}. Pricing: free for the first steps (up to 3 projects); $49 one-time per project for full access for 6 months.`,
    '',
    '## Product',
    '',
    `- [Home](${SITE_URL}/): what Methea does and pricing`,
    `- [Start](${SITE_URL}/start): check your research for free`,
    '',
    '## Guides',
    '',
    ...POSTS.map(p => `- [${p.title}](${SITE_URL}/blog/${p.slug}): ${p.description}`),
    '',
    '## Legal',
    '',
    `- [Privacy](${SITE_URL}/privacy)`,
    `- [Terms](${SITE_URL}/terms)`,
    '',
  ].join('\n')
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
