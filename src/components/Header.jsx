import React from 'react'

const viewTitles = {
  dashboard: 'Dashboard',
  flagged: 'Flagged Stops',
  reports: 'Hazard Reports',
  analytics: 'Analytics',
  insights: 'Predictive Insights',
}

const viewBreadcrumbs = {
  dashboard: 'DRT Ops / Overview',
  flagged: 'DRT Ops / Flagged Stops',
  reports: 'DRT Ops / Reports',
  analytics: 'DRT Ops / Analytics',
  insights: 'DRT Ops / Intelligence',
}

export default function Header({ activeView }) {
  return (
    <header className="header">
      <div className="header-left">
        <h2>{viewTitles[activeView] || 'Dashboard'}</h2>
        <div className="breadcrumb">
          {viewBreadcrumbs[activeView] || 'DRT Ops / Overview'}
        </div>
      </div>

      <div className="header-search">
        <span className="search-icon">🔍</span>
        <input type="text" placeholder="Search reports, stops, locations…" />
      </div>

      <div className="header-right">
        <button className="header-btn" title="Pending Reports">📋</button>
        <button className="header-btn" title="Notifications">🔔</button>
        <button className="header-btn" title="Help">❓</button>
      </div>
    </header>
  )
}
