import { useEffect, useRef } from 'react'
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

const issueColors = {
  'Snow / Ice': '#60a5fa',
  'Debris': '#f59e0b',
  'Structural Damage': '#ef4444',
  'Obstruction': '#a78bfa',
}
const defaultColor = '#94a3b8'

export default function CanadaMap({ reports, stops, showAllStops, loading, error, selectedReport, onReportSelect }) {
  const mapRef = useRef(null)

  // Fit bounds when reports load
  useEffect(() => {
    if (!mapRef.current || reports.length === 0) return
    let minLat = Infinity, maxLat = -Infinity
    let minLon = Infinity, maxLon = -Infinity
    for (const r of reports) {
      if (r.lat < minLat) minLat = r.lat
      if (r.lat > maxLat) maxLat = r.lat
      if (r.lon < minLon) minLon = r.lon
      if (r.lon > maxLon) maxLon = r.lon
    }
    const map = mapRef.current.getMap ? mapRef.current.getMap() : mapRef.current
    map.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 60, maxZoom: 13, duration: 1000 })
  }, [reports])

  // Fly to selected report
  useEffect(() => {
    if (!mapRef.current || !selectedReport) return
    const map = mapRef.current.getMap ? mapRef.current.getMap() : mapRef.current
    map.flyTo({ center: [selectedReport.lon, selectedReport.lat], zoom: 15, duration: 800 })
  }, [selectedReport])

  return (
    <div className="map-container">
      <div className="map-title-bar">
        <h3>📍 Durham Region — Issue Reports</h3>
        <div className="map-legend">
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#60a5fa' }}></span>
            Snow / Ice
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#f59e0b' }}></span>
            Debris
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#ef4444' }}></span>
            Structural Damage
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#a78bfa' }}></span>
            Obstruction
          </div>
          {loading && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading reports…</span>}
          {error && <span style={{ color: 'var(--accent-rose)', fontSize: 12 }}>⚠ {error}</span>}
          {!loading && !error && (
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{reports.length} reports</span>
          )}
        </div>
      </div>

      <Map
        ref={mapRef}
        initialViewState={{
          latitude: 43.9,
          longitude: -78.9,
          zoom: 9,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
      >
        <NavigationControl position="top-left" />

        {reports.map(r => (
          <Marker
            key={r.id}
            latitude={r.lat}
            longitude={r.lon}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation()
              onReportSelect(r)
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: issueColors[r.issue_type] || defaultColor,
                border: '1.5px solid rgba(255,255,255,0.7)',
                cursor: 'pointer',
              }}
              title={`${r.issue_type} — ${r.stop_name}`}
            />
          </Marker>
        ))}

        {showAllStops && stops.filter(s => s.report_count === 0).map(s => (
          <Marker
            key={`stop-${s.stop_id}`}
            latitude={s.lat}
            longitude={s.lon}
            anchor="center"
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#475569',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
              title={`${s.stop_name} (#${s.stop_id})`}
            />
          </Marker>
        ))}

        {selectedReport && (
          <Popup
            latitude={selectedReport.lat}
            longitude={selectedReport.lon}
            anchor="bottom"
            onClose={() => onReportSelect(null)}
            closeButton={true}
            className="map-popup"
          >
            <div style={{ minWidth: 180 }}>
              <strong style={{ fontSize: 14, color: '#f1f5f9' }}>{selectedReport.stop_name}</strong>
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{
                  fontSize: 12,
                  color: issueColors[selectedReport.issue_type] || defaultColor,
                  fontWeight: 600,
                }}>
                  {selectedReport.issue_type}
                </span>
                {selectedReport.description && (
                  <span style={{ color: '#e2e8f0', fontSize: 12 }}>{selectedReport.description}</span>
                )}
                <span style={{ color: '#94a3b8', fontSize: 11 }}>
                  Stop #{selectedReport.stop_id} · {new Date(selectedReport.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}
