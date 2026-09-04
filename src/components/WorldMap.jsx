import { useRef, useState, useCallback, useMemo } from 'react'
import { Plus, Minus, Maximize2, Locate, Layers, MousePointer2 } from 'lucide-react'
import { countryPaths, graticulePath, spherePath, project, arcPath, MAP_W, MAP_H } from '../lib/geo'
import { severityColor, SEVERITY_ORDER } from '../lib/constants'
import { SEA_LANES, LOCATIONS } from '../data/seed'
import { useStore, selectVisible, getWindow } from '../store/useStore'
import { fmtShort, addDays, daysBetween, toDate, PRESETS } from '../lib/time'
import { TODAY } from '../lib/constants'
import RiskDetailPanel from './RiskDetailPanel'
import TimeScrubber from './TimeScrubber'

const LANE_POS = Object.fromEntries(LOCATIONS.map((l) => [l.id, { lat: l.lat, lng: l.lng }]))

// Small teardrop map-pin marker with the incident count inside the head.
// Head radius R, tip at local (0,0), head centred at (0,-HEAD_Y).
const PIN_R = 8
const PIN_HEAD_Y = 11
const PIN_PATH = `M 0 0 C -${PIN_R * 0.75} -${PIN_HEAD_Y * 0.45}, -${PIN_R} -${PIN_HEAD_Y - PIN_R * 0.4}, -${PIN_R} -${PIN_HEAD_Y} A ${PIN_R} ${PIN_R} 0 1 1 ${PIN_R} -${PIN_HEAD_Y} C ${PIN_R} -${PIN_HEAD_Y - PIN_R * 0.4}, ${PIN_R * 0.75} -${PIN_HEAD_Y * 0.45}, 0 0 Z`

