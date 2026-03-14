"""
Pydantic schemas for API request validation and response serialization.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ── Response schemas ────────────────────────────────────────────────────────

class StopWithCount(BaseModel):
    """GET /stops response item."""
    stop_id: int
    stop_name: str
    lat: float
    lon: float
    report_count: int

    class Config:
        from_attributes = True


class ReportOut(BaseModel):
    """GET /stops/{stop_id}/reports response item."""
    id: int
    issue_type: str
    description: Optional[str] = None
    photo_url: Optional[str] = None
    device_lat: float
    device_lon: float
    created_at: datetime

    class Config:
        from_attributes = True


class ReportCreated(BaseModel):
    """POST /reports response."""
    report_id: int
    stop_id: int
    created_at: datetime


class NearbyStop(BaseModel):
    """GET /stops/nearby response item."""
    stop_id: int
    stop_name: str
    lat: float
    lon: float
    distance_m: float
