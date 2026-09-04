import { useState } from 'react'
import { Settings as SettingsIcon, KeyRound, Cpu, ShieldCheck, Bell, Eye, EyeOff, Check } from 'lucide-react'
import { useStore } from '../store/useStore'
import PageShell from '../components/PageShell'

const PROVIDERS = [
  { key: 'offline', name: 'On-device', desc: 'Built-in gazetteer + threat lexicon. No network, fully private.', model: '' },
  { key: 'anthropic', name: 'Anthropic Claude', desc: 'Full-text LLM extraction via the Claude API.', model: 'claude-sonnet-5' },
  { key: 'openai', name: 'OpenAI', desc: 'Full-text LLM extraction via the OpenAI API.', model: 'gpt-4o-mini' },
]

export default function SettingsPage() {
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const autoRefresh = useStore((s) => s.autoRefresh)
  const toggleAutoRefresh = useStore((s) => s.toggleAutoRefresh)
  const addToast = useStore((s) => s.addToast)
  const [showKey, setShowKey] = useState(false)
  const [draft, setDraft] = useState({ apiKey: settings.apiKey, model: settings.model })

  const provider = settings.provider
  const isLLM = provider !== 'offline'

  const save = () => {
    setSettings({ apiKey: draft.apiKey, model: draft.model })
    addToast({ kind: 'success', title: 'Settings saved', body: isLLM ? 'LLM extraction is now active for new uploads.' : 'Using on-device analysis.' })
  }

  return (
    <PageShell title="Settings" subtitle="Analysis engine & preferences" icon={SettingsIcon}>
      <div className="mx-auto max-w-2xl space-y-5">
        {/* provider */}
        <section className="panel p-5">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-brand" />
            <h2 className="text-[14px] font-semibold text-ink">Analysis Engine</h2>
          </div>
          <p className="mt-1 text-[12px] text-ink-mute">Choose how uploaded documents are analyzed for risk locations.</p>
          <div className="mt-4 grid gap-2.5">
            {PROVIDERS.map((p) => {
              const active = provider === p.key
              return (
                <button
                  key={p.key}
                  onClick={() => setSettings({ provider: p.key, model: p.model })}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                    active ? 'border-brand/50 bg-brand/[0.06]' : 'border-hair bg-panel-2/30 hover:border-hair-2'
                  }`}
                >
                  <span className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full border ${active ? 'border-brand bg-brand text-[#04121e]' : 'border-hair-2'}`}>
                    {active && <Check className="h-3 w-3" />}
                  </span>
                  <span className="flex-1">
                    <span className="block text-[13px] font-semibold text-ink">{p.name}</span>
                    <span className="block text-[11.5px] text-ink-mute">{p.desc}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* api key */}
        {isLLM && (
          <section className="panel p-5">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-brand" />
              <h2 className="text-[14px] font-semibold text-ink">API Credentials</h2>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-mute">API Key</span>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={draft.apiKey}
                    onChange={(e) => setDraft((d) => ({ ...d, apiKey: e.target.value }))}
                    placeholder={provider === 'anthropic' ? 'sk-ant-…' : 'sk-…'}
                    className="w-full rounded-xl border border-hair bg-panel-2/40 py-2.5 pl-3 pr-10 font-mono text-[12.5px] text-ink placeholder:text-ink-mute focus:border-brand/40 focus:outline-none"
                  />
                  <button onClick={() => setShowKey((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink">
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-mute">Model</span>
                <input
                  value={draft.model}
                  onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}
                  className="w-full rounded-xl border border-hair bg-panel-2/40 py-2.5 px-3 font-mono text-[12.5px] text-ink focus:border-brand/40 focus:outline-none"
                />
              </label>
              <div className="flex items-start gap-2 rounded-xl border border-moderate/25 bg-moderate/[0.06] p-3 text-[11.5px] text-ink-dim">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-moderate" />
                Your key is held in memory for this session only — it is never persisted to disk and is sent directly to the provider from your browser. For production, proxy requests through your own backend.
              </div>
              <button onClick={save} className="btn-primary w-full">Save credentials</button>
            </div>
          </section>
        )}

        {/* preferences */}
        <section className="panel p-5">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-brand" />
            <h2 className="text-[14px] font-semibold text-ink">Preferences</h2>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="text-[13px] font-medium text-ink">Auto-refresh feeds</div>
              <div className="text-[11.5px] text-ink-mute">Periodically refresh live risk data.</div>
            </div>
            <button
              onClick={toggleAutoRefresh}
              className={`relative h-6 w-11 rounded-full transition-colors ${autoRefresh ? 'bg-brand' : 'bg-hair-2'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${autoRefresh ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
