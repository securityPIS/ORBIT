import { useMemo } from 'react'
import { Info } from 'lucide-react'
import { useStore, selectVisible } from '../store/useStore'
import { CATEGORIES } from '../lib/constants'
import CatIcon from './CatIcon'

export default function ThreatCategories() {
  const state = useStore()
  const setView = useStore((s) => s.setView)
  const visible = selectVisible(state)

  const rows = useMemo(() => {
    const tally = {}
    for (const loc of visible) {
      const cats = loc.categories?.length ? loc.categories : [{ key: loc.primary, level: 'High' }]
      for (const c of cats) {
        const w = c.key === loc.primary ? 2 : 1
        tally[c.key] = (tally[c.key] || 0) + w
      }
    }
    const total = Object.values(tally).reduce((a, b) => a + b, 0) || 1
    return Object.entries(tally)
      .map(([key, v]) => ({ key, pct: Math.round((v / total) * 100) }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5)
  }, [visible])

  return (
    <section className="panel p-0">
      <div className="panel-head">
        <div className="flex items-center gap-1.5">
          <span className="panel-title">Top Threat Categories</span>
          <Info className="h-3.5 w-3.5 text-ink-mute" />
        </div>
        <button onClick={() => setView('feed')} className="text-[11px] font-medium text-brand hover:underline">
          View All
        </button>
      </div>
      <div className="space-y-2.5 px-4 pb-4 pt-1">
        {rows.map((r) => {
          const meta = CATEGORIES[r.key]
          return (
            <div key={r.key} className="flex items-center gap-3">
              <span className="flex w-32 shrink-0 items-center gap-2 text-[12px] text-ink-dim">
                <CatIcon category={r.key} className="h-3.5 w-3.5" style={{ color: meta?.color }} />
                <span className="truncate">{meta?.label || r.key}</span>
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-2">
                <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: meta?.color, boxShadow: `0 0 8px ${meta?.color}66` }} />
              </div>
              <span className="w-8 shrink-0 text-right font-mono text-[11px] font-semibold text-ink">{r.pct}%</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
