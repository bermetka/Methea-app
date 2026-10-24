import UnlockButton from './UnlockButton'
import type { UnlockInfo } from '@/lib/pricing'

// Where an unlock button goes. Expired projects get the same checkout: paying
// again starts a new 6-month window (see the Paddle webhook).
export default function UnlockSlot({ projectId, unlock, compact }: {
  projectId: string
  unlock: UnlockInfo
  compact?: boolean
}) {
  const { kind: _kind, ...checkout } = unlock
  return <UnlockButton projectId={projectId} checkout={checkout} compact={compact} />
}
