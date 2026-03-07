# import uuid
# from fastapi import APIRouter
# from app.database import SessionLocal
# from app.models.case import Case

# router = APIRouter(prefix="/cases", tags=["cases"])


# @router.post("/new")
# def create_case():
#     db = SessionLocal()

#     case_id = str(uuid.uuid4())

#     new_case = Case(id=case_id, title="New Investigation")
#     db.add(new_case)
#     db.commit()
#     db.close()

#     return {"case_id": case_id}


# @router.get("/")
# def list_cases():
#     db = SessionLocal()

#     cases = db.query(Case).order_by(Case.created_at.desc()).all()

#     db.close()

#     return [
#         {
#             "id": c.id,
#             "title": c.title,
#             "created_at": c.created_at,
#         }
#         for c in cases
#     ]

import uuid
from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.case import Case
from app.models.message import Message  # ⭐ needed for cascade delete

router = APIRouter(prefix="/cases", tags=["cases"])


# ------------------------------------------------------------
# CREATE NEW CASE
# ------------------------------------------------------------
@router.post("/new")
def create_case():
    db: Session = SessionLocal()

    try:
        case_id = str(uuid.uuid4())

        new_case = Case(id=case_id, title="New Investigation")
        db.add(new_case)
        db.commit()

        return {"case_id": case_id}

    finally:
        db.close()


# ------------------------------------------------------------
# LIST ALL CASES
# ------------------------------------------------------------
@router.get("/")
def list_cases():
    db: Session = SessionLocal()

    try:
        cases = db.query(Case).order_by(Case.created_at.desc()).all()

        return [
            {
                "id": c.id,
                "title": c.title,
                "created_at": c.created_at,
            }
            for c in cases
        ]

    finally:
        db.close()


# ------------------------------------------------------------
# DELETE CASE  ⭐ PHASE-5 REQUIRED
# ------------------------------------------------------------
@router.delete("/{case_id}")
def delete_case(case_id: str):
    db: Session = SessionLocal()

    try:
        case = db.query(Case).filter(Case.id == case_id).first()

        if not case:
            raise HTTPException(status_code=404, detail="Case not found")

        # ⭐ delete all messages linked to this case
        db.query(Message).filter(Message.case_id == case_id).delete()

        # ⭐ delete the case itself
        db.delete(case)

        db.commit()

        return {"status": "deleted", "case_id": case_id}

    finally:
        db.close()