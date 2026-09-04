/**
 * Sanity-checks the route planner against known voyages.
 *
 *   node scripts/check-routes.mjs
 *
 * Verifies that every port is reachable, that published voyage distances come
 * out roughly right, and that the canal size limits actually divert a vessel.
 */
import { planRoutes, getGraph, haversineNm } from '../src/lib/routing.js'
import { PORTS, VESSEL_PRESETS } from '../src/data/maritime.js'
import { LOCATIONS } from '../src/data/seed.js'

const vessel = (id) => VESSEL_PRESETS.find((v) => v.id === id)

const t0 = Date.now()
const graph = getGraph()
console.log(`graph: ${graph.n} nodes, ${graph.target.length} directed edges, built in ${Date.now() - t0} ms\n`)

// Published distances (nm) for the shortest customary routing, for comparison.
const CASES = [
  ['nlrtm', 'sgsin', 'neopanamax-container', 8300, 'Rotterdam → Singapore via Suez'],
  ['nlrtm', 'cnsha', 'neopanamax-container', 10500, 'Rotterdam → Shanghai via Suez'],
  ['sgsin', 'nlrtm', 'vlcc-tanker', 11700, 'Singapore → Rotterdam, VLCC (too deep for Suez)'],
  ['cnsha', 'uslax', 'neopanamax-container', 5700, 'Shanghai → Los Angeles, Pacific great circle'],
  ['cnsha', 'usnyc', 'neopanamax-container', 10600, 'Shanghai → New York via Panama'],
  ['cnsha', 'usnyc', 'ulcv-container', 12300, 'Shanghai → New York, ULCV (too wide for Panama, so via Suez)'],
  ['idjkt', 'sgsin', 'feeder-container', 530, 'Jakarta → Singapore'],
  ['idjkt', 'nlrtm', 'panamax-container', 9700, 'Jakarta → Rotterdam'],
  ['idsub', 'aufre', 'handysize-bulker', 1900, 'Surabaya → Fremantle'],
  ['saraz', 'jpykh', 'vlcc-tanker', 6600, 'Ras Tanura → Yokohama, VLCC'],
  ['brssz', 'cnsha', 'capesize-bulker', 11000, 'Santos → Shanghai, Capesize'],
  ['uaods', 'esalg', 'panamax-bulker', 2100, 'Odesa → Algeciras via the Turkish Straits'],
  ['ruled', 'nlrtm', 'panamax-container', 1350, 'St Petersburg → Rotterdam'],
  ['aejea', 'idjkt', 'panamax-container', 4200, 'Jebel Ali → Jakarta'],
  ['zadur', 'esalg', 'suezmax-tanker', 6300, 'Durban → Algeciras'],
  ['ausyd', 'uslax', 'panamax-container', 6500, 'Sydney → Los Angeles, trans-Pacific'],
]

let failures = 0
for (const [a, b, vid, expected, label] of CASES) {
  const t = Date.now()
  const res = planRoutes({
    origin: { portId: a },
    destination: { portId: b },
    vessel: vessel(vid),
    locations: LOCATIONS,
    options: { riskAversion: 0.5, riskKey: 'seed' },
  })
  if (res.error) {
    console.log(`FAIL ${label}\n     ${res.error}`)
    failures++
    continue
  }
  const best = res.routes.reduce((x, y) => (y.distanceNm < x.distanceNm ? y : x))
  const delta = ((best.distanceNm - expected) / expected) * 100
  const flag = Math.abs(delta) > 18 ? 'WARN' : ' ok '
  if (flag === 'WARN') failures++
  console.log(
    `${flag} ${label}\n     shortest ${best.distanceNm.toLocaleString()} nm vs ~${expected.toLocaleString()} nm (${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%), ` +
      `${res.routes.length} route(s), ${Date.now() - t} ms`
  )
  for (const r of res.routes) {
    const cps = r.chokepoints.map((c) => c.name).join(' → ') || 'open water'
    console.log(
      `       · ${r.distanceNm.toLocaleString()} nm | ${r.days.toFixed(1)} d | $${(r.totalUsd / 1e6).toFixed(2)}M | ` +
        `exposure ${r.exposure} | [${r.badges.join(', ')}] | ${cps}`
    )
  }
  for (const rr of res.restrictions) console.log(`       ! ${rr.text}`)
}

