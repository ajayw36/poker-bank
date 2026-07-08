import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth()
  return (
    <div className="shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <span className="chip">🃏</span> Poker Bank
        </NavLink>
        <nav className="side-nav">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/history">History</NavLink>
        </nav>
        <div className="spacer" />
        <button className="small" onClick={() => signOut()}>
          Sign out
        </button>
      </aside>
      <main className="content">{children}</main>
    </div>
  )
}
