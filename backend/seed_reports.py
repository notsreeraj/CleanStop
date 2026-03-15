"""
Seed fake reports into the database using random real stop IDs.
Run:  py seed_reports.py
"""
from datetime import datetime, timezone, timedelta
import random
from database import get_db
from models import Stop, Report

ISSUE_TYPES = ["Snow / Ice", "Debris", "Structural Damage", "Obstruction"]

DESCRIPTIONS = {
    "Snow / Ice": [
        "Heavy snow buildup blocking the shelter entrance",
        "Ice patch on the sidewalk near the stop, very slippery",
        "Snow plow pushed snow bank in front of the stop",
        "Icicles hanging from the shelter roof",
        "Frozen puddle at the curb making boarding dangerous",
    ],
    "Debris": [
        "Broken glass scattered around the bench area",
        "Large tree branch blocking the sidewalk near stop",
        "Garbage overflowing from the bin at the stop",
        "Construction materials left on the sidewalk",
        "Pile of leaves and litter clogging the drain",
    ],
    "Structural Damage": [
        "Shelter roof panel cracked and sagging",
        "Bench slats are broken, unsafe to sit",
        "Sign post is leaning at 45 degrees",
        "Concrete pad has large cracks and uneven surface",
        "Shelter wall panel is missing entirely",
    ],
    "Obstruction": [
        "Parked vehicle blocking the bus stop zone",
        "Dumpster placed directly in front of the stop",
        "Construction barrier blocking passenger access",
        "Overgrown bushes blocking the shelter entrance",
        "Utility pole installation blocking the sidewalk",
    ],
}

NUM_REPORTS = 150
NUM_STOPS = 40  # pick this many random stops to distribute reports across

STATUSES = ["open", "in_progress", "resolved", "closed"]
STATUS_WEIGHTS = [40, 20, 20, 20]  # weighted distribution


def seed_reports():
    db = next(get_db())
    existing = db.query(Report).count()
    if existing > 0:
        print(f"[seed_reports] {existing} reports already in DB — skipping.")
        db.close()
        return

    # Pick random stops from the database
    all_stop_ids = [s.stop_id for s in db.query(Stop.stop_id).all()]
    chosen_stops = random.sample(all_stop_ids, min(NUM_STOPS, len(all_stop_ids)))

    now = datetime.now(timezone.utc)
    count = 0
    for _ in range(NUM_REPORTS):
        stop_id = random.choice(chosen_stops)
        issue_type = random.choice(ISSUE_TYPES)
        description = random.choice(DESCRIPTIONS[issue_type])
        days_ago = random.randint(0, 14)

        report = Report(
            stop_id=stop_id,
            user_id=None,
            issue_type=issue_type,
            description=description,
            photo_url=None,
            status=random.choices(STATUSES, weights=STATUS_WEIGHTS, k=1)[0],
            created_at=now - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59)),
        )
        db.add(report)
        count += 1

    db.commit()
    db.close()
    print(f"[seed_reports] Inserted {count} reports across {len(chosen_stops)} random stops.")


if __name__ == "__main__":
    seed_reports()
