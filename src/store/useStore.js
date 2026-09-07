import { create } from 'zustand'
import { LOCATIONS, SEED_DOCUMENTS, INCIDENTS, EMERGING } from '../data/seed'
import { analyzeDocument, kindFromName } from '../lib/analysis'
import { severityFromScore, threatFromScore, scoreFromThreat, SEVERITY } from '../lib/constants'
import { TODAY } from '../lib/constants'
import { addDays, dayKey, scoreAsOf, PRESETS, toDate } from '../lib/time'
import { planVoyage } from '../lib/routing'
import { computeImpact, computeLikelihood, computeRating, DEFAULT_IMPACT_THRESHOLDS } from '../lib/riskRating'
import { VESSEL_PRESETS, DEFAULT_BUNKER_USD, portById } from '../data/maritime'
import { buildExecutiveBrief, briefSourceKey, newBlock } from '../lib/executiveBrief'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const uid = (p) => p + Math.random().toString(36).slice(2, 9)
const NOW_ISO = TODAY + 'T10:29:00Z'

/** Series of SCORES (inverted index) trending towards the location's score. */
function spark(seed, threat) {
  const n = 12
  const out = []
  for (let i = 0; i < n; i++) {
    seed = (seed * 9301 + 49297) % 233280
    const t = i / (n - 1)
    const base = threat * (0.62 + 0.38 * t)
    out.push(scoreFromThreat(base + (seed / 233280 - 0.5) * 9))
  }
  out[n - 1] = scoreFromThreat(threat)
  return out
}

const ACTION_TEMPLATES = {
  armed_conflict: ['Defer non-essential travel to affected areas', 'Maintain shelter and casualty-care readiness', 'Verify routes against latest control-line reporting'],
  terrorism: ['Avoid predictable patterns and crowded sites', 'Use vetted security and armored movement', 'Maintain blast standoff at fixed locations'],
  maritime: ['Coordinate transit timing with advisories', 'Implement enhanced vessel protection', 'Prepare for navigation-signal interference'],
  political: ['Monitor advisories for rapid deterioration', 'Keep contingency routes and go-bags ready', 'Avoid demonstrations and security cordons'],
  civil_unrest: ['Avoid protests and flashpoints', 'Restrict movement to secured corridors', 'Maintain communications check-in schedule'],
  cyber: ['Increase monitoring of critical assets', 'Prepare for signal and service disruption', 'Review redundancy for critical links'],
}

function buildDynamicLocation(r, doc) {
  const cats = r.categories?.length ? r.categories : [{ key: r.primary, level: 'High' }]
  const threat = r.threat ?? threatFromScore(r.score)
  return {
    id: r.key,
    name: r.name,
    region: r.region,
    place: r.region,
    lat: r.lat,
    lng: r.lng,
    primary: r.primary,
    threat,
    score: r.score,
    severity: severityFromScore(r.score),
    count: Math.max(1, r.mentions || 1),
    isMaritime: !!r.maritime,
    confidence: 72,
    firstSeen: dayKey(doc.uploadedAt),
    lastSeen: dayKey(doc.uploadedAt),
    summary: r.snippet || `Risk detected via uploaded document "${doc.name}". Assessed ${severityFromScore(r.score)} based on reported activity.`,
    categories: cats,
    actions: ACTION_TEMPLATES[r.primary] || ACTION_TEMPLATES.political,
    sources: ['Uploaded Document'],
    trend: spark(r.name.length * 13 + threat, threat),
    contributingDocs: [doc.id],
    isDynamic: true,
  }
}

