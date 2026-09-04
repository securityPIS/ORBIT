import { CheckCircle2, X, AlertTriangle, Sparkles } from 'lucide-react'
import { useStore } from '../store/useStore'

const ICONS = {
  success: CheckCircle2,
  info: Sparkles,
  warning: AlertTriangle,
}

export default function Toasts() {
  const toasts = useStore((s) => s.toasts)
  const removeToast = useStore((s) => s.removeToast)

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-80 max-w-[calc(100vw-2.5rem)] flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind] || Sparkles
        const color = t.kind === 'warning' ? '#f97316' : t.kind === 'success' ? '#22c55e' : '#38bdf8'
        return (
          <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-hair bg-panel-2/95 p-3 shadow-2xl backdrop-blur animate-fade-up">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: `${color}1a`, color }}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-ink">{t.title}</div>
              {t.body && <div className="mt-0.5 text-[11.5px] text-ink-dim">{t.body}</div>}
            </div>
            <button onClick={() => removeToast(t.id)} className="rounded-md p-0.5 text-ink-mute hover:text-ink">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
