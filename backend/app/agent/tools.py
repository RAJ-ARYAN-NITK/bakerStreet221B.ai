from langchain_core.tools import tool
from app.memory.retriever import retrieve_evidence


@tool
def search_case_evidence(case_id: str, query: str) -> list[str]:
    """
    Semantic search over stored case evidence.
    """
    return retrieve_evidence(case_id=case_id, query=query, k=5)