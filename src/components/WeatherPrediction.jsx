import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

const RISK_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#a3a3a3',
  normal: '#525252',
}
const RISK_LABELS = { high: 'High', medium: 'Medium', low: 'Low', normal: 'Normal' }

const WINDOWS = [
  { key: '3h', label: 'Next 3H', snowField: 'snowfall_3h', riskField: 'risk_3h' },
  { key: '6h', label: 'Next 6H', snowField: 'snowfall_6h', riskField: 'risk_6h' },
  { key: '12h', label: 'Next 12H', snowField: 'snowfall_12h', riskField: 'risk_12h' },
]

const VISIBILITY_FILTERS = [
  { key: 'high', label: 'High Risk Only' },
  { key: 'medium+', label: 'Medium & High' },
  { key: 'all', label: 'All Stops' },
]

// Cluster nearby markers at low zoom to keep the map fast
function clusterStops(stops, zoom) {
  if (zoom >= 12) return stops.map(s => ({ ...s, _cluster: false, _count: 1 }))

  const precision = zoom < 8 ? 0.5 : zoom < 10 ? 0.2 : 0.1
  const buckets = {}
  for (const s of stops) {
    const key = `${Math.round(s.lat / precision) * precision}_${Math.round(s.lon / precision) * precision}`
    if (!buckets[key]) {
      buckets[key] = { lat: 0, lon: 0, stops: [], highCount: 0, medCount: 0 }
    }
    const b = buckets[key]
    b.lat += s.lat
    b.lon += s.lon
    b.stops.push(s)
    if (s._risk === 'high') b.highCount++
    if (s._risk === 'medium') b.medCount++
  }

  const result = []
  for (const b of Object.values(buckets)) {
    const n = b.stops.length
    if (n === 1) {
      result.push({ ...b.stops[0], _cluster: false, _count: 1 })
    } else {
      // Cluster: pick the highest-risk color
      const color = b.highCount > 0 ? RISK_COLORS.high : b.medCount > 0 ? RISK_COLORS.medium : RISK_COLORS.normal
      result.push({
        stop_id: `cluster_${b.stops[0].stop_id}`,
        stop_name: `${n} stops`,
        lat: b.lat / n,
        lon: b.lon / n,
        _cluster: true,
        _count: n,
        _color: color,
        _highCount: b.highCount,
        _medCount: b.medCount,
      })
    }
  }
  return result
}

const PAGE_SIZE = 50

