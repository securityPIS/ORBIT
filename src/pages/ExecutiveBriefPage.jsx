import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  TriangleAlert,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useStore, selectBriefStale, selectBriefReady } from '../store/useStore'
import BriefPaper from '../components/BriefPaper'
import { exportBriefPdf } from '../lib/briefPdf'

const ZOOMS = [0.7, 0.8, 0.9, 1, 1.15, 1.3]

function ToolbarButton({ icon: Icon, label, onClick, disabled, title, primary = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      className={
        primary
          ? 'inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-brand to-brand-deep px-3.5 py-2 text-[12.5px] font-bold text-[#04121e] transition-all hover:brightness-110 disabled:opacity-50'
          : 'inline-flex items-center gap-1.5 rounded-xl border border-hair bg-panel-2/50 px-2.5 py-2 text-[12px] font-semibold text-ink-dim transition-colors hover:border-hair-2 hover:text-ink disabled:opacity-50'
      }
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:block">{label}</span>
    </button>
  )
}

export default function ExecutiveBriefPage() {
  const doc = useStore((s) => s.brief.doc)
  const setView = useStore((s) => s.setView)
  const generate = useStore((s) => s.generateExecutiveBrief)
  const addToast = useStore((s) => s.addToast)
  const stale = useStore(selectBriefStale)
  const ready = useStore(selectBriefReady)
  const [zoom, setZoom] = useState(1)
  const [exporting, setExporting] = useState(false)

  // Printing swaps the whole app out for the document copy below.
  useEffect(() => {
    document.body.classList.add('brief-print-mode')
    return () => document.body.classList.remove('brief-print-mode')
  }, [])

  const downloadPdf = async () => {
    setExporting(true)
    try {
      const name = await exportBriefPdf(doc)
      addToast({ kind: 'success', title: 'PDF exported', body: `${name} saved to your downloads.` })
    } catch (e) {
      addToast({ kind: 'error', title: 'PDF export failed', body: e?.message || String(e) })
    } finally {
      setExporting(false)
    }
  }

  if (!doc) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20">
          <FileText className="h-6 w-6" />
        </span>
        <div className="max-w-md text-[13px] leading-relaxed text-ink-mute">
          <p className="text-[15px] font-bold text-ink">No executive brief yet</p>
          <p className="mt-1">
            The brief is written from a finished route analysis — the macro, meso and micro sections all read from its
            output. Run the analysis on the Route Analysis page, then generate the brief.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('routes')} className="chip">
            <ArrowLeft className="h-3.5 w-3.5" /> Route Analysis
          </button>
          {ready && (
            <button onClick={generate} className="btn-primary">
              <FileText className="h-4 w-4" /> Generate brief
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-[#070b14]">
      {/* toolbar */}
      <div className="no-print z-20 flex items-center gap-2 border-b border-hair/60 bg-abyss/80 px-4 py-2.5 backdrop-blur">
        <button
          onClick={() => setView('routes')}
          title="Back to route analysis"
          className="inline-flex items-center gap-1.5 rounded-xl border border-hair bg-panel-2/50 px-2.5 py-2 text-[12px] font-semibold text-ink-dim transition-colors hover:border-hair-2 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:block">Route Analysis</span>
        </button>

        <div className="ml-1 hidden min-w-0 flex-col leading-tight lg:flex">
          <span className="truncate text-[12.5px] font-semibold text-ink">{doc.title}</span>
          <span className="truncate text-[10.5px] text-ink-mute">
            {doc.reference} · click any line to edit
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-xl border border-hair bg-panel-2/50 px-1 py-1 md:flex">
            <button
              onClick={() => setZoom((z) => ZOOMS[Math.max(0, ZOOMS.indexOf(z) - 1)] ?? z)}
              title="Zoom out"
              className="rounded-lg p-1.5 text-ink-mute transition-colors hover:bg-white/5 hover:text-ink"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="w-10 text-center font-mono text-[11px] text-ink-dim">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(z) + 1)] ?? z)}
              title="Zoom in"
              className="rounded-lg p-1.5 text-ink-mute transition-colors hover:bg-white/5 hover:text-ink"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          <ToolbarButton
            icon={RefreshCw}
            label="Regenerate"
            onClick={generate}
            disabled={!ready}
            title={ready ? 'Rewrite the brief from the current analysis — edits are replaced' : 'Run the route analysis first'}
          />
          <ToolbarButton icon={Printer} label="Print" onClick={() => window.print()} />
          <ToolbarButton
            icon={exporting ? Loader2 : Download}
            label={exporting ? 'Exporting…' : 'Download PDF'}
            onClick={downloadPdf}
            disabled={exporting}
            primary
          />
        </div>
      </div>

      {stale && (
        <div className="no-print flex items-center gap-2.5 border-b border-moderate/25 bg-moderate/10 px-4 py-2 text-[12px] text-ink-dim">
          <TriangleAlert className="h-4 w-4 shrink-0 text-moderate" />
          <span className="min-w-0 flex-1">
            The route analysis has changed since this brief was written, so its figures no longer match the voyage on
            screen.
          </span>
          <button
            onClick={generate}
            className="shrink-0 rounded-lg border border-moderate/40 bg-moderate/10 px-2.5 py-1 text-[11.5px] font-bold text-moderate transition-colors hover:bg-moderate/20"
          >
            Regenerate
          </button>
        </div>
      )}

      {/* document canvas */}
      <div className="scroll-thin min-h-0 flex-1 overflow-auto bg-[#070b14] px-6 py-8">
        <div style={{ zoom }}>
          <BriefPaper doc={doc} />
        </div>
      </div>

      {/* What the browser prints: the same document, outside the app shell so no
          scroll container can clip it. Hidden on screen. */}
      {createPortal(
        <div className="brief-print-portal">
          <BriefPaper doc={doc} readOnly />
        </div>,
        document.body
      )}
    </div>
  )
}
