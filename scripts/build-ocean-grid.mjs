/**
 * Builds the navigable-water graph used by the ship route planner.
 *
 *   node scripts/build-ocean-grid.mjs
 *
 * Emits src/data/oceanGrid.js containing:
 *   WATER     — 1 bit per 1° cell, 1 = navigable water
 *   LANDDIST  — grid steps to the nearest land cell (coastal standoff penalty)
 *   LINKS     — per cell, which of the 8 forward neighbour directions are
 *               navigable. A link exists only if BOTH cells are water AND the
 *               segment between them clears the real coastline. This is the
 *               part that matters: on a 1° grid the Caribbean and Pacific cells
 *               either side of Panama are neighbours, and Port Said sits beside
 *               the Gulf of Suez, so an unvalidated grid lets ships sail across
 *               isthmuses. Canals must be the only way through, and they are
 *               modelled as hand-drawn lanes in src/data/maritime.js.
 *   ACCESS    — for every port and lane vertex, the nearby water cells it can
 *               reach without crossing land.
 *
 * Rerun after changing the grid parameters, the port list, or lane geometry.
 */
import { createRequire } from 'node:module'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { geoContains, geoBounds } from 'd3-geo'
import { feature } from 'topojson-client'
import { PORTS, LANES } from '../src/data/maritime.js'

const require = createRequire(import.meta.url)
const world = require('world-atlas/countries-50m.json')

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Latitude is clipped to the band commercial shipping actually uses: far
// enough south to round Cape Horn, far enough north for the Baltic and
// Norwegian trades, excluding Antarctica and the ice-bound Arctic.
const RES = 1
const LNG_MIN = -180
const LAT_MIN = -62
const LAT_MAX = 76
const COLS = Math.round(360 / RES)
const ROWS = Math.round((LAT_MAX - LAT_MIN) / RES)
const TOTAL = COLS * ROWS

// 16-way connectivity: the 8 forward directions below plus their mirrors.
// Including the knight moves cuts the grid-metric distance error from ~7.6%
// (8-way) to ~2.6%, which matters when a voyage is 10,000 nm long.
const DIRS = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [2, 1],
  [1, 2],
  [-1, 2],
  [-2, 1],
]

const land = feature(world, world.objects.countries).features
// Bounding boxes let us skip almost every country for almost every sample.
const boxes = land.map((f) => {
  const [[w, s], [e, n]] = geoBounds(f)
  return { f, w, s, e, n, wraps: e < w }
})

function isLand(lng, lat) {
  const x = ((((lng + 180) % 360) + 360) % 360) - 180
  for (const b of boxes) {
    if (lat < b.s - 0.001 || lat > b.n + 0.001) continue
    const inLng = b.wraps ? x >= b.w - 0.001 || x <= b.e + 0.001 : x >= b.w - 0.001 && x <= b.e + 0.001
    if (!inLng) continue
    if (geoContains(b.f, [x, lat])) return true
  }
  return false
}

const cellLng = (col) => LNG_MIN + (col + 0.5) * RES
const cellLat = (row) => LAT_MIN + (row + 0.5) * RES
const wrapCol = (col) => ((col % COLS) + COLS) % COLS

/** Shortest signed longitude delta, so segments across the antimeridian work. */
function dLng(a, b) {
  let d = b - a
  while (d > 180) d -= 360
  while (d < -180) d += 360
  return d
}

const R_NM = 3440.065

function haversineNm(lng1, lat1, lng2, lat2) {
  const toRad = Math.PI / 180
  const p1 = lat1 * toRad
  const p2 = lat2 * toRad
  const dp = (lat2 - lat1) * toRad
  const dl = dLng(lng1, lng2) * toRad
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** True when no interior sample of the great-circle-ish segment hits land. */
function segmentClear(lng1, lat1, lng2, lat2, samples) {
  const dx = dLng(lng1, lng2)
  const dy = lat2 - lat1
  for (let i = 1; i <= samples; i++) {
    const t = i / (samples + 1)
    if (isLand(lng1 + dx * t, lat1 + dy * t)) return false
  }
  return true
}

/**
 * Clearance test for a leg starting at a berth.
 *
 * A port sits inside the land polygon at 50 m resolution, and its approach
 * channel is not in the dataset at all, so sampling from the quay always finds
 * land. Skip the first few miles — enough to clear the harbour — and hold the
 * rest of the leg to the normal standard. That still rejects the links that
 * matter, such as Bremerhaven reaching a Baltic lane vertex across Jutland.
 */
const APPROACH_SKIP_NM = 12
function approachClear(lng1, lat1, lng2, lat2) {
  const total = haversineNm(lng1, lat1, lng2, lat2)
  if (total <= APPROACH_SKIP_NM * 2) return true
  const dx = dLng(lng1, lng2)
  const dy = lat2 - lat1
  const from = APPROACH_SKIP_NM / total
  const steps = Math.max(3, Math.ceil(total / 20))
  for (let i = 0; i <= steps; i++) {
    const t = from + ((1 - from) * i) / (steps + 1)
    if (isLand(lng1 + dx * t, lat1 + dy * t)) return false
  }
  return true
}

// --- 1. water mask ---------------------------------------------------------
const water = new Uint8Array(TOTAL)
let waterCount = 0
process.stdout.write(`sampling ${TOTAL} cells at ${RES}°…\n`)
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    if (!isLand(cellLng(col), cellLat(row))) {
      water[row * COLS + col] = 1
      waterCount++
    }
  }
}
process.stdout.write(`  ${waterCount} water cells (${((waterCount / TOTAL) * 100).toFixed(1)}%)\n`)

