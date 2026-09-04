import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useStore } from '../store/useStore'
import PageShell from '../components/PageShell'
import { incidentCategoryLabel } from '../data/seed'
import { SeverityDot, SeverityBadge, Segmented } from '../components/ui'
import { fmtAgo } from '../lib/time'
import { severityColor } from '../lib/constants'

export default function AlertsPage() {
  const incidents = useStore((s) => s.incidents)
  const focusLocation = useStore((s) => s.focusLocation)
  const [sev, setSev] = useState('all')

  const list = incidents.filter((i) => sev === 'all' || i.severity === sev)

  return (
    <PageShell
      title="Alerts & Incidents"
      subtitle={`${incidents.length} incidents in the current window`}
      icon={Bell}
      actions={
        <Segmented
          value={sev}
          onChange={setSev}
          options={[
            { value: 'all', label: 'All' },
            { value: 'critical', label: 'Critical' },
            { value: 'high', label: 'High' },
            { value: 'moderate', label: 'Moderate' },
          ]}
        />
      }
    >
      <div className="mx-auto max-w-3xl space-y-2.5">
        {list.map((inc) => (
          <button
            key={inc.id}
            onClick={() => focusLocation(inc.locationId)}
            className="panel flex w-full items-start gap-3.5 p-4 text-left transition-colors hover:border-hair-2"
          >
            <div className="pt-1">
              <SeverityDot level={inc.severity} pulse={inc.severity === 'critical'} size={10} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge level={inc.severity} />
                <span className="text-[11px] font-medium" style={{ color: severityColor(inc.severity) }}>
                  {incidentCategoryLabel(inc.category)}
                </span>
                <span className="text-[11px] text-ink-mute">· {inc.place}</span>
                <span className="ml-auto text-[11px] text-ink-mute">{fmtAgo(inc.time)}</span>
              </div>
              <div className="mt-1.5 text-[14px] font-semibold text-ink">{inc.title}</div>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-dim">{inc.description}</p>
            </div>
          </button>
        ))}
        {list.length === 0 && <div className="py-16 text-center text-ink-mute">No incidents at this severity.</div>}
      </div>
    </PageShell>
  )
}
