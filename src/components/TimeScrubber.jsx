import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Radio } from 'lucide-react'
import { useStore, getWindow } from '../store/useStore'
import { addDays, dayKey, fmtShort, daysBetween } from '../lib/time'
import { TODAY } from '../lib/constants'

export default function TimeScrubber() {
  const preset = useStore((s) => s.preset)
  const asOf = useStore((s) => s.asOf)
  const setAsOf = useStore((s) => s.setAsOf)
  const win = getWindow(preset)
  const days = win.days
  const value = Math.max(0, Math.min(days, daysBetween(win.start, asOf)))
  const [playing, setPlaying] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    if (!playing) return
    timer.current = setInterval(() => {
      const cur = daysBetween(win.start, useStore.getState().asOf)
      const next = cur >= days ? 0 : cur + 1
      setAsOf(dayKey(addDays(win.start, next)))
      if (next >= days) setPlaying(false)
    }, 420)
    return () => clearInterval(timer.current)
  }, [playing, days, win.start, setAsOf])

  const isLive = value >= days
  const label = isLive ? 'Live · Today' : fmtShort(addDays(win.start, value))

  return (
    <div className="absolute bottom-3 left-1/2 z-10 w-[min(560px,72%)] -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-2xl border border-hair bg-panel/85 px-3 py-2.5 shadow-xl backdrop-blur-md">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/15 text-brand transition-colors hover:bg-brand/25"
          title={playing ? 'Pause' : 'Play timeline'}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
        </button>

        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-mute">Timeline · as of</span>
            <span className={`flex items-center gap-1.5 text-[12px] font-semibold ${isLive ? 'text-brand' : 'text-ink'}`}>
              {isLive && <Radio className="h-3 w-3 animate-pulse" />}
              {label}
            </span>
          </div>
          <input
            type="range"
            className="scrubber w-full"
            min={0}
            max={days}
            value={value}
            onChange={(e) => {
              setPlaying(false)
              setAsOf(dayKey(addDays(win.start, Number(e.target.value))))
            }}
          />
          <div className="mt-1 flex justify-between font-mono text-[9px] text-ink-mute">
            <span>{fmtShort(win.start)}</span>
            <span>{fmtShort(addDays(win.start, Math.round(days / 2)))}</span>
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  )
}
