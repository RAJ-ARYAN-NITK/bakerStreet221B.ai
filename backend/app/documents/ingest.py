
import uuid
from datetime import datetime
from pathlib import Path
from app.memory.vector_store import get_case_collection
from app.documents.loader import load_text
from app.documents.chunker import chunk_text
from typing import Optional

# def ingest_document(case_id: str, file_path: str, original_filename: str = None):
def ingest_document(case_id: str, file_path: str, original_filename: Optional[str] = None):
    """
    Load → chunk → store in Chroma
    """
    text = load_text(file_path)
    if not text or not text.strip():
        return 0

    chunks = chunk_text(text)
    if not chunks:
        return 0

    collection = get_case_collection(case_id)
    ids = [str(uuid.uuid4()) for _ in chunks]

    # ✅ Use original filename if provided, fallback to disk name
    display_filename = original_filename or Path(file_path).name

    collection.add(
        documents=chunks,
        ids=ids,
        metadatas=[
            {
                "case_id": case_id,
                "source": file_path,
                "filename": display_filename,      # ✅ "ticket.pdf" not UUID
                "timestamp": datetime.utcnow().isoformat(),
                "type": "document_chunk",
            }
            for _ in chunks
        ],
    )
    return len(chunks)