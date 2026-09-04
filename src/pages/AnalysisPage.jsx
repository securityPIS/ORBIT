import { useMemo } from 'react'
import { Sparkles, Cpu, MapPin, ArrowUpRight, FileText, Rss, Settings as SettingsIcon } from 'lucide-react'
import { useStore, selectVisible } from '../store/useStore'
import PageShell from '../components/PageShell'
import { CATEGORIES, severityColor, SEVERITY } from '../lib/constants'
import { SeverityBadge, LevelPill } from '../components/ui'
import CatIcon from '../components/CatIcon'

export default function AnalysisPage() {
  const state = useStore()
  const documents = useStore((s) => s.documents)
  const setView = useStore((s) => s.setView)
  const focusLocation = useStore((s) => s.focusLocation)
  const settings = useStore((s) => s.settings)
  const locations = useStore((s) => s.locations)
  const openDocument = useStore((s) => s.openDocument)
  const visible = selectVisible(state)

  const byDoc = useMemo(() => documents.filter((d) => d.status === 'analyzed'), [documents])

  /**
   * Source documents per location. Seed documents declare what they contribute;
   * locations extracted from an upload carry the link the other way round.
   */
  const docsByLocation = useMemo(() => {
    const map = new Map()
    const push = (locId, doc) => {
      const list = map.get(locId) || []
      if (!list.some((d) => d.id === doc.id)) list.push(doc)
      map.set(locId, list)
    }
    for (const d of documents) for (const locId of d.contributes || []) push(locId, d)
    for (const l of locations)
      for (const docId of l.contributingDocs || []) {
        const d = documents.find((x) => x.id === docId)
        if (d) push(l.id, d)
      }
    return map
  }, [documents, locations])
  const dist = useMemo(() => {
    const d = { critical: 0, high: 0, moderate: 0, low: 0 }
    for (const l of visible) d[l.liveSeverity]++
    return d
  }, [visible])

  const connected = settings.provider !== 'offline' && settings.apiKey

  return (
    <PageShell
      title="AI Analysis"
      subtitle="Risk locations extracted from your uploaded documents"
      icon={Sparkles}
      actions={
        <button onClick={() => setView('settings')} className="chip">
          <SettingsIcon className="h-3.5 w-3.5" /> Configure engine
        </button>
      }
    >
      {/* engine banner */}
      <div className="panel mb-5 flex flex-wrap items-center gap-4 p-4">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/12 text-brand ring-1 ring-brand/25">
          <Cpu className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            Extraction engine
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${connected ? 'text-low bg-low/12 ring-low/30' : 'text-brand bg-brand/12 ring-brand/30'}`}>
              {connected ? `${settings.provider} connected` : 'On-device'}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-ink-mute">
            {connected
              ? 'Documents are analyzed with your configured LLM provider for full-text extraction.'
              : 'Running the built-in offline analyzer (gazetteer + threat lexicon). Add an API key in Settings for LLM-grade extraction.'}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            ['critical', dist.critical],
            ['high', dist.high],
            ['moderate', dist.moderate],
            ['low', dist.low],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-hair/70 bg-panel-2/30 px-3 py-2 text-center">
              <div className="text-lg font-bold" style={{ color: severityColor(k) }}>{v}</div>
              <div className="text-[9px] uppercase tracking-wide text-ink-mute">{SEVERITY[k].label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* detected locations */}
      <h2 className="mb-2.5 text-[12px] font-semibold uppercase tracking-wider text-ink-mute">
        Detected Risk Locations · {visible.length}
      </h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((l) => {
          const srcDocs = docsByLocation.get(l.id) || []
          const [primaryDoc, ...otherDocs] = srcDocs
          return (
          <div key={l.id} className="panel group flex flex-col p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold text-ink">{l.name}</div>
                <div className="text-[11.5px] text-ink-mute">{l.region}</div>
              </div>
              <SeverityBadge level={l.liveSeverity} />
            </div>

            {/* source document on the left, the score sitting under the badge */}
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="pb-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-mute">Source document</div>
                {primaryDoc ? (
                  <div className="flex min-w-0 items-center gap-1.5">
                    <button
                      onClick={() => openDocument(primaryDoc.id)}
                      title={`Open ${primaryDoc.name}`}
                      className="flex min-w-0 items-center gap-1.5 text-left text-[12px] font-medium text-brand transition-colors hover:text-ink"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate underline decoration-brand/30 underline-offset-2">{primaryDoc.name}</span>
                      <ArrowUpRight className="h-3 w-3 shrink-0 opacity-70" />
                    </button>
                    {otherDocs.length > 0 && (
                      <button
                        onClick={() => openDocument(otherDocs[0].id)}
                        title={otherDocs.map((d) => d.name).join('\n')}
                        className="shrink-0 rounded-md border border-hair bg-panel-2/40 px-1.5 py-0.5 text-[10px] font-semibold text-ink-mute transition-colors hover:border-brand/40 hover:text-brand"
                      >
                        +{otherDocs.length}
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-ink-mute">
                    <Rss className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{l.sources?.[0] || 'Feed intelligence'}</span>
                  </span>
                )}
              </div>
              <span
                className="shrink-0 font-mono text-[30px] font-extrabold leading-none tracking-tight"
                style={{ color: severityColor(l.liveSeverity) }}
              >
                {l.liveScore}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {l.categories.slice(0, 3).map((c) => (
                <span key={c.key} className="inline-flex items-center gap-1 rounded-md border border-hair bg-panel-2/40 px-1.5 py-1 text-[10.5px] text-ink-dim">
                  <CatIcon category={c.key} className="h-3 w-3" style={{ color: CATEGORIES[c.key]?.color }} />
                  {CATEGORIES[c.key]?.label}
                </span>
              ))}
            </div>
            <button
              onClick={() => focusLocation(l.id)}
              className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-hair bg-panel-2/40 py-1.5 text-[12px] font-medium text-ink-dim transition-colors hover:border-brand/40 hover:text-brand"
            >
              <MapPin className="h-3.5 w-3.5" /> Locate on map
            </button>
          </div>
          )
        })}
      </div>

      {/* per-document findings */}
      <h2 className="mb-2.5 mt-6 text-[12px] font-semibold uppercase tracking-wider text-ink-mute">Per-Document Findings</h2>
      <div className="space-y-2.5">
        {byDoc.map((d) => (
          <div key={d.id} className="panel flex items-start gap-3 p-4">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[13px] font-semibold text-ink">{d.name}</span>
                {d.engine && <span className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-mute">{d.engine}</span>}
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-dim">{d.summary}</p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-lg font-bold text-ink">{d.contributes?.length ?? 0}</div>
              <div className="text-[10px] uppercase tracking-wide text-ink-mute">locations</div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
