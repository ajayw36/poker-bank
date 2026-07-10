import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { DialogProvider } from './components/Dialogs'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { ActiveSession } from './pages/ActiveSession'
import { History } from './pages/History'

export function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="center-screen">
        <span className="muted">Loading…</span>
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <DialogProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/history" element={<History />} />
          <Route path="/session/:id" element={<ActiveSession />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </DialogProvider>
  )
}
