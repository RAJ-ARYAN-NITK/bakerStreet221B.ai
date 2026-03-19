import chromadb
from chromadb.config import Settings
from chromadb import PersistentClient


# Persistent Chroma client
_chroma_client = PersistentClient(
    path="./chroma"
)


def get_case_collection(case_id: str):
    """
    Each case gets its own vector collection.
    """
    return _chroma_client.get_or_create_collection(
        name=f"case_{case_id}"
    )