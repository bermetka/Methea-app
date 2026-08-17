import { redirect } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import { createClient } from '@/lib/supabase/server'
import { generateMethodologyChain } from '@/lib/prompts/methodology'
import { resolveProjectTheories } from '@/lib/project-theories'
import MethodologyChainView from './MethodologyChain'
import type { Project } from '@/types/database'

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

  // Load selected theories — library + the student's own (custom) theories, merged.
  const selectedTheories = await resolveProjectTheories(ctx, ctx.theories!.selected_ids, supabase)

  // Soft-invalidation: regenerate when marked ⚠ outdated by an upstream change, otherwise
  // reuse the saved chain. Saving clears the flag (methodology/actions.ts).
  const isOutdated = (ctx.outdated_blocks ?? []).includes('methodology')
  const chain = (!isOutdated && ctx.methodology?.narrative)
    ? ctx.methodology as unknown as import('@/lib/prompts/methodology').MethodologyChain
    : await generateMethodologyChain(ctx, selectedTheories)

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <Logo size="sm" />
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
