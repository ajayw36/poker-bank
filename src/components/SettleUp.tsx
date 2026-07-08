import { useState } from 'react'
import { settle, ledgerImbalance, combineNets, groupKey } from '../lib/settle'
import { money, signedMoney } from '../lib/calc'
import type { Net } from '../lib/types'

export function SettleUp({ nets }: { nets: Net[] }) {
  const [groups, setGroups] = useState<string[][]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const imbalance = ledgerImbalance(nets)
  const balanced = Math.abs(imbalance) < 0.01

  const effectiveNets = combineNets(nets, groups)
  const payments = settle(effectiveNets)

  const groupedIds = new Set(groups.flat())
  const ungrouped = nets.filter((n) => !groupedIds.has(n.playerId))

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
        <h2>Settle Up</h2>

        {!balanced && (
          <div className="banner warn">
            Ledger is off by {money(Math.abs(imbalance))} ({imbalance > 0 ? 'more chips than cash' : 'more cash than chips'}).
            Double-check the buy-outs — the payments below only balance what was entered.
          </div>
        )}

        {payments.length === 0 ? (
          <p className="muted">Everyone broke even — no payments needed. 🎉</p>
        ) : (
          <div>
            {payments.map((p, i) => (
              <div key={i} className="payment">
                <span>
                  <strong>{p.from}</strong>
                  <span className="arrow">→</span>
                  <strong>{p.to}</strong>
                </span>
                <span className="mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                  {money(p.amount)}
                </span>
              </div>
            ))}
            <p className="muted center" style={{ fontSize: '0.8rem', marginTop: '0.75rem' }}>
              {payments.length} payment{payments.length === 1 ? '' : 's'} to settle the table.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
