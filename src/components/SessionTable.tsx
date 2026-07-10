import { money, signedMoney, totalBuyIn, seatNet } from '../lib/calc'
import type { SeatRow } from '../lib/types'

interface Props {
  rows: SeatRow[]
  editable: boolean
  onBuyIn?: (seatId: string) => void
  onEditBuyIn?: (buyInId: string, current: number) => void
  onCashOut?: (seatId: string) => void
  onRemoveSeat?: (seatId: string) => void
}

export function SessionTable({
  rows,
  editable,
  onBuyIn,
  onEditBuyIn,
  onCashOut,
  onRemoveSeat,
}: Props) {
  const totals = rows.reduce(
    (acc, r) => {
      acc.buyIn += totalBuyIn(r.buyIns)
      acc.buyOut += r.seat.buy_out ?? 0
      acc.net += seatNet(r)
      return acc
    },
    { buyIn: 0, buyOut: 0, net: 0 },
  )

  return (
    <table className="ledger">
      <thead>
        <tr>
          <th>Player</th>
          <th>Buy-in</th>
          <th>Buy-out</th>
          <th>Net</th>
          {editable && <th></th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const net = seatNet(r)
          const cashed = r.seat.buy_out !== null
          return (
            <tr key={r.seat.id}>
              <td className="player-cell">
                {r.player.name}
                {!cashed && editable && <span className="tag" style={{ marginLeft: 6 }}>in</span>}
              </td>
              <td className="mono" data-label="Buy-in">
                <div className="cell-value">
                  {money(totalBuyIn(r.buyIns))}
                  {editable && r.buyIns.length > 0 && (
                    <div className="buyin-chips">
                      {r.buyIns.map((b) => (
                        <button
                          key={b.id}
                          className="buyin-chip"
                          title="Edit or remove this buy-in"
                          onClick={() => onEditBuyIn?.(b.id, b.amount)}
                        >
                          {money(b.amount)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </td>
              <td className="mono" data-label="Buy-out">
                {cashed ? money(r.seat.buy_out!) : '—'}
              </td>
              <td className={`mono ${net > 0 ? 'pos' : net < 0 ? 'neg' : ''}`} data-label="Net">
                {cashed ? signedMoney(net) : '—'}
              </td>
              {editable && (
                <td className="actions-cell">
                  <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
                    <button className="small felt" onClick={() => onBuyIn?.(r.seat.id)}>
                      + Buy-in
                    </button>
                    <button className="small" onClick={() => onCashOut?.(r.seat.id)}>
                      {cashed ? 'Edit out' : 'Cash out'}
                    </button>
                    {onRemoveSeat && (
                      <button
                        className="small danger"
                        onClick={() => onRemoveSeat(r.seat.id)}
                        title="Remove from session"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
      <tfoot>
        <tr>
          <td className="player-cell">Total</td>
          <td className="mono" data-label="Buy-in">{money(totals.buyIn)}</td>
          <td className="mono" data-label="Buy-out">{money(totals.buyOut)}</td>
          <td className={`mono ${totals.net > 0 ? 'pos' : totals.net < 0 ? 'neg' : ''}`} data-label="Net">
            {signedMoney(totals.net)}
          </td>
          {editable && <td className="actions-cell"></td>}
        </tr>
      </tfoot>
    </table>
  )
}
