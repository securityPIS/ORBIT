import { FileText, FileSpreadsheet, FileJson, Image as ImageIcon, ChevronRight } from 'lucide-react'
import { useStore } from '../store/useStore'
import { fmtAgo } from '../lib/time'

const STATUS = {
  analyzed: { label: 'Analyzed', cls: 'text-low bg-low/12 ring-low/30' },
  processing: { label: 'Processing', cls: 'text-moderate bg-moderate/12 ring-moderate/30' },
  new: { label: 'New', cls: 'text-brand bg-brand/12 ring-brand/30' },
}

function KindIcon({ kind }) {
  const cls = 'h-4 w-4 text-ink-mute'
  if (kind === 'csv') return <FileSpreadsheet className={cls} />
  if (kind === 'json') return <FileJson className={cls} />
  if (kind === 'image') return <ImageIcon className={cls} />
  return <FileText className={cls} />
}

export default function RecentUploads({ embedded = false }) {
  const documents = useStore((s) => s.documents)
  const setView = useStore((s) => s.setView)

  const list = (
    <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2 scroll-thin" style={{ maxHeight: embedded ? 220 : 168 }}>
      {documents.slice(0, 7).map((d) => {
        const st = STATUS[d.status] || STATUS.new
        return (
          <li key={d.id}>
            <button
              onClick={() => setView('analysis')}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.03]"
            >
              <KindIcon kind={d.kind} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium text-ink-dim">{d.name}</span>
              </span>
              <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${st.cls} ${d.status === 'processing' ? 'animate-pulse' : ''}`}>
                {st.label}
              </span>
              <span className="w-12 shrink-0 text-right text-[10.5px] text-ink-mute">{fmtAgo(d.uploadedAt)}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )

  if (embedded) return list

  return (
    <section className="panel flex flex-col p-0">
      <div className="panel-head">
        <span className="panel-title">Recent Uploads</span>
        <button onClick={() => setView('documents')} className="text-[11px] font-medium text-brand hover:underline">
          View All
        </button>
      </div>
      {list}
    </section>
  )
}
