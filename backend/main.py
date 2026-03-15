"""
FastAPI application — DRT Stop Issue Reporting System.

Endpoints:
  GET  /stops                  – all stops with report counts
  GET  /stops/{stop_id}/reports – reports for a single stop
  POST /reports                – submit a new report (multipart)
  GET  /stops/nearby           – stops within radius of a coordinate
"""
import os
import math
import uuid
import shutil
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)

from fastapi import FastAPI, Depends, File, Form, UploadFile, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import engine, get_db, Base
from models import Stop, Report, User
from schemas import StopWithCount, ReportOut, ReportWithLocation, ReportStatusUpdate, ReportCreated, NearbyStop, UserCreate, UserOut
from seed import seed_stops

# ── Constants ───────────────────────────────────────────────────────────────

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
EARTH_RADIUS_M = 6_371_000  # metres

# Ensure uploads directory exists before mounting StaticFiles
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Lifespan – create tables & seed ─────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        seed_stops(db)
    finally:
        db.close()
    yield
    # Shutdown (nothing to do)


# ── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="DRT Stop Issue Reporting API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow everything for dev convenience
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded photos as static files at /uploads/<filename>
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Also serve the admin dashboard at /admin
ADMIN_DIR = os.path.join(os.path.dirname(__file__), "..", "admin")
if os.path.isdir(ADMIN_DIR):
    app.mount("/admin", StaticFiles(directory=ADMIN_DIR, html=True), name="admin")


# ── Helpers ─────────────────────────────────────────────────────────────────

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance in metres between two points."""
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return EARTH_RADIUS_M * 2 * math.asin(math.sqrt(a))


# ── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/stops", response_model=list[StopWithCount])
def get_all_stops(db: Session = Depends(get_db)):
    """
    Return every stop with its report count.
    Used by the admin dashboard on initial load.
    """
    rows = (
        db.query(
            Stop.stop_id,
            Stop.stop_name,
            Stop.lat,
            Stop.lon,
            func.count(Report.id).label("report_count"),
        )
        .outerjoin(Report, Report.stop_id == Stop.stop_id)
        .group_by(Stop.stop_id)
        .all()
    )
    return [
        StopWithCount(
            stop_id=r.stop_id,
            stop_name=r.stop_name,
            lat=r.lat,
            lon=r.lon,
            report_count=r.report_count,
        )
        for r in rows
    ]


@app.get("/reports", response_model=list[ReportWithLocation])
def get_all_reports(since: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """
    Return every report with its stop's name and coordinates.
    Used by the admin dashboard map view.
    Optional `since` ISO timestamp to limit results.
    """
    q = (
        db.query(Report, Stop.stop_name, Stop.lat, Stop.lon)
        .join(Stop, Stop.stop_id == Report.stop_id)
    )
    if since:
        try:
            cutoff = datetime.fromisoformat(since.replace("Z", "+00:00"))
            q = q.filter(Report.created_at >= cutoff)
        except ValueError:
            pass
    rows = q.order_by(Report.created_at.desc()).all()
    return [
        ReportWithLocation(
            id=r.Report.id,
            stop_id=r.Report.stop_id,
            stop_name=r.stop_name,
            lat=r.lat,
            lon=r.lon,
            issue_type=r.Report.issue_type,
            description=r.Report.description,
            photo_url=r.Report.photo_url,
            status=r.Report.status,
            created_at=r.Report.created_at,
        )
        for r in rows
    ]


@app.get("/stops/flagged", response_model=list[StopWithCount])
def get_flagged_stops(db: Session = Depends(get_db)):
    """
    Return only stops that have at least one report, sorted by report count desc.
    Used by the admin dashboard "Flagged Stops" view.
    """
    rows = (
        db.query(
            Stop.stop_id,
            Stop.stop_name,
            Stop.lat,
            Stop.lon,
            func.count(Report.id).label("report_count"),
        )
        .join(Report, Report.stop_id == Stop.stop_id)
        .group_by(Stop.stop_id)
        .order_by(func.count(Report.id).desc())
        .all()
    )
    return [
        StopWithCount(
            stop_id=r.stop_id,
            stop_name=r.stop_name,
            lat=r.lat,
            lon=r.lon,
            report_count=r.report_count,
        )
        for r in rows
    ]


@app.get("/stops/nearby", response_model=list[NearbyStop])
def get_nearby_stops(
    lat: float = Query(..., description="Latitude of the user"),
    lon: float = Query(..., description="Longitude of the user"),
    radius: float = Query(500, description="Search radius in metres"),
    db: Session = Depends(get_db),
):
    """
    Return stops within `radius` metres of (lat, lon), sorted by distance.
    Used by the Flutter app on open.
    """
    all_stops = db.query(Stop).all()
    nearby = []
    for s in all_stops:
        d = haversine(lat, lon, s.lat, s.lon)
        if d <= radius:
            nearby.append(
                NearbyStop(
                    stop_id=s.stop_id,
                    stop_name=s.stop_name,
                    lat=s.lat,
                    lon=s.lon,
                    distance_m=round(d, 1),
                )
            )
    nearby.sort(key=lambda x: x.distance_m)
    return nearby


@app.get("/stops/{stop_id}/reports", response_model=list[ReportOut])
def get_stop_reports(stop_id: int, db: Session = Depends(get_db)):
    """
    Return all reports for a specific stop.
    Used when an admin clicks a stop on the map.
    """
    stop = db.query(Stop).filter(Stop.stop_id == stop_id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")
    reports = (
        db.query(Report)
        .filter(Report.stop_id == stop_id)
        .order_by(Report.created_at.desc())
        .all()
    )
    return reports


@app.patch("/reports/{report_id}/status", response_model=ReportOut)
def update_report_status(report_id: int, payload: ReportStatusUpdate, db: Session = Depends(get_db)):
    """
    Update the status of a report.
    Valid statuses: open, in_progress, resolved, closed.
    """
    valid_statuses = {"open", "in_progress", "resolved", "closed"}
    if payload.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(sorted(valid_statuses))}",
        )
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = payload.status
    db.commit()
    db.refresh(report)
    return report


@app.post("/users", response_model=UserOut)
def upsert_user(payload: UserCreate, db: Session = Depends(get_db)):
    """
    Create or update a user record. Called by the Flutter app after Clerk sign-in.
    """
    user = db.query(User).filter(User.user_id == payload.user_id).first()
    if user:
        user.name = payload.name
        user.email = payload.email
    else:
        user = User(user_id=payload.user_id, name=payload.name, email=payload.email)
        db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: str, db: Session = Depends(get_db)):
    """Fetch a single user by their Clerk user ID."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.post("/reports", response_model=ReportCreated)
