import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  const { data: top50 } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id, weekly_score, users(username)')
    .order('weekly_score', { ascending: false })
    .limit(50)

  const ranking = (top50 ?? []).map((row, i) => ({
    rank: i + 1,
    userId: row.user_id,
    username: (row.users as any)?.username ?? 'Jugador',
    weeklyScore: row.weekly_score,
    isMe: row.user_id === userId,
  }))

  let myPosition = null
  if (userId) {
    const myIndex = ranking.findIndex(r => r.userId === userId)
    if (myIndex === -1) {
      const { data: myProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('weekly_score')
        .eq('user_id', userId)
        .single()

      if (myProfile) {
        const { data: above } = await supabaseAdmin
          .from('user_profiles')
          .select('user_id')
          .gt('weekly_score', myProfile.weekly_score)

        myPosition = {
          rank: (above?.length ?? 0) + 1,
          weeklyScore: myProfile.weekly_score,
        }
      }
    }
  }

  return NextResponse.json({ ranking, myPosition })
}
