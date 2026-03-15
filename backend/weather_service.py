"""
Weather Prediction Service — fetches Open-Meteo snowfall forecasts
and classifies bus stop snowfall risk.

Strategy:
  1. Load all stops from DB
  2. Group nearby stops into grid cells (rounded lat/lon to 1 decimal ≈ ~11 km)
  3. Fetch one Open-Meteo forecast per grid cell (representative coordinate)
  4. Aggregate snowfall for 3h / 6h / 12h windows
  5. Classify risk: 0=normal, <1=low, <3=medium, >=3=high
  6. Assign results back to every stop in the group
  7. Cache results for 15 minutes to avoid hammering the API
"""
import time
import math
import logging
from datetime import datetime, timezone
from collections import defaultdict
from typing import Optional

import httpx

from sqlalchemy.orm import Session
from models import Stop

logger = logging.getLogger(__name__)

# ── Cache ────────────────────────────────────────────────────────────────────

_cache: dict = {"data": None, "expires": 0}
CACHE_TTL = 15 * 60  # 15 minutes


# ── Risk classification ─────────────────────────────────────────────────────

def classify_risk(snowfall_cm: float) -> str:
    if snowfall_cm <= 0:
        return "normal"
    if snowfall_cm < 1:
        return "low"
    if snowfall_cm < 3:
        return "medium"
    return "high"


# ── Grouping ─────────────────────────────────────────────────────────────────

def _grid_key(lat: float, lon: float) -> tuple[float, float]:
    """Round to 1 decimal place → ~11 km grid cells."""
    return (round(lat, 1), round(lon, 1))


def group_stops(stops: list[Stop]) -> dict[tuple, list[Stop]]:
    """Group stops into grid buckets, returning {(lat,lon): [stops]}."""
    buckets: dict[tuple, list[Stop]] = defaultdict(list)
    for s in stops:
        if s.lat is None or s.lon is None:
            continue
        key = _grid_key(s.lat, s.lon)
        buckets[key].append(s)
    return dict(buckets)


def representative_coord(stops: list[Stop]) -> tuple[float, float]:
    """Average lat/lon of stops in a bucket."""
    lats = [s.lat for s in stops]
    lons = [s.lon for s in stops]
    return (sum(lats) / len(lats), sum(lons) / len(lons))


# ── Open-Meteo fetcher ──────────────────────────────────────────────────────

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


async def _fetch_snowfall_for_coord(
    client: httpx.AsyncClient,
    lat: float,
    lon: float,
) -> Optional[list[float]]:
    """
    Fetch hourly snowfall forecast for the next 12 hours.
    Returns list of 12 snowfall values in cm, or None on failure.
    """
    try:
        resp = await client.get(
            OPEN_METEO_URL,
            params={
                "latitude": round(lat, 4),
                "longitude": round(lon, 4),
                "hourly": "snowfall",
                "forecast_hours": 12,
                "timezone": "auto",
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()
        hourly = data.get("hourly", {})
        snowfall = hourly.get("snowfall", [])
        # Ensure we have up to 12 values, pad with 0 if fewer
        result = [(v if v is not None else 0.0) for v in snowfall[:12]]
        while len(result) < 12:
            result.append(0.0)
        return result
    except Exception as e:
        logger.warning(f"Open-Meteo fetch failed for ({lat},{lon}): {e}")
        return None


async def _fetch_all_groups(
    groups: dict[tuple, list[Stop]],
) -> dict[tuple, list[float]]:
    """Fetch snowfall forecasts for all grid groups with rate-limit-friendly batching."""
    import asyncio
    results: dict[tuple, list[float]] = {}
    keys = list(groups.keys())

    # Batch in groups of 5 with a short delay to avoid 429
    BATCH_SIZE = 5
    async with httpx.AsyncClient() as client:
        for i in range(0, len(keys), BATCH_SIZE):
            batch_keys = keys[i:i + BATCH_SIZE]
            tasks = []
            for key in batch_keys:
                lat, lon = representative_coord(groups[key])
                tasks.append(_fetch_snowfall_for_coord(client, lat, lon))

            fetched = await asyncio.gather(*tasks, return_exceptions=True)

            for key, result in zip(batch_keys, fetched):
                if isinstance(result, Exception) or result is None:
                    results[key] = [0.0] * 12  # fallback: no snow
                else:
                    results[key] = result

            # Small delay between batches to respect rate limits
            if i + BATCH_SIZE < len(keys):
                await asyncio.sleep(0.3)

    return results


# ── Main pipeline ────────────────────────────────────────────────────────────

async def get_weather_predictions(db: Session) -> list[dict]:
    """
    Main entry: returns processed stop data with snowfall risk for all windows.
    Uses a 15-minute cache.
    """
    now = time.time()
    if _cache["data"] is not None and now < _cache["expires"]:
        return _cache["data"]

    # 1. Load all stops
    all_stops = db.query(Stop).all()
    if not all_stops:
        return []

    # 2. Group into grid cells
    groups = group_stops(all_stops)
    logger.info(f"Weather: {len(all_stops)} stops → {len(groups)} grid groups")

    # 3. Fetch forecasts for each group
    group_snowfall = await _fetch_all_groups(groups)

    # 4. Build result for every stop
    result = []
    for key, stops in groups.items():
        hourly = group_snowfall.get(key, [0.0] * 12)

        # Aggregate: sum of snowfall for each window
        snow_3h = sum(hourly[:3])
        snow_6h = sum(hourly[:6])
        snow_12h = sum(hourly[:12])

        for s in stops:
            result.append({
                "stop_id": s.stop_id,
                "stop_name": s.stop_name,
                "lat": s.lat,
                "lon": s.lon,
                "snowfall_3h": round(snow_3h, 2),
                "snowfall_6h": round(snow_6h, 2),
                "snowfall_12h": round(snow_12h, 2),
                "risk_3h": classify_risk(snow_3h),
                "risk_6h": classify_risk(snow_6h),
                "risk_12h": classify_risk(snow_12h),
            })

    # 5. Cache
    _cache["data"] = result
    _cache["expires"] = now + CACHE_TTL

    return result
