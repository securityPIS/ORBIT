import { geoEquirectangular, geoPath, geoGraticule10 } from 'd3-geo'
import { feature } from 'topojson-client'
import world from 'world-atlas/countries-110m.json'

// Fixed internal coordinate space for the map (2:1 equirectangular).
// The SVG scales responsively via viewBox, so all geometry is precomputed once.
export const MAP_W = 1000
export const MAP_H = 500

const projection = geoEquirectangular().fitSize([MAP_W, MAP_H], { type: 'Sphere' })
const pathGen = geoPath(projection)

const countryCollection = feature(world, world.objects.countries)
export const countries = countryCollection.features

// Precomputed SVG path strings for every country outline.
export const countryPaths = countries
  .map((f) => ({ id: String(f.id), d: pathGen(f) }))
  .filter((c) => c.d)

export const graticulePath = pathGen(geoGraticule10())
export const spherePath = pathGen({ type: 'Sphere' })

/** Project [lng, lat] into map-space {x, y}. */
export function project(lng, lat) {
  const p = projection([lng, lat])
  return p ? { x: p[0], y: p[1] } : { x: 0, y: 0 }
}

/** Inverse of {@link project} — map-space back to {lng, lat}. */
export function unproject(x, y) {
  const p = projection.invert?.([x, y])
  return p ? { lng: p[0], lat: p[1] } : null
}

/**
 * Projects a [lng, lat] track into one or more SVG paths.
 *
 * A voyage that crosses the antimeridian would otherwise draw as a line racing
 * back across the whole map, so the track is cut at ±180° and resumed on the
 * far edge at the same latitude.
 */
export function projectPolyline(points) {
  if (!points?.length) return []
  const paths = []
  let current = [project(points[0][0], points[0][1])]

  for (let i = 1; i < points.length; i++) {
    const [lng, lat] = points[i]
    const [plng, plat] = points[i - 1]
    const delta = lng - plng
    if (Math.abs(delta) > 180) {
      // Travelled the short way round; find where it met the date line.
      const wrapped = delta > 0 ? delta - 360 : delta + 360
      const edge = wrapped > 0 ? 180 : -180
      const t = (edge - plng) / wrapped
      const latAtEdge = plat + (lat - plat) * t
      current.push(project(edge, latAtEdge))
      paths.push(current)
      current = [project(-edge, latAtEdge)]
    }
    current.push(project(lng, lat))
  }
  paths.push(current)

  return paths
    .filter((pts) => pts.length > 1)
    .map((pts) => pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' '))
}

/** Great-circle-ish arc as a quadratic bezier path between two coordinates. */
export function arcPath(a, b) {
  const p1 = project(a.lng, a.lat)
  const p2 = project(b.lng, b.lat)
  const mx = (p1.x + p2.x) / 2
  const my = (p1.y + p2.y) / 2
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const dist = Math.hypot(dx, dy)
  // Lift the control point perpendicular to the chord for a curved sea-lane feel.
  const lift = Math.min(dist * 0.22, 90)
  const nx = -dy / (dist || 1)
  const ny = dx / (dist || 1)
  const cx = mx + nx * lift
  const cy = my + ny * lift - Math.min(dist * 0.08, 24)
  return `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`
}
