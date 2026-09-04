import { useRef, useState, useCallback, useMemo } from 'react'
import { Plus, Minus, Locate, Crosshair } from 'lucide-react'
import { countryPaths, graticulePath, spherePath, project, unproject, projectPolyline, MAP_W, MAP_H } from '../lib/geo'
import { severityColor } from '../lib/constants'
import { useStore, selectVisible, waypointGeo } from '../store/useStore'

/** Route colours in ranked order — the recommendation reads first. */
export const ROUTE_COLORS = ['#38bdf8', '#a78bfa', '#f5b301', '#34d399']

const MARKER_COLORS = { origin: '#22c55e', destination: '#38bdf8', stop: '#a78bfa' }

function EndpointMarker({ lng, lat, kind, label, invScale }) {
  const p = project(lng, lat)
  const color = MARKER_COLORS[kind] || MARKER_COLORS.destination
  return (
    <g transform={`translate(${p.x} ${p.y}) scale(${invScale})`} className="pointer-events-none">
      <circle r={12} fill={color} fillOpacity={0.16} />
      <circle r={6.5} fill={color} stroke="#04121e" strokeWidth={1.6} />
      <text x={0} y={0} dy="0.35em" textAnchor="middle" fontSize={7.5} fontWeight="800" fill="#04121e">
        {label}
      </text>
    </g>
  )
}

