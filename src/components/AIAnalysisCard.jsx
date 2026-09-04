import { ArrowRight, Info, FileStack } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Donut } from './ui'

export default function AIAnalysisCard({ embedded = false }) {
  const documents = useStore((s) => s.documents)
  const setView = useStore((s) => s.setView)
  const total = documents.length
  const analyzed = documents.filter((d) => d.status === 'analyzed').length
  const processing = documents.filter((d) => d.status === 'processing').length
  const fresh = documents.filter((d) => !d.seed).length
  const pct = total ? Math.round((analyzed / total) * 100) : 0

  const body = (
    <>
      <div className={`flex items-center gap-4 px-4 pb-3 ${embedded ? 'pt-2' : ''}`}>
        <Donut value={pct} size={82} stroke={8} color="#38bdf8">
          <FileStack className="mb-0.5 h-3.5 w-3.5 text-brand" />
          <span className="text-lg font-extrabold leading-none text-ink">{total}</span>
          <span className="text-[9px] uppercase tracking-wider text-ink-mute">Docs</span>
        </Donut>
        <div className="grid flex-1 grid-cols-3 gap-2">
          <Stat value={analyzed} label="Analyzed" color="#22c55e" />
          <Stat value={processing} label="Processing" color="#f5b301" />
          <Stat value={fresh} label="New" color="#38bdf8" />
        </div>
      </div>
      <div className="px-4 pb-4">
        <button
          onClick={() => setView('analysis')}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-hair bg-panel-2/50 py-2 text-[12.5px] font-semibold text-ink-dim transition-colors hover:border-brand/30 hover:text-brand"
        >
          Go to AI Analysis <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </>
  )

  if (embedded) return body

  return (
    <section className="panel p-0">
      <div className="panel-head">
        <div className="flex items-center gap-1.5">
          <span className="panel-title">AI Analysis from Uploaded Documents</span>
          <Info className="h-3.5 w-3.5 text-ink-mute" />
        </div>
      </div>
      {body}
    </section>
  )
}

function Stat({ value, label, color }) {
  return (
    <div className="rounded-xl border border-hair/70 bg-panel-2/30 px-2.5 py-2 text-center">
      <div className="text-lg font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-ink-mute">{label}</div>
    </div>
  )
}
