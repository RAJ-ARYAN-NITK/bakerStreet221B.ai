"""
embeddings.py — Feature 4: pgvector Semantic Search
=====================================================
Provides Google text-embedding-004 embeddings + pgvector storage and retrieval.
Replaces keyword-frequency scoring in document_search with cosine similarity.

Flow:
  upload → embed_and_store(chunks) → pgvector table
  document_search → semantic_search(query) → cosine similarity → top chunks
"""
import os
import asyncio
import logging
from typing import List

from langchain_google_genai import GoogleGenerativeAIEmbeddings

logger = logging.getLogger(__name__)

# ─── Embedding model (768-dim, Google's best-in-class text embedding) ─────────
_embeddings_model = GoogleGenerativeAIEmbeddings(
    model="models/text-embedding-004",
    google_api_key=os.getenv("GOOGLE_API_KEY", ""),
)

EMBEDDING_DIM = 768  # text-embedding-004 output dimension


def _vec_to_pg(vec: List[float]) -> str:
    """Convert a Python float list to pgvector literal string: '[0.123,...]'"""
    return "[" + ",".join(f"{x:.8f}" for x in vec) + "]"


# ─── Store embeddings in pgvector table ────────────────────────────────────────

async def embed_and_store(
    case_id: str,
    chunks: List[str],
    source_file: str = "",
    progress_cb=None,  # optional async callback(current, total) for SSE progress
) -> int:
    """
    Embed `chunks` with Google text-embedding-004 and insert into document_chunks.
    Returns number of chunks successfully embedded.
    progress_cb: async callable(current: int, total: int) — called per batch.
    """
    from app.agent.graph import connection_pool  # lazy import — pool opens in lifespan

    stored = 0
    batch_size = 20  # stay well within API rate limits

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i: i + batch_size]
        try:
            embeddings: List[List[float]] = await asyncio.to_thread(
                _embeddings_model.embed_documents, batch
            )
        except Exception as e:
            logger.warning(f"Embedding batch {i}–{i+len(batch)} failed: {e}. Continuing.")
            if progress_cb:
                await progress_cb(min(i + batch_size, len(chunks)), len(chunks))
            continue

        async with connection_pool.connection() as conn:
            for chunk, emb in zip(batch, embeddings):
                vec_str = _vec_to_pg(emb)
                await conn.execute(
                    """
                    INSERT INTO document_chunks (case_id, content, source_file, embedding)
                    VALUES (%s, %s, %s, %s::vector)
                    """,
                    (case_id, chunk, source_file, vec_str),
                )
                stored += 1

        if progress_cb:
            await progress_cb(min(i + batch_size, len(chunks)), len(chunks))

    return stored


# ─── Retrieve semantically similar chunks ─────────────────────────────────────

async def semantic_search(query: str, case_id: str, top_k: int = 5) -> List[str]:
    """
    Embed `query` and return the top_k most similar document chunks
    for the given case using cosine similarity (<=> operator in pgvector).
    Returns empty list on any failure (caller falls back to keyword search).
    """
    from app.agent.graph import connection_pool

    try:
        query_emb: List[float] = await asyncio.to_thread(
            _embeddings_model.embed_query, query
        )
    except Exception as e:
        logger.warning(f"Query embedding failed: {e}")
        return []

    vec_str = _vec_to_pg(query_emb)

    try:
        async with connection_pool.connection() as conn:
            result = await conn.execute(
                """
                SELECT content
                FROM   document_chunks
                WHERE  case_id = %s
                  AND  embedding IS NOT NULL
                ORDER  BY embedding <=> %s::vector
                LIMIT  %s
                """,
                (case_id, vec_str, top_k),
            )
            rows = await result.fetchall()
        return [row[0] for row in rows]
    except Exception as e:
        logger.warning(f"pgvector search failed: {e}")
        return []


async def has_embeddings(case_id: str) -> bool:
    """Return True if any pgvector embeddings exist for this case_id."""
    from app.agent.graph import connection_pool

    try:
        async with connection_pool.connection() as conn:
            result = await conn.execute(
                "SELECT 1 FROM document_chunks WHERE case_id = %s AND embedding IS NOT NULL LIMIT 1",
                (case_id,),
            )
            row = await result.fetchone()
        return row is not None
    except Exception:
        return False


# ─── One-time table setup (called from lifespan) ──────────────────────────────

async def create_vector_table() -> None:
    """
    Create the pgvector extension and document_chunks table (idempotent).
    Also creates a case_id index and an HNSW vector index for fast ANN search.
    Safe to call on every startup — uses IF NOT EXISTS throughout.
    """
    from app.agent.graph import connection_pool

    try:
        async with connection_pool.connection() as conn:
            # Enable pgvector extension (requires the ankane/pgvector Docker image)
            await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")

            # Main table for semantic document chunks
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS document_chunks (
                    id          SERIAL       PRIMARY KEY,
                    case_id     TEXT         NOT NULL,
                    content     TEXT         NOT NULL,
                    source_file TEXT         DEFAULT '',
                    embedding   vector(768),
                    created_at  TIMESTAMPTZ  DEFAULT NOW()
                )
                """
            )

            # B-tree index on case_id for fast WHERE filtering
            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS doc_chunks_case_idx
                ON document_chunks (case_id)
                """
            )

        # HNSW vector index — created in a separate connection because it
        # requires autocommit and table to exist first.
        async with connection_pool.connection() as conn:
            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS doc_chunks_vec_idx
                ON document_chunks USING hnsw (embedding vector_cosine_ops)
                """
            )

        logger.info("✅ pgvector: document_chunks table + indexes ready.")

    except Exception as e:
        logger.warning(
            f"⚠️  pgvector table setup warning (non-fatal, keyword fallback active): {e}"
        )
