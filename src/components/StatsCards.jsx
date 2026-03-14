import React from 'react'

export default function StatsCards({ counts }) {
  const stats = [
    { label: 'Open Reports', value: counts.pending, change: `${counts.total} total`, direction: 'down', icon: '🚨' },
    { label: 'Avg Response Time', value: '2.4h', change: '-18% this week', direction: 'up', icon: '⏱️' },
    { label: 'Fleet Uptime', value: '93.3%', change: '+1.2% this month', direction: 'up', icon: '🚌' },
    { label: 'AI Accuracy', value: '89%', change: `${counts.aiSupported}/${counts.total} supported`, direction: 'up', icon: '🤖' },
  ]

  return (
    <div className="stats-grid">
      {stats.map((s, i) => (
        <div key={i} className="stat-card">
          <div className="card-header">
            <span className="label">{s.label}</span>
            <span className="icon-wrap">{s.icon}</span>
          </div>
          <div className="value">{s.value}</div>
          <div className={`change ${s.direction}`}>
            {s.direction === 'up' ? '↑' : '↓'} {s.change}
          </div>
        </div>
      ))}
    </div>
  )
}