export const useStore = create((set, get) => ({
  view: 'map',
  sidebarOpen: true,
  locations: LOCATIONS.map((l) => ({ ...l })),
  documents: SEED_DOCUMENTS.map((d) => ({ ...d })),
  incidents: INCIDENTS.map((i) => ({ ...i })),
  emerging: EMERGING,

  selectedId: 'bab-el-mandeb',
  hoverId: null,
  search: '',

  /** Document expanded in the library — set from anywhere that links to a source. */
  openDocId: null,

  filters: { region: 'All Regions', category: 'all', severity: 'all' },
  preset: '30D',
  asOf: TODAY,
  autoRefresh: true,

  settings: { provider: 'offline', apiKey: '', model: '', autoRefresh: true },

  ingesting: false,
  toasts: [],

  // --- route planner ---
  route: {
    origin: { portId: 'idjkt' },
    destination: { portId: 'nlrtm' },
    /** Intermediate calls, in order. Each carries an optional manual score. */
    stops: [],
    vesselId: 'panamax-container',
    speed: null, // null = the preset's service speed
    bunkerUsd: DEFAULT_BUNKER_USD,
    riskAversion: 0.5,
    /** 'origin' | 'destination' | 'stop:<id>' while the user clicks the map */
    picking: null,
    result: null,
    computing: false,
    selectedRouteId: null,
    hoverRouteId: null,
    /** What is exposed on this voyage — drives the IMPACT axis. */
    impactEntities: [
      { id: 'imp-hull', label: 'Hull & machinery', category: 'Vessel', value: 48_000_000, weight: 4, manualLevel: null },
      { id: 'imp-cargo', label: 'Containerised cargo', category: 'Cargo', value: 22_000_000, weight: 3, manualLevel: null },
      { id: 'imp-crew', label: 'Crew of 22', category: 'Crew', value: 0, weight: 5, manualLevel: 5 },
    ],
    /** Weighted-USD lower bounds for impact levels 2–5. */
    impactThresholds: [...DEFAULT_IMPACT_THRESHOLDS],
    /** Which panel tab is on screen: 'rating' | 'route' | 'vessel'. */
    tab: 'route',
  },

  /** Which side panels the route page keeps on screen. */
  routePanels: { voyage: true, routing: true },
  toggleRoutePanel: (key) => set((s) => ({ routePanels: { ...s.routePanels, [key]: !s.routePanels[key] } })),

  /**
   * The working executive brief. One document at a time: it is generated from a
   * finished analysis and then edited in place, so edits survive navigating away
   * and back. `sourceKey` fingerprints the analysis it was written from, which
   * is how the page knows to offer a regeneration once the voyage moves on.
   */
  brief: { doc: null, sourceKey: null },

  // --- navigation & selection ---
  setView: (view) => set({ view }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  select: (id) => set({ selectedId: id }),
  clearSelection: () => set({ selectedId: null }),
  setHover: (id) => set({ hoverId: id }),
  focusLocation: (id) => set({ selectedId: id, view: 'map' }),
  setOpenDoc: (id) => set({ openDocId: id }),
  /** Jumps to the library with the document already expanded. */
  openDocument: (id) => set({ view: 'documents', openDocId: id }),

  setSearch: (search) => set({ search }),
  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
  setPreset: (preset) => set({ preset, asOf: TODAY }),
  setAsOf: (asOf) => set({ asOf }),
  toggleAutoRefresh: () => set((s) => ({ autoRefresh: !s.autoRefresh })),
  setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

  setRoute: (patch) => set((s) => ({ route: { ...s.route, ...patch } })),

  /** Sets one endpoint. Clears any pending map-pick and the stale result. */
  setRouteEndpoint: (which, endpoint) =>
    set((s) => ({ route: { ...s.route, [which]: endpoint, picking: null, result: null, selectedRouteId: null } })),

  swapRouteEndpoints: () =>
    set((s) => ({
      route: {
        ...s.route,
        origin: s.route.destination,
        destination: s.route.origin,
        stops: [...s.route.stops].reverse(),
        result: null,
        selectedRouteId: null,
      },
    })),

  // --- intermediate calls -------------------------------------------------

  /** Appends a stop. Left unset so the user picks the port or map position. */
  addRouteStop: (endpoint = null) =>
    set((s) => ({
      route: {
        ...s.route,
        stops: [...s.route.stops, { id: uid('stop-'), manualScore: null, ...(endpoint || {}) }],
        result: null,
        selectedRouteId: null,
      },
    })),

  updateRouteStop: (id, patch) =>
    set((s) => ({
      route: {
        ...s.route,
        stops: s.route.stops.map((st) => (st.id === id ? { ...st, ...patch } : st)),
        // A manual score only changes the rating, not the geometry, so the
        // computed routing stays valid.
        result: 'portId' in patch || 'lat' in patch ? null : s.route.result,
        picking: 'portId' in patch || 'lat' in patch ? null : s.route.picking,
      },
    })),

  removeRouteStop: (id) =>
    set((s) => ({
      route: { ...s.route, stops: s.route.stops.filter((st) => st.id !== id), result: null, selectedRouteId: null },
    })),

  /** Moves a stop one place up (dir -1) or down (dir +1) the itinerary. */
  moveRouteStop: (id, dir) =>
    set((s) => {
      const stops = [...s.route.stops]
      const i = stops.findIndex((st) => st.id === id)
      const j = i + dir
      if (i === -1 || j < 0 || j >= stops.length) return {}
      ;[stops[i], stops[j]] = [stops[j], stops[i]]
      return { route: { ...s.route, stops, result: null, selectedRouteId: null } }
    }),

  // --- impact register ----------------------------------------------------

  addImpactEntity: (entity = {}) =>
    set((s) => ({
      route: {
        ...s.route,
        impactEntities: [
          ...s.route.impactEntities,
          { id: uid('imp-'), label: '', category: 'Vessel', value: 0, weight: 3, manualLevel: null, ...entity },
        ],
      },
    })),

  updateImpactEntity: (id, patch) =>
    set((s) => ({
      route: {
        ...s.route,
        impactEntities: s.route.impactEntities.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      },
    })),

  removeImpactEntity: (id) =>
    set((s) => ({ route: { ...s.route, impactEntities: s.route.impactEntities.filter((e) => e.id !== id) } })),

  setImpactThresholds: (thresholds) => set((s) => ({ route: { ...s.route, impactThresholds: thresholds } })),

  setRouteTab: (tab) => set((s) => ({ route: { ...s.route, tab } })),

  /**
   * Plans the voyage against the risk picture for the currently selected date.
   * Yields a frame first so the button can show its pending state — the search
   * itself is synchronous and blocks the main thread for a few tens of ms.
   */
  computeRoutes: async () => {
    const state = get()
    const { route, locations, asOf } = state
    const vessel = VESSEL_PRESETS.find((v) => v.id === route.vesselId) || VESSEL_PRESETS[0]
    set({ route: { ...route, computing: true } })
    await new Promise((r) => setTimeout(r, 30))

    const dated = locations.map((l) => annotate(l, asOf)).filter(Boolean)
    const waypoints = [route.origin, ...route.stops.filter(hasPosition), route.destination]
    let result
    try {
      result = planVoyage({
        waypoints,
        vessel,
        locations: dated,
        options: {
          riskAversion: route.riskAversion,
          bunkerUsd: route.bunkerUsd,
          speed: route.speed || vessel.speed,
          riskKey: `${asOf}:${dated.length}`,
        },
      })
    } catch (e) {
      result = { error: e?.message || String(e) }
    }

    set((s) => ({
      route: { ...s.route, computing: false, result, selectedRouteId: result.routes?.[0]?.id ?? null },
    }))
    if (result.error) {
      get().addToast({ kind: 'error', title: 'No route found', body: result.error })
    } else {
      const via = result.vias?.length ? ` via ${result.vias.length} call${result.vias.length === 1 ? '' : 's'}` : ''
      get().addToast({
        kind: 'success',
        title: `${result.routes.length} route${result.routes.length === 1 ? '' : 's'} analyzed`,
        body: `${result.from.label} → ${result.to.label}${via} for a ${vessel.name.split(' · ')[0]}.`,
      })
    }
  },

  // --- executive brief ------------------------------------------------------

  /** Writes a fresh brief from the current analysis and opens it. */
  generateExecutiveBrief: () => {
    const state = get()
    const { route, locations, asOf, incidents, emerging, documents, preset } = state
    const result = route.result
    if (!result || result.error || !result.routes?.length) {
      get().addToast({
        kind: 'error',
        title: 'Nothing to brief yet',
        body: 'Run the route analysis first — the brief is written from its output.',
      })
      return
    }

    const dated = locations.map((l) => annotate(l, asOf)).filter(Boolean)
    const doc = buildExecutiveBrief({
      result,
      assessment: selectRiskAssessment(state),
      route,
      dated,
      incidents,
      emerging,
      documents,
      asOf,
      preset,
    })

    set({
      brief: { doc, sourceKey: briefSourceKey({ route, result, asOf }) },
      view: 'brief',
    })
    get().addToast({
      kind: 'success',
      title: 'Executive brief generated',
      body: `${doc.sections.length} sections written from ${result.routes.length} candidate routing${result.routes.length === 1 ? '' : 's'}. Every line on the page is editable.`,
    })
  },

  /** Opens the brief, writing one the first time it is asked for. */
  openExecutiveBrief: () => {
    if (get().brief.doc) set({ view: 'brief' })
    else get().generateExecutiveBrief()
  },

  updateBriefDoc: (patch) =>
    set((s) => (s.brief.doc ? { brief: { ...s.brief, doc: { ...s.brief.doc, ...patch } } } : {})),

  updateBriefSection: (sectionId, patch) =>
    set((s) => mapBriefSections(s, (sec) => (sec.id === sectionId ? { ...sec, ...patch } : sec))),

  updateBriefBlock: (sectionId, blockId, patch) =>
    set((s) =>
      mapBriefSections(s, (sec) =>
        sec.id !== sectionId
          ? sec
          : { ...sec, blocks: sec.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)) }
      )
    ),

  /** Inserts a block after `afterBlockId` and returns its id, so the editor can focus it. */
  addBriefBlock: (sectionId, afterBlockId, type = 'paragraph') => {
    const block = newBlock(type)
    set((s) =>
      mapBriefSections(s, (sec) => {
        if (sec.id !== sectionId) return sec
        const i = sec.blocks.findIndex((b) => b.id === afterBlockId)
        const blocks = [...sec.blocks]
        blocks.splice(i < 0 ? blocks.length : i + 1, 0, block)
        return { ...sec, blocks }
      })
    )
    return block.id
  },

  removeBriefBlock: (sectionId, blockId) =>
    set((s) =>
      mapBriefSections(s, (sec) =>
        sec.id !== sectionId ? sec : { ...sec, blocks: sec.blocks.filter((b) => b.id !== blockId) }
      )
    ),

  addToast: (t) => {
    const id = uid('t-')
    set((s) => ({ toasts: [...s.toasts, { id, ...t }] }))
    setTimeout(() => get().removeToast(id), t.duration || 4200)
    return id
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

  upsertRisks: (risks, doc) =>
    set((state) => {
      const map = new Map(state.locations.map((l) => [l.id, l]))
      const nowKey = dayKey(doc.uploadedAt)
      for (const r of risks) {
        const existing = map.get(r.key)
        if (existing) {
          // Reinforcement is worked in threat space: fresh evidence never makes
          // a place read safer, and each corroboration nudges it up a point.
          const exThreat = existing.threat ?? threatFromScore(existing.score)
          const inThreat = r.threat ?? threatFromScore(r.score)
          const newThreat = Math.min(99, Math.round(Math.max(exThreat, (exThreat + inThreat) / 2) + 1))
          const newScore = scoreFromThreat(newThreat)
          map.set(r.key, {
            ...existing,
            threat: newThreat,
            score: newScore,
            severity: severityFromScore(newScore),
            count: existing.count + Math.max(1, r.mentions || 1),
            lastSeen: nowKey,
            confidence: Math.min(97, (existing.confidence || 74) + 2),
            contributingDocs: [...(existing.contributingDocs || []), doc.id],
          })
        } else {
          map.set(r.key, buildDynamicLocation(r, doc))
        }
      }
      return { locations: Array.from(map.values()) }
    }),

  ingestFiles: async (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return
    set({ ingesting: true })
    const config = get().settings
    let totalRisks = 0

    for (const file of files) {
      const id = uid('doc-')
      const doc = {
        id,
        name: file.name,
        kind: kindFromName(file.name),
        status: 'processing',
        uploadedAt: NOW_ISO,
        size: file.size,
        contributes: [],
        summary: 'Analyzing document…',
      }
      set((s) => ({ documents: [doc, ...s.documents] }))
      await sleep(650 + Math.random() * 700)

      let result
      try {
        result = await analyzeDocument(file, config)
      } catch (e) {
        result = { risks: [], summary: 'Analysis failed: ' + (e?.message || e), confidence: 0, engine: 'error' }
      }

      get().upsertRisks(result.risks, doc)
      totalRisks += result.risks.length
      set((s) => ({
        documents: s.documents.map((d) =>
          d.id === id
            ? {
                ...d,
                status: 'analyzed',
                contributes: result.risks.map((r) => r.key),
                summary: result.summary,
                engine: result.engine,
                wordCount: result.wordCount,
                confidence: result.confidence,
              }
            : d
        ),
      }))
    }

    set({ ingesting: false })
    get().addToast({
      kind: 'success',
      title: `${files.length} document${files.length > 1 ? 's' : ''} analyzed`,
      body: `${totalRisks} risk location${totalRisks === 1 ? '' : 's'} extracted and mapped.`,
    })
  },
}))

