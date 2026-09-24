import { create } from 'zustand'
import { createUserStore, registerUser, loginUser } from '@/engine/auth'

// -----------------------------------------------------------------------------
// App state — a thin, honest wrapper around the crypto engine.
//
// The engine (src/engine/auth.js) owns ALL security: salting, the 120,000-round
// key-stretch, and the constant-time compare. This store only:
//   • holds the engine's in-memory user store (createUserStore),
//   • hydrates it from / persists it to localStorage,
//   • tracks the current session, and
//   • adds a login lockout the engine does not itself provide.
//
// SECURITY INVARIANT: nothing here ever holds or persists a plaintext or
// otherwise recoverable password. The engine returns only {username, saltHex,
// verifierHex}; serializeUser() below is an allow-list that guarantees only
// those fields (plus a createdAt timestamp) ever reach localStorage. Passwords
// live in React state on the form for the duration of a submit and nowhere else.
// -----------------------------------------------------------------------------

const USERS_KEY = 'login.users.v1'
const SESSION_KEY = 'login.session.v1'
const ATTEMPTS_KEY = 'login.attempts.v1'

// Lockout policy (this store, not the engine): after MAX_ATTEMPTS consecutive
// failed sign-ins for a given typed username, further attempts are blocked for
// LOCKOUT_MS. Keyed on the typed name (lower-cased) whether or not it exists, so
// a locked form never reveals which usernames are real.
export const MAX_ATTEMPTS = 5
export const LOCKOUT_MS = 30_000

function safeParse(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable / full — the app stays functional for the session */
  }
}

// The ONLY shape ever written to disk. Deliberately explicit so a stray field
// (e.g. an accidental password) can never be persisted.
function serializeUser(record) {
  return {
    username: record.username,
    saltHex: record.saltHex,
    verifierHex: record.verifierHex,
    createdAt: record.createdAt ?? Date.now(),
  }
}

// Rebuild the engine store from persisted verifiers on boot.
function hydrate() {
  const store = createUserStore()
  const users = []
  const raw = safeParse(USERS_KEY, [])
  if (Array.isArray(raw)) {
    for (const u of raw) {
      if (
        u &&
        typeof u.username === 'string' &&
        typeof u.saltHex === 'string' &&
        typeof u.verifierHex === 'string' &&
        store.add({ username: u.username, saltHex: u.saltHex, verifierHex: u.verifierHex })
      ) {
        users.push(serializeUser(u))
      }
    }
  }

  let session = safeParse(SESSION_KEY, null)
  if (session && (typeof session.username !== 'string' || !store.has(session.username))) {
    session = null // stale session with no matching account
  }

  const attempts = safeParse(ATTEMPTS_KEY, {}) || {}
  return { store, users, session, attempts: typeof attempts === 'object' ? attempts : {} }
}

const initial = hydrate()

export const useAuthStore = create((set, get) => ({
  store: initial.store,
  users: initial.users,
  session: initial.session,
  attempts: initial.attempts,

  /** True if a username is already registered (case-insensitive, via the engine). */
  hasUser: (username) => get().store.has(username),

  /** How many accounts exist in this browser. */
  userCount: () => get().users.length,

  /**
   * Lockout snapshot for a typed username. Pure read — also treats an expired
   * lock as a clean slate so the UI recovers on its own.
   */
  lockInfo: (username) => {
    const key = (username || '').trim().toLowerCase()
    const entry = get().attempts[key]
    const now = Date.now()
    if (!entry) return { locked: false, remainingMs: 0, attemptsLeft: MAX_ATTEMPTS, count: 0 }
    if (entry.lockedUntil && entry.lockedUntil > now) {
      return { locked: true, remainingMs: entry.lockedUntil - now, attemptsLeft: 0, count: entry.count }
    }
    if (entry.lockedUntil && entry.lockedUntil <= now) {
      return { locked: false, remainingMs: 0, attemptsLeft: MAX_ATTEMPTS, count: 0 }
    }
    return { locked: false, remainingMs: 0, attemptsLeft: Math.max(0, MAX_ATTEMPTS - entry.count), count: entry.count }
  },

  /**
   * Register via the engine (async 120k derive; forward onProgress/signal in
   * `options`). On success, persist ONLY the verifier record and open a session.
   */
  register: async (creds, options = {}) => {
    const result = await registerUser(get().store, creds, options)
    if (result.ok) {
      const record = serializeUser({ ...result.record, createdAt: Date.now() })
      const users = [...get().users, record]
      const session = { username: record.username, since: Date.now(), lastDeriveMs: result.elapsedMs ?? null }
      set({ users, session })
      safeWrite(USERS_KEY, users)
      safeWrite(SESSION_KEY, session)
    }
    return result
  },

  /**
   * Sign in via the engine (constant-time compare inside). Enforces lockout,
   * returns the engine's verbatim (enumeration-safe) message on failure, and
   * annotates failures with attemptsLeft / lockedUntil for the UI.
   */
  login: async (creds, options = {}) => {
    const key = (creds.username || '').trim().toLowerCase()
    const now = Date.now()
    const prev = get().attempts[key]

    if (prev?.lockedUntil && prev.lockedUntil > now) {
      return { ok: false, locked: true, lockedUntil: prev.lockedUntil, message: 'Too many attempts. Try again shortly.' }
    }

    const result = await loginUser(get().store, creds, options)
    const attempts = { ...get().attempts }

    if (result.ok) {
      delete attempts[key]
      const canonical = get().store.get(creds.username)?.username || creds.username
      const session = { username: canonical, since: Date.now(), lastDeriveMs: result.elapsedMs ?? null }
      set({ attempts, session })
      safeWrite(ATTEMPTS_KEY, attempts)
      safeWrite(SESSION_KEY, session)
      return result
    }

    // Failure — count it. An expired prior lock resets the counter.
    const expired = prev?.lockedUntil && prev.lockedUntil <= now
    const count = (expired || !prev ? 0 : prev.count) + 1
    const lockedUntil = count >= MAX_ATTEMPTS ? now + LOCKOUT_MS : undefined
    attempts[key] = { count, lockedUntil }
    set({ attempts })
    safeWrite(ATTEMPTS_KEY, attempts)

    return {
      ...result,
      attemptsLeft: Math.max(0, MAX_ATTEMPTS - count),
      lockedUntil,
    }
  },

  /** End the session (leaves registered accounts intact). */
  logout: () => {
    set({ session: null })
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
  },
}))