// Structural checks: an enclosed sea must stay enclosed for a vessel that
// cannot fit through its only gate, and a canal must be the only shortcut.
// A leak here means the grid is letting ships sail over land.
console.log('\nstructural containment:')
const CONTAINMENT = [
  ['uaods', 'grpir', 'ulcv-container', 'Black Sea sealed when the Bosphorus is too small (400 m LOA)'],
  ['ruled', 'nlrtm', 'capesize-bulker', 'Baltic sealed when both the Great Belt and Kiel are too shallow'],
]
for (const [a, b, vid, label] of CONTAINMENT) {
  const res = planRoutes({
    origin: { portId: a },
    destination: { portId: b },
    vessel: vessel(vid),
    locations: LOCATIONS,
    options: { riskAversion: 0.5, riskKey: 'seed' },
  })
  if (res.error) {
    console.log(` ok  ${label}`)
  } else {
    failures++
    const best = res.routes.reduce((x, y) => (y.distanceNm < x.distanceNm ? y : x))
    console.log(`LEAK ${label}\n     found a ${best.distanceNm.toLocaleString()} nm route that should not exist`)
  }
}

// Crossing an isthmus without the canal must mean going right around.
const DETOURS = [
  ['pacri', 'pabal', 'ulcv-container', 7000, 'Cristóbal → Balboa without the Panama Canal'],
  ['egpsd', 'sajed', 'vlcc-tanker', 10000, 'Port Said → Jeddah without the Suez Canal (22.5 m draught)'],
]
for (const [a, b, vid, minNm, label] of DETOURS) {
  const res = planRoutes({
    origin: { portId: a },
    destination: { portId: b },
    vessel: vessel(vid),
    locations: LOCATIONS,
    options: { riskAversion: 0.5, riskKey: 'seed' },
  })
  if (res.error) {
    failures++
    console.log(`FAIL ${label}\n     ${res.error}`)
    continue
  }
  const best = res.routes.reduce((x, y) => (y.distanceNm < x.distanceNm ? y : x))
  const okay = best.distanceNm >= minNm
  if (!okay) failures++
  console.log(`${okay ? ' ok ' : 'LEAK'} ${label}\n     shortest ${best.distanceNm.toLocaleString()} nm (must exceed ${minNm.toLocaleString()} nm)`)
}

// Every port must be reachable from a common hub, or it is dead weight in the UI.
console.log('\nreachability from Singapore:')
const unreachable = []
for (const p of PORTS) {
  if (p.id === 'sgsin') continue
  const res = planRoutes({
    origin: { portId: 'sgsin' },
    destination: { portId: p.id },
    vessel: vessel('handysize-bulker'),
    locations: LOCATIONS,
    options: { riskAversion: 0.5, riskKey: 'seed' },
  })
  if (res.error) unreachable.push(`${p.name} (${p.country})`)
}
if (unreachable.length) {
  failures++
  console.log(`  ${unreachable.length} unreachable: ${unreachable.join(', ')}`)
} else {
  console.log(`  all ${PORTS.length - 1} ports reachable`)
}

// A straight line through land would show up as a leg far longer than the
// spacing the graph allows, so check the geometry stayed sane.
console.log('\nlongest single leg on a Rotterdam → Singapore track:')
const rs = planRoutes({
  origin: { portId: 'nlrtm' },
  destination: { portId: 'sgsin' },
  vessel: vessel('neopanamax-container'),
  locations: LOCATIONS,
  options: { riskAversion: 0.5, riskKey: 'seed' },
})
for (const r of rs.routes) {
  let max = 0
  for (let i = 0; i < r.points.length - 1; i++) {
    max = Math.max(max, haversineNm(r.points[i][0], r.points[i][1], r.points[i + 1][0], r.points[i + 1][1]))
  }
  console.log(`  ${r.variant}: ${r.points.length} vertices, longest leg ${Math.round(max)} nm`)
}

console.log(failures ? `\n${failures} check(s) need attention` : '\nall checks passed')
