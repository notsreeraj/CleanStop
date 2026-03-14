import React from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { categoryColors, categoryLabels } from '../data/mockData'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function createCustomIcon(category) {
  const color = categoryColors[category] || '#6366f1'
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-pulse" style="background: ${color}33;"></div>
      <div class="marker-dot" style="background: ${color};"></div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -12],
  })
}

const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> & <a href="https://carto.com/">CARTO</a>'
const DURHAM_CENTER = [43.95, -78.88]
const DURHAM_ZOOM = 10

function MapBoundsHandler() {
  const map = useMap()
  React.useEffect(() => {
    const bounds = L.latLngBounds([43.60, -79.30], [44.55, -78.40])
    map.setMaxBounds(bounds)
    map.setMinZoom(9)
  }, [map])
  return null
}

export default function CanadaMap({ reports, onReportClick }) {
  return (
    <div className="map-container">
      <div className="map-title-bar">
        <h3>📍 Durham Region — Hazard Reports</h3>
        <div className="map-legend">
          {Object.entries(categoryColors).map(([cat, color]) => (
            <div key={cat} className="legend-item">
              <span className="legend-dot" style={{ background: color }}></span>
              {categoryLabels[cat]}
            </div>
          ))}
        </div>
      </div>

      <MapContainer center={DURHAM_CENTER} zoom={DURHAM_ZOOM} className="map-inner" zoomControl scrollWheelZoom>
        <TileLayer url={DARK_TILE_URL} attribution={TILE_ATTRIBUTION} />
        <MapBoundsHandler />

        {reports.map((r) => (
          <Marker key={r.id} position={r.coords} icon={createCustomIcon(r.category)}>
            <Popup>
              <div>
                <strong style={{ fontSize: '14px' }}>{r.title}</strong>
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>{r.stopName}</span>
                  <span>📡 Category: <strong>{categoryLabels[r.category]}</strong></span>
                  <span>
                    🤖 AI:{' '}
                    <strong style={{ color: r.aiVerdict === 'supported' ? '#34d399' : '#fb7185' }}>
                      {r.aiVerdict} ({r.aiConfidence}%)
                    </strong>
                  </span>
                  <span>
                    Status:{' '}
                    <strong style={{
                      color: r.status === 'pending' ? '#fbbf24' : r.status === 'approved' ? '#60a5fa' :
                             r.status === 'resolved' ? '#34d399' : '#94a3b8'
                    }}>{r.status}</strong>
                  </span>
                  <button
                    onClick={() => onReportClick(r)}
                    style={{
                      marginTop: 6, padding: '6px 12px', background: '#10b981', color: '#fff',
                      border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    View Details →
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
