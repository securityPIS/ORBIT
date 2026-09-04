// Central reference: today's operational date and shared taxonomy.
export const TODAY = '2026-07-14'

// ---------------------------------------------------------------------------
// RISK SCORE SCALE — INVERTED INDEX
//
//   score 1   = most dangerous
//   score 100 = safest
//
// It reads like a league table: rank 1 is the worst place to be. Band 1–20 is
// the high-risk band the assessment methodology is built around.
//
// Internally, anything that needs "how dangerous is this" as a magnitude (map
// glow radius, heatmap dot size, route cost weighting) uses THREAT, which is
// the plain 0–100 intensity. `threat` and `score` are two views of one number:
//
//   threat = 101 - score        score = 101 - threat
//
// Rule of thumb: display and compare with `score`, do arithmetic with `threat`.
// ---------------------------------------------------------------------------
export const SCORE_MIN = 1
export const SCORE_MAX = 100

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

/** Displayed 1–100 score → 1–100 danger intensity. */
export function threatFromScore(score) {
  return 101 - clamp(Math.round(Number(score) || SCORE_MAX), SCORE_MIN, SCORE_MAX)
}

/** 0–100 danger intensity → displayed 1–100 score. */
export function scoreFromThreat(threat) {
  return 101 - clamp(Math.round(Number(threat) || 0), SCORE_MIN, SCORE_MAX)
}

export const SEVERITY = {
  critical: { key: 'critical', label: 'Critical', color: '#ef4444', min: 1, max: 20, rank: 3 },
  high: { key: 'high', label: 'High', color: '#f97316', min: 21, max: 40, rank: 2 },
  moderate: { key: 'moderate', label: 'Moderate', color: '#f5b301', min: 41, max: 60, rank: 1 },
  low: { key: 'low', label: 'Low', color: '#22c55e', min: 61, max: 100, rank: 0 },
}

// Least → most severe, for legends and filter menus.
export const SEVERITY_ORDER = ['low', 'moderate', 'high', 'critical']

/** Severity band for a displayed score. Low numbers are the dangerous ones. */
export function severityFromScore(score) {
  const s = clamp(Math.round(Number(score) || SCORE_MAX), SCORE_MIN, SCORE_MAX)
  if (s <= 20) return 'critical'
  if (s <= 40) return 'high'
  if (s <= 60) return 'moderate'
  return 'low'
}

export function severityColor(key) {
  return SEVERITY[key]?.color ?? '#64748b'
}

// ---------------------------------------------------------------------------
// 5 × 5 RISK ASSESSMENT MATRIX
// ---------------------------------------------------------------------------

/** LIKELIHOOD 1–5, derived from the voyage risk score in 20-point bands. */
export const LIKELIHOOD_LEVELS = [
  { level: 1, label: 'Rare', short: 'Rare', scoreMin: 81, scoreMax: 100, note: 'Score 81–100' },
  { level: 2, label: 'Unlikely', short: 'Unlikely', scoreMin: 61, scoreMax: 80, note: 'Score 61–80' },
  { level: 3, label: 'Possible', short: 'Possible', scoreMin: 41, scoreMax: 60, note: 'Score 41–60' },
  { level: 4, label: 'Likely', short: 'Likely', scoreMin: 21, scoreMax: 40, note: 'Score 21–40' },
  { level: 5, label: 'Almost Certain', short: 'Almost certain', scoreMin: 1, scoreMax: 20, note: 'Score 1–20' },
]

/** IMPACT 1–5, the consequence side of the matrix. */
export const IMPACT_LEVELS = [
  { level: 1, label: 'Insignificant', note: 'Negligible loss, absorbed by operations' },
  { level: 2, label: 'Minor', note: 'Limited loss, recoverable within the voyage' },
  { level: 3, label: 'Moderate', note: 'Material loss requiring claim and re-planning' },
  { level: 4, label: 'Major', note: 'Severe loss of asset, cargo or capability' },
  { level: 5, label: 'Catastrophic', note: 'Total loss / loss of life / irrecoverable' },
]

/** Score 1–100 → likelihood level 1–5. */
export function likelihoodFromScore(score) {
  const s = clamp(Math.round(Number(score) || SCORE_MAX), SCORE_MIN, SCORE_MAX)
  if (s <= 20) return 5
  if (s <= 40) return 4
  if (s <= 60) return 3
  if (s <= 80) return 2
  return 1
}

export function likelihoodMeta(level) {
  return LIKELIHOOD_LEVELS.find((l) => l.level === level) || LIKELIHOOD_LEVELS[0]
}

export function impactMeta(level) {
  return IMPACT_LEVELS.find((l) => l.level === level) || IMPACT_LEVELS[0]
}

/** Rating bands over the 1–25 product. */
export const RATING_BANDS = [
  { key: 'low', label: 'Low', min: 1, max: 4, color: '#22c55e', action: 'Proceed. Monitor under routine reporting.' },
  { key: 'medium', label: 'Medium', min: 5, max: 9, color: '#f5b301', action: 'Proceed with defined controls and a named risk owner.' },
  { key: 'high', label: 'High', min: 10, max: 14, color: '#f97316', action: 'Management approval required before sailing. Apply mitigations.' },
  { key: 'very-high', label: 'Very High', min: 15, max: 19, color: '#ef4444', action: 'Senior approval only. Re-route or harden before commitment.' },
  { key: 'extreme', label: 'Extreme', min: 20, max: 25, color: '#b91c1c', action: 'Do not sail on this plan. Re-route, re-time, or decline the voyage.' },
]

export function ratingBand(product) {
  const p = clamp(Math.round(Number(product) || 1), 1, 25)
  return RATING_BANDS.find((b) => p >= b.min && p <= b.max) || RATING_BANDS[0]
}

/** The full assessment for an impact × likelihood pair. */
export function assessRisk(impact, likelihood) {
  const i = clamp(Math.round(Number(impact) || 1), 1, 5)
  const l = clamp(Math.round(Number(likelihood) || 1), 1, 5)
  const product = i * l
  const band = ratingBand(product)
  return { impact: i, likelihood: l, product, band }
}

// Threat categories → lucide icon name + display label.
export const CATEGORIES = {
  armed_conflict: { key: 'armed_conflict', label: 'Armed Conflict', icon: 'Swords', color: '#ef4444' },
  terrorism: { key: 'terrorism', label: 'Terrorism', icon: 'Flame', color: '#f97316' },
  maritime: { key: 'maritime', label: 'Maritime Security', icon: 'Ship', color: '#38bdf8' },
  political: { key: 'political', label: 'Political Instability', icon: 'Landmark', color: '#f5b301' },
  civil_unrest: { key: 'civil_unrest', label: 'Civil Unrest', icon: 'Megaphone', color: '#a78bfa' },
  cyber: { key: 'cyber', label: 'Cyber Threats', icon: 'ShieldAlert', color: '#22d3ee' },
}

export const LEVELS = ['Low', 'Moderate', 'High', 'Severe']

export const REGIONS = [
  'All Regions',
  'Middle East',
  'Africa',
  'Europe',
  'Asia-Pacific',
  'Americas',
  'Maritime Corridors',
]
