import { Radio, ShieldCheck } from 'lucide-react'
import { TODAY } from '../lib/constants'
import { fmtRange } from '../lib/time'

export default function StatusBar() {
  return (
    <footer className="flex items-center gap-4 border-t border-hair/70 bg-abyss/80 px-4 py-2 text-[11px] text-ink-mute backdrop-blur">
      <span className="flex items-center gap-1.5">
        <Radio className="h-3 w-3 text-brand" />
        Data as of Jul 14, 2026 10:30 UTC
      </span>
      <span className="hidden md:inline">Sources: OSINT, Government Advisories, Partner Feeds, Media</span>
      <span className="ml-auto flex items-center gap-1.5">
        <ShieldCheck className="h-3 w-3 text-low" />
        System Status: <span className="font-semibold text-low">Operational</span>
      </span>
      <span className="hidden rounded-md border border-hair bg-panel-2/50 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-ink-mute sm:inline">
        Illustrative demo data
      </span>
    </footer>
  )
}
