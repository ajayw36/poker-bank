import type { BuyIn, Net, SeatRow } from './types'

/** Total of all buy-ins (initial + re-buys) for a seat. */
export function totalBuyIn(buyIns: BuyIn[]): number {
  return buyIns.reduce((sum, b) => sum + Number(b.amount), 0)
}

/** Net profit for a seat: buy_out - total buy-in. null buy_out counts as 0. */
export function seatNet(row: SeatRow): number {
  const out = row.seat.buy_out ?? 0
  return out - totalBuyIn(row.buyIns)
}

/** Map seat rows to the Net shape the settle algorithm consumes. */
export function seatNets(rows: SeatRow[]): Net[] {
  return rows.map((row) => ({
    playerId: row.player.id,
    name: row.player.name,
    net: seatNet(row),
  }))
}

/** Every seat has recorded a buy-out (i.e. cashed out). */
export function allCashedOut(rows: SeatRow[]): boolean {
  return rows.length > 0 && rows.every((r) => r.seat.buy_out !== null)
}

/** Format a dollar amount, e.g. 40 -> "$40.00", -12.5 -> "-$12.50". */
export function money(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toFixed(2)}`
}

/** Format a signed net with a leading + for winners. */
export function signedMoney(n: number): string {
  if (n > 0) return `+$${n.toFixed(2)}`
  if (n < 0) return `-$${Math.abs(n).toFixed(2)}`
  return '$0.00'
}
