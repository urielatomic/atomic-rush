import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

function getWeekPeriod() {
  const now = new Date()
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function getMonthPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const MULTIPLIERS: Record<string, number> = {
  'target-switch': 10,
  'slice-rush': 8,
}

export async function POST(req: NextRequest) {
  const { userId, gameId, rawScore } = await req.json()

  if (!userId || !gameId || rawScore === undefined) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  const multiplier = MULTIPLIERS[gameId] ?? 10
  const pointsAwarded = Math.floor(rawScore * multiplier)
  const weekPeriod = getWeekPeriod()
  const monthPeriod = getMonthPeriod()

  // Guardar score
  await supabaseAdmin.from('game_scores').insert({
    user_id: userId,
    game_id: gameId,
    raw_score: rawScore,
    points_awarded: pointsAwarded,
    week_period: weekPeriod,
    month_period: monthPeriod,
  })

  // Actualizar perfil
  await supabaseAdmin.rpc('increment_profile', {
    p_user_id: userId,
    p_points: pointsAwarded,
  })

  // Actualizar mejor score
  await supabaseAdmin.from('best_scores').upsert({
    user_id: userId,
    game_id: gameId,
    best_score: rawScore,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,game_id', ignoreDuplicates: false })

  // Obtener ranking
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('weekly_score')
    .eq('user_id', userId)
    .single()

  const { data: rankData } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id')
    .gt('weekly_score', profile?.weekly_score ?? 0)

  const weeklyRank = (rankData?.length ?? 0) + 1

  const { data: top5 } = await supabaseAdmin
    .from('user_profiles')
    .select('weekly_score')
    .order('weekly_score', { ascending: false })
    .limit(5)

  const top5Score = top5?.[4]?.weekly_score ?? 0
  const distanceToTop5 = weeklyRank > 5
    ? Math.max(0, top5Score - (profile?.weekly_score ?? 0) + 1)
    : null

  return NextResponse.json({
    pointsAwarded,
    weeklyScore: profile?.weekly_score ?? pointsAwarded,
    weeklyRank,
    distanceToTop5,
  })
}
