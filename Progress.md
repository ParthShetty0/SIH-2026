# MediKiosk

**Repository:** SIH-2026

A smart patient self-check-in health kiosk interface with a connected backend, built for hospital and clinic outpatient intake.

## Overview

MediKiosk allows outpatients to check in independently by:
- Speaking their symptoms (voice intake)
- Reading/scanning physical doctor prescriptions (OCR)
- Switching between regional languages without manual staff triage

**Problem it solves:**
- Reduces queue congestion at clinical intake desks
- Removes language barriers for non-English speakers through multilingual audio/text
- Structures physical prescription data automatically for hospital databases

## Tech Stack

| Technology | Why It Was Chosen | Where It's Used |
|---|---|---|
| React (Vite) | Fast development cycle, modular UI rendering suitable for kiosks | Entire `medikiosk/` frontend |
| Tailwind CSS | Rapid, atomic styling for custom clinical design systems | All component styling in `src/` |
| Lucide React | High-clarity, minimalist iconography for medical interfaces | Action cards, header indicators, modals |
| react-i18next | Instant UI language changes without prop drilling | `src/i18n.js` and all UI components |
| FastAPI (Python) | High-performance, async-capable backend suited for AI/image processing | `backend/fastapi_backend/main.py` |
| Tesseract OCR | Open-source OCR supporting regional Indian languages | Linux system (apt) and Python (pytesseract) |
| SQLAlchemy | Python ORM for clean querying/writing without raw SQL | `backend/fastapi_backend/database.py` |
| SQLite | Lightweight, zero-config embedded database for single-station intake logging | `fastapi_backend/kiosk.db` |

## Project Structure

```
SIH-2026/
├── backend/
│   ├── fastapi_backend/
│   │   ├── venv/                   # Python virtual environment (libraries)
│   │   ├── database.py             # SQLite engine and PatientIntake SQLAlchemy model
│   │   ├── main.py                 # FastAPI app, CORS, /api/voice/start, /api/ocr
│   │   └── kiosk.db                # SQLite database (auto-generated on first run)
│   ├── package.json                # Previous Node.js server dependencies
│   └── server.js                   # Previous Express server (kept as backup)
│
├── medikiosk/                      # Vite + React Frontend
│   ├── public/                     # Static icons and assets
│   ├── src/
│   │   ├── assets/                 # Graphics and imagery
│   │   ├── components/
│   │   │   ├── Header.jsx          # Top clinical bar with live clock & status
│   │   │   ├── KioskCard.jsx       # Reusable large card component for kiosk actions
│   │   │   ├── LanguageModal.jsx   # Language picker popup using react-i18next
│   │   │   ├── OcrModal.jsx        # Displays parsed prescription data
│   │   │   └── VoiceModal.jsx      # Active listening overlay with visual indicator
│   │   ├── constants/
│   │   │   └── translations.js     # Dictionary definitions (English, Hindi, Marathi)
│   │   ├── services/
│   │   │   └── api.js              # Fetch functions for backend communication
│   │   ├── App.css
│   │   ├── App.jsx                 # Main layout coordinator
│   │   ├── i18n.js                 # react-i18next configuration
│   │   ├── index.css               # Tailwind CSS utility imports
│   │   └── main.jsx                # React root mount with i18n initialization
│   ├── index.html
│   ├── package.json                # Frontend dependencies (React, Lucide, i18next)
│   └── vite.config.js              # Vite configuration with proxy to http://localhost:8000
└── README.md
```

### Key Files

- **`backend/fastapi_backend/main.py`** — Runs the API server, receives images from the frontend via `UploadFile`, runs Tesseract OCR across multiple languages (`eng+hin+mar`), writes intake logs to SQLite, and returns JSON.
- **`backend/fastapi_backend/database.py`** — Manages the SQLite database connection and defines table structures using SQLAlchemy.
- **`medikiosk/vite.config.js`** — Forwards any request matching `/api/*` to `http://localhost:8000` (FastAPI).
- **`medikiosk/src/i18n.js`** — Contains dictionaries for English, Hindi, and Marathi for on-the-fly language switching.
- **`medikiosk/src/App.jsx`** — Coordinates card clicks, hidden file inputs, modal toggles, and UI status alerts.

## Core Logic

- **Client-to-Backend Proxying:** The browser talks to `http://localhost:5173/api/...`. Vite's dev proxy intercepts this and redirects it internally to `http://localhost:8000/api/...`, bypassing CORS restrictions in local development.
- **Tesseract Binary Ingestion:** In `main.py`, the `/api/ocr` endpoint uses `UploadFile` to read the prescription image directly into memory (`io.BytesIO`) without saving temp files. It runs `pytesseract.image_to_string(image, lang="eng+hin+mar")` to extract text across all three target languages.
- **Global Language Switching:** Components call `const { t, i18n } = useTranslation()`. Calling `i18n.changeLanguage('hi')` triggers a re-render across all mounted components using matching translation keys.
- **Database Session Management:** The `get_db()` dependency generator in FastAPI yields a thread-safe database session per request and guarantees closure (`db.close()`) after completion.

