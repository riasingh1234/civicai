"""Duplicate detection and the CivicAI priority score.

Both are deliberately explainable - every number we show a judge or an officer
can be traced back to the inputs that produced it.
"""

from datetime import datetime, timezone

from geo import haversine_m, location_sensitivity, nearby_landmark
from visual import visual_similarity

# --- duplicate detection -------------------------------------------------

DUPLICATE_RADIUS_M = 300      # beyond this, two reports are simply different issues
DUPLICATE_THRESHOLD = 0.62    # score above which we ask the citizen to confirm

WEIGHTS = {"visual": 0.45, "distance": 0.35, "category": 0.20}


def _proximity_score(metres):
    if metres >= DUPLICATE_RADIUS_M:
        return 0.0
    return 1.0 - (metres / DUPLICATE_RADIUS_M)


def duplicate_candidates(new_report, existing, limit=3):
    """Score every open report against the incoming one and return likely matches.

    new_report needs: phash, lat, lng, category.
    """
    lat, lng = new_report.get("lat"), new_report.get("lng")
    matches = []

    for r in existing:
        if r.get("status") == "Resolved":
            continue
        if r.get("parent_id"):
            continue  # already merged into something else

        if lat is None or r.get("lat") is None:
            distance = DUPLICATE_RADIUS_M
        else:
            distance = haversine_m(lat, lng, r["lat"], r["lng"])

        if distance > DUPLICATE_RADIUS_M:
            continue

        vis = visual_similarity(new_report.get("phash"), r.get("phash"))
        prox = _proximity_score(distance)
        cat = 1.0 if (new_report.get("category") or "").lower() == (r.get("category") or "").lower() else 0.0

        score = (
            WEIGHTS["visual"] * vis
            + WEIGHTS["distance"] * prox
            + WEIGHTS["category"] * cat
        )

        if score < DUPLICATE_THRESHOLD:
            continue

        matches.append({
            "report_id": r["id"],
            "issue": r.get("issue"),
            "status": r.get("status"),
            "location": r.get("address") or r.get("location"),
            "image_url": r.get("image_url"),
            "similarity": round(score * 100),
            "distance_m": round(distance),
            "breakdown": {
                "visual": round(vis * 100),
                "proximity": round(prox * 100),
                "category_match": bool(cat),
            },
        })

    matches.sort(key=lambda m: m["similarity"], reverse=True)
    return matches[:limit]


# --- priority score ------------------------------------------------------

SEVERITY_POINTS = {"Low": 15, "Medium": 30, "High": 45, "Critical": 55}

# Categories where a delay turns into an injury rather than an inconvenience.
SAFETY_RISK = {
    "Public Safety": 20,
    "Road Infrastructure": 16,
    "Drainage": 15,
    "Street Lighting": 12,
    "Traffic": 12,
    "Water Supply": 8,
    "Waste Management": 6,
    "Other": 4,
}


def _hours_since(iso_string):
    if not iso_string:
        return 0
    try:
        ts = datetime.fromisoformat(iso_string.replace("Z", "+00:00"))
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        return max((datetime.now(timezone.utc) - ts).total_seconds() / 3600, 0)
    except Exception:
        return 0


def priority_score(report, similar_count=0):
    """Return a 0-100 score plus the reasons behind it."""
    severity = SEVERITY_POINTS.get(report.get("severity"), 30)
    safety = SAFETY_RISK.get(report.get("category"), 4)

    sensitivity = location_sensitivity(report.get("address") or report.get("location"))
    location_pts = round(sensitivity * 10)

    # Each extra citizen confirming the same issue adds weight, capped so that
    # a brigading spike can't outrank a genuine critical hazard.
    support_pts = min(similar_count * 3, 10)

    hours = _hours_since(report.get("created_at"))
    if report.get("status") == "Resolved":
        age_pts = 0
    else:
        age_pts = min(round(hours / 6), 10)

    total = min(severity + safety + location_pts + support_pts + age_pts, 100)

    reasons = [f"Severity assessed as {report.get('severity', 'Unknown')}"]
    if safety >= 15:
        reasons.append(f"{report.get('category')} issues carry direct public safety risk")
    landmark = nearby_landmark(report.get("address") or report.get("location"))
    if landmark:
        reasons.append(f"Located near a {landmark}")
    if similar_count:
        reasons.append(f"{similar_count} similar report(s) from other citizens nearby")
    if age_pts and hours >= 6:
        reasons.append(f"Unresolved for {int(hours)} hours")

    return {
        "score": total,
        "response_window": response_window(total),
        "reasons": reasons,
        "components": {
            "severity": severity,
            "public_safety_risk": safety,
            "location_sensitivity": location_pts,
            "similar_reports": support_pts,
            "time_unresolved": age_pts,
        },
    }


def response_window(score):
    if score >= 85:
        return "Within 2 hours"
    if score >= 70:
        return "Within 12 hours"
    if score >= 50:
        return "Within 48 hours"
    return "Within 7 days"


def needs_escalation(report, score):
    """Critical + public-safety issues jump the queue automatically."""
    if report.get("status") == "Resolved":
        return False
    if score >= 85:
        return True
    return (
        report.get("severity") == "Critical"
        and SAFETY_RISK.get(report.get("category"), 0) >= 15
    )
