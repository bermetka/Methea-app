import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateJSON, ClaudeJSONParseError } from './claude'

// Mock the Anthropic SDK so these tests exercise generateJSON's retry/parse/logging
// behavior without a real network call. vi.mock is hoisted above the import above.
const createMock = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: (...args: unknown[]) => createMock(...args) }
  },
}))

function textMessage(text: string) {
  return { content: [{ type: 'text', text }] }
}

describe('generateJSON', () => {
  beforeEach(() => {
    createMock.mockReset()
  })

  it('parses a clean JSON reply on the first attempt (no retry)', async () => {
    createMock.mockResolvedValueOnce(textMessage('{"a":1}'))

    const result = await generateJSON<{ a: number }>('sys', 'user')

    expect(result).toEqual({ a: 1 })
    expect(createMock).toHaveBeenCalledTimes(1)
  })

  it('strips a markdown code fence before parsing', async () => {
    createMock.mockResolvedValueOnce(textMessage('```json\n{"a":1}\n```'))

    const result = await generateJSON<{ a: number }>('sys', 'user')

    expect(result).toEqual({ a: 1 })
  })

  // The exact scenario this whole change exists for: Claude occasionally ignores the
  // "JSON only" instruction and wraps the JSON in prose. One retry — a fresh call — gives
  // it a second chance before giving up.
  it('reads JSON wrapped in prose without a retry', async () => {
    createMock.mockResolvedValueOnce(textMessage('Sure! Here you go: {"a":1}'))
    const result = await generateJSON<{ a: number }>('sys', 'user')
    expect(result).toEqual({ a: 1 })
    expect(createMock).toHaveBeenCalledTimes(1)
  })

  it('retries once on an unparsable reply, and returns the retry result', async () => {
    createMock
      .mockResolvedValueOnce(textMessage('Sure! Here you go: {"a":1'))
      .mockResolvedValueOnce(textMessage('{"a":2}'))

    const result = await generateJSON<{ a: number }>('sys', 'user')

    expect(result).toEqual({ a: 2 })
    expect(createMock).toHaveBeenCalledTimes(2)
  })

  it('throws a clean ClaudeJSONParseError after both attempts fail, never exposing the raw reply in the error message, but logging it (truncated) server-side', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // Every call returns the same unparsable reply — both the first attempt and the retry.
    createMock.mockResolvedValue(textMessage('SECRET_RAW_MARKER this is not json'))

    let caught: unknown
    try {
      await generateJSON('sys', 'user')
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(ClaudeJSONParseError)
    // Several callers (e.g. analysis/UploadForm.tsx) render error.message straight to the
    // student — it must never contain the model's raw output.
    expect((caught as Error).message).not.toContain('SECRET_RAW_MARKER')
    // Exactly one retry — not a silent infinite loop, not giving up with zero retries.
    expect(createMock).toHaveBeenCalledTimes(2)

    // But the raw reply must still be visible to developers for debugging.
    expect(consoleErrorSpy).toHaveBeenCalled()
    const logged = consoleErrorSpy.mock.calls.flat().join(' ')
    expect(logged).toContain('SECRET_RAW_MARKER')

    consoleErrorSpy.mockRestore()
  })

  it('truncates the logged raw reply instead of dumping an unbounded blob into server logs', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const hugeReply = 'x'.repeat(5000) + 'not json'
    createMock.mockResolvedValue(textMessage(hugeReply))

    await expect(generateJSON('sys', 'user')).rejects.toBeInstanceOf(ClaudeJSONParseError)

    const logged = consoleErrorSpy.mock.calls.flat().join(' ')
    expect(logged.length).toBeLessThan(hugeReply.length)

    consoleErrorSpy.mockRestore()
  })
})

describe('generateJSON options', () => {
  beforeEach(() => {
    createMock.mockReset()
  })

  it('defaults to a plain system string and the default model', async () => {
    createMock.mockResolvedValueOnce(textMessage('{"a":1}'))
    await generateJSON('sys', 'user')
    const args = createMock.mock.calls[0][0]
    expect(args.system).toBe('sys')
    expect(args.model).toBe('claude-sonnet-4-6')
  })

  it('uses the model override and sends cached context as a cached system block', async () => {
    createMock.mockResolvedValueOnce(textMessage('{"a":1}'))
    await generateJSON('sys', 'user', 512, { model: 'fast-model', cachedContext: 'LIBRARY' })
    const args = createMock.mock.calls[0][0]
    expect(args.model).toBe('fast-model')
    expect(args.system).toEqual([
      { type: 'text', text: 'sys' },
      { type: 'text', text: 'LIBRARY', cache_control: { type: 'ephemeral' } },
    ])
  })
})

describe('parseJSONReply', () => {
  it('parses fenced JSON followed by prose', async () => {
    const { parseJSONReply } = await import('./claude')
    expect(parseJSONReply('```json\n{\n  "items": []\n}\n```\n\nThe text "X" appears to be a name.')).toEqual({ items: [] })
  })
  it('parses JSON with prose before it', async () => {
    const { parseJSONReply } = await import('./claude')
    expect(parseJSONReply('Here you go: {"a": "b}"} hope this helps')).toEqual({ a: 'b}' })
  })
})
