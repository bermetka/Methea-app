'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateResearchContext } from '@/lib/research-context'

export async function saveMethodology(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectId      = formData.get('projectId') as string
  const paradigm       = formData.get('paradigm') as string
  const methodology    = formData.get('methodology') as string
  const dataCollection = formData.get('data_collection') as string
  const sample         = formData.get('sample') as string
  const analysisMethod = formData.get('analysis_method') as string
  const narrative      = formData.get('narrative') as string

  await updateResearchContext(
    projectId,
    'methodology',
    {
      methodology: {
        paradigm,
        methodology,
        data_collection: dataCollection,
        sample,
        analysis_method: analysisMethod,
        narrative,
      },
    },
    supabase
  )

  redirect(`/project/${projectId}`)
}
