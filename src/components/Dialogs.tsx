import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface PromptOptions {
  title: string
  hint?: string
  initial?: string
  placeholder?: string
  confirmLabel?: string
  allowEmpty?: boolean
}

interface DialogApi {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  promptText: (opts: PromptOptions) => Promise<string | null>
}

const DialogContext = createContext<DialogApi | null>(null)

export function useDialogs(): DialogApi {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialogs must be used within <DialogProvider>')
  return ctx
}

type ConfirmState = ConfirmOptions & { kind: 'confirm'; resolve: (v: boolean) => void }
type PromptState = PromptOptions & { kind: 'prompt'; resolve: (v: string | null) => void }
type DialogState = ConfirmState | PromptState | null

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>(null)

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setDialog({ ...opts, kind: 'confirm', resolve })),
    [],
  )

  const promptText = useCallback(
    (opts: PromptOptions) =>
      new Promise<string | null>((resolve) => setDialog({ ...opts, kind: 'prompt', resolve })),
    [],
  )

  return (
    <DialogContext.Provider value={{ confirm, promptText }}>
      {children}
      {dialog?.kind === 'confirm' && (
        <ConfirmDialog
          state={dialog}
          onDone={(v) => {
            dialog.resolve(v)
            setDialog(null)
          }}
        />
      )}
      {dialog?.kind === 'prompt' && (
        <PromptDialog
          state={dialog}
          onDone={(v) => {
            dialog.resolve(v)
            setDialog(null)
          }}
        />
      )}
    </DialogContext.Provider>
  )
}

function ConfirmDialog({ state, onDone }: { state: ConfirmState; onDone: (v: boolean) => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone(false)
      if (e.key === 'Enter') onDone(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])

  return (
    <div className="modal-backdrop" onMouseDown={() => onDone(false)}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>{state.title}</h2>
        {state.message && (
          <p className="muted" style={{ marginTop: 0 }}>
            {state.message}
          </p>
        )}
        <div className="btn-row" style={{ marginTop: '1rem' }}>
          <button
            className={state.danger ? 'danger' : 'primary'}
            onClick={() => onDone(true)}
            style={{ flex: 1 }}
          >
            {state.confirmLabel ?? 'Confirm'}
          </button>
          <button className="felt" onClick={() => onDone(false)}>
            {state.cancelLabel ?? 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PromptDialog({ state, onDone }: { state: PromptState; onDone: (v: string | null) => void }) {
  const [value, setValue] = useState(state.initial ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = inputRef.current
    if (el) {
      el.focus()
      el.select()
    }
  }, [])

  const valid = state.allowEmpty || value.trim().length > 0

  return (
    <div className="modal-backdrop" onMouseDown={() => onDone(null)}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>{state.title}</h2>
        {state.hint && (
          <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
            {state.hint}
          </p>
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder={state.placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && valid) onDone(value.trim())
            if (e.key === 'Escape') onDone(null)
          }}
        />
        <div className="btn-row" style={{ marginTop: '1rem' }}>
          <button
            className="primary"
            onClick={() => onDone(value.trim())}
            disabled={!valid}
            style={{ flex: 1 }}
          >
            {state.confirmLabel ?? 'Save'}
          </button>
          <button className="felt" onClick={() => onDone(null)}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
