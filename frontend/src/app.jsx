import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './components/ui/theme-provider'
import { useAccessStore } from './stores/access-store'
import { LoginPage }    from './pages/login-page'
import { FeedPage }     from './pages/feed-page'
import { ReaderPage }   from './pages/reader-page'
import { AdminPage }    from './pages/admin-page'
import { SettingsPage } from './pages/settings-page'
import { Toasts }       from './components/ui/toasts'

// Gate — shows the login page until a valid access role is stored.
function AuthGuard({ children }) {
  const { role } = useAccessStore()
  if (!role) return <Navigate to="/login" replace />
  return children
}

// Route guard — dev-only pages bounce non-dev users to feed.
function DevGuard({ children }) {
  const { role } = useAccessStore()
  if (role !== 'dev') return <Navigate to="/" replace />
  return children
}

export function App() {
  return (
    <ThemeProvider>
      <Toasts />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<AuthGuard><FeedPage /></AuthGuard>} />
          <Route path="/read/:paperId" element={<AuthGuard><ReaderPage /></AuthGuard>} />
          <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
          <Route path="/admin" element={<AuthGuard><DevGuard><AdminPage /></DevGuard></AuthGuard>} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
