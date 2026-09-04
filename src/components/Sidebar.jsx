import { useMemo } from 'react'
import { LayoutDashboard, Globe2, Navigation, Rss, FolderClosed, Sparkles, Bell, BarChart3, Settings, ChevronRight, PanelLeftClose } from 'lucide-react'
import { useStore, selectVisible } from '../store/useStore'
import { severityFromScore, severityColor, SEVERITY } from '../lib/constants'
import { addDays, scoreAsOf } from '../lib/time'
import { Sparkline } from './ui'

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'map', label: 'Global Map', icon: Globe2 },
  { key: 'routes', label: 'Route Analysis', icon: Navigation },
  { key: 'feed', label: 'Risk Feed', icon: Rss },
  { key: 'documents', label: 'Documents', icon: FolderClosed },
  { key: 'analysis', label: 'AI Analysis', icon: Sparkles },
  { key: 'alerts', label: 'Alerts', icon: Bell },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const open = useStore((s) => s.sidebarOpen)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const incidents = useStore((s) => s.incidents)
  const alertCount = incidents.filter((i) => i.severity === 'critical' || i.severity === 'high').length

  return (
    <aside
      aria-hidden={!open}
      className={`hidden shrink-0 flex-col overflow-hidden bg-abyss/60 backdrop-blur-sm transition-[width] duration-300 ease-out md:flex ${
        open ? 'w-[228px] border-r border-hair/70' : 'w-0 border-r-0'
      }`}
    >
      {/* the inner rail keeps its width so nothing reflows while collapsing */}
      <div className="flex h-full w-[228px] shrink-0 flex-col">
        {/* brand */}
        <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand/25 to-brand-deep/10 ring-1 ring-brand/30">
            <Globe2 className="h-5 w-5 text-brand" />
          </div>
          {/* The strip is too narrow for the full expansion, so it wraps to two
              lines here and the title carries the whole name. */}
          <div
            className="min-w-0 leading-tight"
            title="ORBIT — Overseas Risk Based Intelligence Tools"
          >
            <div className="text-[15px] font-bold tracking-tight text-ink">ORBIT</div>
            <div className="whitespace-nowrap text-[8px] font-medium uppercase leading-[1.3] tracking-[0.04em] text-ink-mute">
              Overseas Risk Based
              <br />
              Intelligence Tools
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            title="Hide menu"
            tabIndex={open ? 0 : -1}
            className="-mr-1.5 ml-auto rounded-lg p-1.5 text-ink-mute transition-colors hover:bg-white/5 hover:text-ink"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {NAV.map(({ key, label, icon: Icon }) => {
            const active = view === key
            return (
              <button
                key={key}
                onClick={() => setView(key)}
                tabIndex={open ? 0 : -1}
                className={`nav-item w-full ${active ? 'nav-item-active' : ''}`}
              >
                {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand" />}
                <Icon className={`h-[18px] w-[18px] ${active ? 'text-brand' : ''}`} />
                <span className="flex-1 text-left">{label}</span>
                {key === 'alerts' && alertCount > 0 && (
                  <span className="rounded-full bg-critical/20 px-1.5 py-0.5 text-[10px] font-bold text-critical">{alertCount}</span>
                )}
              </button>
            )
          })}
        </nav>

        <RiskPosture />
      </div>
    </aside>
  )
}

function RiskPosture() {
  const state = useStore()
  const visible = selectVisible(state)
  const setView = useStore((s) => s.setView)
  const avg = visible.length ? Math.round(visible.reduce((a, l) => a + l.liveScore, 0) / visible.length) : 0
  const sev = severityFromScore(avg)
  const color = severityColor(sev)

  // Average score across the last 8 days, so the spark and the delta describe
  // the same thing. A FALLING index means the picture is deteriorating.
  const trend = useMemo(() => {
    const out = []
    for (let i = 7; i >= 0; i--) {
      const date = addDays(state.asOf, -i)
      let sum = 0
      let n = 0
      for (const l of state.locations) {
        const v = scoreAsOf(l, date)
        if (v != null) {
          sum += v
          n++
        }
      }
      out.push(n ? Math.round(sum / n) : 0)
    }
    return out
  }, [state.locations, state.asOf])

  const weekAgo = trend[0] || avg
  const delta = weekAgo ? Math.round(((avg - weekAgo) / weekAgo) * 100) : 0
  const worsening = delta < 0

  return (
    <div className="m-3 mt-0 rounded-2xl border border-hair/70 bg-panel/70 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-mute">Risk Posture</span>
        <span className="text-[10px] text-ink-mute">Global</span>
      </div>
      <div className="mt-1 flex items-end justify-between">
        <span className="text-2xl font-extrabold tracking-tight" style={{ color }}>
          {SEVERITY[sev].label.toUpperCase()}
        </span>
        <span className="font-mono text-lg font-bold text-ink">{avg}</span>
      </div>
      <div className="mt-1 h-9">
        <Sparkline data={trend.length ? trend : [avg]} color={color} width={180} height={34} />
      </div>
      <div className="mt-1 flex items-center gap-1 text-[11px] text-ink-mute">
        vs last 7 days
        <span className={`font-semibold ${worsening ? 'text-critical' : delta > 0 ? 'text-low' : 'text-ink-mute'}`}>
          {worsening ? '▼' : delta > 0 ? '▲' : '■'} {Math.abs(delta)}%
        </span>
        {worsening && <span className="text-[10px] text-ink-mute">worse</span>}
      </div>
      <button
        onClick={() => setView('reports')}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-brand to-brand-deep py-2 text-[12.5px] font-semibold text-[#04121e] transition-all hover:brightness-110"
      >
        View Risk Report <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
