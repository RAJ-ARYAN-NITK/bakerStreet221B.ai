from langchain_core.tools import tool
from app.memory.retriever import retrieve_evidence


# --------------------------------------------------
# Evidence Search Tool
# --------------------------------------------------
@tool
def search_evidence(case_id: str, query: str) -> list[str]:
    """
    Search semantic evidence from the vector database.
    """
    return retrieve_evidence(case_id=case_id, query=query, k=5)


# --------------------------------------------------
# Evidence Summary Tool (optional but useful)
# --------------------------------------------------
@tool
def summarize_evidence(evidence: list[str]) -> str:
    """
    Summarize retrieved evidence.
    """
    if not evidence:
        return "No evidence available to summarize."

    return " ".join(evidence)