import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Project } from '@/types/database'

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: 'Project — Methea' }
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!project) notFound()

  const p = project as Project

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <span style={styles.wordmark}>Methea</span>
        <h1 style={styles.heading}>{p.title}</h1>
        <p style={styles.status}>
          Project created. Sprint 1 UI coming next — brief upload and research question refinement.
        </p>
        <div style={styles.contextBox}>
          <p style={styles.contextLabel}>research_context (v{p.context_version})</p>
          <pre style={styles.pre}>{JSON.stringify(p.research_context, null, 2)}</pre>
        </div>
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    padding: '3rem 1rem',
  },
  container: {
    width: '100%',
    maxWidth: '720px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  wordmark: {
    fontFamily: 'Playfair Display, Georgia, serif',
    fontSize: '1.25rem',
    fontWeight: 600,
    letterSpacing: '-0.045em',
    color: 'var(--ink)',
  },
  heading: {
    fontSize: '2rem',
    color: 'var(--ink)',
  },
  status: {
    fontSize: '0.9375rem',
    color: 'var(--text-muted)',
    padding: '0.75rem 1rem',
    background: 'var(--paper-dark)',
    borderRadius: 'var(--radius)',
  },
  contextBox: {
    border: '1px solid var(--paper-dark)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
  },
  contextLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    padding: '0.5rem 0.75rem',
    background: 'var(--paper-dark)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  pre: {
    fontSize: '0.8125rem',
    padding: '1rem',
    overflowX: 'auto',
    color: 'var(--ink-mid)',
    lineHeight: 1.6,
  },
}
