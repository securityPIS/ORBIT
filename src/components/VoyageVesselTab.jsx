import { useState } from 'react'
import { Ship, Plus, Trash2, RotateCcw, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { VESSEL_PRESETS } from '../data/maritime'
import { useStore } from '../store/useStore'
import { IMPACT_CATEGORIES, IMPACT_WEIGHTS, fmtMoney, DEFAULT_IMPACT_THRESHOLDS } from '../lib/riskRating'
import { IMPACT_LEVELS, impactMeta } from '../lib/constants'
import { Dropdown } from './ui'
import { NumberField, SectionHeader } from './VoyageFields'

const IMPACT_COLORS = ['#22c55e', '#84cc16', '#f5b301', '#f97316', '#ef4444']
const impactColor = (level) => IMPACT_COLORS[Math.max(1, Math.min(5, level)) - 1]

/** One line of the exposure register. */
function ImpactRow({ entity, onChange, onRemove }) {
  const color = impactColor(entity.level)
  const overridden = entity.manualLevel != null

  return (
    <li className="rounded-xl border border-hair/60 bg-panel-2/20 p-2.5">
      <div className="flex items-center gap-2">
        <input
          value={entity.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="What is exposed…"
          className="min-w-0 flex-1 rounded-lg border border-hair bg-panel px-2 py-1.5 text-[12.5px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-ink-mute focus:border-brand/50"
        />
        <span
          className="shrink-0 rounded-md px-1.5 py-1 font-mono text-[11px] font-bold"
          style={{ color, background: `${color}18`, boxShadow: `inset 0 0 0 1px ${color}44` }}
          title={`${entity.meta.label} — ${entity.meta.note}`}
        >
          I{entity.level}
        </span>
        <button
          onClick={onRemove}
          title="Remove this exposure"
          className="shrink-0 rounded-md p-1 text-ink-mute transition-colors hover:bg-critical/10 hover:text-critical"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2 flex gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-mute">Object</span>
          <input
            list="impact-categories"
            value={entity.category}
            onChange={(e) => onChange({ category: e.target.value })}
            placeholder="Vessel, cargo…"
            className="w-full rounded-lg border border-hair bg-panel-2/50 px-2 py-1.5 text-[12px] text-ink-dim outline-none placeholder:text-ink-mute focus:border-brand/50"
          />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-mute">Value (USD)</span>
          <input
            type="number"
            min={0}
            step={100000}
            value={entity.value || ''}
            onChange={(e) => onChange({ value: e.target.value === '' ? 0 : Number(e.target.value) })}
            placeholder="0"
            className="w-full rounded-lg border border-hair bg-panel-2/50 px-2 py-1.5 text-right font-mono text-[12px] text-ink outline-none placeholder:text-ink-mute focus:border-brand/50"
          />
        </label>
      </div>

      <div className="mt-2 flex items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-mute">
            Weight · {IMPACT_WEIGHTS.find((w) => w.weight === entity.weight)?.label} (×{entity.factor})
          </span>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={entity.weight}
            onChange={(e) => onChange({ weight: Number(e.target.value) })}
            className="w-full accent-brand"
          />
        </label>
        <label className="flex shrink-0 flex-col gap-1">
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-mute">Level</span>
          <select
            value={entity.manualLevel ?? ''}
            onChange={(e) => onChange({ manualLevel: e.target.value === '' ? null : Number(e.target.value) })}
            className="rounded-lg border border-hair bg-panel-2/50 px-1.5 py-1.5 text-[11.5px] text-ink-dim outline-none focus:border-brand/50"
          >
            <option value="">Auto · I{entity.autoLevel}</option>
            {IMPACT_LEVELS.map((l) => (
              <option key={l.level} value={l.level}>
                I{l.level} · {l.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-ink-mute">
        <span>
          Weighted {fmtMoney(entity.weightedValue)} → auto <b className="text-ink-dim">I{entity.autoLevel}</b>
        </span>
        {overridden && (
          <button
            onClick={() => onChange({ manualLevel: null })}
            className="ml-auto inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[10.5px] font-semibold text-moderate transition-colors hover:bg-moderate/10"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            override on
          </button>
        )}
      </div>
    </li>
  )
}

/** Calibration for the value → level mapping. Collapsed by default. */
function ThresholdEditor() {
  const [open, setOpen] = useState(false)
  const thresholds = useStore((s) => s.route.impactThresholds)
  const setThresholds = useStore((s) => s.setImpactThresholds)

  return (
    <div className="rounded-xl border border-hair/60 bg-panel-2/20">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11.5px] font-semibold text-ink-dim transition-colors hover:text-ink"
      >
        <SlidersHorizontal className="h-3.5 w-3.5 text-ink-mute" />
        Impact thresholds
        <ChevronDown className={`ml-auto h-3.5 w-3.5 text-ink-mute transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="animate-fade-up border-t border-hair/60 p-3">
          <p className="pb-2 text-[11px] leading-relaxed text-ink-mute">
            Weighted value at which an exposure reaches each level. Below the first figure it is I1 · Insignificant.
          </p>
          <div className="space-y-1.5">
            {thresholds.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="w-[92px] shrink-0 text-[11px] font-semibold"
                  style={{ color: impactColor(i + 2) }}
                >
                  I{i + 2} · {impactMeta(i + 2).label}
                </span>
                <input
                  type="number"
                  min={0}
                  step={100000}
                  value={t}
                  onChange={(e) => {
                    const next = [...thresholds]
                    next[i] = Number(e.target.value) || 0
                    setThresholds(next)
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-hair bg-panel px-2 py-1 text-right font-mono text-[11.5px] text-ink outline-none focus:border-brand/50"
                />
                <span className="w-[58px] shrink-0 text-right font-mono text-[10.5px] text-ink-mute">{fmtMoney(t)}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setThresholds([...DEFAULT_IMPACT_THRESHOLDS])}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-ink-mute transition-colors hover:text-ink"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  )
}

export default function VoyageVesselTab({ assessment }) {
  const route = useStore((s) => s.route)
  const setRoute = useStore((s) => s.setRoute)
  const addEntity = useStore((s) => s.addImpactEntity)
  const updateEntity = useStore((s) => s.updateImpactEntity)
  const removeEntity = useStore((s) => s.removeImpactEntity)

  const vessel = VESSEL_PRESETS.find((v) => v.id === route.vesselId) || VESSEL_PRESETS[0]
  const speed = route.speed || vessel.speed
  const { impact } = assessment
  const impactColorNow = impactColor(impact.level)

  return (
    <div className="space-y-4">
      <datalist id="impact-categories">
        {IMPACT_CATEGORIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <SectionHeader>Vessel</SectionHeader>
      <div className="-mt-2">
        <Dropdown
          value={route.vesselId}
          options={VESSEL_PRESETS.map((v) => ({ value: v.id, label: v.name }))}
          onChange={(id) => setRoute({ vesselId: id, speed: null, result: null })}
          icon={Ship}
          minWidth={280}
        />
        <div className="mt-2 grid grid-cols-4 gap-1.5 rounded-xl border border-hair/60 bg-panel-2/30 px-3 py-2 text-center">
          {[
            ['Draft', `${vessel.draft} m`],
            ['Beam', `${vessel.beam} m`],
            ['LOA', `${vessel.loa} m`],
            ['Air draft', `${vessel.airDraft} m`],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-[9.5px] uppercase tracking-wider text-ink-mute">{k}</div>
              <div className="font-mono text-[12px] font-semibold text-ink-dim">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <NumberField
            label="Speed"
            value={speed}
            onChange={(v) => setRoute({ speed: v, result: null })}
            suffix="kn"
            min={5}
            max={30}
            step={0.5}
          />
          <NumberField
            label="Bunker"
            value={route.bunkerUsd}
            onChange={(v) => setRoute({ bunkerUsd: v, result: null })}
            suffix="$/t"
            min={100}
            max={2000}
            step={10}
          />
        </div>
      </div>

      {/* impact register */}
      <SectionHeader
        right={
          <button
            onClick={() => addEntity()}
            className="flex items-center gap-1 rounded-lg border border-brand/30 bg-brand/10 px-2 py-1 text-[10.5px] font-bold uppercase tracking-wide text-brand transition-colors hover:bg-brand/20"
          >
            <Plus className="h-3 w-3" />
            Add object
          </button>
        }
      >
        Impact · what is exposed
      </SectionHeader>

      <p className="-mt-2 text-[11.5px] leading-relaxed text-ink-mute">
        Every object at stake on this voyage — hull, cargo, crew, charter commitment. Value and weight give each one a
        level; the voyage takes the highest.
      </p>

      {impact.entities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-hair px-3 py-6 text-center text-[12px] text-ink-mute">
          Nothing listed yet. Add the objects this voyage puts at risk.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {impact.entities.map((e) => (
            <ImpactRow
              key={e.id}
              entity={e}
              onChange={(patch) => updateEntity(e.id, patch)}
              onRemove={() => removeEntity(e.id)}
            />
          ))}
        </ul>
      )}

      <ThresholdEditor />

      {/* rolled-up impact */}
      <div className="rounded-xl border border-hair/60 bg-panel-2/30 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-mute">Voyage impact</span>
          <span className="font-mono text-[11px] text-ink-mute">{fmtMoney(impact.totalValue)} listed</span>
        </div>
        {impact.empty ? (
          <p className="mt-1.5 text-[11.5px] text-ink-mute">Add at least one object to derive an impact level.</p>
        ) : (
          <>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold" style={{ color: impactColorNow }}>
                I{impact.level}
              </span>
              <span className="text-[12.5px] font-bold text-ink">{impact.meta.label}</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">
              Set by <span className="font-semibold text-ink-dim">{impact.driver?.label || 'the largest exposure'}</span>.
              Weighted book {fmtMoney(impact.totalWeighted)}, which on its own would read I{impact.aggregateLevel}.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
