import os
import io
import uuid
import json
import traceback
from pathlib import Path
from typing import List, Optional
import numpy as np
import cv2
import pytesseract
from dotenv import load_dotenv
from pydantic import BaseModel

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from supabase import create_client, Client

env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# -------------------------------------------------------------
# Auto-detect accessible Groq model at startup
# -------------------------------------------------------------
ACTIVE_GROQ_MODEL = "llama3-8b-8192"

if groq_client:
    try:
        available_models = [m.id for m in groq_client.models.list().data]
        print("\n[Groq] Accessible models on your key:", available_models)
        
        # Priority order of preferred models for clinical triage
        preferred = [
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "llama3-70b-8192",
            "llama3-8b-8192",
            "llama-3.2-11b-text-preview",
            "llama-3.2-3b-preview",
            "gemma2-9b-it",
            "mixtral-8x7b-32768"
        ]
        
        for cand in preferred:
            if cand in available_models:
                ACTIVE_GROQ_MODEL = cand
                break
        else:
            if available_models:
                ACTIVE_GROQ_MODEL = available_models[0]
                
        print(f"[Groq] Selected active model: {ACTIVE_GROQ_MODEL}\n")
    except Exception as e:
        print(f"[Groq] Could not fetch model list: {e}. Defaulting to {ACTIVE_GROQ_MODEL}")

app = FastAPI(title="MediKiosk Clinical API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# Data Models for Conversational Voice Bot
# -------------------------------------------------------------
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class VoiceChatRequest(BaseModel):
    session_id: str
    messages: List[ChatMessage]
    language: Optional[str] = "en"

TRIAGE_SYSTEM_PROMPT = """
You are MediKiosk Clinical AI, an empathetic outpatient intake assistant at a hospital kiosk.
Your task is to conduct a short, 3 to 4 turn conversational diagnostic triage for the physician.

CLINICAL TRIAGE PHASES (Ask sequentially, one per turn):
- Turn 1 (Chief Complaint): Acknowledge symptoms empathetically; clarify exact location and primary sensation.
- Turn 2 (Timeline): Ask how many hours/days this has persisted and whether onset was sudden or gradual.
- Turn 3 (Severity & Associated Symptoms): Ask for a 1-10 severity rating and check for red flags (fever, radiating pain, breathlessness, nausea).
- Turn 4 (Closure & Doctor Handoff): Summarize findings, advise taking a seat for the physician, and set "isComplete": true.

RULES:
1. Ask ONE clear question at a time. Keep it concise (under 20 words) so it sounds natural when spoken aloud.
2. If patient describes crushing chest pain, paralysis, sudden loss of vision, or extreme hemorrhaging, immediately set "triageLevel" to "Emergency".
3. Return ONLY a single valid JSON object matching this schema:
{
  "speechResponse": "Spoken reply and the single next diagnostic question",
  "isComplete": false,
  "summary": {
    "chiefComplaint": "Primary symptom or null",
    "duration": "Duration or null",
    "severity": "Severity or null",
    "triageLevel": "Routine",
    "doctorNotes": "SBAR clinical summary for the attending doctor"
  }
}
"""

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "FastAPI + Supabase Active", "model": ACTIVE_GROQ_MODEL}

# -------------------------------------------------------------
# 1. AI Voice Bot Session Initiation
# -------------------------------------------------------------
@app.post("/api/voice/start")
def start_voice_session():
    session_id = f"voice_{uuid.uuid4().hex[:10]}"
    return {
        "sessionId": session_id,
        "status": "ready",
        "message": "AI clinical voice triage ready.",
        "model": ACTIVE_GROQ_MODEL
    }

