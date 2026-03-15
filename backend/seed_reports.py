"""
Seed fake users and reports into the database using random real stop IDs.
Run:  py seed_reports.py
"""
from datetime import datetime, timezone, timedelta
import random
import uuid
from database import get_db
from models import Stop, Report, User

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

NUM_REPORTS = 2000
NUM_STOPS = 120  # pick this many random stops to distribute reports across

STATUSES = ["open", "in_progress", "resolved", "closed"]
STATUS_WEIGHTS = [40, 20, 20, 20]  # weighted distribution for recent reports

FIRST_NAMES = [
    "Aarav", "Aiden", "Aisha", "Alex", "Amara", "Amira", "Ananya", "Andre",
    "Angela", "Arjun", "Bella", "Brandon", "Caleb", "Carmen", "Chloe", "Connor",
    "Daniel", "Daria", "David", "Dylan", "Elena", "Ella", "Emily", "Ethan",
    "Fatima", "Gabriel", "Grace", "Harper", "Hassan", "Isla", "Jack", "James",
    "Jasmine", "Jayden", "Jordan", "Julia", "Kai", "Kaitlyn", "Kevin", "Layla",
    "Leo", "Liam", "Lily", "Logan", "Lucas", "Maia", "Marcus", "Maria",
    "Mason", "Maya", "Megan", "Michael", "Mila", "Nathan", "Nora", "Noah",
    "Olivia", "Omar", "Priya", "Quinn", "Rachel", "Raj", "Riley", "Ryan",
    "Sana", "Sara", "Sophia", "Tanya", "Thomas", "Tyler", "Uma", "Vanessa",
    "Victor", "William", "Yara", "Yusuf", "Zara", "Zoe",
]
LAST_NAMES = [
    "Anderson", "Brown", "Campbell", "Chen", "Clark", "Davis", "Evans", "Garcia",
    "Gupta", "Hall", "Harris", "Jackson", "Johnson", "Jones", "Khan", "Kim",
    "Kumar", "Lee", "Lewis", "Lopez", "Martin", "Martinez", "Miller", "Mitchell",
    "Moore", "Nguyen", "Patel", "Perez", "Roberts", "Robinson", "Rodriguez",
    "Sharma", "Singh", "Smith", "Taylor", "Thomas", "Thompson", "Walker",
    "White", "Williams", "Wilson", "Wright", "Young",
]

NUM_USERS = 130


def seed_users(db):
    """Create 130 random users if none exist."""
    existing = db.query(User).count()
    if existing > 0:
        print(f"[seed_users] {existing} users already in DB — skipping.")
        return [u.user_id for u in db.query(User.user_id).all()]

    user_ids = []
    used_emails = set()
    for _ in range(NUM_USERS):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        name = f"{first} {last}"
        # Ensure unique email
        base_email = f"{first.lower()}.{last.lower()}"
        email = f"{base_email}@durham.ca"
        while email in used_emails:
            email = f"{base_email}{random.randint(1,999)}@durham.ca"
        used_emails.add(email)

        uid = f"user_{uuid.uuid4().hex[:12]}"
        user = User(user_id=uid, name=name, email=email)
        db.add(user)
        user_ids.append(uid)

    db.commit()
    print(f"[seed_users] Inserted {NUM_USERS} users.")
    return user_ids


def seed_reports():
    db = next(get_db())

    # Seed users first
    user_ids = seed_users(db)

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

    # --- Historical closed reports: ~2000 spread across last 12 months ---
    for _ in range(NUM_REPORTS):
        stop_id = random.choice(chosen_stops)
        issue_type = random.choice(ISSUE_TYPES)
        description = random.choice(DESCRIPTIONS[issue_type])
        # Spread across last 365 days (roughly even per month)
        days_ago = random.randint(1, 365)
        created = now - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))

        report = Report(
            stop_id=stop_id,
            user_id=random.choice(user_ids),
            issue_type=issue_type,
            description=description,
            photo_url=None,
            status="closed",
            created_at=created,
        )
        db.add(report)
        count += 1

    # --- Recent reports (last 14 days) with mixed statuses for dashboard ---
    RECENT_COUNT = 150
    recent_stops = random.sample(chosen_stops, min(40, len(chosen_stops)))
    for _ in range(RECENT_COUNT):
        stop_id = random.choice(recent_stops)
        issue_type = random.choice(ISSUE_TYPES)
        description = random.choice(DESCRIPTIONS[issue_type])
        days_ago = random.randint(0, 14)

        report = Report(
            stop_id=stop_id,
            user_id=random.choice(user_ids),
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
    print(f"[seed_reports] Inserted {count} reports ({NUM_REPORTS} historical closed + {RECENT_COUNT} recent mixed) across {len(chosen_stops)} stops.")


if __name__ == "__main__":
    seed_reports()
