import React from 'react'
import { categoryLabels } from '../data/mockData'

function timeAgo(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ReportsFeed({ reports, onReportClick, onViewAll }) {
  return (
    <div className="reports-panel">
      <div className="panel-header">
        <h3>Incoming Reports</h3>
        <button className="see-all" onClick={onViewAll}>View all →</button>
      </div>
      <div className="report-feed">
        {reports.slice(0, 8).map((r) => (
          <div key={r.id} className="report-feed-item" onClick={() => onReportClick(r)}>
            <img className="feed-img" src={r.image} alt={r.title} loading="lazy" />
            <div className="feed-content">
              <span className="feed-title">{r.title}</span>
              <div className="feed-meta">
                <span className={`badge-verdict ${r.aiVerdict}`}>
                  {r.aiVerdict === 'supported' ? '✓' : '✗'} {r.aiVerdict}
                </span>
                <span className={`badge-status ${r.status}`}>{r.status}</span>
              </div>
              <span className="feed-time">{r.stopName} · {timeAgo(r.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
