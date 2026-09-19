"""Persistence.

Primary store is Supabase (Postgres + Storage). If SUPABASE_URL / SUPABASE_KEY
aren't set we fall back to a JSON file on disk so the app still runs end to end
on a laptop with no network - useful when demo wifi dies.
"""

import json
import os
import random
import threading
import uuid
from datetime import datetime, timedelta, timezone

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
BUCKET = os.getenv("SUPABASE_BUCKET", "evidence")

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
LOCAL_DB = os.path.join(DATA_DIR, "civicai.json")

_lock = threading.Lock()
_supabase = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client
        _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Storage backend: Supabase")
    except Exception as e:
        print("Supabase init failed, using local file store:", e)

if not _supabase:
    print("Storage backend: local JSON (set SUPABASE_URL and SUPABASE_KEY to persist remotely)")


def using_supabase():
    return _supabase is not None


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def new_report_id():
    return f"CIV-{random.randint(1000, 9999)}"


# --- local file helpers --------------------------------------------------

def _load_local():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(LOCAL_DB):
        return {"reports": [], "notifications": []}
    with open(LOCAL_DB, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {"reports": [], "notifications": []}


def _save_local(db):
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp = LOCAL_DB + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2)
    os.replace(tmp, LOCAL_DB)


# --- images --------------------------------------------------------------

def save_image(image_bytes, filename, content_type="image/jpeg"):
    """Store evidence and return a URL the frontend can render."""
    ext = os.path.splitext(filename or "")[1] or ".jpg"
    key = f"{uuid.uuid4().hex}{ext}"

    if _supabase:
        try:
            _supabase.storage.from_(BUCKET).upload(
                key, image_bytes, {"content-type": content_type, "upsert": "true"}
            )
            return _supabase.storage.from_(BUCKET).get_public_url(key)
        except Exception as e:
            print("Supabase upload failed, writing locally:", e)

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with open(os.path.join(UPLOAD_DIR, key), "wb") as f:
        f.write(image_bytes)
    return f"/uploads/{key}"


# --- reports -------------------------------------------------------------

def list_reports():
    if _supabase:
        try:
            res = _supabase.table("reports").select("*").order("created_at", desc=True).execute()
            return res.data or []
        except Exception as e:
            print("Supabase read failed:", e)
            return []
    with _lock:
        db = _load_local()
    return sorted(db["reports"], key=lambda r: r.get("created_at", ""), reverse=True)


def get_report(report_id):
    for r in list_reports():
        if r["id"] == report_id:
            return r
    return None


def insert_report(report):
    report.setdefault("id", new_report_id())
    report.setdefault("created_at", now_iso())

    if _supabase:
        try:
            res = _supabase.table("reports").insert(report).execute()
            return (res.data or [report])[0]
        except Exception as e:
            print("Supabase insert failed:", e)

    with _lock:
        db = _load_local()
        db["reports"].insert(0, report)
        _save_local(db)
    return report


def update_report(report_id, patch):
    if _supabase:
        try:
            res = _supabase.table("reports").update(patch).eq("id", report_id).execute()
            return (res.data or [None])[0]
        except Exception as e:
            print("Supabase update failed:", e)

    with _lock:
        db = _load_local()
        updated = None
        for r in db["reports"]:
            if r["id"] == report_id:
                r.update(patch)
                updated = r
                break
        _save_local(db)
    return updated


def supporters_of(report_id, reports=None):
    """Reports that were merged into this one."""
    reports = reports if reports is not None else list_reports()
    return [r for r in reports if r.get("parent_id") == report_id]


# --- notifications -------------------------------------------------------

def add_notification(report_id, message, kind="status"):
    row = {
        "id": uuid.uuid4().hex[:12],
        "report_id": report_id,
        "message": message,
        "kind": kind,
        "read": False,
        "created_at": now_iso(),
    }

    if _supabase:
        try:
            _supabase.table("notifications").insert(row).execute()
            return row
        except Exception as e:
            print("Supabase notification insert failed:", e)

    with _lock:
        db = _load_local()
        db["notifications"].insert(0, row)
        _save_local(db)
    return row


def list_notifications(report_ids=None, limit=50):
    if _supabase:
        try:
            q = _supabase.table("notifications").select("*")
            if report_ids:
                q = q.in_("report_id", report_ids)
            res = q.order("created_at", desc=True).limit(limit).execute()
            return res.data or []
        except Exception as e:
            print("Supabase notification read failed:", e)
            return []

    with _lock:
        db = _load_local()
    rows = db["notifications"]
    if report_ids:
        rows = [n for n in rows if n["report_id"] in report_ids]
    return rows[:limit]


def mark_notifications_read(ids):
    if _supabase:
        try:
            _supabase.table("notifications").update({"read": True}).in_("id", ids).execute()
            return
        except Exception as e:
            print("Supabase notification update failed:", e)

    with _lock:
        db = _load_local()
        for n in db["notifications"]:
            if n["id"] in ids:
                n["read"] = True
        _save_local(db)


# --- demo seed -----------------------------------------------------------

SEED = [
    {
        "id": "CIV-8092",
        "issue": "Open sewage overflow",
        "category": "Drainage",
        "severity": "Critical",
        "confidence": "98%",
        "department": "Water & Sewage Board",
        "routing_reason": "Standing wastewater on a pedestrian walkway indicates a blocked or ruptured sewer line, which falls under the sewage board rather than roads.",
        "location": "Block C, Sector 14",
        "address": "Block C, Sector 14, Faridabad, Haryana",
        "lat": 28.6139,
        "lng": 77.2090,
        "description": "Severe sewage leakage overflowing onto public walkway.",
        "complaint": "An open sewage leakage has overflowed onto the public walkway in Block C, Sector 14, posing an immediate biological hazard to residents. Urgent intervention is required to repair the main drain and sanitise the area.",
        "status": "Submitted",
        "language": "en",
        "phash": None,
        "parent_id": None,
        "resolution_note": "",
        "after_image_url": None,
        "verification": None,
        "resolved_at": None,
        "image_url": "https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=600&q=80",
    },
    {
        "id": "CIV-4102",
        "issue": "Broken streetlight array",
        "category": "Street Lighting",
        "severity": "Medium",
        "confidence": "91%",
        "department": "Electrical Department",
        "routing_reason": "Non-functional pole-mounted fixtures are a municipal lighting maintenance job, not a power supply fault.",
        "location": "Main Road Gate 3",
        "address": "Main Road Gate 3, near Government School, Sector 18",
        "lat": 28.6200,
        "lng": 77.2150,
        "description": "Multiple streetlights non-functional creating a dark stretch.",
        "complaint": "Three consecutive streetlights near Main Road Gate 3 are completely dark, causing safety concerns for pedestrians after sunset. Maintenance is required to replace the broken fixtures.",
        "status": "In Progress",
        "language": "en",
        "phash": None,
        "parent_id": None,
        "resolution_note": "Work order #992 generated. Technician dispatched.",
        "after_image_url": None,
        "verification": None,
        "resolved_at": None,
        "image_url": "https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?auto=format&fit=crop&w=600&q=80",
    },
]


def seed_if_empty():
    """Put two reports in so the officer dashboard isn't blank on first load."""
    if list_reports():
        return
    base = datetime.now(timezone.utc).replace(microsecond=0)
    for offset, row in enumerate(SEED):
        row = dict(row)
        row["created_at"] = (base - timedelta(hours=18 + offset * 20)).isoformat()
        insert_report(row)
