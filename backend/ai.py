"""All Gemini calls live here so the route handlers stay readable."""

import json
import os

from google import genai
from google.genai import types

MODEL = "gemini-2.5-flash"

_api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=_api_key) if _api_key else None


def available():
    return client is not None


TRIAGE_PROMPT = """
You are the triage engine of an Indian municipal complaint system. You are given a
photograph of a civic issue, plus optional location context and a citizen note that
may be written in English or Hindi (including Roman-script Hindi).

Return ONLY a valid JSON object, no markdown fences:
{
  "issue": "<short English title, e.g. Pothole on carriageway>",
  "category": "<one of: Road Infrastructure, Waste Management, Street Lighting, Water Supply, Drainage, Public Safety, Traffic, Other>",
  "severity": "<Low | Medium | High | Critical>",
  "confidence": "<percentage string, e.g. 92%>",
  "department": "<municipal department that owns this issue>",
  "routing_reason": "<one sentence explaining, from the visual evidence, why this department and not a neighbouring one>",
  "complaint": "<formal 2-3 sentence complaint in English, citing what is visible and the location>",
  "complaint_hi": "<the same complaint in Hindi (Devanagari)>",
  "public_safety_note": "<one short line on the risk to the public, or an empty string>"
}

Judge severity by risk to people, not by how bad the photo looks. A pothole on a
school approach road outranks a larger pothole on an empty service lane.
If the image does not show a civic issue at all, set category to "Other",
severity to "Low", and say so plainly in the complaint.
"""


def triage_image(image_bytes, mime_type, location, description):
    context = (
        f"Location context: {location or 'not provided'}\n"
        f"Citizen note: {description or 'none'}\n\n"
        "Analyse this civic issue photograph."
    )

    response = client.models.generate_content(
        model=MODEL,
        contents=[types.Part.from_bytes(data=image_bytes, mime_type=mime_type), context],
        config=types.GenerateContentConfig(
            system_instruction=TRIAGE_PROMPT,
            response_mime_type="application/json",
            temperature=0.2,
        ),
    )
    return json.loads(response.text)


TEXT_PROMPT = """
A citizen has described a civic problem in their own words, in English or Hindi
(Devanagari or Roman script). Turn it into a structured municipal complaint.

Return ONLY valid JSON:
{
  "issue": "<short English title>",
  "category": "<one of: Road Infrastructure, Waste Management, Street Lighting, Water Supply, Drainage, Public Safety, Traffic, Other>",
  "severity": "<Low | Medium | High | Critical>",
  "confidence": "<percentage string>",
  "department": "<municipal department>",
  "routing_reason": "<one sentence on why this department>",
  "complaint": "<formal 2-3 sentence complaint in English>",
  "complaint_hi": "<same complaint in Hindi>"
}
"""


def triage_text(text, location):
    """Used when a citizen types a complaint instead of uploading a photo."""
    prompt = f"Location context: {location or 'not provided'}\nCitizen's words: {text}"
    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=TEXT_PROMPT,
            response_mime_type="application/json",
            temperature=0.3,
        ),
    )
    return json.loads(response.text)


VERIFY_PROMPT = """
You are verifying municipal repair work. You get two photographs of the same
location: the first is the citizen's original complaint, the second is what the
department uploaded after the work.

Return ONLY valid JSON:
{
  "verified": <true | false>,
  "confidence": <integer 0-100>,
  "same_location": <true | false>,
  "observation": "<two sentences on what changed between the images and what, if anything, still looks wrong>"
}

Set verified to false if the original problem is still visible, if only part of
it was addressed, or if the second photo is clearly a different place.
"""


def verify_resolution(before_bytes, before_mime, after_bytes, after_mime, issue):
    response = client.models.generate_content(
        model=MODEL,
        contents=[
            "Image 1 - original complaint:",
            types.Part.from_bytes(data=before_bytes, mime_type=before_mime),
            "Image 2 - after the department's work:",
            types.Part.from_bytes(data=after_bytes, mime_type=after_mime),
            f"The reported issue was: {issue}. Has it actually been fixed?",
        ],
        config=types.GenerateContentConfig(
            system_instruction=VERIFY_PROMPT,
            response_mime_type="application/json",
            temperature=0.1,
        ),
    )
    return json.loads(response.text)


def action_plan(title, description, department, priority=None):
    prompt = f"""
    You are a municipal operations director in India. Write a 2-3 sentence work order
    for the field crew handling this complaint.

    Issue: {title}
    Details: {description}
    Department: {department}
    Priority score: {priority if priority is not None else 'not scored'}/100

    Be specific about crew size, equipment, and a realistic turnaround. No preamble,
    no bullet points, no markdown.
    """
    response = client.models.generate_content(model=MODEL, contents=prompt)
    return response.text.strip()
