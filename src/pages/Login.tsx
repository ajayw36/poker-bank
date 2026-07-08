import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setBusy(true)
    const fn = mode === 'signin' ? signIn : signUp
    const { error } = await fn(email, password)
    setBusy(false)
    if (error) {
      setError(error.message)
    } else if (mode === 'signup') {
      setMessage('Account created. If email confirmation is on, check your inbox — otherwise sign in.')
      setMode('signin')
    }
  }

  return (
    <div className="center-screen">
      <div className="panel auth-card">
        <div className="brand center" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
          <span className="chip">🃏</span> Poker Bank
        </div>
        <form onSubmit={submit} className="stack">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="primary" type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        {error && <div className="error-text">{error}</div>}
        {message && <div className="banner ok" style={{ marginTop: '0.75rem' }}>{message}</div>}
        <div className="center muted" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
          {mode === 'signin' ? (
            <>
              No account?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode('signup'); setError(null) }}>
                Create one
              </a>
            </>
          ) : (
            <>
              Have an account?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode('signin'); setError(null) }}>
                Sign in
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
