import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSession } from '../hooks/useSessions'
import { usePlayers } from '../hooks/usePlayers'
import { SessionTable } from '../components/SessionTable'
import { SettleUp } from '../components/SettleUp'
import { AmountModal, type AmountRequest } from '../components/AmountModal'
import { useDialogs } from '../components/Dialogs'
import { allCashedOut, seatNets, totalBuyIn } from '../lib/calc'

export function ActiveSession() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    session,
    rows,
    loading,
    addBuyIn,
    editBuyIn,
    deleteBuyIn,
    setBuyOut,
    addSeat,
    removeSeat,
    completeSession,
    reopenSession,
    renameSession,
    deleteSession,
  } = useSession(id)
  const { players } = usePlayers()
  const { confirm, promptText } = useDialogs()
  const [addingId, setAddingId] = useState('')
  const [amountReq, setAmountReq] = useState<AmountRequest | null>(null)

  if (loading && !session) return <p className="muted">Loading…</p>
  if (!session) return <p className="muted">Session not found.</p>

  const completed = session.status === 'completed'
  const seatedIds = new Set(rows.map((r) => r.player.id))
  const availablePlayers = players.filter((p) => !seatedIds.has(p.id))
  const canSettle = allCashedOut(rows)
  const nets = seatNets(rows)

  // Distinct buy-in amounts already used this session, for one-tap re-buys.
  const buyInPresets = [
    ...new Set(rows.flatMap((r) => r.buyIns.map((b) => b.amount))),
  ]
    .sort((a, b) => a - b)
    .slice(0, 4)

  function handleBuyIn(seatId: string) {
    const row = rows.find((r) => r.seat.id === seatId)
    setAmountReq({
      title: `Buy-in — ${row?.player.name ?? 'player'}`,
      hint: 'Amount added to the table (buy-in or re-buy).',
      presets: buyInPresets,
      confirmLabel: 'Add buy-in',
      onConfirm: (amt) => addBuyIn(seatId, amt),
    })
  }

  function handleEditBuyIn(buyInId: string, current: number) {
    setAmountReq({
      title: 'Edit buy-in',
      hint: 'Correct the amount, or remove this buy-in entirely.',
      initial: current,
      presets: buyInPresets,
      onConfirm: (amt) => editBuyIn(buyInId, amt),
      onRemove: () => deleteBuyIn(buyInId),
    })
  }

  function handleCashOut(seatId: string) {
    const row = rows.find((r) => r.seat.id === seatId)
    setAmountReq({
      title: `Cash out — ${row?.player.name ?? 'player'}`,
      hint: 'Chip stack the player is leaving with. Enter 0 if they busted.',
      initial: row?.seat.buy_out ?? undefined,
      presets: row ? [totalBuyIn(row.buyIns)] : undefined,
      allowZero: true,
      confirmLabel: 'Save cash-out',
      onConfirm: (amt) => setBuyOut(seatId, amt),
    })
  }

  async function handleAddPlayer() {
    if (!addingId) return
    await addSeat(addingId)
    setAddingId('')
  }

  async function handleEnd() {
    const ok = await confirm({
      title: 'End game & settle?',
      message: 'You can still reopen and edit it afterward.',
      confirmLabel: 'End game',
    })
    if (ok) await completeSession()
  }

  async function handleRename() {
    const name = await promptText({
      title: 'Rename session',
      initial: session?.name ?? '',
      placeholder: 'Session name',
      allowEmpty: true,
    })
    if (name !== null) await renameSession(name)
  }

  async function handleReopen() {
    const ok = await confirm({
      title: 'Reopen session?',
      message: 'It will move back to your live game so you can edit it.',
      confirmLabel: 'Reopen',
    })
    if (ok) await reopenSession()
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Delete session?',
      message: 'This permanently deletes the session and its ledger. This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    const deleted = await deleteSession()
    if (deleted) navigate('/')
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

      <div className="stack">
        <div className="panel">
          <h2>Ledger</h2>
            {rows.length === 0 ? (
              <p className="muted">No players in this session yet.</p>
            ) : (
              <SessionTable
                rows={rows}
                editable={!completed}
                onBuyIn={handleBuyIn}
                onEditBuyIn={handleEditBuyIn}
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

      {amountReq && <AmountModal request={amountReq} onClose={() => setAmountReq(null)} />}
    </div>
  )
}
