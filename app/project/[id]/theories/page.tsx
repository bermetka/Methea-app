import { redirect } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import { createClient } from '@/lib/supabase/server'
import { suggestTheories } from '@/lib/prompts/theories'
import { verifyTheory, isInReadingList } from '@/lib/openalex'
import TheoryCards, { type TheoryCardData } from './TheoryCards'
import type { VerificationStatus } from '@/components/ui/StatusChip'
import type { Project, Theory } from '@/types/database'

export const metadata = { title: 'Choose your theories — Methea' }

export default async function TheoriesPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/onboarding')

  const p = project as Project
  const ctx = p.research_context

  if (!ctx?.socratic_gate_1?.completed) redirect(`/project/${params.id}/gate1`)

  const { data: allTheories } = await supabase
    .from('theories')
    .select('*')
    .order('name')

  if (!allTheories || allTheories.length === 0) {
    redirect(`/project/${params.id}`)
  }

  const selectedIds = ctx?.theories?.selected_ids ?? []
  const isOutdated  = (ctx.outdated_blocks ?? []).includes('theories')

  // Reuse cached AI suggestions so revisiting keeps the "why it fits" reasoning without
  // re-calling Claude. Recompute when upstream (gate 1) changed and marked us outdated.
  const cachedSuggestions = ctx?.theories?.suggestions
  const suggestions = (!isOutdated && cachedSuggestions?.length)
    ? cachedSuggestions
    : await suggestTheories(ctx, allTheories as Theory[])

  const theoriesById   = new Map((allTheories as Theory[]).map(t => [t.id, t]))
  const readingListRaw = ctx.brief?.reading_list_raw ?? ''

  // Verify every library theory once (cached 24h; pre-1995 classics short-circuit without a
  // network call) and reuse the result for both the suggested view and the browse view.
  const verifById = new Map<string, VerificationStatus>(
    await Promise.all(
      (allTheories as Theory[]).map(async t => [t.id, await verifyTheory(t)] as const)
    )
  )

  const suggestionIds = suggestions.map(s => s.theory_id)
  const whyById   = new Map(suggestions.map(s => [s.theory_id, s.why_it_fits]))
  const scoreById = new Map(suggestions.map(s => [s.theory_id, s.fit_score]))

  const toCard = (theory: Theory): TheoryCardData => ({
    id: theory.id,
    name: theory.name,
    author: theory.author,
    year: theory.year,
    summary: theory.summary,
    concepts: theory.concepts,
    why_it_fits: whyById.get(theory.id) ?? '',
    verification: verifById.get(theory.id) ?? { kind: 'unverified' },
    in_reading_list: isInReadingList(theory, readingListRaw),
  })

  // Suggested view: the AI suggestions, plus any already-selected library theory that isn't in
  // the suggestion set (e.g. picked via browse), so an edited selection never disappears.
  const extraSelectedIds = selectedIds.filter(
    id => !id.startsWith('custom:') && !suggestionIds.includes(id) && theoriesById.has(id)
  )
  const suggestedCards: TheoryCardData[] = [...suggestionIds, ...extraSelectedIds]
    .map(id => ({ card: toCard(theoriesById.get(id)!), score: scoreById.get(id) ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .map(c => c.card)

  // Bring-your-own theories: render from stored verification result — no OpenAlex re-hit.
  const customCards: TheoryCardData[] = (ctx.theories?.custom_theories ?? []).map(c => ({
    id: c.id,
    name: c.name,
    author: c.author,
    year: c.year,
    summary: c.summary,
    concepts: c.concepts,
    why_it_fits: '',
    verification: c.verification === 'doi_verified'
      ? { kind: 'doi_verified', doi: c.doi ?? '' }
      : { kind: 'unverified' },
    in_reading_list: false,
  }))

  const cards: TheoryCardData[] = [...suggestedCards, ...customCards]

  // Browse view: the full curated library (already ordered by name).
  const libraryCards: TheoryCardData[] = (allTheories as Theory[]).map(toCard)

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <Logo size="sm" />
        <TheoryCards
          projectId={params.id}
          topic={ctx.brief?.topic ?? 'your research topic'}
          cards={cards}
          libraryCards={libraryCards}
          initialSelected={selectedIds}
          suggestions={suggestions}
        />
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page:      { minHeight: '100vh', padding: '3rem 1rem', background: 'var(--paper)' },
  container: { width: '100%', maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  wordmark:  { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.045em', color: 'var(--ink)' },
}
