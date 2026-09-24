import { ShieldCheck } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { useAuthStore } from '@/store/useAuthStore'

// AppShell is the layout route. This wrapper adapts its nav to the session:
// signed-out visitors see Register / Sign in / Security; signed-in users see
// Dashboard / Security. Title, brand mark and the "← Portfolio" link are the
// shared identity and never change.
const SIGNED_OUT = [
  { to: '/register', label: 'Register' },
  { to: '/login', label: 'Sign in' },
  { to: '/security', label: 'Security' },
]

const SIGNED_IN = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/security', label: 'Security' },
]

export function Layout() {
  const session = useAuthStore((s) => s.session)
  return <AppShell title="Login & Registration" mark={ShieldCheck} nav={session ? SIGNED_IN : SIGNED_OUT} />
}
