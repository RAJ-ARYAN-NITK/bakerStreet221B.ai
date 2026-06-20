# app/api/upload.py

import uuid
import tempfile
import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.agent import get_case_agent_graph, get_agent_graph
from app.agent.tools import store_document_chunks

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".docx"}

CONTENT_TYPE_MAP = {
    "application/pdf":  ".pdf",
    "text/plain":       ".txt",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}


def _load_document(tmp_path: str, content_type: str) -> str:
    """Load a document and return its full text."""
    try:
        if content_type == "application/pdf" or tmp_path.endswith(".pdf"):
            loader = PyPDFLoader(tmp_path)
            pages  = loader.load()
            return "\n\n".join(p.page_content for p in pages)

        loader = TextLoader(tmp_path, encoding="utf-8", autodetect_encoding=True)
        docs   = loader.load()
        return "\n\n".join(d.page_content for d in docs)

    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse document: {e}")


@router.post("/upload")
async def upload_document(
    file:      UploadFile = File(...),
    case_id:   str        = Form(default=""),
    thread_id: str        = Form(default=""),
):
    """
    Ingest a document into the case's evidence store.
    Steps:
    1. Parse text from PDF/TXT/DOCX
    2. Split into searchable chunks and store per case_id
    3. Run the Sherlock agent on an excerpt to generate investigation questions
    """
    # Validate file type
    content_type = file.content_type or ""
    ext = CONTENT_TYPE_MAP.get(content_type) or os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Only PDF, TXT, and DOCX files are supported.")

    # Write to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        raw_text = _load_document(tmp_path, content_type)
    finally:
        os.unlink(tmp_path)

    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="Document appears to be empty or unreadable.")

    # Split and store chunks (so document_search tool can find them)
    splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=150)
    chunks   = splitter.split_text(raw_text)

    # Store under case_id (fall back to thread_id if no case_id)
    store_key = case_id or thread_id or "default"
    store_document_chunks(store_key, chunks)

    # Build investigation prompt for Sherlock
    excerpt = raw_text[:4000].strip()
    t_id    = thread_id or case_id or str(uuid.uuid4())
    config: RunnableConfig = {"configurable": {"thread_id": t_id}}

    # Use the case-scoped agent if we have a case_id (so document_search works)
    graph = get_case_agent_graph(store_key) if store_key != "default" else get_agent_graph()

    analysis_prompt = (
        "A new piece of evidence has been added to this case. "
        "Analyze the following excerpt carefully and generate exactly 5 specific investigation questions "
        "that a detective should pursue to crack this case. "
        "Each question must be phrased as a direct question ending with a question mark (?).\n\n"
        "IMPORTANT RULES:\n"
        "- Output ONLY the 5 questions, one per line\n"
        "- Each line must be a complete question ending with ?\n"
        "- Do not number them, bullet them, or add any other text\n"
        "- Make each question specific and investigative (not generic)\n\n"
        f"EVIDENCE EXCERPT:\n{excerpt}"
    )

    raw_response = ""
    try:
        result = await graph.ainvoke(
            {"messages": [HumanMessage(content=analysis_prompt)]},
            config=config,
        )
        for msg in reversed(result.get("messages", [])):
            if hasattr(msg, "content") and msg.type not in ("tool", "human"):
                content = msg.content
                if isinstance(content, list):
                    content = " ".join(
                        b.get("text", "") if isinstance(b, dict) else str(b)
                        for b in content
                    )
                raw_response = content
                break
    except Exception as e:
        import traceback
        traceback.print_exc()
        raw_response = ""

    # Parse questions — accept any line that ends with ? or contains ?
    # Also accept lines that look like questions even without explicit ?
    all_lines = [
        line.strip().lstrip("-•*0123456789.() ")
        for line in raw_response.splitlines()
        if line.strip()
    ]

    # Prefer lines with question marks first, then non-empty lines as fallback
    questions_with_mark = [l for l in all_lines if "?" in l]
    questions_fallback  = [l for l in all_lines if l and "?" not in l]

    investigations = (questions_with_mark + questions_fallback)[:5]

    return {
        "filename":      file.filename,
        "chunks":        len(chunks),
        "investigations": investigations,
        "thread_id":     t_id,
    }
