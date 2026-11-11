import Logo from '@/components/ui/Logo'

/** Header for a guest (no account yet): logo and a "not saved yet" badge, no links into the app. */
export default function GuestHeader() {
  return (
    <header style={s.header}>
      <div style={s.row}>
        <Logo size="sm" />
        <span style={s.badge}>Guest · not saved yet</span>
      </div>
    </header>
  )
}

const s: Record<string, React.CSSProperties> = {
  header: { maxWidth: 720, margin: '0 auto', padding: '16px 20px 12px', borderBottom: '1px solid var(--stone)' },
  row:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  badge:  { fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink)', background: 'var(--marker-lime)', padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap' },
}
