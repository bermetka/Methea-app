interface DoiVerified     { kind: 'doi_verified';     doi: string }
interface ClassicVerified { kind: 'classic_verified'; source: string }
interface Unverified      { kind: 'unverified' }

export type VerificationStatus = DoiVerified | ClassicVerified | Unverified

interface StatusChipProps {
  status: VerificationStatus
}

export default function StatusChip({ status }: StatusChipProps) {
  const config = {
    doi_verified:     { bg: 'var(--marker-green)', text: 'var(--verified-text)', icon: '✓', label: 'Verified · DOI found' },
    classic_verified: { bg: 'var(--marker-green)', text: 'var(--verified-text)', icon: '✓', label: 'Verified · Classic text' },
    unverified:       { bg: 'var(--stone-soft)',   text: 'var(--pencil)',        icon: '?', label: 'Unverified — check manually' },
  }[status.kind]

  const tooltip =
    status.kind === 'doi_verified'     ? `DOI: ${status.doi}` :
    status.kind === 'classic_verified' ? `Source: ${status.source}` :
    'No DOI found — verify this source manually'

  return (
    <span
      title={tooltip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '2px 8px',
        background: config.bg,
        color: config.text,
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.75rem',
        fontWeight: 500,
        cursor: 'help',
      }}
    >
      {config.icon} {config.label}
    </span>
  )
}
