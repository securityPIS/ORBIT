import { TODAY, severityFromScore, scoreFromThreat } from '../lib/constants.js'

// ---------------------------------------------------------------------------
// NOTE: This is ILLUSTRATIVE / DEMO intelligence data for showcasing the app.
// It does not represent real-time assessments. Real analysis is produced when
// documents are uploaded (see src/lib/analysis.js).
// ---------------------------------------------------------------------------

const dref = new Date(TODAY + 'T00:00:00Z')
function daysAgo(n) {
  const d = new Date(dref)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}
function hoursAgo(n) {
  const d = new Date(dref)
  d.setUTCHours(10, 30, 0, 0)
  d.setUTCHours(d.getUTCHours() - n)
  return d.toISOString()
}

// Deterministic sparkline of SCORES. Threat rises gently over the window, so
// on the inverted scale the series FALLS towards the location's true score
// (the "as of today" value), which is what makes the time scrubber meaningful.
function spark(seed, threat) {
  const n = 16
  const out = []
  for (let i = 0; i < n; i++) {
    seed = (seed * 9301 + 49297) % 233280
    const r = seed / 233280
    const t = i / (n - 1)
    const base = threat * (0.62 + 0.38 * t)
    out.push(scoreFromThreat(base + (r - 0.5) * 9))
  }
  out[n - 1] = scoreFromThreat(threat) // pin today to the actual score
  return out
}

function mk(o) {
  const score = scoreFromThreat(o.threat)
  return {
    isMaritime: false,
    count: 1,
    confidence: 78,
    actions: [],
    sources: ['OSINT', 'Government Advisories', 'Partner Feeds'],
    ...o,
    score,
    severity: severityFromScore(score),
    trend: spark(o.id.length * 31 + o.threat, o.threat),
  }
}

