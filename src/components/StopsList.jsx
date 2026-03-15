import { useState, useMemo, useRef, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export default function StopsList({ stops, loading, selectedStop, onStopSelect, showAll, setShowAll }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('reports-desc')
  const [reports, setReports] = useState(null)
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsStop, setReportsStop] = useState(null)
  const selectedRef = useRef(null)

  // Filter and sort stops
  const filtered = useMemo(() => {
    let list = showAll ? stops : stops.filter(s => s.report_count > 0)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        s.stop_name.toLowerCase().includes(q) ||
        String(s.stop_id).includes(q)
      )
    }
    if (sortBy === 'reports-desc') list = [...list].sort((a, b) => b.report_count - a.report_count)
    else if (sortBy === 'reports-asc') list = [...list].sort((a, b) => a.report_count - b.report_count)
    else if (sortBy === 'name') list = [...list].sort((a, b) => a.stop_name.localeCompare(b.stop_name))
    return list
  }, [stops, search, sortBy, showAll])

  // Scroll selected stop into view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedStop])

  // Fetch reports for a stop
  function handleGetReports(stop) {
    setReportsLoading(true)
    setReportsStop(stop)
    setReports(null)
    fetch(`${API_BASE}/stops/${stop.stop_id}/reports`)
      .then(res => res.json())
      .then(data => {
        setReports(data)
        setReportsLoading(false)
      })
      .catch(() => {
        setReports([])
        setReportsLoading(false)
      })
  }

  function closeReports() {
    setReports(null)
    setReportsStop(null)
  }

  return (
    <div className="stops-panel">
      {/* Header with search */}
      <div className="stops-panel-header">
        <h3>🚏 Stops with Reports</h3>
        <span className="stops-count">{filtered.length} stops</span>
      </div>

      <div className="stops-search">
        <span className="stops-search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search stops by name or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="stops-search-clear" onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      <div className="stops-sort-bar">
        <label>Sort:</label>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="reports-desc">Most Reports</option>
          <option value="reports-asc">Fewest Reports</option>
          <option value="name">Name A–Z</option>
        </select>
        <button
          className={`stops-toggle-all ${showAll ? 'active' : ''}`}
          onClick={() => setShowAll(prev => !prev)}
        >
          {showAll ? '🚏 All Stops' : '⚠️ With Reports'}
        </button>
      </div>

      {/* Stops list */}
      <div className="stops-list">
        {loading && (
          <div className="stops-empty">
            <span className="stops-spinner"></span>
            Loading stops...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="stops-empty">
            No stops found{search ? ` for "${search}"` : ''}
          </div>
        )}

        {filtered.map(stop => (
          <div
            key={stop.stop_id}
            ref={selectedStop?.stop_id === stop.stop_id ? selectedRef : null}
            className={`stop-item ${selectedStop?.stop_id === stop.stop_id ? 'active' : ''}`}
            onClick={() => onStopSelect(stop)}
          >
            <div className="stop-item-indicator">
              <span
                className="stop-dot"
                style={{ background: stop.report_count <= 1 ? '#10b981' : stop.report_count <= 4 ? '#f59e0b' : '#ef4444' }}
              ></span>
            </div>
            <div className="stop-item-info">
              <span className="stop-item-name">{stop.stop_name}</span>
              <span className="stop-item-meta">
                #{stop.stop_id}
                {stop.report_count > 0 && (
                  <span className="stop-report-badge">{stop.report_count} report{stop.report_count !== 1 ? 's' : ''}</span>
                )}
              </span>
            </div>

            {/* Get Reports button — shown when selected */}
            {selectedStop?.stop_id === stop.stop_id && (
              <button
                className="stop-get-reports-btn"
                onClick={e => {
                  e.stopPropagation()
                  handleGetReports(stop)
                }}
              >
                📋 Get Issue Reports
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Reports overlay */}
      {reportsStop && (
        <div className="stops-reports-overlay">
          <div className="stops-reports-header">
            <div>
              <h4>📋 Reports for Stop #{reportsStop.stop_id}</h4>
              <span className="stops-reports-name">{reportsStop.stop_name}</span>
            </div>
            <button className="stops-reports-close" onClick={closeReports}>✕</button>
          </div>

          <div className="stops-reports-body">
            {reportsLoading && (
              <div className="stops-empty">
                <span className="stops-spinner"></span>
                Loading reports...
              </div>
            )}

            {!reportsLoading && reports && reports.length === 0 && (
              <div className="stops-empty">
                ✅ No issue reports for this stop
              </div>
            )}

            {!reportsLoading && reports && reports.length > 0 && (
              reports.map(r => (
                <div key={r.id} className="report-item">
                  <div className="report-item-header">
                    <span className={`report-type-badge ${r.issue_type}`}>{r.issue_type}</span>
                    <span className="report-time">
                      {new Date(r.created_at).toLocaleDateString('en-CA', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {r.description && (
                    <p className="report-desc">{r.description}</p>
                  )}
                  {r.photo_url && (
                    <img src={r.photo_url} alt="Report" className="report-photo" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
