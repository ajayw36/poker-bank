import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { BuyIn, Player, SessionPlayer } from '../lib/types'

export interface PlayerStat {
  player: Player
  sessions: number
  totalNet: number
}

/** Career profit/loss per player across all completed sessions. */
export function useStats() {
  const [stats, setStats] = useState<PlayerStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)

    const { data: players, error: pErr } = await supabase.from('players').select('*')
    if (pErr) {
      setError(pErr.message)
      setLoading(false)
      return
    }

    // Only completed sessions count toward career stats.
    const { data: completed, error: sErr } = await supabase
      .from('sessions')
      .select('id')
      .eq('status', 'completed')
    if (sErr) {
      setError(sErr.message)
      setLoading(false)
      return
    }
    const sessionIds = (completed ?? []).map((s) => s.id)

    const byPlayer = new Map<string, { sessions: number; totalNet: number }>()

    if (sessionIds.length > 0) {
      const { data: seats, error: spErr } = await supabase
        .from('session_players')
        .select('*')
        .in('session_id', sessionIds)
      if (spErr) {
        setError(spErr.message)
        setLoading(false)
        return
      }

      const seatIds = (seats ?? []).map((s: SessionPlayer) => s.id)
      let buyIns: BuyIn[] = []
      if (seatIds.length > 0) {
        const { data: bi, error: biErr } = await supabase
          .from('buy_ins')
          .select('*')
          .in('session_player_id', seatIds)
        if (biErr) {
          setError(biErr.message)
          setLoading(false)
          return
        }
        buyIns = bi as BuyIn[]
      }

      const buyInBySeat = new Map<string, number>()
      for (const b of buyIns) {
        buyInBySeat.set(b.session_player_id, (buyInBySeat.get(b.session_player_id) ?? 0) + Number(b.amount))
      }

      for (const seat of seats as SessionPlayer[]) {
        const net = (seat.buy_out ?? 0) - (buyInBySeat.get(seat.id) ?? 0)
        const cur = byPlayer.get(seat.player_id) ?? { sessions: 0, totalNet: 0 }
        cur.sessions += 1
        cur.totalNet += net
        byPlayer.set(seat.player_id, cur)
      }
    }

    const result: PlayerStat[] = (players as Player[]).map((player) => {
      const agg = byPlayer.get(player.id) ?? { sessions: 0, totalNet: 0 }
      return { player, sessions: agg.sessions, totalNet: agg.totalNet }
    })
    result.sort((a, b) => b.totalNet - a.totalNet)

    setStats(result)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { stats, loading, error, reload: load }
}
