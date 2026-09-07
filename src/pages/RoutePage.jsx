import { Navigation, Info, PanelLeftClose, PanelLeft, PanelRightClose, PanelRight, FileText } from 'lucide-react'
import PageShell from '../components/PageShell'
import RouteMap, { ROUTE_COLORS } from '../components/RouteMap'
import RouteControls from '../components/RouteControls'
import RouteCard from '../components/RouteCard'
import { useStore, selectBriefReady } from '../store/useStore'
import { fmtShort } from '../lib/time'

function PanelToggle({ on, onClick, label, iconOn: IconOn, iconOff: IconOff }) {
  return (
    <button
      onClick={onClick}
      title={`${on ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
      className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[12px] font-semibold transition-colors ${
        on ? 'border-brand/40 bg-brand/10 text-brand' : 'border-hair bg-panel-2/50 text-ink-mute hover:text-ink-dim'
      }`}
    >
      {on ? <IconOn className="h-4 w-4" /> : <IconOff className="h-4 w-4" />}
      <span className="hidden sm:block">{label}</span>
    </button>
  )
}

/** The recommendations, one tab per candidate route. */
function RoutingPanel({ result, onHide }) {
  const route = useStore((s) => s.route)
  const setRoute = useStore((s) => s.setRoute)
  const routes = result?.routes || []
  const activeId = routes.some((r) => r.id === route.selectedRouteId) ? route.selectedRouteId : routes[0]?.id
  const activeIndex = routes.findIndex((r) => r.id === activeId)
  const active = routes[activeIndex]

  return (
    <aside className="flex min-h-0 flex-col rounded-2xl border border-hair/70 bg-panel/70 xl:max-h-[calc(100dvh-232px)]">
      <div className="flex items-center gap-2 border-b border-hair/60 px-4 py-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-mute">Recommended routing</span>
        <button
          onClick={onHide}
          title="Hide recommended routing"
          className="ml-auto rounded-lg p-1 text-ink-mute transition-colors hover:bg-white/5 hover:text-ink"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      {routes.length === 0 ? (
        <div className="px-4 py-6 text-[12.5px] leading-relaxed text-ink-mute">
          No routing yet. Set the voyage and run the analysis — each candidate track gets its own tab here.
        </div>
      ) : (
        <>
          <div className="px-4 pt-3 text-[11px] text-ink-mute">
            {[result.from.label, ...(result.vias || []).map((v) => v.label), result.to.label].join(' → ')}
          </div>

          {/* one tab per route */}
          <div className="scroll-thin flex gap-1 overflow-x-auto px-3 pb-2 pt-2">
            {routes.map((r, i) => {
              const color = ROUTE_COLORS[i % ROUTE_COLORS.length]
              const on = r.id === activeId
              return (
                <button
                  key={r.id}
                  onClick={() => setRoute({ selectedRouteId: r.id })}
                  onMouseEnter={() => setRoute({ hoverRouteId: r.id })}
                  onMouseLeave={() => setRoute({ hoverRouteId: null })}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                    on ? 'border-brand/40 bg-brand/10 text-ink' : 'border-hair bg-panel-2/40 text-ink-mute hover:text-ink-dim'
                  }`}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: color, boxShadow: on ? `0 0 8px ${color}` : 'none' }}
                  />
                  Route {i + 1}
                </button>
              )
            })}
          </div>

          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            {active && <RouteCard key={active.id} route={active} index={activeIndex} bare />}
          </div>
        </>
      )}
    </aside>
  )
}

export default function RoutePage() {
  const route = useStore((s) => s.route)
  const asOf = useStore((s) => s.asOf)
  const showVoyage = useStore((s) => s.routePanels.voyage)
  const showRouting = useStore((s) => s.routePanels.routing)
  const toggleRoutePanel = useStore((s) => s.toggleRoutePanel)
  const openBrief = useStore((s) => s.openExecutiveBrief)
  const hasBrief = useStore((s) => !!s.brief.doc)
  const briefReady = useStore(selectBriefReady)
  // The button goes live with the analysis, and stays live afterwards so a
  // brief already written is never stranded behind a cleared result.
  const canBrief = briefReady || hasBrief
  const result = route.result

  const cols =
    showVoyage && showRouting
      ? 'xl:grid-cols-[380px_minmax(0,1fr)_380px]'
      : showVoyage
        ? 'xl:grid-cols-[380px_minmax(0,1fr)]'
        : showRouting
          ? 'xl:grid-cols-[minmax(0,1fr)_380px]'
          : 'xl:grid-cols-1'

  return (
    <PageShell
      title="Route Analysis"
      subtitle={`Threat-weighted voyage planning · risk picture as of ${fmtShort(asOf)}`}
      icon={Navigation}
      actions={
        <>
          <button
            onClick={openBrief}
            disabled={!canBrief}
            title={
              briefReady
                ? hasBrief
                  ? 'Open the executive brief written from this analysis'
                  : 'Generate an executive brief from this analysis'
                : hasBrief
                  ? 'Open the brief written earlier — re-run the analysis to refresh its figures'
                  : 'Run the route analysis first — the brief is written from its output'
            }
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] font-bold transition-all ${
              canBrief
                ? 'bg-gradient-to-b from-brand to-brand-deep text-[#04121e] shadow-glow hover:brightness-110'
                : 'cursor-not-allowed border border-hair bg-panel-2/40 text-ink-mute'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:block">Executive Brief</span>
          </button>
          <PanelToggle
            on={showVoyage}
            onClick={() => toggleRoutePanel('voyage')}
            label="Voyage"
            iconOn={PanelLeftClose}
            iconOff={PanelLeft}
          />
          <PanelToggle
            on={showRouting}
            onClick={() => toggleRoutePanel('routing')}
            label="Routing"
            iconOn={PanelRightClose}
            iconOff={PanelRight}
          />
        </>
      }
    >
      <div className={`grid gap-3 ${cols}`}>
        {/* controls */}
        {showVoyage && <RouteControls onHide={() => toggleRoutePanel('voyage')} />}

        {/* map */}
        <div className="min-w-0 space-y-3">
          <div className="h-[420px] xl:h-[calc(100dvh-232px)] xl:min-h-[440px]">
            <RouteMap />
          </div>

          {result?.error && (
            <div className="rounded-2xl border border-critical/30 bg-critical/5 p-4 text-[12.5px] text-ink-dim">
              {result.error}
            </div>
          )}

          {!result && !route.computing && (
            <div className="flex items-start gap-3 rounded-2xl border border-hair/70 bg-panel/70 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20">
                <Info className="h-4 w-4" />
              </span>
              <div className="text-[12.5px] leading-relaxed text-ink-dim">
                <p className="font-semibold text-ink">Pick two points and run the analysis.</p>
                <p className="mt-1 text-ink-mute">
                  Routes are searched over a navigable graph of open ocean, canals and straits, weighted by the threat
                  picture on the selected date. Vessel dimensions decide which passages are even available — a 22.5 m
                  draught keeps a VLCC out of Suez, and a 61.5 m beam keeps a ULCV out of Panama.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* recommendations */}
        {showRouting && <RoutingPanel result={result} onHide={() => toggleRoutePanel('routing')} />}
      </div>
    </PageShell>
  )
}
