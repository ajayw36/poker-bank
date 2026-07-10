import { describe, it, expect } from 'vitest'
import { settle, ledgerImbalance, combineNets, applyPayments } from './settle'
import type { Net, Payment } from './types'

const n = (playerId: string, net: number): Net => ({ playerId, name: playerId, net })

/** Total received by each creditor / paid by each debtor from a payment list. */
function flows(payments: Payment[]) {
  const paid = new Map<string, number>()
  const received = new Map<string, number>()
  for (const p of payments) {
    paid.set(p.fromId, (paid.get(p.fromId) ?? 0) + p.amount)
    received.set(p.toId, (received.get(p.toId) ?? 0) + p.amount)
  }
  return { paid, received }
}

describe('settle', () => {
  it('settles a simple two-player game with one payment', () => {
    const payments = settle([n('a', 40), n('b', -40)])
    expect(payments).toHaveLength(1)
    expect(payments[0]).toMatchObject({ fromId: 'b', toId: 'a', amount: 40 })
  })

  it('settles a balanced three-player game so nets are cleared', () => {
    const nets = [n('a', 50), n('b', -20), n('c', -30)]
    const payments = settle(nets)
    const { paid, received } = flows(payments)

    // Each debtor pays exactly their loss; each creditor gets exactly their win.
    expect(paid.get('b')).toBe(20)
    expect(paid.get('c')).toBe(30)
    expect(received.get('a')).toBe(50)

    // Total money moved equals total owed.
    const total = payments.reduce((s, p) => s + p.amount, 0)
    expect(total).toBe(50)
  })

  it('handles multiple creditors and debtors', () => {
    const nets = [n('a', 70), n('b', 30), n('c', -55), n('d', -45)]
    const payments = settle(nets)
    const { paid, received } = flows(payments)

    expect(received.get('a')).toBe(70)
    expect(received.get('b')).toBe(30)
    expect(paid.get('c')).toBe(55)
    expect(paid.get('d')).toBe(45)
    const total = payments.reduce((s, p) => s + p.amount, 0)
    expect(total).toBe(100)
  })

  it('avoids floating-point drift with cents amounts', () => {
    const nets = [n('a', 10.1), n('b', 20.2), n('c', -30.3)]
    const payments = settle(nets)
    const total = payments.reduce((s, p) => s + p.amount, 0)
    expect(total).toBeCloseTo(30.3, 2)
    // No payment should have sub-cent noise like 10.099999999.
    for (const p of payments) {
      expect(Math.round(p.amount * 100) / 100).toBe(p.amount)
    }
  })

  it('returns no payments when everyone broke even', () => {
    expect(settle([n('a', 0), n('b', 0)])).toEqual([])
  })

  it('still produces sane payments when the ledger does not balance', () => {
    // a won 50 but debtors only cover 40 -> creditor gets at most what debtors pay.
    const nets = [n('a', 50), n('b', -40)]
    const payments = settle(nets)
    const total = payments.reduce((s, p) => s + p.amount, 0)
    expect(total).toBe(40)
    expect(ledgerImbalance(nets)).toBe(10)
  })
})

describe('combineNets', () => {
  it('merges grouped players into one node with summed net and joined name', () => {
    const nets = [n('jay', 30), n('dev', -10), n('sam', -20)]
    const combined = combineNets(nets, [['jay', 'dev']])
    expect(combined).toHaveLength(2)
    const group = combined.find((c) => c.playerId.startsWith('grp:'))!
    expect(group.net).toBe(20)
    expect(group.name).toContain('jay')
    expect(group.name).toContain('dev')
    // ungrouped player is preserved
    expect(combined.find((c) => c.playerId === 'sam')?.net).toBe(-20)
  })

  it('lets a combined group settle as a single payer', () => {
    // jay +30, dev -10 => group +20; sam -20 => sam pays the group 20.
    const nets = [n('jay', 30), n('dev', -10), n('sam', -20)]
    const payments = settle(combineNets(nets, [['jay', 'dev']]))
    expect(payments).toHaveLength(1)
    expect(payments[0]).toMatchObject({ fromId: 'sam', amount: 20 })
  })

  it('returns the original nets when there are no groups', () => {
    const nets = [n('a', 10), n('b', -10)]
    expect(combineNets(nets, [])).toEqual(nets)
  })
})

describe('applyPayments', () => {
  const pay = (fromId: string, toId: string, amount: number): Payment => ({
    fromId,
    from: fromId,
    toId,
    to: toId,
    amount,
  })

  it('clears a settled debt so no further payment is suggested', () => {
    const nets = [n('a', 40), n('b', -40)]
    const remaining = applyPayments(nets, [pay('b', 'a', 40)])
    expect(settle(remaining)).toEqual([])
  })

  it('reduces a partially-paid debt', () => {
    const nets = [n('a', 40), n('b', -40)]
    const remaining = applyPayments(nets, [pay('b', 'a', 25)])
    const payments = settle(remaining)
    expect(payments).toHaveLength(1)
    expect(payments[0]).toMatchObject({ fromId: 'b', toId: 'a', amount: 15 })
  })

  it('handles a debtor who paid their whole debt to one person', () => {
    // c owes 30 total; c hands all 30 to a directly. b still owes 20 -> a.
    const nets = [n('a', 50), n('b', -20), n('c', -30)]
    const remaining = applyPayments(nets, [pay('c', 'a', 30)])
    const payments = settle(remaining)
    expect(payments).toHaveLength(1)
    expect(payments[0]).toMatchObject({ fromId: 'b', toId: 'a', amount: 20 })
  })

  it('ignores payments referencing ids not in the nets', () => {
    const nets = [n('a', 40), n('b', -40)]
    const remaining = applyPayments(nets, [pay('x', 'y', 10)])
    expect(remaining).toEqual(nets)
  })

  it('avoids floating-point drift', () => {
    const nets = [n('a', 30.3), n('b', -30.3)]
    const remaining = applyPayments(nets, [pay('b', 'a', 10.1)])
    expect(remaining.find((r) => r.playerId === 'a')?.net).toBeCloseTo(20.2, 10)
    expect(remaining.find((r) => r.playerId === 'b')?.net).toBeCloseTo(-20.2, 10)
  })
})

describe('ledgerImbalance', () => {
  it('is zero for a balanced ledger', () => {
    expect(ledgerImbalance([n('a', 50), n('b', -20), n('c', -30)])).toBe(0)
  })

  it('reports the signed imbalance', () => {
    expect(ledgerImbalance([n('a', 50), n('b', -45)])).toBe(5)
  })
})
