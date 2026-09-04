import { useStore } from '../store/useStore'
import { SeverityDot, SeverityBadge } from './ui'

export default function EmergingRisks() {
  const emerging = useStore((s) => s.emerging)
  const focusLocation = useStore((s) => s.focusLocation)
  const setView = useStore((s) => s.setView)

  return (
    <section className="panel p-0">
      <div className="panel-head">
        <span className="panel-title">Emerging Risks</span>
        <button onClick={() => setView('feed')} className="text-[11px] font-medium text-brand hover:underline">
          View All
        </button>
      </div>
      <ul className="px-2 pb-2">
        {emerging.map((e, i) => (
          <li key={i}>
            <button
              onClick={() => focusLocation(e.locationId)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.03]"
            >
              <SeverityDot level={e.severity} pulse={e.severity === 'critical'} />
              <span className="flex-1 truncate text-[12.5px] text-ink-dim">{e.label}</span>
              <span className="shrink-0 text-[10.5px] text-ink-mute">{e.ago}</span>
              <SeverityBadge level={e.severity} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
