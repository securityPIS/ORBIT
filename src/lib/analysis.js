import { severityFromScore, scoreFromThreat } from './constants'

// ---------------------------------------------------------------------------
// HYBRID ANALYSIS ENGINE
//
//  • Offline demo path (default): extracts text from uploaded files and runs a
//    gazetteer + threat-lexicon pass to locate and score risks. Fully client
//    side, no network, deterministic.
//  • Production path: if a provider + API key are configured in Settings, the
//    same text is sent to an LLM (Claude / OpenAI compatible) and the returned
//    JSON is normalized into the same risk shape. Drop-in — the rest of the app
//    doesn't care which path produced the findings.
// ---------------------------------------------------------------------------

// Gazetteer: place keywords → geo + default primary threat.
// Includes every seeded location (so uploads reinforce them) plus extra
// hotspots so new documents can surface locations not already on the map.
const GAZETTEER = [
  { key: 'bab-el-mandeb', name: 'Bab el-Mandeb Strait', region: 'Maritime Corridors', lat: 12.6, lng: 43.4, primary: 'maritime', maritime: true, aliases: ['bab el-mandeb', 'bab-el-mandeb', 'red sea', 'red sea corridor'] },
  { key: 'hormuz', name: 'Strait of Hormuz', region: 'Maritime Corridors', lat: 26.6, lng: 56.4, primary: 'maritime', maritime: true, aliases: ['hormuz', 'persian gulf', 'arabian gulf'] },
  { key: 'malacca', name: 'Strait of Malacca', region: 'Maritime Corridors', lat: 2.5, lng: 101.3, primary: 'maritime', maritime: true, aliases: ['malacca', 'singapore strait'] },
  { key: 'gulf-of-guinea', name: 'Gulf of Guinea', region: 'Maritime Corridors', lat: 3.5, lng: 5.5, primary: 'maritime', maritime: true, aliases: ['gulf of guinea', 'bight of bonny', 'niger delta waters'] },
  { key: 'south-china-sea', name: 'South China Sea', region: 'Asia-Pacific', lat: 10.8, lng: 114.4, primary: 'maritime', maritime: true, aliases: ['south china sea', 'spratly', 'spratlys', 'scarborough'] },
  { key: 'taiwan-strait', name: 'Taiwan Strait', region: 'Asia-Pacific', lat: 24.5, lng: 119.6, primary: 'political', maritime: true, aliases: ['taiwan strait', 'taiwan', 'cross-strait'] },
  { key: 'baltic-cables', name: 'Baltic Sea', region: 'Europe', lat: 58.8, lng: 20.0, primary: 'cyber', maritime: true, aliases: ['baltic', 'baltic sea', 'undersea cable', 'subsea cable'] },
  { key: 'cape-route', name: 'Cape of Good Hope', region: 'Maritime Corridors', lat: -34.4, lng: 19.0, primary: 'maritime', maritime: true, aliases: ['cape of good hope', 'cape route', 'cape town'] },
  { key: 'northern-syria', name: 'Northern Syria', region: 'Middle East', lat: 36.2, lng: 37.1, primary: 'armed_conflict', aliases: ['syria', 'aleppo', 'idlib', 'northern syria'] },
  { key: 'lebanon-beirut', name: 'Beirut · Lebanon', region: 'Middle East', lat: 33.89, lng: 35.5, primary: 'political', aliases: ['lebanon', 'beirut'] },
  { key: 'sudan-khartoum', name: 'Khartoum · Sudan', region: 'Africa', lat: 15.6, lng: 32.5, primary: 'armed_conflict', aliases: ['sudan', 'khartoum', 'omdurman'] },
  { key: 'sahel-liptako', name: 'Liptako-Gourma · Sahel', region: 'Africa', lat: 14.5, lng: 1.0, primary: 'terrorism', aliases: ['sahel', 'liptako', 'mali', 'niger', 'burkina faso', 'tri-border'] },
  { key: 'somalia-mog', name: 'Mogadishu · Somalia', region: 'Africa', lat: 2.05, lng: 45.33, primary: 'terrorism', aliases: ['somalia', 'mogadishu', 'banaadir'] },
  { key: 'eastern-drc', name: 'Eastern DRC', region: 'Africa', lat: -1.68, lng: 29.23, primary: 'armed_conflict', aliases: ['drc', 'congo', 'goma', 'north kivu', 'kivu'] },
  { key: 'donbas', name: 'Eastern Ukraine', region: 'Europe', lat: 48.3, lng: 37.9, primary: 'armed_conflict', aliases: ['ukraine', 'donbas', 'donetsk', 'luhansk'] },
  { key: 'haiti-pap', name: 'Port-au-Prince · Haiti', region: 'Americas', lat: 18.55, lng: -72.34, primary: 'civil_unrest', aliases: ['haiti', 'port-au-prince'] },
  { key: 'caracas', name: 'Caracas · Venezuela', region: 'Americas', lat: 10.49, lng: -66.9, primary: 'civil_unrest', aliases: ['venezuela', 'caracas'] },
  { key: 'colombia-catatumbo', name: 'Catatumbo · Colombia', region: 'Americas', lat: 8.7, lng: -72.9, primary: 'armed_conflict', aliases: ['colombia', 'catatumbo', 'norte de santander'] },
  { key: 'png-highlands', name: 'PNG Highlands', region: 'Asia-Pacific', lat: -5.5, lng: 143.7, primary: 'civil_unrest', aliases: ['papua new guinea', 'png', 'enga', 'highlands'] },
  { key: 'myanmar-rakhine', name: 'Rakhine · Myanmar', region: 'Asia-Pacific', lat: 20.15, lng: 93.0, primary: 'armed_conflict', aliases: ['myanmar', 'burma', 'rakhine'] },
  // Extra hotspots (not in the initial map) so new docs can surface new points:
  { key: 'kabul', name: 'Kabul · Afghanistan', region: 'Asia-Pacific', lat: 34.53, lng: 69.17, primary: 'terrorism', aliases: ['afghanistan', 'kabul'] },
  { key: 'sanaa', name: "Sana'a · Yemen", region: 'Middle East', lat: 15.37, lng: 44.19, primary: 'armed_conflict', aliases: ['yemen', "sana'a", 'sanaa', 'houthi'] },
  { key: 'gaza', name: 'Gaza', region: 'Middle East', lat: 31.5, lng: 34.47, primary: 'armed_conflict', aliases: ['gaza'] },
  { key: 'tripoli-ly', name: 'Tripoli · Libya', region: 'Africa', lat: 32.89, lng: 13.19, primary: 'political', aliases: ['libya', 'tripoli'] },
  { key: 'cabo-delgado', name: 'Cabo Delgado · Mozambique', region: 'Africa', lat: -12.3, lng: 40.5, primary: 'terrorism', aliases: ['mozambique', 'cabo delgado', 'palma'] },
  { key: 'borno', name: 'Borno · Nigeria', region: 'Africa', lat: 11.83, lng: 13.15, primary: 'terrorism', aliases: ['nigeria', 'borno', 'maiduguri', 'lake chad'] },
  { key: 'tigray', name: 'Tigray · Ethiopia', region: 'Africa', lat: 14.0, lng: 38.3, primary: 'armed_conflict', aliases: ['ethiopia', 'tigray', 'amhara'] },
  { key: 'kashmir', name: 'Kashmir', region: 'Asia-Pacific', lat: 34.08, lng: 74.8, primary: 'armed_conflict', aliases: ['kashmir', 'srinagar'] },
  { key: 'sinai', name: 'Sinai · Egypt', region: 'Middle East', lat: 30.5, lng: 33.9, primary: 'terrorism', aliases: ['sinai', 'egypt'] },
  { key: 'mexico-tamaulipas', name: 'Tamaulipas · Mexico', region: 'Americas', lat: 24.27, lng: -98.84, primary: 'armed_conflict', aliases: ['mexico', 'tamaulipas', 'reynosa'] },
]