export const LOCATIONS = [
  mk({
    id: 'bab-el-mandeb',
    name: 'Bab el-Mandeb Strait',
    region: 'Maritime Corridors',
    place: 'Red Sea Corridor',
    lat: 12.6,
    lng: 43.4,
    primary: 'maritime',
    threat: 90,
    count: 15,
    isMaritime: true,
    confidence: 85,
    firstSeen: daysAgo(58),
    lastSeen: daysAgo(0),
    summary:
      'Elevated threat to commercial shipping due to drone and missile activity, small-boat attacks, and maritime interdictions. Regional tensions remain high across the corridor.',
    categories: [
      { key: 'maritime', level: 'High' },
      { key: 'armed_conflict', level: 'High' },
      { key: 'terrorism', level: 'High' },
      { key: 'political', level: 'Moderate' },
    ],
    actions: [
      'Avoid transit if operationally possible',
      'Implement enhanced vessel protection measures',
      'Monitor advisories and re-route via alternate corridors',
    ],
  }),
  mk({
    id: 'northern-syria',
    name: 'Northern Syria',
    region: 'Middle East',
    place: 'Aleppo · Idlib belt',
    lat: 36.2,
    lng: 37.1,
    primary: 'armed_conflict',
    threat: 86,
    count: 12,
    confidence: 82,
    firstSeen: daysAgo(55),
    lastSeen: daysAgo(0),
    summary:
      'Renewed clashes and shifting front lines with reported airstrikes and displacement. Access constraints and unexploded ordnance elevate risk to personnel and logistics.',
    categories: [
      { key: 'armed_conflict', level: 'Severe' },
      { key: 'terrorism', level: 'High' },
      { key: 'political', level: 'High' },
    ],
    actions: [
      'Defer non-essential travel',
      'Maintain hardened accommodation and comms redundancy',
      'Verify convoy routes against latest control-line reporting',
    ],
  }),
  mk({
    id: 'sudan-khartoum',
    name: 'Khartoum · Sudan',
    region: 'Africa',
    place: 'Greater Khartoum',
    lat: 15.6,
    lng: 32.5,
    primary: 'armed_conflict',
    threat: 84,
    count: 11,
    confidence: 80,
    firstSeen: daysAgo(60),
    lastSeen: daysAgo(1),
    summary:
      'Urban armed conflict with contested districts, disrupted utilities, and constrained humanitarian access. Airport and key routes intermittently unusable.',
    categories: [
      { key: 'armed_conflict', level: 'Severe' },
      { key: 'civil_unrest', level: 'High' },
      { key: 'political', level: 'Severe' },
    ],
    actions: [
      'Shelter in place during active clashes',
      'Pre-position evacuation options and fuel',
      'Coordinate movement with local security liaisons',
    ],
  }),
  mk({
    id: 'sahel-liptako',
    name: 'Liptako-Gourma · Sahel',
    region: 'Africa',
    place: 'Mali–Niger–Burkina tri-border',
    lat: 14.5,
    lng: 1.0,
    primary: 'terrorism',
    threat: 82,
    count: 10,
    confidence: 79,
    firstSeen: daysAgo(57),
    lastSeen: daysAgo(2),
    summary:
      'Persistent extremist activity including IED emplacement, ambushes, and attacks on rural settlements. Overland movement is high-risk without armed escort.',
    categories: [
      { key: 'terrorism', level: 'Severe' },
      { key: 'armed_conflict', level: 'High' },
      { key: 'political', level: 'High' },
    ],
    actions: [
      'Avoid overland travel outside secured perimeters',
      'Use vetted local security providers',
      'Enforce strict route and timing unpredictability',
    ],
  }),
  mk({
    id: 'donbas',
    name: 'Eastern Ukraine',
    region: 'Europe',
    place: 'Donbas front',
    lat: 48.3,
    lng: 37.9,
    primary: 'armed_conflict',
    threat: 88,
    count: 14,
    confidence: 84,
    firstSeen: daysAgo(60),
    lastSeen: daysAgo(0),
    summary:
      'Active hostilities with artillery, drone strikes, and shifting lines of contact. Critical-infrastructure targeting affects power and mobility across the region.',
    categories: [
      { key: 'armed_conflict', level: 'Severe' },
      { key: 'cyber', level: 'High' },
      { key: 'political', level: 'High' },
    ],
    actions: [
      'No travel to conflict-affected oblasts',
      'Maintain shelter and casualty-care readiness',
      'Harden ICS/OT against disruptive cyber activity',
    ],
  }),
  mk({
    id: 'haiti-pap',
    name: 'Port-au-Prince · Haiti',
    region: 'Americas',
    place: 'Ouest Department',
    lat: 18.55,
    lng: -72.34,
    primary: 'civil_unrest',
    threat: 81,
    count: 9,
    confidence: 78,
    firstSeen: daysAgo(52),
    lastSeen: daysAgo(1),
    summary:
      'Gang-controlled districts, roadblocks, and kidnappings disrupt movement. Airport and port access is intermittent; state security presence is limited.',
    categories: [
      { key: 'civil_unrest', level: 'Severe' },
      { key: 'armed_conflict', level: 'High' },
      { key: 'political', level: 'Severe' },
    ],
    actions: [
      'Restrict movement to secured corridors only',
      'Maintain low profile and vary schedules',
      'Keep evacuation triggers and options current',
    ],
  }),
  mk({
    id: 'hormuz',
    name: 'Strait of Hormuz',
    region: 'Maritime Corridors',
    place: 'Persian Gulf gateway',
    lat: 26.6,
    lng: 56.4,
    primary: 'maritime',
    threat: 74,
    count: 6,
    isMaritime: true,
    confidence: 77,
    firstSeen: daysAgo(48),
    lastSeen: daysAgo(2),
    summary:
      'Heightened risk of vessel harassment, seizure, and GPS interference amid regional tensions. Transit windows and escort coordination advised.',
    categories: [
      { key: 'maritime', level: 'High' },
      { key: 'political', level: 'High' },
      { key: 'cyber', level: 'Moderate' },
    ],
    actions: [
      'Coordinate convoy timing with naval advisories',
      'Prepare for GNSS jamming and spoofing',
      'Review flag-state and insurance guidance',
    ],
  }),
  mk({
    id: 'south-china-sea',
    name: 'South China Sea',
    region: 'Asia-Pacific',
    place: 'Spratly approaches',
    lat: 10.8,
    lng: 114.4,
    primary: 'maritime',
    threat: 70,
    count: 7,
    isMaritime: true,
    confidence: 75,
    firstSeen: daysAgo(50),
    lastSeen: daysAgo(3),
    summary:
      'Assertive coast-guard and militia activity near contested features, with standoffs and water-cannon incidents. Elevated risk near resupply routes.',
    categories: [
      { key: 'maritime', level: 'High' },
      { key: 'political', level: 'High' },
    ],
    actions: [
      'Maintain distance from contested features',
      'Log and report shadowing vessels',
      'Coordinate with maritime domain-awareness feeds',
    ],
  }),
  mk({
    id: 'gulf-of-guinea',
    name: 'Gulf of Guinea',
    region: 'Maritime Corridors',
    place: 'Bight of Bonny',
    lat: 3.5,
    lng: 5.5,
    primary: 'maritime',
    threat: 68,
    count: 6,
    isMaritime: true,
    confidence: 74,
    firstSeen: daysAgo(46),
    lastSeen: daysAgo(3),
    summary:
      'Piracy and kidnap-for-ransom risk to vessels and crews, concentrated in offshore anchorages. Under-reporting likely.',
    categories: [
      { key: 'maritime', level: 'High' },
      { key: 'armed_conflict', level: 'Moderate' },
    ],
    actions: [
      'Harden vessels and maintain anti-boarding watch',
      'Avoid drifting near high-incidence anchorages',
      'Register with regional reporting centres',
    ],
  }),
  mk({
    id: 'somalia-mog',
    name: 'Mogadishu · Somalia',
    region: 'Africa',
    place: 'Banaadir',
    lat: 2.05,
    lng: 45.33,
    primary: 'terrorism',
    threat: 76,
    count: 8,
    confidence: 76,
    firstSeen: daysAgo(54),
    lastSeen: daysAgo(2),
    summary:
      'Complex attacks, VBIEDs, and indirect fire threaten fixed sites and movement. Airport corridor remains a focus of security operations.',
    categories: [
      { key: 'terrorism', level: 'Severe' },
      { key: 'armed_conflict', level: 'High' },
      { key: 'political', level: 'High' },
    ],
    actions: [
      'Use armored movement with close protection',
      'Minimize dwell time at predictable locations',
      'Maintain blast-mitigation standoff at sites',
    ],
  }),
  mk({
    id: 'png-highlands',
    name: 'PNG Highlands',
    region: 'Asia-Pacific',
    place: 'Enga · Southern Highlands',
    lat: -5.5,
    lng: 143.7,
    primary: 'civil_unrest',
    threat: 66,
    count: 5,
    confidence: 72,
    firstSeen: daysAgo(40),
    lastSeen: daysAgo(4),
    summary:
      'Inter-communal violence and unrest disrupt roads and services. Rapid escalation possible with limited emergency response coverage.',
    categories: [
      { key: 'civil_unrest', level: 'High' },
      { key: 'political', level: 'High' },
    ],
    actions: [
      'Avoid affected districts and gatherings',
      'Confirm road status before movement',
      'Maintain communications check-in schedule',
    ],
  }),
  mk({
    id: 'lebanon-beirut',
    name: 'Beirut · Lebanon',
    region: 'Middle East',
    place: 'Greater Beirut',
    lat: 33.89,
    lng: 35.5,
    primary: 'political',
    threat: 69,
    count: 6,
    confidence: 74,
    firstSeen: daysAgo(44),
    lastSeen: daysAgo(2),
    summary:
      'Cross-border exchanges and political volatility raise the risk of rapid deterioration. Economic stress fuels sporadic unrest.',
    categories: [
      { key: 'political', level: 'High' },
      { key: 'armed_conflict', level: 'High' },
      { key: 'civil_unrest', level: 'Moderate' },
    ],
    actions: [
      'Monitor border and airspace advisories',
      'Keep go-bags and contingency routes ready',
      'Avoid demonstrations and security cordons',
    ],
  }),
  mk({
    id: 'eastern-drc',
    name: 'Eastern DRC',
    region: 'Africa',
    place: 'North Kivu · Goma',
    lat: -1.68,
    lng: 29.23,
    primary: 'armed_conflict',
    threat: 78,
    count: 8,
    confidence: 76,
    firstSeen: daysAgo(51),
    lastSeen: daysAgo(1),
    summary:
      'Armed-group offensives and displacement near urban centres. Volatile front lines and roadblocks constrain humanitarian and commercial movement.',
    categories: [
      { key: 'armed_conflict', level: 'Severe' },
      { key: 'civil_unrest', level: 'High' },
      { key: 'political', level: 'High' },
    ],
    actions: [
      'Suspend non-essential field movement',
      'Verify front-line positions daily',
      'Coordinate with humanitarian security cells',
    ],
  }),
  mk({
    id: 'myanmar-rakhine',
    name: 'Rakhine · Myanmar',
    region: 'Asia-Pacific',
    place: 'Western Myanmar',
    lat: 20.15,
    lng: 93.0,
    primary: 'armed_conflict',
    threat: 71,
    count: 6,
    confidence: 71,
    firstSeen: daysAgo(47),
    lastSeen: daysAgo(3),
    summary:
      'Intensifying clashes and access restrictions with communications blackouts. Movement and resupply are highly constrained.',
    categories: [
      { key: 'armed_conflict', level: 'High' },
      { key: 'political', level: 'High' },
      { key: 'civil_unrest', level: 'Moderate' },
    ],
    actions: [
      'Avoid contested townships',
      'Plan for comms and banking disruption',
      'Maintain conservative movement posture',
    ],
  }),
  mk({
    id: 'taiwan-strait',
    name: 'Taiwan Strait',
    region: 'Asia-Pacific',
    place: 'Cross-strait',
    lat: 24.5,
    lng: 119.6,
    primary: 'political',
    threat: 58,
    count: 4,
    isMaritime: true,
    confidence: 70,
    firstSeen: daysAgo(38),
    lastSeen: daysAgo(4),
    summary:
      'Periodic military activity and airspace incursions raise tail-risk to shipping and aviation. Baseline commercial operations continue.',
    categories: [
      { key: 'political', level: 'High' },
      { key: 'maritime', level: 'Moderate' },
      { key: 'cyber', level: 'Moderate' },
    ],
    actions: [
      'Track NOTAMs and maritime warnings',
      'Build schedule buffers for disruption',
      'Review continuity and rerouting plans',
    ],
  }),
  mk({
    id: 'baltic-cables',
    name: 'Baltic Sea',
    region: 'Europe',
    place: 'Subsea infrastructure',
    lat: 58.8,
    lng: 20.0,
    primary: 'cyber',
    threat: 52,
    count: 3,
    isMaritime: true,
    confidence: 68,
    firstSeen: daysAgo(35),
    lastSeen: daysAgo(5),
    summary:
      'Suspected interference with undersea cables and pipelines, plus GNSS anomalies. Hybrid-threat activity raises infrastructure risk.',
    categories: [
      { key: 'cyber', level: 'High' },
      { key: 'maritime', level: 'Moderate' },
      { key: 'political', level: 'Moderate' },
    ],
    actions: [
      'Increase subsea-asset monitoring',
      'Prepare for navigation-signal degradation',
      'Review redundancy for critical links',
    ],
  }),
  mk({
    id: 'colombia-catatumbo',
    name: 'Catatumbo · Colombia',
    region: 'Americas',
    place: 'Norte de Santander',
    lat: 8.7,
    lng: -72.9,
    primary: 'armed_conflict',
    threat: 63,
    count: 5,
    confidence: 71,
    firstSeen: daysAgo(43),
    lastSeen: daysAgo(3),
    summary:
      'Armed-group competition drives displacement, extortion, and roadblocks in border areas. Kidnap risk elevated off main routes.',
    categories: [
      { key: 'armed_conflict', level: 'High' },
      { key: 'civil_unrest', level: 'Moderate' },
      { key: 'political', level: 'Moderate' },
    ],
    actions: [
      'Avoid rural border movement',
      'Use vetted transport and local guidance',
      'Maintain proof-of-life and duress protocols',
    ],
  }),
  mk({
    id: 'malacca',
    name: 'Strait of Malacca',
    region: 'Maritime Corridors',
    place: 'Singapore approaches',
    lat: 2.5,
    lng: 101.3,
    primary: 'maritime',
    threat: 46,
    count: 4,
    isMaritime: true,
    confidence: 69,
    firstSeen: daysAgo(30),
    lastSeen: daysAgo(4),
    summary:
      'Opportunistic boardings and petty theft in anchorages persist. Overall transit risk moderate with dense traffic and patrol coverage.',
    categories: [
      { key: 'maritime', level: 'Moderate' },
      { key: 'civil_unrest', level: 'Low' },
    ],
    actions: [
      'Maintain anti-theft watch at anchorage',
      'Secure stores and access points',
      'Report incidents to regional centres',
    ],
  }),
  mk({
    id: 'caracas',
    name: 'Caracas · Venezuela',
    region: 'Americas',
    place: 'Capital District',
    lat: 10.49,
    lng: -66.9,
    primary: 'civil_unrest',
    threat: 55,
    count: 4,
    confidence: 68,
    firstSeen: daysAgo(33),
    lastSeen: daysAgo(5),
    summary:
      'Political tension and economic strain drive intermittent unrest and crime. Utility and fuel disruptions affect movement.',
    categories: [
      { key: 'civil_unrest', level: 'Moderate' },
      { key: 'political', level: 'High' },
    ],
    actions: [
      'Avoid protests and flashpoints',
      'Limit visible valuables and cash',
      'Keep fuel and comms contingencies',
    ],
  }),
  mk({
    id: 'cape-route',
    name: 'Cape of Good Hope',
    region: 'Maritime Corridors',
    place: 'Southern Africa route',
    lat: -34.4,
    lng: 19.0,
    primary: 'maritime',
    threat: 28,
    count: 2,
    isMaritime: true,
    confidence: 66,
    firstSeen: daysAgo(26),
    lastSeen: daysAgo(6),
    summary:
      'Weather-driven routing pressure as vessels divert around the Cape. Security risk low; sea-state and congestion are the main factors.',
    categories: [
      { key: 'maritime', level: 'Low' },
      { key: 'political', level: 'Low' },
    ],
    actions: [
      'Plan for weather-related delays',
      'Confirm bunkering and provisioning',
      'Monitor congestion at diversion ports',
    ],
  }),
]

