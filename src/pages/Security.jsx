import { useCallback, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  RefreshCw,
  Play,
  Copy,
  Check,
  X,
  KeyRound,
  Loader2,
  Fingerprint,
  Database,
  Lock,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { Card, Panel, Field, Button, Callout, SectionHeading, Divider, Stat, Badge, EmptyState } from '@/components/ui'
import { PasswordInput } from '@/components/PasswordInput'
import { DeriveMeter } from '@/components/DeriveMeter'
import {
  generateSaltHex,
  deriveAsync,
  constantTimeEqualHex,
  HASH_ITERATIONS,
  SALT_BYTES,
} from '@/engine/auth'
import { fmtInt, fmtMs, roundsPerSec } from '@/lib/format'
import { useEnter } from '@/lib/motion'
import Reveal from '@/components/Reveal'
import { cx } from '@/lib/cx'

// A local hook wrapping the engine's async derive with progress + cancel.
function useDerive() {
  const [progress, setProgress] = useState(0)
  const [running, setRunning] = useState(false)
  const abortRef = useRef(null)

  const run = useCallback(async (password, salt) => {
    setProgress(0)
    setRunning(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      return await deriveAsync(password, salt, { onProgress: setProgress, signal: controller.signal })
    } finally {
      setRunning(false)
      abortRef.current = null
    }
  }, [])

  const cancel = useCallback(() => abortRef.current?.abort(), [])
  return { progress, running, run, cancel }
}

function CopyButton({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1400)
        } catch {
          /* clipboard blocked — no-op */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-hair bg-fill px-2.5 py-1 font-mono text-[11px] text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neonCyan"
      aria-label={copied ? 'Copied' : label}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : label}
    </button>
  )
}

function HexBlock({ value, placeholder = 'Not derived yet' }) {
  return (
    <p className={cx('break-all font-mono text-xs leading-relaxed', value ? 'text-ink' : 'text-muted')}>
      {value || placeholder}
    </p>
  )
}

