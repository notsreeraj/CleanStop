"""
Pydantic schemas for API request validation and response serialization.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


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


class UserCreate(BaseModel):
    """Body for POST /users — upsert a user from Clerk."""
    user_id: str
    name: str
    email: str


class UserOut(BaseModel):
    """GET /users/{user_id} response."""
    user_id: str
    name: str
    email: str

    class Config:
        from_attributes = True


class ReportOut(BaseModel):
    """GET /stops/{stop_id}/reports response item."""
    id: int
    user_id: Optional[str] = None
    issue_type: str
    description: Optional[str] = None
    photo_url: Optional[str] = None
    status: str = "open"
    created_at: datetime

    class Config:
        from_attributes = True


class ReportWithLocation(BaseModel):
    """GET /reports response item — report with stop coordinates."""
    id: int
    stop_id: int
    stop_name: str
    lat: float
    lon: float
    issue_type: str
    description: Optional[str] = None
    photo_url: Optional[str] = None
    status: str = "open"
    created_at: datetime

    class Config:
        from_attributes = True


class ReportStatusUpdate(BaseModel):
    """PATCH /reports/{id}/status request body."""
    status: str


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
