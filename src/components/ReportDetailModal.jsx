import React from 'react'
import { categoryLabels, categoryColors } from '../data/mockData'

function formatDate(ts) {
  return new Date(ts).toLocaleString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export default function ReportDetailModal({ report, onClose, onApprove, onDismiss }) {
  if (!report) return null

  const confidenceClass = report.aiConfidence >= 85 ? 'high' : report.aiConfidence >= 70 ? 'medium' : 'low'
  const isPending = report.status === 'pending'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>{report.id} — {report.title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <img className="modal-image" src={report.image} alt={report.title} />

          <div className="modal-info-grid">
            <div className="modal-info-item">
              <span className="info-label">Category</span>
              <span className="info-value" style={{ color: categoryColors[report.category] }}>
                {categoryLabels[report.category]}
              </span>
            </div>
            <div className="modal-info-item">
              <span className="info-label">Status</span>
              <span className={`badge-status ${report.status}`} style={{ fontSize: 12, padding: '3px 10px' }}>
                {report.status}
              </span>
            </div>
            <div className="modal-info-item">
              <span className="info-label">Bus Stop</span>
              <span className="info-value">{report.stopName} ({report.stopId})</span>
            </div>
            <div className="modal-info-item">
              <span className="info-label">Reported</span>
              <span className="info-value">{formatDate(report.timestamp)}</span>
            </div>
            <div className="modal-info-item">
              <span className="info-label">Reporter</span>
              <span className="info-value">{report.reporterName}</span>
            </div>
            <div className="modal-info-item">
              <span className="info-label">Coordinates</span>
              <span className="info-value" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {report.coords[0].toFixed(4)}, {report.coords[1].toFixed(4)}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <span className="info-label" style={{ display: 'block', marginBottom: 6 }}>Description</span>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
              {report.description}
            </p>
          </div>

          {/* AI Analysis */}
          <div className="ai-analysis-box">
            <div className="ai-header">
              <h4>🤖 AI Analysis</h4>
              <span className={`ai-confidence ${confidenceClass}`}>
                {report.aiConfidence}% confidence
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`badge-verdict ${report.aiVerdict}`} style={{ fontSize: 12, padding: '4px 12px' }}>
                {report.aiVerdict === 'supported' ? '✓ Supported' : '✗ Dismissed'}
              </span>
            </div>
            <p className="ai-reason">{report.aiReason}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          {isPending && (
            <>
              <button className="btn btn-primary" onClick={() => onApprove(report.id)}>
                ✓ Approve & Generate Maintenance Request
              </button>
              <button className="btn btn-danger" onClick={() => onDismiss(report.id)}>
                ✗ Dismiss Report
              </button>
            </>
          )}
          {!isPending && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              This report has already been {report.status}.
            </span>
          )}
          <button className="btn btn-secondary" onClick={onClose} style={{ marginLeft: 'auto' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
