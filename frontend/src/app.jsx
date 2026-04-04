import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './components/ui/theme-provider'
import { useAccessStore } from './stores/access-store'
import { AccessPage }  from './pages/access-page'
import { FeedPage }    from './pages/feed-page'
import { ReaderPage }  from './pages/reader-page'
import { AdminPage }   from './pages/admin-page'

// Gate — renders children only if a valid access role is stored.
// Otherwise shows the access code entry screen.
function AccessGuard({ children }) {
  const { role } = useAccessStore()
  if (!role) return <AccessPage />
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
      <BrowserRouter>
        <AccessGuard>
          <Routes>
            <Route path="/"              element={<FeedPage />} />
            <Route path="/read/:paperId" element={<ReaderPage />} />
            <Route path="/admin"         element={<DevGuard><AdminPage /></DevGuard>} />
          </Routes>
        </AccessGuard>
      </BrowserRouter>
    </ThemeProvider>
  )
}
