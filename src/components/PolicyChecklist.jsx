import { Check, X, Minus } from 'lucide-react'
import { checkPasswordPolicy } from '@/engine/auth'
import { cx } from '@/lib/cx'

// The engine's exact problem strings (checkPasswordPolicy in auth.js). A rule is
// "met" when its string is absent from the returned problems, so this checklist
// is driven entirely by the engine — it never re-implements the policy.
const MIN = 'must be at least 8 characters long'
const MAX = 'must be no longer than 128 characters'

const RULES = [
  { id: 'length', label: 'Between 8 and 128 characters', met: (p) => !p.includes(MIN) && !p.includes(MAX) },
  { id: 'upper', label: 'An uppercase letter', met: (p) => !p.includes('must contain an uppercase letter') },
  { id: 'lower', label: 'A lowercase letter', met: (p) => !p.includes('must contain a lowercase letter') },
  { id: 'digit', label: 'A number', met: (p) => !p.includes('must contain a digit') },
  { id: 'nospace', label: 'No spaces', met: (p) => !p.includes('must not contain spaces') },
  { id: 'common', label: 'Not a commonly used password', met: (p) => !p.includes('is too common — pick something less guessable') },
]

// Icon + text for every state (never colour alone): pending = dash, met = check,
// unmet = cross.
function RuleRow({ label, state }) {
  const Icon = state === 'met' ? Check : state === 'unmet' ? X : Minus
  const tone =
    state === 'met' ? 'text-emerald-400' : state === 'unmet' ? 'text-red-400' : 'text-muted'
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={cx(
          'grid h-5 w-5 shrink-0 place-items-center rounded-full border',
          state === 'met'
            ? 'border-emerald-500/30 bg-emerald-500/10'
            : state === 'unmet'
              ? 'border-red-500/30 bg-red-500/10'
              : 'border-hair bg-fill',
        )}
      >
        <Icon className={cx('h-3 w-3', tone)} aria-hidden="true" />
      </span>
      <span className={cx('text-sm', state === 'pending' ? 'text-muted' : 'text-ink')}>{label}</span>
      <span className="sr-only">{state === 'met' ? '— met' : state === 'unmet' ? '— not met' : '— pending'}</span>
    </li>
  )
}

export function PolicyChecklist({ password, className }) {
  const empty = !password
  const { problems } = checkPasswordPolicy(password || '')

  return (
    <div className={className}>
      <p className="mb-2.5 font-mono text-xs text-muted">Password must include</p>
      <ul className="grid gap-2">
        {RULES.map((rule) => {
          const state = empty ? 'pending' : rule.met(problems) ? 'met' : 'unmet'
          return <RuleRow key={rule.id} label={rule.label} state={state} />
        })}
      </ul>
    </div>
  )
}
