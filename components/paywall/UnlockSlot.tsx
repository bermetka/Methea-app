import UnlockButton from './UnlockButton'
import type { UnlockInfo } from '@/lib/pricing'

// Where an unlock button goes: the checkout button, or — once a paid project's
// access window has ended — a notice, since paying again can't re-unlock it.
export default function UnlockSlot({ projectId, unlock, compact }: {
  projectId: string
  unlock: UnlockInfo
  compact?: boolean
}) {
  if (unlock.kind === 'expired') {
    return <p style={s.expired}>Your access to this project ended on {unlock.endedOn}. It stays viewable.</p>
  }
  const { kind: _kind, ...checkout } = unlock
  return <UnlockButton projectId={projectId} checkout={checkout} compact={compact} />
}

const s: Record<string, React.CSSProperties> = {
  expired: { fontSize: '0.875rem', color: 'var(--pencil)', lineHeight: 1.5 },
}
