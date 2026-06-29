import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateRelationshipLabels, generateFrameworkNarrative } from '@/lib/prompts/framework'
import Logo from '@/components/ui/Logo'
import FrameworkBuilder from './FrameworkBuilder'
import type { Project, Theory } from '@/types/database'

export const metadata = { title: 'Your framework — Methea' }

export default async function FrameworkPage({ params }: { params: { id: string } }) {
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

  if (!ctx?.theories?.selected_ids?.length) redirect(`/project/${params.id}/theories`)

  const selectedIds = ctx.theories!.selected_ids

  const { data: theoriesData } = await supabase
    .from('theories')
    .select('*')
    .in('id', selectedIds)

  if (!theoriesData?.length) redirect(`/project/${params.id}`)

  const theories = theoriesData as Theory[]

  // Use saved framework if available, otherwise generate
  let edges = ctx.framework?.edges ?? []
  let narrativeResult = {
    narrative: ctx.framework?.narrative ?? '',
    citations: ctx.framework?.citations ?? [],
  }
  let citationStatuses: Record<string, 'doi_verified' | 'classic_verified' | 'unverified'> =
    ctx.framework?.citation_statuses ?? {}

  if (!edges.length) {
    edges = await generateRelationshipLabels(ctx, theories)
    narrativeResult = await generateFrameworkNarrative(ctx, theories, edges)

    await Promise.all(
      narrativeResult.citations.map(async (c) => {
        const key = `${c.author}, ${c.year}`
        if (c.doi) {
          try {
            const res = await fetch(
              `https://api.openalex.org/works/doi:${encodeURIComponent(c.doi)}?mailto=bermet.ak@gmail.com`,
              { next: { revalidate: 86400 } }
            )
            const data = await res.json()
            citationStatuses[key] = data?.doi ? 'doi_verified' : 'unverified'
          } catch {
            citationStatuses[key] = 'unverified'
          }
        } else if (c.year < 1995) {
          citationStatuses[key] = 'classic_verified'
        } else {
          citationStatuses[key] = 'unverified'
        }
      })
    )
  }

  const defaultLayout: 'linear' | 'hub-and-spoke' =
    (ctx.framework?.layout_preset as 'linear' | 'hub-and-spoke') ??
    (theories.length === 2 ? 'linear' : 'hub-and-spoke')

  const diagramTheories = theories.map(t => ({
    id: t.id,
    name: t.name,
    author: t.author,
    year: t.year,
  }))

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <Logo size="sm" />
        <div style={styles.heading}>
          <h2 style={styles.h2}>Here's how your theories connect</h2>
          <p style={styles.sub}>Review the diagram and narrative, then save to continue.</p>
        </div>
        <FrameworkBuilder
          projectId={params.id}
          theories={diagramTheories}
          edges={edges}
          narrative={narrativeResult.narrative}
          citations={narrativeResult.citations}
          citationStatuses={citationStatuses}
          defaultLayout={defaultLayout}
        />
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page:      { minHeight: '100vh', padding: '2.5rem 1rem', background: 'var(--paper)' },
  container: { width: '100%', maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  heading:   { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  h2:        { fontSize: '1.375rem', fontWeight: 400, color: 'var(--ink)', lineHeight: 1.3 },
  sub:       { fontSize: '0.9375rem', color: 'var(--graphite)' },
}
