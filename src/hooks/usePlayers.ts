import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Player } from '../lib/types'

export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('name', { ascending: true })
    if (error) setError(error.message)
    else setPlayers(data as Player[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const addPlayer = useCallback(
    async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      const { data, error } = await supabase
        .from('players')
        .insert({ name: trimmed })
        .select()
        .single()
      if (error) {
        setError(error.message)
        return
      }
      setPlayers((prev) => [...prev, data as Player].sort((a, b) => a.name.localeCompare(b.name)))
    },
    [],
  )

  const removePlayer = useCallback(async (id: string) => {
    const { error } = await supabase.from('players').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    setPlayers((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return { players, loading, error, addPlayer, removePlayer, reload: load }
}
