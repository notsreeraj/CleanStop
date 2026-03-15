"""
FastAPI application — DRT Stop Issue Reporting System.

Endpoints:
  GET  /stops                  – all stops with report counts
  GET  /stops/{stop_id}/reports – reports for a single stop
  POST /reports                – submit a new report (multipart or JSON)
  POST /reports/validate-image – validate image via Gemini AI
  GET  /stops/nearby           – stops within radius of a coordinate
"""
import os
import math
import uuid
import json
import base64
import shutil
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

import httpx
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

from fastapi import FastAPI, Depends, File, Form, UploadFile, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel

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


class ReportCreateJSON(BaseModel):
    """JSON body for creating a report (used by mobile app after Cloudinary upload + Gemini validation)."""
    stop_id: int
    issue_type: str
    description: Optional[str] = None
    user_id: Optional[str] = None
    photo_url: Optional[str] = None


class ImageValidationRequest(BaseModel):
    """Body for POST /reports/validate-image."""
    image_url: str
    category: str
    description: Optional[str] = None


class ImageValidationResponse(BaseModel):
    """Response for POST /reports/validate-image."""
    is_valid: bool
    reason: str
    confidence: float


VALID_CATEGORIES = {"Snow / Ice", "Debris", "Structural Damage", "Obstruction"}


def _build_gemini_prompt(category: str, description: Optional[str]) -> str:
    """Build a prompt for Gemini to validate a bus stop issue image."""
    desc_block = ""
    if description and description.strip():
        desc_block = f"""
The citizen provided this description: "{description}"
Verify the image is relevant to this description.
"""
    return f"""You are a DRT (Durham Region Transit) bus stop issue validation system.

Your job is to check whether the submitted image shows a REAL bus stop issue 
in ONE of these categories: Snow / Ice, Debris, Structural Damage, Obstruction.

The user selected category: "{category}"
{desc_block}

VALIDATION RULES:
1. The image MUST show a bus stop area, transit shelter, sidewalk near transit, 
   or public road/infrastructure near a transit stop.
2. The image MUST show an issue matching the selected category:
   - "Snow / Ice": Snow accumulation, ice on sidewalk/shelter/platform, frozen surfaces
   - "Debris": Litter, trash, broken glass, fallen branches, leaves blocking area
   - "Structural Damage": Broken shelter glass, damaged bench, cracked platform, 
     broken sign, vandalism/graffiti on shelter, missing panels
   - "Obstruction": Blocked path, fallen tree, parked vehicle blocking stop, 
     construction blocking access, any barrier preventing access
3. REJECT if: selfie, food, pet, meme, screenshot, indoor photo, random unrelated 
   object, AI-generated fake, stock photo, too blurry to identify anything.
4. REJECT if the image clearly does NOT match the selected category.

RESPOND WITH ONLY A SINGLE VALID JSON OBJECT. No markdown, no code fences.

{{
  "is_valid": true/false,
  "reason": "Brief explanation of what you see and why it's valid or invalid",
  "confidence": 0.0-1.0
}}
"""


async def _validate_image_with_gemini(image_url: str, category: str, description: Optional[str]) -> dict:
    """Call Gemini API to validate a bus stop issue image."""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    prompt = _build_gemini_prompt(category, description)

    # Fetch image and convert to base64
    async with httpx.AsyncClient(timeout=30.0) as client:
        img_resp = await client.get(image_url)
        if img_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch image from URL")
        image_b64 = base64.b64encode(img_resp.content).decode("utf-8")
        content_type = img_resp.headers.get("content-type", "image/jpeg")

    gemini_model = "gemini-2.0-flash"
    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={GEMINI_API_KEY}"

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": content_type, "data": image_b64}},
            ]
        }],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 1024,
            "responseMimeType": "application/json",
        },
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        for attempt in range(3):
            resp = await client.post(gemini_url, json=payload)
            if resp.status_code == 200:
                break
            if resp.status_code in (503, 429) and attempt < 2:
                import asyncio
                await asyncio.sleep(2 * (attempt + 1))
                continue
            raise HTTPException(status_code=502, detail=f"Gemini API error: {resp.status_code}")

    result = resp.json()
    parts = result.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    raw_text = ""
    for part in parts:
        if part.get("text") and not part.get("thought"):
            raw_text = part["text"]
            break
    if not raw_text:
        for part in reversed(parts):
            if part.get("text"):
                raw_text = part["text"]
                break

    if not raw_text:
        raise HTTPException(status_code=502, detail="Gemini returned empty response")

    clean = raw_text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        parsed = json.loads(clean)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail=f"Failed to parse Gemini response: {clean[:200]}")

    return {
        "is_valid": bool(parsed.get("is_valid", False)),
        "reason": str(parsed.get("reason", "Unknown")),
        "confidence": max(0.0, min(1.0, float(parsed.get("confidence", 0.0)))),
    }


@app.post("/reports/validate-image", response_model=ImageValidationResponse)
async def validate_report_image(payload: ImageValidationRequest):
    """
    Validate a bus stop issue image using Gemini AI.
    Called by the Flutter app before submitting a report.
    """
    if payload.category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {', '.join(sorted(VALID_CATEGORIES))}",
        )
    result = await _validate_image_with_gemini(payload.image_url, payload.category, payload.description)
    return ImageValidationResponse(**result)


@app.post("/reports/submit", response_model=ReportCreated)
async def create_report_json(payload: ReportCreateJSON, db: Session = Depends(get_db)):
    """
    Submit a new report via JSON body (used by mobile app).
    Image is already uploaded to Cloudinary, URL passed directly.
    """
    stop = db.query(Stop).filter(Stop.stop_id == payload.stop_id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")

    if payload.issue_type not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid issue_type. Must be one of: {', '.join(sorted(VALID_CATEGORIES))}",
        )

    if payload.user_id and not db.query(User).filter(User.user_id == payload.user_id).first():
        raise HTTPException(status_code=404, detail="User not found")

    report = Report(
        stop_id=payload.stop_id,
        user_id=payload.user_id,
        issue_type=payload.issue_type,
        description=payload.description,
        photo_url=payload.photo_url,
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
    Used by the admin dashboard or legacy clients.
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
