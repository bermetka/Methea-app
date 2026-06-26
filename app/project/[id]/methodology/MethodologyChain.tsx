'use client'

import { useState } from 'react'
import { saveMethodology } from './actions'
import type { MethodologyChain } from '@/lib/prompts/methodology'

const CHAIN_KEYS: { key: keyof MethodologyChain; label: string }[] = [
  { key: 'paradigm',       label: 'Paradigm' },
  { key: 'methodology',    label: 'Methodology' },
  { key: 'data_collection', label: 'Data collection' },
  { key: 'sample',         label: 'Sample' },
  { key: 'analysis_method', label: 'Analysis method' },
]

const WHY_KEYS: Record<string, keyof MethodologyChain> = {
  paradigm:        'paradigm_why',
  methodology:     'methodology_why',
  data_collection: 'data_collection_why',
  sample:          'sample_why',
  analysis_method: 'analysis_method_why',
}

interface Props {
  projectId: string
  chain: MethodologyChain
}

export default function MethodologyChainView({ projectId, chain }: Props) {
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleSave() {
    setSaving(true)
    const fd = new FormData()
    fd.append('projectId', projectId)
    fd.append('paradigm',        chain.paradigm)
    fd.append('methodology',     chain.methodology)
    fd.append('data_collection', chain.data_collection)
    fd.append('sample',          chain.sample)
    fd.append('analysis_method', chain.analysis_method)
    fd.append('narrative',       chain.narrative)
    await saveMethodology(fd)
  }

  async function handleCopy() {
    const text = [
      `Paradigm: ${chain.paradigm}`,
      `Methodology: ${chain.methodology}`,
      `Data collection: ${chain.data_collection}`,
      `Sample: ${chain.sample}`,
      `Analysis: ${chain.analysis_method}`,
      '',
      chain.narrative,
    ].join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={s.wrapper}>
      {/* Chain cards */}
      <div style={s.chain}>
        {CHAIN_KEYS.map(({ key, label }, i) => {
          const value = chain[key] as string
          const why   = chain[WHY_KEYS[key]!] as string
          return (
            <div key={key}>
              <div style={s.card}>
                <div style={s.cardTop}>
                  <div>
                    <p style={s.eyebrow}>◆ {label}</p>
                    <h3 style={s.cardTitle}>{value}</h3>
                  </div>
                </div>
                <p style={s.why}>{why}</p>
              </div>
              {i < CHAIN_KEYS.length - 1 && (
                <div style={s.connector}>
                  <div style={s.connectorLine} />
                  <span style={s.connectorArrow}>↓</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Methodology paragraph */}
      <div style={s.narrativeCard}>
        <p style={s.narrativeLabel}>Methodology paragraph</p>
        <p style={s.narrativeText}>{chain.narrative}</p>
      </div>

      {/* Actions */}
      <div style={s.actions}>
        <button type="button" onClick={handleCopy} style={s.ghostBtn}>
          {copied ? '✓ Copied' : '⧉ Copy'}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{ ...s.primaryBtn, ...(saving ? s.primaryBtnDisabled : {}) }}
        >
          {saving ? 'Saving…' : 'Save methodology →'}
        </button>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  wrapper:           { display: 'flex', flexDirection: 'column', gap: '1.5rem' },

  chain:             { display: 'flex', flexDirection: 'column' },
  card:              { background: 'var(--sheet)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  cardTop:           { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow:           { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--ink-blue)', marginBottom: '0.3rem' },
  cardTitle:         { fontSize: '1.125rem', fontWeight: 600, color: '#1C1C1C', lineHeight: 1.3, margin: 0 },
  why:               { fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '0.9375rem', lineHeight: 1.65, color: '#4A4A47', margin: 0 },

  connector:         { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.25rem 0', gap: '0' },
  connectorLine:     { width: '1.5px', height: '16px', background: 'var(--stone)' },
  connectorArrow:    { fontSize: '0.75rem', color: 'var(--pencil)', lineHeight: 1 },

  narrativeCard:     { background: 'var(--paper-deep)', border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' },
  narrativeLabel:    { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--pencil)' },
  narrativeText:     { fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--graphite)' },

  actions:           { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' },
  ghostBtn:          { padding: '0.625rem 1.25rem', border: '1px solid var(--stone)', borderRadius: 'var(--radius)', background: 'var(--sheet)', color: 'var(--graphite)', fontSize: '0.875rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' },
  primaryBtn:        { padding: '0.75rem 1.5rem', background: 'var(--ink-blue)', color: 'var(--sheet)', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.9375rem', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' },
  primaryBtnDisabled:{ background: 'var(--paper-deep)', color: 'var(--pencil)', cursor: 'default' },
}
