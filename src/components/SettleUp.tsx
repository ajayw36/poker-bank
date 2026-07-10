import { useState } from 'react'
import { settle, ledgerImbalance, combineNets, applyPayments, groupKey } from '../lib/settle'
import { money, signedMoney } from '../lib/calc'
import type { Net, Payment } from '../lib/types'

export function SettleUp({ nets }: { nets: Net[] }) {
  const [groups, setGroups] = useState<string[][]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [paid, setPaid] = useState<Payment[]>([])
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [copied, setCopied] = useState(false)

  const imbalance = ledgerImbalance(nets)
  const balanced = Math.abs(imbalance) < 0.01

  const effectiveNets = combineNets(nets, groups)
  // Only keep recorded payments whose parties still exist (a grouping change can
  // orphan them); the rest are dropped so remaining math stays consistent.
  const idSet = new Set(effectiveNets.map((n) => n.playerId))
  const recorded = paid.filter((p) => idSet.has(p.fromId) && idSet.has(p.toId))
  const remainingNets = applyPayments(effectiveNets, recorded)
  const payments = settle(remainingNets)

  const nameOf = (id: string) => effectiveNets.find((n) => n.playerId === id)?.name ?? id

  const groupedIds = new Set(groups.flat())
  const ungrouped = nets.filter((n) => !groupedIds.has(n.playerId))

  function markPaid(p: Payment) {
    setPaid((prev) => [...prev, p])
  }

  function undoPaid(index: number) {
    const target = recorded[index]
    setPaid((prev) => prev.filter((p) => p !== target))
  }

  async function copyPayments() {
    const text = payments.map((p) => `${p.from} → ${p.to}: ${money(p.amount)}`).join('\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback for browsers/contexts without the async clipboard API.
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  function recordManual() {
    const amount = Math.round(Number(amountStr) * 100) / 100
    if (!fromId || !toId || fromId === toId) return
    if (!Number.isFinite(amount) || amount <= 0) return
    markPaid({ fromId, from: nameOf(fromId), toId, to: nameOf(toId), amount })
    setFromId('')
    setToId('')
    setAmountStr('')
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function combineSelected() {
    if (selected.size < 2) return
    setGroups((prev) => [...prev, [...selected]])
    setSelected(new Set())
  }

  function ungroup(key: string) {
    setGroups((prev) => prev.filter((ids) => groupKey(ids) !== key))
  }

  return (
    <>
      <div className="panel">
        <h2>Combine players</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
          Group people who settle together (e.g. a couple sharing a bankroll). Their
          nets merge and they pay or get paid as one. Career stats stay separate.
        </p>

        {groups.length > 0 && (
          <div className="stack" style={{ marginBottom: '0.75rem' }}>
            {groups.map((ids) => {
              const members = nets.filter((n) => ids.includes(n.playerId))
              const total = members.reduce((s, m) => s + m.net, 0)
              const key = groupKey(ids)
              return (
                <div key={key} className="list-item">
                  <span>
                    <strong style={{ color: 'var(--text)' }}>
                      {members.map((m) => m.name).join(' + ')}
                    </strong>{' '}
                    <span className={total > 0 ? 'pos' : total < 0 ? 'neg' : 'muted'}>
                      {signedMoney(total)}
                    </span>
                  </span>
                  <button className="small danger" onClick={() => ungroup(key)}>
                    Ungroup
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {ungrouped.length >= 2 ? (
          <>
            <div className="stack" style={{ marginBottom: '0.75rem' }}>
              {ungrouped.map((n) => (
                <label key={n.playerId} className="checkbox-row" style={{ background: 'var(--panel-2)' }}>
                  <input
                    type="checkbox"
                    checked={selected.has(n.playerId)}
                    onChange={() => toggle(n.playerId)}
                  />
                  <span className="row spread" style={{ flex: 1 }}>
                    <span>{n.name}</span>
                    <span className={n.net > 0 ? 'pos' : n.net < 0 ? 'neg' : 'muted'}>
                      {signedMoney(n.net)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <button className="felt" disabled={selected.size < 2} onClick={combineSelected}>
              Combine selected ({selected.size})
            </button>
          </>
        ) : (
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            {ungrouped.length === 0
              ? 'Everyone is grouped.'
              : 'Combine needs at least two ungrouped players.'}
          </p>
        )}
      </div>

      <div className="panel">
        <div className="row spread" style={{ alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0 }}>Settle Up</h2>
          {payments.length > 0 && (
            <button className="small felt" onClick={copyPayments}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          )}
        </div>

        {!balanced && (
          <div className="banner warn">
            Ledger is off by {money(Math.abs(imbalance))} ({imbalance > 0 ? 'more chips than cash' : 'more cash than chips'}).
            Double-check the buy-outs — the payments below only balance what was entered.
          </div>
        )}

        {payments.length === 0 ? (
          <p className="muted">
            {recorded.length > 0
              ? 'All settled — every payment is accounted for. 🎉'
              : 'Everyone broke even — no payments needed. 🎉'}
          </p>
        ) : (
          <div>
            <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
              {recorded.length > 0 ? 'Still outstanding:' : 'Suggested payments:'}
            </p>
            {payments.map((p, i) => (
              <div key={i} className="payment">
                <span>
                  <strong>{p.from}</strong>
                  <span className="arrow">→</span>
                  <strong>{p.to}</strong>
                </span>
                <span className="row" style={{ gap: '0.6rem' }}>
                  <span className="mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                    {money(p.amount)}
                  </span>
                  <button className="small felt" onClick={() => markPaid(p)}>
                    Mark paid
                  </button>
                </span>
              </div>
            ))}
            <p className="muted center" style={{ fontSize: '0.8rem', marginTop: '0.75rem' }}>
              {payments.length} payment{payments.length === 1 ? '' : 's'} left to settle the table.
            </p>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Payments already made</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
          Mark a suggested payment paid, or record one manually — handy when someone
          leaves early and hands their whole debt to one person. Recorded payments are
          subtracted from what's still owed above.
        </p>

        {recorded.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            {recorded.map((p, i) => (
              <div key={i} className="payment">
                <span>
                  <strong>{nameOf(p.fromId)}</strong>
                  <span className="arrow">→</span>
                  <strong>{nameOf(p.toId)}</strong>
                </span>
                <span className="row" style={{ gap: '0.6rem' }}>
                  <span className="mono" style={{ fontWeight: 700 }}>{money(p.amount)}</span>
                  <button className="small danger" onClick={() => undoPaid(i)}>
                    Undo
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className="settle-select"
          >
            <option value="">From…</option>
            {effectiveNets.map((n) => (
              <option key={n.playerId} value={n.playerId}>
                {n.name}
              </option>
            ))}
          </select>
          <span className="arrow">→</span>
          <select value={toId} onChange={(e) => setToId(e.target.value)} className="settle-select">
            <option value="">To…</option>
            {effectiveNets.map((n) => (
              <option key={n.playerId} value={n.playerId}>
                {n.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="Amount"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            style={{ width: 110 }}
          />
          <button
            className="felt"
            onClick={recordManual}
            disabled={!fromId || !toId || fromId === toId || !(Number(amountStr) > 0)}
          >
            Record
          </button>
        </div>
      </div>
    </>
  )
}
