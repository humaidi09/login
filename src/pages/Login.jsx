import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogIn, TriangleAlert, Loader2, ShieldAlert, Clock, ShieldCheck, ArrowRight } from 'lucide-react'
import { Card, Field, Input, Button, Callout, SectionHeading } from '@/components/ui'
import { PasswordInput } from '@/components/PasswordInput'
import { DeriveMeter } from '@/components/DeriveMeter'
import { useAuthStore, MAX_ATTEMPTS } from '@/store/useAuthStore'
import { secondsCeil } from '@/lib/format'
import { useEnter } from '@/lib/motion'
import Reveal from '@/components/Reveal'

export function Login() {
  const enter = useEnter()
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const lockInfo = useAuthStore((s) => s.lockInfo)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [, setTick] = useState(0)
  const abortRef = useRef(null)

  // Recomputed every render; reads the live clock so the countdown is accurate.
  const lock = lockInfo(username)

  // While locked, re-render twice a second so the countdown ticks down and the
  // form re-enables itself the instant the lock expires.
  useEffect(() => {
    if (!lock.locked) return
    const id = setInterval(() => setTick((t) => t + 1), 500)
    return () => clearInterval(id)
  }, [lock.locked, username])

  const canSubmit = !running && username.length > 0 && password.length > 0 && !lock.locked
  const showAttemptsLeft = Boolean(error) && !lock.locked && lock.attemptsLeft < MAX_ATTEMPTS

  async function onSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setError('')
    setProgress(0)
    setRunning(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const result = await login(
        { username: username.trim(), password },
        { onProgress: setProgress, signal: controller.signal },
      )
      if (result.ok) {
        navigate('/dashboard', { replace: true })
        return
      }
      // Enumeration-safe: this is the engine's verbatim message, identical for an
      // unknown username and a wrong password.
      setError(result.message)
    } catch (err) {
      if (err?.name !== 'AbortError') setError('Something went wrong while verifying. Please try again.')
    } finally {
      setRunning(false)
      abortRef.current = null
    }
  }

  return (
    <motion.div {...enter} className="mx-auto max-w-xl">
      <Reveal>
        <SectionHeading
          eyebrow="// welcome back"
          title="Sign in"
          sub="Your password is key-stretched with the stored salt and compared to the saved verifier in constant time. The password is never transmitted or read from storage."
        />
      </Reveal>

      <Card glow className="mt-6 p-6 sm:p-8">
        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          <Field label="Username" htmlFor="login-username">
            <Input
              id="login-username"
              name="username"
              autoComplete="username"
              placeholder="Your username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setError('')
              }}
              disabled={running}
            />
          </Field>

          <Field label="Password" htmlFor="login-password">
            <PasswordInput
              id="login-password"
              name="current-password"
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              disabled={running}
            />
          </Field>

          {lock.locked ? (
            <Callout tone="warn" icon={Clock} title="Too many attempts">
              For your protection this account is temporarily locked. Try again in{' '}
              <span className="font-mono font-semibold tabular-nums">{secondsCeil(lock.remainingMs)}s</span>.
            </Callout>
          ) : (
            error && (
              <Callout tone="bad" icon={TriangleAlert} title="Sign-in failed">
                {error}
                {showAttemptsLeft && (
                  <span className="mt-1 block text-xs">
                    {lock.attemptsLeft} attempt{lock.attemptsLeft === 1 ? '' : 's'} remaining before a temporary lock.
                  </span>
                )}
              </Callout>
            )
          )}

          {running && <DeriveMeter progress={progress} running label="Verifying your password" />}

          <Button type="submit" size="lg" disabled={!canSubmit} className="mt-1 w-full">
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
              </>
            ) : lock.locked ? (
              <>
                <ShieldAlert className="h-4 w-4" /> Locked — wait {secondsCeil(lock.remainingMs)}s
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" /> Sign in
              </>
            )}
          </Button>
        </form>
      </Card>

      <Reveal className="mt-5">
        <div className="flex flex-col items-center gap-3 text-sm text-muted sm:flex-row sm:justify-between">
          <p>
            New here?{' '}
            <Link to="/register" className="font-medium text-neonCyan hover:underline">
              Create an account
            </Link>
          </p>
          <Link to="/security" className="inline-flex items-center gap-1.5 text-muted transition-colors hover:text-ink">
            <ShieldCheck className="h-4 w-4" />
            See how the security works
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Reveal>
    </motion.div>
  )
}