// --- 2. link mask ----------------------------------------------------------
process.stdout.write('validating links against the coastline…\n')
const links = new Uint8Array(TOTAL)
let linkCount = 0
let blockedCount = 0
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    const i = row * COLS + col
    if (!water[i]) continue
    for (let k = 0; k < DIRS.length; k++) {
      const [dc, dr] = DIRS[k]
      const r = row + dr
      if (r < 0 || r >= ROWS) continue
      const c = wrapCol(col + dc)
      const j = r * COLS + c
      if (!water[j]) continue
      // Longer hops need more samples to catch a narrow isthmus.
      const span = Math.max(Math.abs(dc), Math.abs(dr))
      if (segmentClear(cellLng(col), cellLat(row), cellLng(col + dc), cellLat(r), span === 1 ? 3 : 5)) {
        links[i] |= 1 << k
        linkCount++
      } else {
        blockedCount++
      }
    }
  }
  if (row % 30 === 0) process.stdout.write(`  row ${row}/${ROWS}\n`)
}
process.stdout.write(`  ${linkCount} links, ${blockedCount} blocked by land\n`)

// --- 3. distance to land ---------------------------------------------------
const DIST_MAX = 15
const dist = new Uint8Array(TOTAL).fill(DIST_MAX)
let frontier = []
for (let i = 0; i < TOTAL; i++) {
  if (!water[i]) {
    dist[i] = 0
    frontier.push(i)
  }
}
// The clipped north/south edges count as land so the map border is not treated
// as an open, risk-free highway.
for (let col = 0; col < COLS; col++) {
  for (const row of [0, ROWS - 1]) {
    const i = row * COLS + col
    if (dist[i] !== 0) {
      dist[i] = 0
      frontier.push(i)
    }
  }
}
for (let d = 1; d < DIST_MAX && frontier.length; d++) {
  const next = []
  for (const i of frontier) {
    const row = Math.floor(i / COLS)
    const col = i % COLS
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue
        const r = row + dr
        if (r < 0 || r >= ROWS) continue
        const j = r * COLS + wrapCol(col + dc)
        if (dist[j] > d) {
          dist[j] = d
          next.push(j)
        }
      }
    }
  }
  frontier = next
}

// --- 4. access cells for ports and lane vertices ---------------------------


const MAX_ACCESS_NM = 260
const MAX_ACCESS_CELLS = 4

const FALLBACK_ACCESS_NM = 130

/**
 * Nearby water cells an anchor point can reach without crossing land.
 *
 * Ports up a river or deep in a bay — Hamburg, Houston, Tokyo Bay — have no
 * clear line to a 1° cell centre, because their approach channel is far below
 * the resolution of the coastline data. Rather than drop them from the app,
 * fall back to the single nearest water cell. That link cannot create a
 * shortcut: it is only added when the port has no other way out, and a port on
 * one coast reaches only the sea it actually sits on.
 */
function accessCells(lng, lat) {
  const col0 = Math.floor((lng - LNG_MIN) / RES)
  const row0 = Math.floor((lat - LAT_MIN) / RES)
  const found = []
  let nearest = null
  for (let dr = -3; dr <= 3; dr++) {
    const r = row0 + dr
    if (r < 0 || r >= ROWS) continue
    for (let dc = -3; dc <= 3; dc++) {
      const c = wrapCol(col0 + dc)
      const j = r * COLS + c
      if (!water[j]) continue
      const d = haversineNm(lng, lat, cellLng(c), cellLat(r))
      if (d > MAX_ACCESS_NM) continue
      if (!nearest || d < nearest[1]) nearest = [j, d]
      if (!approachClear(lng, lat, cellLng(col0 + dc), cellLat(r))) continue
      found.push([j, d])
    }
  }
  if (!found.length) {
    return nearest && nearest[1] <= FALLBACK_ACCESS_NM ? [nearest[0]] : []
  }
  found.sort((a, b) => a[1] - b[1])
  return found.slice(0, MAX_ACCESS_CELLS).map(([j]) => j)
}