# -------------------------------------------------------------
# 2. AI Voice Bot Conversational Turn
# -------------------------------------------------------------
@app.post("/api/voice/chat")
async def voice_chat_turn(request: VoiceChatRequest):
    print(f"\n[Voice Turn] Session: {request.session_id} | Language: {request.language} | Messages: {len(request.messages)}")

    def get_fallback_reply(reason: str):
        fallbacks = {
            "hi": "मैं समझ गया। कृपया मुझे बताएं कि यह लक्षण कब से हैं और कितने तेज़ हैं?",
            "mr": "मला समजले. कृपया सांगा हा त्रास कधीपासून सुरू आहे आणि किती तीव्र आहे?",
            "en": "I understand. Could you tell me how long you have had these symptoms and how severe they feel?",
        }
        return {
            "speechResponse": fallbacks.get(request.language, fallbacks["en"]),
            "isComplete": False,
            "summary": {
                "chiefComplaint": "Under Assessment",
                "duration": "Unspecified",
                "severity": "Moderate",
                "triageLevel": "Routine",
                "doctorNotes": f"Intake in progress. Fallback engaged: {reason}"
            }
        }

    if not groq_client:
        print("[Voice Turn Warning] Groq API client not initialized.")
        return get_fallback_reply("Groq client missing")

    try:
        trimmed_history = request.messages[-6:]

        lang_names = {
            "en": "English",
            "hi": "Hindi (written strictly in Devanagari script: हिन्दी)",
            "mr": "Marathi (written strictly in Devanagari script: मराठी)"
        }
        chosen_language = lang_names.get(request.language, "English")

        lang_instruction = (
            f"\nCRITICAL: Formulate 'speechResponse' strictly in {chosen_language}. "
            "Do not switch to English if Hindi or Marathi is selected."
        )

        prompt_payload = [
            {"role": "system", "content": TRIAGE_SYSTEM_PROMPT + lang_instruction}
        ] + [
            {"role": m.role, "content": m.content} for m in trimmed_history
        ]

        chat = groq_client.chat.completions.create(
            messages=prompt_payload,
            model=ACTIVE_GROQ_MODEL,
            response_format={"type": "json_object"},
            temperature=0.2
        )

        raw_content = chat.choices[0].message.content
        response_data = json.loads(raw_content)

        if not response_data.get("speechResponse"):
            response_data["speechResponse"] = get_fallback_reply("Blank response")["speechResponse"]

        # Safe Supabase persistence
        try:
            is_complete = response_data.get("isComplete", False)
            summary = response_data.get("summary", {})
            triage_level = summary.get("triageLevel", "Routine")

            if is_complete or triage_level == "Emergency":
                transcript_dump = []
                for m in request.messages:
                    if hasattr(m, "model_dump"):
                        transcript_dump.append(m.model_dump())
                    else:
                        transcript_dump.append(m.dict())

                supabase.table("patient_intakes").upsert({
                    "session_id": request.session_id,
                    "chief_complaint": summary.get("chiefComplaint") or "General Consultation",
                    "duration": summary.get("duration") or "Unspecified",
                    "severity": summary.get("severity") or "Unspecified",
                    "triage_priority": triage_level,
                    "doctor_notes": summary.get("doctorNotes") or "Intake completed.",
                    "full_transcript": transcript_dump
                }, on_conflict="session_id").execute()
                print("[Voice Turn] Saved triage summary to Supabase.")

        except Exception as db_err:
            print(f"[Voice Turn Warning] Supabase save failed (non-fatal): {db_err}")

        return response_data

    except Exception as exc:
        print("\n" + "=" * 50)
        print(f"EXACT VOICE BACKEND ERROR (Model: {ACTIVE_GROQ_MODEL}):")
        traceback.print_exc()
        print("=" * 50 + "\n")
        return get_fallback_reply(str(exc))

