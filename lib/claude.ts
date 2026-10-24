import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const DEFAULT_MODEL = 'claude-sonnet-4-6'

export interface StreamCallbacks {
  onText: (text: string) => void
  onDone: () => void
  onError: (error: Error) => void
}

// Thrown by generateJSON when Claude's reply still isn't valid JSON after a retry.
// Deliberately carries no raw model output or parser internals — several callers show
// `error.message` straight to the student (e.g. analysis/UploadForm.tsx), so this message
// must always be safe to display as-is.
export class ClaudeJSONParseError extends Error {
  constructor(message = "Methea couldn't read Claude's response. Please try again.") {
    super(message)
    this.name = 'ClaudeJSONParseError'
  }
}

const JSON_PARSE_ATTEMPTS = 2
// Raw replies can run to thousands of characters (narratives, coded transcripts) — cap
// what lands in server logs on a parse failure.
const LOGGED_REPLY_CHARS = 500

/**
 * One-shot structured JSON generation (non-streaming).
 * Use for all AI calls that return structured data to be saved to research_context.
 *
 * Claude occasionally ignores the "JSON only" instruction (adds prose, truncates, wraps
 * oddly) — rare, but with no retry it's a hard crash for whichever page called this. So:
 * one retry on a parse failure (a fresh call, not a re-parse of the same text — the
 * failure is almost always in what Claude sent, not in the stripping logic below), then
 * log the truncated raw reply server-side for debugging and throw a clean, user-safe
 * error. Callers decide the user-facing fallback (a retry + way back, never a white
 * screen) — this function's job is only to never leak a raw parse error or model output.
 */
export async function generateJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2048
): Promise<T> {
  let lastRawText = ''
  let lastParseError: unknown

  for (let attempt = 1; attempt <= JSON_PARSE_ATTEMPTS; attempt++) {
    const message = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('')
    lastRawText = text

    // Strip markdown code fences if present
    const json = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    try {
      return JSON.parse(json) as T
    } catch (err) {
      lastParseError = err
      // Loop again for a fresh attempt, unless this was the last one.
    }
  }

  console.error(
    `[claude.generateJSON] gave up after ${JSON_PARSE_ATTEMPTS} attempts — Claude's reply wasn't valid JSON.`,
    `Parse error: ${lastParseError instanceof Error ? lastParseError.message : String(lastParseError)}`,
    `Raw reply (truncated to ${LOGGED_REPLY_CHARS} chars): ${lastRawText.slice(0, LOGGED_REPLY_CHARS)}`
  )
  throw new ClaudeJSONParseError()
}

/**
 * Streaming text generation for short UI-facing generations.
 * Long jobs (transcript coding) use async background jobs, not this.
 */
export async function streamText(
  systemPrompt: string,
  userPrompt: string,
  callbacks: StreamCallbacks,
  maxTokens = 1024
): Promise<void> {
  const stream = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    stream: true,
  })

  try {
    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        callbacks.onText(event.delta.text)
      }
    }
    callbacks.onDone()
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)))
  }
}
