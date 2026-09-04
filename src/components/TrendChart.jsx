import { useMemo, useState, useId } from 'react'
import { Info } from 'lucide-react'
import { useStore, getWindow } from '../store/useStore'
import { addDays, fmtShort, scoreAsOf } from '../lib/time'
import { severityColor, severityFromScore } from '../lib/constants'
import { Dropdown } from './ui'

export default function TrendChart() {
  const locations = useStore((s) => s.locations)
  const preset = useStore((s) => s.preset)
  const [metric, setMetric] = useState('risk')
  const gid = useId().replace(/:/g, '')
  const win = getWindow(preset)

  const series = useMemo(() => {
    const days = win.days
    const step = Math.max(1, Math.round(days / 28))
    const out = []
    for (let i = 0; i <= days; i += step) {
      const date = addDays(win.start, i)
      let sum = 0
      let n = 0
      for (const l of locations) {
        const v = scoreAsOf(l, date)
        if (v != null) {
          sum += metric === 'count' ? 1 : v
          n++
        }
      }
      out.push({ date, value: metric === 'count' ? n * 5 : n ? Math.round(sum / n) : 0 })
    }
    return out
  }, [locations, win.start, win.days, metric])

  const W = 320
  const H = 120
  const max = 100
  const pts = series.map((d, i) => [(i / (series.length - 1 || 1)) * W, H - (d.value / max) * (H - 10) - 4])
  const line = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L ${W} ${H} L 0 ${H} Z`
  const last = series[series.length - 1]
  const lastPt = pts[pts.length - 1] || [W, H]
  // On the inverted index a FALLING line is a deteriorating picture, so the
  // trace takes the colour of the band it currently sits in.
  const tone = metric === 'count' ? '#38bdf8' : severityColor(severityFromScore(last?.value ?? 100))
  const first = series[0]?.value ?? 0
  const drift = metric === 'count' ? null : (last?.value ?? 0) - first

  return (
    <section className="panel p-0">
      <div className="panel-head">
        <div className="flex items-center gap-1.5">
          <span className="panel-title">Trend Over Time</span>
          <Info className="h-3.5 w-3.5 text-ink-mute" />
        </div>
        <Dropdown
          value={metric}
          options={[
            { value: 'risk', label: 'Risk Score' },
            { value: 'count', label: 'Active Zones' },
          ]}
          onChange={setMetric}
          minWidth={140}
        />
      </div>
      <div className="relative px-3 pb-3">
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[120px] w-full">
            <defs>
              <linearGradient id={`tr-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={tone} stopOpacity="0.45" />
                <stop offset="100%" stopColor={tone} stopOpacity="0" />
              </linearGradient>
            </defs>
            {[25, 50, 75].map((g) => (
              <line key={g} x1="0" x2={W} y1={H - (g / max) * (H - 10) - 4} y2={H - (g / max) * (H - 10) - 4} stroke="#1e293b" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="3 4" />
            ))}
            <path d={area} fill={`url(#tr-${gid})`} />
            <path d={line} fill="none" stroke={tone} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          {/* value bubble */}
          <div
            className="absolute -translate-y-1/2 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
            style={{
              left: `calc(${(lastPt[0] / W) * 100}% - 2.4rem)`,
              top: `${(lastPt[1] / H) * 100}%`,
              color: tone,
              background: `${tone}26`,
              boxShadow: `inset 0 0 0 1px ${tone}66`,
            }}
          >
            {last?.value ?? 0}
          </div>
        </div>
        <div className="mt-1 flex justify-between font-mono text-[9px] text-ink-mute">
          <span>{fmtShort(win.start)}</span>
          <span>{fmtShort(addDays(win.start, Math.round(win.days / 2)))}</span>
          <span>Today</span>
        </div>
        {drift != null && (
          <p className="mt-1 text-[10.5px] text-ink-mute">
            Average score {drift < 0 ? 'fell' : drift > 0 ? 'rose' : 'held at'}{' '}
            <span style={{ color: tone }} className="font-semibold">
              {Math.abs(drift) || last?.value}
            </span>{' '}
            over the window — a falling index means a deteriorating picture.
          </p>
        )}
      </div>
    </section>
  )
}
