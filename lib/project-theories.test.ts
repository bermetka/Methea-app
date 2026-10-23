import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProjectTheories } from './project-theories'
import type { CustomTheory, ResearchContext, Theory } from '@/types/database'

const libraryTheory: Theory = {
  id: 'lib-1',
  name: 'Technology Acceptance Model',
  author: 'Davis',
  year: 1989,
  summary: '',
  concepts: [],
  disciplines: [],
  doi: null,
  openalex_id: null,
  created_at: '',
}

const customTheory: CustomTheory = {
  id: 'custom:abc',
  name: 'My Own Lens',
  author: 'Student',
  year: 2021,
  summary: 'A theory the student brought',
  concepts: ['trust'],
  disciplines: [],
  doi: null,
  verification: 'unverified',
  added_by_user: true,
  source_citation: 'Student (2021)',
}

// Minimal stand-in for supabase.from('theories').select('*').in('id', ids)
function fakeSupabase(rows: Theory[]) {
  const queried: string[][] = []
  const client = {
    from: () => ({
      select: () => ({
        in: async (_col: string, ids: string[]) => {
          queried.push(ids)
          return { data: rows.filter(r => ids.includes(r.id)) }
        },
      }),
    }),
  } as unknown as SupabaseClient
  return { client, queried }
}

describe('resolveProjectTheories', () => {
  it('merges custom and library theories, in selected order', async () => {
    const ctx = { theories: { custom_theories: [customTheory] } } as unknown as ResearchContext
    const { client, queried } = fakeSupabase([libraryTheory])

    const result = await resolveProjectTheories(ctx, ['custom:abc', 'lib-1'], client)

    expect(result.map(t => t.id)).toEqual(['custom:abc', 'lib-1'])
    expect(result[0].name).toBe('My Own Lens')
    // Custom ids never hit the theories table
    expect(queried).toEqual([['lib-1']])
  })

  it('returns a custom-only selection without querying the table', async () => {
    const ctx = { theories: { custom_theories: [customTheory] } } as unknown as ResearchContext
    const { client, queried } = fakeSupabase([])

    const result = await resolveProjectTheories(ctx, ['custom:abc'], client)

    expect(result.map(t => t.name)).toEqual(['My Own Lens'])
    expect(queried).toEqual([])
  })
})

// Guard: every project page that uses selected theories must resolve them through
// resolveProjectTheories, or the student's custom theories silently disappear.
describe('project pages resolve theories through resolveProjectTheories', () => {
  const pages = [
    'app/project/[id]/page.tsx',
    'app/project/[id]/framework/page.tsx',
    'app/project/[id]/methodology/page.tsx',
    'app/project/[id]/interview-guide/page.tsx',
    'app/project/[id]/export/page.tsx',
  ]

  it.each(pages)('%s', page => {
    const source = readFileSync(path.resolve(__dirname, '..', page), 'utf8')
    expect(source).toContain('resolveProjectTheories(')
    expect(source).not.toMatch(/from\(['"]theories['"]\)/)
  })
})
