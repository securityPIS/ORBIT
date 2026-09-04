import { useMemo, useState } from 'react'
import { Search, MapPin, Check } from 'lucide-react'
import { PORTS, PORT_REGIONS, portById } from '../data/maritime'
import { formatCoord } from '../lib/routing'
import { useOutside } from './ui'

/** Searchable port list, grouped by region. Also accepts a picked position. */
export function PortSelect({ value, onChange, accent, placeholder = 'Select a port' }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useOutside(() => setOpen(false))

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const matched = needle
      ? PORTS.filter((p) => `${p.name} ${p.country}`.toLowerCase().includes(needle))
      : PORTS
    return PORT_REGIONS.map((region) => ({ region, ports: matched.filter((p) => p.region === region) })).filter(
      (g) => g.ports.length
    )
  }, [q])

  const current = value?.portId ? portById(value.portId) : null
  const positioned = Number.isFinite(value?.lat) && Number.isFinite(value?.lng)
  const label = current ? current.name : positioned ? formatCoord(value.lat, value.lng) : placeholder
  const sub = current ? current.country : positioned ? 'Custom position' : ''

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-hair bg-panel-2/50 px-3 py-2.5 text-left transition-colors hover:border-hair-2"
      >
        <MapPin className="h-4 w-4 shrink-0" style={{ color: accent }} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className={`block truncate text-[13px] font-semibold ${current || positioned ? 'text-ink' : 'text-ink-mute'}`}>
            {label}
          </span>
          {sub && <span className="block truncate text-[11px] text-ink-mute">{sub}</span>}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full min-w-[260px] rounded-xl border border-hair bg-panel-2 p-2 shadow-2xl">
          <div className="flex items-center gap-2 rounded-lg border border-hair bg-panel px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 text-ink-mute" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search port or country…"
              className="w-full bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-mute"
            />
          </div>
          <div className="scroll-thin mt-2 max-h-72 overflow-y-auto">
            {groups.map((g) => (
              <div key={g.region}>
                <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
                  {g.region}
                </div>
                {g.ports.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onChange({ portId: p.id, lat: undefined, lng: undefined })
                      setOpen(false)
                      setQ('')
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-white/5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-ink-dim">{p.name}</span>
                      <span className="block truncate text-[10.5px] text-ink-mute">{p.country}</span>
                    </span>
                    {value?.portId === p.id && <Check className="h-3.5 w-3.5 shrink-0 text-brand" />}
                  </button>
                ))}
              </div>
            ))}
            {!groups.length && <div className="px-2 py-6 text-center text-[12px] text-ink-mute">No port matches “{q}”.</div>}
          </div>
        </div>
      )}
    </div>
  )
}

export function NumberField({ label, value, onChange, suffix, min, max, step = 1, placeholder }) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-mute">{label}</span>
      <span className="flex items-center gap-1.5 rounded-xl border border-hair bg-panel-2/50 px-3 py-2">
        <input
          type="number"
          value={value ?? ''}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full bg-transparent font-mono text-[13px] font-semibold text-ink outline-none placeholder:font-sans placeholder:text-[11px] placeholder:font-normal placeholder:text-ink-mute"
        />
        {suffix && <span className="shrink-0 text-[11px] text-ink-mute">{suffix}</span>}
      </span>
    </label>
  )
}

export function SectionHeader({ children, right }) {
  return (
    <div className="flex items-center gap-2 pb-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-mute">{children}</span>
      <div className="h-px flex-1 bg-hair/60" />
      {right}
    </div>
  )
}
