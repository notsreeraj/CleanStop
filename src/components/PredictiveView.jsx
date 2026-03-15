import React, { useState } from 'react'
import { monthlyTrends, categoryDistribution, partsForecast, fleetMetrics, categoryColors, mockWeatherData } from '../data/mockData'

// Helper for weather icons
const getWeatherIcon = (condition) => {
  switch (condition.toLowerCase()) {
    case 'snow': return '❄️';
    case 'ice': return '🧊';
    case 'rain': return '🌧️';
    case 'clear': return '☀️';
    case 'cloudy': return '☁️';
    default: return '🌤️';
  }
}

export default function PredictiveView() {
  const [weatherTab, setWeatherTab] = useState('future') // 'past' or 'future'
  const maxReports = Math.max(...monthlyTrends.map(m => m.reports))

  const activeWeatherData = mockWeatherData[weatherTab]

  return (
    <div className="predictive-view">
      {/* Fleet Overview */}
      <div className="chart-card">
        <h3>🚌 Fleet Overview</h3>
        <div className="fleet-overview">
          <div className="fleet-stat">
            <span className="fs-value" style={{ color: 'var(--text-primary)' }}>{fleetMetrics.totalBuses}</span>
            <span className="fs-label">Total Fleet</span>
          </div>
          <div className="fleet-stat">
            <span className="fs-value" style={{ color: 'var(--accent-green)' }}>{fleetMetrics.operational}</span>
            <span className="fs-label">Operational</span>
          </div>
          <div className="fleet-stat">
            <span className="fs-value" style={{ color: 'var(--accent-amber)' }}>{fleetMetrics.inMaintenance}</span>
            <span className="fs-label">In Maintenance</span>
          </div>
          <div className="fleet-stat">
            <span className="fs-value" style={{ color: 'var(--accent-rose)' }}>{fleetMetrics.outOfService}</span>
            <span className="fs-label">Out of Service</span>
          </div>
        </div>
      </div>

      <div className="predictive-grid">
        {/* Weather Predictions */}
        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header-flex">
            <h3>🌦️ Weather & Hazard Predictions</h3>
            <div className="weather-toggle">
              <button 
                className={`weather-btn ${weatherTab === 'past' ? 'active' : ''}`}
                onClick={() => setWeatherTab('past')}
              >
                Past 5 Days
              </button>
              <button 
                className={`weather-btn ${weatherTab === 'future' ? 'active' : ''}`}
                onClick={() => setWeatherTab('future')}
              >
                Next 5 Days
              </button>
            </div>
          </div>
          <div className="weather-cards-container">
            {activeWeatherData.map((day, i) => (
              <div key={i} className="weather-day-card">
                <div className="wd-date">{day.date}</div>
                <div className="wd-icon">{getWeatherIcon(day.condition)}</div>
                <div className="wd-temp">{day.temp}</div>
                <div className="wd-details">
                  <span>{day.condition}</span>
                  <span className="wd-precip">{day.precip}</span>
                </div>
                <div className={`wd-risk risk-${day.risk.toLowerCase()}`}>
                  {day.risk} Risk
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="chart-card">
          <h3>📈 Monthly Report Trend</h3>
          <div className="bar-chart">
            {monthlyTrends.map((m, i) => (
              <div key={i} className="bar-col">
                <div
                  className="bar-fill"
                  style={{ height: `${(m.reports / maxReports) * 100}%` }}
                >
                  <span className="bar-value">{m.reports}</span>
                </div>
                <span className="bar-label">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="chart-card">
          <h3>📊 Category Breakdown</h3>
          <div className="horiz-bars">
            {categoryDistribution.map((c, i) => (
              <div key={i} className="horiz-bar-row">
                <div className="horiz-bar-header">
                  <span className="hb-label">{c.label}</span>
                  <span className="hb-value">{c.count} reports ({c.pct}%)</span>
                </div>
                <div className="horiz-bar-track">
                  <div
                    className="horiz-bar-fill"
                    style={{
                      width: `${c.pct}%`,
                      background: categoryColors[c.category]
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Parts Forecast Table */}
      <div className="chart-card">
        <h3>🔮 Predicted Parts Requirements</h3>
        <table className="parts-table">
          <thead>
            <tr>
              <th>Part</th>
              <th>Current Stock</th>
              <th>30-Day Need</th>
              <th>60-Day Need</th>
              <th>90-Day Need</th>
              <th>Urgency</th>
            </tr>
          </thead>
          <tbody>
            {partsForecast.map((p, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{p.part}</td>
                <td>{p.current}</td>
                <td style={{
                  color: p.needed30 > p.current ? 'var(--accent-rose)' : 'var(--text-primary)',
                  fontWeight: p.needed30 > p.current ? 700 : 400
                }}>
                  {p.needed30}
                  {p.needed30 > p.current && ' ⚠️'}
                </td>
                <td>{p.needed60}</td>
                <td>{p.needed90}</td>
                <td>
                  <span className={`urgency-dot ${p.urgency}`}></span>
                  {p.urgency.charAt(0).toUpperCase() + p.urgency.slice(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
