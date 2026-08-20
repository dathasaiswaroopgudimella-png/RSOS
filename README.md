# 🚨 RoadSOS — Autonomous & Clinical Emergency Decision Intelligence

<div align="center">

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg?logo=react&logoColor=black)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy_Ready-000000.svg?logo=vercel&logoColor=white)](https://vercel.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**A mission-critical emergency triage and autonomous crash detection platform designed to eliminate fatal delays during the "Golden Hour" of transit accidents and trauma.**

[Live Architecture](#-architecture--system-flow) • [Sentinel Engine](#-sentinel-autonomous-mode) • [Clinical Calculus](#-clinical-suitability-calculus) • [Vercel Deployment](#-vercel-deployment) • [Local Setup](#-quick-start)

</div>

---

## 🌟 Executive Overview

During road accidents, high-speed collisions, and sudden cardiac or neuro-trauma events, **minutes decide between life and death**. Traditional emergency responses suffer from two fatal vulnerabilities:
1. **Unconscious Victims**: High-G kinetic collisions render occupants unconscious, unable to dial for help.
2. **Sub-Optimal Hospital Routing**: Patients are often rushed to the closest clinic rather than the nearest facility with verified Trauma Surgery, ICU, Ventilators, Cath Lab, or Blood Bank capabilities.

**RoadSOS** solves this with a **Dual-Engine Emergency Architecture**:
- **Sentinel Omniscient Engine (Autonomous Mode)**: 60Hz real-time kinetic physics engine detecting severe impacts ($>4.5\text{G}$), sudden deceleration ($>35\text{ km/h} \to 0$), and rollovers with a 30-second auditory-haptic override countdown that automatically broadcasts GPS telemetry if un-cancelled.
- **Clinical Triage SOS (Manual Mode)**: 1-tap instant emergency trigger or categorized clinical symptom matrix (Cardiac Arrest, Stroke FAST, Severe Burn, Hemorrhage, Pediatric Trauma).
- **Spatial BallTree & Clinical Calculus**: Spherical haversine search across **30,273+ national hospitals** (National Hospital Directory from data.gov.in) ranking facilities by clinical capability match, bed capacity, and trauma tier.
- **Dual Racing AI Triage**: Sub-10ms deterministic clinical rule engine racing with OpenRouter neural models (DeepSeek V3 / Claude 3.5) for step-by-step first aid stabilization.

---

## 🏗️ Architecture & System Flow

```mermaid
flowchart TB
    subgraph Client ["Frontend (Vite + React 18 + TypeScript + Tailwind)"]
        Sensors["Device Sensors (Accelerometer, Gyro, GPS)"]
        SimStudio["Kinetic Crash Simulator Studio"]
        Sentinel["Sentinel Engine (G-Force >4.5G / Rapid Deceleration)"]
        ManualUI["Manual Clinical Triage UI (Symptom Matrix)"]
        Overlay["30s Sentinel Emergency Countdown Overlay"]
        Map["Leaflet Interactive Navigation & Route Tracing"]
        Dispatch["ICE Emergency Contact & WhatsApp/SMS Dispatch"]
    end

    subgraph Backend ["FastAPI High-Throughput Async Backend"]
        API["FastAPI REST & WebSocket Gateway"]
        Spatial["BallTree(haversine) Spatial Index (<5ms)"]
        DB[(SQLite 30,273+ Hospitals & FTS5 Search)]
        ClinicalScore["Clinical Suitability Calculus Engine"]
        AITriage["Racing Dual Triage: Deterministic + OpenRouter LLM"]
        GeoWeather["Reverse Geocoder & Weather Context"]
    end

    Sensors --> Sentinel
    SimStudio --> Sentinel
    Sentinel -->|Kinetic Anomaly| Overlay
    Overlay -->|Auto / Manual Confirm| API
    ManualUI -->|User Trigger| API

    API --> Spatial
    Spatial --> DB
    DB --> ClinicalScore
    ClinicalScore --> AITriage
    API --> GeoWeather
    AITriage --> Client
    Dispatch --> Paramedics["Paramedics & Emergency Contacts"]
```

---

## ⚡ Key Engineering Innovations

### 1. 🛡️ Sentinel Autonomous Physics Engine
- Continuous 60Hz monitoring via `LinearAccelerationSensor` and `devicemotion`.
- Kinetic threshold: $G_{\text{force}} = \frac{\sqrt{x^2 + y^2 + z^2}}{9.80665} > 4.5\text{G}$.
- Deceleration threshold: $\Delta v > 30\text{ km/h}$ in $<1.5\text{s}$.
- Rollover tilt threshold: $\theta_{\text{tilt}} > 65^\circ$.
- Audio siren pulse synthesis via Web Audio API and Morse code SOS vibration via Web Vibration API.
- Integrated **Kinetic Simulation Studio** allowing live testing on desktop and mobile browsers.

### 2. 🏥 Spatial BallTree & Clinical Suitability Calculus
Physical proximity alone can be fatal if the nearest center lacks neurosurgery or an active blood bank. RoadSOS computes:
$$\text{Score} = 50.0 + S_{\text{specialties}} + S_{\text{facilities}} + S_{\text{tier}} + S_{\text{beds}} + S_{\text{emergency}} - (1.5 \times D_{\text{km}})$$

Where:
- **Specialty match**: $+15.0$ per symptom-to-specialty match.
- **Critical facilities** (ICU, Trauma Center, Cath Lab, Blood Bank, Ventilator): $+8.0 \to +20.0$ each.
- **Apex Tertiary / Medical College Tier**: $+30.0$.
- **High Bed Capacity** ($>500$ beds): $+20.0$.
- **24/7 Verified Emergency**: $+15.0$.

### 3. 🧠 Dual-Engine AI Triage Racing
- **Deterministic Engine**: Sub-10ms instantaneous clinical guidance based on standardized trauma resuscitation protocols.
- **OpenRouter Neural Engine**: Asynchronously queries DeepSeek V3 / Claude 3.5 for patient-specific clinical reasoning and interactive first-aid stabilization checklists.
- Total response time guaranteed $<3.5\text{s}$ under all network conditions.

---

## 🚀 Vercel Deployment

Deploy RoadSOS directly to Vercel with zero configuration:

```bash
# 1. Install Vercel CLI if not already installed
npm i -g vercel

# 2. Deploy from project root
vercel --prod
```

The repository includes:
- [`vercel.json`](file:///c:/Users/datha/OneDrive/Desktop/ROS%20project/vercel.json): Configured for Vite SPA build and serverless Python `/api` routing.
- [`api/index.py`](file:///c:/Users/datha/OneDrive/Desktop/ROS%20project/api/index.py): Serverless FastAPI entrypoint.
- Embedded offline-first fail-safe client dataset for instant edge execution.

---

## 💻 Quick Start (Local Development)

### Prerequisites
- Python 3.10+ (or [uv](https://github.com/astral-sh/uv))
- Node.js 18+ and npm

### 1. Clone & Configure
```bash
git clone https://github.com/dathasaiswaroopgudimella-png/RSOS.git
cd RSOS
cp .env.example .env
```

### 2. Backend Setup
```bash
# Install Python dependencies and build spatial database
uv sync
uv run python scripts/build_hospital_db.py

# Run FastAPI backend
uv run uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to access the application.

---

## 🧪 Test Suite

Run automated unit and integration tests:

```bash
# Backend pytest suite (spatial BallTree, clinical calculus, triage racing, endpoints)
uv run pytest -v
```

---

## 📄 License
MIT License. Built for life-saving emergency response.
