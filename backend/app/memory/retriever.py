from datetime import datetime
import uuid

from app.memory.vector_store import get_case_collection
from app.memory.schema import Evidence


def add_evidence(
    case_id: str,
    content: str,
    source: str = "user"
):
    """
    Store evidence into vector DB
    """
    collection = get_case_collection(case_id)

    evidence = Evidence(
        evidence_id=str(uuid.uuid4()),
        case_id=case_id,
        content=content,
        source=source,
        created_at=datetime.utcnow()
    )

    collection.add(
        documents=[evidence.content],
        ids=[evidence.evidence_id],
        metadatas=[{
            "case_id": evidence.case_id,
            "source": evidence.source,
            "created_at": evidence.created_at.isoformat()
        }]
    )


def retrieve_evidence(
    case_id: str,
    query: str,
    k: int = 5
) -> list[str]:
    """
    Semantic search over evidence
    """
    collection = get_case_collection(case_id)

    results = collection.query(
        query_texts=[query],
        n_results=k
    )

    documents = results.get("documents")
    if not documents:
        return []

    return documents[0]