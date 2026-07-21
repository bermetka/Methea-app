'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateResearchContext } from '@/lib/research-context'
import { extractBrief, generateSocraticQuestions } from '@/lib/prompts/brief'

export async function submitBrief(formData: FormData): Promise<{ error: string } | void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId   = formData.get('projectId') as string
  const topic       = formData.get('topic') as string
  const degreeLevel = formData.get('degreeLevel') as string
  const discipline  = formData.get('discipline') as string
  const readingList = formData.get('readingList') as string | null

  // Parse uploaded file if present — never fail the whole submission over a bad file
  let fileText: string | undefined
  let fileExtractionEmpty = false
  const file = formData.get('file') as File | null
  if (file && file.size > 0) {
    try {
      const parsed = await parseUploadedFile(file)
      fileText = parsed.text
      fileExtractionEmpty = parsed.empty
    } catch (err) {
      if (err instanceof FileParseError) {
        return { error: 'FILE_PARSE_FAILED' }
      }
      throw err
    }
  }

  // Verify project belongs to this user
  const { data: project } = await supabase
    .from('projects')
    .select('id, research_context')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/onboarding')

  // Re-submitting brief invalidates downstream blocks if theories already selected
  const existingCtx = project.research_context
  const currentOutdated: string[] = existingCtx?.outdated_blocks ?? []
  const outdatedBlocks = existingCtx?.theories?.selected_ids?.length
    ? Array.from(new Set([...currentOutdated, 'framework', 'methodology', 'interview_guide']))
    : currentOutdated

  // 1. Extract structured brief via Claude
  const briefExtraction = await extractBrief(
    topic, degreeLevel, discipline,
    readingList ?? undefined,
    fileText
  )
  if (readingList) briefExtraction.reading_list_raw = readingList

  // 2. Generate Socratic questions via Claude — hard cap at 3 regardless of prompt output
  const questions = (await generateSocraticQuestions(briefExtraction)).slice(0, 3)

  // 3. Save both to research_context in one update
  await updateResearchContext(
    projectId,
    'brief',
    {
      brief: briefExtraction,
      socratic_gate_1: {
        completed: false,
        responses: {},
        questions,
      },
      outdated_blocks: outdatedBlocks,
      file_extraction_empty: fileExtractionEmpty,
    },
    supabase
  )

  redirect(`/project/${projectId}/gate1`)
}

class FileParseError extends Error {
  code = 'FILE_PARSE_FAILED' as const
  constructor(cause: unknown) {
    super('Failed to parse uploaded file')
    this.cause = cause
  }
}

async function parseUploadedFile(file: File): Promise<{ text: string; empty: boolean }> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const name = file.name.toLowerCase()

  try {
    if (name.endsWith('.docx') || name.endsWith('.doc')) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      const text = result.value.slice(0, 8000)
      return { text, empty: text.trim().length === 0 }
    }

    if (name.endsWith('.pdf')) {
      const { extractText, getDocumentProxy } = await import('unpdf')
      const pdf = await getDocumentProxy(new Uint8Array(buffer))
      const { text } = await extractText(pdf, { mergePages: true })
      const trimmed = (text ?? '').slice(0, 8000)
      return { text: trimmed, empty: trimmed.trim().length === 0 }
    }
  } catch (err) {
    throw new FileParseError(err)
  }

  return { text: '', empty: true }
}
