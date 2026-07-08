import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { BuyIn, SeatRow, Session, SessionPlayer } from '../lib/types'

/** List of all sessions (newest first) + create. */
export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setSessions(data as Session[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const createSession = useCallback(
    async (name: string | null, playerIds: string[]): Promise<Session | null> => {
      const { data: session, error } = await supabase
        .from('sessions')
        .insert({ name: name?.trim() || null })
        .select()
        .single()
      if (error || !session) {
        setError(error?.message ?? 'Failed to create session')
        return null
      }
      if (playerIds.length > 0) {
        const rows = playerIds.map((player_id) => ({ session_id: session.id, player_id }))
        const { error: spErr } = await supabase.from('session_players').insert(rows)
        if (spErr) {
          setError(spErr.message)
          return null
        }
      }
      await load()
      return session as Session
    },
    [load],
  )

  const deleteSession = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('sessions').delete().eq('id', id)
      if (error) {
        setError(error.message)
        return
      }
      setSessions((prev) => prev.filter((s) => s.id !== id))
    },
    [],
  )

  const activeSession = sessions.find((s) => s.status === 'active') ?? null

  return { sessions, activeSession, loading, error, createSession, deleteSession, reload: load }
}

/** Full live data for a single session: seats joined with player + buy-ins. */
export function useSession(sessionId: string | undefined) {
  const [session, setSession] = useState<Session | null>(null)
  const [rows, setRows] = useState<SeatRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)

    const { data: sess, error: sErr } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
    if (sErr) {
      setError(sErr.message)
      setLoading(false)
      return
    }
    setSession(sess as Session)

    // One query for seats+players, one for buy-ins; stitched client-side.
    const { data: seats, error: spErr } = await supabase
      .from('session_players')
      .select('*, player:players(*)')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
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
        .order('created_at', { ascending: true })
      if (biErr) {
        setError(biErr.message)
        setLoading(false)
        return
      }
      buyIns = bi as BuyIn[]
    }

    const stitched: SeatRow[] = (seats ?? []).map((s: SessionPlayer & { player: SeatRow['player'] }) => ({
      seat: {
        id: s.id,
        session_id: s.session_id,
        player_id: s.player_id,
        buy_out: s.buy_out,
        created_at: s.created_at,
      },
      player: s.player,
      buyIns: buyIns.filter((b) => b.session_player_id === s.id),
    }))

    setRows(stitched)
    setLoading(false)
  }, [sessionId])

  useEffect(() => {
    load()
  }, [load])

  const addBuyIn = useCallback(
    async (seatId: string, amount: number) => {
      const { error } = await supabase
        .from('buy_ins')
        .insert({ session_player_id: seatId, amount })
      if (error) setError(error.message)
      else await load()
    },
    [load],
  )

  const setBuyOut = useCallback(
    async (seatId: string, amount: number | null) => {
      const { error } = await supabase
        .from('session_players')
        .update({ buy_out: amount })
        .eq('id', seatId)
      if (error) setError(error.message)
      else await load()
    },
    [load],
  )

  const addSeat = useCallback(
    async (playerId: string) => {
      if (!sessionId) return
      const { error } = await supabase
        .from('session_players')
        .insert({ session_id: sessionId, player_id: playerId })
      if (error) setError(error.message)
      else await load()
    },
    [sessionId, load],
  )

  const removeSeat = useCallback(
    async (seatId: string) => {
      const { error } = await supabase.from('session_players').delete().eq('id', seatId)
      if (error) setError(error.message)
      else await load()
    },
    [load],
  )

  const completeSession = useCallback(async () => {
    if (!sessionId) return
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', sessionId)
    if (error) setError(error.message)
    else await load()
  }, [sessionId, load])

  const reopenSession = useCallback(async () => {
    if (!sessionId) return
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'active', completed_at: null })
      .eq('id', sessionId)
    if (error) setError(error.message)
    else await load()
  }, [sessionId, load])

  const renameSession = useCallback(
    async (name: string) => {
      if (!sessionId) return
      const { error } = await supabase
        .from('sessions')
        .update({ name: name.trim() || null })
        .eq('id', sessionId)
      if (error) setError(error.message)
      else await load()
    },
    [sessionId, load],
  )

  const deleteSession = useCallback(async () => {
    if (!sessionId) return false
    const { error } = await supabase.from('sessions').delete().eq('id', sessionId)
    if (error) {
      setError(error.message)
      return false
    }
    return true
  }, [sessionId])

  return {
    session,
    rows,
    loading,
    error,
    addBuyIn,
    setBuyOut,
    addSeat,
    removeSeat,
    completeSession,
    reopenSession,
    renameSession,
    deleteSession,
    reload: load,
  }
}
