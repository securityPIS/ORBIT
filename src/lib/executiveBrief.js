// ---------------------------------------------------------------------------
// EXECUTIVE BRIEF
//
// Turns a finished route analysis into an editable document model. The model is
// deliberately dumb — a list of sections, each a list of typed blocks whose text
// is plain strings — because everything downstream edits it in place: the
// on-screen Word-style editor writes back to these strings, the print stylesheet
// renders them, and the PDF writer walks the same tree (`src/lib/briefPdf.js`).
//
// Nothing here reads the store, so the generator stays pure and testable: the
// caller resolves the analysis, the risk assessment and the dated risk picture,
// and passes them in.
// ---------------------------------------------------------------------------

import { CATEGORIES, SEVERITY, scoreFromThreat, severityFromScore, severityColor } from './constants'
import { haversineNm } from './routing'
import { fmtMoney } from './riskRating'
import { toDate } from './time'

// --- block constructors -----------------------------------------------------

let seq = 0
const bid = () => `b${++seq}`

export const P = (text) => ({ id: bid(), type: 'paragraph', text })
export const H = (level, text) => ({ id: bid(), type: 'heading', level, text })
export const UL = (items) => ({ id: bid(), type: 'bullets', items: items.filter(Boolean) })
export const TABLE = (columns, rows, caption) => ({ id: bid(), type: 'table', columns, rows, caption })
export const KPI = (items) => ({ id: bid(), type: 'kpi', items })
export const NOTE = (tone, title, text) => ({ id: bid(), type: 'callout', tone, title, text })

/** Table cells are either a plain string or `{ text, color }` for severity tint. */
export function cellText(cell) {
  return cell && typeof cell === 'object' ? (cell.text ?? '') : (cell ?? '')
}
export function cellColor(cell) {
  return cell && typeof cell === 'object' ? cell.color : undefined
}
export function setCellText(cell, text) {
  return cell && typeof cell === 'object' ? { ...cell, text } : text
}

/**
 * Severity colours are tuned for the dark UI. On white paper — and in the PDF —
 * the amber and green read too light, so both surfaces darken them through
 * here rather than each keeping its own table.
 */
const PAPER_COLORS = {
  '#22c55e': '#15803d',
  '#f5b301': '#a16207',
  '#f97316': '#c2410c',
  '#ef4444': '#b91c1c',
  '#b91c1c': '#991b1b',
}

export function paperColor(hex) {
  return PAPER_COLORS[hex] || hex
}

/** A score cell painted with its severity colour. */
const scoreCell = (score, severity) => ({
  text: String(score),
  color: severityColor(severity || severityFromScore(score)),
})

/** Fresh ids for a block pasted in by the editor. */
export function newBlock(type) {
  switch (type) {
    case 'bullets':
      // Not UL([]) — that constructor drops empty entries, and a new list needs
      // exactly one empty item for the caret to land in.
      return { id: bid(), type: 'bullets', items: [''] }
    case 'heading':
      return H(3, 'New heading')
    case 'table':
      return TABLE(['Column A', 'Column B'], [['', '']])
    case 'callout':
      return NOTE('info', 'Note', '')
    default:
      return P('')
  }
}

