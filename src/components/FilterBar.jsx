import { SlidersHorizontal, RefreshCw, Maximize2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { REGIONS, CATEGORIES, SEVERITY_ORDER, SEVERITY } from '../lib/constants'
import { Dropdown } from './ui'

const regionOpts = REGIONS.map((r) => ({ value: r, label: r }))
const typeOpts = [{ value: 'all', label: 'All Types' }, ...Object.values(CATEGORIES).map((c) => ({ value: c.key, label: c.label, dot: c.color }))]
const sevOpts = [{ value: 'all', label: 'All Severity' }, ...SEVERITY_ORDER.map((s) => ({ value: s, label: SEVERITY[s].label, dot: SEVERITY[s].color }))]
const timelineOpts = [
  { value: '24H', label: '24 Hours' },
  { value: '7D', label: '7 Days' },
  { value: '30D', label: '30 Days' },
  { value: '60D', label: '60 Days' },
]

export default function FilterBar() {
  const filters = useStore((s) => s.filters)
  const setFilter = useStore((s) => s.setFilter)
  const preset = useStore((s) => s.preset)
  const setPreset = useStore((s) => s.setPreset)
  const autoRefresh = useStore((s) => s.autoRefresh)
  const toggleAutoRefresh = useStore((s) => s.toggleAutoRefresh)

  const fullscreen = () => {
    const el = document.documentElement
    if (!document.fullscreenElement) el.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dropdown label="Region" value={filters.region} options={regionOpts} onChange={(v) => setFilter('region', v)} />
      <Dropdown label="Risk Type" value={filters.category} options={typeOpts} onChange={(v) => setFilter('category', v)} />
      <Dropdown label="Severity" value={filters.severity} options={sevOpts} onChange={(v) => setFilter('severity', v)} />
      <Dropdown label="Timeline" value={preset} options={timelineOpts} onChange={setPreset} />

      <button className="chip py-2.5">
        <SlidersHorizontal className="h-4 w-4" />
        More Filters
      </button>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={toggleAutoRefresh}
          className="flex items-center gap-2 rounded-xl border border-hair bg-panel-2/50 px-3 py-2.5 text-[12.5px] transition-colors hover:border-hair-2"
        >
          <span className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-low shadow-[0_0_8px_#22c55e]' : 'bg-ink-mute'}`} />
          <span className="text-ink-dim">Auto Refresh</span>
          <span className={`font-semibold ${autoRefresh ? 'text-low' : 'text-ink-mute'}`}>{autoRefresh ? 'On' : 'Off'}</span>
        </button>
        <button className="rounded-xl border border-hair bg-panel-2/50 p-2.5 text-ink-dim transition-colors hover:border-hair-2 hover:text-ink">
          <RefreshCw className="h-4 w-4" />
        </button>
        <button onClick={fullscreen} className="rounded-xl border border-hair bg-panel-2/50 p-2.5 text-ink-dim transition-colors hover:border-hair-2 hover:text-ink">
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
