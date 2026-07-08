import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSession } from '../hooks/useSessions'
import { usePlayers } from '../hooks/usePlayers'
import { SessionTable } from '../components/SessionTable'
import { SettleUp } from '../components/SettleUp'
import { allCashedOut, seatNets } from '../lib/calc'

function promptAmount(label: string, current?: number): number | null {
  const raw = window.prompt(label, current != null ? String(current) : '')
  if (raw === null) return null
  const val = Number(raw)
  if (!Number.isFinite(val) || val < 0) {
    alert('Please enter a valid non-negative number.')
    return null
  }
  return Math.round(val * 100) / 100
}

export function ActiveSession() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    session,
    rows,
    loading,
    addBuyIn,
    setBuyOut,
    addSeat,
    removeSeat,
    completeSession,
    reopenSession,
    renameSession,
    deleteSession,
  } = useSession(id)
  const { players } = usePlayers()
  const [addingId, setAddingId] = useState('')

  if (loading && !session) return <p className="muted">Loading…</p>
  if (!session) return <p className="muted">Session not found.</p>

  const completed = session.status === 'completed'
  const seatedIds = new Set(rows.map((r) => r.player.id))
  const availablePlayers = players.filter((p) => !seatedIds.has(p.id))
  const canSettle = allCashedOut(rows)
  const nets = seatNets(rows)

  async function handleBuyIn(seatId: string) {
    const amt = promptAmount('Buy-in / re-buy amount ($):')
    if (amt != null && amt > 0) await addBuyIn(seatId, amt)
  }

  async function handleCashOut(seatId: string) {
    const row = rows.find((r) => r.seat.id === seatId)
    const amt = promptAmount('Cash-out (chip stack) amount ($):', row?.seat.buy_out ?? undefined)
    if (amt != null) await setBuyOut(seatId, amt)
  }

  async function handleAddPlayer() {
    if (!addingId) return
    await addSeat(addingId)
    setAddingId('')
  }

  async function handleEnd() {
    if (!confirm('End the game and settle up? You can still edit it afterward.')) return
    await completeSession()
  }

  async function handleRename() {
    const name = window.prompt('Session name:', session?.name ?? '')
    if (name !== null) await renameSession(name)
  }

  async function handleReopen() {
    if (!confirm('Reopen this session for editing? It will move back to your live game.')) return
    await reopenSession()
  }

  async function handleDelete() {
    if (!confirm('Delete this session permanently? This cannot be undone.')) return
    const ok = await deleteSession()
    if (ok) navigate('/')
  }

  return (
    <div>
      <div className="row spread" style={{ marginBottom: '1rem' }}>
        <div>
          <div className="row" style={{ gap: '0.5rem' }}>
            <h1 style={{ marginBottom: 2 }}>{session.name || 'Session'}</h1>
            <button className="small" onClick={handleRename} title="Rename">
              ✎
            </button>
          </div>
          <span className={`tag ${completed ? 'done' : ''}`}>{completed ? 'Completed' : 'Live'}</span>
        </div>
        <button className="small" onClick={() => navigate('/')}>
          ← Home
        </button>
      </div>

      <div className="split">
        <div>
          <div className="panel">
            <h2>Ledger</h2>
            {rows.length === 0 ? (
              <p className="muted">No players in this session yet.</p>
            ) : (
              <SessionTable
                rows={rows}
                editable={!completed}
                onBuyIn={handleBuyIn}
                onCashOut={handleCashOut}
                onRemoveSeat={rows.length > 0 && !completed ? removeSeat : undefined}
              />
            )}

            {!completed && availablePlayers.length > 0 && (
              <div className="row" style={{ marginTop: '1rem' }}>
                <select
                  value={addingId}
                  onChange={(e) => setAddingId(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#0d0d0d',
                    color: 'var(--text)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: 10,
                    padding: '0.55rem 0.7rem',
                    font: 'inherit',
                  }}
                >
                  <option value="">Add a player…</option>
                  {availablePlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button className="felt" onClick={handleAddPlayer} disabled={!addingId}>
                  Add
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          {!completed ? (
            <div className="panel">
              <h2>End game</h2>
              {!canSettle && (
                <p className="muted" style={{ marginTop: 0 }}>
                  Cash out every player to end the game and settle up.
                </p>
              )}
              <button
                className="primary"
                disabled={!canSettle}
                onClick={handleEnd}
                style={{ width: '100%' }}
              >
                End game &amp; settle
              </button>
            </div>
          ) : (
            <SettleUp nets={nets} />
          )}

          <div className="panel">
            <h2>Manage session</h2>
            <div className="btn-row">
              {completed && (
                <button className="felt" onClick={handleReopen}>
                  Reopen to edit
                </button>
              )}
              <button className="danger" onClick={handleDelete}>
                Delete session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
