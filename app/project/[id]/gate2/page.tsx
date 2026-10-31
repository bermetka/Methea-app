import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateResearchContext } from '@/lib/research-context'
import { resolveProjectTheories } from '@/lib/project-theories'
import { theoryCard } from '@/lib/literature/theory-content'
import { theoryAnchors } from '@/lib/literature/check-list'
import { recentCiting } from '@/lib/literature/works'
import { topicTerms, READING_LIST_LIMIT } from '@/lib/prompts/reading-list'
import type { ResearchContext } from '@/types/database'
import Gate2View, { type Gate2Theory } from './Gate2View'

export const metadata = { title: 'Reading — Methea' }
// Server actions on this page (list check: parse + lookups + tagging) can take a while.
export const maxDuration = 60

export default async function Gate2Page({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('id, research_context')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()
  if (!project) redirect('/projects')

  const ctx = project.research_context as ResearchContext
  const selectedIds = ctx.theories?.selected_ids ?? []
  if (!selectedIds.length) redirect(`/project/${params.id}/theories`)

  const theories = await resolveProjectTheories(ctx, selectedIds, supabase)

  // Topic terms for "Beyond your list": computed once per project, then reused.
  let terms = ctx.theories?.search_terms ?? []
  if (!terms.length && ctx.brief) {
    terms = await topicTerms(ctx.brief.topic ?? '', ctx.brief.research_question ?? '')
    if (terms.length) {
      await updateResearchContext(
        params.id,
        'reading_list',
        { theories: { ...(ctx.theories ?? { selected_ids: [], reading_list_items: [] }), search_terms: terms } },
        supabase
      ).catch(() => undefined)
    }
  }

  const anchors = await theoryAnchors(theories)
  const whyById = new Map((ctx.theories?.suggestions ?? []).map(s => [s.theory_id, s.why_it_fits]))

  const view: Gate2Theory[] = await Promise.all(
    theories.map(async (t, i) => {
      const card = theoryCard(t.name)
      const anchor = card?.citation_anchor_openalex_id ?? Array.from(anchors[i].anchors)[0] ?? null
      const recent = anchor
        ? await recentCiting(anchor, [...terms, card?.recent_search_term ?? t.name].filter(Boolean)).catch(() => [])
        : []
      return {
        id: t.id,
        name: t.name,
        author: t.author,
        year: t.year,
        summary: t.summary,
        concepts: t.concepts ?? [],
        whyItFits: whyById.get(t.id) ?? null,
        card,
        recent,
      }
    })
  )

  const list = ctx.theories?.student_list ?? null
  const checkedFor = [...selectedIds].sort().join(',')

  return (
    <main style={{ minHeight: '100vh', padding: '2.5rem 1rem 4rem', background: 'var(--paper)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Gate2View
          projectId={params.id}
          theories={view}
          rawList={ctx.brief?.reading_list_raw ?? ''}
          list={list}
          listOutdated={!!list && list.checked_for !== checkedFor}
          readMarks={ctx.theories?.read_marks ?? []}
          constraints={ctx.brief?.constraints ?? []}
          gateDone={!!ctx.socratic_gate_2?.completed}
          limit={READING_LIST_LIMIT}
        />
      </div>
    </main>
  )
}
