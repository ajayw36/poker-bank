import { useEffect, useRef, useState } from 'react'
import { money } from '../lib/calc'

export interface AmountRequest {
  title: string
  hint?: string
  initial?: number
  presets?: number[]
  allowZero?: boolean
  confirmLabel?: string
  onConfirm: (amount: number) => void | Promise<void>
  onRemove?: () => void | Promise<void>
}

export function AmountModal({ request, onClose }: { request: AmountRequest; onClose: () => void }) {
  const [value, setValue] = useState(
    request.initial != null ? String(request.initial) : '',
  )
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Autofocus and preselect so typing replaces the current amount immediately.
    const el = inputRef.current
    if (el) {
      el.focus()
      el.select()
    }
  }, [])

  const parsed = Math.round(Number(value) * 100) / 100
  const valid = Number.isFinite(parsed) && parsed >= 0 && (request.allowZero || parsed > 0)

  async function submit() {
    if (!valid || busy) return
    setBusy(true)
    await request.onConfirm(parsed)
    onClose()
  }

  async function remove() {
    if (!request.onRemove || busy) return
    setBusy(true)
    await request.onRemove()
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>{request.title}</h2>
        {request.hint && (
          <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
            {request.hint}
          </p>
        )}

        <div className="amount-input">
          <span className="amount-prefix">$</span>
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={value}
            placeholder="0"
            onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') onClose()
            }}
          />
        </div>

        {request.presets && request.presets.length > 0 && (
          <div className="preset-row">
            {request.presets.map((p) => (
              <button key={p} className="chip-btn" onClick={() => setValue(String(p))}>
                {money(p)}
              </button>
            ))}
          </div>
        )}

        <div className="btn-row" style={{ marginTop: '1rem' }}>
          <button className="primary" onClick={submit} disabled={!valid || busy} style={{ flex: 1 }}>
            {request.confirmLabel ?? 'Save'}
          </button>
          {request.onRemove && (
            <button className="danger" onClick={remove} disabled={busy}>
              Remove
            </button>
          )}
          <button className="felt" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
