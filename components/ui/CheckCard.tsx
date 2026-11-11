'use client'

interface CheckOption {
  value: string
  title: string
  description: string
}

interface CheckCardProps {
  option: CheckOption
  selected: boolean
  onSelect: () => void
}

export default function CheckCard({ option, selected, onSelect }: CheckCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        width: '100%',
        padding: '1rem 1.25rem',
        background: 'var(--sheet)',
        border: `1px solid ${selected ? 'var(--ink-blue)' : 'var(--stone-soft)'}`,
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 0.1s',
      }}
      role="checkbox"
      aria-checked={selected}
    >
      <span style={{
        flexShrink: 0,
        marginTop: '3px',
        width: '16px',
        height: '16px',
        borderRadius: "4px",
        border: `2px solid ${selected ? 'var(--ink-blue)' : 'var(--stone)'}`,
        background: selected ? 'var(--ink-blue)' : 'transparent',
        color: 'var(--sheet)',
        fontSize: '11px',
        lineHeight: '12px',
        textAlign: 'center',
        fontWeight: 700,
      }} aria-hidden="true">{selected ? '✓' : ''}</span>
      <div>
        <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ink)', marginBottom: '0.25rem' }}>
          {option.title}
        </p>
        <p style={{ fontSize: '0.875rem', color: 'var(--graphite)', lineHeight: 1.5 }}>
          {option.description}
        </p>
      </div>
    </button>
  )
}