// Threat lexicon: category → weighted keywords.
const LEXICON = {
  armed_conflict: { weight: 1.0, terms: ['airstrike', 'shelling', 'artillery', 'clashes', 'offensive', 'front line', 'frontline', 'combat', 'militia', 'insurgent', 'armed group', 'fighting', 'ceasefire', 'war', 'military'] },
  terrorism: { weight: 1.0, terms: ['ied', 'vbied', 'suicide', 'bombing', 'attack', 'extremist', 'jihadist', 'kidnap', 'ambush', 'terror', 'explosive'] },
  maritime: { weight: 0.9, terms: ['vessel', 'shipping', 'piracy', 'pirate', 'boarding', 'hijack', 'strait', 'anchorage', 'tanker', 'merchant ship', 'gnss', 'drone boat', 'sea lane', 'chokepoint'] },
  political: { weight: 0.8, terms: ['coup', 'election', 'sanction', 'instability', 'government', 'protest crackdown', 'regime', 'diplomatic', 'border tension', 'airspace'] },
  civil_unrest: { weight: 0.8, terms: ['protest', 'riot', 'demonstration', 'strike', 'unrest', 'looting', 'curfew', 'roadblock', 'blockade', 'gang'] },
  cyber: { weight: 0.7, terms: ['cyber', 'ransomware', 'malware', 'ics', 'ot', 'jamming', 'spoofing', 'ddos', 'breach', 'sabotage', 'undersea cable', 'subsea'] },
}