export function Security() {
  const enter = useEnter()

  const [salt, setSalt] = useState(() => generateSaltHex())
  const [password, setPassword] = useState('correct horse battery staple')
  const [derived, setDerived] = useState(null) // { verifierHex, elapsedMs, salt }

  const [candidate, setCandidate] = useState('')
  const [compareResult, setCompareResult] = useState(null) // { equal, elapsedMs, hash }

  const mainDerive = useDerive()
  const compareDerive = useDerive()

  function regenSalt() {
    setSalt(generateSaltHex())
    setDerived(null)
    setCompareResult(null)
  }

  async function onDerive() {
    setCompareResult(null)
    const res = await mainDerive.run(password, salt).catch((e) => {
      if (e?.name === 'AbortError') return null
      throw e
    })
    if (res) setDerived({ verifierHex: res.verifierHex, elapsedMs: res.elapsedMs, salt })
  }

  async function onCompare() {
    if (!derived) return
    const res = await compareDerive.run(candidate, derived.salt).catch((e) => {
      if (e?.name === 'AbortError') return null
      throw e
    })
    if (res) {
      setCompareResult({
        equal: constantTimeEqualHex(res.verifierHex, derived.verifierHex),
        elapsedMs: res.elapsedMs,
        hash: res.verifierHex,
      })
    }
  }

  const rps = derived ? roundsPerSec(HASH_ITERATIONS, derived.elapsedMs) : null

  return (
    <motion.div {...enter} className="mx-auto max-w-3xl">
      <Reveal>
        <SectionHeading
          eyebrow="// security internals"
          title="Watch the crypto run"
          sub="This is the honest core of the app. Type a password and watch it get salted, key-stretched with 120,000 SHA-256 rounds, and turned into a verifier — all in this browser tab, with nothing sent anywhere. Only the salt and the verifier are ever stored; the password never is."
        />
      </Reveal>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Reveal className="h-full">
          <Stat label="Iterations" value={fmtInt(HASH_ITERATIONS)} sub="SHA-256 rounds / guess" className="h-full" />
        </Reveal>
        <Reveal className="h-full" delay={0.06}>
          <Stat label="Salt" value={`${SALT_BYTES * 8}-bit`} sub={`${SALT_BYTES} random bytes`} className="h-full" />
        </Reveal>
        <Reveal className="h-full" delay={0.12}>
          <Stat label="Algorithm" value="SHA-256" sub="FIPS 180-4, in-browser" className="h-full" />
        </Reveal>
      </div>

      {/* ---- The live derivation ------------------------------------------- */}
      <Reveal className="mt-6">
      <Card glow className="p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-neonCyan" />
          <h3 className="font-display text-lg font-semibold text-ink">1 · Salt, then stretch</h3>
        </div>

        <div className="mt-5 grid gap-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted">Random salt (generated in your browser)</span>
              <Button type="button" variant="outline" size="sm" onClick={regenSalt} disabled={mainDerive.running}>
                <RefreshCw className="h-3.5 w-3.5" /> New salt
              </Button>
            </div>
            <Panel className="mt-2 p-3.5">
              <HexBlock value={salt} />
            </Panel>
          </div>

          <Field label="Password to derive" htmlFor="sec-password" hint="Try changing one character and re-deriving — the verifier changes completely.">
            <PasswordInput
              id="sec-password"
              autoComplete="off"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setDerived(null)
                setCompareResult(null)
              }}
              placeholder="Type any password"
              disabled={mainDerive.running}
              revealDefault
            />
          </Field>

          {mainDerive.running ? (
            <div className="grid gap-3">
              <DeriveMeter progress={mainDerive.progress} running label="Key-stretching" />
              <Button type="button" variant="ghost" size="sm" onClick={mainDerive.cancel} className="justify-self-start">
                Cancel
              </Button>
            </div>
          ) : (
            <Button type="button" onClick={onDerive} disabled={!password} className="w-full sm:w-auto">
              <Play className="h-4 w-4" /> Run {fmtInt(HASH_ITERATIONS)} rounds
            </Button>
          )}

          {derived && !mainDerive.running && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-mono text-xs text-muted">
                    <Fingerprint className="h-3.5 w-3.5" /> Derived verifier
                  </span>
                  <CopyButton value={derived.verifierHex} />
                </div>
                <Panel className="mt-2 p-3.5">
                  <HexBlock value={derived.verifierHex} />
                </Panel>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="accent">derived in {fmtMs(derived.elapsedMs)}</Badge>
                {rps && <Badge tone="neutral">≈ {fmtInt(rps)} rounds/sec</Badge>}
                <Badge tone="neutral">{fmtInt(HASH_ITERATIONS)} rounds of work per guess</Badge>
              </div>
            </motion.div>
          )}
        </div>

        <Divider className="my-7" />

        {/* ---- What gets stored -------------------------------------------- */}
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-neonCyan" />
          <h3 className="font-display text-lg font-semibold text-ink">2 · What actually gets stored</h3>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          On a successful registration this is the entire record written to your browser. Read every field — there is no
          password anywhere, and the verifier cannot be reversed back into one.
        </p>
        <Panel className="mt-4 overflow-hidden p-0">
          <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-ink">
            <span className="text-muted">{'{'}</span>
            {'\n  '}
            <span className="text-neonCyan">"username"</span>: <span>"ada.lovelace"</span>,{'\n  '}
            <span className="text-neonCyan">"saltHex"</span>:{' '}
            <span className="break-all">"{salt}"</span>,{'\n  '}
            <span className="text-neonCyan">"verifierHex"</span>:{' '}
            <span className="break-all">"{derived?.verifierHex || '— run the derivation above —'}"</span>
            {'\n'}
            <span className="text-muted">{'}'}</span>
          </pre>
        </Panel>
        <Callout tone="ok" icon={Lock} title="No password field" className="mt-4">
          The plaintext password is never written to memory beyond the moment you type it, never sent over a network,
          and never placed in storage. Losing this file leaks nothing usable.
        </Callout>
      </Card>
      </Reveal>

      {/* ---- Constant-time compare --------------------------------------- */}
      <Reveal className="mt-6">
      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-neonCyan" />
          <h3 className="font-display text-lg font-semibold text-ink">3 · Verify a login, in constant time</h3>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Signing in re-derives the verifier from the typed password and the stored salt, then compares it to the saved
          verifier byte by byte — never stopping early, so the time it takes leaks nothing about how close a guess was.
        </p>

        {!derived ? (
          <EmptyState icon={KeyRound} title="Derive a verifier first" className="mt-5">
            Run the key-stretch in step 1, then come back to test a guess against it.
          </EmptyState>
        ) : (
          <div className="mt-5 grid gap-5">
            <Field label="Guess the password" htmlFor="sec-candidate" hint="Type the same password to see a match, or anything else to see a rejection.">
              <PasswordInput
                id="sec-candidate"
                autoComplete="off"
                value={candidate}
                onChange={(e) => {
                  setCandidate(e.target.value)
                  setCompareResult(null)
                }}
                placeholder="Type a candidate password"
                disabled={compareDerive.running}
                revealDefault
              />
            </Field>

            {compareDerive.running ? (
              <div className="grid gap-3">
                <DeriveMeter progress={compareDerive.progress} running label="Re-deriving the guess" />
                <Button type="button" variant="ghost" size="sm" onClick={compareDerive.cancel} className="justify-self-start">
                  Cancel
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={onCompare} disabled={!candidate} className="w-full sm:w-auto">
                <ShieldCheck className="h-4 w-4" /> Derive &amp; compare
              </Button>
            )}

            {compareResult && !compareDerive.running && (
              <Callout
                tone={compareResult.equal ? 'ok' : 'bad'}
                icon={compareResult.equal ? Check : X}
                title={compareResult.equal ? 'Match — access granted' : 'No match — access denied'}
              >
                The guess derived to{' '}
                <span className="font-mono">{compareResult.hash.slice(0, 16)}…</span> and was compared in constant time
                ({fmtMs(compareResult.elapsedMs)} of stretching). A real sign-in returns the exact same message whether
                the username is unknown or the password is wrong, so the form can't reveal which usernames exist.
              </Callout>
            )}
          </div>
        )}
      </Card>
      </Reveal>

      {/* ---- Why it matters ---------------------------------------------- */}
      <Reveal>
      <div className="mt-8">
        <h3 className="font-display text-xl font-semibold text-ink">Why each piece matters</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Panel className="p-5">
            <RefreshCw className="h-5 w-5 text-neonCyan" />
            <p className="mt-3 font-semibold text-ink">Unique salt</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              A fresh 128-bit salt per account means two people with the same password get different verifiers — so
              rainbow tables are useless and one cracked hash tells an attacker nothing about the next.
            </p>
          </Panel>
          <Panel className="p-5">
            <KeyRound className="h-5 w-5 text-neonCyan" />
            <p className="mt-3 font-semibold text-ink">Key stretching</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Repeating SHA-256 {fmtInt(HASH_ITERATIONS)} times makes each guess cost that much work. It's invisible on a
              single honest login but multiplies the price of an offline brute-force attack enormously.
            </p>
          </Panel>
          <Panel className="p-5">
            <ShieldCheck className="h-5 w-5 text-neonCyan" />
            <p className="mt-3 font-semibold text-ink">Constant-time compare</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Comparing every byte instead of stopping at the first mismatch removes a timing side-channel an attacker
              could otherwise use to reconstruct the verifier one byte at a time.
            </p>
          </Panel>
        </div>
      </div>
      </Reveal>

      <Reveal className="mt-6">
      <Callout tone="info" icon={TriangleAlert}>
        Honest scope: this is a faithful in-browser demonstration of the project's C++ auth core. Real deployments would
        use a memory-hard function such as Argon2id and a server-side secret, but the salting, stretching, and
        constant-time comparison shown here are exactly the ideas that matter.
      </Callout>
      </Reveal>
    </motion.div>
  )
}
