import {
  IMPACT_LEVELS,
  assessRisk,
  impactMeta,
  likelihoodFromScore,
  likelihoodMeta,
  scoreFromThreat,
  severityFromScore,
  SCORE_MAX,
  SCORE_MIN,
} from './constants'
import { riskAtPoint } from './routing'

// ---------------------------------------------------------------------------
// IMPACT — the consequence side of the matrix.
//
// The user lists whatever is exposed on the voyage (hull, cargo, crew, charter
// commitment, …). Each entity carries a money value and a weight saying how
// much that money matters to this particular operation; the pair is what turns
// two identical $10M lines into different impact levels. An entity can also be
// pinned to a level by hand, which then wins over the computed one.
// ---------------------------------------------------------------------------

/** Suggested groupings. The field is free text — anything can be typed in. */
export const IMPACT_CATEGORIES = [
  'Vessel',
  'Cargo',
  'Crew',
  'Charter / Revenue',
  'Environment',
  'Third-party liability',
  'Reputation',
]

/** Weight 1–5 → multiplier. 3 is "counts at face value". */
export const IMPACT_WEIGHTS = [
  { weight: 1, label: 'Very low', factor: 0.33 },
  { weight: 2, label: 'Low', factor: 0.66 },
  { weight: 3, label: 'Normal', factor: 1 },
  { weight: 4, label: 'High', factor: 1.5 },
  { weight: 5, label: 'Critical', factor: 2.25 },
]

export function weightFactor(weight) {
  return IMPACT_WEIGHTS.find((w) => w.weight === Math.round(weight))?.factor ?? 1
}

/**
 * Lower bound (in weighted USD) of impact levels 2–5. Below the first entry the
 * entity is level 1. Held in the store so an operator can recalibrate them to
 * the size of their own book.
 */
export const DEFAULT_IMPACT_THRESHOLDS = [1_000_000, 10_000_000, 50_000_000, 200_000_000]

/** Weighted value → impact level 1–5 against the supplied thresholds. */
export function impactLevelFromValue(weightedValue, thresholds = DEFAULT_IMPACT_THRESHOLDS) {
  const v = Number(weightedValue) || 0
  let level = 1
  for (let i = 0; i < thresholds.length; i++) if (v >= thresholds[i]) level = i + 2
  return level
}

/** One impact entity, resolved: weighted value, computed level, effective level. */
export function resolveImpactEntity(entity, thresholds = DEFAULT_IMPACT_THRESHOLDS) {
  const value = Math.max(0, Number(entity.value) || 0)
  const weight = Math.max(1, Math.min(5, Math.round(Number(entity.weight) || 3)))
  const factor = weightFactor(weight)
  const weightedValue = value * factor
  const autoLevel = impactLevelFromValue(weightedValue, thresholds)
  const manualLevel = entity.manualLevel == null ? null : Math.max(1, Math.min(5, Math.round(entity.manualLevel)))
  const level = manualLevel ?? autoLevel
  return { ...entity, value, weight, factor, weightedValue, autoLevel, manualLevel, level, meta: impactMeta(level) }
}

/**
 * Portfolio impact. The voyage is as exposed as its worst single exposure, so
 * the level is the maximum across entities — the same convention used for
 * likelihood. Totals are reported alongside for context.
 */
export function computeImpact(entities = [], thresholds = DEFAULT_IMPACT_THRESHOLDS) {
  const resolved = entities.map((e) => resolveImpactEntity(e, thresholds))
  const totalValue = resolved.reduce((a, e) => a + e.value, 0)
  const totalWeighted = resolved.reduce((a, e) => a + e.weightedValue, 0)
  const level = resolved.length ? Math.max(...resolved.map((e) => e.level)) : 1
  const driver = resolved.find((e) => e.level === level) || null
  return {
    entities: resolved,
    totalValue,
    totalWeighted,
    level,
    meta: impactMeta(level),
    driver,
    // What the combined book would score on its own — shown as a sanity check
    // against the max, since a long tail of medium exposures still adds up.
    aggregateLevel: impactLevelFromValue(totalWeighted, thresholds),
    empty: resolved.length === 0,
  }
}

// ---------------------------------------------------------------------------
// LIKELIHOOD — the probability side, read off the route.
// ---------------------------------------------------------------------------

/**
 * Risk score at a position, derived from the assessed threat picture. Falls
 * back to the safest score when nothing is near, so every waypoint always has
 * a score attached.
 */
export function scoreAtPoint(lat, lng, locations = []) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return SCORE_MAX
  const threat = riskAtPoint(lng, lat, locations)
  return scoreFromThreat(threat)
}

/**
 * Resolve one waypoint to a score. A manual score always wins — an operator may
 * know something the assessed picture does not.
 */
export function resolveWaypoint(point, locations = [], index = 0) {
  const autoScore = scoreAtPoint(point.lat, point.lng, locations)
  const manualScore =
    point.manualScore == null || point.manualScore === ''
      ? null
      : Math.max(SCORE_MIN, Math.min(SCORE_MAX, Math.round(Number(point.manualScore))))
  const score = manualScore ?? autoScore
  return {
    ...point,
    index,
    autoScore,
    manualScore,
    score,
    severity: severityFromScore(score),
    likelihood: likelihoodFromScore(score),
  }
}

/**
 * Voyage likelihood across origin → stops → destination.
 * Aggregation is MAX danger, i.e. the minimum score on the itinerary: a voyage
 * is only as safe as its worst call.
 */
export function computeLikelihood(waypoints = [], locations = []) {
  const points = waypoints.map((w, i) => resolveWaypoint(w, locations, i))
  if (!points.length) return { points, score: SCORE_MAX, level: 1, meta: likelihoodMeta(1), driver: null, empty: true }
  const score = Math.min(...points.map((p) => p.score))
  const level = likelihoodFromScore(score)
  const driver = points.find((p) => p.score === score) || null
  return { points, score, level, meta: likelihoodMeta(level), driver, empty: false }
}

// ---------------------------------------------------------------------------
// RATING — impact × likelihood on the 5 × 5 matrix.
// ---------------------------------------------------------------------------

export function computeRating({ impact, likelihood }) {
  const assessment = assessRisk(impact.level, likelihood.level)
  return {
    ...assessment,
    impactMeta: impact.meta,
    likelihoodMeta: likelihood.meta,
    impactDriver: impact.driver,
    likelihoodDriver: likelihood.driver,
    ready: !impact.empty && !likelihood.empty,
  }
}

/** Every cell of the matrix, for rendering the grid. */
export function matrixCells() {
  const rows = []
  for (let i = IMPACT_LEVELS.length; i >= 1; i--) {
    const row = []
    for (let l = 1; l <= 5; l++) row.push(assessRisk(i, l))
    rows.push({ impact: i, meta: impactMeta(i), cells: row })
  }
  return rows
}

export function fmtMoney(n) {
  const v = Number(n) || 0
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(v >= 1e8 ? 0 : 1)}M`
  if (v >= 1e3) return `$${Math.round(v / 1e3)}k`
  return `$${Math.round(v)}`
}