// --- formatting -------------------------------------------------------------

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function fmtLong(v) {
  const d = toDate(v)
  return `${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

const nm = (v) => `${Math.round(v).toLocaleString()} nm`
const hrs = (v) => (v >= 48 ? `${(v / 24).toFixed(1)} days` : `${Math.round(v)} h`)
const days = (v) => `${v.toFixed(1)} days`
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '0%')
const catLabel = (key) => CATEGORIES[key]?.label || key || 'Unclassified'
const sevLabel = (key) => SEVERITY[key]?.label || 'Low'
const list = (items) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0] || '')

/**
 * How the driving exposure got its level. A pinned entity (a crew, typically)
 * carries no money value, so quoting "$0" would read as though nothing were at
 * stake — the opposite of what pinning it to level 5 means.
 */
function impactDriverPhrase(driver) {
  if (driver.manualLevel != null) return 'pinned by hand rather than valued'
  return `at ${fmtMoney(driver.value)} (${fmtMoney(driver.weightedValue)} weighted)`
}

/** Ordinal-free label for a candidate: "Route 2 (recommended, fastest)". */
function routeLabel(route, index) {
  const badges = route.badges?.length ? ` (${route.badges.join(', ')})` : ''
  return `Route ${index + 1}${badges}`
}

// --- mitigation library -----------------------------------------------------
//
// Controls are keyed by the threat vector that calls for them. The micro
// section only prints the themes actually present on the recommended track, so
// a Baltic run does not carry a citadel drill and a Red Sea run does not lose
// one.

const MITIGATIONS = {
  maritime: {
    title: 'Ship hardening and anti-boarding posture',
    items: [
      'Implement BMP5 hardening before entering the high-risk area: razor wire on the lowest freeboard sections, hawse-pipe covers fitted, all external doors secured and controlled from inside.',
      'Rig and pressure-test the water spray / foam monitors on both quarters; run one drill before entry rather than on the day.',
      'Establish and store the citadel: independent comms, 72 hours of water, engine and steering isolation, and a muster drill logged in the deck log.',
      'Double the bridge watch and post a dedicated lookout aft during dawn and dusk; run the radar on short pulse for small-craft detection.',
    ],
  },
  armed_conflict: {
    title: 'Conflict-zone transit discipline',
    items: [
      'Transit the affected leg at full service speed, at night where the routing allows, and hold the maximum practical offing from a hostile coastline.',
      'Brief the AIS policy in writing before entry — silent running where flag state and coastal regulation permit, with the decision and its authority recorded.',
      'Notify underwriters and the war-risk broker before entering a listed area; confirm cover, the breach-of-warranty position and the additional premium in writing.',
      'Harden the bridge and accommodation front with available material and move non-essential crew off the bridge deck for the duration of the transit.',
    ],
  },
  terrorism: {
    title: 'Security level and access control',
    items: [
      'Raise the Ship Security Plan to ISPS Level 2 for the affected calls, with a single controlled access point and a maintained visitor log.',
      'Screen stores, bunkers and contractors alongside; no unaccompanied shore personnel below deck.',
      'Suspend or escort shore leave at the affected ports and brief the crew on local reporting lines before arrival.',
    ],
  },
  cyber: {
    title: 'Navigation resilience, GNSS and cyber',
    items: [
      'Expect GNSS degradation and spoofing on the affected leg: cross-check position by radar parallel index, visual bearings and celestial where available, and log the check hourly.',
      'Carry a current paper or independently sourced backup chart folio for the affected area; confirm the ECDIS is not the sole means of position fixing.',
      'Segregate the navigation network from business and crew networks; suspend removable-media use for the transit and confirm ECDIS and radar software are at supported versions.',
    ],
  },
  civil_unrest: {
    title: 'Port call and shore-side exposure',
    items: [
      'Brief the master and agent on unrest flashpoints and cordons before arrival; agree an alternative gate and a departure trigger in advance.',
      'Restrict shore leave to escorted movements on vetted routes and hold a rolling headcount for anyone ashore.',
      'Keep the vessel in a state of readiness to depart at short notice: engines on standby notice, gangway watch briefed, mooring party reachable.',
    ],
  },
  political: {
    title: 'Regulatory and state-actor exposure',
    items: [
      'Monitor coastal-state advisories and NAVAREA warnings daily through the transit and record each check against the passage plan.',
      'Carry documentation for cargo, ownership and insurance in a form that can be produced immediately at a boarding or inspection.',
      'Agree escalation and reporting lines with the company security officer before sailing, including the decision to divert and who owns it.',
    ],
  },
}

const BASELINE_MITIGATION = {
  title: 'Baseline voyage controls',
  items: [
    'Brief the passage plan against this assessment at the pre-departure meeting and record acknowledgement by the master and the chief engineer.',
    'Maintain a scheduled position and situation report to the company at an interval matched to the risk band, and treat a missed report as an incident.',
    'Hold the contingency plan — nearest refuge port, medical evacuation route and salvage contact — with the passage plan rather than in the office.',
  ],
}

/** Controls for a route, in the order the voyage encounters the threats. */
function mitigationThemes(route, locIndex) {
  const seen = []
  const push = (key) => {
    if (key && MITIGATIONS[key] && !seen.includes(key)) seen.push(key)
  }
  // Anything outside the safest band earns its controls: a track passing 19 nm
  // off a zone assessed at 73 still wants the hardening posture rehearsed, even
  // though nothing on it is critical.
  for (const h of route.hotspots || []) {
    if (h.score <= 80) push(h.primary || locIndex.get(h.id)?.primary)
  }
  for (const cp of route.chokepoints || []) {
    if (scoreFromThreat(cp.riskScore) <= 80) push('maritime')
  }
  return seen.map((key) => ({ key, ...MITIGATIONS[key] }))
}

// --- macro ------------------------------------------------------------------

function macroSection({ dated, incidents, emerging, documents, asOf, preset, routes, corridorIds }) {
  const total = dated.length
  const avg = total ? Math.round(dated.reduce((a, l) => a + l.liveScore, 0) / total) : 100
  const critical = dated.filter((l) => l.liveSeverity === 'critical')
  const high = dated.filter((l) => l.liveSeverity === 'high')
  const worst = [...dated].sort((a, b) => a.liveScore - b.liveScore)

  // Threat vectors, counted across every category a zone carries.
  const tally = new Map()
  for (const l of dated) {
    for (const c of l.categories || []) {
      const row = tally.get(c.key) || { key: c.key, zones: 0, worst: 100, worstName: '—' }
      row.zones += 1
      if (l.liveScore < row.worst) {
        row.worst = l.liveScore
        row.worstName = l.name
      }
      tally.set(c.key, row)
    }
  }
  const vectors = [...tally.values()].sort((a, b) => b.zones - a.zones || a.worst - b.worst)

  // Regions, so the reader sees where the weight of the picture sits.
  const byRegion = new Map()
  for (const l of dated) {
    const row = byRegion.get(l.region) || { region: l.region, zones: 0, sum: 0, worst: 100 }
    row.zones += 1
    row.sum += l.liveScore
    row.worst = Math.min(row.worst, l.liveScore)
    byRegion.set(l.region, row)
  }
  const regions = [...byRegion.values()].sort((a, b) => a.worst - b.worst)

  const criticalOnCorridor = critical.filter((l) => corridorIds.has(l.id))
  const emergingOnCorridor = emerging.filter((e) => corridorIds.has(e.locationId))
  const recentIncidents = [...incidents]
    .sort((a, b) => toDate(b.time) - toDate(a.time))
    .slice(0, 5)

  return {
    id: 'macro',
    kind: 'macro',
    heading: '2. Macro analysis — global risk environment',
    blocks: [
      P(
        `As of ${fmtLong(asOf)} the assessed picture covers ${total} risk locations worldwide, drawn from ${documents.length} analysed intelligence document${documents.length === 1 ? '' : 's'} and ${incidents.length} logged incident${incidents.length === 1 ? '' : 's'}. The global mean sits at ${avg} on the 1–100 inverted risk index, where 1 is the most dangerous position and 1–20 is the high-risk band. ${critical.length} zone${critical.length === 1 ? ' scores' : 's score'} in the critical band and ${high.length} in the high band; together they account for ${pct(critical.length + high.length, total)} of everything currently tracked.`
      ),
      KPI([
        { label: 'Global mean index', value: String(avg), sub: `${sevLabel(severityFromScore(avg))} band` },
        { label: 'Critical zones', value: String(critical.length), sub: 'score 1–20' },
        { label: 'High zones', value: String(high.length), sub: 'score 21–40' },
        { label: 'Monitored areas', value: String(total), sub: `window ${preset}` },
      ]),

      H(3, '2.1 Where the weight sits'),
      P(
        `${regions[0]?.region || 'No region'} carries the most severe single assessment at ${regions[0]?.worst ?? '—'}, ahead of ${regions[1]?.region || '—'} at ${regions[1]?.worst ?? '—'}. The table reads worst-first: the mean describes the general state of a region, the worst score is the one that drives a routing decision through it.`
      ),
      TABLE(
        ['Region', 'Zones', 'Mean index', 'Worst index'],
        regions.map((r) => [
          r.region,
          String(r.zones),
          String(Math.round(r.sum / r.zones)),
          scoreCell(r.worst),
        ]),
        'Table 1 — Assessed risk by region, worst first.'
      ),

      H(3, '2.2 Dominant threat vectors'),
      P(
        `The global picture is dominated by ${list(vectors.slice(0, 3).map((v) => catLabel(v.key).toLowerCase()))}. Each vector is counted wherever a zone carries it, so a location assessed for two threats appears against both.`
      ),
      TABLE(
        ['Threat vector', 'Zones', 'Share', 'Worst index', 'Driving location'],
        vectors.map((v) => [
          catLabel(v.key),
          String(v.zones),
          pct(v.zones, total),
          scoreCell(v.worst),
          v.worstName,
        ]),
        'Table 2 — Threat vectors across the assessed picture.'
      ),

      H(3, '2.3 Highest-rated global zones'),
      TABLE(
        ['Location', 'Region', 'Primary vector', 'Index', 'Severity', 'Last assessed'],
        worst.slice(0, 8).map((l) => [
          l.name,
          l.region,
          catLabel(l.primary),
          scoreCell(l.liveScore, l.liveSeverity),
          sevLabel(l.liveSeverity),
          l.lastSeen,
        ]),
        'Table 3 — The eight most severe assessments worldwide on the reporting date.'
      ),

      H(3, '2.4 Emerging developments'),
      UL([
        ...emerging.map((e) => {
          const loc = dated.find((l) => l.id === e.locationId)
          return `${e.label} — reported ${e.ago}${loc ? `, ${e.severity} against an index of ${loc.liveScore}` : ''}.`
        }),
        ...recentIncidents.slice(0, 3).map((i) => `${i.title} (${i.place}) — ${i.description}`),
      ]),

      H(3, '2.5 What this means for the voyage'),
      P(
        criticalOnCorridor.length
          ? `Of the ${critical.length} critical zones worldwide, ${criticalOnCorridor.length} ${criticalOnCorridor.length === 1 ? 'lies' : 'lie'} within reach of at least one candidate track for this voyage: ${list(criticalOnCorridor.map((l) => `${l.name} (${l.liveScore})`))}. The global picture is therefore not background context for this passage — it is on the route, and the meso analysis below prices it per option.`
          : `None of the ${critical.length} critical zones worldwide fall within 260 nm of any candidate track for this voyage. The macro picture is context rather than a direct constraint, and the residual exposure on this passage is driven by the corridor conditions described in the meso analysis.`
      ),
      UL([
        `${routes.length} candidate routing${routes.length === 1 ? ' was' : 's were'} produced for this voyage; the spread between the safest and the most exposed option is ${Math.abs(scoreFromThreat(Math.min(...routes.map((r) => r.exposure))) - scoreFromThreat(Math.max(...routes.map((r) => r.exposure))))} points on the index.`,
        emergingOnCorridor.length
          ? `Emerging reporting touches the corridor directly: ${list(emergingOnCorridor.map((e) => e.label))}. Re-run the analysis before departure.`
          : 'No emerging development currently sits on the planned corridor, but the picture is re-derived from documents as they are analysed and should be re-checked at departure.',
        `The assessment is time-bound to ${fmtLong(asOf)}. Scores interpolate with the reporting date, so a brief carried forward without regeneration will understate a deteriorating position.`,
      ]),
    ],
  }
}

// --- meso -------------------------------------------------------------------

/** Assessed zones within `withinNm` of a waypoint — the landside picture. */
function nearPort(point, dated, withinNm = 420) {
  const out = []
  for (const l of dated) {
    const d = haversineNm(point.lng, point.lat, l.lng, l.lat)
    if (d <= withinNm) out.push({ ...l, distNm: Math.round(d) })
  }
  return out.sort((a, b) => a.liveScore - b.liveScore).slice(0, 4)
}

function mesoRouteBlocks({ route, index, result, waypoints, dated, locIndex, asOf }) {
  const exposure = scoreFromThreat(route.exposure)
  const peak = scoreFromThreat(route.riskMax)
  const avg = scoreFromThreat(route.riskAvg)
  const eta = toDate(asOf)
  eta.setUTCHours(eta.getUTCHours() + Math.round(route.hours))

  // Threat zones split by where the threat originates: a shore-launched threat
  // is a landside problem projected seaward, and it is mitigated differently.
  const hotspots = (route.hotspots || []).map((h) => ({ ...h, loc: locIndex.get(h.id) }))
  const seaborne = hotspots.filter((h) => h.loc?.isMaritime)
  const shoreborne = hotspots.filter((h) => !h.loc?.isMaritime)

  const blocks = [
    H(2, `3.${index + 1} ${routeLabel(route, index)}`),
    P(
      `${nm(route.distanceNm)} on a ${days(route.days)} passage at ${result.speed} knots, arriving ${fmtLong(eta)} on a departure of ${fmtLong(asOf)}. Estimated voyage cost is ${fmtMoney(route.totalUsd)} — ${fmtMoney(route.fuelUsd)} in bunkers over ${route.fuelTonnes.toLocaleString()} t${route.tollUsd ? `, ${fmtMoney(route.tollUsd)} in canal and transit tolls` : ', with no canal tolls'}${route.warRisk.total ? `, and ${fmtMoney(route.warRisk.total)} of additional war-risk premium` : ''}. The track scores ${exposure} on the combined exposure measure, with a mean of ${avg} along the line and a worst point of ${peak}.`
    ),
    KPI([
      { label: 'Distance', value: route.distanceNm.toLocaleString(), sub: 'nautical miles' },
      { label: 'Passage time', value: route.days.toFixed(1), sub: `days at ${result.speed} kn` },
      { label: 'Voyage cost', value: fmtMoney(route.totalUsd), sub: 'planning estimate' },
      { label: 'Exposure index', value: String(exposure), sub: `worst point ${peak}` },
    ]),

    H(3, `3.${index + 1}.1 Waterway assessment`),
    P(
      route.chokepoints?.length
        ? `The routing transits ${list(route.chokepoints.map((c) => c.name))}. ${route.highRiskHours >= 1 ? `About ${hrs(route.highRiskHours)} of the passage — ${nm(route.highRiskNm)} — is spent in water assessed at 40 or worse.` : 'No part of the track sits in water assessed at 40 or worse.'} Each passage below carries its own transit time and toll, and the index shown is the assessed risk at the passage itself rather than the average for the leg.`
        : `The routing stays in open water with no canal or regulated strait transit, so there is no booking-slot dependency and no toll exposure. ${route.highRiskHours >= 1 ? `About ${hrs(route.highRiskHours)} of the passage — ${nm(route.highRiskNm)} — is nonetheless spent in water assessed at 40 or worse.` : 'No part of the track sits in water assessed at 40 or worse.'}`
    ),
  ]

  if (route.chokepoints?.length) {
    blocks.push(
      TABLE(
        ['Passage', 'Type', 'Transit', 'Toll', 'Index', 'Planning note'],
        route.chokepoints.map((c) => [
          c.name,
          c.kind,
          c.transitHours ? `${c.transitHours} h` : '—',
          c.tollUsd ? fmtMoney(c.tollUsd) : '—',
          scoreCell(scoreFromThreat(c.riskScore)),
          c.note || '—',
        ]),
        `Table — Regulated passages on ${routeLabel(route, index).split(' (')[0]}.`
      )
    )
  }

  blocks.push(
    seaborne.length
      ? TABLE(
          ['Maritime threat zone', 'Vector', 'Closest approach', 'Index', 'Severity'],
          seaborne.map((h) => [
            h.name,
            catLabel(h.primary),
            nm(h.minNm),
            scoreCell(h.score, h.severity),
            sevLabel(h.severity),
          ]),
          'Table — Seaborne threat zones within 260 nm of the track.'
        )
      : P('No seaborne threat zone lies within 260 nm of this track on the reporting date.')
  )

  if (route.warRisk?.items?.length) {
    blocks.push(
      P(
        `War-risk cover is priced per listed area entered. This routing enters ${route.warRisk.items.length} listed area${route.warRisk.items.length === 1 ? '' : 's'} — ${list(route.warRisk.items.map((i) => `${i.name} at ${i.ratePct.toFixed(2)}% of hull value`))} — for an estimated additional premium of ${fmtMoney(route.warRisk.total)}. Confirm the rate and the breach-of-warranty position with the broker before fixing.`
      )
    )
  }

  blocks.push(
    H(3, `3.${index + 1}.2 Landside assessment`),
    P(
      `The itinerary calls at ${waypoints.length} point${waypoints.length === 1 ? '' : 's'}. Each is scored from the assessed picture around it, and the voyage likelihood takes the worst of them: a passage is only as safe as its worst call. ${shoreborne.length === 1 ? 'One shore-based threat zone projects risk onto this track from land and is treated here rather than as a maritime problem.' : shoreborne.length ? `${shoreborne.length} shore-based threat zones project risk onto this track from land and are treated here rather than as a maritime problem.` : 'No shore-based threat zone projects onto this track from land.'}`
    ),
    TABLE(
      ['Call', 'Position', 'Role', 'Index', 'Severity', 'Nearest assessed risk ashore'],
      waypoints.map((w) => {
        const near = nearPort(w, dated)
        return [
          w.label,
          w.sub || '—',
          w.role === 'origin' ? 'Load port' : w.role === 'destination' ? 'Discharge port' : 'Intermediate call',
          scoreCell(w.score, w.severity),
          sevLabel(w.severity),
          near.length ? `${near[0].name} (${near[0].liveScore}, ${nm(near[0].distNm)})` : 'None within 420 nm',
        ]
      }),
      'Table — Port calls and the assessed picture around each.'
    )
  )

  if (shoreborne.length) {
    blocks.push(
      TABLE(
        ['Shore-based zone', 'Vector', 'Closest approach', 'Index', 'Severity'],
        shoreborne.map((h) => [
          h.name,
          catLabel(h.primary),
          nm(h.minNm),
          scoreCell(h.score, h.severity),
          sevLabel(h.severity),
        ]),
        'Table — Land-based threat zones projecting onto the track.'
      )
    )
  }

  blocks.push(
    UL(
      waypoints.map((w) => {
        const near = nearPort(w, dated)
        if (!near.length) {
          return `${w.label}: no assessed risk within 420 nm. Routine port-call procedures apply, with the agent briefed on reporting lines.`
        }
        const vectors = list([...new Set(near.map((n) => catLabel(n.primary).toLowerCase()))])
        return `${w.label}: the hinterland picture is driven by ${vectors}. Closest assessment is ${near[0].name} at ${nm(near[0].distNm)} scoring ${near[0].liveScore} (${sevLabel(near[0].liveSeverity).toLowerCase()}); brief shore leave, gate access and the departure trigger against it.`
      })
    ),

    H(3, `3.${index + 1}.3 The case for and against`),
    UL(route.why || []),
    P('Watch-outs on this option:'),
    UL(route.watch || [])
  )

  return blocks
}

function mesoSection({ result, routes, waypoints, dated, locIndex, asOf }) {
  const best = routes[0]
  const cheapest = routes.reduce((a, b) => (b.totalUsd < a.totalUsd ? b : a), routes[0])
  const safest = routes.reduce((a, b) => (b.exposure < a.exposure ? b : a), routes[0])
  const fastest = routes.reduce((a, b) => (b.hours < a.hours ? b : a), routes[0])

  const blocks = [
    P(
      `${routes.length} routing${routes.length === 1 ? ' was' : 's were'} produced for ${result.from.label} → ${(result.vias || []).map((v) => `${v.label} → `).join('')}${result.to.label} for a ${result.vessel.name}, searched over a navigable graph of open ocean, canals and straits weighted by the threat picture as of ${fmtLong(asOf)}. ${routes.length === 1 ? 'Only one option survived the vessel’s size restrictions and the deduplication pass.' : `The fastest option is ${routeLabel(fastest, routes.indexOf(fastest)).split(' (')[0]} at ${days(fastest.days)}; the lowest exposure is ${routeLabel(safest, routes.indexOf(safest)).split(' (')[0]} at an index of ${scoreFromThreat(safest.exposure)}; the cheapest is ${routeLabel(cheapest, routes.indexOf(cheapest)).split(' (')[0]} at ${fmtMoney(cheapest.totalUsd)}.`} Each option is assessed below on its waters and on its landside calls.`
    ),
    TABLE(
      ['Option', 'Distance', 'Passage', 'Cost', 'Exposure', 'Worst point', 'Passages'],
      routes.map((r, i) => [
        routeLabel(r, i),
        nm(r.distanceNm),
        days(r.days),
        fmtMoney(r.totalUsd),
        scoreCell(scoreFromThreat(r.exposure)),
        scoreCell(scoreFromThreat(r.riskMax)),
        r.chokepoints?.length ? r.chokepoints.map((c) => c.name).join(', ') : 'Open water',
      ]),
      'Table 4 — Candidate routings side by side. Lower index is more dangerous.'
    ),
    NOTE(
      'info',
      'Recommended option',
      `${routeLabel(best, 0).split(' (')[0]} is carried forward as the planning case: ${days(best.days)}, ${fmtMoney(best.totalUsd)} and an exposure index of ${scoreFromThreat(best.exposure)}. The micro analysis in section 4 mitigates against this option; changing the selection changes the control set.`
    ),
  ]

  for (const [index, route] of routes.entries()) {
    blocks.push(...mesoRouteBlocks({ route, index, result, waypoints, dated, locIndex, asOf }))
  }

  return {
    id: 'meso',
    kind: 'meso',
    heading: '3. Meso analysis — route-level assessment',
    blocks,
  }
}

// --- micro ------------------------------------------------------------------

function microSection({ result, route, assessment, restrictions, locIndex }) {
  const vessel = result.vessel
  const { impact, likelihood, rating } = assessment
  const themes = mitigationThemes(route, locIndex)

  const blocks = [
    P(
      `This section mitigates ${result.vessel.name} against ${routeLabel(route, 0).split(' (')[0]} as selected in section 3. The voyage rates ${rating.product} of 25 on the 5 × 5 matrix — impact ${rating.impact} (${rating.impactMeta.label}) against likelihood ${rating.likelihood} (${rating.likelihoodMeta.label}) — placing it in the ${rating.band.label.toLowerCase()} band. ${rating.band.action}`
    ),
    NOTE(
      rating.product >= 15 ? 'critical' : rating.product >= 10 ? 'warning' : 'info',
      `Risk rating ${rating.product} of 25 — ${rating.band.label}`,
      `${rating.band.action}${likelihood.driver ? ` The likelihood is set by ${likelihood.driver.label} at an index of ${likelihood.driver.score}.` : ''}${impact.driver ? ` The impact is set by ${impact.driver.label}, ${impactDriverPhrase(impact.driver)}.` : ''}`
    ),

    H(3, '4.1 Vessel particulars'),
    TABLE(
      ['Particular', 'Value', 'Particular', 'Value'],
      [
        ['Vessel', vessel.name, 'Class', vessel.class],
        ['Deadweight', `${vessel.dwt.toLocaleString()} t`, 'Hull value', fmtMoney(vessel.hullValue)],
        ['Draught', `${vessel.draft} m`, 'Beam', `${vessel.beam} m`],
        ['Length overall', `${vessel.loa} m`, 'Air draught', `${vessel.airDraft} m`],
        ['Service speed', `${result.speed} kn`, 'Consumption', `${vessel.fuelTpd} t/day`],
      ],
      'Table 5 — Declared particulars used to gate passages and price the voyage.'
    ),

    H(3, '4.2 Passage restrictions at these dimensions'),
    restrictions.length
      ? UL(restrictions.map((r) => `${r.text}${r.costText ? ` ${r.costText}` : ''}`))
      : P(
          'No passage on this itinerary is closed to the vessel at her declared dimensions. Any change to draught, beam or air draught before sailing invalidates that finding and the analysis must be re-run.'
        ),

    H(3, '4.3 Exposure register'),
    P(
      `The impact axis is built from what is actually at stake on this voyage. Each entry carries a money value and a weight saying how much that money matters to this operation; the pair sets the level, and the voyage takes the highest single exposure rather than the sum. Total declared exposure is ${fmtMoney(impact.totalValue)} (${fmtMoney(impact.totalWeighted)} weighted).`
    ),
    TABLE(
      ['Exposure', 'Category', 'Value', 'Weight', 'Weighted', 'Level'],
      impact.entities.map((e) => [
        e.label || '—',
        e.category,
        fmtMoney(e.value),
        String(e.weight),
        fmtMoney(e.weightedValue),
        `${e.level} · ${e.meta.label}${e.manualLevel != null ? ' (pinned)' : ''}`,
      ]),
      'Table 6 — The impact register behind the rating.'
    ),

    H(3, '4.4 Mitigation measures'),
    P(
      themes.length
        ? `The controls below are drawn from the threat vectors this routing actually meets — ${list(themes.map((t) => t.title.toLowerCase()))} — and are to be in place before the vessel enters the affected leg, not on the day.`
        : 'No elevated threat vector was detected on this routing. Baseline voyage controls apply.'
    ),
  ]

  for (const theme of [...themes, BASELINE_MITIGATION]) {
    blocks.push(H(3, theme.title), UL(theme.items))
  }

  blocks.push(
    H(3, '4.5 Residual risk and re-assessment triggers'),
    P(
      `With the controls above in place the assessment holds at ${rating.product} of 25 (${rating.band.label}). The controls reduce the consequence of an event and the chance of a successful approach; they do not move the vessel out of the threat area, so the residual rating is carried, not eliminated. Re-run the analysis and re-issue this brief on any of the following.`
    ),
    UL([
      'A change of routing, of intermediate call, or of the declared vessel dimensions.',
      'A new assessment or incident within 260 nm of the planned track.',
      `Any deterioration of two points or more at ${likelihood.driver?.label || 'the driving waypoint'}, which currently sets the likelihood axis.`,
      'A change to the exposure register — cargo value, crew complement or charter commitment.',
      'Departure more than seven days after the reporting date of this brief.',
    ])
  )

  return { id: 'micro', kind: 'micro', heading: '4. Micro analysis — vessel-level mitigation', blocks }
}

// --- document ---------------------------------------------------------------

/**
 * A stable fingerprint of the inputs a brief was generated from, so the page
 * can tell the reader when their document no longer matches the analysis on
 * screen. Edits to the prose do not change it — only the analysis does.
 */
export function briefSourceKey({ route, result, asOf }) {
  if (!result || result.error) return null
  return [
    asOf,
    route.vesselId,
    route.riskAversion,
    result.from?.label,
    (result.vias || []).map((v) => v.label).join('|'),
    result.to?.label,
    result.routes.map((r) => `${r.id}:${r.distanceNm}:${r.exposure}`).join('|'),
    route.impactEntities.map((e) => `${e.id}:${e.value}:${e.weight}:${e.manualLevel}`).join('|'),
  ].join('~')
}

/**
 * Builds the whole document.
 *
 * @param result      the finished `planVoyage` result
 * @param assessment  `selectRiskAssessment` output (impact × likelihood)
 * @param dated       risk locations annotated for the reporting date
 */
export function buildExecutiveBrief({
  result,
  assessment,
  route,
  dated = [],
  incidents = [],
  emerging = [],
  documents = [],
  asOf,
  preset = '30D',
}) {
  seq = 0
  const routes = result.routes || []
  const best = routes[0]
  const locIndex = new Map(dated.map((l) => [l.id, l]))
  const waypoints = assessment.likelihood.points || []

  // Everything any candidate track runs close to — the corridor, for the macro
  // section's "does the global picture touch this voyage" question.
  const corridorIds = new Set()
  for (const r of routes) for (const h of r.hotspots || []) corridorIds.add(h.id)

  const legLabels = [result.from.label, ...(result.vias || []).map((v) => v.label), result.to.label]
  const title = `Executive Brief — ${result.from.label} to ${result.to.label}`
  const rating = assessment.rating

  const summary = {
    id: 'summary',
    kind: 'summary',
    heading: '1. Executive summary',
    blocks: [
      P(
        `${result.vessel.name} is planned ${legLabels.join(' → ')}, a ${nm(best.distanceNm)} passage of ${days(best.days)} at ${result.speed} knots for an estimated ${fmtMoney(best.totalUsd)}. Against the risk picture of ${fmtLong(asOf)} the voyage rates ${rating.product} of 25 on the 5 × 5 matrix — ${rating.band.label.toLowerCase()} — from an impact of ${rating.impact} (${rating.impactMeta.label}) and a likelihood of ${rating.likelihood} (${rating.likelihoodMeta.label}).`
      ),
      KPI([
        { label: 'Risk rating', value: `${rating.product}/25`, sub: rating.band.label },
        { label: 'Recommended option', value: 'Route 1', sub: `${days(best.days)} · ${fmtMoney(best.totalUsd)}` },
        { label: 'Exposure index', value: String(scoreFromThreat(best.exposure)), sub: `worst point ${scoreFromThreat(best.riskMax)}` },
        { label: 'Options assessed', value: String(routes.length), sub: 'candidate routings' },
      ]),
      H(3, 'Key judgements'),
      UL([
        `The recommended routing is Route 1${best.badges?.length ? ` (${best.badges.join(', ')})` : ''}: ${nm(best.distanceNm)}, ${days(best.days)}, ${fmtMoney(best.totalUsd)}, exposure index ${scoreFromThreat(best.exposure)}.`,
        best.chokepoints?.length
          ? `The passage depends on ${list(best.chokepoints.map((c) => c.name))}; loss of any one of them re-opens the routing question and adds both cost and time.`
          : 'The passage takes no canal or regulated strait, so there is no booking-slot dependency and no toll exposure.',
        assessment.likelihood.driver
          ? `Likelihood is set by ${assessment.likelihood.driver.label} at an index of ${assessment.likelihood.driver.score} (${sevLabel(assessment.likelihood.driver.severity).toLowerCase()}) — the worst call on the itinerary.`
          : 'Likelihood could not be driven from a waypoint; set the itinerary before relying on the rating.',
        assessment.impact.driver
          ? `Impact is set by ${assessment.impact.driver.label}, ${impactDriverPhrase(assessment.impact.driver)} — level ${assessment.impact.driver.level}, ${assessment.impact.driver.meta.label}.`
          : 'No exposure is registered against this voyage; the impact axis is at its floor and the rating understates the position.',
        best.warRisk?.total
          ? `Additional war-risk premium is estimated at ${fmtMoney(best.warRisk.total)} across ${best.warRisk.items.length} listed area${best.warRisk.items.length === 1 ? '' : 's'} entered.`
          : 'The recommended routing enters no listed war-risk area, so no additional premium is carried.',
      ]),
      NOTE(
        rating.product >= 15 ? 'critical' : rating.product >= 10 ? 'warning' : 'info',
        `Decision required — ${rating.band.label} (${rating.product}/25)`,
        rating.band.action
      ),
    ],
  }

  const recommendation = {
    id: 'recommendation',
    kind: 'recommendation',
    heading: '5. Recommendation and decision',
    blocks: [
      P(
        `Sail ${legLabels.join(' → ')} on Route 1 with the section 4 control set in place before entry to the affected leg, subject to the approval level the ${rating.band.label.toLowerCase()} band requires. The alternatives in section 3 remain available and are costed; a change of option changes the control set and this brief must be re-issued.`
      ),
      UL([
        `Approve the routing at the level required by a ${rating.band.label.toLowerCase()} rating and record the decision against this reference.`,
        'Confirm war-risk cover, the breach-of-warranty position and any additional premium with the broker before fixing.',
        'Issue the control set to the master with the passage plan and confirm acknowledgement before departure.',
        'Re-run the analysis at departure minus 48 hours and re-issue this brief if any trigger in section 4.5 has fired.',
      ]),
      TABLE(
        ['Role', 'Name', 'Signature', 'Date'],
        [
          ['Prepared by', 'ORBIT Risk Intelligence Cell', '', fmtLong(asOf)],
          ['Reviewed by', 'Company Security Officer', '', ''],
          ['Approved by', 'Marine Operations Director', '', ''],
        ],
        'Table 7 — Approval record.'
      ),
    ],
  }

  const methodology = {
    id: 'methodology',
    kind: 'annex',
    heading: 'Annex A — Method and limitations',
    blocks: [
      P(
        'Risk is expressed on an inverted 1–100 index: 1 is the most dangerous position and 100 the safest, with 1–20 the high-risk band. Routings are searched over a navigable graph of open ocean, hand-drawn canal and strait lanes, and port approaches, using a cost expressed in equivalent nautical miles so that distance, tolls, transit delay and threat exposure sit on one scale. Vessel dimensions gate the graph before the search runs, so a passage the vessel cannot make is never offered.'
      ),
      P(
        `Likelihood is the worst score on the itinerary — a voyage is only as safe as its worst call. Impact is the highest single exposure on the register rather than the sum. The two are multiplied on a 5 × 5 matrix for a 1–25 product, banded low through extreme. The picture is interpolated to ${fmtLong(asOf)} from each location's assessed trend.`
      ),
      UL([
        'Tolls, bunker consumption and war-risk premiums are modelled from published rates. They are planning estimates, not a voyage calculation, and exclude port dues, charter hire, pilotage and canal booking fees.',
        'The underlying risk picture in this demonstration is illustrative seed data plus anything analysed from uploaded documents. It is not a real-time intelligence product.',
        'Distances and closest approaches are measured to the sampled track at approximately 25 nm resolution and are indicative at the scale of a single berth or anchorage.',
        'This brief is a decision aid. It does not replace the master’s judgement, the company security officer’s assessment, or the advice of the war-risk underwriter.',
      ]),
    ],
  }

  return {
    id: `brief-${Date.now().toString(36)}`,
    title,
    subtitle: 'Threat-weighted voyage risk assessment — macro, meso and micro analysis',
    reference: `ORBIT/EB/${String(asOf).replace(/-/g, '')}-${(routes.length * 7 + best.distanceNm) % 97}`,
    classification: 'ILLUSTRATIVE / DEMO — NOT FOR OPERATIONAL USE',
    preparedBy: 'ORBIT Risk Intelligence Cell',
    distribution: 'Marine Operations · Company Security Officer · Chartering',
    asOf,
    generatedAt: `${asOf}T10:30:00Z`,
    meta: {
      vessel: result.vessel.name,
      voyage: legLabels.join(' → '),
      rating: `${rating.product}/25 · ${rating.band.label}`,
      ratingColor: rating.band.color,
      options: routes.length,
    },
    sections: [
      summary,
      macroSection({ dated, incidents, emerging, documents, asOf, preset, routes, corridorIds }),
      mesoSection({ result, routes, waypoints, dated, locIndex, asOf }),
      microSection({ result, route: best, assessment, restrictions: result.restrictions || [], locIndex }),
      recommendation,
      methodology,
    ],
  }
}