const SEVERITY_TERMS = { critical: ['critical', 'severe', 'imminent', 'extreme', 'evacuate'], high: ['high', 'elevated', 'significant', 'serious'] }

function countOccurrences(haystack, needle) {
  if (!needle) return 0
  let i = 0
  let n = 0
  while ((i = haystack.indexOf(needle, i)) !== -1) {
    n++
    i += needle.length
  }
  return n
}

/** Read text from a File. Real extraction for text formats; deterministic
 *  simulated extract for binary formats (pdf/docx) in the offline demo. */
export function extractText(file) {
  return new Promise((resolve) => {
    const name = (file.name || '').toLowerCase()
    const textual = /\.(txt|md|csv|json|log|rtf|html?)$/.test(name) || (file.type || '').startsWith('text/')
    if (textual) {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => resolve('')
      reader.readAsText(file)
    } else {
      // Simulated extract for binary briefs — deterministic from the filename so
      // demo results are stable. Real PDF/DOCX parsing (pdf.js / mammoth) or the
      // LLM path can replace this without touching the rest of the pipeline.
      resolve(simulateExtract(name))
    }
  })
}

function simulateExtract(name) {
  // Which theme does the filename hint at?
  let theme = null
  if (/marit|sea|naval|ship|piracy/.test(name)) theme = 'maritime'
  else if (/cyber|hybrid|infra/.test(name)) theme = 'cyber'
  else if (/sahel|terror|extrem/.test(name)) theme = 'terrorism'
  else if (/mena|syria|levant|gulf/.test(name)) theme = 'armed_conflict'

  // Locations explicitly named in the filename.
  const picks = GAZETTEER.filter((g) =>
    g.aliases.some((a) => {
      const compact = a.replace(/[^a-z]/g, '')
      const first = a.split(' ')[0]
      return name.includes(compact) || (first.length > 3 && name.includes(first))
    })
  )

  // Fall back to a deterministic hash so unmatched files still yield regions.
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 100000
  const base = picks.length
    ? picks
    : [GAZETTEER[h % GAZETTEER.length], GAZETTEER[(h * 7 + 3) % GAZETTEER.length]]

  // Build paragraphs mentioning each place + threat terms so the format-agnostic
  // analyzer has real text to score.
  return base
    .map((g) => {
      const cat = theme || g.primary
      const lex = LEXICON[cat]?.terms.slice(0, 4).join(', ') || 'incident, threat, security'
      const sev = ['critical', 'high', 'elevated', 'significant'][(g.name.length + cat.length) % 4]
      return (
        `${g.name} — Assessment. Reporting indicates ${sev} risk in ${g.name} (${g.region}). ` +
        `Observed activity includes ${lex}. Analysts assess the threat as ${sev} with continued volatility expected. ` +
        `Recommend enhanced posture and monitoring across ${g.region}.`
      )
    })
    .join('\n\n')
}

