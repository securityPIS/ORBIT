import { BarChart3, Printer, Download } from 'lucide-react'
import { useStore, selectVisible } from '../store/useStore'
import PageShell from '../components/PageShell'
import { severityColor, CATEGORIES } from '../lib/constants'
import { fmtRange } from '../lib/time'
import { getWindow } from '../store/useStore'
import { SeverityBadge } from '../components/ui'

export default function ReportsPage() {
  const state = useStore()
  const visible = selectVisible(state)
  const win = getWindow(state.preset)
  const critical = visible.filter((l) => l.liveSeverity === 'critical')
  const high = visible.filter((l) => l.liveSeverity === 'high')
  const avg = visible.length ? Math.round(visible.reduce((a, l) => a + l.liveScore, 0) / visible.length) : 0

  const catTally = {}
  for (const l of visible) for (const c of l.categories) catTally[c.key] = (catTally[c.key] || 0) + 1
  const cats = Object.entries(catTally).sort((a, b) => b[1] - a[1])

  return (
    <PageShell
      title="Risk Report"
      subtitle={`Generated ${fmtRange(win.start, win.end)}`}
      icon={BarChart3}
      actions={
        <>
          <button onClick={() => window.print()} className="chip"><Printer className="h-3.5 w-3.5" /> Print</button>
          <button onClick={() => window.print()} className="btn-primary"><Download className="h-4 w-4" /> Export PDF</button>
        </>
      }
    >
      <div className="mx-auto max-w-3xl space-y-6 text-[13px] leading-relaxed text-ink-dim">
        <section className="panel p-5">
          <div className="flex items-center justify-between border-b border-hair/60 pb-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-brand">ORBIT · Intelligence Report</div>
              <h2 className="mt-1 text-xl font-bold text-ink">Overseas Risk Assessment</h2>
            </div>
            <div className="text-right text-[11px] text-ink-mute">
              <div>As of Jul 14, 2026</div>
              <div>Classification: Illustrative / Demo</div>
            </div>
          </div>
          <p className="mt-4">
            The current global risk posture is assessed at an average score of{' '}
            <b className="text-ink">{avg}</b> on the 1–100 index, where 1 is the most dangerous and 1–20 is the
            high-risk band, with <b style={{ color: severityColor('critical') }}>{critical.length} critical</b> and{' '}
            <b style={{ color: severityColor('high') }}>{high.length} high-severity</b> zones active across {visible.length} monitored areas.
            Findings are derived from {state.documents.length} intelligence documents analyzed for this window.
          </p>
        </section>

        <section>
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-mute">Priority Zones</h3>
          <div className="panel overflow-hidden p-0">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-hair/60 text-[10px] uppercase tracking-wider text-ink-mute">
                  <th className="px-4 py-2.5 font-semibold">Location</th>
                  <th className="px-4 py-2.5 font-semibold">Region</th>
                  <th className="px-4 py-2.5 font-semibold">Primary threat</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Severity</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Score</th>
                </tr>
              </thead>
              <tbody>
                {visible.slice(0, 10).map((l) => (
                  <tr key={l.id} className="border-b border-hair/30 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-ink">{l.name}</td>
                    <td className="px-4 py-2.5 text-ink-mute">{l.region}</td>
                    <td className="px-4 py-2.5">{CATEGORIES[l.primary]?.label || l.primary}</td>
                    <td className="px-4 py-2.5 text-center"><SeverityBadge level={l.liveSeverity} /></td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: severityColor(l.liveSeverity) }}>{l.liveScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-mute">Threat Vector Breakdown</h3>
          <div className="panel space-y-2.5 p-5">
            {cats.map(([key, count]) => {
              const pct = Math.round((count / visible.length) * 100)
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-36 text-[12px] text-ink-dim">{CATEGORIES[key]?.label || key}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel-2">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CATEGORIES[key]?.color }} />
                  </div>
                  <span className="w-10 text-right font-mono text-[11px] text-ink">{count}</span>
                </div>
              )
            })}
          </div>
        </section>

        <section className="panel p-5">
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-mute">Analyst Recommendations</h3>
          <ul className="list-inside list-disc space-y-1.5">
            <li>Prioritize duty-of-care measures for personnel and assets in the {critical.length} critical zones listed above.</li>
            <li>Maintain enhanced maritime protection across affected corridors and review transit routing.</li>
            <li>Increase reporting cadence for emerging zones and re-analyze incoming documents daily.</li>
            <li>Validate high-severity findings against a second source before operational decisions.</li>
          </ul>
        </section>
      </div>
    </PageShell>
  )
}
