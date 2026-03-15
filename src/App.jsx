import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import CanadaMap from './components/CanadaMap'
import StopsList from './components/StopsList'
import FlaggedStops from './components/FlaggedStops'
import ReportsView from './components/ReportsView'
import AnalyticsView from './components/AnalyticsView'
import PredictiveView from './components/PredictiveView'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export default function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [stops, setStops] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedStop, setSelectedStop] = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)
  const [showAllStops, setShowAllStops] = useState(false)
  const [refreshCountdown, setRefreshCountdown] = useState(60)

  // Fetch data function (reused for mount + interval)
  const fetchData = useCallback(() => {
    Promise.all([
      fetch(`${API_BASE}/stops`).then(res => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`)
        return res.json()
      }),
      fetch(`${API_BASE}/reports`).then(res => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`)
        return res.json()
      }),
    ])
      .then(([stopsData, reportsData]) => {
        setStops(stopsData)
        setReports(reportsData)
        setLoading(false)
        setRefreshCountdown(60)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
        setRefreshCountdown(60)
      })
  }, [])

  // Fetch on mount + auto-refresh every 60s
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Countdown tick every second
  useEffect(() => {
    const tick = setInterval(() => {
      setRefreshCountdown(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  // When a stop is selected from the list, fly to it on the map
  const handleStopSelect = useCallback((stop) => {
    setSelectedStop(stop)
  }, [])

  const handleReportSelect = useCallback((report) => {
    setSelectedReport(report)
  }, [])

  // Only show active (non-closed) reports on the map
  const activeReports = useMemo(() => reports.filter(r => r.status !== 'closed'), [reports])

  // Enrich stops with active report counts
  const stopsWithActiveCounts = useMemo(() => {
    const countMap = {}
    for (const r of activeReports) {
      countMap[r.stop_id] = (countMap[r.stop_id] || 0) + 1
    }
    return stops.map(s => ({ ...s, report_count: countMap[s.stop_id] || 0 }))
  }, [stops, activeReports])

  return (
    <div className="app-layout">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <div className="main-area">
        <Header activeView={activeView} />
        <main className="main-content">
          {activeView === 'dashboard' && (
            <div className="dashboard-layout">
              <CanadaMap
                reports={activeReports}
                stops={stopsWithActiveCounts}
                showAllStops={showAllStops}
                loading={loading}
                error={error}
                selectedReport={selectedReport}
                onReportSelect={handleReportSelect}
              />
              <StopsList
                stops={stopsWithActiveCounts}
                loading={loading}
                selectedStop={selectedStop}
                onStopSelect={handleStopSelect}
                showAll={showAllStops}
                setShowAll={setShowAllStops}
              />
            </div>
          )}
          {activeView === 'flagged' && <FlaggedStops />}
          {activeView === 'reports' && <ReportsView />}
          {activeView === 'analytics' && <AnalyticsView />}
          {activeView === 'insights' && <PredictiveView />}
        </main>
      </div>

      <div className="refresh-timer">
        <span className="refresh-timer-dot" />
        Refresh in <strong>{refreshCountdown}s</strong>
      </div>
    </div>
  )
}
