import os
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

# Loaded before the local modules because they read keys at import time.
load_dotenv()

import requests
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

import ai
import geo
import store
from scoring import duplicate_candidates, needs_escalation, priority_score
from visual import dhash

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

store.seed_if_empty()


def _no_ai():
    return jsonify({"error": "Gemini API key is not configured on the server"}), 500


def _parse_iso(value):
    if not value:
        return None
    try:
        ts = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def enrich(report, all_reports):
    """Attach everything the UI needs but the database doesn't store."""
    supporters = store.supporters_of(report["id"], all_reports)
    similar = len(supporters)

    priority = priority_score(report, similar_count=similar)
    out = dict(report)
    out["priority"] = priority
    out["escalated"] = needs_escalation(report, priority["score"])
    out["support_count"] = similar + 1
    out["supporting_images"] = [s["image_url"] for s in supporters if s.get("image_url")]
    out["community_confidence"] = (
        "High" if similar >= 4 else "Medium" if similar >= 1 else "Single report"
    )
    return out


def visible_reports():
    """Merged duplicates are folded into their parent, so they're hidden from lists."""
    everything = store.list_reports()
    parents = [r for r in everything if not r.get("parent_id")]
    enriched = [enrich(r, everything) for r in parents]
    enriched.sort(key=lambda r: r["priority"]["score"], reverse=True)
    return enriched


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "CivicAI backend is running",
        "ai": ai.available(),
        "persistence": "supabase" if store.using_supabase() else "local-file",
    })


