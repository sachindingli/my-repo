import { CANDIDATES } from './candidates'

// A simple, honest "winning chance" derived only from the current votes.
// It sharpens the current vote shares (more total votes -> more confident),
// so the leader's chance is higher than their raw share but nothing is
// fabricated. It is a rough projection, not a statistical forecast.
export function winChances(counts: Record<string, number>): Record<string, number> {
  const ids = CANDIDATES.map((c) => c.id)
  const total = ids.reduce((s, id) => s + (counts[id] || 0), 0)
  const out: Record<string, number> = {}

  if (total === 0) {
    const even = Math.round(100 / ids.length)
    ids.forEach((id) => (out[id] = even))
    return out
  }

  const k = Math.min(12, 2 + total / 12) // confidence grows with sample size
  const exps = ids.map((id) => Math.exp(k * ((counts[id] || 0) / total)))
  const sum = exps.reduce((a, b) => a + b, 0)
  ids.forEach((id, i) => (out[id] = Math.round((exps[i] / sum) * 100)))
  return out
}
