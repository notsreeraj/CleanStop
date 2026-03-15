import React from 'react'

const navItems = [
  { section: 'Operations' },
  { icon: '📊', label: 'Dashboard', view: 'dashboard' },
  { icon: '📋', label: 'Reports', view: 'reports', badgeKey: 'pending' },
  { icon: '🗺️', label: 'Map View', view: 'dashboard', badge: 'Live', badgeClass: 'green' },
  { section: 'Intelligence' },
  { icon: '🔮', label: 'Predictive Insights', view: 'insights' },
  { icon: '📈', label: 'Analytics', view: 'dashboard' },
  { section: 'System' },
  { icon: '⚙️', label: 'Settings', view: 'dashboard' },
  { icon: '👥', label: 'Team', view: 'dashboard' },
]

export default function Sidebar({ activeView, onViewChange }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">🚌</div>
        <div>
          <h1>DRT Ops</h1>
          <span>Maintenance Hub</span>
        </div>
      </div>

      {navItems.map((item, i) =>
        item.section ? (
          <div key={i} className="sidebar-section-label">{item.section}</div>
        ) : (
          <button
            key={i}
            className={`sidebar-link${activeView === item.view && item.label !== 'Map View' && item.label !== 'Analytics' && item.label !== 'Settings' && item.label !== 'Team' ? ' active' : ''}`}
            onClick={() => onViewChange(item.view)}
          >
            <span className="link-icon">{item.icon}</span>
            <span>{item.label}</span>

            {item.badge && (
              <span className={`badge ${item.badgeClass || ''}`}>{item.badge}</span>
            )}
          </button>
        )
      )}

      <div className="sidebar-footer">
        <div className="avatar">AD</div>
        <div className="user-info">
          <span className="name">Admin User</span>
          <span className="role">DRT Maintenance</span>
        </div>
      </div>
    </aside>
  )
}
