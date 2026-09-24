// Small presentation helpers shared across screens. No logic that affects
// security lives here — this is formatting only.

/** Group digits: 120000 → "120,000". */
export function fmtInt(n) {
  return Number(n || 0).toLocaleString('en-US')
}

/** Human-readable duration: 412 → "412 ms", 1240 → "1.24 s". */
export function fmtMs(ms) {
  if (ms == null || Number.isNaN(ms)) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

/** Derivation throughput in rounds/second, for the "work factor" story. */
export function roundsPerSec(rounds, ms) {
  if (!ms || ms <= 0) return null
  return Math.round((rounds / ms) * 1000)
}

/** Middle-truncate a long hex string so it fits on one line but stays legible. */
export function truncMid(hex, head = 12, tail = 12) {
  if (!hex) return ''
  if (hex.length <= head + tail + 1) return hex
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`
}

/** "14 Sep 2026, 10:42" — locale date for account/session metadata. */
export function fmtDateTime(ts) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

/** Whole seconds remaining, rounded up — for lockout countdowns. */
export function secondsCeil(ms) {
  return Math.max(0, Math.ceil((ms || 0) / 1000))
}