// Maritime sea lanes drawn as arcs on the map (chokepoint → chokepoint).
export const SEA_LANES = [
  ['gulf-of-guinea', 'bab-el-mandeb'],
  ['bab-el-mandeb', 'hormuz'],
  ['hormuz', 'malacca'],
  ['malacca', 'south-china-sea'],
  ['bab-el-mandeb', 'cape-route'],
  ['cape-route', 'colombia-catatumbo'],
  ['baltic-cables', 'gulf-of-guinea'],
]

const CAT_LABEL = {
  armed_conflict: 'Armed Conflict',
  terrorism: 'Terrorism',
  maritime: 'Maritime Security',
  political: 'Political Instability',
  civil_unrest: 'Civil Unrest',
  cyber: 'Cyber Threats',
}

export const INCIDENTS = [
  {
    id: 'inc-1',
    locationId: 'bab-el-mandeb',
    severity: 'critical',
    category: 'maritime',
    title: 'Missile activity near commercial vessel',
    place: 'Bab el-Mandeb Strait',
    time: hoursAgo(2),
    description: 'Explosion reported near a merchant vessel. No casualties. Investigation ongoing.',
  },
  {
    id: 'inc-2',
    locationId: 'northern-syria',
    severity: 'critical',
    category: 'armed_conflict',
    title: 'Front-line clashes reported',
    place: 'Aleppo governorate',
    time: hoursAgo(6),
    description: 'Exchanges of fire and airstrikes reported along contested lines; displacement noted.',
  },
  {
    id: 'inc-3',
    locationId: 'donbas',
    severity: 'critical',
    category: 'armed_conflict',
    title: 'Infrastructure strike disrupts power',
    place: 'Donetsk oblast',
    time: hoursAgo(9),
    description: 'Strikes on energy infrastructure caused localized outages affecting mobility.',
  },
  {
    id: 'inc-4',
    locationId: 'haiti-pap',
    severity: 'high',
    category: 'civil_unrest',
    title: 'Roadblocks near port district',
    place: 'Port-au-Prince',
    time: hoursAgo(14),
    description: 'Armed roadblocks disrupted access routes; movement suspended in several districts.',
  },
  {
    id: 'inc-5',
    locationId: 'sahel-liptako',
    severity: 'high',
    category: 'terrorism',
    title: 'IED strike on rural convoy',
    place: 'Tri-border area',
    time: hoursAgo(20),
    description: 'Improvised device targeted a supply convoy on an unsecured route.',
  },
  {
    id: 'inc-6',
    locationId: 'gulf-of-guinea',
    severity: 'high',
    category: 'maritime',
    title: 'Attempted boarding at anchorage',
    place: 'Bight of Bonny',
    time: hoursAgo(28),
    description: 'Crew repelled an attempted boarding; vessel proceeded to a safer standoff.',
  },
  {
    id: 'inc-7',
    locationId: 'sudan-khartoum',
    severity: 'critical',
    category: 'armed_conflict',
    title: 'Contested districts, utilities down',
    place: 'Greater Khartoum',
    time: hoursAgo(33),
    description: 'Clashes across districts with sustained power and water disruption.',
  },
  {
    id: 'inc-8',
    locationId: 'hormuz',
    severity: 'high',
    category: 'maritime',
    title: 'GNSS interference reported',
    place: 'Strait of Hormuz',
    time: hoursAgo(40),
    description: 'Multiple vessels reported navigation-signal anomalies during transit.',
  },
  {
    id: 'inc-9',
    locationId: 'somalia-mog',
    severity: 'high',
    category: 'terrorism',
    title: 'Complex attack near fixed site',
    place: 'Mogadishu',
    time: hoursAgo(52),
    description: 'Security forces responded to a complex attack; area cordoned for hours.',
  },
  {
    id: 'inc-10',
    locationId: 'south-china-sea',
    severity: 'high',
    category: 'maritime',
    title: 'Standoff near contested feature',
    place: 'Spratly approaches',
    time: hoursAgo(66),
    description: 'Coast-guard shadowing and water-cannon activity near a resupply route.',
  },
]

