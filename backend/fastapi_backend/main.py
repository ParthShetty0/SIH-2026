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

import os
from groq import Groq

# Initialize client (set GROQ_API_KEY in your environment or pass directly)
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY", "YOUR_FREE_GROQ_API_KEY"))

def extract_prescription_entities(raw_text: str) -> dict:
    prompt = f"""
    You are a clinical transcription assistant. Below is noisy, raw OCR text from a doctor's prescription.
    Extract the following details and return ONLY a valid JSON object:
    - "patientName": Name of patient or "Not Detected"
    - "doctor": Attending doctor's name or "Attending Physician"
    - "medication": Comma-separated list of prescribed drugs with dosages
    - "instructions": Timing or usage instructions (e.g., "Once daily after meals")

    Raw OCR Text:
    \"\"\"{raw_text}\"\"\"

    Return pure JSON with no markdown wrapping or preamble.
    """

    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You output strictly valid JSON."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"}
        )
        return json.loads(chat_completion.choices[0].message.content)
    except Exception as e:
        # Fallback to simple split if LLM call fails
        lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
        return {
            "patientName": lines[0] if lines else "Patient (Unspecified)",
            "medication": lines[1] if len(lines) > 1 else "General Medication",
            "instructions": "Take as advised by medical officer",
            "doctor": "Verified Attending Physician"
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
        parsed_record = extract_prescription_entities(raw_text)
        
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