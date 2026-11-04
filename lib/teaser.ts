/**
 * The opening of a text for a paywall preview: whole sentences only, at most
 * `sentences` of them and about `maxChars` long. The rest never leaves the server.
 */
export function teaser(text: string, { sentences = 3, maxChars = 360 } = {}): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  // Split after . ! ? followed by a space and a capital/quote/bracket — keeps "et al. (2005)" and "e.g. this" together.
  const parts = clean.split(/(?<=[.!?])(?<!\b(?:al|e\.g|i\.e|cf|vs|eds?|pp?)\.)\s+(?=["'“(\[A-Z])/)
  let out = ''
  for (const part of parts.slice(0, sentences)) {
    if (out && (out + ' ' + part).length > maxChars) break
    out = out ? `${out} ${part}` : part
  }
  if (out.length > maxChars) {
    const cut = out.slice(0, maxChars)
    out = `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 0)).trim()}…`
  }
  return out
}
