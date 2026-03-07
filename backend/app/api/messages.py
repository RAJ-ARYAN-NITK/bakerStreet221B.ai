from fastapi import APIRouter
from app.database import SessionLocal
from app.models.message import Message

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("/{case_id}")
def get_messages(case_id: str):
    db = SessionLocal()

    msgs = (
        db.query(Message)
        .filter(Message.case_id == case_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    db.close()

    return [
        {
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at,
        }
        for m in msgs
    ]