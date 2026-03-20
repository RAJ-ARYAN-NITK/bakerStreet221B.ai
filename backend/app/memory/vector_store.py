import os
import chromadb

# --------------------------------------------------
# Cloud in production, local in development
# --------------------------------------------------

def get_chroma_client():
    api_key = os.getenv("CHROMA_API_KEY")

    if api_key:
        # ── Production: Chroma Cloud ──────────────────
        return chromadb.HttpClient(
            ssl=True,
            host="api.trychroma.com",
            tenant=os.getenv("CHROMA_TENANT") or "",
            database=os.getenv("CHROMA_DATABASE") or "",
            headers={
                "x-chroma-token": api_key
            }
        )
    else:
        # ── Local development: persistent local client ─
        return chromadb.PersistentClient(path="./chroma")


# Single client instance shared across the app
_chroma_client = get_chroma_client()


def get_case_collection(case_id: str):
    """
    Each case gets its own vector collection.
    """
    return _chroma_client.get_or_create_collection(
        name=f"case_{case_id}"
    )