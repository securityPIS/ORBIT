import { Globe2, LayoutDashboard, Navigation, FolderClosed, Sparkles, Bell } from 'lucide-react'
import { useStore } from '../store/useStore'

const ITEMS = [
  { key: 'map', label: 'Map', icon: Globe2 },
  { key: 'routes', label: 'Routes', icon: Navigation },
  { key: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { key: 'documents', label: 'Docs', icon: FolderClosed },
  { key: 'analysis', label: 'AI', icon: Sparkles },
  { key: 'alerts', label: 'Alerts', icon: Bell },
]

export default function MobileNav() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  return (
    <nav className="flex items-center justify-around border-t border-hair/70 bg-abyss/90 px-2 py-1.5 backdrop-blur md:hidden">
      {ITEMS.map(({ key, label, icon: Icon }) => {
        const active = view === key
        return (
          <button key={key} onClick={() => setView(key)} className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 ${active ? 'text-brand' : 'text-ink-mute'}`}>
            <Icon className="h-[18px] w-[18px]" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
