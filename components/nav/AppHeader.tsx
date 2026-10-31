import Logo from '@/components/ui/Logo'
import AccountMenu from './AccountMenu'
import StepNav from './StepNav'
import { projectSteps } from '@/lib/project-steps'
import type { ResearchContext } from '@/types/database'

interface Props {
  email: string
  upgrade?: boolean
  project?: { id: string; title: string | null; ctx: ResearchContext | null }
}

/** One header for every signed-in page: home, where you are, your account. */
export default function AppHeader({ email, upgrade = false, project }: Props) {
  return (
    <header style={s.header}>
      <div style={s.row}>
        <div style={s.left}>
          <a href="/projects" aria-label="Methea — My projects" style={s.logoLink}>
            <Logo size="sm" />
          </a>
          {project && (
            <nav aria-label="Breadcrumb" style={s.crumbs}>
              <a href="/projects" style={s.crumbLink}>My projects</a>
              <span aria-hidden="true" style={s.sep}>/</span>
              <a href={`/project/${project.id}`} style={s.crumbCurrent}>
                {project.title || 'Untitled project'}
              </a>
            </nav>
          )}
        </div>
        <AccountMenu email={email} upgrade={upgrade} />
      </div>
      {project && <StepNav projectId={project.id} steps={projectSteps(project.ctx, project.id)} />}
    </header>
  )
}

const s: Record<string, React.CSSProperties> = {
  header:      { maxWidth: 720, margin: '0 auto', padding: '16px 20px 12px', display: 'flex', flexDirection: 'column', gap: 12, borderBottom: '1px solid var(--stone)' },
  row:         { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  left:        { display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 },
  logoLink:    { textDecoration: 'none', flexShrink: 0 },
  crumbs:      { display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', minWidth: 0 },
  crumbLink:   { color: 'var(--graphite)', whiteSpace: 'nowrap' },
  sep:         { color: 'var(--pencil)' },
  crumbCurrent:{ color: 'var(--ink)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
}