export default function WeatherPrediction() {
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [window_, setWindow_] = useState('3h')
  const [visibility, setVisibility] = useState('high')
  const [selectedStop, setSelectedStop] = useState(null)
  const [zoom, setZoom] = useState(9)
  const [tablePage, setTablePage] = useState(0)
  const mapRef = useRef(null)

  // Fetch predictions
  useEffect(() => {
    setLoading(true)
    fetch(`${API_BASE}/weather/predictions`)
      .then(res => {
        if (!res.ok) throw new Error(`Server ${res.status}`)
        return res.json()
      })
      .then(data => { setPredictions(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  const win = WINDOWS.find(w => w.key === window_)

  // Tag each stop with current window's risk/snowfall for easy access
  const taggedStops = useMemo(() => {
    return predictions.map(s => ({
      ...s,
      _snowfall: s[win.snowField],
      _risk: s[win.riskField],
    }))
  }, [predictions, win])

  // Summary stats
  const summary = useMemo(() => {
    const counts = { total: taggedStops.length, high: 0, medium: 0, low: 0, normal: 0 }
    for (const s of taggedStops) counts[s._risk] = (counts[s._risk] || 0) + 1
    return counts
  }, [taggedStops])

  // Filtered for map markers based on visibility
  const mapStops = useMemo(() => {
    let filtered = taggedStops
    if (visibility === 'high') filtered = taggedStops.filter(s => s._risk === 'high')
    else if (visibility === 'medium+') filtered = taggedStops.filter(s => s._risk === 'high' || s._risk === 'medium')
    return filtered
  }, [taggedStops, visibility])

  // Clustered markers
  const clustered = useMemo(() => clusterStops(mapStops, zoom), [mapStops, zoom])

  // Table: high-risk stops sorted by snowfall desc
  const tableStops = useMemo(() => {
    return taggedStops
      .filter(s => s._risk === 'high')
      .sort((a, b) => b._snowfall - a._snowfall)
  }, [taggedStops])

  const totalPages = Math.max(1, Math.ceil(tableStops.length / PAGE_SIZE))
  const pagedStops = tableStops.slice(tablePage * PAGE_SIZE, (tablePage + 1) * PAGE_SIZE)

  // Reset page when window changes
  useEffect(() => { setTablePage(0) }, [window_])

  const handleMapMove = useCallback((evt) => {
    setZoom(evt.viewState.zoom)
  }, [])

  // Fly to stop from table click
  const flyToStop = useCallback((stop) => {
    setSelectedStop(stop)
    if (mapRef.current) {
      const map = mapRef.current.getMap ? mapRef.current.getMap() : mapRef.current
      map.flyTo({ center: [stop.lon, stop.lat], zoom: 14, duration: 800 })
    }
  }, [])

  if (loading) {
    return (
      <div className="wp-section">
        <div className="wp-header">
          <h3><span className="wp-icon">❄️</span> Weather Prediction</h3>
        </div>
        <div className="flagged-empty"><span className="stops-spinner"></span> Loading weather forecasts…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="wp-section">
        <div className="wp-header">
          <h3><span className="wp-icon">❄️</span> Weather Prediction</h3>
        </div>
        <div className="flagged-empty" style={{ color: 'var(--accent-rose)' }}>⚠ Failed to load weather data: {error}</div>
      </div>
    )
  }

  return (
    <div className="wp-section">
      {/* Header */}
      <div className="wp-header">
        <div className="wp-title-row">
          <h3><span className="wp-icon">❄️</span> Weather Prediction</h3>
          <span className="wp-subtitle">Snowfall risk analysis for bus stops using Open-Meteo forecasts</span>
        </div>
        <div className="wp-controls">
          <div className="wp-window-pills">
            {WINDOWS.map(w => (
              <button
                key={w.key}
                className={`wp-pill${window_ === w.key ? ' active' : ''}`}
                onClick={() => setWindow_(w.key)}
              >
                {w.label}
              </button>
            ))}
          </div>
          <div className="wp-vis-pills">
            {VISIBILITY_FILTERS.map(f => (
              <button
                key={f.key}
                className={`wp-pill wp-pill-sm${visibility === f.key ? ' active' : ''}`}
                onClick={() => setVisibility(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="wp-summary-cards">
        <div className="wp-card wp-card-total">
          <div className="wp-card-value">{summary.total}</div>
          <div className="wp-card-label">Total Stops</div>
        </div>
        <div className="wp-card wp-card-high">
          <div className="wp-card-value">{summary.high}</div>
          <div className="wp-card-label">High Risk</div>
        </div>
        <div className="wp-card wp-card-medium">
          <div className="wp-card-value">{summary.medium}</div>
          <div className="wp-card-label">Medium Risk</div>
        </div>
        <div className="wp-card wp-card-normal">
          <div className="wp-card-value">{summary.normal + summary.low}</div>
          <div className="wp-card-label">Normal / Low</div>
        </div>
      </div>

      {/* Map + Table layout */}
      <div className="wp-main-grid">
        {/* Map */}
        <div className="wp-map-wrap">
          <div className="map-container">
            <div className="map-title-bar">
              <h3>🌨️ Snowfall Risk Map — {win.label}</h3>
              <div className="map-legend">
                <div className="legend-item"><span className="legend-dot" style={{ background: RISK_COLORS.high }}></span>High</div>
                <div className="legend-item"><span className="legend-dot" style={{ background: RISK_COLORS.medium }}></span>Medium</div>
                <div className="legend-item"><span className="legend-dot" style={{ background: RISK_COLORS.normal }}></span>Normal</div>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{mapStops.length} stops shown</span>
              </div>
            </div>
            <Map
              ref={mapRef}
              initialViewState={{ latitude: 43.9, longitude: -78.9, zoom: 9 }}
              style={{ width: '100%', height: '100%' }}
              mapStyle={MAP_STYLE}
              onMove={handleMapMove}
            >
              <NavigationControl position="top-left" />

              {clustered.map(s => (
                <Marker
                  key={s.stop_id}
                  latitude={s.lat}
                  longitude={s.lon}
                  anchor="center"
                  onClick={e => {
                    e.originalEvent.stopPropagation()
                    if (!s._cluster) setSelectedStop(s)
                  }}
                >
                  {s._cluster ? (
                    <div
                      className="wp-cluster-marker"
                      style={{ background: s._color, borderColor: s._color }}
                      title={`${s._count} stops (${s._highCount} high, ${s._medCount} medium)`}
                    >
                      {s._count}
                    </div>
                  ) : (
                    <div
                      style={{
                        width: s._risk === 'high' ? 14 : s._risk === 'medium' ? 11 : 8,
                        height: s._risk === 'high' ? 14 : s._risk === 'medium' ? 11 : 8,
                        borderRadius: '50%',
                        background: RISK_COLORS[s._risk] || RISK_COLORS.normal,
                        border: '1.5px solid rgba(255,255,255,0.7)',
                        cursor: 'pointer',
                        boxShadow: s._risk === 'high' ? '0 0 8px rgba(239,68,68,0.6)' : 'none',
                      }}
                      title={`${s.stop_name} — ${s._snowfall} cm (${RISK_LABELS[s._risk]})`}
                    />
                  )}
                </Marker>
              ))}

              {selectedStop && (
                <Popup
                  latitude={selectedStop.lat}
                  longitude={selectedStop.lon}
                  anchor="bottom"
                  onClose={() => setSelectedStop(null)}
                  closeButton={true}
                  className="map-popup"
                >
                  <div style={{ minWidth: 200 }}>
                    <strong style={{ fontSize: 14, color: '#f1f5f9' }}>{selectedStop.stop_name}</strong>
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Stop #{selectedStop.stop_id}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        {selectedStop.lat.toFixed(4)}, {selectedStop.lon.toFixed(4)}
                      </span>
                      <div style={{ marginTop: 4, fontSize: 12 }}>
                        <span style={{ fontWeight: 700, color: '#e2e8f0' }}>Forecast: </span>
                        <span style={{ color: '#e2e8f0' }}>{win.label}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#60a5fa' }}>
                        {selectedStop._snowfall} cm snowfall
                      </div>
                      <span
                        className={`wp-risk-tag wp-risk-${selectedStop._risk}`}
                        style={{ alignSelf: 'flex-start', marginTop: 2 }}
                      >
                        {RISK_LABELS[selectedStop._risk]} Risk
                      </span>
                    </div>
                  </div>
                </Popup>
              )}
            </Map>
          </div>
        </div>

        {/* High-Risk Table */}
        <div className="wp-table-wrap">
          <div className="wp-table-header">
            <h4>🔴 High-Risk Stops</h4>
            <span className="wp-table-count">{tableStops.length} stops</span>
          </div>
          {tableStops.length === 0 ? (
            <div className="wp-table-empty">No high-risk stops for this forecast window.</div>
          ) : (
            <>
              <div className="wp-table-scroll">
                <table className="wp-table">
                  <thead>
                    <tr>
                      <th>Stop ID</th>
                      <th>Stop Name</th>
                      <th>Lat</th>
                      <th>Lon</th>
                      <th>Window</th>
                      <th>Snow (cm)</th>
                      <th>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedStops.map(s => (
                      <tr
                        key={s.stop_id}
                        className="wp-table-row"
                        onClick={() => flyToStop(s)}
                      >
                        <td className="wp-td-id">#{s.stop_id}</td>
                        <td className="wp-td-name">{s.stop_name}</td>
                        <td className="wp-td-coord">{s.lat.toFixed(4)}</td>
                        <td className="wp-td-coord">{s.lon.toFixed(4)}</td>
                        <td>{win.label}</td>
                        <td className="wp-td-snow">{s._snowfall}</td>
                        <td>
                          <span className={`wp-risk-tag wp-risk-${s._risk}`}>
                            {RISK_LABELS[s._risk]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="wp-pagination">
                  <button disabled={tablePage === 0} onClick={() => setTablePage(p => p - 1)}>← Prev</button>
                  <span>Page {tablePage + 1} of {totalPages}</span>
                  <button disabled={tablePage >= totalPages - 1} onClick={() => setTablePage(p => p + 1)}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
