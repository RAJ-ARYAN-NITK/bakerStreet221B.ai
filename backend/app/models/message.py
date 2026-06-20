from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from datetime import datetime
from app.database import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, index=True)
    case_id = Column(String, ForeignKey("cases.id"))
    role = Column(String)  # user | agent
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)