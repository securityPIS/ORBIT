import { useMemo, useState } from 'react'
import { Rss, Search, MapPin } from 'lucide-react'
import { useStore, selectVisible } from '../store/useStore'
import PageShell from '../components/PageShell'
import { CATEGORIES, severityColor } from '../lib/constants'
import { SeverityBadge, Sparkline } from '../components/ui'
import CatIcon from '../components/CatIcon'
import { fmtRange } from '../lib/time'

export default function FeedPage() {
  const state = useStore()
  const focusLocation = useStore((s) => s.focusLocation)
  const [q, setQ] = useState('')
  const visible = selectVisible(state)

  const list = useMemo(() => {
    const query = q.trim().toLowerCase()
    return visible.filter((l) => !query || `${l.name} ${l.region} ${l.summary}`.toLowerCase().includes(query))
  }, [visible, q])

  return (
    <PageShell
      title="Risk Feed"
      subtitle={`${visible.length} active risk zones · ranked by live risk score`}
      icon={Rss}
      actions={
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-mute" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter zones…"
            className="w-48 rounded-lg border border-hair bg-panel-2/40 py-1.5 pl-8 pr-2 text-[12.5px] text-ink placeholder:text-ink-mute focus:border-brand/40 focus:outline-none"
          />
        </div>
      }
    >
      <div className="mx-auto max-w-4xl space-y-2.5">
        {list.map((l) => (
          <button
            key={l.id}
            onClick={() => focusLocation(l.id)}
            className="panel flex w-full items-center gap-4 p-4 text-left transition-colors hover:border-hair-2"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-base font-extrabold"
              style={{ color: severityColor(l.liveSeverity), background: `${severityColor(l.liveSeverity)}14`, boxShadow: `inset 0 0 0 1px ${severityColor(l.liveSeverity)}44` }}>
              {l.liveScore}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[14px] font-semibold text-ink">{l.name}</span>
                <SeverityBadge level={l.liveSeverity} />
                {l.isDynamic && <span className="rounded bg-brand/12 px-1.5 py-0.5 text-[9px] font-bold uppercase text-brand">From upload</span>}
              </div>
              <div className="text-[11.5px] text-ink-mute">{l.region} · {fmtRange(l.firstSeen, l.lastSeen)}</div>
              <p className="mt-1 line-clamp-1 text-[12px] text-ink-dim">{l.summary}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {l.categories.slice(0, 4).map((c) => (
                  <span key={c.key} className="inline-flex items-center gap-1 text-[10.5px] text-ink-mute">
                    <CatIcon category={c.key} className="h-3 w-3" style={{ color: CATEGORIES[c.key]?.color }} />
                    {CATEGORIES[c.key]?.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="hidden shrink-0 sm:block">
              <Sparkline data={l.trend} color={severityColor(l.liveSeverity)} width={96} height={36} />
            </div>
            <MapPin className="h-4 w-4 shrink-0 text-ink-mute" />
          </button>
        ))}
        {list.length === 0 && <div className="py-16 text-center text-ink-mute">No zones match your filters.</div>}
      </div>
    </PageShell>
  )
}
