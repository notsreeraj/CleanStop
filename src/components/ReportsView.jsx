import React, { useState } from 'react'
import { categoryLabels, categoryColors } from '../data/mockData'

function timeAgo(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ReportsView({ reports, onReportClick }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [verdictFilter, setVerdictFilter] = useState('all')

  const filtered = reports.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false
    if (verdictFilter !== 'all' && r.aiVerdict !== verdictFilter) return false
    return true
  })

  return (
    <div className="reports-view">
      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Category</label>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="snow">❄️ Snow / Ice</option>
            <option value="debris">🗑️ Debris / Glass</option>
            <option value="damage">🔨 Damage</option>
            <option value="obstruction">🚧 Obstruction</option>
          </select>
        </div>
        <div className="filter-group">
          <label>AI Verdict</label>
          <select value={verdictFilter} onChange={e => setVerdictFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="supported">Supported</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
          Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> of {reports.length} reports
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="reports-grid">
        {filtered.map(r => (
          <div key={r.id} className="report-card" onClick={() => onReportClick(r)}>
            <img className="card-image" src={r.image} alt={r.title} loading="lazy" />
            <div className="card-body">
              <div className="card-title">{r.title}</div>
              <div className="card-desc">{r.description}</div>
              <div className="card-badges">
                <span className="badge-category" style={{
                  background: `${categoryColors[r.category]}22`,
                  color: categoryColors[r.category]
                }}>
                  {categoryLabels[r.category]}
                </span>
                <span className={`badge-verdict ${r.aiVerdict}`}>
                  🤖 {r.aiVerdict} ({r.aiConfidence}%)
                </span>
                <span className={`badge-status ${r.status}`}>{r.status}</span>
              </div>
              <div className="card-footer">
                <span>📍 {r.stopName}</span>
                <span>{timeAgo(r.timestamp)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
