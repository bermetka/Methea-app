import UnlockSlot from './UnlockSlot'
import type { UnlockInfo } from '@/lib/pricing'

// Shown above already generated content on an unpaid (or expired) project:
// it stays viewable, but regenerating, editing and exporting need an unlock.
export default function ViewOnlyNotice({ projectId, unlock, outdated }: {
  projectId: string
  unlock: UnlockInfo
  outdated?: boolean
}) {
  return (
    <div style={s.card}>
      <p style={s.eyebrow}>View only</p>
      <p style={s.text}>
        {outdated
          ? 'Something upstream changed since this was generated, so it may no longer match your framework. '
          : ''}
        You can read everything generated so far. Unlock this project to regenerate, edit and export it.
      </p>
      <UnlockSlot projectId={projectId} unlock={unlock} />
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  card:    { display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.875rem 1.125rem', background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)' },
  eyebrow: { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' as const, color: 'var(--pencil)' },
  text:    { fontSize: '0.875rem', color: 'var(--graphite)', lineHeight: 1.5 },
}
