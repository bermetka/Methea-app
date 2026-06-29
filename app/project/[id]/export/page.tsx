import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ExportView from './ExportView'
import type { Project, Theory } from '@/types/database'

export async function generateMetadata() {
  return { title: 'Export proposal — Methea' }
}

export default async function ExportPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!project) notFound()

  const p   = project as Project
  const ctx = p.research_context

  if (!ctx?.brief) redirect(`/project/${params.id}`)

  const selectedIds = ctx.theories?.selected_ids ?? []

  const { data: theories } = await supabase
    .from('theories')
    .select('id, name, author, year')
    .in('id', selectedIds.length ? selectedIds : ['__none__'])

  return (
    <ExportView
      projectId={params.id}
      ctx={ctx}
      theories={(theories ?? []) as Pick<Theory, 'id' | 'name' | 'author' | 'year'>[]}
    />
  )
}