// ---- pure selectors -------------------------------------------------------

/** Rewrites every section of the working brief through `fn`. */
function mapBriefSections(state, fn) {
  if (!state.brief.doc) return {}
  return { brief: { ...state.brief, doc: { ...state.brief.doc, sections: state.brief.doc.sections.map(fn) } } }
}

/** An analysis is on screen and produced at least one routing to brief on. */
export function selectBriefReady(state) {
  const r = state.route.result
  return !!(r && !r.error && r.routes?.length)
}

/** The brief no longer describes the analysis currently on screen. */
export function selectBriefStale(state) {
  if (!state.brief.doc || !selectBriefReady(state)) return false
  return state.brief.sourceKey !== briefSourceKey({ route: state.route, result: state.route.result, asOf: state.asOf })
}


export function getWindow(preset) {
  const p = PRESETS.find((x) => x.key === preset) || PRESETS[2]
  return { start: dayKey(addDays(TODAY, -p.days)), end: TODAY, days: p.days }
}

export function annotate(loc, asOf) {
  const live = scoreAsOf(loc, asOf)
  if (live == null) return null
  return { ...loc, liveScore: live, liveThreat: threatFromScore(live), liveSeverity: severityFromScore(live) }
}

export function selectVisible(state) {
  const { locations, filters, asOf } = state
  return locations
    .map((l) => annotate(l, asOf))
    .filter(Boolean)
    .filter((l) => filters.region === 'All Regions' || l.region === filters.region)
    .filter((l) => filters.category === 'all' || l.primary === filters.category || l.categories?.some((c) => c.key === filters.category))
    .filter((l) => filters.severity === 'all' || l.liveSeverity === filters.severity)
    .sort((a, b) => a.liveScore - b.liveScore) // lowest score first — most dangerous
}

