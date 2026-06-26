import { redirect } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import { createClient } from '@/lib/supabase/server'
import { generateMethodologyChain } from '@/lib/prompts/methodology'
import MethodologyChainView from './MethodologyChain'
import type { Project, Theory } from '@/types/database'

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

  // Already done → dashboard
  if (ctx.methodology?.narrative) redirect(`/project/${params.id}`)

  // Load selected theories
  const { data: theories } = await supabase
    .from('theories')
    .select('*')
    .in('id', ctx.theories!.selected_ids)

  const selectedTheories = (theories ?? []) as Theory[]

  // Generate methodology chain from Claude
  const chain = await generateMethodologyChain(ctx, selectedTheories)

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <Logo size="sm" />
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
}
