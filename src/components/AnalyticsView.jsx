import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

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

const timeRanges = [
  { key: '3h',  label: '3H',  ms: 3 * 60 * 60 * 1000 },
  { key: '24h', label: '24H', ms: 24 * 60 * 60 * 1000 },
  { key: '7d',  label: '7D',   ms: 7 * 24 * 60 * 60 * 1000 },
  { key: '30d', label: '30D',  ms: 30 * 24 * 60 * 60 * 1000 },
  { key: '1y',  label: '1Y',   ms: 365 * 24 * 60 * 60 * 1000 },
]

export default function AnalyticsView() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('1y')
  const [exporting, setExporting] = useState(null)
  const chartRef = useRef(null)

  useEffect(() => {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
    fetch(`${API_BASE}/reports?since=${encodeURIComponent(oneYearAgo)}`)
      .then(res => res.json())
      .then(data => { setReports(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const chosen = timeRanges.find(t => t.key === range)
    if (!chosen) return reports
    const cutoff = Date.now() - chosen.ms
    return reports.filter(r => new Date(r.created_at).getTime() >= cutoff)
  }, [reports, range])

  const stats = useMemo(() => {
    const total = filtered.length
    const byStatus = { open: 0, in_progress: 0, resolved: 0, closed: 0 }
    const byCategory = {}
    const byDay = {}

    for (const r of filtered) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1

      byCategory[r.issue_type] = (byCategory[r.issue_type] || 0) + 1

      const day = new Date(r.created_at).toLocaleDateString('en-CA')
      byDay[day] = (byDay[day] || 0) + 1
    }

    // Sort days chronologically
    const sortedDays = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]))
    const maxDayCount = Math.max(...sortedDays.map(d => d[1]), 1)

    // Monthly aggregation (for 1Y line chart)
    const byMonth = {}
    for (const r of filtered) {
      const m = r.created_at.slice(0, 7) // 'YYYY-MM'
      byMonth[m] = (byMonth[m] || 0) + 1
    }
    const sortedMonths = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]))
    const maxMonthCount = Math.max(...sortedMonths.map(d => d[1]), 1)

    // Top 20 stops with detailed analytics
    const stopData = {}
    for (const r of filtered) {
      const sid = r.stop_id
      if (!stopData[sid]) {
        stopData[sid] = { name: r.stop_name, id: sid, total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0, cats: {} }
      }
      const sd = stopData[sid]
      sd.total++
      sd[r.status] = (sd[r.status] || 0) + 1
      sd.cats[r.issue_type] = (sd.cats[r.issue_type] || 0) + 1
    }
    // Top 20 stops ranked by open reports — Rapid Action for maintenance
    // Severity algorithm: weighted score = open×4 + inProgress×2 + categoryDiversity×3
    // Then normalized to 0-100 scale for severity classification
    const topStops = Object.values(stopData)
      .filter(s => s.open > 0)
      .map(s => {
        const catCount = Object.keys(s.cats).length
        const raw = s.open * 4 + s.in_progress * 2 + catCount * 3
        return { ...s, severity_raw: raw, catCount }
      })
      .sort((a, b) => b.open - a.open || b.severity_raw - a.severity_raw)
      .slice(0, 20)
    const maxSeverity = topStops.length > 0 ? topStops[0].severity_raw : 1
    const topStopsScored = topStops.map(s => ({
      ...s,
      severity_pct: (s.severity_raw / maxSeverity) * 100,
      severity: (s.severity_raw / maxSeverity) >= 0.75 ? 'critical'
        : (s.severity_raw / maxSeverity) >= 0.45 ? 'high'
        : (s.severity_raw / maxSeverity) >= 0.2 ? 'medium' : 'low'
    }))
    const maxOpenCount = topStops.length > 0 ? topStops[0].open : 1

    return { total, byStatus, byCategory, sortedDays, maxDayCount, sortedMonths, maxMonthCount, topStops: topStopsScored, maxOpenCount }
  }, [filtered])

  const rangeLabel = timeRanges.find(t => t.key === range)?.label || 'All Time'

  const exportCSV = useCallback(() => {
    setExporting('csv')
    const headers = ['ID','Stop ID','Stop Name','Category','Status','Description','Latitude','Longitude','Created At']
    const rows = filtered.map(r => [
      r.id, r.stop_id, `"${(r.stop_name || '').replace(/"/g, '""')}"`,
      r.issue_type, r.status,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      r.lat, r.lon, r.created_at,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cleanstop-reports-${range}-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(null)
  }, [filtered, range])

  const exportPDF = useCallback(async () => {
    if (!chartRef.current) return
    setExporting('pdf')
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const margin = 14
      const contentW = pageW - margin * 2

      const drawBg = () => { pdf.setFillColor(15, 23, 42); pdf.rect(0, 0, pageW, pageH, 'F') }
      const drawFooter = (pg, total) => {
        pdf.setFontSize(8); pdf.setTextColor(100, 116, 139)
        pdf.text(`CleanStop Analytics  |  Page ${pg} of ${total}`, pageW / 2, pageH - 6, { align: 'center' })
      }

      // Capture each section individually at high quality
      const sections = chartRef.current.querySelectorAll('.analytics-kpis, .analytics-card, .rapid-action-panel')
      const captures = []
      for (const el of sections) {
        const c = await html2canvas(el, { backgroundColor: '#0f172a', scale: 2, useCORS: true })
        captures.push(c)
      }

      // --- Page 1: Title + KPIs + Donut charts ---
      drawBg()
      pdf.setFillColor(30, 41, 59)
      pdf.roundedRect(margin, 8, contentW, 22, 4, 4, 'F')
      pdf.setTextColor(241, 245, 249); pdf.setFontSize(16)
      pdf.text('CleanStop Analytics Report', margin + 8, 21)
      pdf.setFontSize(9); pdf.setTextColor(148, 163, 184)
      pdf.text(`Period: ${rangeLabel}  |  Generated: ${new Date().toLocaleString()}  |  Total Reports: ${stats.total}`, margin + 8, 27)

      let cursorY = 36

      // KPIs (index 0)
      if (captures[0]) {
        const c = captures[0]
        const imgH = (c.height / c.width) * contentW
        const finalH = Math.min(imgH, 30)
        const finalW = (finalH / imgH) * contentW
        pdf.addImage(c.toDataURL('image/png'), 'PNG', margin + (contentW - finalW) / 2, cursorY, finalW, finalH)
        cursorY += finalH + 8
      }

      // Category donut (1) + Status donut (2) side by side
      if (captures[1] && captures[2]) {
        const halfW = (contentW - 6) / 2
        const availH = pageH - cursorY - 14
        for (let idx = 0; idx < 2; idx++) {
          const c = captures[idx + 1]
          const imgH = (c.height / c.width) * halfW
          const finalH = Math.min(imgH, availH)
          const finalW = (finalH / imgH) * halfW
          const x = margin + idx * (halfW + 6) + (halfW - finalW) / 2
          pdf.addImage(c.toDataURL('image/png'), 'PNG', x, cursorY, finalW, finalH)
        }
      }

      // --- Page 2: Reports Over Time ---
      if (captures[3]) {
        pdf.addPage(); drawBg()
        pdf.setTextColor(241, 245, 249); pdf.setFontSize(14)
        pdf.text('Reports Over Time', margin, 18)
        const c = captures[3]
        const imgW = contentW
        const imgH = (c.height / c.width) * imgW
        const maxH = pageH - 32
        const finalH = Math.min(imgH, maxH)
        const finalW = (finalH / imgH) * imgW
        pdf.addImage(c.toDataURL('image/png'), 'PNG', margin + (contentW - finalW) / 2, 24, finalW, finalH)
      }

      // --- Page 3+: Rapid Action table (splits if tall) ---
      if (captures[4]) {
        pdf.addPage(); drawBg()
        pdf.setTextColor(241, 245, 249); pdf.setFontSize(14)
        pdf.text('Rapid Action \u2014 Maintenance Required', margin, 18)
        const c = captures[4]
        const imgW = contentW
        const imgH = (c.height / c.width) * imgW
        const maxH = pageH - 32
        if (imgH > maxH) {
          const totalSlices = Math.ceil(imgH / maxH)
          const sliceHPx = c.height / totalSlices
          for (let s = 0; s < totalSlices; s++) {
            if (s > 0) {
              pdf.addPage(); drawBg()
              pdf.setTextColor(241, 245, 249); pdf.setFontSize(14)
              pdf.text('Rapid Action \u2014 Maintenance Required (cont.)', margin, 18)
            }
            const sc = document.createElement('canvas')
            sc.width = c.width
            sc.height = Math.min(sliceHPx, c.height - s * sliceHPx)
            sc.getContext('2d').drawImage(c, 0, s * sliceHPx, c.width, sc.height, 0, 0, c.width, sc.height)
            const sh = (sc.height / c.width) * imgW
            pdf.addImage(sc.toDataURL('image/png'), 'PNG', margin, 24, imgW, sh)
          }
        } else {
          pdf.addImage(c.toDataURL('image/png'), 'PNG', margin, 24, imgW, imgH)
        }
      }

      // Page numbering on all pages
      const totalPages = pdf.getNumberOfPages()
      for (let p = 1; p <= totalPages; p++) { pdf.setPage(p); drawFooter(p, totalPages) }

      pdf.save(`cleanstop-analytics-${range}-${new Date().toISOString().slice(0,10)}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setExporting(null)
    }
  }, [range, rangeLabel, stats.total])

  if (loading) {
    return (
      <div className="analytics-view">
        <div className="flagged-empty"><span className="stops-spinner"></span> Loading analytics…</div>
      </div>
    )
  }

  return (
    <div className="analytics-view">
      {/* Time Range Filter */}
      <div className="analytics-filter-bar">
        <span className="filter-bar-label">Time Range</span>
        <div className="filter-pills">
          {timeRanges.map(t => (
            <button
              key={t.key}
              className={`filter-pill${range === t.key ? ' active' : ''}`}
              onClick={() => setRange(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="export-buttons">
          <button className="export-btn export-csv" onClick={exportCSV} disabled={!!exporting}>
            {exporting === 'csv' ? '⏳' : '📄'} CSV
          </button>
          <button className="export-btn export-pdf" onClick={exportPDF} disabled={!!exporting}>
            {exporting === 'pdf' ? '⏳' : '📑'} PDF
          </button>
        </div>
      </div>

      <div ref={chartRef}>

      {/* KPI Cards */}
      <div className="analytics-kpis">
        <div className="kpi-card">
          <div className="kpi-value">{stats.total}</div>
          <div className="kpi-label">Total Reports</div>
        </div>
        <div className="kpi-card kpi-open">
          <div className="kpi-value">{stats.byStatus.open}</div>
          <div className="kpi-label">Open</div>
        </div>
        <div className="kpi-card kpi-progress">
          <div className="kpi-value">{stats.byStatus.in_progress}</div>
          <div className="kpi-label">In Progress</div>
        </div>
        <div className="kpi-card kpi-resolved">
          <div className="kpi-value">{stats.byStatus.resolved}</div>
          <div className="kpi-label">Resolved</div>
        </div>
        <div className="kpi-card kpi-closed">
          <div className="kpi-value">{stats.byStatus.closed}</div>
          <div className="kpi-label">Closed</div>
        </div>
      </div>

      <div className="analytics-charts">
        {/* Reports by Category */}
        <div className="analytics-card analytics-card-donut">
          <h3>Reports by Category</h3>
          <div className="donut-chart-centered">
            <svg viewBox="0 0 120 120" className="donut-chart">
              {(() => {
                let offset = 0
                const radius = 45
                const circumference = 2 * Math.PI * radius
                return Object.entries(stats.byCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, count]) => {
                    if (count === 0) return null
                    const pct = count / stats.total
                    const dash = pct * circumference
                    const gap = circumference - dash
                    const el = (
                      <circle
                        key={cat}
                        cx="60" cy="60" r={radius}
                        fill="none"
                        stroke={issueColors[cat] || '#94a3b8'}
                        strokeWidth="14"
                        strokeDasharray={`${dash} ${gap}`}
                        strokeDashoffset={-offset}
                        style={{ transition: 'stroke-dasharray 0.5s' }}
                      />
                    )
                    offset += dash
                    return el
                  })
              })()}
              <text x="60" y="56" textAnchor="middle" fill="#f1f5f9" fontSize="22" fontWeight="700">
                {stats.total}
              </text>
              <text x="60" y="72" textAnchor="middle" fill="#94a3b8" fontSize="10">
                total
              </text>
            </svg>
            <div className="donut-legend-grid">
              {Object.entries(stats.byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => (
                  <div key={cat} className="legend-item">
                    <span className="legend-dot" style={{ background: issueColors[cat] || '#94a3b8' }} />
                    <span className="legend-text">{cat}</span>
                    <span className="legend-count">{count}</span>
                    <span className="legend-pct">{((count / stats.total) * 100).toFixed(1)}%</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Reports by Status */}
        <div className="analytics-card analytics-card-donut">
          <h3>Reports by Status</h3>
          <div className="donut-chart-centered">
            <svg viewBox="0 0 120 120" className="donut-chart">
              {(() => {
                let offset = 0
                const radius = 45
                const circumference = 2 * Math.PI * radius
                return Object.entries(stats.byStatus).map(([status, count]) => {
                  if (count === 0) return null
                  const pct = count / stats.total
                  const dash = pct * circumference
                  const gap = circumference - dash
                  const el = (
                    <circle
                      key={status}
                      cx="60" cy="60" r={radius}
                      fill="none"
                      stroke={statusColors[status]}
                      strokeWidth="14"
                      strokeDasharray={`${dash} ${gap}`}
                      strokeDashoffset={-offset}
                      style={{ transition: 'stroke-dasharray 0.5s' }}
                    />
                  )
                  offset += dash
                  return el
                })
              })()}
              <text x="60" y="56" textAnchor="middle" fill="#f1f5f9" fontSize="22" fontWeight="700">
                {stats.total}
              </text>
              <text x="60" y="72" textAnchor="middle" fill="#94a3b8" fontSize="10">
                total
              </text>
            </svg>
            <div className="donut-legend-grid">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <div key={status} className="legend-item">
                  <span className="legend-dot" style={{ background: statusColors[status] }} />
                  <span className="legend-text">{statusLabels[status]}</span>
                  <span className="legend-count">{count}</span>
                  <span className="legend-pct">{((count / stats.total) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reports Over Time */}
        <div className="analytics-card analytics-card-wide">
          <h3>Reports Over Time</h3>
          {range === '1y' && stats.sortedMonths.length > 1 ? (
            <div className="line-chart-wrapper">
              <svg viewBox="0 0 700 250" className="line-chart">
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Y-axis grid lines + labels */}
                {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                  const y = 200 - pct * 170
                  const val = Math.round(pct * stats.maxMonthCount)
                  return (
                    <g key={pct}>
                      <line x1="55" y1={y} x2="680" y2={y} stroke="#1e293b" strokeWidth="1" />
                      <text x="48" y={y + 4} textAnchor="end" fill="#64748b" fontSize="11">{val}</text>
                    </g>
                  )
                })}
                {/* Curve */}
                {(() => {
                  const n = stats.sortedMonths.length
                  const pts = stats.sortedMonths.map(([, c], i) => ({
                    x: 55 + (i / (n - 1)) * 625,
                    y: 200 - (c / stats.maxMonthCount) * 170,
                  }))
                  let d = `M${pts[0].x},${pts[0].y}`
                  for (let i = 0; i < pts.length - 1; i++) {
                    const cx = (pts[i].x + pts[i + 1].x) / 2
                    d += ` C${cx},${pts[i].y} ${cx},${pts[i + 1].y} ${pts[i + 1].x},${pts[i + 1].y}`
                  }
                  const area = d + ` L${pts[n - 1].x},200 L${pts[0].x},200 Z`
                  return (
                    <>
                      <path d={area} fill="url(#lineGrad)" />
                      <path d={d} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
                      {pts.map((p, i) => (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r="5" fill="#0f172a" stroke="#34d399" strokeWidth="2.5" />
                          <text x={p.x} y={p.y - 12} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="700">
                            {stats.sortedMonths[i][1]}
                          </text>
                        </g>
                      ))}
                    </>
                  )
                })()}
                {/* X-axis month labels */}
                {stats.sortedMonths.map(([month], i) => {
                  const x = 55 + (i / (stats.sortedMonths.length - 1)) * 625
                  const d = new Date(month + '-01')
                  const label = d.toLocaleString('en', { month: 'short', year: '2-digit' })
                  return (
                    <text key={month} x={x} y="220" textAnchor="middle" fill="#94a3b8" fontSize="11">
                      {label}
                    </text>
                  )
                })}
              </svg>
            </div>
          ) : (
            <div className="timeline-chart">
              {stats.sortedDays.map(([day, count]) => (
                <div key={day} className="timeline-bar-col">
                  <div className="timeline-bar-wrapper">
                    <div
                      className="timeline-bar"
                      style={{ height: `${(count / stats.maxDayCount) * 100}%` }}
                    />
                  </div>
                  <span className="timeline-label">{day.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== RAPID ACTION PANEL ===== */}
        <div className="rapid-action-panel">
          <div className="rapid-action-header">
            <div className="rapid-action-title-row">
              <span className="rapid-action-icon">⚠</span>
              <h3>Rapid Action — Maintenance Required</h3>
            </div>
            <p className="rapid-action-desc">Top 20 stops ranked by <strong>open reports</strong>. Severity is calculated from open issues, in-progress workload, and category diversity.</p>
            <div className="rapid-action-legend">
              <span className="ra-legend-item sev-critical">● Critical</span>
              <span className="ra-legend-item sev-high">● High</span>
              <span className="ra-legend-item sev-medium">● Medium</span>
              <span className="ra-legend-item sev-low">● Low</span>
            </div>
          </div>
          <div className="priority-table-wrap">
            <table className="priority-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Stop</th>
                  <th>Open</th>
                  <th>In Prog</th>
                  <th>Resolved</th>
                  <th>Issues</th>
                  <th>Severity</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.topStops.map((s, i) => (
                  <tr key={s.id} className={`priority-row priority-${s.severity}`}>
                    <td className="rank-cell">
                      <span className={`rank-badge rank-${i < 3 ? 'top' : 'normal'}`}>{i + 1}</span>
                    </td>
                    <td className="stop-name-cell">
                      <span className="stop-name">{s.name}</span>
                      <span className="stop-id">#{s.id}</span>
                    </td>
                    <td className="num-cell status-open-cell"><strong>{s.open}</strong></td>
                    <td className="num-cell status-prog-cell">{s.in_progress || '—'}</td>
                    <td className="num-cell status-res-cell">{s.resolved || '—'}</td>
                    <td className="cats-cell">
                      <div className="cat-pills">
                        {Object.entries(s.cats).sort((a, b) => b[1] - a[1]).map(([cat, c]) => (
                          <span key={cat} className="cat-mini-pill" style={{ background: issueColors[cat] || '#94a3b8' }}>
                            {cat.split(' ')[0]} {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="severity-cell">
                      <div className="severity-meter">
                        <div className="severity-bar-bg">
                          <div className={`severity-bar-fill sev-${s.severity}`} style={{ width: `${s.severity_pct}%` }} />
                        </div>
                        <span className={`severity-badge sev-${s.severity}`}>{s.severity.toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="action-cell">
                      <span className={`action-tag action-${s.severity}`}>
                        {s.severity === 'critical' ? 'Dispatch Now' : s.severity === 'high' ? 'Schedule' : s.severity === 'medium' ? 'Monitor' : 'Review'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>{/* end chartRef */}
    </div>
  )
}