export function incidentCategoryLabel(cat) {
  return CAT_LABEL[cat] ?? cat
}

// Pre-seeded documents (demo library). Uploaded docs are added on top of these.
export const SEED_DOCUMENTS = [
  {
    id: 'doc-seed-1',
    name: 'MENA_Security_Brief_Jul12.pdf',
    kind: 'pdf',
    status: 'analyzed',
    uploadedAt: hoursAgo(2),
    size: 2_180_000,
    contributes: ['bab-el-mandeb', 'northern-syria', 'lebanon-beirut', 'hormuz'],
    summary:
      'Regional MENA assessment: maritime threat in the Red Sea corridor, front-line volatility in northern Syria, and elevated cross-border risk in the Levant.',
    seed: true,
  },
  {
    id: 'doc-seed-2',
    name: 'Maritime_Threat_Update_0712.docx',
    kind: 'docx',
    status: 'processing',
    uploadedAt: hoursAgo(5),
    size: 940_000,
    contributes: ['gulf-of-guinea', 'hormuz', 'malacca', 'south-china-sea'],
    summary:
      'Chokepoint-by-chokepoint maritime update covering piracy in the Gulf of Guinea and navigation interference near Hormuz.',
    seed: true,
  },
  {
    id: 'doc-seed-3',
    name: 'Sahel_SitRep_Week28.pdf',
    kind: 'pdf',
    status: 'analyzed',
    uploadedAt: hoursAgo(8),
    size: 1_560_000,
    contributes: ['sahel-liptako', 'somalia-mog'],
    summary:
      'Sahel situation report: extremist activity, IED trends, and constrained overland movement across the tri-border area.',
    seed: true,
  },
  {
    id: 'doc-seed-4',
    name: 'Cyber_Threat_Advisory_Jul11.pdf',
    kind: 'pdf',
    status: 'analyzed',
    uploadedAt: hoursAgo(26),
    size: 780_000,
    contributes: ['baltic-cables', 'donbas'],
    summary:
      'Hybrid-threat advisory: suspected subsea-cable interference in the Baltic and disruptive activity against critical infrastructure.',
    seed: true,
  },
  {
    id: 'doc-seed-5',
    name: 'Americas_Instability_Digest.pdf',
    kind: 'pdf',
    status: 'analyzed',
    uploadedAt: hoursAgo(30),
    size: 1_120_000,
    contributes: ['haiti-pap', 'caracas', 'colombia-catatumbo'],
    summary:
      'Americas digest: gang-driven insecurity in Haiti, unrest risk in Venezuela, and armed-group competition in the Colombian border zone.',
    seed: true,
  },
]

export const EMERGING = [
  { locationId: 'northern-syria', label: 'Escalation in Northern Syria', ago: '2h ago', severity: 'critical' },
  { locationId: 'png-highlands', label: 'Civil unrest in PNG Highlands', ago: '5h ago', severity: 'high' },
  { locationId: 'gulf-of-guinea', label: 'Piracy risk in Gulf of Guinea', ago: '9h ago', severity: 'high' },
  { locationId: 'baltic-cables', label: 'Subsea interference in the Baltic', ago: '1d ago', severity: 'moderate' },
]
