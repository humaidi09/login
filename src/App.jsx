import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ThemeProvider } from '@/theme/ThemeContext'
import { Layout } from '@/components/Layout'
import { Register } from '@/pages/Register'
import { Login } from '@/pages/Login'
import { Security } from '@/pages/Security'
import { Dashboard } from '@/pages/Dashboard'
import { useAuthStore } from '@/store/useAuthStore'

// Guard for app-only screens: bounce to sign-in when there's no session.
function RequireAuth({ children }) {
  const session = useAuthStore((s) => s.session)
  const location = useLocation()
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

// Signed-in users don't need the register/login forms.
function RedirectIfAuthed({ children }) {
  const session = useAuthStore((s) => s.session)
  if (session) return <Navigate to="/dashboard" replace />
  return children
}

// Landing route sends you where you belong based on session state.
function IndexRedirect() {
  const session = useAuthStore((s) => s.session)
  return <Navigate to={session ? '/dashboard' : '/register'} replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<IndexRedirect />} />
          <Route
            path="register"
            element={
              <RedirectIfAuthed>
                <Register />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="login"
            element={
              <RedirectIfAuthed>
                <Login />
              </RedirectIfAuthed>
            }
          />
          <Route path="security" element={<Security />} />
          <Route
            path="dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ThemeProvider>
  )
}
