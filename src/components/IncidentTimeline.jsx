import { Info, ChevronRight } from 'lucide-react'
import { useStore } from '../store/useStore'
import { incidentCategoryLabel } from '../data/seed'
import { SeverityDot, SeverityBadge } from './ui'
import { fmtAgo } from '../lib/time'
import { severityColor } from '../lib/constants'

export default function IncidentTimeline({ embedded = false }) {
  const incidents = useStore((s) => s.incidents)
  const focusLocation = useStore((s) => s.focusLocation)
  const setView = useStore((s) => s.setView)

  const list = (
    <ul className="flex-1 space-y-0 overflow-y-auto px-4 pb-3 scroll-thin" style={{ maxHeight: embedded ? 320 : 176 }}>
      {incidents.map((inc, i) => (
        <li key={inc.id} className="relative flex gap-3 pb-3">
          {/* rail */}
          <div className="flex flex-col items-center">
            <SeverityDot level={inc.severity} pulse={i === 0} size={9} />
            {i < incidents.length - 1 && <span className="mt-1 w-px flex-1 bg-hair" />}
          </div>
          <button onClick={() => focusLocation(inc.locationId)} className="-mt-1 flex-1 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.03]">
            <div className="flex items-center gap-2">
              <SeverityBadge level={inc.severity} />
              <span className="text-[10px] text-ink-mute">{fmtAgo(inc.time)}</span>
            </div>
            <div className="mt-1 text-[12.5px] font-semibold text-ink">{inc.title}</div>
            <div className="text-[11px]" style={{ color: severityColor(inc.severity) }}>
              {inc.place} · {incidentCategoryLabel(inc.category)}
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-ink-mute">{inc.description}</p>
          </button>
        </li>
      ))}
    </ul>
  )

  if (embedded) return list

  return (
    <section className="panel flex flex-col p-0">
      <div className="panel-head">
        <div className="flex items-center gap-1.5">
          <span className="panel-title">Incident Timeline</span>
          <Info className="h-3.5 w-3.5 text-ink-mute" />
        </div>
        <button onClick={() => setView('feed')} className="text-[11px] font-medium text-brand hover:underline">
          View All
        </button>
      </div>
      {list}
    </section>
  )
}
