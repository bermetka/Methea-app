interface DoiVerified     { kind: 'doi_verified';     doi: string }
interface ClassicVerified { kind: 'classic_verified'; source: string }
interface Unverified      { kind: 'unverified' }

export type VerificationStatus = DoiVerified | ClassicVerified | Unverified

interface StatusChipProps {
  status: VerificationStatus
}

// State chip — icon only. Tooltip carries the full provenance detail.
// Rule: chips = state (icon); provenance text is rendered separately as a plain label.
export default function StatusChip({ status }: StatusChipProps) {
  const config = {
    doi_verified:     { bg: 'var(--mint)',       color: 'var(--moss)',   icon: '✓', tooltip: `DOI verified` },
    classic_verified: { bg: 'var(--mint)',       color: 'var(--moss)',   icon: '✓', tooltip: `Verified · classic text` },
    unverified:       { bg: 'var(--stone-soft)', color: 'var(--pencil)', icon: '?', tooltip: 'No DOI found — verify manually' },
  }[status.kind]

  const tooltip =
    status.kind === 'doi_verified'     ? `DOI verified: ${status.doi}` :
    status.kind === 'classic_verified' ? `Verified · source: ${status.source}` :
    'No DOI found — verify this source manually'

  return (
    <span
      title={tooltip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: config.bg,
        color: config.color,
        fontSize: '0.6875rem',
        fontWeight: 700,
        cursor: 'help',
        flexShrink: 0,
      }}
    >
      {config.icon}
    </span>
  )
}
