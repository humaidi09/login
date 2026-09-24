import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui'
import { cx } from '@/lib/cx'

// A password field with a show/hide toggle. Defaults to type="password"; the
// toggle is a real, labelled button with aria-pressed and keyboard focus. The
// value is controlled by the parent so nothing is cached here beyond the
// reveal flag.
export function PasswordInput({ id, className, invalid, revealDefault = false, ...props }) {
  const [show, setShow] = useState(revealDefault)
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        invalid={invalid}
        className={cx('pr-11', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        title={show ? 'Hide password' : 'Show password'}
        className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neonCyan"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
