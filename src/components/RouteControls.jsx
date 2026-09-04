import { useMemo } from 'react'
import { Play, Loader2, TriangleAlert, PanelLeftClose, ShieldAlert, Route as RouteIcon, Ship } from 'lucide-react'
import { useStore, selectRiskAssessment } from '../store/useStore'
import VoyageRatingTab from './VoyageRatingTab'
import VoyageRouteTab from './VoyageRouteTab'
import VoyageVesselTab from './VoyageVesselTab'

const TABS = [
  { key: 'rating', label: 'Risk rating', icon: ShieldAlert },
  { key: 'route', label: 'Route', icon: RouteIcon },
  { key: 'vessel', label: 'Vessel', icon: Ship },
]

export default function RouteControls({ onHide }) {
  const route = useStore((s) => s.route)
  const setRouteTab = useStore((s) => s.setRouteTab)
  const compute = useStore((s) => s.computeRoutes)

  // Recomputed from state on every edit, so both axes stay live without
  // waiting for the routing search.
  const state = useStore()
  const assessment = useMemo(
    () => selectRiskAssessment(state),
    [
      state.route.origin,
      state.route.destination,
      state.route.stops,
      state.route.impactEntities,
      state.route.impactThresholds,
      state.locations,
      state.asOf,
    ]
  )

  const restrictions = route.result?.restrictions || []
  const band = assessment.rating.band

  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-hair/70 bg-panel/70 xl:max-h-[calc(100dvh-232px)]">
      <div className="flex items-center gap-2 border-b border-hair/60 px-4 py-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-mute">Voyage</span>
        <span
          className="rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-bold"
          style={{ color: band.color, background: `${band.color}18`, boxShadow: `inset 0 0 0 1px ${band.color}44` }}
          title={`Risk rating ${assessment.rating.product} of 25 — ${band.label}`}
        >
          {assessment.rating.product} · {band.label}
        </span>
        {onHide && (
          <button
            onClick={onHide}
            title="Hide voyage panel"
            className="ml-auto rounded-lg p-1 text-ink-mute transition-colors hover:bg-white/5 hover:text-ink"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* tabs */}
      <div className="scroll-thin flex gap-1 overflow-x-auto px-3 pb-2 pt-2">
        {TABS.map((t) => {
          const on = route.tab === t.key
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setRouteTab(t.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                on ? 'border-brand/40 bg-brand/10 text-ink' : 'border-hair bg-panel-2/40 text-ink-mute hover:text-ink-dim'
              }`}
            >
              <Icon className="h-3.5 w-3.5" style={on ? { color: '#38bdf8' } : undefined} />
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-1">
        {route.tab === 'rating' && <VoyageRatingTab assessment={assessment} />}
        {route.tab === 'route' && <VoyageRouteTab assessment={assessment} />}
        {route.tab === 'vessel' && <VoyageVesselTab assessment={assessment} />}
      </div>

      <div className="border-t border-hair/60 px-4 py-3">
        <button
          onClick={compute}
          disabled={route.computing}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand to-brand-deep py-2.5 text-[13px] font-bold text-[#04121e] transition-all hover:brightness-110 disabled:opacity-60"
        >
          {route.computing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {route.computing ? 'Analyzing…' : 'Analyze routes'}
        </button>

        {restrictions.length > 0 && (
          <div className="mt-3 rounded-xl border border-moderate/30 bg-moderate/5 p-3">
            <div className="flex items-center gap-1.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-moderate">
              <TriangleAlert className="h-3.5 w-3.5" />
              Passages closed to this vessel
            </div>
            <ul className="space-y-1">
              {restrictions.map((r) => (
                <li key={r.id} className="text-[11.5px] leading-relaxed text-ink-mute">
                  {r.text}
                  {r.costText && <span className="mt-0.5 block font-semibold text-ink-dim">{r.costText}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
