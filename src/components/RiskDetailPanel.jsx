import { X, TrendingUp, Gauge, CalendarDays, ArrowRight, Star, FileText } from 'lucide-react'
import { useStore, annotate } from '../store/useStore'
import {
  severityColor,
  CATEGORIES,
  SEVERITY,
  threatFromScore,
  likelihoodFromScore,
  likelihoodMeta,
} from '../lib/constants'
import { fmtRange } from '../lib/time'
import { SeverityBadge, LevelPill, Donut } from './ui'
import CatIcon from './CatIcon'

export default function RiskDetailPanel() {
  const selectedId = useStore((s) => s.selectedId)
  const asOf = useStore((s) => s.asOf)
  const loc = useStore((s) => s.locations.find((l) => l.id === selectedId))
  const clearSelection = useStore((s) => s.clearSelection)
  const setView = useStore((s) => s.setView)
  const documents = useStore((s) => s.documents)
  if (!loc) return null

  const live = annotate(loc, asOf) || loc
  const score = live.liveScore ?? loc.score
  const color = severityColor(live.liveSeverity || loc.severity)
  const contributing = documents.filter((d) => (loc.contributingDocs || []).includes(d.id) || (d.contributes || []).includes(loc.id))

  return (
    <div className="absolute left-3 top-16 z-30 w-[320px] max-w-[calc(100%-1.5rem)] animate-fade-up">
      <div className="max-h-[calc(100%-1rem)] overflow-y-auto rounded-2xl border border-hair bg-panel/95 shadow-2xl backdrop-blur-xl scroll-thin">
        {/* header */}
        <div className="flex items-start gap-2 border-b border-hair/70 p-4 pb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[15px] font-bold text-ink">{loc.name}</h3>
              <Star className="h-3.5 w-3.5 shrink-0 text-ink-mute hover:text-moderate" />
            </div>
            <p className="mt-0.5 text-xs text-ink-mute">{loc.place || loc.region}</p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide"
                style={{ color, background: `${color}1a`, boxShadow: `inset 0 0 0 1px ${color}55` }}
              >
                {(SEVERITY[live.liveSeverity]?.label || 'Risk').toUpperCase()}
                <TrendingUp className="h-3.5 w-3.5" />
              </span>
              <span className="font-mono text-[11px] text-ink-mute">score {score}/100</span>
            </div>
          </div>
          <button onClick={clearSelection} className="rounded-lg p-1 text-ink-mute transition-colors hover:bg-white/5 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {/* summary */}
          <section>
            <SectionLabel>Risk Summary</SectionLabel>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-dim">{loc.summary}</p>
          </section>

          {/* categories */}
          <section>
            <SectionLabel>Key Threat Categories</SectionLabel>
            <ul className="mt-2 space-y-1.5">
              {loc.categories.map((c) => (
                <li key={c.key} className="flex items-center gap-2.5">
                  <span className="grid h-6 w-6 place-items-center rounded-md" style={{ background: `${CATEGORIES[c.key]?.color}18`, color: CATEGORIES[c.key]?.color }}>
                    <CatIcon category={c.key} className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 text-[12.5px] text-ink-dim">{CATEGORIES[c.key]?.label || c.key}</span>
                  <LevelPill level={c.level} />
                </li>
              ))}
            </ul>
          </section>

          {/* risk score */}
          <section className="flex items-center gap-3 rounded-xl border border-hair/70 bg-panel-2/40 p-3">
            {/* The donut fills with DANGER, so a score of 8 reads as a full ring
                rather than an almost-empty one. */}
            <Donut value={threatFromScore(score)} size={52} stroke={6} color={color}>
              <span className="text-[13px] font-bold text-ink">{score}</span>
            </Donut>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
                <Gauge className="h-3.5 w-3.5" style={{ color }} /> Risk Score
              </div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-mute">
                {score} of 100 · <span style={{ color }}>{SEVERITY[live.liveSeverity]?.label}</span> · likelihood L
                {likelihoodFromScore(score)} {likelihoodMeta(likelihoodFromScore(score)).label}. Lower is more dangerous;
                1–20 is the high-risk band.
              </p>
            </div>
          </section>

          {/* date range */}
          <section>
            <SectionLabel>Affected Date Range</SectionLabel>
            <div className="mt-1.5 flex items-center gap-2 text-[12.5px] text-ink-dim">
              <CalendarDays className="h-4 w-4 text-ink-mute" />
              {fmtRange(loc.firstSeen, loc.lastSeen)}
            </div>
          </section>

          {/* actions */}
          <section>
            <SectionLabel>Recommended Actions</SectionLabel>
            <ul className="mt-2 space-y-1.5">
              {loc.actions.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-[12.5px] text-ink-dim">
                  <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-low/15 text-low">
                    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  {a}
                </li>
              ))}
            </ul>
          </section>

          {/* sources */}
          {contributing.length > 0 && (
            <section>
              <SectionLabel>Sourced From</SectionLabel>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {contributing.slice(0, 4).map((d) => (
                  <span key={d.id} className="inline-flex max-w-full items-center gap-1 rounded-md border border-hair bg-panel-2/50 px-1.5 py-1 text-[10.5px] text-ink-dim">
                    <FileText className="h-3 w-3 shrink-0 text-brand" />
                    <span className="truncate">{d.name}</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          <button
            onClick={() => setView('analysis')}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand/30 bg-brand/10 py-2 text-[12.5px] font-semibold text-brand transition-colors hover:bg-brand/20"
          >
            View Full Intelligence <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-mute">{children}</div>
}
