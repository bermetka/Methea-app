'use client'

interface RadioOption {
  value: string
  title: string
  description: string
}

interface RadioCardProps {
  option: RadioOption
  selected: boolean
  onSelect: () => void
}

export default function RadioCard({ option, selected, onSelect }: RadioCardProps) {
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
      aria-pressed={selected}
    >
      <span style={{
        flexShrink: 0,
        marginTop: '3px',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        border: `2px solid ${selected ? 'var(--ink-blue)' : 'var(--stone)'}`,
        background: selected ? 'var(--ink-blue)' : 'transparent',
        boxShadow: selected ? 'inset 0 0 0 3px var(--sheet)' : 'none',
      }} />
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
