import {
  ArrowLeftRight,
  Crosshair,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { severityColor, SEVERITY, likelihoodMeta } from '../lib/constants'
import { PortSelect, SectionHeader } from './VoyageFields'

/** The computed (or overridden) risk score for one waypoint. */
function ScoreChip({ point }) {
  if (!point) return <span className="text-[11px] text-ink-mute">Set a position to score it</span>
  const color = severityColor(point.severity)
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold"
        style={{ color, background: `${color}18`, boxShadow: `inset 0 0 0 1px ${color}44` }}
      >
        {point.score}
      </span>
      <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color }}>
        {SEVERITY[point.severity]?.label}
      </span>
      <span className="text-[10.5px] text-ink-mute">· L{point.likelihood}</span>
    </span>
  )
}

/** Score row: the assessed value, with a manual override when needed. */
function ScoreRow({ point, manualScore, onOverride }) {
  const overridden = manualScore != null && manualScore !== ''
  return (
    <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-hair/60 bg-panel-2/30 px-2.5 py-1.5">
      <ScoreChip point={point} />
      <div className="ml-auto flex items-center gap-1">
        <input
          type="number"
          min={1}
          max={100}
          value={overridden ? manualScore : ''}
          placeholder="override"
          onChange={(e) => onOverride(e.target.value === '' ? null : Number(e.target.value))}
          className="w-[74px] rounded-md border border-hair bg-panel px-1.5 py-1 text-right font-mono text-[11px] text-ink outline-none placeholder:font-sans placeholder:text-[10px] placeholder:text-ink-mute focus:border-brand/50"
        />
        {overridden && (
          <button
            onClick={() => onOverride(null)}
            title="Back to the assessed score"
            className="rounded-md p-1 text-ink-mute transition-colors hover:bg-white/5 hover:text-ink"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}

export default function VoyageRouteTab({ assessment }) {
  const route = useStore((s) => s.route)
  const setRoute = useStore((s) => s.setRoute)
  const setRouteEndpoint = useStore((s) => s.setRouteEndpoint)
  const swap = useStore((s) => s.swapRouteEndpoints)
  const addStop = useStore((s) => s.addRouteStop)
  const updateStop = useStore((s) => s.updateRouteStop)
  const removeStop = useStore((s) => s.removeRouteStop)
  const moveStop = useStore((s) => s.moveRouteStop)

  const { likelihood } = assessment
  // Points come back in itinerary order, but only for waypoints that have a
  // position — match them back by id so half-filled itineraries stay aligned.
  const pointFor = (role, id) =>
    likelihood.points.find((p) => (id ? p.id === id : p.role === role)) || null

  const aversionLabel =
    route.riskAversion < 0.2
      ? 'Schedule first'
      : route.riskAversion < 0.45
        ? 'Cost-led'
        : route.riskAversion < 0.7
          ? 'Balanced'
          : route.riskAversion < 0.9
            ? 'Security-led'
            : 'Avoid all threat'

  const unset = route.stops.filter((s) => !s.portId && !Number.isFinite(s.lat))

  return (
    <div className="space-y-4">
      <SectionHeader>A · Origin</SectionHeader>
      <div className="-mt-2">
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <PortSelect value={route.origin} onChange={(v) => setRouteEndpoint('origin', v)} accent="#22c55e" />
          </div>
          <button
            onClick={swap}
            title="Swap origin and destination"
            className="rounded-xl border border-hair bg-panel-2/50 p-2.5 text-ink-mute transition-colors hover:text-ink"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </div>
        <ScoreRow
          point={pointFor('origin')}
          manualScore={route.origin.manualScore}
          onOverride={(v) => setRoute({ origin: { ...route.origin, manualScore: v } })}
        />
        <PickButton which="origin" label="Pick A on map" />
      </div>

      {/* intermediate calls */}
      <SectionHeader
        right={
          <button
            onClick={() => addStop()}
            className="flex items-center gap-1 rounded-lg border border-brand/30 bg-brand/10 px-2 py-1 text-[10.5px] font-bold uppercase tracking-wide text-brand transition-colors hover:bg-brand/20"
          >
            <Plus className="h-3 w-3" />
            Add stop
          </button>
        }
      >
        Stops ({route.stops.length})
      </SectionHeader>

      {route.stops.length === 0 ? (
        <p className="-mt-2 text-[11.5px] leading-relaxed text-ink-mute">
          No intermediate calls. Add a stop and it is routed through, scored, and folded into the voyage likelihood.
        </p>
      ) : (
        <ul className="-mt-2 space-y-2.5">
          {route.stops.map((stop, i) => (
            <li key={stop.id} className="rounded-xl border border-hair/60 bg-panel-2/20 p-2.5">
              <div className="flex items-center gap-1.5 pb-1.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-brand/15 font-mono text-[10px] font-bold text-brand">
                  {i + 1}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-mute">Call</span>
                <div className="ml-auto flex items-center gap-0.5">
                  <IconBtn onClick={() => moveStop(stop.id, -1)} disabled={i === 0} title="Move earlier">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </IconBtn>
                  <IconBtn onClick={() => moveStop(stop.id, 1)} disabled={i === route.stops.length - 1} title="Move later">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </IconBtn>
                  <IconBtn onClick={() => removeStop(stop.id)} title="Remove this call" danger>
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconBtn>
                </div>
              </div>
              <PortSelect
                value={stop}
                onChange={(v) => updateStop(stop.id, v)}
                accent="#a78bfa"
                placeholder="Select a call"
              />
              <ScoreRow
                point={pointFor('stop', stop.id)}
                manualScore={stop.manualScore}
                onOverride={(v) => updateStop(stop.id, { manualScore: v })}
              />
              <PickButton which={`stop:${stop.id}`} label={`Pick call ${i + 1} on map`} />
            </li>
          ))}
        </ul>
      )}

      {unset.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-moderate/30 bg-moderate/5 px-3 py-2 text-[11.5px] leading-relaxed text-ink-dim">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-moderate" />
          {unset.length} call{unset.length === 1 ? ' has' : 's have'} no position yet — they are skipped by the routing
          and the rating until you set them.
        </div>
      )}

      <SectionHeader>B · Destination</SectionHeader>
      <div className="-mt-2">
        <PortSelect value={route.destination} onChange={(v) => setRouteEndpoint('destination', v)} accent="#38bdf8" />
        <ScoreRow
          point={pointFor('destination')}
          manualScore={route.destination.manualScore}
          onOverride={(v) => setRoute({ destination: { ...route.destination, manualScore: v } })}
        />
        <PickButton which="destination" label="Pick B on map" />
      </div>

      {/* rolled-up likelihood */}
      <div className="rounded-xl border border-hair/60 bg-panel-2/30 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-mute">Voyage likelihood</span>
          <span className="font-mono text-[11px] text-ink-mute">
            worst of {likelihood.points.length} point{likelihood.points.length === 1 ? '' : 's'}
          </span>
        </div>
        {likelihood.empty ? (
          <p className="mt-1.5 text-[11.5px] text-ink-mute">Set at least one position to derive a likelihood.</p>
        ) : (
          <>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold" style={{ color: severityColor(likelihood.driver?.severity) }}>
                {likelihood.score}
              </span>
              <span className="text-[12.5px] font-bold text-ink">
                L{likelihood.level} · {likelihoodMeta(likelihood.level).label}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">
              Driven by <span className="font-semibold text-ink-dim">{likelihood.driver?.label}</span>. A voyage is only as
              safe as its worst call, so the lowest score on the itinerary sets the likelihood.
            </p>
          </>
        )}
      </div>

      {/* risk posture */}
      <SectionHeader right={<span className="text-[11px] font-semibold text-brand">{aversionLabel}</span>}>
        Risk posture
      </SectionHeader>
      <div className="-mt-2">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={route.riskAversion}
          onChange={(e) => setRoute({ riskAversion: Number(e.target.value) })}
          className="w-full accent-brand"
        />
        <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">
          How much extra distance the operation will accept to stay clear of assessed threat zones.
        </p>
      </div>
    </div>
  )
}

function PickButton({ which, label }) {
  const picking = useStore((s) => s.route.picking)
  const setRoute = useStore((s) => s.setRoute)
  const on = picking === which
  return (
    <button
      onClick={() => setRoute({ picking: on ? null : which })}
      className={`mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl border py-1.5 text-[11.5px] font-semibold transition-colors ${
        on ? 'border-brand/40 bg-brand/15 text-brand' : 'border-hair bg-panel-2/50 text-ink-mute hover:text-ink-dim'
      }`}
    >
      <Crosshair className="h-3.5 w-3.5" />
      {on ? 'Click the map…' : label}
    </button>
  )
}

function IconBtn({ children, onClick, disabled, title, danger }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-md p-1 transition-colors disabled:opacity-25 ${
        danger ? 'text-ink-mute hover:bg-critical/10 hover:text-critical' : 'text-ink-mute hover:bg-white/5 hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}
