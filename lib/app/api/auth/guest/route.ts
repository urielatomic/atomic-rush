import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export async function POST() {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({ is_guest: true })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabaseAdmin
    .from('user_profiles')
    .insert({ user_id: user.id })

  return NextResponse.json({ userId: user.id })
}