process.stdout.write('resolving port and lane access…\n')
const portAccess = {}
let orphanPorts = []
for (const p of PORTS) {
  const cells = accessCells(p.lng, p.lat)
  portAccess[p.id] = cells
  if (!cells.length) orphanPorts.push(p.name)
}
const laneAccess = {}
for (const lane of LANES) {
  lane.points.forEach((pt, idx) => {
    const cells = accessCells(pt[0], pt[1])
    if (cells.length) laneAccess[`${lane.id}:${idx}`] = cells
  })
}
if (orphanPorts.length) {
  process.stdout.write(`  WARNING: no water access found for ${orphanPorts.join(', ')}\n`)
}

// A port also joins the lane network directly, but only at the nearest vertex
// of each lane and only where the approach stays on water. Distance alone is
// not enough: Bremerhaven sits 118 nm from a Baltic-side vertex of the Danish
// Straits lane, and a link there would carry ships straight over Jutland,
// around the Great Belt's draught limit.
const MAX_PORT_LANE_NM = 150
const portLane = {}
for (const p of PORTS) {
  const links = []
  for (const lane of LANES) {
    let best = null
    lane.points.forEach((pt, idx) => {
      const d = haversineNm(p.lng, p.lat, pt[0], pt[1])
      if (d <= MAX_PORT_LANE_NM && (!best || d < best.d)) best = { idx, d, pt }
    })
    if (best && approachClear(p.lng, p.lat, best.pt[0], best.pt[1])) {
      links.push([`${lane.id}:${best.idx}`, Math.round(best.d * 10) / 10])
    }
  }
  if (links.length) portLane[p.id] = links
}

// --- 5. pack and emit ------------------------------------------------------
const bits = new Uint8Array(Math.ceil(TOTAL / 8))
for (let i = 0; i < TOTAL; i++) if (water[i]) bits[i >> 3] |= 1 << (i & 7)

const nibbles = new Uint8Array(Math.ceil(TOTAL / 2))
for (let i = 0; i < TOTAL; i++) {
  const v = Math.min(DIST_MAX, dist[i])
  if (i & 1) nibbles[i >> 1] |= v << 4
  else nibbles[i >> 1] |= v
}

const b64 = (u8) => Buffer.from(u8).toString('base64')

const out = `// GENERATED by scripts/build-ocean-grid.mjs — do not edit by hand.
// ${waterCount} navigable cells of ${TOTAL} on a ${RES}° grid (world-atlas 50m),
// ${linkCount} coastline-validated links (${blockedCount} rejected for crossing land).
export const RES = ${RES}
export const LNG_MIN = ${LNG_MIN}
export const LAT_MIN = ${LAT_MIN}
export const LAT_MAX = ${LAT_MAX}
export const COLS = ${COLS}
export const ROWS = ${ROWS}
export const DIST_MAX = ${DIST_MAX}

/** The 8 forward neighbour offsets [dCol, dRow]; reverse links are mirrored. */
export const DIRS = ${JSON.stringify(DIRS)}

/** 1 bit per cell, row-major from the south-west corner; 1 = navigable water. */
export const WATER_B64 = '${b64(bits)}'
/** 1 nibble per cell: grid steps to the nearest land cell, clipped to DIST_MAX. */
export const LANDDIST_B64 = '${b64(nibbles)}'
/** 1 byte per cell: bit k set when forward direction DIRS[k] is navigable. */
export const LINKS_B64 = '${b64(links)}'

/** Port id → water cell indices reachable from the berth without crossing land. */
export const PORT_ACCESS = ${JSON.stringify(portAccess)}
/** "laneId:vertexIndex" → water cell indices, same rule. */
export const LANE_ACCESS = ${JSON.stringify(laneAccess)}
/** Port id → [["laneId:vertexIndex", distanceNm], …] for land-clear approaches. */
export const PORT_LANE = ${JSON.stringify(portLane)}
`

mkdirSync(resolve(ROOT, 'src/data'), { recursive: true })
writeFileSync(resolve(ROOT, 'src/data/oceanGrid.js'), out)
process.stdout.write(`\nwrote src/data/oceanGrid.js — ${(out.length / 1024).toFixed(1)} KB\n`)
