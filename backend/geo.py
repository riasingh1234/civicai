"""Geocoding + distance helpers. Uses OpenStreetMap Nominatim (free, no key)."""

import math
import requests

NOMINATIM = "https://nominatim.openstreetmap.org"

# Nominatim blocks requests without a real UA string.
HEADERS = {"User-Agent": "CivicAI/1.0 (civic issue reporting, hackathon project)"}

# Bias free-text searches towards Delhi NCR so "Sector 14" resolves sanely.
VIEWBOX = "76.80,28.90,77.60,28.35"


def haversine_m(lat1, lon1, lat2, lon2):
    """Great-circle distance in metres."""
    R = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def geocode(query):
    """Free text -> {lat, lng, address}. Returns None if nothing matches."""
    if not query or not query.strip():
        return None
    try:
        r = requests.get(
            f"{NOMINATIM}/search",
            params={
                "q": query,
                "format": "json",
                "limit": 1,
                "countrycodes": "in",
                "viewbox": VIEWBOX,
                "bounded": 0,
            },
            headers=HEADERS,
            timeout=8,
        )
        hits = r.json()
        if not hits:
            return None
        top = hits[0]
        return {
            "lat": float(top["lat"]),
            "lng": float(top["lon"]),
            "address": top.get("display_name", query),
        }
    except Exception as e:
        print("geocode failed:", e)
        return None


def reverse_geocode(lat, lng):
    """Coordinates -> readable address. Used by the 'Detect my location' button."""
    try:
        r = requests.get(
            f"{NOMINATIM}/reverse",
            params={"lat": lat, "lon": lng, "format": "json", "zoom": 17},
            headers=HEADERS,
            timeout=8,
        )
        data = r.json()
        return {
            "lat": float(lat),
            "lng": float(lng),
            "address": data.get("display_name", f"{lat:.5f}, {lng:.5f}"),
        }
    except Exception as e:
        print("reverse geocode failed:", e)
        return {"lat": float(lat), "lng": float(lng), "address": f"{lat:.5f}, {lng:.5f}"}


# Landmark keywords that raise the location-sensitivity part of the priority score.
SENSITIVE_WORDS = [
    "school", "hospital", "clinic", "college", "university", "metro",
    "station", "market", "bus stand", "crossing", "chowk", "highway",
    "temple", "mosque", "church", "park",
]


def location_sensitivity(address):
    """0-1 score. Near a school or hospital an issue matters more than on an empty road."""
    if not address:
        return 0.0
    text = address.lower()
    hits = sum(1 for w in SENSITIVE_WORDS if w in text)
    return min(hits / 2.0, 1.0)


def nearby_landmark(address):
    if not address:
        return None
    text = address.lower()
    for w in SENSITIVE_WORDS:
        if w in text:
            return w
    return None
