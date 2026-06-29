import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Logo from '@/components/ui/Logo'
import UploadForm from './UploadForm'
import FindingsView from './FindingsView'

export const metadata = { title: 'Transcript analysis — Methea' }

export default async function AnalysisPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, research_context')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/projects')

  const ctx = project.research_context
  const findings = ctx?.findings

  return (
    <main style={s.page}>
      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <Logo size="sm" />
          <a href={`/project/${params.id}`} style={s.backLink}>← Back to project</a>
        </div>

        <div style={s.eyebrow}>Findings analysis</div>
        <h1 style={s.heading}>
          {findings ? 'Your coded transcript' : 'Upload a transcript'}
        </h1>

        {!findings && (
          <>
            <p style={s.sub}>
              Upload an interview transcript (.txt, .docx, or .pdf) and Methea will code it
              against your framework concepts, then surface themes and supporting quotes.
            </p>
            <p style={s.disclaimer}>
              Methea identifies patterns — you interpret what they mean. The findings view
              shows you themes and evidence; writing the analysis is yours.
            </p>
            <UploadForm projectId={params.id} />
          </>
        )}

        {findings && (
          <>
            <p style={s.sub}>
              {findings.themes.length} themes surfaced from your transcript, coded against your
              framework. {findings.gate3_completed
                ? `You confirmed ${findings.themes.filter(t => t.confirmed).length} of them.`
                : 'Review and confirm the ones that ring true.'}
            </p>
            <FindingsView
              projectId={params.id}
              themes={findings.themes}
              gate3Completed={findings.gate3_completed}
            />
            {findings.gate3_completed && (
              <div style={s.reuploadRow}>
                <p style={s.reuploadNote}>Want to analyse another transcript?</p>
                <UploadForm projectId={params.id} />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:      { minHeight: '100vh', background: 'var(--paper)', padding: '2rem 1rem 5rem' },
  container: { maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' },

  header:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' },
  backLink:  { fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink-blue)', textDecoration: 'none' },

  eyebrow:   { fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#8C8A82' },
  heading:   { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.75rem', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2, letterSpacing: '-0.02em', marginTop: '0.25rem' },
  sub:       { fontSize: '0.9375rem', color: 'var(--graphite)', lineHeight: 1.65 },
  disclaimer:{ fontSize: '0.8125rem', color: 'var(--pencil)', lineHeight: 1.6, padding: '0.75rem 1rem', background: 'var(--paper-deep)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)' },

  reuploadRow:{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--stone-soft)', display: 'flex', flexDirection: 'column', gap: '1rem' },
  reuploadNote:{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--graphite)' },
}