export default function RouteMap() {
  const svgRef = useRef(null)
  const [tf, setTf] = useState({ s: 1, x: 0, y: 0 })
  const drag = useRef(null)
  const state = useStore()
  const route = state.route
  const setRouteEndpoint = state.setRouteEndpoint
  const setRoute = state.setRoute
  const visible = useMemo(() => selectVisible(state), [state.locations, state.filters, state.asOf])

  const result = route.result
  const routes = result?.routes || []
  const selectedId = route.selectedRouteId

  // Where the search actually put each waypoint (snapped to navigable water).
  const planned = useMemo(() => {
    if (!result?.from || !result?.to) return []
    const vias = (result.vias || []).map((v, i) => ({ key: `via-${i}`, kind: 'stop', label: String(i + 1), lng: v.lng, lat: v.lat }))
    return [
      { key: 'from', kind: 'origin', label: 'A', lng: result.from.lng, lat: result.from.lat },
      ...vias,
      { key: 'to', kind: 'destination', label: 'B', lng: result.to.lng, lat: result.to.lat },
    ]
  }, [result])

  // Before a search — or while the itinerary is being edited — show what is set.
  const pending = useMemo(() => {
    const out = []
    const push = (key, kind, label, point) => {
      const geo = waypointGeo(point)
      if (geo) out.push({ key, kind, label, lng: geo.lng, lat: geo.lat })
    }
    push('from', 'origin', 'A', route.origin)
    route.stops.forEach((s, i) => push(s.id, 'stop', String(i + 1), s))
    push('to', 'destination', 'B', route.destination)
    return out
  }, [route.origin, route.destination, route.stops])

  const clientToView = useCallback((cx, cy) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = cx
    pt.y = cy
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const v = pt.matrixTransform(ctm.inverse())
    return { x: v.x, y: v.y }
  }, [])

  const onWheel = useCallback(
    (e) => {
      e.preventDefault()
      const { x, y } = clientToView(e.clientX, e.clientY)
      setTf((t) => {
        const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18
        const s = Math.max(1, Math.min(8, t.s * factor))
        const worldX = (x - t.x) / t.s
        const worldY = (y - t.y) / t.s
        return { s, x: x - worldX * s, y: y - worldY * s }
      })
    },
    [clientToView]
  )

  const onPointerDown = (e) => {
    const { x, y } = clientToView(e.clientX, e.clientY)
    drag.current = { x, y, ox: tf.x, oy: tf.y, moved: false }
  }
  const onPointerMove = (e) => {
    if (!drag.current) return
    const { x, y } = clientToView(e.clientX, e.clientY)
    const dx = x - drag.current.x
    const dy = y - drag.current.y
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true
    setTf((t) => ({ ...t, x: drag.current.ox + dx, y: drag.current.oy + dy }))
  }
  const onPointerUp = (e) => {
    const info = drag.current
    drag.current = null
    if (!info || info.moved || !route.picking) return
    // A click while picking drops the endpoint wherever the cursor landed; the
    // planner snaps it to the nearest navigable water.
    const { x, y } = clientToView(e.clientX, e.clientY)
    const world = unproject((x - tf.x) / tf.s, (y - tf.y) / tf.s)
    if (!world) return
    const position = { lat: world.lat, lng: world.lng, portId: undefined }
    if (route.picking.startsWith('stop:')) {
      state.updateRouteStop(route.picking.slice(5), position)
    } else {
      setRouteEndpoint(route.picking, position)
    }
  }

  const zoomBy = (f) =>
    setTf((t) => {
      const s = Math.max(1, Math.min(8, t.s * f))
      const cx = MAP_W / 2
      const cy = MAP_H / 2
      return { s, x: cx - ((cx - t.x) / t.s) * s, y: cy - ((cy - t.y) / t.s) * s }
    })

  const invScale = 1 / tf.s

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-hair/70 bg-[#060b16]">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(120% 90% at 50% -10%, rgba(56,189,248,0.10), transparent 60%), radial-gradient(80% 60% at 60% 120%, rgba(239,68,68,0.08), transparent 60%)',
        }}
      />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        preserveAspectRatio="xMidYMid slice"
        className={`absolute inset-0 h-full w-full touch-none select-none ${route.picking ? 'cursor-crosshair' : ''}`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => (drag.current = null)}
      >
        <defs>
          <radialGradient id="route-ocean" cx="50%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#0c1830" />
            <stop offset="55%" stopColor="#081324" />
            <stop offset="100%" stopColor="#050a14" />
          </radialGradient>
          <linearGradient id="route-land" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#12233d" />
            <stop offset="100%" stopColor="#0d1a2e" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#route-ocean)" />

        <g transform={`translate(${tf.x} ${tf.y}) scale(${tf.s})`}>
          <path d={spherePath} fill="none" stroke="#16324f" strokeWidth={0.5} opacity={0.5} />
          <path d={graticulePath} fill="none" stroke="#123a5c" strokeWidth={0.4} opacity={0.3} />
          {countryPaths.map((c, i) => (
            <path key={i} d={c.d} fill="url(#route-land)" stroke="#28577f" strokeWidth={0.4} strokeOpacity={0.7} />
          ))}

          {/* threat zones the voyage has to be judged against */}
          {visible.map((loc) => {
            const p = project(loc.lng, loc.lat)
            const color = severityColor(loc.liveSeverity)
            const r = 8 + (loc.liveThreat / 100) * 26
            return (
              <g key={loc.id}>
                <circle cx={p.x} cy={p.y} r={r} fill={color} fillOpacity={0.1} />
                <circle cx={p.x} cy={p.y} r={2.2 * invScale} fill={color} fillOpacity={0.85} />
              </g>
            )
          })}

          {/* candidate tracks, the selected one on top and at full strength */}
          {routes.map((r, i) => {
            const color = ROUTE_COLORS[i % ROUTE_COLORS.length]
            const active = r.id === selectedId
            const hovered = r.id === route.hoverRouteId
            const paths = projectPolyline(r.points)
            return (
              <g
                key={r.id}
                style={{ cursor: 'pointer' }}
                onPointerUp={(e) => {
                  const moved = drag.current?.moved
                  // The svg's own handler is skipped below, so release the drag
                  // here or panning would continue after the button came up.
                  drag.current = null
                  if (!moved) {
                    e.stopPropagation()
                    setRoute({ selectedRouteId: r.id })
                  }
                }}
                onMouseEnter={() => setRoute({ hoverRouteId: r.id })}
                onMouseLeave={() => setRoute({ hoverRouteId: null })}
              >
                {paths.map((d, k) => (
                  <g key={k}>
                    {/* invisible fat stroke so the thin track is still clickable */}
                    <path d={d} fill="none" stroke="transparent" strokeWidth={8 * invScale} />
                    {(active || hovered) && (
                      <path d={d} fill="none" stroke={color} strokeWidth={5 * invScale} strokeOpacity={0.18} strokeLinecap="round" />
                    )}
                    <path
                      d={d}
                      fill="none"
                      stroke={color}
                      strokeWidth={(active ? 1.9 : hovered ? 1.5 : 1.1) * invScale}
                      strokeOpacity={active ? 1 : hovered ? 0.8 : 0.4}
                      strokeDasharray={active ? undefined : `${3 * invScale} ${3 * invScale}`}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                ))}
              </g>
            )
          })}

          {/* passages used by the selected route */}
          {routes
            .filter((r) => r.id === selectedId)
            .flatMap((r) =>
              r.chokepoints.map((cp) => {
                const p = project(cp.lng, cp.lat)
                return (
                  <g key={`${r.id}-${cp.id}`} transform={`translate(${p.x} ${p.y}) scale(${invScale})`} className="pointer-events-none">
                    <circle r={4} fill="#04121e" stroke="#e8eefc" strokeWidth={1.2} />
                    <circle r={1.5} fill="#e8eefc" />
                  </g>
                )
              })
            )}

          {/* itinerary — planned positions when a result exists, otherwise the
              waypoints as currently set, so calls show up before the search */}
          {(planned.length ? planned : pending).map((w) => (
            <EndpointMarker key={w.key} lng={w.lng} lat={w.lat} kind={w.kind} label={w.label} invScale={invScale} />
          ))}
        </g>
      </svg>

      {/* toolbar */}
      <div className="absolute left-3 top-3 flex flex-col gap-1.5">
        <div className="flex flex-col overflow-hidden rounded-xl border border-hair bg-panel/80 backdrop-blur">
          <button onClick={() => zoomBy(1.4)} className="p-2 text-ink-dim hover:bg-white/5 hover:text-ink">
            <Plus className="h-4 w-4" />
          </button>
          <div className="h-px bg-hair" />
          <button onClick={() => zoomBy(1 / 1.4)} className="p-2 text-ink-dim hover:bg-white/5 hover:text-ink">
            <Minus className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => setTf({ s: 1, x: 0, y: 0 })}
          title="Reset view"
          className="rounded-xl border border-hair bg-panel/80 p-2 text-ink-dim backdrop-blur hover:text-ink"
        >
          <Locate className="h-4 w-4" />
        </button>
      </div>

      {route.picking && (
        <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-brand/40 bg-panel/95 px-3.5 py-2 text-[12.5px] font-medium text-brand shadow-glow backdrop-blur">
          <Crosshair className="h-4 w-4" />
          Click the map to set the{' '}
          {route.picking === 'origin'
            ? 'origin'
            : route.picking === 'destination'
              ? 'destination'
              : `call ${route.stops.findIndex((s) => `stop:${s.id}` === route.picking) + 1}`}
          <button onClick={() => setRoute({ picking: null })} className="ml-1 text-ink-mute hover:text-ink">
            Cancel
          </button>
        </div>
      )}

      {routes.length > 0 && (
        <div className="absolute bottom-3 left-3 flex flex-col gap-1 rounded-xl border border-hair bg-panel/80 px-3 py-2 backdrop-blur">
          {routes.map((r, i) => (
            <button
              key={r.id}
              onClick={() => setRoute({ selectedRouteId: r.id })}
              className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${
                r.id === selectedId ? 'text-ink' : 'text-ink-mute hover:text-ink-dim'
              }`}
            >
              <span className="h-0.5 w-5 rounded-full" style={{ background: ROUTE_COLORS[i % ROUTE_COLORS.length] }} />
              Route {i + 1} · {r.distanceNm.toLocaleString()} nm
            </button>
          ))}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 right-4 font-mono text-[11px] text-ink-mute">
        {Math.round(tf.s * 100)}%
      </div>
    </div>
  )
}
