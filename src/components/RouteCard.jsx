import { ChevronDown, Route as RouteIcon, Fuel, Receipt, ShieldAlert, Clock, Ruler, CircleCheck, TriangleAlert } from 'lucide-react'
import { severityFromScore, severityColor, scoreFromThreat } from '../lib/constants'
import { ROUTE_COLORS } from './RouteMap'
import { useStore } from '../store/useStore'

function money(n) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${Math.round(n / 1e3)}k`
  return `$${Math.round(n)}`
}

const BADGE_STYLE = {
  recommended: 'text-brand bg-brand/15 ring-brand/40',
  fastest: 'text-low bg-low/15 ring-low/40',
  'lowest risk': 'text-low bg-low/15 ring-low/40',
  'lowest cost': 'text-moderate bg-moderate/15 ring-moderate/40',
}

function Metric({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-mute">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="truncate font-mono text-[15px] font-bold" style={{ color: color || '#e8eefc' }}>
        {value}
      </div>
      {sub && <div className="truncate text-[10.5px] text-ink-mute">{sub}</div>}
    </div>
  )
}

/**
 * Renders a candidate voyage. Without `onToggle` the card is static — the
 * detail is always open, which is how the routing sidebar uses it since the
 * tabs already do the picking.
 */
export default function RouteCard({ route, index, expanded, onToggle, bare = false }) {
  const setRoute = useStore((s) => s.setRoute)
  const color = ROUTE_COLORS[index % ROUTE_COLORS.length]
  // `exposure` / `riskMax` come off the router as threat intensity; the card
  // shows them on the published 1–100 risk index.
  const exposureScore = scoreFromThreat(route.exposure)
  const peakScore = scoreFromThreat(route.riskMax)
  const exposureColor = severityColor(severityFromScore(exposureScore))
  const open = onToggle ? expanded : true
  const Header = onToggle ? 'button' : 'div'

  return (
    <div
      className={
        bare
          ? 'overflow-hidden'
          : `overflow-hidden rounded-2xl border bg-panel/70 transition-colors ${
              open ? 'border-brand/30' : 'border-hair/70 hover:border-hair-2'
            }`
      }
      onMouseEnter={() => setRoute({ hoverRouteId: route.id })}
      onMouseLeave={() => setRoute({ hoverRouteId: null })}
    >
      <Header
        {...(onToggle ? { onClick: onToggle } : {})}
        className={`w-full text-left ${bare ? 'pb-3' : 'px-4 pb-3 pt-3.5'}`}
      >
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
          <span className="text-[13.5px] font-bold text-ink">Route {index + 1}</span>
          <div className="flex min-w-0 flex-wrap gap-1">
            {route.badges.map((b) => (
              <span
                key={b}
                className={`rounded-md px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ring-1 ${
                  BADGE_STYLE[b] || 'text-ink-mute bg-white/5 ring-hair'
                }`}
              >
                {b}
              </span>
            ))}
          </div>
          {onToggle && (
            <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-ink-mute transition-transform ${open ? 'rotate-180' : ''}`} />
          )}
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <Metric icon={Ruler} label="Distance" value={`${route.distanceNm.toLocaleString()}`} sub="nm" />
          <Metric icon={Clock} label="Transit" value={route.days.toFixed(1)} sub="days" />
          <Metric icon={Receipt} label="Cost" value={money(route.totalUsd)} sub="voyage" />
          <Metric icon={ShieldAlert} label="Risk score" value={exposureScore} sub={`worst ${peakScore}`} color={exposureColor} />
        </div>

        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-panel-2">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.max(3, route.exposure)}%`, background: exposureColor }}
          />
        </div>

        {route.chokepoints.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {route.chokepoints.map((cp) => (
              <span
                key={cp.id}
                className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10.5px] font-medium text-ink-dim ring-1 ring-hair"
              >
                {cp.name}
              </span>
            ))}
          </div>
        )}
      </Header>

      {open && (
        <div className={`animate-fade-up border-t border-hair/60 pt-3 ${bare ? '' : 'px-4 pb-4'}`}>
          <Section icon={CircleCheck} title="Why this route" tone="#22c55e" items={route.why} />
          <Section icon={TriangleAlert} title="Watch-outs" tone="#f5b301" items={route.watch} />

          <div className="mt-3 rounded-xl border border-hair/60 bg-panel-2/30 p-3">
            <div className="pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-mute">Cost breakdown</div>
            <dl className="space-y-1.5">
              <Row icon={Fuel} label={`Bunkers · ${route.fuelTonnes.toLocaleString()} t`} value={money(route.fuelUsd)} />
              <Row icon={Receipt} label="Canal & transit tolls" value={route.tollUsd ? money(route.tollUsd) : '—'} />
              <Row
                icon={ShieldAlert}
                label={`War-risk premium · ${route.warRisk.items.length} area${route.warRisk.items.length === 1 ? '' : 's'}`}
                value={route.warRisk.total ? money(route.warRisk.total) : '—'}
              />
              <div className="flex items-center justify-between border-t border-hair/60 pt-1.5">
                <dt className="text-[12px] font-bold text-ink">Estimated total</dt>
                <dd className="font-mono text-[13px] font-bold text-ink">{money(route.totalUsd)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-[10.5px] leading-relaxed text-ink-mute">
              Planning estimates only — excludes port dues, charter hire, pilotage and canal booking fees.
            </p>
          </div>

          {route.hotspots.length > 0 && (
            <div className="mt-3">
              <div className="pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
                Threat zones near the track
              </div>
              <div className="space-y-1">
                {route.hotspots.map((h) => (
                  <div key={h.id} className="flex items-center gap-2 rounded-lg bg-panel-2/40 px-2.5 py-1.5">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: severityColor(h.severity), boxShadow: `0 0 6px ${severityColor(h.severity)}` }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-ink-dim">{h.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-ink-mute">{h.minNm.toLocaleString()} nm</span>
                    <span className="shrink-0 font-mono text-[12px] font-bold" style={{ color: severityColor(h.severity) }}>
                      {h.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ icon: Icon, title, tone, items }) {
  if (!items?.length) return null
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: tone }}>
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <ul className="space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-ink-dim">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full" style={{ background: tone }} />
            <span className="min-w-0">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="flex items-center gap-1.5 text-[12px] text-ink-mute">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="font-mono text-[12px] font-semibold text-ink-dim">{value}</dd>
    </div>
  )
}
