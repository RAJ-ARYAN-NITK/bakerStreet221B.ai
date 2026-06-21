# app/api/upload.py
"""
Feature 2 — Streaming Upload Progress
Feature 3 — Multi-File Upload support (each file is a separate POST)
Feature 4 — pgvector embedding during upload

POST /upload returns Server-Sent Events so the frontend can show
real-time progress: parsing → chunking → embedding → questions → done.

SSE frame types:
  {"type": "progress", "stage": "parsing|chunking|embedding|questions", "message": "..."}
  {"type": "done",     "filename": "...", "chunks": N, "investigations": [...], "thread_id": "..."}
  {"type": "error",    "message": "..."}
"""

import json
import uuid
import tempfile
import os
import asyncio
from typing import AsyncGenerator

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
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


def _sse(payload: dict) -> str:
    """Format a dict as an SSE data frame."""
    return f"data: {json.dumps(payload)}\n\n"


# ─── SSE async generator ──────────────────────────────────────────────────────

async def _upload_sse_generator(
    file_content: bytes,
    filename: str,
    content_type: str,
    case_id: str,
    thread_id: str,
) -> AsyncGenerator[str, None]:
    """
    Yields SSE frames as the document is parsed, chunked, embedded, and analysed.
    All heavy IO operations are done with asyncio.to_thread to keep the event loop free.
    """
    try:
        # ── Stage 1: Validate & Parse ─────────────────────────────────────────
        yield _sse({"type": "progress", "stage": "parsing",
                    "message": f"📄 Parsing {filename}…"})

        ext = CONTENT_TYPE_MAP.get(content_type) or \
              os.path.splitext(filename)[1].lower()

        if ext not in ALLOWED_EXTENSIONS:
            yield _sse({"type": "error",
                        "message": "Only PDF, TXT, and DOCX files are supported."})
            return

        # Write to temp file (needed by file-based loaders)
        def _write_and_parse():
            with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
                tmp.write(file_content)
                tmp_path = tmp.name
            try:
                return _load_document(tmp_path, content_type)
            finally:
                os.unlink(tmp_path)

        raw_text: str = await asyncio.to_thread(_write_and_parse)

        if not raw_text.strip():
            yield _sse({"type": "error",
                        "message": "Document appears to be empty or unreadable."})
            return

        yield _sse({"type": "progress", "stage": "parsing",
                    "message": f"✅ Parsed {len(raw_text):,} characters from {filename}"})

        # ── Stage 2: Chunk ────────────────────────────────────────────────────
        yield _sse({"type": "progress", "stage": "chunking",
                    "message": "✂️  Splitting into searchable chunks…"})

        splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=150)
        chunks   = splitter.split_text(raw_text)

        store_key = case_id or thread_id or "default"
        store_document_chunks(store_key, chunks)

        yield _sse({"type": "progress", "stage": "chunking",
                    "message": f"✂️  Created {len(chunks)} chunks (avg {len(raw_text)//max(len(chunks),1)} chars each)"})

        # ── Stage 3: Embed (pgvector) ─────────────────────────────────────────
        yield _sse({"type": "progress", "stage": "embedding",
                    "message": f"🧮 Embedding {len(chunks)} chunks with text-embedding-004…"})

        try:
            from app.agent.embeddings import embed_and_store

            # Progress callback — yields SSE frame per batch
            embedded_so_far = [0]

            async def embedding_progress(current: int, total: int):
                embedded_so_far[0] = current
                yield_val = _sse({
                    "type": "progress", "stage": "embedding",
                    "message": f"🔢 Embedded {current}/{total} chunks…",
                })
                # We can't yield from a callback directly, so store it
                embedding_progress._last_frame = yield_val

            embedding_progress._last_frame = ""

            batch_size = 20
            stored = 0
            for i in range(0, len(chunks), batch_size):
                batch = chunks[i: i + batch_size]
                try:
                    from app.agent.embeddings import embed_and_store as _embed
                    # Embed this mini-batch
                    import asyncio as _aio
                    from langchain_google_genai import GoogleGenerativeAIEmbeddings
                    from app.agent.embeddings import _embeddings_model, _vec_to_pg
                    from app.agent.graph import connection_pool

                    embeddings_list = await _aio.to_thread(
                        _embeddings_model.embed_documents, batch
                    )
                    async with connection_pool.connection() as conn:
                        for chunk, emb in zip(batch, embeddings_list):
                            vec_str = _vec_to_pg(emb)
                            await conn.execute(
                                """
                                INSERT INTO document_chunks
                                    (case_id, content, source_file, embedding)
                                VALUES (%s, %s, %s, %s::vector)
                                """,
                                (store_key, chunk, filename, vec_str),
                            )
                            stored += 1

                except Exception as batch_err:
                    pass  # non-fatal; keyword search still works

                progress = min(i + batch_size, len(chunks))
                yield _sse({
                    "type": "progress", "stage": "embedding",
                    "message": f"🔢 Embedded {progress}/{len(chunks)} chunks",
                })

            yield _sse({
                "type": "progress", "stage": "embedding",
                "message": f"✅ {stored}/{len(chunks)} chunks stored in pgvector",
            })

        except Exception as embed_err:
            yield _sse({
                "type": "progress", "stage": "embedding",
                "message": f"⚠️ Embedding skipped (keyword search active): {embed_err}",
            })

        # ── Stage 4: Generate investigation questions ─────────────────────────
        yield _sse({"type": "progress", "stage": "questions",
                    "message": "🔍 Sherlock is analysing the evidence…"})

        excerpt = raw_text[:4000].strip()
        t_id    = thread_id or case_id or str(uuid.uuid4())
        config: RunnableConfig = {"configurable": {"thread_id": t_id}}

        graph = (
            get_case_agent_graph(store_key)
            if store_key != "default"
            else get_agent_graph()
        )

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
        except Exception as q_err:
            raw_response = ""

        # Parse questions
        all_lines = [
            line.strip().lstrip("-•*0123456789.() ")
            for line in raw_response.splitlines()
            if line.strip()
        ]
        questions_with_mark = [l for l in all_lines if "?" in l]
        questions_fallback   = [l for l in all_lines if l and "?" not in l]
        investigations = (questions_with_mark + questions_fallback)[:5]

        # ── Done ──────────────────────────────────────────────────────────────
        yield _sse({
            "type":          "done",
            "filename":      filename,
            "chunks":        len(chunks),
            "investigations": investigations,
            "thread_id":     t_id,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        yield _sse({"type": "error", "message": f"{type(e).__name__}: {str(e)}"})


# ─── Route ────────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_document(
    file:      UploadFile = File(...),
    case_id:   str        = Form(default=""),
    thread_id: str        = Form(default=""),
):
    """
    Ingest a document into the case's evidence store.
    Returns Server-Sent Events so the frontend can show real-time progress.

    SSE types:
      progress — stage update with human-readable message
      done     — final result: filename, chunks, investigations, thread_id
      error    — something went wrong
    """
    # Read file content synchronously before returning StreamingResponse
    # (FastAPI closes the upload file after the route handler returns)
    content      = await file.read()
    filename     = file.filename or "document"
    content_type = file.content_type or ""

    return StreamingResponse(
        _upload_sse_generator(content, filename, content_type, case_id, thread_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
