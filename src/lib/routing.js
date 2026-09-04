// ---------------------------------------------------------------------------
// Ship route planner.
//
// A navigable graph is assembled once from three sources: the coastline-
// validated 1° ocean grid (open water), the hand-drawn lanes in maritime.js
// (canals and straits the grid is too coarse to resolve), and the port list.
// Routes are then found with Dijkstra over a cost expressed in "equivalent
// nautical miles", so distance, transit time, tolls and threat exposure all
// trade off against each other on one scale.
//
// Everything here is pure and runs offline — no network, no map service.
// ---------------------------------------------------------------------------
import {
  RES,
  LNG_MIN,
  LAT_MIN,
  COLS,
  ROWS,
  DIRS,
  WATER_B64,
  LANDDIST_B64,
  LINKS_B64,
  PORT_ACCESS,
  LANE_ACCESS,
  PORT_LANE,
} from '../data/oceanGrid.js'
import {
  CHOKEPOINTS,
  LANES,
  PORTS,
  DEFAULT_BUNKER_USD,
  tollFor,
  limitBreaches,
} from '../data/maritime.js'
import { severityFromScore, threatFromScore, scoreFromThreat } from './constants.js'

const TOTAL = COLS * ROWS
const EARTH_NM = 3440.065
const TO_RAD = Math.PI / 180

// Cost-model constants, all in "equivalent nautical miles".
const RISK_WEIGHT = 9 // a max-risk edge costs up to 10x its length when fully risk-averse
const RISK_EXP = 1.7 // convexity: moderate risk is cheap, severe risk is not
const COAST_PENALTY = 0.1 // nudge routes off the coastline
const RISK_RADIUS_LAND_NM = 260
const RISK_RADIUS_SEA_NM = 430
const HIGH_RISK_THRESHOLD = 60 // threat intensity that counts as high-risk water
const HIGH_RISK_SCORE = 101 - HIGH_RISK_THRESHOLD // …the same line, as a risk score
const SAMPLE_NM = 25 // spacing when measuring risk along a finished route
const MAX_SMOOTH_LEG_NM = 500

/**
 * How close the track must come to a passage before the route is reported as
 * using it. Straits stay tight because several of them — Hormuz, Gibraltar,
 * Dover — are wide enough that the 1° grid resolves them without the lane, so
 * proximity is the only signal that the vessel went through.
 */
const PASSAGE_RADIUS_NM = { canal: 60, strait: 70, cape: 300 }

// --- small helpers ---------------------------------------------------------

const cellLng = (col) => LNG_MIN + (col + 0.5) * RES
const cellLat = (row) => LAT_MIN + (row + 0.5) * RES
const wrapCol = (col) => ((col % COLS) + COLS) % COLS

/** Shortest signed longitude delta; keeps everything sane across ±180°. */
export function dLng(a, b) {
  let d = b - a
  while (d > 180) d -= 360
  while (d < -180) d += 360
  return d
}

/** Great-circle distance in nautical miles. */
export function haversineNm(lng1, lat1, lng2, lat2) {
  const p1 = lat1 * TO_RAD
  const p2 = lat2 * TO_RAD
  const dp = (lat2 - lat1) * TO_RAD
  const dl = dLng(lng1, lng2) * TO_RAD
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return 2 * EARTH_NM * Math.asin(Math.min(1, Math.sqrt(a)))
}

function b64ToBytes(b64) {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function unpackBits(b64, count) {
  const bytes = b64ToBytes(b64)
  const out = new Uint8Array(count)
  for (let i = 0; i < count; i++) out[i] = (bytes[i >> 3] >> (i & 7)) & 1
  return out
}

function unpackNibbles(b64, count) {
  const bytes = b64ToBytes(b64)
  const out = new Uint8Array(count)
  for (let i = 0; i < count; i++) out[i] = i & 1 ? bytes[i >> 1] >> 4 : bytes[i >> 1] & 0x0f
  return out
}

function cellIndexOf(lng, lat) {
  const col = wrapCol(Math.floor((lng - LNG_MIN) / RES))
  const row = Math.floor((lat - LAT_MIN) / RES)
  if (row < 0 || row >= ROWS) return -1
  return row * COLS + col
}

/** Lazily-growing binary min-heap over (key, node) pairs. */
class MinHeap {
  constructor(cap = 4096) {
    this.k = new Float64Array(cap)
    this.v = new Int32Array(cap)
    this.size = 0
  }
  push(key, val) {
    if (this.size === this.k.length) {
      const k = new Float64Array(this.size * 2)
      const v = new Int32Array(this.size * 2)
      k.set(this.k)
      v.set(this.v)
      this.k = k
      this.v = v
    }
    let i = this.size++
    this.k[i] = key
    this.v[i] = val
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.k[p] <= this.k[i]) break
      this.swap(p, i)
      i = p
    }
  }
  pop() {
    const top = this.v[0]
    this.size--
    if (this.size > 0) {
      this.k[0] = this.k[this.size]
      this.v[0] = this.v[this.size]
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < this.size && this.k[l] < this.k[m]) m = l
        if (r < this.size && this.k[r] < this.k[m]) m = r
        if (m === i) break
        this.swap(m, i)
        i = m
      }
    }
    return top
  }
  swap(a, b) {
    const k = this.k[a]
    const v = this.v[a]
    this.k[a] = this.k[b]
    this.v[a] = this.v[b]
    this.k[b] = k
    this.v[b] = v
  }
}

// --- graph construction ----------------------------------------------------

let GRAPH = null

