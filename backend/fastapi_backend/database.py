from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

# Local SQLite database file: kiosk.db
DATABASE_URL = "sqlite:///./kiosk.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class PatientIntake(Base):
    __tablename__ = "patient_intakes"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), unique=True, index=True)
    intake_type = Column(String(20))  # "voice" or "ocr"
    raw_extracted_text = Column(Text, nullable=True)
    structured_data = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)

# Automatically creates the database table on startup
Base.metadata.create_all(bind=engine)