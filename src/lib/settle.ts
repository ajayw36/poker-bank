import type { Net, Payment } from './types'

const toCents = (n: number) => Math.round(n * 100)

/**
 * Compute the (near-)minimum set of payments to settle everyone's nets.
 *
 * Greedy largest-first matching: repeatedly have the biggest debtor pay the
 * biggest creditor min(debt, credit), then advance whichever hit zero. This is
 * the standard cash-flow-minimization heuristic — optimal transaction count is
 * NP-hard, but this is near-optimal and more than good enough for a home game.
 *
 * All math is done in integer cents to avoid floating-point drift, then
 * converted back to dollars for the returned amounts.
 */
export function settle(nets: Net[]): Payment[] {
  const creditors = nets
    .filter((n) => toCents(n.net) > 0)
    .map((n) => ({ ...n, net: toCents(n.net) }))
    .sort((a, b) => b.net - a.net)

  const debtors = nets
    .filter((n) => toCents(n.net) < 0)
    .map((n) => ({ ...n, net: -toCents(n.net) }))
    .sort((a, b) => b.net - a.net)

  const payments: Payment[] = []
  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]
    const creditor = creditors[j]
    const amt = Math.min(debtor.net, creditor.net)

    if (amt > 0) {
      payments.push({
        fromId: debtor.playerId,
        from: debtor.name,
        toId: creditor.playerId,
        to: creditor.name,
        amount: amt / 100,
      })
    }

    debtor.net -= amt
    creditor.net -= amt
    if (debtor.net === 0) i++
    if (creditor.net === 0) j++
  }

  return payments
}

/**
 * Sum of all nets in cents. Should be ~0 when chips out = cash in. A non-zero
 * value means the ledger doesn't balance (bad buy-out entry, un-cashed player).
 */
export function ledgerImbalance(nets: Net[]): number {
  const cents = nets.reduce((sum, n) => sum + toCents(n.net), 0)
  return cents / 100
}

export const groupKey = (ids: string[]) => 'grp:' + [...ids].sort().join('+')

/**
 * Collapse grouped players into single combined nodes before settling, so a
 * group (e.g. "Jay + Dev") pays/receives as one unit. `groups` is a list of
 * playerId arrays; any player not in a group settles individually. Members'
 * nets are summed. The original per-player data is untouched — this is a
 * settle-time view only.
 */
export function combineNets(nets: Net[], groups: string[][]): Net[] {
  const grouped = new Set(groups.flat())
  const result: Net[] = []

  for (const ids of groups) {
    const members = nets.filter((n) => ids.includes(n.playerId))
    if (members.length === 0) continue
    result.push({
      playerId: groupKey(ids),
      name: members.map((m) => m.name).join(' + '),
      net: members.reduce((sum, m) => sum + m.net, 0),
    })
  }

  for (const n of nets) {
    if (!grouped.has(n.playerId)) result.push(n)
  }

  return result
}
