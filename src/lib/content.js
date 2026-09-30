// Single entry point that applies the portfolio admin's edits to this app's two
// editable surfaces — both owned by engine/auth: the key-stretch work factor
// (settings.hashIterations → applyAuthSettings) and the breach-list of banned
// passwords (banned → applyBannedList). Guards live in the setters, so a missing or
// malformed dataset is a safe no-op that keeps the bundled values.
//
// SECURITY: changing the work factor only affects NEW registrations. Every stored
// account is verified with its own recorded round count, so a returning user can
// never be locked out by an edit here (see engine/auth registerUser / loginUser).

import { applyAuthSettings, applyBannedList } from '@/engine/auth'

export function applyRemoteData(datasets) {
  if (!datasets || typeof datasets !== 'object') return
  applyAuthSettings(datasets.settings)
  applyBannedList(datasets.banned)
}
