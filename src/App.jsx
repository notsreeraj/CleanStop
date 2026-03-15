import { useState, useCallback, useEffect, useRef } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import CanadaMap from './components/CanadaMap'
import StopsList from './components/StopsList'
import FlaggedStops from './components/FlaggedStops'
import ReportsView from './components/ReportsView'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export default function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [stops, setStops] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedStop, setSelectedStop] = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)

  // Fetch stops and reports on mount
  useEffect(() => {
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
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // When a stop is selected from the list, fly to it on the map
  const handleStopSelect = useCallback((stop) => {
    setSelectedStop(stop)
  }, [])

  const handleReportSelect = useCallback((report) => {
    setSelectedReport(report)
  }, [])

  return (
    <div className="app-layout">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <div className="main-area">
        <Header activeView={activeView} />
        <main className="main-content">
          {activeView === 'dashboard' && (
            <div className="dashboard-layout">
              <CanadaMap
                reports={reports}
                loading={loading}
                error={error}
                selectedReport={selectedReport}
                onReportSelect={handleReportSelect}
              />
              <StopsList
                stops={stops}
                loading={loading}
                selectedStop={selectedStop}
                onStopSelect={handleStopSelect}
              />
            </div>
          )}
          {activeView === 'flagged' && <FlaggedStops />}
          {activeView === 'reports' && <ReportsView />}
        </main>
      </div>
    </div>
  )
}
