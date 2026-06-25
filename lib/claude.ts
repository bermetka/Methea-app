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

/**
 * One-shot structured JSON generation (non-streaming).
 * Use for all AI calls that return structured data to be saved to research_context.
 */
export async function generateJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2048
): Promise<T> {
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

  // Strip markdown code fences if present
  const json = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(json) as T
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