## Design Guidelines

Clinical minimalist aesthetic:
- Background: `#f8faf9`
- Accents: `emerald-500` / `emerald-600`
- High contrast slate text
- Clear feedback modals designed for touch kiosks

## Features Completed

| Feature | Description | Files | Status |
|---|---|---|---|
| Clinical Minimalist Design System | Emerald green and white aesthetic, self-check-in cards, live header clock, encrypted status indicators | `App.jsx`, `Header.jsx`, `KioskCard.jsx` | ✅ Completed |
| Frontend Internationalization | Instant dialect toggle (English, Hindi, Marathi) via modal | `i18n.js`, `LanguageModal.jsx`, `App.jsx` | ✅ Completed |
| Prescription Upload & OCR Pipeline | Hidden file input, multipart upload to FastAPI, multi-language Tesseract extraction, parsed-data modal | `api.js`, `OcrModal.jsx`, `main.py` | ✅ Completed |
| FastAPI Intake Service & SQLite Persistence | REST endpoints for voice session creation and prescription logging with auto table creation | `database.py`, `main.py` | ✅ Completed |

## Current Working State

- **Frontend:** Functional, error-free, styled with clinical minimalist theme, proxy configured to port 8000, components organized.
- **Backend:** FastAPI running on `http://localhost:8000`, Swagger docs at `/docs`, connected to SQLite (`kiosk.db`).
- **OCR Pipeline:** Basic Tesseract parsing active — extracts text from uploaded images, splits lines, stores records in SQLite.

### Known Limitations

- Voice bot session is currently a **mock simulation** (generates session IDs, shows listening modal, but doesn't yet record or stream real audio).
- OCR text parsing uses **simple line splitting** rather than a generative LLM (e.g. Gemini/OpenAI) to interpret messy doctor handwriting.

## Setup

### Frontend
```bash
cd medikiosk
npm install
npm run dev   # runs on http://localhost:5173
```

### Backend
```bash
cd backend/fastapi_backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt   # fastapi, uvicorn, sqlalchemy, pytesseract, pillow
uvicorn main:app --reload         # runs on http://localhost:8000
```

Requires system-level Tesseract OCR with Hindi and Marathi language packs:
```bash
sudo apt install tesseract-ocr tesseract-ocr-hin tesseract-ocr-mar
```

## Roadmap

### Immediate Next Step
- **Intelligent OCR Parsing with LLM:** Send raw Tesseract text to a generative AI model (e.g. Gemini 1.5 Flash) to reliably extract structured JSON (`patientName`, `doctorName`, `medications`, `dosages`, `warnings`) even from messy text.

### After That
- **Browser Microphone Integration:** Implement the Web Speech API (`webkitSpeechRecognition`) or `MediaRecorder` in `VoiceModal.jsx` to capture real patient speech.
- **Voice AI Agent Endpoint:** Create a `/api/voice/chat` endpoint in FastAPI that receives patient symptoms, determines urgency (triage level: Red/Yellow/Green), and responds via voice synthesis.

### Future Features
- **Prescription PDF/Print Generation:** Output a printable check-in slip with queue token number.
- **Hospital EMR / FHIR Export:** Push intake records to an external hospital management system.

## Troubleshooting Log

| Problem | Cause | Fix |
|---|---|---|
| `SyntaxError: Cannot use import statement outside a module` | Duplicate `"type": "commonjs"` overriding `"type": "module"` in `package.json` | Removed the duplicate CommonJS line |
| `Cannot GET /` (port 5000) / `{"detail":"Not Found"}` (port 8000) | Visiting the backend API root directly with no route handler registered | UI runs on port 5173; added a fallback `@app.get("/")` status route to FastAPI |
| Python venv creation failure on Debian/Ubuntu | `ensurepip` absent in base Python packages | Ran `sudo apt install -y python3.11-venv` and recreated the venv |
| Uvicorn `Could not import module "main"` | `main.py`/`database.py` misplaced inside `venv/`, and `database.py` was misspelled | Moved files into `fastapi_backend/` and corrected the filename |
| `Failed to resolve import "react-i18next"` | Package referenced in `App.jsx` before installation | Ran `npm install i18next react-i18next` and configured `i18n.js` |

## Why These Choices

- **FastAPI over Node.js/Express (final backend):** Python is the native ecosystem for AI and computer vision — running Tesseract, OpenCV, and LLM orchestration in FastAPI avoids separate microservices.
- **react-i18next over custom state dictionaries:** Managing dictionaries inside `App.jsx` caused prop drilling and made translation difficult for deeply nested components.
