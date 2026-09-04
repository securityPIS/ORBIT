import { useEffect, useRef, useState, useId } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { SEVERITY } from '../lib/constants'

export function useOutside(onClose) {
  const ref = useRef(null)
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('touchstart', handle)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('touchstart', handle)
    }
  }, [onClose])
  return ref
}

export function Dropdown({ label, value, options, onChange, icon: Icon, align = 'left', minWidth = 180 }) {
  const [open, setOpen] = useState(false)
  const ref = useOutside(() => setOpen(false))
  const current = options.find((o) => o.value === value)
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="group flex min-w-[8.5rem] items-center gap-2 rounded-xl border border-hair bg-panel-2/50 px-3 py-2 text-left transition-colors hover:border-hair-2"
      >
        {Icon && <Icon className="h-4 w-4 text-ink-mute" />}
        <span className="flex flex-col leading-tight">
          {label && <span className="text-[10px] font-medium uppercase tracking-wider text-ink-mute">{label}</span>}
          <span className="text-[13px] font-medium text-ink">{current?.label ?? value}</span>
        </span>
        <ChevronDown className={`ml-auto h-4 w-4 text-ink-mute transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className={`absolute z-40 mt-2 max-h-72 overflow-auto rounded-xl border border-hair bg-panel-2 p-1.5 shadow-2xl scroll-thin ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          style={{ minWidth }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink-dim transition-colors hover:bg-white/5 hover:text-ink"
            >
              {o.dot && <span className="h-2 w-2 rounded-full" style={{ background: o.dot }} />}
              <span className="flex-1">{o.label}</span>
              {o.value === value && <Check className="h-3.5 w-3.5 text-brand" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Sparkline({ data = [], color = '#38bdf8', width = 120, height = 34, fill = true, strokeWidth = 1.6 }) {
  const gid = useId().replace(/:/g, '')
  if (!data.length) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const step = width / (data.length - 1 || 1)
  const pts = data.map((d, i) => [i * step, height - ((d - min) / range) * (height - 4) - 2])
  const line = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L ${width} ${height} L 0 ${height} Z`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`sp-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#sp-${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.4" fill={color} />
    </svg>
  )
}

export function Donut({ value = 0, size = 76, stroke = 8, color = '#38bdf8', track = '#1e293b', children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c - (Math.max(0, Math.min(100, value)) / 100) * c
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

export function SeverityDot({ level, size = 8, pulse = false }) {
  const color = SEVERITY[level]?.color ?? '#64748b'
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      {pulse && (
        <span className="absolute inset-0 rounded-full" style={{ background: color, animation: 'pulse-ring 2.4s cubic-bezier(0.4,0,0.2,1) infinite' }} />
      )}
      <span className="relative rounded-full" style={{ width: size, height: size, background: color, boxShadow: `0 0 8px ${color}` }} />
    </span>
  )
}

export function SeverityBadge({ level, className = '' }) {
  const meta = SEVERITY[level] ?? SEVERITY.low
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${className}`}
      style={{ color: meta.color, background: `${meta.color}1a`, boxShadow: `inset 0 0 0 1px ${meta.color}40` }}
    >
      {meta.label}
    </span>
  )
}

export function LevelPill({ level }) {
  const map = { Severe: '#ef4444', High: '#f97316', Moderate: '#f5b301', Low: '#22c55e' }
  const color = map[level] || '#64748b'
  return (
    <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color }}>
      {level}
    </span>
  )
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-xl border border-hair bg-panel-2/50 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-[9px] px-3 py-1.5 text-xs font-semibold transition-all ${
            value === o.value ? 'bg-brand/15 text-brand shadow-sm' : 'text-ink-mute hover:text-ink-dim'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
