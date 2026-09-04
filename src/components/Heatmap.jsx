import { useId } from 'react'
import { Info, ArrowRight } from 'lucide-react'
import { countryPaths, project, MAP_W, MAP_H } from '../lib/geo'
import { useStore, selectVisible } from '../store/useStore'
import { severityColor } from '../lib/constants'

export default function Heatmap() {
  const state = useStore()
  const setView = useStore((s) => s.setView)
  const visible = selectVisible(state)
  const gid = useId().replace(/:/g, '')

  return (
    <section className="panel flex flex-col p-0">
      <div className="panel-head">
        <div className="flex items-center gap-1.5">
          <span className="panel-title">Global Risk Heatmap</span>
          <Info className="h-3.5 w-3.5 text-ink-mute" />
        </div>
        <button onClick={() => setView('reports')} className="flex items-center gap-1 text-[11px] font-medium text-brand hover:underline">
          View Report <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <div className="flex-1 px-3">
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid meet" className="h-[150px] w-full">
          <defs>
            <filter id={`blur-${gid}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>
          <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="#070d19" />
          {countryPaths.map((c, i) => (
            <path key={i} d={c.d} fill="#0f1d33" />
          ))}
          <g style={{ mixBlendMode: 'screen' }} filter={`url(#blur-${gid})`}>
            {visible.map((l) => {
              const p = project(l.lng, l.lat)
              const r = 10 + (l.liveThreat / 100) * 26
              return <circle key={l.id} cx={p.x} cy={p.y} r={r} fill={severityColor(l.liveSeverity)} opacity={0.55} />
            })}
          </g>
          {visible.map((l) => {
            const p = project(l.lng, l.lat)
            return <circle key={l.id} cx={p.x} cy={p.y} r={1.6} fill="#fff" opacity={0.8} />
          })}
        </svg>
      </div>
      <div className="flex items-center gap-2 px-4 pb-3 pt-1">
        <span className="text-[10px] text-ink-mute">Low</span>
        <div className="h-1.5 flex-1 rounded-full" style={{ background: 'linear-gradient(90deg,#22c55e,#f5b301,#f97316,#ef4444)' }} />
        <span className="text-[10px] text-ink-mute">Critical</span>
      </div>
    </section>
  )
}
