# ORBIT — Global Threat Intelligence (PWA)

An installable Progressive Web App for mapping worldwide risk hotspots. The main
view is a dark, interactive 2D world map where locations are plotted by severity;
click any point for a full risk breakdown. Risk data is derived from **documents
you upload** — the app analyzes each brief, extracts locations + threat vectors,
and plots them on the map. The visible points can be adjusted by the selected
**date** via a timeline scrubber.

> Design inspired by the reference dashboard provided by the user. Seed data is
> **illustrative / demo** — real assessments come from your uploaded documents.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build + PWA service worker → dist/
npm run preview  # serve the production build
```

## Risk score scale

The risk score is an **inverted 1–100 index**: **1 is the most dangerous, 100 the
safest**, and **1–20 is the high-risk band**. It reads like a league table where
rank 1 is the worst place to be.

| Score | Severity | Likelihood |
| --- | --- | --- |
| 1–20 | Critical | L5 · Almost certain |
| 21–40 | High | L4 · Likely |
| 41–60 | Moderate | L3 · Possible |
| 61–80 | Low | L2 · Unlikely |
| 81–100 | Low | L1 · Rare |

Internally, anything that needs a magnitude (map glow radius, heatmap dot size,
route cost weighting) uses **threat**, the plain 0–100 intensity, where
`threat = 101 - score`. The rule across the codebase: **display and compare with
`score`, do arithmetic with `threat`** (`src/lib/constants.js`).

## Voyage risk assessment

The Route Analysis sidebar is three tabs over one assessment:

- **Route** — origin, destination, and any number of intermediate **stops**.
  Each waypoint is scored from the assessed threat picture (or overridden by
  hand), and the voyage **LIKELIHOOD** is the worst score on the itinerary: a
  voyage is only as safe as its worst call. Stops are routed through — the
  planner searches each leg and stitches them into one track.
- **Vessel** — the ship, plus the **IMPACT** register: every object at stake
  (hull, cargo, crew, charter commitment — entities are user-defined). Each
  carries a money value and a weight; `value × weight` maps to an impact level
  1–5 against configurable thresholds, and a level can be pinned by hand. The
  voyage takes the highest.
- **Risk rating** — `IMPACT × LIKELIHOOD` on a **5 × 5 risk assessment matrix**,
  giving a 1–25 product banded Low / Medium / High / Very High / Extreme, with
  the driving waypoint and the driving exposure named.

## Key features

- **Interactive 2D map** (D3-geo + accurate country geometry) with zoom, pan,
  glowing severity markers, maritime ship markers, animated shipping lanes,
  hover tooltips, and a click-to-open risk detail panel.
- **AI document analysis** — drag & drop PDF / DOCX / TXT / CSV / JSON. Detected
  locations appear on the map with computed risk scores, threat categories, and
  confidence. New locations not already on the map are added automatically.
- **Date-aware risk points** — a timeline scrubber (with Play) drives an
  "as-of" date; each point appears/disappears and its severity scales based on
  when it emerged and how its risk trended. Window presets: 24H / 7D / 30D / 60D.
- **Ship route analysis** — pick two ports (or click anywhere on the water) and
  get several genuinely different routings, each with the case for and against
  it: distance, transit time, bunkers, canal tolls, war-risk premium, and how
  close the track runs to every assessed threat zone. See below.
- **Full workspace** — Dashboard (KPIs + heatmap), Global Map, Route Analysis,
  Risk Feed, Document Library, AI Analysis, Alerts, Reports (printable),
  Settings.
- **PWA** — installable, offline-capable via service worker, responsive down to
  mobile with a bottom tab bar.

## Hybrid AI architecture

The analysis pipeline (`src/lib/analysis.js`) is provider-agnostic:

- **On-device (default):** real text extraction for text formats + a gazetteer
  and threat-lexicon pass that locates and scores risks entirely in the browser.
  No network, fully private.
- **LLM (production):** open **Settings → Analysis Engine**, choose Anthropic
  Claude or OpenAI, and paste an API key. The same document text is sent to the
  provider and the returned JSON is normalized into the identical risk shape —
  nothing else in the app changes.

> The in-browser API-key field keeps the key in memory only (never persisted).
> For production, proxy provider calls through your own backend rather than
> calling them directly from the browser.

## Route analysis

Routing runs entirely in the browser over a navigable graph built from three
pieces:

- **Open ocean** — a 1° water grid with 16-way connectivity. Every link was
  checked against the real coastline when the grid was generated, so no route
  can cut across an isthmus. This matters more than it sounds: at 1°, the
  Caribbean and Pacific cells either side of Panama are neighbours.
- **Lanes** (`src/data/maritime.js`) — canals and straits the grid is too coarse
  to resolve, hand-drawn as polylines. Suez, Panama, Kiel, the Turkish Straits,
  Malacca, Sunda, Lombok, Torres, the Danish Straits and others.
- **Ports** — around 120 of them, joined to the network only where the approach
  stays on water.

Each passage carries its transit rules, so **vessel dimensions decide which
routes exist at all**: a 22.5 m draught keeps a VLCC out of Suez, a 61.5 m beam
keeps a ULCV out of Panama, and a Capesize cannot leave the Baltic. Where a
passage has a size limit, the surrounding open water is *gated* so a route
cannot slip past the limit beside the lane.

Search is Dijkstra over a cost expressed in equivalent nautical miles, which
puts distance, canal tolls, transit delays and threat exposure on one scale.
The **risk posture** slider sets how much extra steaming the operation will
accept to stay clear of trouble. Three passes — balanced, fastest, safest — plus
diversity passes produce the candidate set, which is then deduplicated on the
finished metrics.

Every figure is a planning estimate. Tolls, bunker consumption and war-risk
premiums are modelled from published rates; they are not a voyage calculation.

Regenerate the graph after changing ports, lanes or grid parameters:

```bash
node scripts/build-ocean-grid.mjs
```

Then verify it against known voyages, canal restrictions and enclosed-sea
containment:

```bash
node scripts/check-routes.mjs
```

## Stack

React 18 · Vite 5 · Tailwind CSS 3 · Zustand · d3-geo + world-atlas · lucide-react
· vite-plugin-pwa (Workbox).

## Project layout

```
src/
  lib/         constants, geo projection, time/date math, analysis engine, routing
  data/        seed locations, incidents, documents, sea lanes,
               maritime reference data, generated ocean grid
  store/       Zustand store + selectors (filtering, date interpolation, upload)
  components/  map, route map/controls/cards, panels, charts, UI primitives
  pages/       MapView + Route/Dashboard/Feed/Documents/Analysis/Alerts/Reports/Settings
scripts/       ocean-graph generator + route verification suite
```
