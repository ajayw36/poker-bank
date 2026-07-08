import { useState } from 'react'
import type { Player } from '../lib/types'

interface Props {
  players: Player[]
  onAdd: (name: string) => void
  onRemove: (id: string) => void
  className?: string
}

export function PlayerRoster({ players, onAdd, onRemove, className = '' }: Props) {
  const [name, setName] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onAdd(name)
    setName('')
  }

  return (
    <div className={`panel ${className}`.trim()}>
      <h2>Roster</h2>
      <form onSubmit={submit} className="row" style={{ marginBottom: '0.75rem' }}>
        <input
          type="text"
          placeholder="Add a player…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="felt" type="submit" disabled={!name.trim()}>
          Add
        </button>
      </form>
      {players.length === 0 ? (
        <p className="muted">No players yet. Add the people you play with.</p>
      ) : (
        <div className="stack">
          {players.map((p) => (
            <div key={p.id} className="list-item">
              <span>{p.name}</span>
              <button
                className="small danger"
                onClick={() => {
                  if (confirm(`Remove ${p.name} from your roster? Past sessions keep their data.`)) {
                    onRemove(p.id)
                  }
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
