import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayers } from '../hooks/usePlayers'
import { useSessions } from '../hooks/useSessions'
import { PlayerRoster } from '../components/PlayerRoster'

export function Dashboard() {
  const navigate = useNavigate()
  const { players, addPlayer, removePlayer } = usePlayers()
  const { activeSession, createSession } = useSessions()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function start() {
    setBusy(true)
    const session = await createSession(name, [...selected])
    setBusy(false)
    if (session) navigate(`/session/${session.id}`)
  }

  return (
    <div className="grid-2">
      {activeSession && (
        <div className="panel col-span-all" style={{ borderColor: 'var(--accent-dim)' }}>
          <div className="row spread">
            <div>
              <h2 style={{ marginBottom: 2 }}>Game in progress</h2>
              <div className="muted">{activeSession.name || 'Untitled session'}</div>
            </div>
            <button className="primary" onClick={() => navigate(`/session/${activeSession.id}`)}>
              Resume
            </button>
          </div>
        </div>
      )}

      {!activeSession && (
        <div className="panel">
          <h2>New session</h2>
          <div className="field">
            <label htmlFor="sname">Name (optional)</label>
            <input
              id="sname"
              type="text"
              placeholder="e.g. Friday night"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <label>Who's playing?</label>
          {players.length === 0 ? (
            <p className="muted">Add players to your roster below first.</p>
          ) : (
            <div className="stack" style={{ marginBottom: '1rem' }}>
              {players.map((p) => (
                <label key={p.id} className="checkbox-row" style={{ background: 'var(--panel-2)' }}>
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          )}
          <button
            className="primary"
            disabled={busy || selected.size === 0}
            onClick={start}
            style={{ width: '100%' }}
          >
            {busy ? 'Starting…' : `Start game${selected.size ? ` (${selected.size})` : ''}`}
          </button>
        </div>
      )}

      <PlayerRoster
        players={players}
        onAdd={addPlayer}
        onRemove={removePlayer}
        className={activeSession ? 'col-span-all' : ''}
      />
    </div>
  )
}
