import React from 'react'

const viewTitles = {
  dashboard: 'Dashboard',
  reports: 'Hazard Reports',
  insights: 'Predictive Insights',
}

const viewBreadcrumbs = {
  dashboard: 'DRT Ops / Overview',
  reports: 'DRT Ops / Reports',
  insights: 'DRT Ops / Intelligence',
}

export default function Header({ activeView, pendingCount }) {
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
        <button className="header-btn" title="Pending Reports">
          📋
          {pendingCount > 0 && <span className="notif-dot"></span>}
        </button>
        <button className="header-btn" title="Notifications">🔔</button>
        <button className="header-btn" title="Help">❓</button>
      </div>
    </header>
  )
}
