import { HASH_ITERATIONS } from '@/engine/auth'
import { fmtInt } from '@/lib/format'
import { cx } from '@/lib/cx'

// Live progress for the 120,000-round key-stretch. The percentage and the round
// counter are real text (a proper progressbar role + values), so the state does
// not depend on the bar's colour. `progress` is a 0…1 fraction from the engine's
// deriveAsync onProgress callback.
export function DeriveMeter({ progress = 0, running = false, done = false, label = 'Deriving', className }) {
  const pct = Math.round(progress * 100)
  const rounds = Math.round(progress * HASH_ITERATIONS)
  const heading = running ? `${label}…` : done ? 'Derivation complete' : label

  return (
    <div className={cx('rounded-xl border border-hair bg-fill p-4', className)}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-ink">{heading}</span>
        <span className="font-mono text-xs tabular-nums text-muted">{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${label}: ${pct}%`}
        className="mt-2 h-2 w-full overflow-hidden rounded-full border border-hair bg-fill-strong"
      >
        <div
          className="h-full rounded-full bg-neonCyan transition-[width] duration-150 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 font-mono text-[11px] tabular-nums text-muted">
        {fmtInt(rounds)} / {fmtInt(HASH_ITERATIONS)} SHA-256 rounds
      </p>
    </div>
  )
}
