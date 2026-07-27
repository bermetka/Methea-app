import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isProjectPaid } from '@/lib/entitlement'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ paid: false }, { status: 401 })

  const { data: project } = await supabase
    .from('projects')
    .select('paid_at')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ paid: false }, { status: 404 })

  return NextResponse.json({ paid: isProjectPaid(project) })
}
