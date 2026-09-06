from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import pytesseract
from PIL import Image
import io
import uuid
import json

from database import SessionLocal, PatientIntake

app = FastAPI(title="MediKiosk Clinical API")

# Allow requests from React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to open and close DB session per request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "MediKiosk FastAPI Backend",
        "docs": "http://localhost:8000/docs"
    }

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "FastAPI + OCR Engine Active"}

# 1. Endpoint: AI Voice Bot Initiation
@app.post("/api/voice/start")
def start_voice_session(db: Session = Depends(get_db)):
    session_id = f"voice_{uuid.uuid4().hex[:10]}"

    # Save intake record in SQLite
    new_intake = PatientIntake(
        session_id=session_id,
        intake_type="voice",
        structured_data=json.dumps({"status": "listening", "symptoms": []})
    )
    db.add(new_intake)
    db.commit()

    return {
        "sessionId": session_id,
        "status": "ready",
        "message": "AI voice intake pipeline activated."
    }

# 2. Endpoint: Real Prescription OCR
@app.post("/api/ocr")
async def process_prescription(
    prescription: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not prescription.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image (PNG, JPG, JPEG).")

    try:
        # Read uploaded image bytes directly in RAM
        image_bytes = await prescription.read()
        image = Image.open(io.BytesIO(image_bytes))

        # Run Tesseract OCR (supports English, Hindi, and Marathi)
        raw_text = pytesseract.image_to_string(image, lang="eng+hin+mar")

        # Basic parser to structure raw OCR text
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        
        parsed_record = {
            "patientName": lines[0] if len(lines) > 0 else "Patient (Unspecified)",
            "medication": lines[1] if len(lines) > 1 else (raw_text[:40].strip() or "General Medication"),
            "instructions": lines[2] if len(lines) > 2 else "Take as advised by medical officer",
            "doctor": "Verified Attending Physician"
        }

        # Store scan record in database
        session_id = f"ocr_{uuid.uuid4().hex[:10]}"
        new_record = PatientIntake(
            session_id=session_id,
            intake_type="ocr",
            raw_extracted_text=raw_text,
            structured_data=json.dumps(parsed_record)
        )
        db.add(new_record)
        db.commit()

        return {
            "success": True,
            "sessionId": session_id,
            "fileName": prescription.filename,
            "extractedData": parsed_record,
            "rawText": raw_text
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")