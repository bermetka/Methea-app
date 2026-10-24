'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireFullAccess } from '@/lib/access'
import { updateResearchContext } from '@/lib/research-context'
import { resolveProjectTheories } from '@/lib/project-theories'
import { codeTranscript } from '@/lib/prompts/analysis'

export async function runTranscriptAnalysis(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId = formData.get('projectId') as string
  const file = formData.get('transcript') as File | null
  // Coding a transcript generates content — paid only.
  await requireFullAccess(supabase, projectId, user.id)

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
    const { extractText, getDocumentProxy } = await import('unpdf')
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    const { text } = await extractText(pdf, { mergePages: true })
    transcriptText = text ?? ''
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

  // Load theory names + concepts — library + custom theories merged, so coding runs against
  // the student's own theories too.
  const theories = await resolveProjectTheories(ctx, selectedIds, supabase)

  const conceptRefs = theories.flatMap(t =>
    (t.concepts ?? []).map((c: string) => ({ concept: c, theory_id: t.id, theory_name: t.name }))
  )

  // codeTranscript throws (via generateJSON, which already retried once) on a genuine
  // parse failure — that propagates to UploadForm.tsx's try/catch, which already shows
  // a friendly inline message with a way back (the student stays on the upload page).
  // What it can't catch is a reply that parsed fine but has the wrong shape (e.g. a
  // missing `themes` array) — guard that here so a malformed-but-valid-JSON reply can't
  // save `undefined` into research_context and crash the next page that reads it.
  const result = await codeTranscript(transcriptText, conceptRefs, researchQuestion)
  const codedSegments = Array.isArray(result?.coded_segments) ? result.coded_segments : []
  const themes = Array.isArray(result?.themes) ? result.themes : []

  await updateResearchContext(
    projectId,
    'findings',
    {
      findings: {
        transcript_text: transcriptText.slice(0, 20000),
        coded_segments: codedSegments,
        themes,
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
  await requireFullAccess(supabase, projectId, user.id)

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
