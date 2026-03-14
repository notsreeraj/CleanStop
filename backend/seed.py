"""
Seed the stops table from the GTFS stops.txt CSV file.
"""
import csv
import os
from sqlalchemy.orm import Session
from models import Stop


def seed_stops(db: Session, csv_path: str | None = None):
    """
    Read stops.txt and insert/update all stops into the database.
    Skips seeding if stops already exist (idempotent).
    """
    # Check if already seeded
    existing_count = db.query(Stop).count()
    if existing_count > 0:
        print(f"[seed] {existing_count} stops already in DB — skipping seed.")
        return

    if csv_path is None:
        # Look for stops.txt in the parent directory (project root)
        csv_path = os.path.join(os.path.dirname(__file__), "..", "stops.txt")

    csv_path = os.path.abspath(csv_path)
    if not os.path.exists(csv_path):
        print(f"[seed] WARNING: stops.txt not found at {csv_path}")
        return

    print(f"[seed] Reading stops from {csv_path} ...")

    count = 0
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            stop = Stop(
                stop_id=int(row["stop_id"]),
                stop_code=row.get("stop_code", ""),
                stop_name=row.get("stop_name", ""),
                lat=float(row["stop_lat"]),
                lon=float(row["stop_lon"]),
            )
            db.merge(stop)  # merge = upsert
            count += 1

    db.commit()
    print(f"[seed] Loaded {count} stops into the database.")
