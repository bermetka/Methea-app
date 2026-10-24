import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateRelationshipLabels, generateFrameworkNarrative } from '@/lib/prompts/framework'
import { resolveProjectTheories } from '@/lib/project-theories'
import { updateResearchContext } from '@/lib/research-context'
import { isUnlimitedUser } from '@/lib/access'
import { hasFullAccess } from '@/lib/entitlement'
import { getUnlockInfo } from '@/lib/checkout'
import Logo from '@/components/ui/Logo'
import GenerationError from '@/components/ui/GenerationError'
import { trackEvent } from '@/lib/funnel'
import FrameworkBuilder from './FrameworkBuilder'
import type { Project } from '@/types/database'

export const metadata = { title: 'Your framework — Methea' }

// Free diagram redraws per project after the student changes theories, before
// the unlock prompt. Soft cap: the counter lives in research_context.
const FREE_DIAGRAM_REFRESHES = 5

async function saveFrameworkEdgesOnly(
  projectId: string,
  edges: import('@/types/database').FrameworkEdge[],
  ctx: import('@/types/database').ResearchContext,
  diagramTheoryKey: string,
  freeDiagramRefreshes?: number
) {
  const supabase = createClient()
  await updateResearchContext(
    projectId,
    'framework',
    {
      framework: {
        layout_preset: ctx.framework?.layout_preset ?? 'hub-and-spoke',
        edges,
        narrative: ctx.framework?.narrative ?? '',
        citations: ctx.framework?.citations ?? [],
        citation_statuses: ctx.framework?.citation_statuses ?? {},
        diagram_theory_key: diagramTheoryKey,
      },
      ...(freeDiagramRefreshes !== undefined && { free_diagram_refreshes: freeDiagramRefreshes }),
    },
    supabase
  )
}

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

  // Merge library theories + the student's own (custom) theories into one set, so
  // bring-your-own theories are first-class in the generated framework, not just stored.
  const theories = await resolveProjectTheories(ctx, selectedIds, supabase)

  if (!theories.length) redirect(`/project/${params.id}`)

  // Full access = paid inside the window, or any project before PAYWALL_START.
  const paid = hasFullAccess(p, { unlimited: await isUnlimitedUser(supabase, user.id) })

  // Soft-invalidation: when an upstream change marked the framework ⚠ outdated, discard the
  // stale saved framework and regenerate from the current theories. Saving clears the flag.
  // Paid only: an unpaid project can't save (saveFramework rejects it), so a reset would
  // regenerate on every visit, and the narrative is paid-only anyway. Unpaid keeps the
  // saved diagram and never resets.
  const isOutdated = (ctx.outdated_blocks ?? []).includes('framework')
  const resetForReview = paid && isOutdated

  // Diagram (edges) is the free teaser — always generate/keep it.
  const diagramTheoryKey = [...selectedIds].sort().join(',')
  let edges = resetForReview ? [] : (ctx.framework?.edges ?? [])
  let diagramRefreshCapReached = false
  try {
    if (!edges.length) {
      edges = await generateRelationshipLabels(ctx, theories)
      // Persist the diagram immediately so it's not regenerated on every free view.
      // Not during a review reset — there the student's Save commits it.
      if (!resetForReview) await saveFrameworkEdgesOnly(params.id, edges, ctx, diagramTheoryKey)
    } else if (!paid && isOutdated && ctx.framework?.diagram_theory_key !== diagramTheoryKey) {
      // Unpaid student changed theories: redraw the diagram only (never the narrative), so the
      // free diagram never shows theories they've removed. The 'framework' outdated flag stays
      // set, so paying still runs the full review above.
      const refreshesUsed = ctx.free_diagram_refreshes ?? 0
      if (refreshesUsed < FREE_DIAGRAM_REFRESHES) {
        edges = await generateRelationshipLabels(ctx, theories)
        await saveFrameworkEdgesOnly(params.id, edges, ctx, diagramTheoryKey, refreshesUsed + 1)
      } else {
        diagramRefreshCapReached = true
      }
    }
  } catch (err) {
    // generateJSON already retried once — a genuine failure. Nothing was persisted (the
    // save calls above only run after a successful generation), so it's safe to just show
    // the fallback and let a retry re-run this from scratch.
    console.error(`[framework] generateRelationshipLabels failed for project ${params.id}:`, err)
    return <GenerationError projectId={params.id} stepLabel="framework diagram" retryHref={`/project/${params.id}/framework`} />
  }

  // The paywall moment: the student sees their diagram.
  if (edges.length) await trackEvent('framework_diagram_viewed', { once: params.id })

  // Narrative + citations: generating them is paid-only. A narrative that was
  // already generated (e.g. before the paywall started) stays viewable, read-only.
  let narrativeResult = !resetForReview
    ? { narrative: ctx.framework?.narrative ?? '', citations: ctx.framework?.citations ?? [] }
    : { narrative: '', citations: [] }
  let citationStatuses: Record<string, 'doi_verified' | 'classic_verified' | 'unverified'> =
    !resetForReview ? (ctx.framework?.citation_statuses ?? {}) : {}

  if (paid && !narrativeResult.narrative) {
    try {
      const result = await generateFrameworkNarrative(ctx, theories, edges)
      // generateFrameworkNarrative (unlike the other prompt functions) returns Claude's
      // parsed object as-is with no shape check — guard narrative/citations here so a
      // malformed-but-valid-JSON reply can't throw downstream in the citation loop below.
      narrativeResult = {
        narrative: typeof result?.narrative === 'string' ? result.narrative : '',
        citations: Array.isArray(result?.citations) ? result.citations : [],
      }
    } catch (err) {
      console.error(`[framework] generateFrameworkNarrative failed for project ${params.id}:`, err)
      return <GenerationError projectId={params.id} stepLabel="framework narrative" retryHref={`/project/${params.id}/framework`} />
    }

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

    // Persist narrative + citations now that they've been generated for a paid project.
    // Not during a review reset — the student reviews the regenerated version and saves.
    if (!resetForReview) await updateResearchContext(
      params.id,
      'framework',
      {
        framework: {
          layout_preset: ctx.framework?.layout_preset ?? (theories.length === 2 ? 'linear' : 'hub-and-spoke'),
          edges,
          narrative: narrativeResult.narrative,
          citations: narrativeResult.citations,
          citation_statuses: citationStatuses,
        },
      },
      supabase
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
          outdated={resetForReview}
          locked={!paid}
          unlock={paid ? null : await getUnlockInfo(p, user.id)}
          diagramRefreshCapReached={diagramRefreshCapReached}
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
