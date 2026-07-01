from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ForensicCheck(BaseModel):
    label: str
    status: str
    details: str

class ScanResult(BaseModel):
    id: str
    user_id: str
    filename: str
    file_size: str
    mode: str                        # "authenticity" | "ocr"
    status: str                      # "processing" | "completed" | "failed"
    created_at: datetime

    # Authenticity fields
    verdict: Optional[str] = None    # "AUTHENTIC" | "MANIPULATED" | "AI GENERATED"
    trust_score: Optional[float] = None
    risk_profile: Optional[str] = None
    ai_probability: Optional[float] = None
    forensic_checks: Optional[List[ForensicCheck]] = None

    # OCR fields
    extracted_text: Optional[str] = None
    ocr_confidence: Optional[float] = None