async def create_report(
    stop_id: int = Form(...),
    issue_type: str = Form(...),
    description: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    """
    Submit a new issue report (multipart/form-data).
    Used by the Flutter mobile app.
    """
    # Validate stop exists
    stop = db.query(Stop).filter(Stop.stop_id == stop_id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")

    # Validate issue type
    valid_types = {"Snow / Ice", "Debris", "Structural Damage", "Obstruction"}
    if issue_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid issue_type. Must be one of: {', '.join(sorted(valid_types))}",
        )

    # Validate user exists if provided
    if user_id and not db.query(User).filter(User.user_id == user_id).first():
        raise HTTPException(status_code=404, detail="User not found")

    # Handle photo upload
    photo_url = None
    if photo and photo.filename:
        result = cloudinary.uploader.upload(
            photo.file,
            folder="cleanstop_reports",
            resource_type="image",
        )
        photo_url = result["secure_url"]

    # Create report
    report = Report(
        stop_id=stop_id,
        user_id=user_id,
        issue_type=issue_type,
        description=description,
        photo_url=photo_url,
        created_at=datetime.now(timezone.utc),
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return ReportCreated(
        report_id=report.id,
        stop_id=report.stop_id,
        created_at=report.created_at,
    )


# ── Weather Prediction ─────────────────────────────────────────────────────

from weather_service import get_weather_predictions


@app.get("/weather/predictions")
async def weather_predictions(db: Session = Depends(get_db)):
    """
    Return snowfall risk predictions for all bus stops.
    Groups nearby stops, fetches Open-Meteo forecasts, classifies risk.
    Cached for 15 minutes.
    """
    return await get_weather_predictions(db)
