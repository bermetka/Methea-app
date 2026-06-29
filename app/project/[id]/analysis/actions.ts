'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateResearchContext } from '@/lib/research-context'
import { codeTranscript } from '@/lib/prompts/analysis'
import type { Theory } from '@/types/database'

export async function runTranscriptAnalysis(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId = formData.get('projectId') as string
  const file = formData.get('transcript') as File | null

  if (!file || file.size === 0) throw new Error('No file provided')

  // Parse uploaded file
  const buffer = Buffer.from(await file.arrayBuffer())
  const name = file.name.toLowerCase()
  let transcriptText = ''

  if (name.endsWith('.docx') || name.endsWith('.doc')) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    transcriptText = result.value
  } else if (name.endsWith('.pdf')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfModule = await import('pdf-parse') as any
    const pdfParse = pdfModule.default ?? pdfModule
    const data = await pdfParse(buffer)
    transcriptText = data.text
  } else {
    // .txt or plain text
    transcriptText = buffer.toString('utf-8')
  }

  if (!transcriptText.trim()) throw new Error('Could not extract text from file')

  // Load project context
  const { data: project } = await supabase
    .from('projects')
    .select('research_context')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/login')

  const ctx = project.research_context
  const selectedIds: string[] = ctx?.theories?.selected_ids ?? []
  const researchQuestion = ctx?.brief?.research_question ?? ''

  // Load theory names + concepts
  const { data: theories } = await supabase
    .from('theories')
    .select('id, name, concepts')
    .in('id', selectedIds) as { data: Pick<Theory, 'id' | 'name' | 'concepts'>[] | null }

  const conceptRefs = (theories ?? []).flatMap(t =>
    (t.concepts ?? []).map((c: string) => ({ concept: c, theory_id: t.id, theory_name: t.name }))
  )

  const result = await codeTranscript(transcriptText, conceptRefs, researchQuestion)

  await updateResearchContext(
    projectId,
    'findings',
    {
      findings: {
        transcript_text: transcriptText.slice(0, 20000),
        coded_segments: result.coded_segments,
        themes: result.themes,
        gate3_completed: false,
      },
    },
    supabase
  )

  redirect(`/project/${projectId}/analysis`)
}

export async function confirmThemes(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId = formData.get('projectId') as string
  const confirmedIds: string[] = JSON.parse(formData.get('confirmedIds') as string)

  const { data: project } = await supabase
    .from('projects')
    .select('research_context')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/login')

  const findings = project.research_context?.findings
  if (!findings) redirect(`/project/${projectId}/analysis`)

  const updatedThemes = findings.themes.map((t: { id: string; confirmed: boolean }) => ({
    ...t,
    confirmed: confirmedIds.includes(t.id),
  }))

  await updateResearchContext(
    projectId,
    'findings',
    {
      findings: {
        ...findings,
        themes: updatedThemes,
        gate3_completed: true,
      },
    },
    supabase
  )

  redirect(`/project/${projectId}`)
}
