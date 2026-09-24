import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { UserPlus, ShieldCheck, TriangleAlert, ArrowRight, Loader2 } from 'lucide-react'
import { Card, Field, Input, Button, Callout, SectionHeading } from '@/components/ui'
import { PasswordInput } from '@/components/PasswordInput'
import { StrengthMeter } from '@/components/StrengthMeter'
import { PolicyChecklist } from '@/components/PolicyChecklist'
import { DeriveMeter } from '@/components/DeriveMeter'
import { checkUsername, checkPasswordPolicy, HASH_ITERATIONS } from '@/engine/auth'
import { useAuthStore } from '@/store/useAuthStore'
import { fmtInt } from '@/lib/format'
import { useEnter } from '@/lib/motion'
import Reveal from '@/components/Reveal'

export function Register() {
  const enter = useEnter()
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)
  const hasUser = useAuthStore((s) => s.hasUser)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null) // { message, problems? }
  const abortRef = useRef(null)

  // Live validation — all sourced from the engine.
  const nameCheck = useMemo(() => checkUsername(username), [username])
  const nameTaken = username.length > 0 && nameCheck.valid && hasUser(username)
  const policyOk = useMemo(() => checkPasswordPolicy(password).ok, [password])
  const confirmMismatch = confirm.length > 0 && confirm !== password

  const usernameError =
    username.length === 0 ? '' : !nameCheck.valid ? `Username ${nameCheck.problem}.` : nameTaken ? 'That username is already taken.' : ''

  const canSubmit =
    !running &&
    username.length > 0 &&
    nameCheck.valid &&
    !nameTaken &&
    policyOk &&
    password === confirm &&
    confirm.length > 0

  async function onSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setProgress(0)
    setRunning(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const result = await register(
        { username: username.trim(), password, confirmPassword: confirm },
        { onProgress: setProgress, signal: controller.signal },
      )
      if (result.ok) {
        navigate('/dashboard', { replace: true })
        return
      }
      setError({ message: result.message, problems: result.problems })
    } catch (err) {
      if (err?.name !== 'AbortError') setError({ message: 'Something went wrong while deriving. Please try again.' })
    } finally {
      setRunning(false)
      abortRef.current = null
    }
  }

  function onCancel() {
    abortRef.current?.abort()
  }

  return (
    <motion.div {...enter} className="mx-auto max-w-xl">
      <Reveal>
        <SectionHeading
          eyebrow="// create your account"
          title="Register"
          sub="Your password is salted and key-stretched in this browser tab before anything is saved. We store only the salt and the derived hash — never the password itself."
        />
      </Reveal>

      <Card glow className="mt-6 p-6 sm:p-8">
        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          <Field label="Username" htmlFor="reg-username" error={usernameError} hint={!usernameError ? '3–32 characters: letters, digits, dot, dash, underscore.' : undefined}>
            <Input
              id="reg-username"
              name="username"
              autoComplete="username"
              placeholder="e.g. ada.lovelace"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              invalid={Boolean(usernameError)}
              disabled={running}
              aria-invalid={Boolean(usernameError)}
            />
          </Field>

          <div>
            <Field label="Password" htmlFor="reg-password">
              <PasswordInput
                id="reg-password"
                name="new-password"
                autoComplete="new-password"
                placeholder="Choose a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={running}
              />
            </Field>
            <StrengthMeter password={password} className="mt-3" />
            <PolicyChecklist password={password} className="mt-4" />
          </div>

          <Field
            label="Confirm password"
            htmlFor="reg-confirm"
            error={confirmMismatch ? 'The two passwords do not match.' : undefined}
          >
            <PasswordInput
              id="reg-confirm"
              name="confirm-password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              invalid={confirmMismatch}
              disabled={running}
              aria-invalid={confirmMismatch}
            />
          </Field>

          {error && (
            <Callout tone="bad" icon={TriangleAlert} title="Registration failed">
              {error.message}
              {error.problems?.length > 0 && (
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {error.problems.map((p) => (
                    <li key={p}>It {p}.</li>
                  ))}
                </ul>
              )}
            </Callout>
          )}

          {running && (
            <div className="grid gap-3">
              <DeriveMeter progress={progress} running label="Deriving your verifier" />
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 font-mono text-xs text-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Running {fmtInt(HASH_ITERATIONS)} SHA-256 rounds in your browser
                </p>
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <Button type="submit" size="lg" disabled={!canSubmit} className="mt-1 w-full">
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Deriving…
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" /> Create account
              </>
            )}
          </Button>
        </form>
      </Card>

      <Reveal className="mt-5">
        <div className="flex flex-col items-center gap-3 text-sm text-muted sm:flex-row sm:justify-between">
          <p>
            Already registered?{' '}
            <Link to="/login" className="font-medium text-neonCyan hover:underline">
              Sign in
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
