'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { enforceFreeProjectCap } from '@/lib/project-cap'

export async function createFirstProject(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await enforceFreeProjectCap(supabase, user.id)

  const title = (formData.get('title') as string)?.trim() || 'My research project'

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      title,
      research_context: { version: 1, outdated_blocks: [] },
      context_version: 1,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  redirect(`/project/${project.id}`)
}
