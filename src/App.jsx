import React, { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import StatsCards from './components/StatsCards'
import CanadaMap from './components/CanadaMap'
import ReportsFeed from './components/ReportsFeed'
import ReportsView from './components/ReportsView'
import ReportDetailModal from './components/ReportDetailModal'
import PredictiveView from './components/PredictiveView'
import { mockReports, getReportCounts } from './data/mockData'

export default function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [reports, setReports] = useState(mockReports)
  const [selectedReport, setSelectedReport] = useState(null)
  const [toast, setToast] = useState(null)

  const counts = getReportCounts(reports)

  const showToast = useCallback((message) => {
    setToast(message)
    setTimeout(() => setToast(null), 4000)
  }, [])

  const handleApprove = useCallback((id) => {
    setReports(prev => prev.map(r =>
      r.id === id ? { ...r, status: 'approved' } : r
    ))
    setSelectedReport(null)
    showToast(`✅ Report ${id} approved — Maintenance request generated and dispatched to service team.`)
  }, [showToast])

  const handleDismiss = useCallback((id) => {
    setReports(prev => prev.map(r =>
      r.id === id ? { ...r, status: 'dismissed' } : r
    ))
    setSelectedReport(null)
    showToast(`Report ${id} has been dismissed.`)
  }, [showToast])

  return (
    <div className="app-layout">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        pendingCount={counts.pending}
      />
      <div className="main-area">
        <Header activeView={activeView} pendingCount={counts.pending} />
        <main className="main-content">
          {/* Dashboard View */}
          {activeView === 'dashboard' && (
            <>
              <StatsCards counts={counts} />
              <div className="map-section">
                <CanadaMap reports={reports} onReportClick={setSelectedReport} />
                <ReportsFeed
                  reports={reports}
                  onReportClick={setSelectedReport}
                  onViewAll={() => setActiveView('reports')}
                />
              </div>
            </>
          )}

          {/* Reports View */}
          {activeView === 'reports' && (
            <ReportsView reports={reports} onReportClick={setSelectedReport} />
          )}

          {/* Predictive Insights View */}
          {activeView === 'insights' && (
            <PredictiveView />
          )}
        </main>
      </div>

      {/* Report Detail Modal */}
      <ReportDetailModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        onApprove={handleApprove}
        onDismiss={handleDismiss}
      />

      {/* Toast Notification */}
      {toast && <div className="toast">🔧 {toast}</div>}
    </div>
  )
}
