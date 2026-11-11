import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findGuestProject, guestProjectPath } from '@/lib/guest'

// Pages that need an account send guests here: back to their one project —
// the save screen if Gate 1 is done, else the brief.
export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.redirect(`${origin}/login`)
  if (!user.is_anonymous) return NextResponse.redirect(`${origin}/projects`)

  const project = await findGuestProject(supabase, user.id)
  if (!project) return NextResponse.redirect(`${origin}/check`)
  // Gave their email already: carry on in the project (only checkout waits for the confirmation).
  if (user.new_email && project.gate1Done) return NextResponse.redirect(`${origin}/project/${project.id}`)
  return NextResponse.redirect(`${origin}${guestProjectPath(project.id, project.gate1Done)}`)
}
