'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateResearchContext } from '@/lib/research-context'
import type { ReadingListItem } from '@/types/database'

export async function saveTheorySelection(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId   = formData.get('projectId') as string
  const selectedIds = JSON.parse(formData.get('selectedIds') as string) as string[]

  const { data: project } = await supabase
    .from('projects')
    .select('research_context')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/onboarding')

  const ctx = project.research_context
  const readingListRaw: string = ctx?.brief?.reading_list_raw ?? ''

  // If framework already exists, changing theories invalidates downstream blocks
  const currentOutdated: string[] = ctx?.outdated_blocks ?? []
  const outdatedBlocks = ctx?.framework?.edges?.length
    ? [...new Set([...currentOutdated, 'framework', 'methodology', 'interview_guide'])]
    : currentOutdated

  const { data: theories } = await supabase
    .from('theories')
    .select('id, name, author, year, doi')
    .in('id', selectedIds)

  const readingListItems: ReadingListItem[] = (theories ?? []).map(t => ({
    raw_ref: `${t.author} (${t.year ?? 'n/d'}) — ${t.name}`,
    matched_theory_id: t.id,
    match_type: readingListRaw && t.author &&
      readingListRaw.toLowerCase().includes(t.author.split(/[,&]/)[0].trim().toLowerCase())
      ? 'in_list'
      : 'beyond_list',
    doi: t.doi ?? null,
  }))

  await updateResearchContext(
    projectId,
    'theories',
    {
      theories: {
        selected_ids: selectedIds,
        reading_list_items: readingListItems,
      },
      outdated_blocks: outdatedBlocks,
    },
    supabase
  )

  redirect(`/project/${projectId}`)
}
