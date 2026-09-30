import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogOut, ShieldCheck, Clock, Database, Fingerprint, KeyRound, Lock } from 'lucide-react'
import { Card, Panel, Button, SectionHeading, Stat, Badge, Callout } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { DEFAULT_HASH_ITERATIONS } from '@/engine/auth'
import { fmtDateTime, fmtMs, fmtInt, truncMid } from '@/lib/format'
import { useEnter } from '@/lib/motion'
import Reveal from '@/components/Reveal'

function RecordRow({ icon: Icon, label, value, mono = true }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="flex items-center gap-2 font-mono text-xs text-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </span>
      <span className={mono ? 'break-all text-right font-mono text-xs text-ink' : 'text-right text-sm text-ink'}>
        {value}
      </span>
    </div>
  )
}

export function Dashboard() {
  const enter = useEnter()
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const users = useAuthStore((s) => s.users)
  const userCount = useAuthStore((s) => s.users.length)
  const logout = useAuthStore((s) => s.logout)

  const record = useMemo(
    () => users.find((u) => u.username.toLowerCase() === session?.username?.toLowerCase()) || null,
    [users, session],
  )

  function onSignOut() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <motion.div {...enter} className="mx-auto max-w-3xl">
      <Reveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="// signed in" title={`Welcome, ${session?.username}`} sub="You're authenticated on this device. Your session lives in this browser only." />
          <Button variant="outline" onClick={onSignOut} className="shrink-0">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </Reveal>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Reveal className="h-full">
          <Stat label="Signed in" value={fmtDateTime(session?.since)} className="h-full" />
        </Reveal>
        <Reveal className="h-full" delay={0.06}>
          <Stat label="Last verification" value={fmtMs(session?.lastDeriveMs)} sub={`${fmtInt(record?.iterations ?? DEFAULT_HASH_ITERATIONS)} rounds of work`} className="h-full" />
        </Reveal>
        <Reveal className="h-full" delay={0.12}>
          <Stat label="Accounts on this device" value={userCount} sub={userCount === 1 ? 'just you' : 'stored locally'} className="h-full" />
        </Reveal>
      </div>

      <Reveal className="mt-6">
        <Card glow className="p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-neonCyan" />
            <h3 className="font-display text-lg font-semibold text-ink">Your stored record</h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            This is everything kept for your account. Notice what isn't here: your password. Only the salt and the derived
            verifier are stored, and neither can be turned back into it.
          </p>

          {record ? (
            <Panel className="mt-4 divide-y divide-hair px-4">
              <RecordRow icon={ShieldCheck} label="username" value={record.username} />
              <RecordRow icon={KeyRound} label="saltHex" value={truncMid(record.saltHex, 10, 10)} />
              <RecordRow icon={Fingerprint} label="verifierHex" value={truncMid(record.verifierHex, 12, 12)} />
              <RecordRow icon={Clock} label="createdAt" value={fmtDateTime(record.createdAt)} />
            </Panel>
          ) : (
            <Callout tone="warn" className="mt-4">
              Your account record could not be found in this browser's storage.
            </Callout>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="ok">
              <Lock className="h-3 w-3" /> no password stored
            </Badge>
            <Badge tone="accent">salted + {fmtInt(record?.iterations ?? DEFAULT_HASH_ITERATIONS)}-round SHA-256</Badge>
            <Badge tone="neutral">constant-time verified</Badge>
          </div>
        </Card>
      </Reveal>

      <Reveal className="mt-6">
        <Callout tone="info" icon={Database}>
          Everything here is persisted to this browser's localStorage and nowhere else — no server, no account recovery.
          Clearing site data removes your account entirely.
        </Callout>
      </Reveal>
    </motion.div>
  )
}
