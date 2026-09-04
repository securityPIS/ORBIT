import FilterBar from '../components/FilterBar'
import WorldMap from '../components/WorldMap'
import EmergingRisks from '../components/EmergingRisks'
import TrendChart from '../components/TrendChart'
import ThreatCategories from '../components/ThreatCategories'
import IntelTabs from '../components/IntelTabs'

export default function MapView() {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-3">
        <FilterBar />
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto px-4 pb-4 pt-3">
        <div className="grid gap-3 xl:h-[calc(100dvh-208px)] xl:min-h-[520px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="relative min-h-[480px] xl:min-h-0">
            <WorldMap />
          </div>
          <div className="scroll-thin flex flex-col gap-3 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
            <IntelTabs />
            <EmergingRisks />
            <TrendChart />
            <ThreatCategories />
          </div>
        </div>
      </div>
    </div>
  )
}
