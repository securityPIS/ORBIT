import { TODAY } from './constants'

export const DAY = 86_400_000

export function toDate(v) {
  if (v instanceof Date) return v
  const s = String(v)
  return new Date(s.length <= 10 ? s + 'T00:00:00Z' : s)
}

export function dayKey(v) {
  return toDate(v).toISOString().slice(0, 10)
}

export function addDays(v, n) {
  const d = toDate(v)
  d.setUTCDate(d.getUTCDate() + n)
  return d
}

export function clampDate(v, min, max) {
  const t = toDate(v).getTime()
  return new Date(Math.max(toDate(min).getTime(), Math.min(toDate(max).getTime(), t)))
}

export function daysBetween(a, b) {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function fmtShort(v) {
  const d = toDate(v)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

export function fmtRange(a, b) {
  const da = toDate(a)
  const db = toDate(b)
  const y = db.getUTCFullYear()
  return `${MONTHS[da.getUTCMonth()]} ${da.getUTCDate()} – ${MONTHS[db.getUTCMonth()]} ${db.getUTCDate()}, ${y}`
}

export function fmtAgo(v) {
  const diff = Date.now ? (new Date(TODAY + 'T10:30:00Z').getTime() - toDate(v).getTime()) : 0
  const mins = Math.max(1, Math.round(diff / 60000))
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return `${days}d ago`
}

export const PRESETS = [
  { key: '24H', label: '24H', days: 1 },
  { key: '7D', label: '7D', days: 7 },
  { key: '30D', label: '30D', days: 30 },
  { key: '60D', label: '60D', days: 60 },
]

/** Interpolate a location's risk score for a given "as-of" date using its
 *  trend series spanning [firstSeen, lastSeen]. Returns null before it emerged. */
export function scoreAsOf(loc, asOf) {
  const start = toDate(loc.firstSeen).getTime()
  const end = toDate(loc.lastSeen).getTime()
  const t = toDate(asOf).getTime()
  if (t < start - DAY) return null // hasn't emerged yet at this date
  const trend = loc.trend && loc.trend.length ? loc.trend : [loc.score]
  if (end <= start) return trend[trend.length - 1]
  const frac = Math.max(0, Math.min(1, (t - start) / (end - start)))
  const idx = Math.round(frac * (trend.length - 1))
  return trend[idx]
}
