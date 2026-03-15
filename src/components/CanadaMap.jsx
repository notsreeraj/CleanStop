import { useEffect, useCallback, useRef, useState } from 'react'
import Map, { Popup, NavigationControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const SOURCE_ID = 'stops-source'
const LAYER_ID = 'stops-circles'

function buildGeoJSON(stops) {
  return {
    type: 'FeatureCollection',
    features: stops.map(s => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      properties: {
        stop_id: s.stop_id,
        stop_name: s.stop_name,
        report_count: s.report_count ?? 0,
      },
    })),
  }
}

export default function CanadaMap({ stops, loading, error, selectedStop, onStopSelect }) {
  const mapRef = useRef(null)
  const mapReady = useRef(false)

  // --- Imperatively manage source + layer via native MapLibre API ---
  function addStopsLayer(map) {
    if (map.getSource(SOURCE_ID)) return // already added
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: buildGeoJSON(stops),
    })
    map.addLayer({
      id: LAYER_ID,
      source: SOURCE_ID,
      type: 'circle',
      paint: {
        'circle-radius': 7,
        'circle-color': [
          'step',
          ['to-number', ['get', 'report_count'], 0],
          '#10b981',
          1, '#f59e0b',
          6, '#ef4444',
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
        'circle-opacity': 1,
      },
    })

    // Pointer cursor on hover
    map.on('mouseenter', LAYER_ID, () => map.getCanvas().style.cursor = 'pointer')
    map.on('mouseleave', LAYER_ID, () => map.getCanvas().style.cursor = '')

    // Click → select stop
    map.on('click', LAYER_ID, (e) => {
      if (!e.features || e.features.length === 0) return
      const f = e.features[0]
      const sid = f.properties.stop_id
      const stop = stops.find(s => String(s.stop_id) === String(sid))
      if (stop) onStopSelect(stop)
    })
  }

  // When the map style loads, add the layer
  const onMapLoad = useCallback((evt) => {
    const map = evt.target
    mapRef.current = map
    mapReady.current = true
    addStopsLayer(map)
    fitToStops(map, stops)
  }, []) // intentionally stable — stops captured via ref below

  // When stops change, update the source data (or create it if map loaded before data)
  const stopsRef = useRef(stops)
  stopsRef.current = stops

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady.current) return
    const src = map.getSource(SOURCE_ID)
    if (src) {
      src.setData(buildGeoJSON(stops))
    } else {
      addStopsLayer(map)
    }
    if (stops.length > 0) fitToStops(map, stops)
  }, [stops])

  // Fly to a stop when selected from the list
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedStop) return
    map.flyTo({ center: [selectedStop.lon, selectedStop.lat], zoom: 15, duration: 800 })
  }, [selectedStop])

  function fitToStops(map, stopsList) {
    if (!map || !stopsList || stopsList.length === 0) return
    let minLat = Infinity, maxLat = -Infinity
    let minLon = Infinity, maxLon = -Infinity
    for (const s of stopsList) {
      if (s.lat < minLat) minLat = s.lat
      if (s.lat > maxLat) maxLat = s.lat
      if (s.lon < minLon) minLon = s.lon
      if (s.lon > maxLon) maxLon = s.lon
    }
    map.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 50, duration: 800 })
  }

  function getReportColor(count) {
    if (count === 0) return '#10b981'
    if (count <= 5) return '#f59e0b'
    return '#ef4444'
  }

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
            1–5 reports
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#ef4444' }}></span>
            &gt;5 reports
          </div>
          {loading && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading stops…</span>}
          {error && <span style={{ color: 'var(--accent-rose)', fontSize: 12 }}>⚠ {error}</span>}
          {!loading && !error && (
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{stops.length} stops</span>
          )}
        </div>
      </div>

      <Map
        onLoad={onMapLoad}
        initialViewState={{
          latitude: 43.9,
          longitude: -78.9,
          zoom: 9,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
      >
        <NavigationControl position="top-left" />

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
                  <strong style={{ color: getReportColor(selectedStop.report_count) }}>
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
