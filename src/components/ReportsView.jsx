import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const issueIcons = {
  'Snow / Ice': '❄️',
  'Debris': '🗑️',
  'Structural Damage': '🔧',
  'Obstruction': '🚧',
}
const issueColors = {
  'Snow / Ice': '#60a5fa',
  'Debris': '#fbbf24',
  'Structural Damage': '#fb7185',
  'Obstruction': '#fb923c',
}
const statusColors = {
  open: '#f59e0b',
  in_progress: '#60a5fa',
  resolved: '#34d399',
  closed: '#94a3b8',
}
const statusLabels = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

function timeAgo(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ReportsView() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    fetch(`${API_BASE}/reports`)
      .then(res => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`)
        return res.json()
      })
      .then(data => { setReports(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  function handleStatusChange(reportId, newStatus) {
    fetch(`${API_BASE}/reports/${reportId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to update status')
        return res.json()
      })
      .then(() => {
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r))
      })
      .catch(() => {})
  }

  const filtered = reports
    .filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (categoryFilter !== 'all' && r.issue_type !== categoryFilter) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sortBy === 'stop') return a.stop_name.localeCompare(b.stop_name)
      return 0
    })

  if (loading) {
    return (
      <div className="reports-view">
        <div className="flagged-empty"><span className="stops-spinner"></span> Loading reports…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="reports-view">
        <div className="flagged-empty" style={{ color: 'var(--accent-rose)' }}>⚠ {error}</div>
      </div>
    )
  }

  return (
    <div className="reports-view">
      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Category</label>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="Snow / Ice">❄️ Snow / Ice</option>
            <option value="Debris">🗑️ Debris</option>
            <option value="Structural Damage">🔧 Structural Damage</option>
            <option value="Obstruction">🚧 Obstruction</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Sort</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="stop">By Stop Name</option>
          </select>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
          Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> of {reports.length} reports
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="reports-grid">
        {filtered.map(r => (
          <div key={r.id} className="report-card">
            {r.photo_url ? (
              <img className="card-image" src={r.photo_url} alt={r.issue_type} loading="lazy" />
            ) : (
              <div className="card-image-placeholder">
                <span>{issueIcons[r.issue_type] || '📋'}</span>
              </div>
            )}
            <div className="card-body">
              <div className="card-title">
                {issueIcons[r.issue_type] || '📋'} {r.issue_type}
              </div>
              {r.description && (
                <div className="card-desc">{r.description}</div>
              )}
              <div className="card-badges">
                <span className="badge-category" style={{
                  background: `${issueColors[r.issue_type] || '#94a3b8'}22`,
                  color: issueColors[r.issue_type] || '#94a3b8',
                }}>
                  {r.issue_type}
                </span>
                <span className="badge-status-pill" style={{
                  background: `${statusColors[r.status] || '#94a3b8'}22`,
                  color: statusColors[r.status] || '#94a3b8',
                }}>
                  {statusLabels[r.status] || r.status}
                </span>
              </div>
              <div className="card-footer">
                <span>📍 {r.stop_name} (#{r.stop_id})</span>
                <span>{timeAgo(r.created_at)}</span>
              </div>
              <div className="card-status-control">
                <label>Status:</label>
                <select
                  value={r.status}
                  onChange={e => handleStatusChange(r.id, e.target.value)}
                  onClick={e => e.stopPropagation()}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
