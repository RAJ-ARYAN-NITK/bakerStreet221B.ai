import uuid
from datetime import datetime

from app.memory.vector_store import get_case_collection
from app.documents.loader import load_text
from app.documents.chunker import chunk_text


def ingest_document(case_id: str, file_path: str):
    """
    Load → chunk → store in Chroma
    """
    text = load_text(file_path)
    chunks = chunk_text(text)

    collection = get_case_collection(case_id)

    ids = [str(uuid.uuid4()) for _ in chunks]

    collection.add(
        documents=chunks,
        ids=ids,
        metadatas=[
            {
                "source": file_path,
                "timestamp": datetime.utcnow().isoformat(),
                "type": "document_chunk",
            }
            for _ in chunks
        ],
    )

    return len(chunks)