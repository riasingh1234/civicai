import os
import json
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize Gemini Client
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

SYSTEM_PROMPT = """
You are an expert AI civic infrastructure analysis system. Analyze the provided image of a reported civic issue.
Extract structured metadata and write a concise formal public complaint.

Return ONLY a valid JSON object matching this exact structure with no Markdown formatting or code blocks:
{
  "issue": "<Short Title, e.g., Pothole Detected, Broken Streetlight>",
  "category": "<Must be one of: Road Infrastructure, Waste Management, Street Lighting, Water Supply, Drainage, Public Safety, Traffic, Other>",
  "severity": "<Must be: Low, Medium, High, or Critical>",
  "confidence": "<e.g., 92%>",
  "department": "<Appropriate municipal department name>",
  "complaint": "<Formal 2-3 sentence public complaint based on visual evidence, location context, and description>"
}
"""

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "CivicAI backend is running"})

@app.route("/analyze", methods=["POST"])
def analyze_issue():
    if not client:
        return jsonify({"error": "Gemini API key is not configured on the server"}), 500

    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    image_file = request.files['image']
    location = request.form.get('location', 'Unspecified Location')
    description = request.form.get('description', '')

    try:
        image_bytes = image_file.read()
        mime_type = image_file.mimetype or 'image/jpeg'

        prompt = f"Context Location: {location}\nUser Description: {description}\n\nAnalyze this civic issue photo."

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                prompt
            ],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.2
            )
        )

        result_json = json.loads(response.text)
        return jsonify(result_json)

    except Exception as e:
        print(f"Error during analysis: {e}")
        return jsonify({"error": "Failed to analyze image with AI", "details": str(e)}), 500

@app.route('/api/generate-action-plan', methods=['POST', 'OPTIONS'])
@app.route('/api/generate-action-plan/', methods=['POST', 'OPTIONS'])
def generate_action_plan():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    if not client:
        return jsonify({"error": "Gemini API key is not configured on the server"}), 500

    try:
        data = request.json or {}
        issue_title = data.get('title', 'Civic Issue')
        description = data.get('description', 'Maintenance required')
        department = data.get('department', 'Public Works')

        prompt = f"""
        You are an expert municipal Operations Director.
        Generate a concise, 2-sentence official action plan for city workers to resolve this issue:
        Issue: {issue_title}
        Description: {description}
        Department Assigned: {department}
        
        Format: Direct, professional, actionable instructions including estimated repair timeframe and required equipment/crew.
        """

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )

        return jsonify({'action_plan': response.text.strip()})
    except Exception as e:
        print(f"Error generating action plan: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)