from datetime import datetime
from pydantic import BaseModel


class Evidence(BaseModel):
    evidence_id: str
    case_id: str
    content: str
    source: str
    created_at: datetime