// --- voyage risk assessment -------------------------------------------------

/** True once a waypoint has somewhere to be — a port or a picked position. */
export function hasPosition(p) {
  return !!(p && (p.portId || (Number.isFinite(p.lat) && Number.isFinite(p.lng))))
}

/** Resolves a waypoint to a label and coordinates for scoring and display. */
export function waypointGeo(point) {
  if (!point) return null
  if (point.portId) {
    const port = portById(point.portId)
    if (port) return { label: port.name, sub: port.country, lat: port.lat, lng: port.lng }
  }
  if (Number.isFinite(point.lat) && Number.isFinite(point.lng)) {
    return { label: point.label || 'Custom position', sub: 'Picked on map', lat: point.lat, lng: point.lng }
  }
  return null
}

/**
 * The full IMPACT × LIKELIHOOD assessment for the voyage as currently set up.
 * Recomputed from state, so it stays live while the user edits either side —
 * it does not wait for the routing search.
 */
export function selectRiskAssessment(state) {
  const { route, locations, asOf } = state
  const dated = locations.map((l) => annotate(l, asOf)).filter(Boolean)

  const legs = [
    { role: 'origin', ...route.origin },
    ...route.stops.map((s) => ({ role: 'stop', ...s })),
    { role: 'destination', ...route.destination },
  ]

  const waypoints = legs
    .map((p) => {
      const geo = waypointGeo(p)
      return geo ? { ...p, ...geo } : null
    })
    .filter(Boolean)

  const likelihood = computeLikelihood(waypoints, dated)
  const impact = computeImpact(route.impactEntities, route.impactThresholds)
  const rating = computeRating({ impact, likelihood })
  return { impact, likelihood, rating, waypointsSet: waypoints.length, waypointsTotal: legs.length }
}

export function severityMeta(key) {
  return SEVERITY[key] || SEVERITY.low
}

export { toDate }
