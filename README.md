
# 🌍 CivicAI
> Empowering communities through AI-driven municipal issue tracking and automated action planning.

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge&logo=vercel)](civicai-git-main-ria22.vercel.app)
[![Backend API](https://img.shields.io/badge/API-Render-blue?style=for-the-badge&logo=render)](https://civicai-backend-nbys.onrender.com)

---

## 🚀 Live Access
* **Frontend App:** [civicai-git-main-ria22.vercel.app](https://civicai-swart.vercel.app)
* **Backend API Documentation / Health:** [https://civicai-backend.onrender.com](https://civicai-backend.onrender.com)

---
> **Hackathon Project** | Transforming citizen reporting into instant, multimodal AI triage, geospatial hazard mapping, and official department dispatch.

---

## 💡 The Problem
Municipalities process thousands of infrastructure complaints manually—ranging from dangerous road hazards and open sewage to broken streetlights. Traditional reporting systems suffer from:
- **Delayed Triage:** 3–5 business days required to evaluate and route citizen complaints manually.
- **Inaccurate Priority:** Critical public safety hazards are buried under minor complaints.
- **Lack of Transparency:** Citizens receive zero updates once a ticket is submitted.

---

## 🔥 The Solution
**CivicAI** bridges the gap between citizens and city operations using **Google Gemini 2.5 Flash**.

1. **Instant Visual Triage:** Citizens upload photos; Gemini Vision analyzes hazard scope, categorizes severity, and auto-drafts formal municipal complaints.
2. **Command Center Map & Heatmap:** City officials visualize hazards on interactive geospatial maps with a **Density/Heatmap Mode** for high-risk cluster detection.
3. **AI Operational Action Plans:** Gemini generates actionable repair instructions and equipment checklists for field workers with one click.
4. **Real-Time Dispatch Alerts:** Citizens receive instant status updates when dispatch teams take action.

---

## ✨ Key Features

### 👤 Citizen Portal
- 📸 **Visual Incident Analysis:** Multimodal analysis of physical damage directly from photos.
- 📍 **Geospatial Pinning:** Automatic location contextualization and dynamic coordinate mapping.
- 📄 **Automated Complaint Drafting:** AI creates formal, structured municipal complaints ready for official submission.


### 🏛️ City Official Command Center
- 📊 **Executive KPI Metrics:** High-level overview of total incidents, critical hazards, pending actions, and resolved cases.
- 🔥 **Density & Heatmap Mode:** Toggleable geospatial heat auras powered by Leaflet to highlight high-density danger zones.
- 🤖 **AI Action Plan Generator:** Generates custom field-worker work orders and repair instructions on demand.
- ⚡ **Real-Time Dispatch Trigger:** Instant status updates with citizen notifications.

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, React-Leaflet, OpenStreetMap/Hot-OSM
- **Backend:** Python, Flask, Flask-CORS
- **AI Core:** Google Gemini 2.5 Flash API (`google-genai` SDK)
- **Geospatial Visualization:** Leaflet.js

---

## 🚀 Quickstart (Local Development)

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Gemini API Key ([Get yours here](https://aistudio.google.com/))

### 1. Clone Repository
```bash
git clone [https://github.com/riasingh1234/civicai.git](https://github.com/riasingh1234/civicai)
cd civicai