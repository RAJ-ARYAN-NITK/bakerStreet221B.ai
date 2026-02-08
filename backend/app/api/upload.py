# from fastapi import APIRouter, UploadFile, File, Form
# from pathlib import Path

# from app.documents.ingest import ingest_document

# router = APIRouter()


# UPLOAD_DIR = Path("uploads")
# UPLOAD_DIR.mkdir(exist_ok=True)


# @router.post("/upload")
# async def upload_document(
#     case_id: str = Form(...),
#     file: UploadFile = File(...),
# ):
#     """
#     Upload and ingest a document into case memory
#     """
#     file_path = UPLOAD_DIR / file.filename

#     with open(file_path, "wb") as f:
#         f.write(await file.read())

#     chunks = ingest_document(case_id, str(file_path))

#     return {
#         "status": "ingested",
#         "chunks": chunks,
#         "filename": file.filename,
#     }
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pathlib import Path
import uuid

from app.documents.ingest import ingest_document

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/upload")
async def upload_document(
    case_id: str = Form(...),
    file: UploadFile = File(...),
):
    """
    Upload and ingest a document into case memory
    """

    # -----------------------------
    # 1. Validate filename
    # -----------------------------
    if not file.filename:
        raise HTTPException(status_code=400, detail="File must have a name")

    # -----------------------------
    # 2. Make filename safe + unique
    # -----------------------------
    safe_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = UPLOAD_DIR / safe_name

    # -----------------------------
    # 3. Save file
    # -----------------------------
    content = await file.read()

    with open(file_path, "wb") as f:
        f.write(content)

    # -----------------------------
    # 4. Ingest into vector memory
    # -----------------------------
    chunks = ingest_document(case_id, str(file_path))

    # -----------------------------
    # 5. Response
    # -----------------------------
    return {
        "status": "ingested",
        "chunks": chunks,
        "filename": safe_name,
        "case_id": case_id,
    }