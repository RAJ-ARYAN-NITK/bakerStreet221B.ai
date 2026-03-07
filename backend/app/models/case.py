from sqlalchemy import Column, String, DateTime
from datetime import datetime
from app.database import Base


class Case(Base):
    __tablename__ = "cases"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, default="New Investigation")
    created_at = Column(DateTime, default=datetime.utcnow)