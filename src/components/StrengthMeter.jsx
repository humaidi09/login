import { strengthLabel } from '@/engine/auth'
import { cx } from '@/lib/cx'

// Three-segment strength meter driven by the engine's strengthLabel(). Strength
// is conveyed by TEXT ("Strength: strong") as well as fill and colour, so it is
// never signalled by colour alone.
const LEVELS = {
  weak: { segments: 1, text: 'text-red-400', bar: 'bg-red-400', word: 'weak' },
  fair: { segments: 2, text: 'text-amber-400', bar: 'bg-amber-400', word: 'fair' },
  strong: { segments: 3, text: 'text-emerald-400', bar: 'bg-emerald-400', word: 'strong' },
}

export function StrengthMeter({ password, className }) {
  const has = Boolean(password)
  const level = has ? LEVELS[strengthLabel(password)] : null
  const filled = level?.segments ?? 0

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-muted">Password strength</span>
        <span className={cx('font-mono text-xs font-medium', level ? level.text : 'text-muted')}>
          {level ? level.word : '—'}
        </span>
      </div>
      <div className="mt-1.5 flex gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cx(
              'h-1.5 flex-1 rounded-full transition-colors duration-300',
              i < filled ? level.bar : 'bg-fill-strong',
            )}
          />
        ))}
      </div>
    </div>
  )
}
