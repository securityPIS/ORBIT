import { LayoutDashboard, TriangleAlert, Activity, ShieldAlert, FileCheck2, ArrowUpRight } from 'lucide-react'
import { useStore, selectVisible } from '../store/useStore'
import PageShell from '../components/PageShell'
import TrendChart from '../components/TrendChart'
import ThreatCategories from '../components/ThreatCategories'
import EmergingRisks from '../components/EmergingRisks'
import Heatmap from '../components/Heatmap'
import IncidentTimeline from '../components/IncidentTimeline'
import { severityColor } from '../lib/constants'
import { SeverityBadge } from '../components/ui'

function Kpi({ icon: Icon, label, value, sub, color = '#38bdf8' }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${color}16`, color }}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <ArrowUpRight className="h-4 w-4 text-ink-mute" />
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight text-ink">{value}</div>
      <div className="mt-0.5 text-[12px] text-ink-dim">{label}</div>
      {sub && <div className="mt-1 text-[11px] text-ink-mute">{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const state = useStore()
  const documents = useStore((s) => s.documents)
  const focusLocation = useStore((s) => s.focusLocation)
  const visible = selectVisible(state)
  const critical = visible.filter((l) => l.liveSeverity === 'critical').length
  const avg = visible.length ? Math.round(visible.reduce((a, l) => a + l.liveScore, 0) / visible.length) : 0
  const analyzed = documents.filter((d) => d.status === 'analyzed').length
  const top = [...visible].slice(0, 6)

  return (
    <PageShell title="Dashboard" subtitle="Global risk posture at a glance" icon={LayoutDashboard}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Activity} label="Active risk zones" value={visible.length} sub="across all regions" color="#38bdf8" />
        <Kpi icon={TriangleAlert} label="Critical zones" value={critical} sub="require immediate attention" color="#ef4444" />
        <Kpi icon={ShieldAlert} label="Avg. risk score" value={avg} sub="of 100 · lower is worse" color="#f97316" />
        <Kpi icon={FileCheck2} label="Documents analyzed" value={analyzed} sub={`of ${documents.length} in library`} color="#22c55e" />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-3">
          <Heatmap />
          <div className="grid gap-3 md:grid-cols-2">
            <TrendChart />
            <ThreatCategories />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <EmergingRisks />
          <IncidentTimeline />
        </div>
      </div>

      <h2 className="mb-2.5 mt-6 text-[12px] font-semibold uppercase tracking-wider text-ink-mute">Highest-Risk Zones</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {top.map((l) => (
          <button key={l.id} onClick={() => focusLocation(l.id)} className="panel flex items-center gap-3 p-3.5 text-left transition-colors hover:border-hair-2">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-extrabold"
              style={{ color: severityColor(l.liveSeverity), background: `${severityColor(l.liveSeverity)}14` }}>
              {l.liveScore}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-ink">{l.name}</div>
              <div className="text-[11px] text-ink-mute">{l.region}</div>
            </div>
            <SeverityBadge level={l.liveSeverity} />
          </button>
        ))}
      </div>
    </PageShell>
  )
}