@app.route("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory(store.UPLOAD_DIR, filename)


# --- reporting -----------------------------------------------------------

@app.route("/analyze", methods=["POST"])
def analyze_issue():
    """Run triage on a photo and check it against what's already been reported.

    Nothing is written to the reports table here - the citizen still has to
    confirm, and may choose to merge into an existing issue instead.
    """
    if not ai.available():
        return _no_ai()

    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    image_file = request.files["image"]
    location_text = request.form.get("location", "")
    description = request.form.get("description", "")
    lat = request.form.get("lat")
    lng = request.form.get("lng")

    image_bytes = image_file.read()
    mime_type = image_file.mimetype or "image/jpeg"

    # Coordinates from the browser win; otherwise geocode whatever was typed.
    if lat and lng:
        place = geo.reverse_geocode(float(lat), float(lng))
    else:
        place = geo.geocode(location_text)

    try:
        analysis = ai.triage_image(image_bytes, mime_type, location_text, description)
    except Exception as e:
        print("triage failed:", e)
        return jsonify({"error": "Failed to analyze image with AI", "details": str(e)}), 500

    phash = dhash(image_bytes)
    image_url = store.save_image(image_bytes, image_file.filename, mime_type)

    draft = {
        "category": analysis.get("category"),
        "severity": analysis.get("severity"),
        "phash": phash,
        "lat": place["lat"] if place else None,
        "lng": place["lng"] if place else None,
        "address": place["address"] if place else location_text,
        "created_at": store.now_iso(),
        "status": "Submitted",
    }

    duplicates = duplicate_candidates(draft, store.list_reports())
    preview = priority_score(draft, similar_count=len(duplicates))

    return jsonify({
        **analysis,
        "phash": phash,
        "image_url": image_url,
        "location_resolved": place,
        "duplicates": duplicates,
        "priority": preview,
    })


@app.route("/analyze-text", methods=["POST"])
def analyze_text():
    """Same triage, but from typed words - the Hindi-first path."""
    if not ai.available():
        return _no_ai()

    data = request.json or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Describe the problem first"}), 400

    location_text = data.get("location", "")
    if data.get("lat") and data.get("lng"):
        place = geo.reverse_geocode(data["lat"], data["lng"])
    else:
        place = geo.geocode(location_text)

    try:
        analysis = ai.triage_text(text, location_text)
    except Exception as e:
        print("text triage failed:", e)
        return jsonify({"error": "Failed to process the complaint", "details": str(e)}), 500

    draft = {
        "category": analysis.get("category"),
        "severity": analysis.get("severity"),
        "phash": None,
        "lat": place["lat"] if place else None,
        "lng": place["lng"] if place else None,
        "address": place["address"] if place else location_text,
        "created_at": store.now_iso(),
        "status": "Submitted",
    }
    duplicates = duplicate_candidates(draft, store.list_reports())

    return jsonify({
        **analysis,
        "image_url": None,
        "phash": None,
        "location_resolved": place,
        "duplicates": duplicates,
        "priority": priority_score(draft, len(duplicates)),
    })


@app.route("/reports", methods=["GET"])
def get_reports():
    reports = visible_reports()

    category = request.args.get("category")
    severity = request.args.get("severity")
    department = request.args.get("department")

    if category and category != "All":
        reports = [r for r in reports if r.get("category") == category]
    if severity and severity != "All":
        reports = [r for r in reports if r.get("severity") == severity]
    if department and department != "All":
        reports = [r for r in reports if department.lower() in (r.get("department") or "").lower()]

    return jsonify(reports)


@app.route("/reports", methods=["POST"])
def create_report():
    data = request.json or {}
    merge_into = data.get("merge_into")

    place = data.get("location_resolved") or {}
    row = {
        "id": store.new_report_id(),
        "issue": data.get("issue", "Civic issue"),
        "category": data.get("category", "Other"),
        "severity": data.get("severity", "Medium"),
        "confidence": data.get("confidence", "-"),
        "department": data.get("department", "Public Works"),
        "routing_reason": data.get("routing_reason", ""),
        "complaint": data.get("complaint", ""),
        "complaint_hi": data.get("complaint_hi", ""),
        "location": data.get("location", ""),
        "address": place.get("address") or data.get("location", ""),
        "lat": place.get("lat"),
        "lng": place.get("lng"),
        "description": data.get("description", ""),
        "language": data.get("language", "en"),
        "image_url": data.get("image_url"),
        "phash": data.get("phash"),
        "status": "Submitted",
        "parent_id": merge_into,
        "resolution_note": "",
        "after_image_url": None,
        "verification": None,
        "resolved_at": None,
        "created_at": store.now_iso(),
    }

    saved = store.insert_report(row)

    if merge_into:
        parent = store.get_report(merge_into)
        supporters = len(store.supporters_of(merge_into))
        store.add_notification(
            merge_into,
            f"Another citizen confirmed this issue. {supporters} reports are now linked to {merge_into}.",
            kind="support",
        )
        return jsonify({
            "merged_into": merge_into,
            "report": saved,
            "parent": enrich(parent, store.list_reports()) if parent else None,
        }), 201

    store.add_notification(
        saved["id"], f"Complaint {saved['id']} received and routed to {saved['department']}."
    )
    return jsonify(enrich(saved, store.list_reports())), 201


@app.route("/reports/<report_id>", methods=["PATCH"])
def patch_report(report_id):
    data = request.json or {}
    patch = {}

    if "status" in data:
        patch["status"] = data["status"]
        if data["status"] == "Resolved":
            patch["resolved_at"] = store.now_iso()
    if "resolution_note" in data:
        patch["resolution_note"] = data["resolution_note"]

    if not patch:
        return jsonify({"error": "Nothing to update"}), 400

    updated = store.update_report(report_id, patch)
    if not updated:
        return jsonify({"error": "Report not found"}), 404

    if "status" in patch:
        message = {
            "Submitted": f"{report_id} is back in the queue for review.",
            "In Progress": f"A crew has been dispatched for {report_id}.",
            "Resolved": f"{report_id} has been marked resolved by the department.",
        }.get(patch["status"], f"{report_id} was updated to {patch['status']}.")
        store.add_notification(report_id, message)

        # Everyone who reported the same thing should hear about it too.
        for child in store.supporters_of(report_id):
            store.add_notification(child["id"], message)

    return jsonify(enrich(updated, store.list_reports()))


@app.route("/reports/<report_id>/verify", methods=["POST"])
def verify_report(report_id):
    """Department uploads the after photo; Gemini compares it against the original."""
    if not ai.available():
        return _no_ai()

    report = store.get_report(report_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404
    if "image" not in request.files:
        return jsonify({"error": "Upload the completed-work photo"}), 400

    after_file = request.files["image"]
    after_bytes = after_file.read()
    after_mime = after_file.mimetype or "image/jpeg"

    before_bytes, before_mime = _fetch_image(report.get("image_url"))
    if not before_bytes:
        return jsonify({"error": "Original evidence photo is unavailable for comparison"}), 400

    try:
        result = ai.verify_resolution(
            before_bytes, before_mime, after_bytes, after_mime, report.get("issue", "civic issue")
        )
    except Exception as e:
        print("verification failed:", e)
        return jsonify({"error": "Verification failed", "details": str(e)}), 500

    after_url = store.save_image(after_bytes, after_file.filename, after_mime)

    patch = {
        "after_image_url": after_url,
        "verification": result,
        "resolution_note": request.form.get("note") or report.get("resolution_note", ""),
    }
    if result.get("verified"):
        patch["status"] = "Resolved"
        patch["resolved_at"] = store.now_iso()

    updated = store.update_report(report_id, patch)

    if result.get("verified"):
        note = f"{report_id} resolved. The repair was visually verified at {result.get('confidence', 0)}% confidence."
    else:
        note = f"{report_id} was inspected but the issue still appears unresolved, so it stays open."
    store.add_notification(report_id, note, kind="verification")
    for child in store.supporters_of(report_id):
        store.add_notification(child["id"], note, kind="verification")

    return jsonify(enrich(updated, store.list_reports()))


def _fetch_image(url):
    """Read the original evidence back, whether it lives on disk or in Supabase."""
    if not url:
        return None, None
    try:
        if url.startswith("/uploads/"):
            path = os.path.join(store.UPLOAD_DIR, url.split("/uploads/")[1])
            with open(path, "rb") as f:
                return f.read(), "image/jpeg"
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        return r.content, r.headers.get("Content-Type", "image/jpeg").split(";")[0]
    except Exception as e:
        print("could not fetch original image:", e)
        return None, None


# --- notifications -------------------------------------------------------

@app.route("/notifications", methods=["GET"])
def get_notifications():
    ids = request.args.get("report_ids")
    report_ids = [i for i in ids.split(",") if i] if ids else None
    return jsonify(store.list_notifications(report_ids))


@app.route("/notifications/read", methods=["POST"])
def read_notifications():
    ids = (request.json or {}).get("ids", [])
    if ids:
        store.mark_notifications_read(ids)
    return jsonify({"ok": True})


# --- location ------------------------------------------------------------

@app.route("/geocode", methods=["POST"])
def do_geocode():
    data = request.json or {}
    if data.get("lat") is not None and data.get("lng") is not None:
        return jsonify(geo.reverse_geocode(data["lat"], data["lng"]))

    place = geo.geocode(data.get("query", ""))
    if not place:
        return jsonify({"error": "Could not find that place. Try adding the city or a landmark."}), 404
    return jsonify(place)


# --- analytics -----------------------------------------------------------

@app.route("/analytics", methods=["GET"])
def analytics():
    reports = visible_reports()
    total = len(reports)
    resolved = [r for r in reports if r.get("status") == "Resolved"]

    durations = []
    for r in resolved:
        start, end = _parse_iso(r.get("created_at")), _parse_iso(r.get("resolved_at"))
        if start and end:
            durations.append((end - start).total_seconds() / 3600)
    avg_hours = round(sum(durations) / len(durations), 1) if durations else None

    by_category = Counter(r.get("category", "Other") for r in reports)
    by_severity = Counter(r.get("severity", "Medium") for r in reports)

    today = datetime.now(timezone.utc).date()
    trend = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        opened = sum(
            1 for r in reports
            if (_parse_iso(r.get("created_at")) or datetime.now(timezone.utc)).date() == day
        )
        closed = sum(
            1 for r in resolved
            if (_parse_iso(r.get("resolved_at")) or datetime.now(timezone.utc)).date() == day
        )
        trend.append({
            "date": day.isoformat(),
            "label": day.strftime("%a"),
            "reported": opened,
            "resolved": closed,
        })

    return jsonify({
        "total": total,
        "resolved": len(resolved),
        "resolution_rate": round(len(resolved) / total * 100) if total else 0,
        "critical": sum(1 for r in reports if r.get("severity") == "Critical"),
        "escalated": sum(1 for r in reports if r.get("escalated")),
        "avg_resolution_hours": avg_hours,
        "by_category": [{"name": k, "count": v} for k, v in by_category.most_common()],
        "by_severity": [{"name": k, "count": v} for k, v in by_severity.most_common()],
        "trend": trend,
        "hotspots": hotspots(reports),
    })


def hotspots(reports, min_reports=2):
    """Cluster reports onto a ~500m grid and name each cluster after its locality."""
    grid = defaultdict(list)
    for r in reports:
        if r.get("lat") is None or r.get("lng") is None:
            continue
        key = (round(r["lat"] / 0.005), round(r["lng"] / 0.005))
        grid[key].append(r)

    clusters = []
    for group in grid.values():
        weight = sum(r["support_count"] for r in group)
        if weight < min_reports:
            continue
        label = Counter(
            (r.get("address") or r.get("location") or "Unnamed area").split(",")[0]
            for r in group
        ).most_common(1)[0][0]
        clusters.append({
            "area": label,
            "reports": weight,
            "open": sum(1 for r in group if r.get("status") != "Resolved"),
            "top_category": Counter(r.get("category") for r in group).most_common(1)[0][0],
            "lat": sum(r["lat"] for r in group) / len(group),
            "lng": sum(r["lng"] for r in group) / len(group),
        })

    clusters.sort(key=lambda c: c["reports"], reverse=True)
    return clusters[:6]


# --- action plan (kept at the original path so old links keep working) ---

@app.route("/api/generate-action-plan", methods=["POST", "OPTIONS"])
@app.route("/api/generate-action-plan/", methods=["POST", "OPTIONS"])
def generate_action_plan():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    if not ai.available():
        return _no_ai()

    data = request.json or {}
    try:
        plan = ai.action_plan(
            data.get("title", "Civic issue"),
            data.get("description", "Maintenance required"),
            data.get("department", "Public Works"),
            data.get("priority"),
        )
        return jsonify({"action_plan": plan})
    except Exception as e:
        print("action plan failed:", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
