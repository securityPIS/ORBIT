import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { useStore } from './store/useStore'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import MobileNav from './components/MobileNav'
import StatusBar from './components/StatusBar'
import Toasts from './components/Toasts'
import MapView from './pages/MapView'
import RoutePage from './pages/RoutePage'
import ExecutiveBriefPage from './pages/ExecutiveBriefPage'
import DashboardPage from './pages/DashboardPage'
import FeedPage from './pages/FeedPage'
import DocumentsPage from './pages/DocumentsPage'
import AnalysisPage from './pages/AnalysisPage'
import AlertsPage from './pages/AlertsPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'

const VIEWS = {
  map: MapView,
  routes: RoutePage,
  brief: ExecutiveBriefPage,
  dashboard: DashboardPage,
  feed: FeedPage,
  documents: DocumentsPage,
  analysis: AnalysisPage,
  alerts: AlertsPage,
  reports: ReportsPage,
  settings: SettingsPage,
}

function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])
  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
  }
  return { canInstall: !!deferred, install }
}

export default function App() {
  const view = useStore((s) => s.view)
  const Current = VIEWS[view] || MapView
  const { canInstall, install } = useInstallPrompt()

  return (
    <div className="grain relative flex h-[100dvh] w-full overflow-hidden bg-void text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="relative min-h-0 flex-1">
          <Current />
        </main>
        <StatusBar />
        <MobileNav />
      </div>

      {canInstall && (
        <button
          onClick={install}
          className="fixed bottom-20 right-5 z-[90] flex items-center gap-2 rounded-full border border-brand/40 bg-panel/90 px-4 py-2.5 text-[12.5px] font-semibold text-brand shadow-glow backdrop-blur md:bottom-16"
        >
          <Download className="h-4 w-4" /> Install App
        </button>
      )}

      <Toasts />
    </div>
  )
}
