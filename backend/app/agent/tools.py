# app/agent/tools.py
"""
Real tools that power the Sherlock ReAct agent.
Tools available:
  1. web_search      — DuckDuckGo search (no API key required)
  2. calculator      — Safe math evaluation via numexpr
  3. document_search — Search text previously uploaded for this case
                       Now ASYNC: tries pgvector semantic search first,
                       falls back to keyword-frequency scoring if no
                       embeddings exist yet (e.g., first upload).

NOTE: document_search is created via make_document_search_tool(case_id) so that
the correct case_id is always used without requiring the LLM to pass it.
"""

import re
import threading
from typing import Dict, List
from langchain_core.tools import tool

# ─── In-memory document store (case_id → list of text chunks) ────────────────
# Populated by the /upload endpoint.  Thread-safe via a lock.
# Kept as a keyword-search fallback if pgvector is unavailable.
_doc_store: Dict[str, List[str]] = {}
_lock = threading.Lock()


def store_document_chunks(case_id: str, chunks: List[str]) -> None:
    """Called by the upload endpoint to persist chunks for a case."""
    with _lock:
        if case_id not in _doc_store:
            _doc_store[case_id] = []
        _doc_store[case_id].extend(chunks)


def get_document_chunks(case_id: str) -> List[str]:
    with _lock:
        return list(_doc_store.get(case_id, []))


# ─── Tool 1: Web Search ───────────────────────────────────────────────────────

@tool
def web_search(query: str) -> str:
    """
    Search the web for up-to-date information using DuckDuckGo.
    Use this when the user asks about recent events, people, places,
    facts that may have changed, or anything you're not certain about.
    Input: a plain-text search query string.
    Output: a summary of top search results.
    """
    try:
        from duckduckgo_search import DDGS
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=5):
                title = r.get("title", "")
                body  = r.get("body", "")
                href  = r.get("href", "")
                results.append(f"**{title}**\n{body}\nSource: {href}")
        if not results:
            return "No results found for that query."
        return "\n\n---\n\n".join(results)
    except Exception as e:
        return f"Web search failed: {e}"


# ─── Tool 2: Calculator ───────────────────────────────────────────────────────

@tool
def calculator(expression: str) -> str:
    """
    Evaluate a mathematical expression and return the numeric result.
    Use this for any arithmetic, unit conversions, or quantitative reasoning.
    Supports: +, -, *, /, **, sqrt, log, sin, cos, tan, abs, round.
    Input: a Python-style math expression, e.g. '(42 * 3.14159) / 2'
    Output: the computed result as a string.
    """
    try:
        import numexpr
        safe = re.sub(r"[^0-9+\-*/().,\s%^a-zA-Z_]", "", expression)
        result = numexpr.evaluate(safe)
        return str(float(result))
    except Exception:
        try:
            import math
            allowed = {k: getattr(math, k) for k in dir(math) if not k.startswith("_")}
            allowed["abs"] = abs
            allowed["round"] = round
            safe_expr = re.sub(r"[^0-9+\-*/().,\s%^a-zA-Z_]", "", expression)
            result = eval(safe_expr, {"__builtins__": {}}, allowed)  # noqa: S307
            return str(result)
        except Exception as e:
            return f"Could not evaluate '{expression}': {e}"


# ─── Tool 3: Document Search (case-scoped factory) ────────────────────────────

def make_document_search_tool(case_id: str):
    """
    Returns a document_search tool pre-bound to the given case_id.
    Priority: pgvector semantic search → keyword frequency fallback.
    The LLM never needs to pass case_id — it's baked in via closure.
    """

    @tool
    async def document_search(query: str) -> str:
        """
        Search through documents uploaded for the current case using semantic similarity.
        Use this when the user references evidence, a file, or asks questions
        that may be answered by previously uploaded documents.
        Input: a search query string describing what you're looking for.
        Output: the most relevant text excerpts from uploaded documents.
        """
        # ── 1. Try pgvector semantic search (Feature 4) ───────────────────────
        try:
            from app.agent.embeddings import semantic_search, has_embeddings
            if await has_embeddings(case_id):
                results = await semantic_search(query, case_id)
                if results:
                    excerpts = "\n\n---\n\n".join(results)
                    return f"Relevant document excerpts (semantic search):\n\n{excerpts}"
        except Exception as sem_err:
            # Non-fatal: fall through to keyword search
            pass

        # ── 2. Keyword-frequency fallback ─────────────────────────────────────
        chunks = get_document_chunks(case_id)
        if not chunks:
            return "No documents have been uploaded for this case yet."

        query_lower = query.lower()
        query_words = set(re.findall(r"\w+", query_lower))

        scored = []
        for chunk in chunks:
            chunk_lower = chunk.lower()
            score = sum(1 for w in query_words if w in chunk_lower)
            scored.append((score, chunk))

        scored.sort(key=lambda x: x[0], reverse=True)
        top = [chunk for score, chunk in scored[:5] if score > 0]

        if not top:
            top = chunks[:3]

        excerpts = "\n\n---\n\n".join(top)
        return f"Relevant document excerpts (keyword search):\n\n{excerpts}"

    return document_search


# ─── Default tool list (no case scoping — used only as fallback) ──────────────

@tool
def document_search(query: str) -> str:
    """
    Search through documents that were uploaded for the current case.
    Use this when the user references evidence, a file, or asks questions
    that may be answered by previously uploaded documents.
    Input: a search query string describing what you're looking for.
    Output: the most relevant text excerpts from uploaded documents.
    Note: This is a placeholder. In production a case-scoped tool is used.
    """
    return "No case context available. Please start a case first."


SHERLOCK_TOOLS = [web_search, calculator, document_search]