# -------------------------------------------------------------
# 3. Smart Medical Entity Parser for OCR
# -------------------------------------------------------------
def extract_prescription_entities(raw_text: str) -> dict:
    if not raw_text.strip():
        return {
            "patientName": "Walk-in Patient",
            "doctor": "Attending Physician",
            "medication": "None detected",
            "instructions": "Consult attending practitioner",
            "medicationsList": []
        }

    prompt = f"""
    You are an expert clinical pharmacologist. Parse this noisy OCR output from a doctor's prescription.
    Extract the following entities with high clinical precision:
    - "patientName": Name of the patient (look for prefixes Mr./Mrs./Ms./Master or labels like 'Name:', 'Patient:'). If not found, return 'Walk-in Patient'. NEVER mistake hospital titles, clinic headers, or doctor names for the patient name.
    - "doctor": Name of the doctor (e.g., Dr. ...). If not found, return 'Attending Physician'.
    - "medication": A readable comma-separated string of all prescribed medicines and dosages.
    - "instructions": Timing, food intake, or frequency directions (e.g., 'Twice daily after meals').
    - "medicationsList": An array of objects each having:
        - "name": Medicine name
        - "dosage": Dosage or strength (e.g. 500mg, 1 tab, 5ml)
        - "instructions": Timing instructions

    Raw OCR Text:
    \"\"\"{raw_text}\"\"\"

    Return ONLY a single valid JSON object matching those exact keys with no preamble or markdown formatting.
    """

    if groq_client:
        try:
            chat = groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You output strictly valid JSON with no markdown formatting."},
                    {"role": "user", "content": prompt}
                ],
                model=ACTIVE_GROQ_MODEL,
                response_format={"type": "json_object"},
                temperature=0.1
            )
            data = json.loads(chat.choices[0].message.content)
            med_list = data.get("medicationsList") or []
            return {
                "patientName": data.get("patientName") or "Walk-in Patient",
                "doctor": data.get("doctor") or "Attending Physician",
                "medication": data.get("medication") or "General Prescription",
                "instructions": data.get("instructions") or "Take as advised by physician",
                "medicationsList": med_list
            }
        except Exception as e:
            print(f"Groq OCR parsing error: {e}")

    return {
        "patientName": "Walk-in Patient",
        "doctor": "Attending Physician",
        "medication": "General Prescription Item",
        "instructions": "Follow physician directions",
        "medicationsList": [
            {"name": "Prescription Item", "dosage": "Standard", "instructions": "As directed"}
        ]
    }

# -------------------------------------------------------------
# 4. Prescription OCR Endpoint
# -------------------------------------------------------------
@app.post("/api/ocr")
async def process_prescription(prescription: UploadFile = File(...)):
    if not prescription.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    try:
        image_bytes = await prescription.read()
        file_extension = prescription.filename.split(".")[-1] if "." in prescription.filename else "jpg"
        storage_path = f"prescriptions/{uuid.uuid4().hex}.{file_extension}"

        supabase.storage.from_("prescriptions").upload(
            path=storage_path,
            file=image_bytes,
            file_options={"content-type": prescription.content_type}
        )
        public_image_url = supabase.storage.from_("prescriptions").get_public_url(storage_path)

        np_arr = np.frombuffer(image_bytes, np.uint8)
        cv_img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if cv_img is None:
            raise ValueError("Failed to decode uploaded image.")

        h, w = cv_img.shape[:2]
        if max(h, w) > 1800:
            scale = 1800 / max(h, w)
            cv_img = cv2.resize(cv_img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
        filtered = cv2.bilateralFilter(gray, 9, 75, 75)
        preprocessed = cv2.adaptiveThreshold(
            filtered, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 11
        )

        raw_text = pytesseract.image_to_string(preprocessed, lang="eng", config="--oem 1 --psm 3")
        parsed_record = extract_prescription_entities(raw_text)

        patient_res = supabase.table("patients").insert({
            "full_name": parsed_record["patientName"]
        }).execute()
        patient_id = patient_res.data[0]["id"]

        prescription_res = supabase.table("prescriptions").insert({
            "patient_id": patient_id,
            "doctor_name": parsed_record["doctor"],
            "raw_ocr_text": raw_text,
            "summary": f"Prescription for {parsed_record['patientName']}: {parsed_record['medication']}",
            "image_url": public_image_url
        }).execute()
        prescription_id = prescription_res.data[0]["id"]

        med_rows = [
            {
                "prescription_id": prescription_id,
                "medicine_name": med.get("name", "Unknown Medicine"),
                "dosage": med.get("dosage", "Standard"),
                "instructions": med.get("instructions", "Follow doctor advice")
            }
            for med in parsed_record.get("medicationsList", [])
        ]
        if med_rows:
            supabase.table("medications").insert(med_rows).execute()

        return {
            "success": True,
            "patientId": patient_id,
            "prescriptionId": prescription_id,
            "imageUrl": public_image_url,
            "extractedData": {
                "patientName": parsed_record["patientName"],
                "doctor": parsed_record["doctor"],
                "medication": parsed_record["medication"],
                "instructions": parsed_record["instructions"]
            },
            "rawText": raw_text
        }

    except Exception as e:
        print(f"OCR Pipeline Error: {e}")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")