function PinMarker({ loc, selected, hovered, onSelect, onHover, invScale }) {
  const p = project(loc.lng, loc.lat)
  const color = severityColor(loc.liveSeverity)
  const active = selected || hovered
  const scale = active ? 1.25 : 1
  return (
    <g
      transform={`translate(${p.x} ${p.y}) scale(${invScale})`}
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => onHover(loc.id)}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(loc.id)
      }}
    >
      <g style={{ transform: `scale(${scale})`, transition: 'transform 0.12s ease' }}>
        {/* ground shadow at the tip */}
        <ellipse cx={0} cy={0.5} rx={PIN_R * 0.55} ry={1.6} fill="#000" opacity={0.35} />
        {/* pin body */}
        <path
          d={PIN_PATH}
          fill={color}
          stroke="#04121e"
          strokeWidth={1.2}
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.6))` }}
        />
        {/* selection accent */}
        {selected && <path d={PIN_PATH} fill="none" stroke="#ffffff" strokeWidth={1} strokeOpacity={0.85} strokeLinejoin="round" />}
        {/* small number inside the head */}
        <text
          x={0}
          y={-PIN_HEAD_Y}
          textAnchor="middle"
          dy="0.34em"
          fontSize={PIN_R * 0.95}
          fontWeight="700"
          fill="#04121e"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {loc.count}
        </text>
      </g>
    </g>
  )
}

export default function WorldMap() {
  const svgRef = useRef(null)
  const [tf, setTf] = useState({ s: 1, x: 0, y: 0 })
  const drag = useRef(null)
  const state = useStore()
  const { selectedId, hoverId } = state
  const visible = useMemo(() => selectVisible(state), [state.locations, state.filters, state.asOf])
  const win = getWindow(state.preset)

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
        const s = Math.max(1, Math.min(6, t.s * factor))
        // keep the point under the cursor stationary
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
  const onPointerUp = () => {
    const moved = drag.current?.moved
    drag.current = null
    if (!moved) state.clearSelection()
  }

  const zoomBy = (f) =>
    setTf((t) => {
      const s = Math.max(1, Math.min(6, t.s * f))
      const cx = MAP_W / 2
      const cy = MAP_H / 2
      const worldX = (cx - t.x) / t.s
      const worldY = (cy - t.y) / t.s
      return { s, x: cx - worldX * s, y: cy - worldY * s }
    })
  const reset = () => setTf({ s: 1, x: 0, y: 0 })
  const invScale = 1 / tf.s

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-hair/70 bg-[#060b16]">
      {/* ambient glow backdrop */}
      <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: 'radial-gradient(120% 90% at 50% -10%, rgba(56,189,248,0.10), transparent 60%), radial-gradient(80% 60% at 60% 120%, rgba(239,68,68,0.10), transparent 60%)' }} />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full touch-none select-none"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <defs>
          <radialGradient id="ocean" cx="50%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#0c1830" />
            <stop offset="55%" stopColor="#081324" />
            <stop offset="100%" stopColor="#050a14" />
          </radialGradient>
          <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#12233d" />
            <stop offset="100%" stopColor="#0d1a2e" />
          </linearGradient>
          {/* per-severity radial glow used to light up the regions */}
          {SEVERITY_ORDER.map((sev) => {
            const c = severityColor(sev)
            return (
              <radialGradient key={sev} id={`glow-${sev}`}>
                <stop offset="0%" stopColor={c} stopOpacity={0.7} />
                <stop offset="40%" stopColor={c} stopOpacity={0.28} />
                <stop offset="100%" stopColor={c} stopOpacity={0} />
              </radialGradient>
            )
          })}
          {/* clip the glow to landmasses so the affected regions glow */}
          <clipPath id="landClip">
            {countryPaths.map((c, i) => (
              <path key={i} d={c.d} />
            ))}
          </clipPath>
        </defs>

        <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#ocean)" />

        <g transform={`translate(${tf.x} ${tf.y}) scale(${tf.s})`}>
          <path d={spherePath} fill="none" stroke="#16324f" strokeWidth={0.5} opacity={0.5} />
          <path d={graticulePath} fill="none" stroke="#123a5c" strokeWidth={0.4} opacity={0.35} />
          {countryPaths.map((c, i) => (
            <path key={i} d={c.d} fill="url(#land)" stroke="#28577f" strokeWidth={0.4} strokeOpacity={0.7} />
          ))}

          {/* glowing regions — colored gradient light around each risk zone */}
          <g clipPath="url(#landClip)" style={{ mixBlendMode: 'screen' }}>
            {visible.map((loc) => {
              const gp = project(loc.lng, loc.lat)
              const glowR = 26 + (loc.liveThreat / 100) * 64
              const isHot = loc.liveSeverity === 'critical' || loc.liveSeverity === 'high'
              return (
                <circle
                  key={loc.id}
                  cx={gp.x}
                  cy={gp.y}
                  r={glowR}
                  fill={`url(#glow-${loc.liveSeverity})`}
                  className={isHot ? 'animate-region-glow' : undefined}
                  style={{ transformOrigin: `${gp.x}px ${gp.y}px` }}
                />
              )
            })}
          </g>

          {/* sea lanes */}
          {SEA_LANES.map(([a, b], i) => {
            if (!LANE_POS[a] || !LANE_POS[b]) return null
            return (
              <path
                key={i}
                d={arcPath(LANE_POS[a], LANE_POS[b])}
                fill="none"
                stroke="#38bdf8"
                strokeWidth={0.6}
                strokeOpacity={0.35}
                strokeDasharray="2 4"
                className="lane"
              />
            )
          })}

          {/* pin markers with the incident count inside */}
          {visible.map((loc) => (
            <PinMarker
              key={loc.id}
              loc={loc}
              selected={selectedId === loc.id}
              hovered={hoverId === loc.id}
              onSelect={state.select}
              onHover={state.setHover}
              invScale={invScale}
            />
          ))}
        </g>
      </svg>

      {/* left toolbar */}
      <div className="absolute left-3 top-3 flex flex-col gap-1.5">
        <ToolBtn active title="Select"><MousePointer2 className="h-4 w-4" /></ToolBtn>
        <div className="flex flex-col overflow-hidden rounded-xl border border-hair bg-panel/80 backdrop-blur">
          <button onClick={() => zoomBy(1.4)} className="p-2 text-ink-dim hover:bg-white/5 hover:text-ink"><Plus className="h-4 w-4" /></button>
          <div className="h-px bg-hair" />
          <button onClick={() => zoomBy(1 / 1.4)} className="p-2 text-ink-dim hover:bg-white/5 hover:text-ink"><Minus className="h-4 w-4" /></button>
        </div>
        <ToolBtn onClick={reset} title="Reset view"><Locate className="h-4 w-4" /></ToolBtn>
        <ToolBtn title="Layers"><Layers className="h-4 w-4" /></ToolBtn>
      </div>

      {/* zoom indicator */}
      <div className="absolute right-3 top-3 rounded-lg border border-hair bg-panel/80 px-2 py-1 font-mono text-[11px] text-ink-mute backdrop-blur">
        {Math.round(tf.s * 100)}%
      </div>

      {/* hover tooltip */}
      {hoverId && hoverId !== selectedId && <HoverTip id={hoverId} visible={visible} />}

      {/* detail panel */}
      {selectedId && <RiskDetailPanel />}

      {/* legend */}
      <Legend />

      {/* coordinates */}
      <div className="pointer-events-none absolute bottom-3 right-4 font-mono text-[11px] text-ink-mute">
        {visible.length} active zones · {fmtShort(win.start)}–{fmtShort(win.end)}
      </div>

      {/* time scrubber */}
      <TimeScrubber />
    </div>
  )
}

function ToolBtn({ children, active, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-xl border p-2 backdrop-blur transition-colors ${
        active ? 'border-brand/40 bg-brand/15 text-brand' : 'border-hair bg-panel/80 text-ink-dim hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function HoverTip({ id, visible }) {
  const loc = visible.find((l) => l.id === id)
  if (!loc) return null
  const p = project(loc.lng, loc.lat)
  const left = `${(p.x / MAP_W) * 100}%`
  const top = `${(p.y / MAP_H) * 100}%`
  return (
    <div className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+16px)]" style={{ left, top }}>
      <div className="whitespace-nowrap rounded-lg border border-hair bg-panel/95 px-2.5 py-1.5 text-xs shadow-xl backdrop-blur">
        <div className="font-semibold text-ink">{loc.name}</div>
        <div className="text-ink-mute">
          Risk score <span style={{ color: severityColor(loc.liveSeverity) }} className="font-bold">{loc.liveScore}</span> · {loc.region}
        </div>
      </div>
    </div>
  )
}

function Legend() {
  const items = [
    ['low', 'Low'],
    ['moderate', 'Moderate'],
    ['high', 'High'],
    ['critical', 'Critical'],
  ]
  return (
    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-hair bg-panel/80 px-4 py-2 backdrop-blur">
      {items.map(([k, label]) => (
        <div key={k} className="flex items-center gap-1.5 text-[11px] font-medium text-ink-dim">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: severityColor(k), boxShadow: `0 0 8px ${severityColor(k)}` }} />
          {label}
        </div>
      ))}
    </div>
  )
}
