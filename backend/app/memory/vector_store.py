import chromadb
from chromadb.config import Settings

# Global Chroma client (simple local persistent DB)
_chroma_client = chromadb.Client(
    Settings(
        persist_directory="./chroma",
        anonymized_telemetry=False
    )
)


def get_case_collection(case_id: str):
    """
    Each case gets its own vector collection.
    """
    return _chroma_client.get_or_create_collection(
        name=f"case_{case_id}"
    )