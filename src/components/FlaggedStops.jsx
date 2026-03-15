import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export default function FlaggedStops() {
  const [flagged, setFlagged] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null) // stop_id of expanded row
  const [reports, setReports] = useState({})     // { stop_id: [...reports] }
  const [reportsLoading, setReportsLoading] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/stops/flagged`)
      .then(res => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`)
        return res.json()
      })
      .then(data => { setFlagged(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  function toggleExpand(stop) {
    if (expanded === stop.stop_id) {
      setExpanded(null)
      return
    }
    setExpanded(stop.stop_id)

    // Fetch reports if not already cached
    if (!reports[stop.stop_id]) {
      setReportsLoading(stop.stop_id)
      fetch(`${API_BASE}/stops/${stop.stop_id}/reports`)
        .then(res => res.json())
        .then(data => {
          setReports(prev => ({ ...prev, [stop.stop_id]: data }))
          setReportsLoading(null)
        })
        .catch(() => {
          setReports(prev => ({ ...prev, [stop.stop_id]: [] }))
          setReportsLoading(null)
        })
    }
  }

  function getTypeColor(type) {
    switch (type) {
      case 'Snow / Ice': return '#60a5fa'
      case 'Debris': return '#fbbf24'
      case 'Structural Damage': return '#fb7185'
      case 'Obstruction': return '#fb923c'
      default: return '#94a3b8'
    }
  }

  function getTypeIcon(type) {
    switch (type) {
      case 'Snow / Ice': return '❄️'
      case 'Debris': return '🗑️'
      case 'Structural Damage': return '🔧'
      case 'Obstruction': return '🚧'
      default: return '📋'
    }
  }

  if (loading) {
    return (
      <div className="flagged-container">
        <div className="flagged-empty"><span className="stops-spinner"></span> Loading flagged stops…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flagged-container">
        <div className="flagged-empty" style={{ color: 'var(--accent-rose)' }}>⚠ {error}</div>
      </div>
    )
  }

  return (
    <div className="flagged-container">
      <div className="flagged-header">
        <h3>🚩 Stops with Active Reports</h3>
        <span className="flagged-count">{flagged.length} flagged stop{flagged.length !== 1 ? 's' : ''}</span>
      </div>

      {flagged.length === 0 && (
        <div className="flagged-empty">✅ No stops with active reports</div>
      )}

      <div className="flagged-list">
        {flagged.map(stop => (
          <div key={stop.stop_id} className={`flagged-item ${expanded === stop.stop_id ? 'expanded' : ''}`}>
            <div className="flagged-item-row" onClick={() => toggleExpand(stop)}>
              <div className="flagged-item-left">
                <span className="flagged-dot" style={{
                  background: stop.report_count > 5 ? '#ef4444' : stop.report_count > 2 ? '#f59e0b' : '#60a5fa'
                }}></span>
                <div className="flagged-item-info">
                  <span className="flagged-item-name">{stop.stop_name}</span>
                  <span className="flagged-item-id">Stop #{stop.stop_id}</span>
                </div>
              </div>
              <div className="flagged-item-right">
                <span className="flagged-badge">{stop.report_count} report{stop.report_count !== 1 ? 's' : ''}</span>
                <span className={`flagged-chevron ${expanded === stop.stop_id ? 'open' : ''}`}>▸</span>
              </div>
            </div>

            {expanded === stop.stop_id && (
              <div className="flagged-reports">
                {reportsLoading === stop.stop_id && (
                  <div className="flagged-reports-loading"><span className="stops-spinner"></span></div>
                )}

                {reports[stop.stop_id] && reports[stop.stop_id].length === 0 && (
                  <div className="flagged-reports-empty">No reports found</div>
                )}

                {reports[stop.stop_id] && reports[stop.stop_id].map(r => (
                  <div key={r.id} className="flagged-report-card">
                    <div className="flagged-report-top">
                      <span className="flagged-report-type" style={{ background: getTypeColor(r.issue_type) + '22', color: getTypeColor(r.issue_type) }}>
                        {getTypeIcon(r.issue_type)} {r.issue_type}
                      </span>
                      <span className="flagged-report-date">
                        {new Date(r.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {r.description && <p className="flagged-report-desc">{r.description}</p>}
                    {r.photo_url && <img src={r.photo_url} alt="Report" className="flagged-report-photo" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
