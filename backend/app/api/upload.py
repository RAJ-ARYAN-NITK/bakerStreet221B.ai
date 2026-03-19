from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pathlib import Path
import uuid
from app.documents.ingest import ingest_document
from app.memory.retriever import retrieve_evidence
from app.agent.investigations import generate_investigations

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
    if not file.filename:
        raise HTTPException(status_code=400, detail="File must have a name")

    # ✅ Keep original filename separate from disk filename
    original_filename = file.filename
    disk_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = UPLOAD_DIR / disk_filename

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # -----------------------------
    # Ingest document
    # -----------------------------
    # ✅ Pass original filename so chunks are tagged correctly
    chunks = ingest_document(
        case_id, 
        str(file_path),
        original_filename=original_filename
    )

    if chunks == 0:
        return {
            "status": "failed",
            "message": "Document could not be processed",
            "filename": original_filename,
            "case_id": case_id,
            "chunks": 0,
            "investigations": []
        }

    # -----------------------------
    # Retrieve evidence
    # -----------------------------
    evidence = retrieve_evidence(case_id, "key information from document", k=5)
    print("EVIDENCE RETRIEVED:", evidence)

    # -----------------------------
    # Generate investigation questions
    # -----------------------------
    investigations = []
    if evidence:
        investigations = generate_investigations(evidence)

    if not investigations:
        investigations = [
            "Summarize the uploaded document",
            "Identify key information in the document",
            "Explain the main concepts discussed",
            "Determine the purpose of the document"
        ]

    print("INVESTIGATIONS GENERATED:", investigations)

    return {
        "status": "ingested",
        "filename": original_filename,   
        "disk_filename": disk_filename, 
        "case_id": case_id,
        "chunks": chunks,
        "investigations": investigations
    }