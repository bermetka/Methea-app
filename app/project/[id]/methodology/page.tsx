import { redirect } from 'next/navigation'
import GenerationError from '@/components/ui/GenerationError'
import { createClient } from '@/lib/supabase/server'
import { generateMethodologyChain } from '@/lib/prompts/methodology'
import { resolveProjectTheories } from '@/lib/project-theories'
import { accessOptions } from '@/lib/access'
import { hasFullAccess } from '@/lib/entitlement'
import { getUnlockInfo } from '@/lib/checkout'
import PaywallLock from '@/components/paywall/PaywallLock'
import ViewOnlyNotice from '@/components/paywall/ViewOnlyNotice'
import MethodologyChainView from './MethodologyChain'
import type { Project } from '@/types/database'

// Claude runs while this page renders or in its server actions, which execute
// on this route — allow up to 60s instead of the platform default.
export const maxDuration = 60

export const metadata = { title: 'Your methodology — Methea' }

export default async function MethodologyPage({ params }: { params: { id: string } }) {
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

  // Guard: must have framework before methodology
  if (!ctx?.framework?.edges?.length) redirect(`/project/${params.id}/framework`)

  // Paid-only step — no generation happens for unpaid projects. Already generated
  // content (e.g. from before the paywall started) stays viewable, read-only.
  if (!hasFullAccess(p, await accessOptions(supabase, user.id))) {
    const unlock = await getUnlockInfo(p, user)
    if (!ctx.methodology?.narrative) {
      return (
        <PaywallLock
          projectId={params.id}
          title="Your methodology chain is ready to build"
          description="Unlock this project to get your full paradigm-to-analysis methodology chain, each choice explained, plus the interview guide and transcript analysis that follow it."
          unlock={unlock}
        />
      )
    }
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <ViewOnlyNotice
            projectId={params.id}
            unlock={unlock}
            outdated={(ctx.outdated_blocks ?? []).includes('methodology')}
          />
          <h2 style={styles.heading}>Your methodology chain</h2>
          <MethodologyChainView
            projectId={params.id}
            chain={ctx.methodology as unknown as import('@/lib/prompts/methodology').MethodologyChain}
            readOnly
          />
        </div>
      </main>
    )
  }

  // Load selected theories — library + the student's own (custom) theories, merged.
  const selectedTheories = await resolveProjectTheories(ctx, ctx.theories!.selected_ids, supabase)

  // Soft-invalidation: regenerate when marked ⚠ outdated by an upstream change, otherwise
  // reuse the saved chain. Saving clears the flag (methodology/actions.ts).
  const isOutdated = (ctx.outdated_blocks ?? []).includes('methodology')
  let chain: import('@/lib/prompts/methodology').MethodologyChain
  if (!isOutdated && ctx.methodology?.narrative) {
    chain = ctx.methodology as unknown as import('@/lib/prompts/methodology').MethodologyChain
  } else {
    try {
      const result = await generateMethodologyChain(ctx, selectedTheories)
      // generateMethodologyChain returns Claude's parsed object as-is with no shape check —
      // default every field to '' so a missing key renders as blank, never the literal
      // string "undefined", in MethodologyChainView.
      chain = {
        paradigm: result?.paradigm ?? '',
        paradigm_why: result?.paradigm_why ?? '',
        methodology: result?.methodology ?? '',
        methodology_why: result?.methodology_why ?? '',
        data_collection: result?.data_collection ?? '',
        data_collection_why: result?.data_collection_why ?? '',
        sample: result?.sample ?? '',
        sample_why: result?.sample_why ?? '',
        analysis_method: result?.analysis_method ?? '',
        analysis_method_why: result?.analysis_method_why ?? '',
        narrative: result?.narrative ?? '',
      }
    } catch (err) {
      console.error(`[methodology] generateMethodologyChain failed for project ${params.id}:`, err)
      return <GenerationError projectId={params.id} stepLabel="methodology recommendation" retryHref={`/project/${params.id}/methodology`} />
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        {isOutdated && (
          <div style={styles.reviewBanner}>
            <span style={styles.reviewBadge}>⚠ Review changes</span>
            <p style={styles.reviewText}>
              Your framework changed, so we&apos;ve regenerated this methodology. Review each step, then <strong>save</strong> to confirm.
            </p>
          </div>
        )}
        <h2 style={styles.heading}>
          Here&apos;s the methodology your framework points to — and why each choice follows.
        </h2>
        <MethodologyChainView
          projectId={params.id}
          chain={chain}
        />
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page:      { minHeight: '100vh', padding: '2.5rem 1rem', background: 'var(--paper)' },
  container: { width: '100%', maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' },
  heading:   { fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.25rem, 3vw, 1.625rem)', fontWeight: 400, letterSpacing: '-0.015em', color: 'var(--ink)', lineHeight: 1.3 },
  reviewBanner: { display: 'flex', flexDirection: 'column', gap: '0.375rem', padding: '0.875rem 1.125rem', background: 'var(--marker-yellow)', borderRadius: 'var(--radius)' },
  reviewBadge:  { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' as const, color: 'var(--warn-text)' },
  reviewText:   { fontSize: '0.875rem', color: 'var(--warn-text)', lineHeight: 1.5 },
}
