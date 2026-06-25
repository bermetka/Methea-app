import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { suggestTheories } from '@/lib/prompts/theories'
import { verifyTheory, isInReadingList } from '@/lib/openalex'
import TheoryCards, { type TheoryCardData } from './TheoryCards'
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
  if (ctx?.theories?.selected_ids?.length) redirect(`/project/${params.id}`)

  const { data: allTheories } = await supabase
    .from('theories')
    .select('*')
    .order('name')

  if (!allTheories || allTheories.length === 0) {
    redirect(`/project/${params.id}`)
  }

  const suggestions = await suggestTheories(ctx, allTheories as Theory[])

  const theoriesById = new Map((allTheories as Theory[]).map(t => [t.id, t]))
  const readingListRaw = ctx.brief?.reading_list_raw ?? ''

  const cards: TheoryCardData[] = await Promise.all(
    suggestions.map(async (s) => {
      const theory = theoriesById.get(s.theory_id)!
      const verification = await verifyTheory(theory)
      return {
        id: theory.id,
        name: theory.name,
        author: theory.author,
        year: theory.year,
        summary: theory.summary,
        concepts: theory.concepts,
        why_it_fits: s.why_it_fits,
        verification,
        in_reading_list: isInReadingList(theory, readingListRaw),
      }
    })
  )

  // Sort by fit_score descending
  const scored = suggestions.map((s, i) => ({ i, score: s.fit_score }))
  scored.sort((a, b) => b.score - a.score)
  const sortedCards = scored.map(({ i }) => cards[i])

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <span style={styles.wordmark}>Methea</span>
        <TheoryCards
          projectId={params.id}
          topic={ctx.brief?.topic ?? 'your research topic'}
          cards={sortedCards}
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
