import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BriefForm from '@/app/project/[id]/brief/BriefForm'

// The brief's server action runs Claude on this route when the topic is submitted.
export const maxDuration = 60

export const metadata = { title: "Tell me what you're researching — Methea", robots: { index: false } }

/**
 * /go/topic — where /go/brief sends a new visitor from an ad: the first step of
 * the brief, with nothing created yet. The guest account and the project are made
 * when they submit a topic (submitBrief without a projectId). Anyone already
 * signed in, guest or not, goes back through /go/brief to their project.
 */
export default async function GoTopicPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/go/brief')

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <p style={styles.eyebrow}>Step 1 of 3 · Your topic</p>
          <h1 style={styles.heading}>What are you researching?</h1>
          <p style={styles.sub}>A sentence or two is enough. Methea asks three quick questions next and sharpens it into a research question.</p>
        </div>
        <BriefForm quick />
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page:      { minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2.5rem 1rem', background: 'var(--paper)' },
  container: { width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  header:    { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', gap: '0.5rem' },
  eyebrow:   { fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-blue)' },
  heading:   { margin: 0, fontFamily: "'Schibsted Grotesk', system-ui, sans-serif", fontSize: 'clamp(1.75rem, 6vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1.15 },
  sub:       { fontSize: '1rem', lineHeight: 1.55, color: 'var(--graphite)' },
}
