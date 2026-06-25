'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateResearchContext } from '@/lib/research-context'
import { extractBrief, generateSocraticQuestions } from '@/lib/prompts/brief'

export async function submitBrief(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId   = formData.get('projectId') as string
  const topic       = formData.get('topic') as string
  const degreeLevel = formData.get('degreeLevel') as string
  const discipline  = formData.get('discipline') as string
  const readingList = formData.get('readingList') as string | null

  // Parse uploaded file if present
  let fileText: string | undefined
  const file = formData.get('file') as File | null
  if (file && file.size > 0) {
    fileText = await parseUploadedFile(file)
  }

  // Verify project belongs to this user
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/onboarding')

  // 1. Extract structured brief via Claude
  const briefExtraction = await extractBrief(
    topic, degreeLevel, discipline,
    readingList ?? undefined,
    fileText
  )
  if (readingList) briefExtraction.reading_list_raw = readingList

  // 2. Generate 4 Socratic questions via Claude
  const questions = await generateSocraticQuestions(briefExtraction)

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
    },
    supabase
  )

  redirect(`/project/${projectId}/gate1`)
}

async function parseUploadedFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const name = file.name.toLowerCase()

  if (name.endsWith('.docx') || name.endsWith('.doc')) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value.slice(0, 8000)
  }

  if (name.endsWith('.pdf')) {
    // pdf-parse exports differently depending on module resolution
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfModule = await import('pdf-parse') as any
    const pdfParse = pdfModule.default ?? pdfModule
    const data = await pdfParse(buffer)
    return data.text.slice(0, 8000)
  }

  return ''
}
