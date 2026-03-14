// Parse stops.txt GTFS CSV into an array of stop objects
// Format: stop_id,stop_code,stop_name,stop_desc,stop_lat,stop_lon,zone_id,stop_url,location_type,parent_station,stop_timezone,wheelchair_boarding,preferred

export async function loadStops() {
  const response = await fetch('/stops.txt')
  const text = await response.text()
  const lines = text.trim().split('\n')

  // Skip header
  const stops = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length < 6) continue

    const stopId = cols[0].trim()
    const stopCode = cols[1].trim()
    const stopName = cols[2].trim()
    const lat = parseFloat(cols[4])
    const lon = parseFloat(cols[5])

    if (isNaN(lat) || isNaN(lon)) continue

    stops.push({
      id: stopId,
      code: stopCode,
      name: stopName,
      coords: [lat, lon],
    })
  }

  return stops
}
