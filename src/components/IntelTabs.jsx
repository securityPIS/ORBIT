import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useStore } from '../store/useStore'
import AIAnalysisCard from './AIAnalysisCard'
import IncidentTimeline from './IncidentTimeline'
import UploadPanel from './UploadPanel'
import RecentUploads from './RecentUploads'

const TABS = [
  { key: 'ai', label: 'AI Analysis' },
  { key: 'timeline', label: 'Incident Timeline' },
  { key: 'sources', label: 'Sources' },
]

export default function IntelTabs() {
  const [tab, setTab] = useState('ai')
  const setView = useStore((s) => s.setView)

  return (
    <section className="panel flex flex-col p-0">
      <div className="px-3 pt-3 pb-2.5">
        <div className="inline-flex max-w-full rounded-xl border border-hair bg-panel-2/50 p-0.5">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`whitespace-nowrap rounded-[9px] px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                tab === key ? 'bg-brand/15 text-brand shadow-sm' : 'text-ink-mute hover:text-ink-dim'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'ai' && <AIAnalysisCard embedded />}

      {tab === 'timeline' && (
        <>
          <IncidentTimeline embedded />
          <ViewAllLink onClick={() => setView('feed')} label="View all incidents" />
        </>
      )}

      {tab === 'sources' && (
        <>
          <UploadPanel embedded />
          <div className="px-4 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">Recent Uploads</div>
          <RecentUploads embedded />
          <ViewAllLink onClick={() => setView('documents')} label="View all documents" />
        </>
      )}
    </section>
  )
}

function ViewAllLink({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="mx-4 mb-3 mt-1 flex items-center justify-center gap-1.5 rounded-xl border border-hair bg-panel-2/50 py-2 text-[12px] font-semibold text-ink-dim transition-colors hover:border-brand/30 hover:text-brand"
    >
      {label} <ArrowRight className="h-3.5 w-3.5" />
    </button>
  )
}
