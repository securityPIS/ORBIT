import { useState, useMemo } from 'react'
import { Search, Bell, Calendar, ChevronDown, CircleDot, PanelLeft, PanelLeftClose } from 'lucide-react'
import { useStore, getWindow } from '../store/useStore'
import { fmtRange } from '../lib/time'
import { PRESETS } from '../lib/time'
import { severityColor } from '../lib/constants'
import { useOutside, SeverityDot } from './ui'

export default function TopBar() {
  const search = useStore((s) => s.search)
  const setSearch = useStore((s) => s.setSearch)
  const locations = useStore((s) => s.locations)
  const focusLocation = useStore((s) => s.focusLocation)
  const preset = useStore((s) => s.preset)
  const setPreset = useStore((s) => s.setPreset)
  const setView = useStore((s) => s.setView)
  const sidebarOpen = useStore((s) => s.sidebarOpen)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const [focus, setFocus] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const dateRef = useOutside(() => setDateOpen(false))
  const win = getWindow(preset)

  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return locations
      .filter((l) => `${l.name} ${l.region} ${l.place || ''}`.toLowerCase().includes(q))
      .slice(0, 6)
  }, [search, locations])

  return (
    <header className="relative z-30 flex items-center gap-3 border-b border-hair/70 bg-abyss/70 px-4 py-3 backdrop-blur-md">
      {/* sidebar toggle */}
      <button
        onClick={toggleSidebar}
        title={sidebarOpen ? 'Hide menu' : 'Show menu'}
        aria-label={sidebarOpen ? 'Hide menu' : 'Show menu'}
        className="hidden shrink-0 rounded-xl border border-hair bg-panel-2/50 p-2.5 text-ink-dim transition-colors hover:border-hair-2 hover:text-ink md:block"
      >
        {sidebarOpen ? <PanelLeftClose className="h-[18px] w-[18px]" /> : <PanelLeft className="h-[18px] w-[18px]" />}
      </button>

      {/* search */}
      <div className="relative w-full max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 150)}
          placeholder="Search locations, incidents, documents, tags…"
          className="w-full rounded-xl border border-hair bg-panel-2/40 py-2.5 pl-10 pr-16 text-[13px] text-ink placeholder:text-ink-mute focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-hair bg-panel px-1.5 py-0.5 font-mono text-[10px] text-ink-mute sm:block">
          ⌘K
        </kbd>
        {focus && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-hair bg-panel-2 p-1.5 shadow-2xl">
            {results.map((r) => (
              <button
                key={r.id}
                onMouseDown={() => {
                  focusLocation(r.id)
                  setSearch('')
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/5"
              >
                <SeverityDot level={r.severity} />
                <span className="flex-1">
                  <span className="block text-[13px] font-medium text-ink">{r.name}</span>
                  <span className="block text-[11px] text-ink-mute">{r.region}</span>
                </span>
                <span className="font-mono text-[11px]" style={{ color: severityColor(r.severity) }}>
                  {r.score}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        {/* date range */}
        <div className="relative" ref={dateRef}>
          <button
            onClick={() => setDateOpen((o) => !o)}
            className="flex items-center gap-2 rounded-xl border border-hair bg-panel-2/50 px-3 py-2.5 transition-colors hover:border-hair-2"
          >
            <Calendar className="h-4 w-4 text-ink-mute" />
            <span className="hidden text-[13px] font-medium text-ink sm:block">{fmtRange(win.start, win.end)}</span>
            <ChevronDown className={`h-4 w-4 text-ink-mute transition-transform ${dateOpen ? 'rotate-180' : ''}`} />
          </button>
          {dateOpen && (
            <div className="absolute right-0 top-full z-40 mt-2 w-52 rounded-xl border border-hair bg-panel-2 p-1.5 shadow-2xl">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-mute">Time window</div>
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => {
                    setPreset(p.key)
                    setDateOpen(false)
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[13px] transition-colors hover:bg-white/5 ${
                    preset === p.key ? 'text-brand' : 'text-ink-dim'
                  }`}
                >
                  Last {p.label}
                  {preset === p.key && <CircleDot className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* notifications */}
        <button
          onClick={() => setView('alerts')}
          className="relative rounded-xl border border-hair bg-panel-2/50 p-2.5 text-ink-dim transition-colors hover:border-hair-2 hover:text-ink"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-critical px-1 text-[9px] font-bold text-white">
            7
          </span>
        </button>

        {/* profile */}
        <button className="flex items-center gap-2.5 rounded-xl border border-hair bg-panel-2/50 py-1.5 pl-1.5 pr-2.5 transition-colors hover:border-hair-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand/30 to-brand-deep/20 text-[12px] font-bold text-brand">
            AM
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-[12.5px] font-semibold text-ink">Alex Morgan</span>
            <span className="block text-[10.5px] text-ink-mute">Strategic Analyst</span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-ink-mute sm:block" />
        </button>
      </div>
    </header>
  )
}
