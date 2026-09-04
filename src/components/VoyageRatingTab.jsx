import { ShieldAlert, Gauge, Boxes, MapPin, Info } from 'lucide-react'
import { LIKELIHOOD_LEVELS, IMPACT_LEVELS, severityColor } from '../lib/constants'
import { matrixCells, fmtMoney } from '../lib/riskRating'
import { useStore } from '../store/useStore'
import { SectionHeader } from './VoyageFields'

const ROWS = matrixCells()

/** The 5 × 5 grid, with the voyage's own cell called out. */
function Matrix({ impact, likelihood }) {
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full border-separate border-spacing-[3px] text-center">
        <thead>
          <tr>
            <th className="w-[46px]" />
            {LIKELIHOOD_LEVELS.map((l) => (
              <th key={l.level} className="pb-1">
                <div className="font-mono text-[10px] font-bold text-ink-dim">L{l.level}</div>
                <div className="text-[8.5px] uppercase leading-tight tracking-wide text-ink-mute">{l.short}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.impact}>
              <th className="pr-1 text-right align-middle">
                <div className="font-mono text-[10px] font-bold text-ink-dim">I{row.impact}</div>
                <div className="text-[8.5px] uppercase leading-tight tracking-wide text-ink-mute">
                  {row.meta.label.slice(0, 7)}
                </div>
              </th>
              {row.cells.map((cell) => {
                const here = cell.impact === impact && cell.likelihood === likelihood
                return (
                  <td key={cell.likelihood} className="p-0">
                    <div
                      title={`I${cell.impact} × L${cell.likelihood} = ${cell.product} · ${cell.band.label}`}
                      className="grid h-9 place-items-center rounded-md font-mono text-[12px] font-bold transition-all"
                      style={{
                        background: here ? cell.band.color : `${cell.band.color}22`,
                        color: here ? '#08111f' : `${cell.band.color}`,
                        boxShadow: here
                          ? `0 0 0 2px #e8eefc, 0 0 16px ${cell.band.color}`
                          : `inset 0 0 0 1px ${cell.band.color}33`,
                      }}
                    >
                      {cell.product}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AxisCard({ icon: Icon, label, value, caption, color, detail }) {
  return (
    <div className="rounded-xl border border-hair/60 bg-panel-2/30 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-mono text-xl font-bold" style={{ color }}>
          {value}
        </span>
        <span className="min-w-0 truncate text-[12px] font-bold text-ink">{caption}</span>
      </div>
      {detail && <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-mute">{detail}</p>}
    </div>
  )
}

export default function VoyageRatingTab({ assessment }) {
  const setRouteTab = useStore((s) => s.setRouteTab)
  const { impact, likelihood, rating } = assessment
  const band = rating.band

  const impactColor = ['#22c55e', '#84cc16', '#f5b301', '#f97316', '#ef4444'][impact.level - 1]

  return (
    <div className="space-y-4">
      {/* headline */}
      <div
        className="rounded-2xl border p-4"
        style={{ borderColor: `${band.color}55`, background: `${band.color}12` }}
      >
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
          <ShieldAlert className="h-3.5 w-3.5" style={{ color: band.color }} />
          Risk rating
        </div>
        <div className="mt-1 flex items-end gap-3">
          <span className="font-mono text-[38px] font-bold leading-none" style={{ color: band.color }}>
            {rating.product}
          </span>
          <div className="min-w-0 pb-1">
            <div className="text-[15px] font-bold leading-tight" style={{ color: band.color }}>
              {band.label}
            </div>
            <div className="font-mono text-[11px] text-ink-mute">
              I{rating.impact} × L{rating.likelihood} · of 25
            </div>
          </div>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-dim">{band.action}</p>
        {!rating.ready && (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-mute">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            {impact.empty && likelihood.empty
              ? 'Provisional — no exposures listed and no positions set.'
              : impact.empty
                ? 'Provisional — no exposures listed yet, so impact defaults to I1.'
                : 'Provisional — no waypoint has a position yet, so likelihood defaults to L1.'}
          </p>
        )}
      </div>

      {/* the two axes */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
        <button onClick={() => setRouteTab('vessel')} className="text-left">
          <AxisCard
            icon={Boxes}
            label="Impact"
            value={`I${impact.level}`}
            caption={impact.meta.label}
            color={impactColor}
            detail={
              impact.empty
                ? 'No exposures listed — open the Vessel tab to add them.'
                : `${impact.entities.length} object${impact.entities.length === 1 ? '' : 's'} · ${fmtMoney(impact.totalValue)} · led by ${impact.driver?.label || '—'}`
            }
          />
        </button>
        <button onClick={() => setRouteTab('route')} className="text-left">
          <AxisCard
            icon={Gauge}
            label="Likelihood"
            value={`L${likelihood.level}`}
            caption={likelihood.meta.label}
            color={severityColor(likelihood.driver?.severity || 'low')}
            detail={
              likelihood.empty
                ? 'No positions set — open the Route tab to set them.'
                : `Risk score ${likelihood.score} at ${likelihood.driver?.label}, the worst of ${likelihood.points.length} point${likelihood.points.length === 1 ? '' : 's'}.`
            }
          />
        </button>
      </div>

      {/* matrix */}
      <SectionHeader>Risk assessment matrix</SectionHeader>
      <div className="-mt-2">
        <Matrix impact={rating.impact} likelihood={rating.likelihood} />
        <p className="mt-2 text-[10.5px] leading-relaxed text-ink-mute">
          Impact (I1–I5) down the side, likelihood (L1–L5) across the top. Likelihood is read off the risk score in
          20-point bands — score 1–20 is L5 Almost certain, 81–100 is L1 Rare.
        </p>
      </div>

      {/* itinerary breakdown */}
      {likelihood.points.length > 0 && (
        <>
          <SectionHeader>Score by waypoint</SectionHeader>
          <ul className="-mt-2 space-y-1">
            {likelihood.points.map((p) => {
              const color = severityColor(p.severity)
              const driving = p.score === likelihood.score
              return (
                <li
                  key={p.id || p.role}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${
                    driving ? 'bg-white/[0.055] ring-1 ring-hair-2' : 'bg-panel-2/30'
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color }} />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-ink-dim">{p.label}</span>
                  {p.manualScore != null && (
                    <span className="shrink-0 rounded px-1 text-[9.5px] font-bold uppercase tracking-wide text-moderate">
                      manual
                    </span>
                  )}
                  <span className="shrink-0 font-mono text-[10.5px] text-ink-mute">L{p.likelihood}</span>
                  <span className="shrink-0 font-mono text-[12px] font-bold" style={{ color }}>
                    {p.score}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {/* impact breakdown */}
      {impact.entities.length > 0 && (
        <>
          <SectionHeader>Impact by object</SectionHeader>
          <ul className="-mt-2 space-y-1">
            {impact.entities.map((e) => {
              const color = ['#22c55e', '#84cc16', '#f5b301', '#f97316', '#ef4444'][e.level - 1]
              const driving = e.level === impact.level
              return (
                <li
                  key={e.id}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${
                    driving ? 'bg-white/[0.055] ring-1 ring-hair-2' : 'bg-panel-2/30'
                  }`}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-ink-dim">{e.label || 'Untitled object'}</span>
                  <span className="shrink-0 font-mono text-[10.5px] text-ink-mute">{fmtMoney(e.value)}</span>
                  <span className="shrink-0 font-mono text-[12px] font-bold" style={{ color }}>
                    I{e.level}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <p className="text-[10.5px] leading-relaxed text-ink-mute">
        {IMPACT_LEVELS[impact.level - 1].label}: {IMPACT_LEVELS[impact.level - 1].note}.
      </p>
    </div>
  )
}
