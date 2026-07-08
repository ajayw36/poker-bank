import { Link } from 'react-router-dom'
import { useSessions } from '../hooks/useSessions'
import { useStats } from '../hooks/useStats'
import { signedMoney } from '../lib/calc'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function History() {
  const { sessions, deleteSession } = useSessions()
  const { stats, reload: reloadStats } = useStats()

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}" permanently? This cannot be undone.`)) return
    await deleteSession(id)
    await reloadStats()
  }

  const completed = sessions.filter((s) => s.status === 'completed')
  const played = stats.filter((s) => s.sessions > 0)

  return (
    <div className="grid-2">
      <div className="panel">
        <h2>Player stats</h2>
        {played.length === 0 ? (
          <p className="muted">No completed sessions yet.</p>
        ) : (
          <table className="ledger">
            <thead>
              <tr>
                <th>Player</th>
                <th>Sessions</th>
                <th>Net P/L</th>
              </tr>
            </thead>
            <tbody>
              {played.map((s) => (
                <tr key={s.player.id}>
                  <td>{s.player.name}</td>
                  <td className="mono">{s.sessions}</td>
                  <td className={`mono ${s.totalNet > 0 ? 'pos' : s.totalNet < 0 ? 'neg' : ''}`}>
                    {signedMoney(s.totalNet)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h2>Past sessions</h2>
        {completed.length === 0 ? (
          <p className="muted">Completed games will show up here.</p>
        ) : (
          <div className="stack">
            {completed.map((s) => (
              <div key={s.id} className="list-item">
                <Link
                  to={`/session/${s.id}`}
                  style={{ flex: 1, color: 'inherit', display: 'block' }}
                >
                  <strong style={{ color: 'var(--text)' }}>{s.name || 'Session'}</strong>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>
                    {formatDate(s.completed_at ?? s.created_at)}
                  </div>
                </Link>
                <button
                  className="small danger"
                  onClick={() => handleDelete(s.id, s.name || 'Session')}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