/** Core analyzer: text → structured findings (locations + scores + categories). */
export function analyzeText(text, opts = {}) {
  const hay = ' ' + text.toLowerCase() + ' '
  const found = []
  const matchedKeys = new Set()

  for (const g of GAZETTEER) {
    let hits = 0
    for (const a of g.aliases) hits += countOccurrences(hay, ' ' + a)
    if (hits === 0) continue
    matchedKeys.add(g.key)

    // Category profile within this document.
    const cats = []
    let scoreAccum = 0
    for (const [catKey, def] of Object.entries(LEXICON)) {
      let c = 0
      for (const t of def.terms) c += countOccurrences(hay, t)
      if (c > 0) {
        const catScore = Math.min(100, 30 + c * 14 * def.weight)
        cats.push({ key: catKey, count: c, score: catScore })
        scoreAccum += catScore * def.weight
      }
    }
    if (cats.length === 0) cats.push({ key: g.primary, count: 1, score: 55 })

    // Severity modifiers.
    let sevBoost = 0
    for (const t of SEVERITY_TERMS.critical) sevBoost += countOccurrences(hay, t) * 6
    for (const t of SEVERITY_TERMS.high) sevBoost += countOccurrences(hay, t) * 3

    cats.sort((a, b) => b.score - a.score)
    const primary = cats[0].key
    // The lexicon pass measures THREAT (higher = worse); the published risk
    // score is the inverted index, so it is converted on the way out.
    const rawThreat = cats[0].score * 0.55 + (scoreAccum / cats.length) * 0.25 + sevBoost + Math.min(hits, 5) * 3
    const threat = Math.max(18, Math.min(99, Math.round(rawThreat)))
    const score = scoreFromThreat(threat)

    found.push({
      key: g.key,
      name: g.name,
      region: g.region,
      lat: g.lat,
      lng: g.lng,
      maritime: !!g.maritime,
      primary,
      threat,
      score,
      severity: severityFromScore(score),
      mentions: hits,
      categories: cats.map((c) => ({ key: c.key, level: levelFromScore(c.score) })),
      snippet: extractSnippet(text, g.aliases),
    })
  }

  found.sort((a, b) => a.score - b.score) // lowest score = most dangerous, first
  const catTotals = {}
  for (const f of found) for (const c of f.categories) catTotals[c.key] = (catTotals[c.key] || 0) + 1
  const confidence = Math.max(52, Math.min(96, 60 + found.length * 4 + (text.length > 800 ? 10 : 0)))

  return {
    risks: found,
    categoriesFound: catTotals,
    confidence,
    wordCount: (text.match(/\S+/g) || []).length,
    summary: buildSummary(found),
  }
}

function levelFromScore(s) {
  if (s >= 80) return 'Severe'
  if (s >= 60) return 'High'
  if (s >= 40) return 'Moderate'
  return 'Low'
}

function extractSnippet(text, aliases) {
  const lower = text.toLowerCase()
  for (const a of aliases) {
    const idx = lower.indexOf(a)
    if (idx !== -1) {
      const start = Math.max(0, idx - 60)
      const end = Math.min(text.length, idx + 120)
      return (start > 0 ? '…' : '') + text.slice(start, end).replace(/\s+/g, ' ').trim() + (end < text.length ? '…' : '')
    }
  }
  return ''
}

function buildSummary(found) {
  if (!found.length) return 'No recognizable locations or threat indicators were detected in this document.'
  const top = found.slice(0, 3).map((f) => f.name)
  const cat = found[0]?.categories?.[0]?.key || 'security'
  return `Detected ${found.length} risk location${found.length > 1 ? 's' : ''}, led by ${top.join(', ')}. Dominant threat vector: ${cat.replace('_', ' ')}.`
}

