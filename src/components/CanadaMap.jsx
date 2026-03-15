import { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import Map, { Source, Layer, Popup, NavigationControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

// Circle layer for stops with NO reports (green)
const stopsLayerNoReports = {
  id: 'stops-no-reports',
  type: 'circle',
  filter: ['==', ['get', 'report_count'], 0],
  paint: {
    'circle-radius': 5,
    'circle-color': '#10b981',
    'circle-stroke-color': 'rgba(255,255,255,0.6)',
    'circle-stroke-width': 1.5,
  },
}

// Circle layer for stops WITH reports (amber)
const stopsLayerWithReports = {
  id: 'stops-with-reports',
  type: 'circle',
  filter: ['>', ['get', 'report_count'], 0],
  paint: {
    'circle-radius': 7,
    'circle-color': '#f59e0b',
    'circle-stroke-color': 'rgba(255,255,255,0.7)',
    'circle-stroke-width': 2,
  },
}

export default function CanadaMap({ stops, loading, error, selectedStop, onStopSelect }) {
  const mapRef = useRef(null)
  const [cursor, setCursor] = useState('grab')

  // Convert stops array to GeoJSON (memoised — only recomputes when stops change)
  const geojson = useMemo(() => ({
    type: 'FeatureCollection',
    features: stops.map(s => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      properties: {
        stop_id: s.stop_id,
        stop_name: s.stop_name,
        report_count: s.report_count,
      },
    })),
  }), [stops])

  // Auto-fit bounds when stops first load
  const onMapLoad = useCallback(() => {
    if (stops.length > 0) fitToStops()
  }, [stops])

  useEffect(() => {
    if (mapRef.current && stops.length > 0) fitToStops()
  }, [stops])

  // Fly to a stop when selected from the list
  useEffect(() => {
    if (!mapRef.current || !selectedStop) return
    mapRef.current.flyTo({
      center: [selectedStop.lon, selectedStop.lat],
      zoom: 15,
      duration: 800,
    })
  }, [selectedStop])

  function fitToStops() {
    const map = mapRef.current
    if (!map || stops.length === 0) return

    let minLat = Infinity, maxLat = -Infinity
    let minLon = Infinity, maxLon = -Infinity
    for (const s of stops) {
      if (s.lat < minLat) minLat = s.lat
      if (s.lat > maxLat) maxLat = s.lat
      if (s.lon < minLon) minLon = s.lon
      if (s.lon > maxLon) maxLon = s.lon
    }
    map.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 50, duration: 800 })
  }

  // Click handler on the map — check if a stop circle was clicked
  const onClick = useCallback((e) => {
    const features = e.features
    if (features && features.length > 0) {
      const f = features[0]
      const stop = stops.find(s => s.stop_id === f.properties.stop_id)
      if (stop) onStopSelect(stop)
    }
  }, [stops, onStopSelect])

  const onMouseEnter = useCallback(() => setCursor('pointer'), [])
  const onMouseLeave = useCallback(() => setCursor('grab'), [])

  const interactiveLayerIds = ['stops-no-reports', 'stops-with-reports']

  return (
    <div className="map-container">
      <div className="map-title-bar">
        <h3>📍 Durham Region — Bus Stops</h3>
        <div className="map-legend">
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#10b981' }}></span>
            No reports
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#f59e0b' }}></span>
            Has reports
          </div>
          {loading && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading stops…</span>}
          {error && <span style={{ color: 'var(--accent-rose)', fontSize: 12 }}>⚠ {error}</span>}
          {!loading && !error && (
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{stops.length} stops</span>
          )}
        </div>
      </div>

      <Map
        ref={mapRef}
        onLoad={onMapLoad}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        interactiveLayerIds={interactiveLayerIds}
        cursor={cursor}
        initialViewState={{
          latitude: 43.9,
          longitude: -78.9,
          zoom: 9,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
      >
        <NavigationControl position="top-left" />

        <Source id="stops" type="geojson" data={geojson}>
          <Layer {...stopsLayerNoReports} />
          <Layer {...stopsLayerWithReports} />
        </Source>

        {selectedStop && (
          <Popup
            latitude={selectedStop.lat}
            longitude={selectedStop.lon}
            anchor="bottom"
            onClose={() => onStopSelect(null)}
            closeButton={true}
            className="map-popup"
          >
            <div style={{ minWidth: 160 }}>
              <strong style={{ fontSize: 14, color: '#f1f5f9' }}>{selectedStop.stop_name}</strong>
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>Stop #{selectedStop.stop_id}</span>
                <span style={{ fontSize: 13, color: '#e2e8f0' }}>
                  Reports:{' '}
                  <strong style={{ color: selectedStop.report_count > 0 ? '#f59e0b' : '#34d399' }}>
                    {selectedStop.report_count}
                  </strong>
                </span>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}