/**
 * Builds (and memoises) the navigable graph.
 *
 * Node kinds: 0 = ocean grid cell, 1 = lane vertex, 2 = port.
 * Lane vertices sharing a coordinate are merged, which is how separate lanes
 * join up — the Suez Canal, the Gulf of Aqaba and the Red Sea corridor all
 * meet at [34.6, 27.5].
 */
export function getGraph() {
  if (GRAPH) return GRAPH

  const water = unpackBits(WATER_B64, TOTAL)
  const landDist = unpackNibbles(LANDDIST_B64, TOTAL)
  const links = b64ToBytes(LINKS_B64)

  const lng = []
  const lat = []
  const kind = []
  const coastal = []
  const chokeOf = []
  const labelOf = []
  const cellNode = new Int32Array(TOTAL).fill(-1)

  const addNode = (x, y, k, cell, choke = null, label = null) => {
    const id = lng.length
    lng.push(x)
    lat.push(y)
    kind.push(k)
    coastal.push(cell >= 0 ? landDist[cell] : 1)
    chokeOf.push(choke)
    labelOf.push(label)
    return id
  }

  for (let i = 0; i < TOTAL; i++) {
    if (!water[i]) continue
    cellNode[i] = addNode(cellLng(i % COLS), cellLat((i / COLS) | 0), 0, i)
  }

  const ea = []
  const eb = []
  const ew = []
  const link = (a, b, nm) => {
    ea.push(a, b)
    eb.push(b, a)
    ew.push(nm, nm)
  }

  // Gates. Inside one, the route may only move along the lane, so it has to
  // reach the tagged chokepoint vertex where the size limits are enforced.
  // Both kinds of link have to go: the open-water grid, and the lane's access
  // legs out to that grid — a lane vertex halfway down a strait would otherwise
  // hand the route straight back to open water past the gate.
  const gates = []
  for (const cp of Object.values(CHOKEPOINTS)) for (const g of cp.gates || []) gates.push(g)

  const inGate = (x, y) => {
    for (const [glng, glat, radiusNm] of gates) {
      if (Math.abs(glat - y) > radiusNm / 60 + RES) continue
      if (haversineNm(glng, glat, x, y) <= radiusNm) return true
    }
    return false
  }

  const gated = new Uint8Array(TOTAL)
  for (let i = 0; i < TOTAL; i++) {
    if (cellNode[i] < 0) continue
    if (inGate(cellLng(i % COLS), cellLat((i / COLS) | 0))) gated[i] = 1
  }

  /**
   * A link is gated if either end sits in a gate, or if it steps over one.
   * The midpoint test is not optional: the 16-way connectivity includes knight
   * moves spanning two cells, and one of those hopped clean over the Sunda
   * gate, carrying a 22.5 m VLCC through an 18 m strait.
   */
  const linkGated = (x1, y1, x2, y2) =>
    inGate(x1, y1) || inGate(x2, y2) || inGate(x1 + dLng(x1, x2) / 2, (y1 + y2) / 2)

  // Grid edges — only the directions the build step certified as water-clear,
  // and never into or out of a gated cell.
  for (let i = 0; i < TOTAL; i++) {
    const from = cellNode[i]
    if (from < 0) continue
    const row = (i / COLS) | 0
    const col = i % COLS
    const mask = links[i]
    for (let k = 0; k < DIRS.length; k++) {
      if (!(mask & (1 << k))) continue
      const [dc, dr] = DIRS[k]
      const r = row + dr
      if (r < 0 || r >= ROWS) continue
      const j = r * COLS + wrapCol(col + dc)
      const to = cellNode[j]
      if (to < 0) continue
      if (gated[i] || gated[j] || linkGated(lng[from], lat[from], lng[to], lat[to])) continue
      link(from, to, haversineNm(lng[from], lat[from], lng[to], lat[to]))
    }
  }

  // Lane vertices, merged by coordinate so lanes connect where they touch.
  const vertexKey = (p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`
  const laneNodes = new Map()
  const laneVertexNode = {}
  for (const lane of LANES) {
    let prev = -1
    lane.points.forEach((pt, idx) => {
      const key = vertexKey(pt)
      let id = laneNodes.get(key)
      if (id === undefined) {
        id = addNode(pt[0], pt[1], 1, cellIndexOf(pt[0], pt[1]), pt[2] ?? null, lane.name)
        laneNodes.set(key, id)
      } else if (pt[2] && !chokeOf[id]) {
        chokeOf[id] = pt[2]
      }
      laneVertexNode[`${lane.id}:${idx}`] = id
      if (prev >= 0 && prev !== id) link(prev, id, haversineNm(lng[prev], lat[prev], lng[id], lat[id]))
      prev = id
    })
  }

  // Lane vertices reach open water through the access cells resolved at build
  // time (each one verified not to cross land) — except inside a gate.
  for (const [key, cells] of Object.entries(LANE_ACCESS)) {
    const node = laneVertexNode[key]
    if (node === undefined) continue
    if (inGate(lng[node], lat[node])) continue
    for (const cell of cells) {
      if (gated[cell]) continue
      const to = cellNode[cell]
      if (to < 0) continue
      if (linkGated(lng[node], lat[node], lng[to], lat[to])) continue
      link(node, to, haversineNm(lng[node], lat[node], lng[to], lat[to]))
    }
  }

  // Ports: their own water access, plus the land-clear lane approaches resolved
  // at build time. Both lists are restricted to the nearest vertex per lane, so
  // a port cannot become a shortcut from one side of a canal to the other.
  const portNode = {}
  for (const p of PORTS) {
    const id = addNode(p.lng, p.lat, 2, cellIndexOf(p.lng, p.lat), null, p.name)
    portNode[p.id] = id
    let degree = 0
    // A port sitting inside a gate — Batam, in the Singapore Strait — must not
    // become the way around it, so its approaches obey the gate too.
    for (const cell of PORT_ACCESS[p.id] || []) {
      const to = cellNode[cell]
      if (to < 0) continue
      if (gated[cell] || linkGated(p.lng, p.lat, lng[to], lat[to])) continue
      link(id, to, haversineNm(p.lng, p.lat, lng[to], lat[to]))
      degree++
    }
    for (const [key, nm] of PORT_LANE[p.id] || []) {
      const to = laneVertexNode[key]
      if (to === undefined) continue
      link(id, to, nm)
      degree++
    }
    // Never strand a port. With a single link it can still only be an endpoint,
    // so it cannot bridge anything.
    if (!degree) {
      const cell = (PORT_ACCESS[p.id] || [])[0]
      const to = cell === undefined ? -1 : cellNode[cell]
      if (to >= 0) link(id, to, haversineNm(p.lng, p.lat, lng[to], lat[to]))
    }
  }

  // Flatten the edge list into CSR for fast relaxation.
  const n = lng.length
  const deg = new Int32Array(n)
  for (const a of ea) deg[a]++
  const offset = new Int32Array(n + 1)
  for (let i = 0; i < n; i++) offset[i + 1] = offset[i] + deg[i]
  const cursor = offset.slice(0, n)
  const target = new Int32Array(ea.length)
  const weight = new Float32Array(ea.length)
  for (let e = 0; e < ea.length; e++) {
    const at = cursor[ea[e]]++
    target[at] = eb[e]
    weight[at] = ew[e]
  }

  GRAPH = {
    n,
    lng: Float32Array.from(lng),
    lat: Float32Array.from(lat),
    kind: Uint8Array.from(kind),
    coastal: Uint8Array.from(coastal),
    chokeOf,
    labelOf,
    offset,
    target,
    weight,
    cellNode,
    water,
    landDist,
    portNode,
  }
  return GRAPH
}

// --- threat field ----------------------------------------------------------

/** Risk influence of one location at distance `nm`, 0..1. */
function influence(nm, radius) {
  const t = nm / radius
  return Math.exp(-t * t)
}

/**
 * Threat score 0..100 at a point. The strongest nearby source dominates, with
 * diminishing credit for the next two, so a cluster of zones reads as elevated
 * rather than summing past 100.
 */
export function riskAtPoint(lng, lat, locations) {
  let a = 0
  let b = 0
  let c = 0
  for (const loc of locations) {
    // Routing costs are driven by THREAT intensity, not the inverted index.
    const score = loc.liveThreat ?? loc.threat ?? threatFromScore(loc.liveScore ?? loc.score)
    if (!score) continue
    const radius = loc.isMaritime ? RISK_RADIUS_SEA_NM : RISK_RADIUS_LAND_NM
    // Cheap latitude reject before the trig.
    if (Math.abs(loc.lat - lat) > (radius * 3) / 60) continue
    const v = score * influence(haversineNm(lng, lat, loc.lng, loc.lat), radius)
    if (v > a) {
      c = b
      b = a
      a = v
    } else if (v > b) {
      c = b
      b = v
    } else if (v > c) {
      c = v
    }
  }
  return Math.min(100, a + 0.3 * b + 0.15 * c)
}

/** Per-node threat field, cached against the location set it was built from. */
let RISK_CACHE = { key: null, risk: null, pow: null }

function riskField(graph, locations, cacheKey) {
  if (RISK_CACHE.key === cacheKey) return RISK_CACHE
  const risk = new Float32Array(graph.n)
  const pow = new Float32Array(graph.n)
  for (let i = 0; i < graph.n; i++) {
    const r = riskAtPoint(graph.lng[i], graph.lat[i], locations)
    risk[i] = r
    pow[i] = Math.pow(r / 100, RISK_EXP)
  }
  RISK_CACHE = { key: cacheKey, risk, pow }
  return RISK_CACHE
}

// --- search ----------------------------------------------------------------

/**
 * Dijkstra in equivalent-nautical-miles.
 *
 * @param blocked   Uint8Array marking nodes the vessel may not use.
 * @param nodeExtra Per-node arrival penalty (canal transit time + toll).
 * @param penalty   Per-node multiplier used to push later alternatives away
 *                  from routes already found.
 */
function search(graph, pow, aversion, start, goal, blocked, nodeExtra, penalty) {
  const n = graph.n
  const dist = new Float64Array(n).fill(Infinity)
  const prev = new Int32Array(n).fill(-1)
  const done = new Uint8Array(n)
  const heap = new MinHeap()
  dist[start] = 0
  heap.push(0, start)

  while (heap.size) {
    const u = heap.pop()
    if (done[u]) continue
    done[u] = 1
    if (u === goal) break
    const du = dist[u]
    for (let e = graph.offset[u]; e < graph.offset[u + 1]; e++) {
      const v = graph.target[e]
      if (done[v] || blocked[v]) continue
      const riskMul = 1 + RISK_WEIGHT * aversion * ((pow[u] + pow[v]) / 2)
      const coastMul = graph.coastal[v] <= 1 ? 1 + COAST_PENALTY : 1
      const w = graph.weight[e] * riskMul * coastMul * (penalty ? penalty[v] : 1) + nodeExtra[v]
      const nd = du + w
      if (nd < dist[v]) {
        dist[v] = nd
        prev[v] = u
        heap.push(nd, v)
      }
    }
  }

  if (!Number.isFinite(dist[goal])) return null
  const path = []
  for (let at = goal; at !== -1; at = prev[at]) path.push(at)
  path.reverse()
  return path
}

/**
 * Straightens runs of grid nodes into direct legs.
 *
 * The grid can only step between cell centres, which leaves a visible stair-
 * step and inflates the measured distance. A leg is only straightened when
 * every sample along it sits at least two cells from land, so smoothing can
 * never cut across a headland the grid was careful to route around.
 */
function smoothPath(graph, path) {
  const clear = (a, b) => {
    const nm = haversineNm(graph.lng[a], graph.lat[a], graph.lng[b], graph.lat[b])
    // Legs are interpolated linearly in lat/lng, which is a rhumb line — fine
    // over a few hundred miles, badly wrong over an ocean. Cap the span so the
    // track keeps following the graph's near-great-circle path.
    if (nm > MAX_SMOOTH_LEG_NM) return false
    const steps = Math.max(2, Math.ceil(nm / 30))
    const dx = dLng(graph.lng[a], graph.lng[b])
    const dy = graph.lat[b] - graph.lat[a]
    for (let i = 1; i < steps; i++) {
      const t = i / steps
      const cell = cellIndexOf(graph.lng[a] + dx * t, graph.lat[a] + dy * t)
      if (cell < 0 || !graph.water[cell] || graph.landDist[cell] < 2) return false
    }
    return true
  }

  const out = [path[0]]
  let i = 0
  while (i < path.length - 1) {
    let next = i + 1
    // Only plain open-water grid nodes may be skipped; lanes, ports and
    // chokepoints are fixed geometry.
    if (graph.kind[path[i]] === 0) {
      const limit = Math.min(path.length - 1, i + 60)
      for (let j = limit; j > i + 1; j--) {
        let skippable = true
        for (let m = i + 1; m < j; m++) {
          if (graph.kind[path[m]] !== 0 || graph.chokeOf[path[m]]) {
            skippable = false
            break
          }
        }
        if (!skippable || !clear(path[i], path[j])) continue
        next = j
        break
      }
    }
    out.push(path[next])
    i = next
  }
  return out
}

// --- metrics and narrative -------------------------------------------------

function usd(n) {
  return Math.round(n)
}

/** Distance-weighted risk profile measured along the finished polyline. */
function profileRoute(points, locations) {
  let distanceNm = 0
  let weighted = 0
  let riskMax = 0
  let highRiskNm = 0
  const samples = []

  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[i + 1]
    const legNm = haversineNm(x1, y1, x2, y2)
    if (legNm <= 0) continue
    const steps = Math.max(1, Math.ceil(legNm / SAMPLE_NM))
    const dx = dLng(x1, x2)
    const dy = y2 - y1
    for (let s = 0; s < steps; s++) {
      const t = (s + 0.5) / steps
      const lng = x1 + dx * t
      const lat = y1 + dy * t
      const r = riskAtPoint(lng, lat, locations)
      const segNm = legNm / steps
      distanceNm += segNm
      weighted += r * segNm
      if (r > riskMax) riskMax = r
      if (r >= HIGH_RISK_THRESHOLD) highRiskNm += segNm
      samples.push([lng, lat, r])
    }
  }

  return {
    distanceNm,
    riskAvg: distanceNm ? weighted / distanceNm : 0,
    riskMax,
    highRiskNm,
    samples,
  }
}

/** Risk locations the route comes close to, nearest first. */
function nearbyHotspots(samples, locations, withinNm = 260) {
  const out = []
  for (const loc of locations) {
    let min = Infinity
    for (const [lng, lat] of samples) {
      const d = haversineNm(lng, lat, loc.lng, loc.lat)
      if (d < min) min = d
    }
    if (min <= withinNm) {
      const threat = Math.round(loc.liveThreat ?? loc.threat ?? threatFromScore(loc.liveScore ?? loc.score))
      const score = Math.round(loc.liveScore ?? loc.score ?? scoreFromThreat(threat))
      out.push({
        id: loc.id,
        name: loc.name,
        threat,
        score,
        severity: loc.liveSeverity ?? severityFromScore(score),
        minNm: Math.round(min),
        primary: loc.primary,
      })
    }
  }
  return out.sort((a, b) => a.score - b.score) // most dangerous first
}

/**
 * War-risk premium estimate. Underwriters price cover per listed area entered,
 * as a percentage of hull value for a 7-day period; the rate here scales with
 * the assessed threat of each area the route enters.
 */
function warRiskPremium(hotspots, vessel) {
  const items = []
  for (const h of hotspots) {
    if (h.threat < 55 || h.minNm > 150) continue
    const rate = 0.0003 + ((h.threat - 55) / 45) * 0.0062
    items.push({ name: h.name, ratePct: rate * 100, usd: usd(vessel.hullValue * rate) })
  }
  const total = Math.min(vessel.hullValue * 0.03, items.reduce((a, x) => a + x.usd, 0))
  return { items, total: usd(total) }
}

function fmtUsd(n) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${Math.round(n / 1e3)}k`
  return `$${Math.round(n)}`
}

function fmtDays(hours) {
  const d = hours / 24
  return d >= 10 ? `${d.toFixed(0)} days` : `${d.toFixed(1)} days`
}

/**
 * Turns the numbers into the plain-language case for and against a route.
 * `peers` is the full candidate set, which is what makes the comparisons
 * ("2.4 days quicker", "saves $310k") meaningful.
 */
function explain(route, peers) {
  const why = []
  const watch = []

  const slowest = Math.max(...peers.map((r) => r.hours))
  const dearest = Math.max(...peers.map((r) => r.totalUsd))
  const longest = Math.max(...peers.map((r) => r.distanceNm))
  const safest = Math.min(...peers.map((r) => r.exposure))

  if (route.hours < slowest - 6) {
    why.push(
      `Arrives in ${fmtDays(route.hours)} — ${fmtDays(slowest - route.hours)} ahead of the slowest option, over ${Math.round(longest - route.distanceNm).toLocaleString()} nm less steaming.`
    )
  }
  if (route.totalUsd < dearest * 0.98) {
    why.push(`Voyage cost about ${fmtUsd(route.totalUsd)}, saving ${fmtUsd(dearest - route.totalUsd)} against the most expensive routing.`)
  }
  if (route.exposure <= safest + 2) {
    why.push(
      `Best risk score of the options at ${scoreFromThreat(route.exposure)}, with ${route.highRiskHours < 1 ? 'no' : `about ${Math.round(route.highRiskHours)} h of`} time in waters scoring ${HIGH_RISK_SCORE} or worse.`
    )
  }
  for (const cp of route.chokepoints) {
    const bits = []
    if (cp.tollUsd) bits.push(`toll ≈ ${fmtUsd(cp.tollUsd)}`)
    if (cp.transitHours) bits.push(`${cp.transitHours} h transit`)
    why.push(bits.length ? `Transits ${cp.name} (${bits.join(', ')}).` : `Routes via ${cp.name}.`)
  }
  if (!route.chokepoints.length) {
    why.push('Open-water routing with no canal transit, so no toll exposure and no booking-slot dependency.')
  }

  if (route.highRiskHours >= 1) {
    watch.push(
      `About ${Math.round(route.highRiskHours)} h (${Math.round(route.highRiskNm).toLocaleString()} nm) inside waters scoring ${HIGH_RISK_SCORE} or worse. The worst score on the track is ${scoreFromThreat(route.riskMax)}.`
    )
  }
  for (const h of route.hotspots.slice(0, 3)) {
    watch.push(`Passes within ${h.minNm.toLocaleString()} nm of ${h.name} — risk score ${h.score} (${h.severity}).`)
  }
  for (const cp of route.chokepoints) {
    if (cp.note) watch.push(`${cp.name}: ${cp.note}`)
  }
  if (route.warRisk.total > 0) {
    watch.push(
      `Estimated additional war-risk premium ${fmtUsd(route.warRisk.total)} for ${route.warRisk.items.length} listed area${route.warRisk.items.length === 1 ? '' : 's'} entered.`
    )
  }
  if (!watch.length) watch.push('No assessed threat zones within 260 nm of the track on the selected date.')

  return { why, watch }
}

// --- public API ------------------------------------------------------------

/** Resolves a route endpoint: a port id, or a free {lat, lng} snapped to water. */
export function resolveEndpoint(graph, endpoint) {
  if (!endpoint) return null
  if (endpoint.portId) {
    const node = graph.portNode[endpoint.portId]
    if (node === undefined) return null
    const port = PORTS.find((p) => p.id === endpoint.portId)
    return { node, label: port.name, sub: port.country, lat: port.lat, lng: port.lng, snapped: false }
  }
  const { lat, lng } = endpoint
  // Spiral outward from the clicked cell for the nearest navigable water.
  const col0 = Math.floor((lng - LNG_MIN) / RES)
  const row0 = Math.floor((lat - LAT_MIN) / RES)
  let best = -1
  let bestNm = Infinity
  for (let ring = 0; ring <= 6 && best < 0; ring++) {
    for (let dr = -ring; dr <= ring; dr++) {
      for (let dc = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue
        const r = row0 + dr
        if (r < 0 || r >= ROWS) continue
        const node = graph.cellNode[r * COLS + wrapCol(col0 + dc)]
        if (node < 0) continue
        const nm = haversineNm(lng, lat, graph.lng[node], graph.lat[node])
        if (nm < bestNm) {
          bestNm = nm
          best = node
        }
      }
    }
  }
  if (best < 0) return null
  return {
    node: best,
    label: formatCoord(lat, lng),
    sub: bestNm > 40 ? `snapped ${Math.round(bestNm)} nm to navigable water` : 'custom position',
    lat: graph.lat[best],
    lng: graph.lng[best],
    snapped: true,
  }
}

export function formatCoord(lat, lng) {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(2)}°${ns} ${Math.abs(lng).toFixed(2)}°${ew}`
}

/**
 * Plans up to three meaningfully different routes between two endpoints.
 *
 * @param origin/destination  {portId} or {lat, lng}
 * @param vessel              a VESSEL_PRESETS entry (optionally overridden)
 * @param locations           risk locations, already annotated for the as-of date
 * @param options             { riskAversion 0..1, bunkerUsd, speed }
 */
export function planRoutes({ origin, destination, vessel, locations, options = {} }) {
  const graph = getGraph()
  const from = resolveEndpoint(graph, origin)
  const to = resolveEndpoint(graph, destination)
  if (!from) return { error: 'Origin could not be resolved to navigable water.' }
  if (!to) return { error: 'Destination could not be resolved to navigable water.' }
  if (from.node === to.node) return { error: 'Origin and destination resolve to the same position.' }

  const aversion = options.riskAversion ?? 0.5
  const bunkerUsd = options.bunkerUsd ?? DEFAULT_BUNKER_USD
  const speed = options.speed ?? vessel.speed
  const cacheKey = options.riskKey ?? String(locations.length)
  const { risk, pow } = riskField(graph, locations, cacheKey)

  // Cost of a nautical mile in fuel alone — the exchange rate that lets tolls
  // and canal delays be expressed as equivalent distance.
  const usdPerNm = ((vessel.fuelTpd * bunkerUsd) / 24) / speed

  // Vessel size decides which passages exist at all, and each one carries two
  // arrival penalties. A canal toll is real money but it does
  // not slow the ship down, so the time-first search must not see it — priced
  // in, a $0.5M Suez toll reads as 2,200 nm and pushes the quickest routing off
  // the list entirely. Tolls still count in `extraCost` and in every figure
  // reported back.
  const blocked = new Uint8Array(graph.n)
  const extraTime = new Float64Array(graph.n)
  const extraCost = new Float64Array(graph.n)
  const extraTimeOpen = new Float64Array(graph.n) // same delays, nothing blocked
  const allRestrictions = []
  for (const id of Object.keys(CHOKEPOINTS)) {
    const cp = CHOKEPOINTS[id]
    const breaches = limitBreaches(cp, vessel)
    const toll = tollFor(cp, vessel)
    const delay = cp.transitHours * speed
    for (let i = 0; i < graph.n; i++) {
      if (graph.chokeOf[i] !== id) continue
      extraTimeOpen[i] = delay
      if (breaches.length) blocked[i] = 1
      else {
        extraTime[i] = delay
        extraCost[i] = delay + toll / usdPerNm
      }
    }
    if (breaches.length) {
      allRestrictions.push({
        id,
        name: cp.name,
        breaches,
        text: `${cp.name} unavailable — ${breaches
          .map((b) => `${b.kind} ${b.need} ${b.unit} exceeds the ${b.limit} ${b.unit} limit`)
          .join('; ')}.`,
      })
    }
  }

  // Three passes with different priorities, then diversity passes if two of
  // them converged on the same track.
  const variants = [
    { key: 'balanced', aversion, extra: extraCost },
    { key: 'fastest', aversion: 0.03, extra: extraTime },
    { key: 'safest', aversion: 1, extra: extraCost },
  ]
  const found = []
  const penalty = new Float32Array(graph.n).fill(1)

  for (const v of variants) {
    const path = search(graph, pow, v.aversion, from.node, to.node, blocked, v.extra, null)
    if (!path) continue
    if (found.some((f) => overlap(f.path, path) > 0.85)) continue
    found.push({ path, variant: v.key })
  }
  for (let extra = 0; found.length < 3 && extra < 2; extra++) {
    for (const f of found) for (const node of f.path) penalty[node] = 2.4
    const path = search(graph, pow, aversion, from.node, to.node, blocked, extraCost, penalty)
    if (!path) break
    if (found.some((f) => overlap(f.path, path) > 0.85)) break
    found.push({ path, variant: 'alternative' })
  }

  if (!found.length) {
    return {
      error: allRestrictions.length
        ? 'No navigable route for a vessel of this size — the only available passage is closed by its transit limits. See the restrictions below.'
        : 'No navigable route found between these points.',
      restrictions: allRestrictions,
      from,
      to,
    }
  }

  const barred = new Set(allRestrictions.map((r) => r.id))
  const routes = found.map((f, idx) => {
    const smoothed = smoothPath(graph, f.path)
    const points = smoothed.map((i) => [graph.lng[i], graph.lat[i]])
    const prof = profileRoute(points, locations)

    // A passage counts as used when the track runs close to it. Going by graph
    // nodes alone would miss every strait the grid resolves on its own, and
    // appending capes afterwards left them out of voyage order. Tolls stay tied
    // to the lane node, since only a real canal transit is billable.
    const transited = new Set()
    for (const node of f.path) if (graph.chokeOf[node]) transited.add(graph.chokeOf[node])

    const chokepoints = []
    for (const cp of Object.values(CHOKEPOINTS)) {
      // A passage this vessel cannot enter is never part of its route, however
      // close the track happens to run to it.
      if (barred.has(cp.id)) continue
      const anchor = laneAnchor(cp.id)
      if (!anchor) continue
      let atSample = -1
      let nearestNm = Infinity
      for (let s = 0; s < prof.samples.length; s++) {
        const d = haversineNm(prof.samples[s][0], prof.samples[s][1], anchor[0], anchor[1])
        if (d < nearestNm) {
          nearestNm = d
          atSample = s
        }
      }
      const near = nearestNm <= (PASSAGE_RADIUS_NM[cp.kind] ?? 70)
      if (!near && !transited.has(cp.id)) continue
      chokepoints.push({
        id: cp.id,
        name: cp.name,
        kind: cp.kind,
        note: cp.note,
        lng: anchor[0],
        lat: anchor[1],
        tollUsd: transited.has(cp.id) ? tollFor(cp, vessel) : 0,
        transitHours: cp.transitHours,
        riskScore: Math.round(riskAtPoint(anchor[0], anchor[1], locations)),
        atSample,
      })
    }
    chokepoints.sort((a, b) => a.atSample - b.atSample)

    const steamHours = prof.distanceNm / speed
    const transitHours = chokepoints.reduce((a, c) => a + c.transitHours, 0)
    const hours = steamHours + transitHours
    const fuelTonnes = (vessel.fuelTpd * steamHours) / 24
    const fuelUsd = usd(fuelTonnes * bunkerUsd)
    const tollUsd = chokepoints.reduce((a, c) => a + c.tollUsd, 0)
    const hotspots = nearbyHotspots(prof.samples, locations)
    const warRisk = warRiskPremium(hotspots, vessel)

    return {
      id: `route-${idx + 1}`,
      variant: f.variant,
      points,
      distanceNm: Math.round(prof.distanceNm),
      steamHours,
      transitHours,
      hours,
      days: hours / 24,
      fuelTonnes: Math.round(fuelTonnes),
      fuelUsd,
      tollUsd,
      warRisk,
      totalUsd: fuelUsd + tollUsd + warRisk.total,
      riskAvg: Math.round(prof.riskAvg),
      riskMax: Math.round(prof.riskMax),
      highRiskNm: prof.highRiskNm,
      highRiskHours: prof.highRiskNm / speed,
      exposure: Math.round(0.55 * prof.riskAvg + 0.45 * prof.riskMax),
      chokepoints,
      hotspots,
    }
  })

  // Different node sequences can still describe the same voyage, and only the
  // finished metrics reveal it. Two candidates are the same recommendation when
  // they use the same passages and neither the distance nor the threat exposure
  // would change anyone's decision — three near-identical tracks down the same
  // strait are noise, not options.
  const unique = []
  for (const r of routes) {
    const twin = unique.find(
      (u) =>
        u.chokepoints.map((c) => c.id).join() === r.chokepoints.map((c) => c.id).join() &&
        Math.abs(u.distanceNm - r.distanceNm) / Math.max(1, u.distanceNm) < 0.08 &&
        Math.abs(u.exposure - r.exposure) <= 2
    )
    if (!twin) unique.push(r)
  }
  unique.forEach((r, i) => (r.id = `route-${i + 1}`))

  rankRoutes(unique, aversion)
  for (const r of unique) Object.assign(r, explain(r, unique))
  unique.sort((a, b) => a.composite - b.composite)

  // Most size limits are irrelevant to any given voyage — a Rotterdam run does
  // not care about Torres Strait. Report only the passages this voyage would
  // otherwise have used, and price what being shut out of them costs.
  const restrictions = []
  if (allRestrictions.length) {
    const openPath = search(graph, pow, 0.03, from.node, to.node, new Uint8Array(graph.n), extraTimeOpen, null)
    if (openPath) {
      const wouldUse = new Set()
      for (const node of openPath) if (graph.chokeOf[node]) wouldUse.add(graph.chokeOf[node])
      for (const r of allRestrictions) if (wouldUse.has(r.id)) restrictions.push(r)

      if (restrictions.length) {
        const openPoints = smoothPath(graph, openPath).map((i) => [graph.lng[i], graph.lat[i]])
        const openNm = profileRoute(openPoints, []).distanceNm
        const shortestLegal = Math.min(...unique.map((r) => r.distanceNm))
        const addedNm = Math.round(shortestLegal - openNm)
        if (addedNm > 50) {
          restrictions[0].costText = `Being shut out adds about ${addedNm.toLocaleString()} nm (${(addedNm / speed / 24).toFixed(1)} days) to the shortest available routing.`
        }
      }
    }
  }

  return { from, to, routes: unique, restrictions, vessel, speed, bunkerUsd, riskField: risk }
}

/** Fraction of the shorter path's nodes that also appear in the longer one. */
function overlap(a, b) {
  const set = new Set(a)
  let hits = 0
  for (const node of b) if (set.has(node)) hits++
  return hits / Math.min(a.length, b.length)
}

/** Coordinate of the lane vertex that carries a chokepoint's tag. */
const LANE_ANCHORS = {}
function laneAnchor(chokepointId) {
  if (chokepointId in LANE_ANCHORS) return LANE_ANCHORS[chokepointId]
  let found = null
  for (const lane of LANES) {
    for (const pt of lane.points) {
      if (pt[2] === chokepointId) {
        found = [pt[0], pt[1]]
        break
      }
    }
    if (found) break
  }
  LANE_ANCHORS[chokepointId] = found
  return found
}

// ---------------------------------------------------------------------------
// MULTI-LEG VOYAGES
//
// `planRoutes` searches one origin → destination pair. A voyage with calls in
// between is planned leg by leg and the legs are stitched back into single
// candidates, so the map, the metrics and the cards keep working unchanged.
// Candidate n of the voyage is candidate n of every leg (clamped to what each
// leg actually produced), which keeps a consistent posture across the itinerary
// rather than mixing a "safest" first leg with a "fastest" second one.
// ---------------------------------------------------------------------------

/** Fold the per-leg route objects of one candidate into a single voyage. */
function stitchLegs(legs, speed) {
  const points = []
  for (const [i, leg] of legs.entries()) {
    points.push(...(i === 0 ? leg.points : leg.points.slice(1)))
  }

  const distanceNm = legs.reduce((a, l) => a + l.distanceNm, 0)
  const steamHours = legs.reduce((a, l) => a + l.steamHours, 0)
  const transitHours = legs.reduce((a, l) => a + l.transitHours, 0)
  const hours = steamHours + transitHours
  const fuelTonnes = legs.reduce((a, l) => a + l.fuelTonnes, 0)
  const fuelUsd = legs.reduce((a, l) => a + l.fuelUsd, 0)
  const tollUsd = legs.reduce((a, l) => a + l.tollUsd, 0)
  const highRiskNm = legs.reduce((a, l) => a + l.highRiskNm, 0)
  const riskAvg = distanceNm ? legs.reduce((a, l) => a + l.riskAvg * l.distanceNm, 0) / distanceNm : 0
  const riskMax = Math.max(0, ...legs.map((l) => l.riskMax))

  // War-risk cover is priced per area entered, so an area crossed on two legs
  // is still one listed area.
  const warItems = new Map()
  for (const leg of legs) for (const it of leg.warRisk.items) if (!warItems.has(it.name)) warItems.set(it.name, it)
  const warRisk = {
    items: Array.from(warItems.values()),
    total: usd(Array.from(warItems.values()).reduce((a, x) => a + x.usd, 0)),
  }

  const hotspots = new Map()
  for (const leg of legs) {
    for (const h of leg.hotspots) {
      const prev = hotspots.get(h.id)
      if (!prev || h.minNm < prev.minNm) hotspots.set(h.id, h)
    }
  }

  return {
    points,
    legs,
    distanceNm: Math.round(distanceNm),
    steamHours,
    transitHours,
    hours,
    days: hours / 24,
    fuelTonnes: Math.round(fuelTonnes),
    fuelUsd,
    tollUsd,
    warRisk,
    totalUsd: fuelUsd + tollUsd + warRisk.total,
    riskAvg: Math.round(riskAvg),
    riskMax: Math.round(riskMax),
    highRiskNm,
    highRiskHours: highRiskNm / speed,
    exposure: Math.round(0.55 * riskAvg + 0.45 * riskMax),
    chokepoints: legs.flatMap((l) => l.chokepoints),
    hotspots: Array.from(hotspots.values()).sort((a, b) => a.score - b.score),
  }
}

/**
 * Plans origin → [stops…] → destination. With no stops this is exactly
 * `planRoutes`; the return shape is identical either way.
 *
 * @param waypoints  ordered endpoints, at least two ({ portId } or { lat, lng })
 */
export function planVoyage({ waypoints, vessel, locations, options = {} }) {
  const pts = (waypoints || []).filter(Boolean)
  if (pts.length < 2) return { error: 'A voyage needs an origin and a destination.' }
  if (pts.length === 2) return planRoutes({ origin: pts[0], destination: pts[1], vessel, locations, options })

  const speed = options.speed ?? vessel.speed
  const legResults = []
  for (let i = 0; i < pts.length - 1; i++) {
    const res = planRoutes({ origin: pts[i], destination: pts[i + 1], vessel, locations, options })
    if (res.error) return { error: `Leg ${i + 1} of ${pts.length - 1}: ${res.error}` }
    if (!res.routes?.length) return { error: `No routing found for leg ${i + 1} of ${pts.length - 1}.` }
    legResults.push(res)
  }

  const width = Math.min(3, ...legResults.map((r) => r.routes.length))
  const voyages = []
  for (let n = 0; n < width; n++) {
    const legs = legResults.map((r) => r.routes[Math.min(n, r.routes.length - 1)])
    voyages.push({ id: `route-${n + 1}`, variant: legs[0].variant, ...stitchLegs(legs, speed) })
  }

  // Two postures can land on the same itinerary once the legs are combined.
  const unique = []
  for (const v of voyages) {
    const twin = unique.find(
      (u) =>
        u.chokepoints.map((c) => c.id).join() === v.chokepoints.map((c) => c.id).join() &&
        Math.abs(u.distanceNm - v.distanceNm) / Math.max(1, u.distanceNm) < 0.08 &&
        Math.abs(u.exposure - v.exposure) <= 2
    )
    if (!twin) unique.push(v)
  }
  unique.forEach((r, i) => (r.id = `route-${i + 1}`))

  rankRoutes(unique, options.riskAversion ?? 0.5)
  for (const r of unique) Object.assign(r, explain(r, unique))
  unique.sort((a, b) => a.composite - b.composite)

  // Size limits reported once for the whole itinerary.
  const restrictions = []
  for (const res of legResults) {
    for (const r of res.restrictions || []) if (!restrictions.some((x) => x.id === r.id)) restrictions.push(r)
  }

  const first = legResults[0]
  const last = legResults[legResults.length - 1]
  return {
    from: first.from,
    to: last.to,
    vias: legResults.slice(0, -1).map((r) => r.to),
    routes: unique,
    restrictions,
    vessel,
    speed: first.speed,
    bunkerUsd: first.bunkerUsd,
    riskField: first.riskField,
    multiLeg: true,
  }
}

/** Normalises time, cost and exposure across candidates and assigns badges. */
function rankRoutes(routes, aversion) {
  const norm = (get) => {
    const vals = routes.map(get)
    const lo = Math.min(...vals)
    const hi = Math.max(...vals)
    return (v) => (hi - lo < 1e-9 ? 0 : (v - lo) / (hi - lo))
  }
  const nTime = norm((r) => r.hours)
  const nCost = norm((r) => r.totalUsd)
  const nRisk = norm((r) => r.exposure)

  const wRisk = 0.25 + 0.5 * aversion
  const rest = (1 - wRisk) / 2

  for (const r of routes) {
    r.composite = wRisk * nRisk(r.exposure) + rest * nTime(r.hours) + rest * nCost(r.totalUsd)
    r.badges = []
  }

  const min = (key) => routes.reduce((a, b) => (b[key] < a[key] ? b : a))
  min('composite').badges.push('recommended')
  min('hours').badges.push('fastest')
  min('exposure').badges.push('lowest risk')
  min('totalUsd').badges.push('lowest cost')
}