/** Orchestrate a single file end-to-end. Returns findings + metadata. */
export async function analyzeDocument(file, config = {}) {
  const text = await extractText(file)
  let result
  if (config?.provider && config.provider !== 'offline' && config.apiKey) {
    try {
      result = await analyzeWithLLM(text, config)
      result.engine = `${config.provider}`
    } catch (e) {
      result = analyzeText(text, config)
      result.engine = 'offline (LLM fallback)'
      result.warning = String(e?.message || e)
    }
  } else {
    result = analyzeText(text, config)
    result.engine = 'offline'
  }
  return { text, ...result }
}

// --- Production LLM adapter (activated only when configured) ----------------

const ANALYSIS_INSTRUCTIONS =
  'You are a geopolitical risk analyst. Extract every distinct at-risk location from the document. ' +
  'Return ONLY minified JSON: {"risks":[{"name","region","lat","lng","primary","score","categories":[{"key","level"}],"summary"}],"confidence"}. ' +
  'primary and category key must be one of: armed_conflict, terrorism, maritime, political, civil_unrest, cyber. ' +
  'level is one of Low, Moderate, High, Severe. lat/lng are decimal degrees. ' +
  'score is SEVERITY 0-100 where 100 is the most dangerous — the app inverts it into its own 1-100 risk index.'

export async function analyzeWithLLM(text, config) {
  const { provider, apiKey, model } = config
  const prompt = `${ANALYSIS_INSTRUCTIONS}\n\nDOCUMENT:\n"""\n${text.slice(0, 16000)}\n"""`

  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) throw new Error(`Anthropic ${res.status}`)
    const data = await res.json()
    return normalizeLLM(data?.content?.[0]?.text || '{}')
  }

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) throw new Error(`OpenAI ${res.status}`)
    const data = await res.json()
    return normalizeLLM(data?.choices?.[0]?.message?.content || '{}')
  }

  throw new Error('Unknown provider')
}

function normalizeLLM(raw) {
  let parsed
  try {
    const m = raw.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(m ? m[0] : raw)
  } catch {
    parsed = { risks: [] }
  }
  const risks = (parsed.risks || []).map((r, i) => {
    // The model answers on a severity scale (100 = worst); invert to the index.
    const threat = Math.max(0, Math.min(100, Number(r.score) || 50))
    const score = scoreFromThreat(threat)
    return {
      key: (r.name || 'loc-' + i).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: r.name || 'Unknown',
      region: r.region || 'Unspecified',
      lat: Number(r.lat) || 0,
      lng: Number(r.lng) || 0,
      maritime: /maritime|strait|sea|gulf/i.test((r.primary || '') + (r.name || '')),
      primary: r.primary || 'political',
      threat,
      score,
      severity: severityFromScore(score),
      mentions: 1,
      categories: (r.categories || [{ key: r.primary || 'political', level: 'High' }]).map((c) => ({
        key: c.key || 'political',
        level: c.level || 'High',
      })),
      snippet: (r.summary || '').slice(0, 180),
    }
  })
  const catTotals = {}
  for (const f of risks) for (const c of f.categories) catTotals[c.key] = (catTotals[c.key] || 0) + 1
  return {
    risks,
    categoriesFound: catTotals,
    confidence: Math.max(50, Math.min(98, Number(parsed.confidence) || 80)),
    wordCount: risks.length * 40,
    summary: buildSummary(risks),
  }
}

export function kindFromName(name = '') {
  const n = name.toLowerCase()
  if (n.endsWith('.pdf')) return 'pdf'
  if (n.endsWith('.docx') || n.endsWith('.doc')) return 'docx'
  if (n.endsWith('.pptx') || n.endsWith('.ppt')) return 'pptx'
  if (n.endsWith('.png') || n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image'
  if (n.endsWith('.csv')) return 'csv'
  if (n.endsWith('.json')) return 'json'
  return 'txt'
}
