import { useEffect } from 'react'
import { FolderClosed, FileText, ChevronDown, MapPin } from 'lucide-react'
import { useStore } from '../store/useStore'
import PageShell from '../components/PageShell'
import UploadPanel from '../components/UploadPanel'
import { fmtAgo } from '../lib/time'

const STATUS = {
  analyzed: 'text-low bg-low/12 ring-low/30',
  processing: 'text-moderate bg-moderate/12 ring-moderate/30 animate-pulse',
  new: 'text-brand bg-brand/12 ring-brand/30',
}

function fmtSize(b) {
  if (!b) return '—'
  if (b > 1e6) return (b / 1e6).toFixed(1) + ' MB'
  return Math.max(1, Math.round(b / 1e3)) + ' KB'
}

export default function DocumentsPage() {
  const documents = useStore((s) => s.documents)
  const locations = useStore((s) => s.locations)
  const focusLocation = useStore((s) => s.focusLocation)
  const open = useStore((s) => s.openDocId)
  const setOpen = useStore((s) => s.setOpenDoc)
  const locName = (id) => locations.find((l) => l.id === id)?.name || id

  // Arriving from a source link elsewhere in the app: bring the row into view.
  useEffect(() => {
    if (!open) return
    document.getElementById(`doc-${open}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [open])

  return (
    <PageShell
      title="Document Library"
      subtitle={`${documents.length} intelligence briefs · AI-analyzed for risk locations`}
      icon={FolderClosed}
    >
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-0">
          <UploadPanel />
          <p className="mt-3 px-1 text-[11.5px] leading-relaxed text-ink-mute">
            Uploaded documents are analyzed on-device. Detected locations and threat vectors are plotted on the Global Map and
            time-filtered by their reporting date. Connect an AI provider in <span className="text-ink-dim">Settings</span> for
            full-text LLM extraction.
          </p>
        </div>

        <div className="panel overflow-hidden p-0">
          <div className="grid grid-cols-[minmax(0,1fr)_90px_110px_90px] items-center gap-2 border-b border-hair/70 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-ink-mute">
            <span>Document</span>
            <span className="text-center">Status</span>
            <span className="text-right">Risks · Conf.</span>
            <span className="text-right">Uploaded</span>
          </div>
          <ul className="divide-y divide-hair/50">
            {documents.map((d) => (
              <li key={d.id} id={`doc-${d.id}`} className={open === d.id ? 'bg-brand/[0.04] ring-1 ring-inset ring-brand/25' : ''}>
                <button
                  onClick={() => setOpen(open === d.id ? null : d.id)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_90px_110px_90px] items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-brand" />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-ink">{d.name}</span>
                      <span className="block text-[11px] text-ink-mute">{d.kind.toUpperCase()} · {fmtSize(d.size)}</span>
                    </span>
                  </span>
                  <span className="flex justify-center">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${STATUS[d.status] || STATUS.new}`}>{d.status}</span>
                  </span>
                  <span className="text-right text-[12px] text-ink-dim">
                    <span className="font-semibold text-ink">{d.contributes?.length ?? 0}</span> · {d.confidence ?? '—'}
                    {d.confidence ? '%' : ''}
                  </span>
                  <span className="flex items-center justify-end gap-1 text-right text-[11px] text-ink-mute">
                    {fmtAgo(d.uploadedAt)}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open === d.id ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {open === d.id && (
                  <div className="border-t border-hair/40 bg-panel-2/20 px-4 py-3">
                    <p className="text-[12.5px] leading-relaxed text-ink-dim">{d.summary}</p>
                    {d.engine && (
                      <p className="mt-1.5 text-[11px] text-ink-mute">
                        Engine: <span className="font-mono text-brand">{d.engine}</span>
                        {d.wordCount ? ` · ${d.wordCount} words analyzed` : ''}
                      </p>
                    )}
                    {d.contributes?.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {d.contributes.map((id) => (
                          <button
                            key={id}
                            onClick={() => focusLocation(id)}
                            className="inline-flex items-center gap-1 rounded-md border border-hair bg-panel px-2 py-1 text-[11px] text-ink-dim transition-colors hover:border-brand/40 hover:text-brand"
                          >
                            <MapPin className="h-3 w-3" /> {locName(id)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageShell>
  )
}
