import { redirect } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import { createClient } from '@/lib/supabase/server'
import { generateInterviewGuide } from '@/lib/prompts/interview'
import InterviewGuideView from './InterviewGuide'
import type { Project, Theory } from '@/types/database'

export const metadata = { title: 'Interview guide — Methea' }

export default async function InterviewGuidePage({ params }: { params: { id: string } }) {
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

  // Guard: must have methodology before interview guide
  if (!ctx?.methodology?.narrative) redirect(`/project/${params.id}/methodology`)

  const { data: theories } = await supabase
    .from('theories')
    .select('*')
    .in('id', ctx.theories!.selected_ids)

  const selectedTheories = (theories ?? []) as Theory[]

  // Use saved questions if they exist, otherwise generate
  const questions = ctx.interview_guide?.questions?.length
    ? ctx.interview_guide.questions
    : await generateInterviewGuide(ctx, selectedTheories)

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <Logo size="sm" />
        <div style={styles.header}>
          <h2 style={styles.heading}>Your interview guide</h2>
          <p style={styles.sub}>
            {questions.length} questions, each anchored to your framework.
          </p>
        </div>
        <InterviewGuideView
          projectId={params.id}
          questions={questions}
          theories={selectedTheories.map(t => ({ id: t.id, name: t.name }))}
        />
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page:      { minHeight: '100vh', padding: '2.5rem 1rem', background: 'var(--paper)' },
  container: { width: '100%', maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' },
  header:    { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  heading:   { fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 400, letterSpacing: '-0.015em', color: 'var(--ink)', lineHeight: 1.2 },
  sub:       { fontSize: '0.9375rem', color: 'var(--pencil)' },
}
